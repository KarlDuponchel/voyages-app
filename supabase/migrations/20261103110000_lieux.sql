-- =====================================================================
-- Recherche de villes hébergée chez nous (au lieu de l'API gratuite d'Open-Meteo,
-- réservée à l'usage non commercial). Données GeoNames (CC BY 4.0) : lieux habités
-- d'au moins 500 habitants, avec leur nom français, leur région, leur pays et leur fuseau.
-- Les données sont chargées à part : scripts/lieux/ (voir docs/lieux.md).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- Minuscules, sans accents ni ponctuation : « Saint-Étienne » → « saint etienne ».
-- Utilisée à l'import (colonne générée) comme à la recherche : les deux restent cohérents.
create function public.normalize_place(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(replace(replace(replace(lower(t), 'œ', 'oe'), 'æ', 'ae'), 'ß', 'ss'),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿāăąćĉċčďēĕėęěĝğġģĥĩīĭįĵķĺļľńņňōŏőŕŗřśŝşšţťũūŭůűųŵŷźżžơưǎǐǒǔǖǘǚǜǟǡǧǩǫǭǰǵǹǻȁȃȅȇȉȋȍȏȑȓȕȗșțȟȧȩȫȭȯȱȳḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕẖẗẘẙạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹøđłıħŧðþŀƒ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaccccdeeeeegggghiiiijklllnnnooorrrssssttuuuuuuwyzzzouaiouuuuuaagkoojgnaaaeeiioorruusthaeooooyabbbcdddddeeeeefghhhhhiikkkllllmmmnnnnoooopprrrrsssssttttuuuuuvvwwwwwxxyzzzhtwyaaaaaaaaaaaaeeeeeeeeiioooooooooooouuuuuuuyyyyodlihtdtlf'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

create table public.places (
  id integer primary key,          -- identifiant GeoNames
  name text not null,              -- nom affiché (français s'il existe)
  admin1 text,                     -- région, en français si possible
  country_code char(2) not null,   -- code ISO alpha-2
  lat double precision not null,
  lng double precision not null,
  timezone text,
  population integer not null default 0
);

-- Noms cherchables (« Lisbon », « Lisboa » trouvent Lisbonne) : principaux (français, GeoNames, ASCII, anglais)
-- et nom dans la langue du pays (Lisboa, München, Firenze), classé après les principaux
create table public.place_names (
  place_id integer not null references public.places (id) on delete cascade,
  search text collate "C" generated always as (public.normalize_place(name)) stored,
  name text not null,
  principal boolean not null default true
);
create index place_names_prefix on public.place_names (search);
create index place_names_trgm on public.place_names using gin (search extensions.gin_trgm_ops);
create index place_names_place on public.place_names (place_id);

-- Accès seulement par la fonction de recherche
alter table public.places enable row level security;
alter table public.place_names enable row level security;
revoke all on public.places, public.place_names from anon, authenticated;

-- Recherche au fil de la frappe. Deux groupes : d'abord les noms qui commencent par le texte tapé,
-- classés par population (un nom exact compte 100 fois plus, un nom local moitié moins : « par »
-- donne Paris avant le village de Par, « vik » donne bien Vík) ; ensuite les noms ressemblants
-- (fautes de frappe), du plus proche au plus éloigné.
create function public.search_places(p_query text, p_limit integer default 6)
returns table (id integer, name text, admin1 text, country_code text, lat double precision, lng double precision, timezone text)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.normalize_place(p_query) as s),
  hits as (
    select n.place_id,
      (n.search >= q.s and n.search < q.s || '{') as prefix,
      (case when n.search = q.s then 100 else 1 end) * (case when n.principal then 1 else 0.5 end) as weight,
      extensions.similarity(n.search, q.s) as sim
    from public.place_names n, q
    where length(q.s) >= 2
      and ((n.search >= q.s and n.search < q.s || '{')
        or (length(q.s) >= 4 and n.search operator(extensions.%) q.s))
  ),
  best as (
    select h.place_id, bool_or(h.prefix) as prefix, max(h.weight) filter (where h.prefix) as weight, max(h.sim) as sim
    from hits h
    group by h.place_id
  )
  select p.id, p.name, p.admin1, p.country_code::text, p.lat, p.lng, p.timezone
  from best b
  join public.places p on p.id = b.place_id
  order by b.prefix desc, (p.population + 1) * coalesce(b.weight, 0) desc, b.sim desc, p.population desc
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;

revoke all on function public.search_places(text, integer) from public, anon;
grant execute on function public.search_places(text, integer) to authenticated;
