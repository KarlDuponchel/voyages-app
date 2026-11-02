-- =====================================================================
-- Comptes premium et quotas
--
-- Gratuit : 5 lectures par l'IA au total ; photos dans 2 voyages au plus, 250 Mo.
-- Premium : 300 lectures par l'IA sur 30 jours ; photos dans tous les voyages, 20 Go.
-- Le propriétaire d'un voyage paie pour tous : les photos des membres comptent dans son espace,
-- et s'il est premium, les membres ont la lecture par l'IA dans ce voyage.
-- Abonnement payé par Stripe (fonction stripe-webhook, clé serveur), ou offert à la main
-- (statut « offert », à poser dans le tableau de bord Supabase).
-- =====================================================================

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'offert'
  )),
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.subscriptions enable row level security;
create policy "mon abonnement" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- ---------------------------------------------------------------------
-- Offres et consommation
-- ---------------------------------------------------------------------
-- Premium : abonnement actif (ou paiement en retard, le temps que Stripe relance), avec 3 jours de grâce
create function private.is_premium(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active', 'trialing', 'past_due', 'offert')
      and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
  );
$$;

-- Limites d'une offre ; photo_trips et ai_window vides : sans limite de voyages, total à vie
create function private.plan_limits(
  p_premium boolean,
  out photo_bytes bigint,
  out photo_trips integer,
  out ai_reads integer,
  out ai_window interval
)
language sql
immutable
set search_path = ''
as $$
  select
    case when p_premium then 20::bigint * 1024 * 1024 * 1024 else 250::bigint * 1024 * 1024 end,
    case when p_premium then null else 2 end,
    case when p_premium then 300 else 5 end,
    case when p_premium then interval '30 days' else null end;
$$;

create function private.trip_owner(p_trip uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id from public.trip_members m where m.trip_id = p_trip and m.role = 'owner' limit 1;
$$;

-- Place prise par les photos des voyages d'un propriétaire, et nombre de voyages qui en ont
create function private.photo_usage(p_owner uuid, out bytes bigint, out trips integer)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.size_bytes), 0)::bigint, count(distinct p.trip_id)::integer
  from public.trip_photos p
  join public.trip_members m on m.trip_id = p.trip_id and m.role = 'owner' and m.user_id = p_owner;
$$;

-- Ce qui empêche d'ajouter p_bytes de photos à ce voyage (null si rien)
create function private.photo_quota_error(p_trip uuid, p_bytes bigint)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.trip_owner(p_trip);
  v_limits record;
  v_usage record;
  v_mine boolean;
begin
  if v_owner is null then
    return null;
  end if;
  v_mine := v_owner = auth.uid();
  select * into v_limits from private.plan_limits(private.is_premium(v_owner));
  select * into v_usage from private.photo_usage(v_owner);

  -- Voyages avec photos après l'ajout ; après un premium, ceux en trop restent mais ne reçoivent plus rien
  if v_limits.photo_trips is not null
     and v_usage.trips + (case when exists (select 1 from public.trip_photos p where p.trip_id = p_trip) then 0 else 1 end) > v_limits.photo_trips then
    return case when v_mine
      then format('Avec l''offre gratuite, les photos sont possibles dans %s voyages. Passez premium pour en ajouter à tous vos voyages.', v_limits.photo_trips)
      else 'Le propriétaire de ce voyage a atteint la limite de voyages avec photos de l''offre gratuite.'
    end;
  end if;
  if v_usage.bytes + coalesce(p_bytes, 0) > v_limits.photo_bytes then
    return case when v_mine
      then format('Votre espace photos est plein (%s Mo). Passez premium pour 20 Go, ou supprimez des photos.', v_limits.photo_bytes / 1024 / 1024)
      else 'L''espace photos du propriétaire de ce voyage est plein.'
    end;
  end if;
  return null;
end;
$$;

revoke all on function private.is_premium(uuid), private.plan_limits(boolean), private.trip_owner(uuid),
  private.photo_usage(uuid), private.photo_quota_error(uuid, bigint) from public;
grant execute on function private.is_premium(uuid), private.plan_limits(boolean), private.trip_owner(uuid),
  private.photo_usage(uuid), private.photo_quota_error(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- Contrôle à l'envoi d'une photo
-- ---------------------------------------------------------------------
-- Le poids compté est celui des fichiers réellement envoyés (pas celui annoncé par l'app)
create function private.check_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stored bigint;
  v_error text;
begin
  select sum((o.metadata ->> 'size')::bigint) into v_stored
  from storage.objects o
  where o.bucket_id = 'trip-photos' and o.name in (new.path, new.thumb_path);
  new.size_bytes := greatest(new.size_bytes, coalesce(v_stored, 0));

  v_error := private.photo_quota_error(new.trip_id, new.size_bytes);
  if v_error is not null then
    raise exception '%', v_error using hint = 'quota';
  end if;
  return new;
end;
$$;

create trigger trip_photos_quota before insert on public.trip_photos
  for each row execute function private.check_photo_quota();

-- Fichiers : refusés d'avance quand l'espace est déjà plein (le poids exact est vérifié avec la ligne)
drop policy "trip-photos : envoyer" on storage.objects;
create policy "trip-photos : envoyer" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and private.can_edit_trip(private.trip_id_from_path(name))
    and private.photo_quota_error(private.trip_id_from_path(name), 0) is null
  );

-- Pour l'app : vérifier avant d'envoyer, avec le poids après compression (null si c'est bon)
create function public.photo_quota_check(p_trip uuid, p_bytes bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.can_edit_trip(p_trip) then private.photo_quota_error(p_trip, p_bytes) end;
$$;

-- ---------------------------------------------------------------------
-- Lectures par l'IA (appelée par les fonctions serveur, avec la clé serveur)
-- ---------------------------------------------------------------------
create function public.ai_allowance(p_user uuid, p_trip uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_premium boolean := private.is_premium(p_user)
    or (p_trip is not null and private.is_premium(private.trip_owner(p_trip)));
  v_limits record;
  v_used integer;
begin
  select * into v_limits from private.plan_limits(v_premium);
  select count(*) into v_used from public.ai_usage u
  where u.user_id = p_user and (v_limits.ai_window is null or u.created_at > now() - v_limits.ai_window);
  return jsonb_build_object('allowed', v_used < v_limits.ai_reads, 'used', v_used, 'limit', v_limits.ai_reads, 'premium', v_premium);
end;
$$;

-- ---------------------------------------------------------------------
-- Mon offre, pour le profil
-- ---------------------------------------------------------------------
create function public.my_plan()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_premium boolean;
  v_limits record;
  v_usage record;
  v_sub public.subscriptions;
  v_ai integer;
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;
  v_premium := private.is_premium(v_user);
  select * into v_limits from private.plan_limits(v_premium);
  select * into v_usage from private.photo_usage(v_user);
  select * into v_sub from public.subscriptions where user_id = v_user;
  select count(*) into v_ai from public.ai_usage u
  where u.user_id = v_user and (v_limits.ai_window is null or u.created_at > now() - v_limits.ai_window);

  return jsonb_build_object(
    'premium', v_premium,
    'status', v_sub.status,
    'interval', v_sub.billing_interval,
    'periodEnd', v_sub.current_period_end,
    'cancelAtPeriodEnd', coalesce(v_sub.cancel_at_period_end, false),
    'managedByStripe', v_sub.stripe_customer_id is not null and v_sub.status <> 'offert',
    'photoBytes', v_usage.bytes,
    'photoBytesLimit', v_limits.photo_bytes,
    'photoTrips', v_usage.trips,
    'photoTripsLimit', v_limits.photo_trips,
    'aiUsed', v_ai,
    'aiLimit', v_limits.ai_reads,
    'aiMonthly', v_limits.ai_window is not null
  );
end;
$$;

revoke all on function public.photo_quota_check(uuid, bigint), public.ai_allowance(uuid, uuid), public.my_plan() from public, anon;
grant execute on function public.photo_quota_check(uuid, bigint), public.my_plan() to authenticated;
revoke execute on function public.ai_allowance(uuid, uuid) from authenticated;
grant execute on function public.ai_allowance(uuid, uuid) to service_role;
