-- =====================================================================
-- Retours des utilisateurs (demande de Karl, 03/11) : « Un bug, une idée ? » dans le profil.
-- - feedback : écrite seulement par la fonction feedback (clé serveur), qui envoie aussi l'e-mail à l'équipe ;
--   chacun peut relire ses propres envois.
-- - Bucket privé « feedback » : capture d'écran facultative, dans le dossier de l'utilisateur ({user_id}/…),
--   lue seulement par le serveur (lien temporaire dans l'e-mail).
-- =====================================================================

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('bug', 'idee')),
  message text not null check (char_length(message) between 1 and 4000),
  page text check (page is null or char_length(page) <= 300),
  device text check (device is null or char_length(device) <= 500),
  screenshot_path text,
  created_at timestamptz not null default now()
);
create index feedback_user_idx on public.feedback (user_id, created_at);

alter table public.feedback enable row level security;
revoke insert, update, delete on public.feedback from anon, authenticated;
create policy "voir ses retours" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "capture d'un retour dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and split_part(name, '/', 1) = (select auth.uid())::text);
