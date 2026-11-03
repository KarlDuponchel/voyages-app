-- =====================================================================
-- Îles et régions dans la recherche de lieux (demande de Karl, 03/11) : « Minorque », « Corse », « Bali ».
-- - places.kind accepte 'ile' et 'region' ; une île ou une région a ses propres coordonnées et son fuseau.
-- - Classement : une île ou une région compte comme un lieu de 20 000 à 300 000 habitants. Tapée en entier,
--   elle passe devant les villages homonymes (« corse ») ; une grande ville du même nom reste devant
--   (« madrid » : la ville avant la région) ; sur un début de nom, les grandes villes d'abord.
-- - trip_destinations.place_kind garde la sorte de chaque étape : une étape « pays », « île » ou
--   « région » n'est pas une ville (statistiques, repères du globe).
-- =====================================================================

alter table public.places drop constraint places_kind_check;
alter table public.places add constraint places_kind_check check (kind in ('ville', 'pays', 'ile', 'region'));

alter table public.trip_destinations
  add column place_kind text not null default 'ville' check (place_kind in ('ville', 'pays', 'ile', 'region'));

-- Étapes « pays » déjà créées depuis l'ajout des pays (même nom qu'un pays de la recherche)
update public.trip_destinations d set place_kind = 'pays'
where exists (select 1 from public.places p where p.kind = 'pays' and p.name = d.city);

create or replace function public.search_places(p_query text, p_limit integer default 6)
returns table (id integer, name text, admin1 text, country_code text, lat double precision, lng double precision, timezone text, kind text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := public.normalize_place(p_query);
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 20);
  v_found integer;
begin
  if length(v_q) < 2 then
    return;
  end if;

  -- 1. Noms qui commencent par le texte tapé (index place_names_prefix), classés par population :
  --    un nom exact compte 100 fois plus, un nom local moitié moins ;
  --    un pays sur un début de nom, 1 million au plus ; une île ou une région, de 20 000 à 300 000
  return query
  select p.id, p.name, p.admin1, p.country_code::text, p.lat, p.lng, p.timezone, p.kind
  from (
    select n.place_id, max((case when n.search = v_q then 100 else 1 end) * (case when n.principal then 1 else 0.5 end)) as weight
    from public.place_names n
    where n.search >= v_q and n.search < v_q || '{'
    group by n.place_id
  ) h
  join public.places p on p.id = h.place_id
  order by (
    case p.kind
      when 'ville' then p.population
      when 'pays' then case when h.weight >= 50 then p.population else least(p.population, 1000000) end
      else least(greatest(p.population, 20000), 300000)
    end + 1) * h.weight desc
  limit v_limit;
  get diagnostics v_found = row_count;

  -- 2. S'il manque des résultats : fautes de frappe (index place_names_trgm), du plus proche au plus éloigné
  if v_found >= v_limit or length(v_q) < 4 then
    return;
  end if;
  return query
  select p.id, p.name, p.admin1, p.country_code::text, p.lat, p.lng, p.timezone, p.kind
  from (
    select n.place_id, max(extensions.similarity(n.search, v_q)) as sim
    from public.place_names n
    where n.search operator(extensions.%) v_q
    group by n.place_id
  ) h
  join public.places p on p.id = h.place_id
  where not exists (select 1 from public.place_names m where m.place_id = h.place_id and m.search >= v_q and m.search < v_q || '{')
  order by h.sim desc, p.population desc
  limit v_limit - v_found;
end;
$$;

revoke all on function public.search_places(text, integer) from public, anon;
grant execute on function public.search_places(text, integer) to authenticated;
