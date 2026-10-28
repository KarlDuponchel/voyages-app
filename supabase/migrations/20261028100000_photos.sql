-- =====================================================================
-- Photos et vidéos des voyages
--
-- Fichiers compressés sur le téléphone avant l'envoi (sans données de lieu), rangés dans le bucket
-- privé « trip-photos » sous {trip_id}/{photo_id}/… ; une miniature accompagne chaque élément.
-- Qui voit : les membres du voyage. Qui ajoute : le propriétaire et les participants.
-- Qui supprime : l'auteur, et le propriétaire du voyage.
-- =====================================================================

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  kind text not null default 'photo' check (kind in ('photo', 'video')),
  -- Où sont rangés les fichiers : Supabase aujourd'hui, Cloudflare R2 peut-être demain
  storage text not null default 'supabase' check (storage in ('supabase', 'r2')),
  path text not null unique,
  thumb_path text not null unique,
  mime_type text not null,
  width integer check (width > 0),
  height integer check (height > 0),
  duration_seconds numeric(8, 2) check (duration_seconds >= 0),
  -- Poids total (fichier + miniature) : sert aux quotas des comptes gratuits
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  -- Date de prise de vue (lue dans la photo), pour ranger par jour ; sinon la date d'envoi
  taken_at timestamptz,
  caption text check (caption is null or char_length(caption) <= 500),
  created_at timestamptz not null default now(),
  check (path like trip_id::text || '/%' and thumb_path like trip_id::text || '/%')
);
create index trip_photos_trip_idx on public.trip_photos (trip_id, taken_at);

-- Couverture du voyage : une de ses photos (ou aucune, et le dégradé reste)
alter table public.trips add column cover_photo_id uuid references public.trip_photos (id) on delete set null;

create function private.cover_photo_same_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cover_photo_id is not null and not exists (
    select 1 from public.trip_photos p where p.id = new.cover_photo_id and p.trip_id = new.id and p.kind = 'photo'
  ) then
    raise exception 'La couverture doit être une photo de ce voyage';
  end if;
  return new;
end;
$$;

create trigger trips_cover_photo_check before insert or update of cover_photo_id on public.trips
  for each row execute function private.cover_photo_same_trip();

grant update (cover_photo_id) on public.trips to authenticated;

-- ---------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------
create function private.can_delete_photo(p_photo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_photos p
    where p.id = p_photo
      and (p.uploaded_by = (select auth.uid()) or private.is_trip_owner(p.trip_id))
  );
$$;

-- Photo désignée par un chemin de stockage « {trip_id}/{photo_id}/… » (null si invalide)
create function private.photo_id_from_path(p_path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_path, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_path, '/', 2)::uuid
  end;
$$;

revoke all on function private.can_delete_photo(uuid), private.photo_id_from_path(text) from public;
grant execute on function private.can_delete_photo(uuid), private.photo_id_from_path(text) to authenticated;

alter table public.trip_photos enable row level security;
create policy "voir les photos" on public.trip_photos for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "ajouter une photo" on public.trip_photos for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and private.can_edit_trip(trip_id));
create policy "légender une photo" on public.trip_photos for update to authenticated
  using (private.can_delete_photo(id)) with check (private.can_delete_photo(id));
create policy "supprimer une photo" on public.trip_photos for delete to authenticated
  using (private.can_delete_photo(id));

revoke update on public.trip_photos from authenticated;
grant update (caption, taken_at) on public.trip_photos to authenticated;
revoke all on public.trip_photos from anon;

-- ---------------------------------------------------------------------
-- Stockage : bucket privé, 50 Mo maximum par fichier (vidéos compressées : 30 Mo visés)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 52428800, array['image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "trip-photos : voir" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and private.is_trip_member(private.trip_id_from_path(name)));
-- Envoi des fichiers avant la ligne trip_photos : il suffit de pouvoir modifier le voyage
create policy "trip-photos : envoyer" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and private.can_edit_trip(private.trip_id_from_path(name)));
-- Suppression : l'auteur ou le propriétaire, ou un fichier orphelin (envoi interrompu) par un participant
create policy "trip-photos : supprimer" on storage.objects for delete to authenticated
  using (
    bucket_id = 'trip-photos'
    and (
      private.can_delete_photo(private.photo_id_from_path(name))
      or (
        private.can_edit_trip(private.trip_id_from_path(name))
        and not exists (select 1 from public.trip_photos p where p.id = private.photo_id_from_path(name))
      )
    )
  );
