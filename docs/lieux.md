# Recherche de villes

Quand on crée un voyage ou qu'on choisit sa ville de départ, la ville se cherche dans notre propre base Supabase. Depuis le 03/11, il n'y a plus d'appel à Open-Meteo : son API gratuite est réservée à l'usage non commercial, et rien ne part vers un service tiers.

## Données

- **Source** : [GeoNames](https://www.geonames.org/), sous licence CC BY 4.0. Le crédit est affiché sous les résultats de recherche et dans les mentions légales.
- **Lieux** : les lieux habités d'au moins 500 habitants (`cities500`), sans les quartiers ni les lieux abandonnés ou historiques. Environ 226 000 lieux.
- **Pour chaque lieu** : le nom en français s'il existe, la région en français, le pays, les coordonnées, le fuseau horaire et la population.
- **Noms cherchables** (environ 242 000) : le nom français, le nom GeoNames, sa version sans accents, le nom anglais, et le nom dans la langue du pays (Lisboa, München, Firenze, Praha, Wien). Ce dernier est classé après les autres, pour ne pas confondre Bienne (Suisse) avec un ancien nom de Vienne.
- **Limite connue** : les îles et les régions ne sont pas des lieux habités. « Santorin » ne donne rien : il faut taper Fira, le chef-lieu, ou Oia.

## Base (migration `20261103110000_lieux.sql`)

- `public.places` : un lieu par ligne (identifiant GeoNames).
- `public.place_names` : les noms cherchables, avec une colonne `search` calculée par `public.normalize_place()` (minuscules, sans accents ni ponctuation).
- `public.search_places(p_query, p_limit)` :
  - d'abord les noms qui commencent par le texte tapé, classés par population ; un nom exact compte 100 fois plus, un nom local moitié moins (« par » donne Paris avant le village de Par) ;
  - ensuite les noms ressemblants, pour les fautes de frappe (« reykjavick », « marrakesh »), à partir de 4 lettres.
- Les tables ne se lisent que par cette fonction, réservée aux utilisateurs connectés.
- Tests : `npm run test:db` (section « villes »).

## Charger ou rafraîchir les données (une fois par an suffit)

1. Télécharger dans un dossier hors du projet, depuis https://download.geonames.org/export/dump/ :
   - `cities500.zip` (environ 14 Mo), à décompresser ;
   - `admin1CodesASCII.txt` et `countryInfo.txt` ;
   - `alternateNamesV2.zip` (environ 200 Mo, 790 Mo une fois décompressé).
2. Préparer les fichiers SQL (une quinzaine de secondes) :

```bash
node scripts/lieux/preparer.mjs <dossier GeoNames> <dossier de sortie>
```

3. Les charger dans la base en ligne (58 fichiers ; le premier vide les tables) :

```bash
node scripts/lieux/importer.mjs <dossier de sortie>
```

Pendant le chargement, la recherche de villes renvoie des résultats incomplets. Le reste de l'app fonctionne normalement.
