-- =====================================================================
-- Voyages : schéma initial multi-utilisateurs
--
-- Principe : chaque utilisateur a un profil ; un voyage appartient à ses
-- membres (owner / editor / viewer) ; tout le contenu d'un voyage
-- (étapes, réservations, fichiers) n'est visible que par ses membres.
-- La sécurité est appliquée par Postgres (Row Level Security), pas par l'app.
-- Voir docs/supabase.md pour les explications.
-- =====================================================================

-- Fonctions internes (non exposées par l'API REST de Supabase)
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.trip_role as enum ('owner', 'editor', 'viewer');
create type public.transport_mode as enum ('avion', 'train', 'voiture', 'bateau', 'autre');
create type public.booking_kind as enum ('vol', 'train', 'car', 'bateau', 'location', 'hotel', 'activite', 'autre');
create type public.booking_source as enum ('manuel', 'email', 'pdf');

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profils (un par compte, créé automatiquement à l'inscription)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_path text,
  -- Ville de départ habituelle, pour estimer les distances parcourues
  home_city text,
  home_lat double precision check (home_lat between -90 and 90),
  home_lng double precision check (home_lng between -180 and 180),
  locale text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Voyageur'), 60)
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Voyages
-- ---------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  start_date date not null,
  end_date date not null,
  transport public.transport_mode not null default 'avion',
  budget_amount numeric(12, 2) check (budget_amount >= 0),
  budget_currency char(3) not null default 'EUR',
  -- Dégradé de couverture : trois couleurs, du haut vers le bas
  cover_colors text[] check (cover_colors is null or array_length(cover_colors, 1) = 3),
  cover_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create trigger trips_updated_at before update on public.trips
  for each row execute function private.set_updated_at();

-- Étapes d'un voyage (un voyage peut traverser plusieurs villes / pays)
create table public.trip_destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  position smallint not null default 0,
  city text not null check (char_length(city) between 1 and 120),
  -- Code ISO 3166-1 numérique (celui de la carte world-atlas), ex. '620' pour le Portugal
  country_code char(3) not null check (country_code ~ '^[0-9]{3}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  arrive_on date,
  leave_on date,
  created_at timestamptz not null default now()
);
create index trip_destinations_trip_idx on public.trip_destinations (trip_id, position);

-- Membres d'un voyage
create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.trip_role not null default 'editor',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on public.trip_members (user_id);

-- Invitations par lien (le jeton est le secret ; usage unique, durée limitée)
create table public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role public.trip_role not null default 'editor',
  -- Facultatif : si renseigné, seul ce compte peut accepter l'invitation
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  invited_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz
);
create index trip_invitations_trip_idx on public.trip_invitations (trip_id);

-- ---------------------------------------------------------------------
-- Réservations et fichiers
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind public.booking_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  detail text not null default '',
  -- Heure locale du lieu (sans fuseau) + fuseau IANA, ex. 2026-11-03 07:15 / 'Europe/Paris'
  starts_at timestamp not null,
  ends_at timestamp,
  timezone text,
  reference text,
  provider text,
  source public.booking_source not null default 'manuel',
  imported_at timestamptz,
  -- Données de billet (compagnie, numéro, sièges, porte…) : voir le type Ticket côté app
  ticket jsonb check (ticket is null or jsonb_typeof(ticket) = 'object'),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index bookings_trip_idx on public.bookings (trip_id, starts_at);

create trigger bookings_updated_at before update on public.bookings
  for each row execute function private.set_updated_at();

-- PDF, billets, captures… rangés dans le bucket « trip-files » sous {trip_id}/…
create table public.booking_files (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (storage_path like trip_id::text || '/%')
);
create index booking_files_booking_idx on public.booking_files (booking_id);

-- Le trip_id d'un fichier doit être celui de sa réservation
create function private.booking_files_check_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.bookings b where b.id = new.booking_id and b.trip_id = new.trip_id) then
    raise exception 'Le fichier doit appartenir au même voyage que sa réservation';
  end if;
  return new;
end;
$$;

create trigger booking_files_check_trip before insert or update on public.booking_files
  for each row execute function private.booking_files_check_trip();

-- ---------------------------------------------------------------------
-- Pays visités hors application (voyages passés non saisis)
-- ---------------------------------------------------------------------
create table public.user_countries (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  country_code char(3) not null check (country_code ~ '^[0-9]{3}$'),
  first_visited_on date,
  created_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

-- ---------------------------------------------------------------------
-- Fonctions d'autorisation (security definer : évitent la récursion RLS)
-- ---------------------------------------------------------------------
create function private.trip_role_of(p_trip uuid)
returns public.trip_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.trip_members m
  where m.trip_id = p_trip and m.user_id = (select auth.uid());
$$;

create function private.is_trip_member(p_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip and m.user_id = (select auth.uid())
  );
$$;

create function private.can_edit_trip(p_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.trip_role_of(p_trip) in ('owner', 'editor'), false);
$$;

create function private.is_trip_owner(p_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.trip_role_of(p_trip) = 'owner', false);
$$;

-- Deux utilisateurs partagent-ils au moins un voyage ? (pour voir le profil de l'autre)
create function private.shares_trip_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;

-- Extrait le trip_id du chemin d'un fichier « {trip_id}/… » (null si invalide)
create function private.trip_id_from_path(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_path, '/', 1)::uuid
  end;
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.trip_role_of(uuid),
  private.is_trip_member(uuid),
  private.can_edit_trip(uuid),
  private.is_trip_owner(uuid),
  private.shares_trip_with(uuid),
  private.trip_id_from_path(text)
to authenticated;

-- ---------------------------------------------------------------------
-- Règles automatiques sur les membres
-- ---------------------------------------------------------------------

-- Le créateur d'un voyage en devient propriétaire
create function private.add_trip_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.trip_members (trip_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trips_add_creator after insert on public.trips
  for each row execute function private.add_trip_creator();

-- On ne peut pas rétrograder le dernier propriétaire d'un voyage
create function private.keep_one_owner_on_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner' and new.role <> 'owner' and not exists (
    select 1 from public.trip_members m
    where m.trip_id = old.trip_id and m.role = 'owner' and m.user_id <> old.user_id
  ) then
    raise exception 'Un voyage doit garder au moins un propriétaire';
  end if;
  return new;
end;
$$;

create trigger trip_members_keep_owner before update of role on public.trip_members
  for each row execute function private.keep_one_owner_on_update();

-- Quand le dernier propriétaire part (ou supprime son compte) :
-- le membre le plus ancien devient propriétaire ; s'il ne reste personne, le voyage est supprimé.
create function private.after_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next uuid;
begin
  if not exists (select 1 from public.trips t where t.id = old.trip_id) then
    return null; -- le voyage lui-même est en cours de suppression
  end if;

  if not exists (select 1 from public.trip_members m where m.trip_id = old.trip_id) then
    delete from public.trips t where t.id = old.trip_id;
  elsif not exists (select 1 from public.trip_members m where m.trip_id = old.trip_id and m.role = 'owner') then
    select m.user_id into v_next from public.trip_members m
    where m.trip_id = old.trip_id
    order by (m.role = 'editor') desc, m.joined_at
    limit 1;
    update public.trip_members m set role = 'owner' where m.trip_id = old.trip_id and m.user_id = v_next;
  end if;
  return null;
end;
$$;

create trigger trip_members_after_delete after delete on public.trip_members
  for each row execute function private.after_member_removed();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_destinations enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_files enable row level security;
alter table public.user_countries enable row level security;

-- Profils : le sien, et ceux des compagnons de voyage
create policy "profils visibles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_trip_with(id));
create policy "modifier son profil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Voyages
create policy "voir ses voyages" on public.trips for select to authenticated
  using (created_by = (select auth.uid()) or private.is_trip_member(id));
create policy "créer un voyage" on public.trips for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "modifier un voyage" on public.trips for update to authenticated
  using (private.can_edit_trip(id)) with check (private.can_edit_trip(id));
create policy "supprimer un voyage" on public.trips for delete to authenticated
  using (private.is_trip_owner(id));

-- Étapes
create policy "voir les étapes" on public.trip_destinations for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "ajouter une étape" on public.trip_destinations for insert to authenticated
  with check (private.can_edit_trip(trip_id));
create policy "modifier une étape" on public.trip_destinations for update to authenticated
  using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));
create policy "supprimer une étape" on public.trip_destinations for delete to authenticated
  using (private.can_edit_trip(trip_id));

-- Membres : on voit les membres de ses voyages ; seuls les propriétaires changent les rôles
-- ou retirent quelqu'un ; chacun peut quitter un voyage. L'ajout passe par accept_invitation().
create policy "voir les membres" on public.trip_members for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "changer un rôle" on public.trip_members for update to authenticated
  using (private.is_trip_owner(trip_id)) with check (private.is_trip_owner(trip_id));
create policy "retirer ou quitter" on public.trip_members for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_trip_owner(trip_id));

-- Invitations : gérées par les propriétaires (et les éditeurs, sauf pour inviter un propriétaire)
create policy "voir les invitations" on public.trip_invitations for select to authenticated
  using (private.can_edit_trip(trip_id));
create policy "inviter" on public.trip_invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and private.can_edit_trip(trip_id)
    and (role <> 'owner' or private.is_trip_owner(trip_id))
  );
create policy "révoquer une invitation" on public.trip_invitations for update to authenticated
  using (private.can_edit_trip(trip_id))
  with check (private.can_edit_trip(trip_id) and (role <> 'owner' or private.is_trip_owner(trip_id)));
create policy "supprimer une invitation" on public.trip_invitations for delete to authenticated
  using (private.can_edit_trip(trip_id));

-- Réservations
create policy "voir les réservations" on public.bookings for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "ajouter une réservation" on public.bookings for insert to authenticated
  with check (private.can_edit_trip(trip_id));
create policy "modifier une réservation" on public.bookings for update to authenticated
  using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));
create policy "supprimer une réservation" on public.bookings for delete to authenticated
  using (private.can_edit_trip(trip_id));

-- Fichiers de réservation
create policy "voir les fichiers" on public.booking_files for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "ajouter un fichier" on public.booking_files for insert to authenticated
  with check (private.can_edit_trip(trip_id));
create policy "supprimer un fichier" on public.booking_files for delete to authenticated
  using (private.can_edit_trip(trip_id));

-- Pays visités : strictement personnels
create policy "mes pays" on public.user_countries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Colonnes modifiables : on ne change ni l'auteur, ni le voyage, ni le jeton d'une ligne existante
-- (Supabase donne par défaut le droit UPDATE sur toute la table : on le restreint colonne par colonne)
-- ---------------------------------------------------------------------
revoke update on public.profiles, public.trips, public.trip_destinations, public.trip_members,
  public.trip_invitations, public.bookings, public.booking_files, public.user_countries from authenticated;

grant update (display_name, avatar_path, home_city, home_lat, home_lng, locale) on public.profiles to authenticated;
grant update (title, start_date, end_date, transport, budget_amount, budget_currency, cover_colors, cover_path)
  on public.trips to authenticated;
grant update (position, city, country_code, lat, lng, arrive_on, leave_on) on public.trip_destinations to authenticated;
grant update (role) on public.trip_members to authenticated;
grant update (role, email, expires_at, revoked_at) on public.trip_invitations to authenticated;
grant update (kind, title, detail, starts_at, ends_at, timezone, reference, provider, source, imported_at, ticket)
  on public.bookings to authenticated;
grant update (first_visited_on) on public.user_countries to authenticated;

-- Personne de non connecté n'accède aux tables
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- Invitations : aperçu et acceptation (appelées par l'app via supabase.rpc)
-- ---------------------------------------------------------------------
create function public.invitation_preview(p_token uuid)
returns table (trip_title text, start_date date, end_date date, invited_by_name text, role public.trip_role, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.title,
    t.start_date,
    t.end_date,
    p.display_name,
    i.role,
    case
      when i.revoked_at is not null then 'revoquee'
      when i.accepted_at is not null then 'utilisee'
      when i.expires_at < now() then 'expiree'
      else 'valide'
    end
  from public.trip_invitations i
  join public.trips t on t.id = i.trip_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token;
$$;

create function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_inv public.trip_invitations%rowtype;
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;

  select * into v_inv from public.trip_invitations where token = p_token for update;

  if not found or v_inv.revoked_at is not null or v_inv.expires_at < now() then
    raise exception 'Invitation invalide ou expirée';
  end if;

  -- Déjà membre : rien à faire (l'invitation reste disponible pour quelqu'un d'autre)
  if exists (select 1 from public.trip_members m where m.trip_id = v_inv.trip_id and m.user_id = v_user) then
    return v_inv.trip_id;
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Invitation déjà utilisée';
  end if;

  if v_inv.email is not null and lower(v_inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail';
  end if;

  insert into public.trip_members (trip_id, user_id, role) values (v_inv.trip_id, v_user, v_inv.role);
  update public.trip_invitations set accepted_by = v_user, accepted_at = now() where id = v_inv.id;

  return v_inv.trip_id;
end;
$$;

revoke all on function public.invitation_preview(uuid), public.accept_invitation(uuid) from public, anon;
grant execute on function public.invitation_preview(uuid), public.accept_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Pays visités (calculés) : saisis à la main + étapes des voyages terminés
-- ---------------------------------------------------------------------
create view public.my_visited_countries
with (security_invoker = true)
as
  select country_code, min(first_visited_on) as first_visited_on
  from (
    select uc.country_code, uc.first_visited_on
    from public.user_countries uc
    where uc.user_id = (select auth.uid())
    union all
    select d.country_code, coalesce(d.arrive_on, t.start_date)
    from public.trip_destinations d
    join public.trips t on t.id = d.trip_id
    join public.trip_members m on m.trip_id = t.id and m.user_id = (select auth.uid())
    where t.end_date < current_date
  ) s
  group by country_code;

grant select on public.my_visited_countries to authenticated;

-- ---------------------------------------------------------------------
-- Stockage des fichiers : bucket privé, chemins « {trip_id}/… »
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-files', 'trip-files', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "trip-files : lire" on storage.objects for select to authenticated
  using (bucket_id = 'trip-files' and private.is_trip_member(private.trip_id_from_path(name)));
create policy "trip-files : déposer" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-files' and private.can_edit_trip(private.trip_id_from_path(name)));
create policy "trip-files : remplacer" on storage.objects for update to authenticated
  using (bucket_id = 'trip-files' and private.can_edit_trip(private.trip_id_from_path(name)))
  with check (bucket_id = 'trip-files' and private.can_edit_trip(private.trip_id_from_path(name)));
create policy "trip-files : supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-files' and private.can_edit_trip(private.trip_id_from_path(name)));
