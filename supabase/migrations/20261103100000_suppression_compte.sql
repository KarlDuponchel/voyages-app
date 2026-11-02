-- =====================================================================
-- Suppression de compte (RGPD) : la base et les fichiers
--
-- La base s'en charge déjà (voir after_member_removed, schéma initial) : supprimer le compte retire
-- la personne de ses voyages ; un voyage sans plus aucun membre est supprimé, avec ses réservations,
-- étapes et photos (cascade) ; un voyage partagé dont elle était propriétaire passe au membre le plus
-- ancien (participant avant lecteur), qui en paie désormais les photos (premium, « le propriétaire paie pour tous »).
--
-- Restent les fichiers : Postgres ne peut pas effacer les objets du stockage Supabase (supprimer une
-- ligne de storage.objects laisse le fichier). La fonction serveur delete-account lit donc la liste
-- ci-dessous, efface les fichiers par l'API du stockage, résilie l'abonnement Stripe, puis supprime
-- le compte. L'ancienne fonction delete_my_account() est retirée : elle oubliait les fichiers.
-- =====================================================================

-- Fichiers à effacer avec un compte : billets et photos des voyages dont il est le seul membre
-- (y compris ceux d'envois interrompus, sans ligne en base), et ses pièces jointes d'e-mails.
-- Ceux des voyages partagés restent : ils appartiennent aussi aux autres membres.
create function public.account_files(p_user uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  with solo as (
    select m.trip_id from public.trip_members m
    group by m.trip_id
    having bool_and(m.user_id = p_user)
  )
  select o.bucket_id, o.name
  from storage.objects o
  where (o.bucket_id in ('trip-files', 'trip-photos') and private.trip_id_from_path(o.name) in (select s.trip_id from solo s))
     or (o.bucket_id = 'imports' and split_part(o.name, '/', 1) = p_user::text)
  order by o.bucket_id, o.name;
$$;

revoke all on function public.account_files(uuid) from public, anon, authenticated;
grant execute on function public.account_files(uuid) to service_role;

drop function public.delete_my_account();
