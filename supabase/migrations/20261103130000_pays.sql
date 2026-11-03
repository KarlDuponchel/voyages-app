-- =====================================================================
-- Pays dans la recherche de lieux (demande de Karl, 03/11) : « Islande » pour un road trip.
-- Un pays a la position et le fuseau de sa capitale. Il passe devant les villes quand son nom
-- est tapé en entier ; sur un début de nom, sa population compte au plus pour 1 million
-- (« par » donne Paris avant le Paraguay, « isl » propose Islamabad et l'Islande).
-- =====================================================================

alter table public.places
  add column kind text not null default 'ville' check (kind in ('ville', 'pays'));

-- Le type de retour change (colonne kind) : la fonction est recréée
drop function public.search_places(text, integer);

create function public.search_places(p_query text, p_limit integer default 6)
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
  --    un nom exact compte 100 fois plus, un nom local moitié moins ; un pays sur un début de nom, 1 million au plus
  return query
  select p.id, p.name, p.admin1, p.country_code::text, p.lat, p.lng, p.timezone, p.kind
  from (
    select n.place_id, max((case when n.search = v_q then 100 else 1 end) * (case when n.principal then 1 else 0.5 end)) as weight
    from public.place_names n
    where n.search >= v_q and n.search < v_q || '{'
    group by n.place_id
  ) h
  join public.places p on p.id = h.place_id
  order by (case when p.kind = 'pays' and h.weight < 50 then least(p.population, 1000000) else p.population end + 1) * h.weight desc
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
