# Couvertures par thème

Un voyage sans photo de couverture montre une photo d'ambiance au lieu du dégradé : ville, plage, montagne, neige, nature, campagne, lac ou désert (demande de Karl, 03/11).

## Fonctionnement

- **Choix** : dans « Nouveau voyage », une fois la destination choisie, et dans « Modifier le voyage ». La photo de couverture choisie dans l'onglet Photos passe toujours devant.
- **Sans choix** : le thème est deviné d'après la première étape (`src/lib/covers.ts`) et n'est pas enregistré (`trips.cover_theme` vide), pour suivre les changements d'étapes :
  - une île, ou un pays de plages (Maldives, Seychelles, Polynésie…) : plage ;
  - un pays de désert (Égypte, Jordanie, Émirats, Namibie…) : désert ;
  - une ville : ville ;
  - un pays, une région : neige (Groenland, Finlande…), montagne (Islande, Norvège, Suisse, Népal…), sinon nature.
- **Fichiers** : `public/couvertures/<thème>.webp` (1 280 × 960, en-tête d'un voyage) et `<thème>-mini.webp` (480 × 360, listes). Les miniatures sont dans le cache de l'app installée dès l'installation (environ 150 Ko) ; les grands formats sont gardés à la première vue.
- **Barre d'état** de l'iPhone au-dessus d'un voyage : la couleur du haut de la photo (`top` dans `COVER_THEMES`).
- **Base** : migration `20261103150000_couverture_theme.sql` (colonne `trips.cover_theme`).

## Crédits

Photos [Unsplash](https://unsplash.com/license) : usage gratuit, commercial compris, sans attribution obligatoire. Recadrées en 4:3 et réenregistrées en WebP.

| Thème | Photographe | Source |
|---|---|---|
| ville | Rafael Peier | https://unsplash.com/photos/TiAFExF2_-s |
| plage | Sébastien Jermer | https://unsplash.com/photos/n7DY58YFg9E |
| montagne | Christopher Politano | https://unsplash.com/photos/upUWK5P0rvI |
| neige | Ilia Bronskiy | https://unsplash.com/photos/Z6QC1ey6XAw |
| nature | Karsten Würth | https://unsplash.com/photos/fLiXooyviwo |
| desert | Andrew Svk | https://unsplash.com/photos/0s9oD70F-l4 |
| campagne | Anna Hunko | https://unsplash.com/photos/79FfEFEASXo |
| lac | Adam Vradenburg | https://unsplash.com/photos/GA09PKfRIQY |

## Ajouter ou changer une photo

1. Télécharger depuis `images.unsplash.com` avec `?w=1600&q=82&fm=jpg&fit=crop&crop=entropy&ar=4:3`.
2. Produire les deux WebP avec `sharp` (grand format qualité 76, miniature qualité 72), comme dans la séance du 03/11.
3. Ajouter le thème dans `COVER_THEMES` (avec la couleur du haut de la photo), dans `CoverTheme` (`src/data/types.ts`) et dans la contrainte de `trips.cover_theme` (nouvelle migration).
