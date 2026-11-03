-- =====================================================================
-- Rappel la veille d'un vol (demande de Karl, 03/11) : notification à tous les voyageurs du voyage,
-- environ 24 h avant le départ, pour l'enregistrement en ligne.
-- - bookings.reminded_at : rappel envoyé (un seul par vol ; remis à zéro si l'heure du vol change).
-- - due_flight_reminders() : vols qui partent dans 22 à 26 h (heure du lieu de départ), réservée au serveur.
-- - Toutes les heures, pg_cron appelle la fonction flight-reminders (pg_net), avec le secret rangé dans
--   le coffre de Supabase (vault, nom « cron_secret ») ; rien de secret dans ce fichier.
-- =====================================================================

alter table public.bookings add column reminded_at timestamptz;

-- Vol déplacé : on prévient de nouveau pour la nouvelle date
create function public.reset_flight_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at or new.timezone is distinct from old.timezone then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;

create trigger bookings_reset_reminder
  before update of starts_at, timezone on public.bookings
  for each row execute function public.reset_flight_reminder();

create function public.due_flight_reminders()
returns table (booking_id uuid, trip_id uuid, title text, starts_at timestamp, ticket jsonb, departs_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.trip_id, b.title, b.starts_at, b.ticket, x.departs_at
  from public.bookings b
  -- Heure locale du départ + fuseau de la réservation (sinon celui de la première étape, sinon Paris)
  cross join lateral (
    select b.starts_at at time zone coalesce(
      b.timezone,
      (select d.timezone from public.trip_destinations d where d.trip_id = b.trip_id and d.timezone is not null order by d.position limit 1),
      'Europe/Paris'
    ) as departs_at
  ) x
  where b.kind = 'vol'
    and b.reminded_at is null
    and x.departs_at > now() + interval '22 hours'
    and x.departs_at <= now() + interval '26 hours'
$$;

revoke all on function public.due_flight_reminders() from public, anon, authenticated;
grant execute on function public.due_flight_reminders() to service_role;

-- Planification, seulement là où pg_cron et pg_net existent (Supabase ; pas dans la base des tests)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule(
      'rappels-vol',
      '5 * * * *',
      $job$
        select net.http_post(
          url := 'https://qpxcaywcslayfmcjcpgw.supabase.co/functions/v1/flight-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end;
$$;
