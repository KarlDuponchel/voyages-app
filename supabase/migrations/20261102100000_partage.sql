-- =====================================================================
-- Partage public des photos et vidéos, et réactions
--
-- Une photo reste privée (visible des membres du voyage) tant que son auteur ne la publie pas.
-- Publiée, elle est visible de tous les utilisateurs connectés (jamais sans compte), rattachée
-- à une ville du voyage : on garde la position de la ville, jamais celle de la photo.
-- Les autres ne voient que la photo, la ville, le mois de prise de vue et l'auteur (nom, avatar) :
-- jamais le voyage (titre, dates, membres). Dépublier est immédiat : aucun fichier n'est copié.
-- Réactions : une par personne et par photo (J'aime, J'adore, Waouh, Wishlist).
-- Modération : signalements (masquage automatique à 3 personnes), blocage d'un utilisateur,
-- et au plus 30 nouvelles publications par jour et par personne.
-- =====================================================================

create table public.photo_shares (
  photo_id uuid primary key references public.trip_photos (id) on delete cascade,
  -- Pour que les membres du voyage voient quelles photos sont publiques ; jamais exposé aux autres
  trip_id uuid not null references public.trips (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  destination_id uuid references public.trip_destinations (id) on delete set null,
  -- Ville recopiée à la publication : elle reste si l'étape est supprimée du voyage
  city text not null check (char_length(city) between 1 and 120),
  country_code char(3) not null check (country_code ~ '^[0-9]{3}$'),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- Légende publique, distincte de celle du voyage (écrite pour les proches)
  caption text check (caption is null or char_length(caption) <= 300),
  published_at timestamptz not null default now(),
  -- Modération : une photo masquée n'apparaît plus qu'à son auteur et aux membres du voyage
  hidden_at timestamptz,
  hidden_reason text
);
create index photo_shares_place_idx on public.photo_shares (country_code, city, published_at desc) where hidden_at is null;
create index photo_shares_published_idx on public.photo_shares (published_at desc) where hidden_at is null;
create index photo_shares_author_idx on public.photo_shares (author_id);

create table public.photo_reactions (
  photo_id uuid not null references public.photo_shares (photo_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('jaime', 'jadore', 'waouh', 'wishlist')),
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
create index photo_reactions_user_idx on public.photo_reactions (user_id, kind);

-- ---------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------
create function private.is_public_photo(p_photo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.photo_shares s where s.photo_id = p_photo and s.hidden_at is null);
$$;

revoke all on function private.is_public_photo(uuid) from public;
grant execute on function private.is_public_photo(uuid) to authenticated;

alter table public.photo_shares enable row level security;
-- Lecture directe : l'auteur et les membres du voyage (badge « publique »). Les autres passent
-- par public_photos(), qui ne renvoie que des colonnes sans risque.
create policy "voir mes partages et ceux du voyage" on public.photo_shares for select to authenticated
  using (author_id = (select auth.uid()) or private.is_trip_member(trip_id));
-- Publier passe par publish_photo() ; dépublier : l'auteur, ou le propriétaire du voyage
create policy "dépublier" on public.photo_shares for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_trip_owner(trip_id));
revoke all on public.photo_shares from anon, authenticated;
grant select, delete on public.photo_shares to authenticated;

alter table public.photo_reactions enable row level security;
create policy "mes réactions" on public.photo_reactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "réagir" on public.photo_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_public_photo(photo_id));
create policy "changer de réaction" on public.photo_reactions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and private.is_public_photo(photo_id));
create policy "retirer ma réaction" on public.photo_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.photo_reactions from anon, authenticated;
grant select, insert, delete on public.photo_reactions to authenticated;
grant update (kind) on public.photo_reactions to authenticated;

-- Fichiers : une photo publique (et sa miniature) se lit par tout utilisateur connecté
create policy "trip-photos : voir les photos publiques" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and private.is_public_photo(private.photo_id_from_path(name)));

-- ---------------------------------------------------------------------
-- Modération
-- ---------------------------------------------------------------------
-- Signalement d'une photo publique, une fois par personne ; à 3 personnes, elle est masquée en
-- attendant une décision (tableau de bord Supabase : voir docs/partage.md)
create table public.photo_reports (
  photo_id uuid not null references public.photo_shares (photo_id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  reason text not null check (reason in ('inapproprie', 'personne', 'droits', 'spam', 'autre')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  primary key (photo_id, reporter_id)
);

create function private.hide_reported_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.photo_reports r where r.photo_id = new.photo_id) >= 3 then
    update public.photo_shares set hidden_at = now(), hidden_reason = 'signalements'
    where photo_id = new.photo_id and hidden_at is null;
  end if;
  return new;
end;
$$;

create trigger photo_reports_hide after insert on public.photo_reports
  for each row execute function private.hide_reported_photo();

-- Signaler : une photo publique, pas la sienne
create function private.can_report(p_photo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.photo_shares s
    where s.photo_id = p_photo and s.hidden_at is null and s.author_id <> (select auth.uid())
  );
$$;

-- Bloquer quelqu'un : on ne voit plus ses photos, il ne voit plus les nôtres
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

revoke all on function private.can_report(uuid) from public;
grant execute on function private.can_report(uuid) to authenticated;

alter table public.photo_reports enable row level security;
create policy "mes signalements" on public.photo_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "signaler" on public.photo_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and private.can_report(photo_id));
revoke all on public.photo_reports from anon, authenticated;
grant select, insert on public.photo_reports to authenticated;

alter table public.user_blocks enable row level security;
create policy "mes blocages" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "bloquer" on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "débloquer" on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

-- ---------------------------------------------------------------------
-- Publier : seul l'auteur, encore membre du voyage, et dans une ville de ce voyage.
-- Republier change la ville ou la légende, sans perdre les réactions.
-- ---------------------------------------------------------------------
create function public.publish_photo(p_photo uuid, p_destination uuid, p_caption text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo public.trip_photos;
  v_dest public.trip_destinations;
begin
  select * into v_photo from public.trip_photos where id = p_photo;
  if v_photo.id is null or v_photo.uploaded_by is distinct from auth.uid() or not private.is_trip_member(v_photo.trip_id) then
    raise exception 'Seul l''auteur de la photo peut la rendre publique';
  end if;
  select * into v_dest from public.trip_destinations where id = p_destination and trip_id = v_photo.trip_id;
  if v_dest.id is null then
    raise exception 'La ville doit être une étape de ce voyage';
  end if;
  if not exists (select 1 from public.photo_shares where photo_id = p_photo)
     and (select count(*) from public.photo_shares s where s.author_id = auth.uid() and s.published_at > now() - interval '1 day') >= 30 then
    raise exception 'Vous avez publié 30 photos aujourd''hui : réessayez demain.';
  end if;

  insert into public.photo_shares (photo_id, trip_id, author_id, destination_id, city, country_code, lat, lng, caption)
  values (v_photo.id, v_photo.trip_id, v_photo.uploaded_by, v_dest.id, v_dest.city, v_dest.country_code, v_dest.lat, v_dest.lng,
          nullif(trim(p_caption), ''))
  on conflict (photo_id) do update
    set destination_id = excluded.destination_id, city = excluded.city, country_code = excluded.country_code,
        lat = excluded.lat, lng = excluded.lng, caption = excluded.caption;
end;
$$;

-- ---------------------------------------------------------------------
-- Lire les photos publiques (sans le voyage). Filtres facultatifs : pays, ville, ma wishlist
-- (photos auxquelles j'ai réagi « Wishlist ») ; pagination par date de publication
-- (p_before = published_at de la dernière reçue).
-- Le mois de prise de vue seulement : ne pas dire où se trouve quelqu'un aujourd'hui.
-- ---------------------------------------------------------------------
create function public.public_photos(
  p_country char(3) default null,
  p_city text default null,
  p_before timestamptz default null,
  p_limit integer default 30,
  p_wishlist boolean default false
)
returns table (
  photo_id uuid,
  kind text,
  path text,
  thumb_path text,
  width integer,
  height integer,
  duration_seconds numeric,
  taken_month date,
  city text,
  country_code char(3),
  caption text,
  published_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar text,
  reactions jsonb,
  my_reaction text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.photo_id, p.kind, p.path, p.thumb_path, p.width, p.height, p.duration_seconds,
    date_trunc('month', coalesce(p.taken_at, p.created_at))::date,
    s.city, s.country_code, s.caption, s.published_at,
    s.author_id, a.display_name, a.avatar_path,
    coalesce((select jsonb_object_agg(r.kind, r.n) from (
      select kind, count(*) as n from public.photo_reactions where photo_id = s.photo_id group by kind
    ) r), '{}'::jsonb),
    (select r.kind from public.photo_reactions r where r.photo_id = s.photo_id and r.user_id = (select auth.uid()))
  from public.photo_shares s
  join public.trip_photos p on p.id = s.photo_id
  join public.profiles a on a.id = s.author_id
  where s.hidden_at is null
    and (select auth.uid()) is not null
    and (p_country is null or s.country_code = p_country)
    and (p_city is null or lower(s.city) = lower(p_city))
    and (p_before is null or s.published_at < p_before)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = s.author_id)
         or (b.blocker_id = s.author_id and b.blocked_id = (select auth.uid()))
    )
    and (not coalesce(p_wishlist, false) or exists (
      select 1 from public.photo_reactions w
      where w.photo_id = s.photo_id and w.user_id = (select auth.uid()) and w.kind = 'wishlist'
    ))
  order by s.published_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- Villes qui ont des photos publiques, pour le globe : nombre et dernière miniature
create function public.public_places()
returns table (
  city text,
  country_code char(3),
  lat double precision,
  lng double precision,
  photo_count bigint,
  cover_thumb_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    min(s.city), s.country_code, avg(s.lat), avg(s.lng), count(*),
    (array_agg(p.thumb_path order by s.published_at desc) filter (where p.kind = 'photo'))[1]
  from public.photo_shares s
  join public.trip_photos p on p.id = s.photo_id
  where s.hidden_at is null and (select auth.uid()) is not null
  group by s.country_code, lower(s.city)
  order by count(*) desc;
$$;

-- Réagir (ou changer de réaction, ou la retirer avec p_kind vide), avec les droits de l'utilisateur
create function public.react_to_photo(p_photo uuid, p_kind text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_kind is null then
    delete from public.photo_reactions where photo_id = p_photo and user_id = (select auth.uid());
  else
    insert into public.photo_reactions (photo_id, kind) values (p_photo, p_kind)
    on conflict (photo_id, user_id) do update set kind = excluded.kind;
  end if;
end;
$$;

revoke all on function public.react_to_photo(uuid, text) from public, anon;
grant execute on function public.react_to_photo(uuid, text) to authenticated;
revoke all on function public.publish_photo(uuid, uuid, text), public.public_photos(char, text, timestamptz, integer, boolean),
  public.public_places() from public, anon;
grant execute on function public.publish_photo(uuid, uuid, text), public.public_photos(char, text, timestamptz, integer, boolean),
  public.public_places() to authenticated;
