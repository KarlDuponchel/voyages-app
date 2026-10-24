-- =====================================================================
-- Import automatique par l'IA
--
-- A. Lecture d'un billet (PDF ou capture) : fonction extract-booking.
-- B. E-mails transférés à une adresse personnelle : fonction inbound-email,
--    puis validation dans l'app (table pending_imports).
-- Les fonctions écrivent avec la clé serveur ; les utilisateurs ne voient que leurs propres lignes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Consommation de l'IA : sert à limiter le nombre de lectures par jour et par personne
-- ---------------------------------------------------------------------
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('fichier', 'email')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;
create policy "ma consommation" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ai_usage from authenticated;

-- ---------------------------------------------------------------------
-- Adresse de transfert : {alias}@{domaine d'import}
-- Table à part (et non une colonne de profiles) : les compagnons de voyage voient le profil,
-- pas l'adresse. Aléatoire, et l'expéditeur doit en plus être le titulaire du compte.
-- ---------------------------------------------------------------------
create function private.new_import_alias()
returns text
language sql
volatile
set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

create table public.import_addresses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  alias text not null unique default private.new_import_alias() check (alias ~ '^[a-z0-9]{8,32}$'),
  created_at timestamptz not null default now()
);

alter table public.import_addresses enable row level security;
create policy "mon adresse d'import" on public.import_addresses for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.import_addresses from authenticated;

-- Une adresse pour chaque profil, existant ou futur
insert into public.import_addresses (user_id) select id from public.profiles;

create function private.add_import_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.import_addresses (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_add_import_address after insert on public.profiles
  for each row execute function private.add_import_address();

-- Nouvelle adresse (si l'ancienne a circulé) : l'ancienne cesse aussitôt de fonctionner
create function public.regenerate_import_alias()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alias text := private.new_import_alias();
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  insert into public.import_addresses (user_id, alias) values (auth.uid(), v_alias)
  on conflict (user_id) do update set alias = excluded.alias, created_at = now();
  return v_alias;
end;
$$;

revoke all on function public.regenerate_import_alias() from public, anon;
grant execute on function public.regenerate_import_alias() to authenticated;

-- ---------------------------------------------------------------------
-- E-mails reçus, en attente de validation
-- ---------------------------------------------------------------------
create table public.pending_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  received_at timestamptz not null default now(),
  from_email text,
  subject text,
  -- en_cours : l'IA lit l'e-mail ; a_valider : réservations prêtes ; erreur : voir error
  status text not null default 'en_cours' check (status in ('en_cours', 'a_valider', 'erreur')),
  error text,
  -- Réservations proposées par l'IA (même forme que BookingDraft côté app)
  drafts jsonb not null default '[]' check (jsonb_typeof(drafts) = 'array'),
  -- Voyage dont les dates correspondent, proposé par défaut
  suggested_trip_id uuid references public.trips (id) on delete set null,
  -- Pièces jointes conservées dans le bucket « imports » : [{path, name, mimeType, size}]
  files jsonb not null default '[]' check (jsonb_typeof(files) = 'array')
);
create index pending_imports_user_idx on public.pending_imports (user_id, received_at desc);

alter table public.pending_imports enable row level security;
create policy "mes imports" on public.pending_imports for select to authenticated
  using (user_id = (select auth.uid()));
-- Une fois traité (réservations ajoutées ou e-mail ignoré), l'import est supprimé
create policy "supprimer un import" on public.pending_imports for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.pending_imports from authenticated;

-- ---------------------------------------------------------------------
-- Pièces jointes des e-mails : bucket privé, chemins « {user_id}/{import_id}/… »
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imports', 'imports', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "imports : lire les siens" on storage.objects for select to authenticated
  using (bucket_id = 'imports' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "imports : supprimer les siens" on storage.objects for delete to authenticated
  using (bucket_id = 'imports' and split_part(name, '/', 1) = (select auth.uid())::text);

-- Personne de non connecté n'accède à ces tables (Supabase les ouvre par défaut à « anon »)
revoke all on public.ai_usage, public.import_addresses, public.pending_imports from anon;
