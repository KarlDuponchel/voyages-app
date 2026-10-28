# Prompt pour les maquettes (Figma Make, Claude Design)

Copier le bloc « Prompt commun » ci-dessous, puis ajouter le complément de l'outil utilisé.
Les couleurs reprennent exactement celles de l'app (`src/theme/palettes.ts`) : si elles changent dans l'app, mettre ce fichier à jour.

---

## Prompt commun

> Crée les maquettes mobiles d'une application de carnet de voyage partagé, en français.
>
> **L'app** : « Voyages » (nom provisoire, domaine tripmates.app). Une app web installable sur iPhone (PWA) qui rassemble au même endroit les billets et réservations d'un voyage (vols, trains, hôtels, activités), un globe des pays visités, les photos et souvenirs, et des statistiques. On voyage à plusieurs : un voyage a des membres (propriétaire, participants, lecteurs) invités par lien. L'IA lit les billets PDF et les e-mails de confirmation transférés, et propose les réservations à valider.
>
> **Ambiance** : un objet de voyage, pas une app générique. Chaleureux, précis, avec du caractère : on doit sentir le papier, l'imprimé, la signalétique. Couleurs de coucher de soleil et de ciel de nuit (voir les variables).
>
> **À éviter absolument (le « style IA » générique)** :
> - de grands arrondis partout, des cartes dans des cartes ;
> - des dégradés sur tout (le dégradé sunset est réservé à un ou deux éléments forts) ;
> - le verre dépoli et les ombres floues partout ;
> - des icônes rondes dans des pastilles teintées répétées à l'identique ;
> - des tuiles de tableau de bord toutes pareilles, des mises en page centrées et symétriques sans hiérarchie ;
> - des emojis décoratifs, du violet-bleu par défaut, des blobs pastel.
>
> **Préférer** : une hiérarchie typographique marquée (très grand contre très petit), des filets fins plutôt que des cadres, des alignements sur une grille, de l'asymétrie, des détails imprimés (perforations, numéros, codes, tampons), des photos plein cadre, et des données lisibles comme sur un vrai billet.
>
> **Trois directions artistiques à proposer, côte à côte**, avec les mêmes écrans et les mêmes couleurs :
> 1. **« Éditorial »**, un magazine de voyage. Rayons de 0 à 4 px. Grandes photos plein cadre, titres très grands, chapeaux et légendes, colonnes, filets fins de séparation, numérotation des étapes (01, 02…). Les listes ressemblent à un sommaire plutôt qu'à des cartes.
> 2. **« Carnet de bord »**, de la papeterie de voyage. Rayons de 2 à 6 px. Billets façon ticket imprimé (perforations, talon détachable, codes en chasse fixe), tampons de pays pour les pays visités, étiquettes de bagage. En thème clair, un léger grain de papier ; en sombre, du papier carbone.
> 3. **« Signalétique »**, inspirée des panneaux d'aéroport et du style suisse. Rayons de 0 à 2 px. Grille stricte, aplats de couleur pleins, pictogrammes simples, grands chiffres (J-17, numéros de porte, heures), bandeaux d'information façon tableau des départs.
>
> Inspirations possibles : les guides Monocle et Cereal pour l'éditorial ; les billets de train et les carnets Moleskine pour le carnet ; la signalétique de Schiphol, la typographie suisse et les tableaux Solari pour la signalétique.
>
> **Format** : iPhone 15 (390 × 844), avec la barre d'état, la Dynamic Island et l'indicateur d'accueil (zones de sécurité respectées). Barre d'onglets en bas : Monde, Voyages, Souvenirs, Profil. Chaque écran en **thème sombre ET en thème clair**.
>
> **Typographie** :
> - Titres en **Bricolage Grotesque** : écran 36 px graisse 800, section 28-30 px graisse 700, carte 18 px graisse 600 ; chiffres clés 30 px graisse 700.
> - Texte en **DM Sans** : corps 15 px, légendes 13 px graisse 500, surtitres 11 px graisse 600 en majuscules espacées.
>
> **Formes, en variables elles aussi** : crée une collection « Formes » avec un mode par direction, pour changer de style aussi simplement que de palette.
>
> | Variable | Éditorial | Carnet de bord | Signalétique |
> |---|---|---|---|
> | radius/sm (champs, petits boutons) | 2 px | 4 px | 0 px |
> | radius/md (cartes, panneaux) | 4 px | 6 px | 2 px |
> | radius/pill (pastilles, filtres) | 2 px | 4 px | 0 px |
> | border/width (filets) | 1 px | 1,5 px | 2 px |
> | shadow | aucune | légère, nette (pas floue) | aucune |
>
> Marges latérales de 20 à 24 px ; barre d'onglets de 64 px. Les pastilles entièrement rondes ne sont gardées que pour les avatars.
>
> **Couleurs : système de variables avec modes, pour tester facilement d'autres palettes.**
> Crée UNE collection de variables de couleur nommées comme ci-dessous. Chaque palette est un **mode** de cette collection, et tous les écrans n'utilisent QUE ces variables (aucune couleur en dur). Changer de mode doit suffire à changer toute l'app.
>
> | Variable | Sombre (actuel) | Clair (actuel) | Rôle |
> |---|---|---|---|
> | bg/base | #0A0F1F | #F6F1E7 | fond de l'app |
> | bg/surface | #141B2F | #FFFFFF | cartes |
> | bg/elevated | #1D2640 | #EEE7DA | éléments posés sur une carte (champs, barres) |
> | border/subtle | #2A3352 | #E2D9C9 | bordures fines |
> | text/primary | #F5F1E8 | #1A1F33 | texte principal |
> | text/secondary | #9AA2BD | #6A6F82 | texte secondaire |
> | text/inverse | #0A0F1F | #FFFFFF | texte sur un fond « text/primary » (onglet actif, billet) |
> | text/on-accent | #0A0F1F | #0A0F1F | texte sur les dégradés orange/jaune |
> | accent/sunset | #FF7A59 | #EE5F3B | couleur principale : boutons, pays visités, vols |
> | accent/sun | #F6C46A | #D4952A | trains, étiquettes, repères du globe |
> | accent/lagoon | #4FD1C5 | #159C8E | activités, « disponible hors ligne », succès |
> | accent/lavender | #A78BFA | #7B5BDF | hôtels |
> | globe/ocean-light | #1E5A9E | #1E5A9E | globe : océan éclairé |
> | globe/ocean-dark | #070D1C | #0B1A33 | globe : océan dans l'ombre |
> | globe/land | #2B4A7A | #2B4A7A | globe : terres |
> | globe/visited | #FF7A59 | #FF7A59 | globe : pays visités |
> | globe/glow | #4FD1C5 | #4FD1C5 | globe : halo |
>
> Dégradés : **sunset** = 120°, #FF7A59 → #F6C46A (carte « Prochain départ », bandeau du billet, barres de progression) ; **dusk** = 90°, #A78BFA → #FF7A59.
> Ombre : sombre `0 20px 40px rgba(0,0,0,0.45)`, clair `0 16px 36px rgba(26,31,51,0.16)`.
>
> Ajoute ensuite **trois palettes alternatives**, chacune en version sombre et claire (donc six modes de plus), en gardant les mêmes noms de variables. Elles doivent rester dans l'esprit voyage, avec un contraste lisible (WCAG AA pour le texte) :
> 1. « Méditerranée » : bleus profonds et terracotta ;
> 2. « Sahara » : sables, ocres et bleu nuit ;
> 3. « Aurore boréale » : verts et violets froids.
> Présente une **planche de comparaison** : le même écran (Monde) dans chacun des huit modes, côte à côte.
>
> **Couleurs par type de réservation** (icône dans une pastille teintée à 16 % de la couleur) : vol = accent/sunset, train et car = accent/sun, bateau et activité = accent/lagoon, hôtel = accent/lavender, location de voiture = accent/sun, autre = text/secondary.
>
> **Écrans à concevoir** (données réalistes en français : Lisbonne, Égypte avec Le Caire, Louxor, Assouan et Hurghada, New York au Yotel Times Square du 14 au 21 novembre, vol TAP TP441 Paris CDG → Lisbonne LIS…) :
> 1. **Connexion** : logo, « Voyages », e-mail, puis saisie d'un code reçu par e-mail (sans mot de passe).
> 2. **Monde (accueil)** : « Bonjour Karl », « Votre monde », globe 3D avec pays visités colorés et repères des villes, pourcentage du monde exploré avec barre, trois tuiles (pays, continents, villes), carte « Prochain départ · J-17 » en dégradé sunset, bouton flottant « + Nouveau voyage ».
> 3. **Voyages** : liste « À venir » et « Passés », chaque voyage en carte avec couverture, pays, titre, dates, nombre de réservations, « à 2 » si partagé, badge J-17 ou « En cours » ; bandeau « 2 e-mails à valider ».
> 4. **Voyage (détail)** : grande couverture (photo ou dégradé avec silhouette de ville) qui se fond dans le fond, boutons retour, modifier, voyageurs ; titre, pays · durée, pastilles dates et budget ; onglets Itinéraire / Billets / Budget / Photos ; bloc « Étapes » (villes reliées par un pointillé) ; réservations groupées par jour (« LUN. 27 SEPT. · JOUR 1 ») ; bouton flottant « + Ajouter ».
> 5. **Billet** : carte d'embarquement façon Apple Wallet (bandeau dégradé avec la compagnie, gros codes CDG → LIS, heures, passager, siège, porte), pastille « Disponible hors ligne », bouton « Afficher le billet » (PDF en plein écran sur fond blanc pour le QR code).
> 6. **Ajouter une réservation** (panneau du bas) : choix « Avec le billet (PDF ou capture) » (l'IA le lit) ou « Saisie manuelle » ; état « Lecture du billet… » animé ; formulaire pré-rempli avec la mention « Rempli par l'IA, vérifiez ».
> 7. **E-mails à valider** : cartes d'e-mails reçus (objet, date), voyage proposé, réservations trouvées avec un bouton « Ajouter » chacune, état « Lecture par l'IA en cours… ».
> 8. **Photos d'un voyage** : grille de photos groupées par jour, bouton « Ajouter des photos », progression d'envoi « 3 sur 12 », visionneuse plein écran (glisser d'une photo à l'autre, auteur « Ajoutée par Louna », « Définir comme couverture »).
> 9. **Souvenirs** : stories en cercles (un voyage par cercle), grande carte « Il y a 1 an aujourd'hui » avec bouton « Revivre », grille de tous les voyages avec leur photo de couverture.
> 10. **Statistiques** : barres par continent, tuiles (kilomètres et tours de la Terre, vols, nuits, ville la plus lointaine), carte « Votre année en voyages ».
> 11. **Profil** : prénom, ville de départ, pays visités en pastilles, adresse d'import par e-mail avec « Copier », notifications, apparence (Auto / Clair / Sombre), installer l'app, compte.
> 12. **Voyageurs** (panneau du bas) : membres avec avatar et rôle, « Inviter quelqu'un » (peut modifier / peut seulement voir), lien d'invitation.
> 13. **Installer l'app** (panneau d'accueil) : icône, « Installez Voyages », trois étapes numérotées avec les icônes iOS (Partager, Sur l'écran d'accueil, Ajouter), « Plus tard ».
> 14. **Notification iOS** sur l'écran verrouillé : « ✈️ Une réservation vient d'atterrir · Yotel New York est prête à rejoindre votre voyage. Un coup d'œil ? ».
>
> **Composants à créer** (avec variantes sombre et claire via les variables) : carte, pastille, bouton (principal, accent, discret), bouton icône (normal, sur photo, accent), champ, contrôle segmenté, barre d'onglets, panneau du bas avec poignée et croix, carte de réservation par type, billet, tuile de statistique, bouton flottant, avatar de membre, story.
>
> Rends une page « Design system » (variables de couleur et de forme, typographie, composants), puis une page par direction artistique avec les écrans. Commence par une **planche de comparaison** : les écrans Monde, Voyage et Billet dans les trois directions, en sombre et en clair.

---

## Complément pour Figma Make

> Construis-le comme un prototype interactif React. Mets toutes les couleurs dans un seul objet de thème (par exemple `palettes.ts`), avec une entrée par mode et les mêmes clés partout, appliquées en variables CSS. Mets aussi les rayons, les filets et les ombres dans un objet `styles.ts`, avec une entrée par direction. Ajoute en haut à droite **deux sélecteurs flottants**, l'un pour la palette (les huit modes), l'autre pour la direction (Éditorial, Carnet de bord, Signalétique). Ils changent toute l'app en direct, et le choix est retenu. Les onglets du bas, les panneaux et les onglets d'un voyage doivent être cliquables. Pas de serveur : données d'exemple en dur.

## Complément pour Claude Design

> Produis des écrans statiques soignés, cadrés en iPhone 15. Définis les couleurs comme des variables CSS sur `:root`, une classe par mode (`.theme-sombre`, `.theme-clair`, `.theme-mediterranee-sombre`…), et fais de même pour les formes (`.style-editorial`, `.style-carnet`, `.style-signaletique`, avec des variables `--radius-sm`, `--radius-md`…). Ajoute une petite barre en haut de la page avec deux choix, palette et direction, pour basculer tous les écrans d'un coup. Commence par la planche de comparaison des directions, puis celle des palettes, puis les écrans 2, 4, 5, 8 et 9.

---

## Rapporter une palette ou une direction dans l'app

- **Une palette retenue** se recopie dans `src/theme/palettes.ts`, avec les mêmes noms en camelCase (`bg/base` devient `bgBase`, `accent/sunset` devient `accentSunset`…). L'app se met à jour toute seule.
- **Une direction retenue** touche davantage : les rayons (`--radius-md`, `--radius-lg`, `--radius-xl` dans `src/styles.css`), puis la forme des composants (cartes, billet, pastilles). C'est un chantier de mise en forme à prévoir avec Claude, écran par écran.
