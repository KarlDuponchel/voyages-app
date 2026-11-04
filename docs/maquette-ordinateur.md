# Maquette de la version ordinateur : prompt pour Figma Make

À coller tel quel dans Figma Make. Joindre si possible 3 ou 4 captures de l'app sur téléphone
(Monde, un voyage, Explorer, la visionneuse) pour qu'il reprenne le style existant.

---

Conçois la version ordinateur de **Tripmates**, une app web de carnet de voyage partagé qui existe déjà sur téléphone. Garde exactement la même identité visuelle que l'app mobile. Il ne s'agit pas d'en créer une nouvelle : l'app doit enfin profiter de la largeur de l'écran au lieu d'afficher une colonne de téléphone au milieu.

**Le produit.** On y prépare et on revit ses voyages, seul ou à plusieurs.
- **Globe des pays visités** et statistiques (pays, continents, villes, part du monde explorée).
- **Voyages** avec :
  - un itinéraire par étapes ;
  - des réservations : vols, trains, hôtels et activités, avec billets et cartes d'embarquement ;
  - un budget partagé : dépenses, « qui doit quoi », remboursements ;
  - des photos partagées entre voyageurs.
- **Souvenirs** : tes photos, par voyage.
- **Explorer** : les photos rendues publiques par la communauté, regroupées par ville, avec des réactions.

Tout le texte est en français, sur un ton chaleureux et direct.

**Identité visuelle (à respecter).**
- Polices :
  - titres en **DM Serif Display** ;
  - texte en **DM Sans** ;
  - petites étiquettes en capitales espacées (« VILLES TENDANCES »).
- Thème clair :
  - fond crème `#F7F3E9` ;
  - cartes papier `#FFFCF4` ;
  - éléments posés sur une carte en vert sauge `#DFE5CF` ;
  - texte vert forêt `#183F37`.
- Thème sombre :
  - fond forêt profonde `#0F302A` ;
  - cartes `#183F37` ;
  - texte crème `#F7F3E9`.
- Accents :
  - corail `#F26B4B` : action principale et pays visités ;
  - doré `#E9AD3A` : repères et étiquettes ;
  - lagon `#7FC4B2` : activités ;
  - lavande `#B9A8E2` : hôtels.
- Coins arrondis de 14, 20 et 28 px. Ombres douces et diffuses (`0 10px 30px` à 10 % de vert forêt). Fines bordures.
- Navigation en verre dépoli vert forêt, avec la pastille de l'onglet actif et un point corail au-dessus.
- Le globe : terres vert sauge, pays visités en corail, points dorés sur les villes, fines lignes de méridiens.
- Pas de dégradés violets, pas d'icônes en couleur. Des icônes au trait fin, du style Lucide.

**Cadre.**
- Écran de 1440 × 900.
- Une variante à 1024 px de large pour montrer comment la mise en page se resserre.
- Le thème clair, plus un écran en thème sombre.

**Navigation.** La barre d'onglets du bas devient une **colonne fine à gauche**, de 72 à 88 px, en verre dépoli. On y trouve, dans cet ordre :
- le logo ;
- les onglets Monde, Voyages, Souvenirs, Explorer ;
- Profil, tout en bas.

Au survol, chaque onglet affiche son nom. Le bouton corail « Nouveau voyage » reste toujours accessible, en haut de la zone de contenu.

**Écrans à concevoir.**
1. **Monde (accueil)**
   - Le globe en grand à gauche, qu'on peut faire tourner.
   - À droite, en colonne :
     - « 7,2 % du monde exploré » avec la barre de progression ;
     - les chiffres 14 pays, 4/7 continents, 10 villes ;
     - la carte sombre « Prochain départ · J-16 · Lisbonne & Porto » ;
     - « Les souvenirs de la communauté » en grille de 3 cartes de villes (mosaïque de photos, rang « 🔥 Tendance », nombre de photos, voyageurs et réactions).
2. **Voyages, en deux colonnes**
   - À gauche, la liste des voyages, à venir puis passés. Chaque carte a une photo de couverture, le titre, les dates et les drapeaux.
   - À droite, le voyage ouvert :
     - grande couverture avec le titre « Lisbonne & Porto » ;
     - dates du 20 au 27 novembre 2026 et budget de 1 450 € ;
     - onglets Itinéraire, Billets, Budget, Photos.
   - Montre l'onglet **Itinéraire** :
     - les étapes ;
     - une frise par jour (vol Paris → Lisbonne TAP TP 433 à 07:15, hôtel Casa do Largo, tram 28, train Lisbonne → Porto) ;
     - une petite carte du trajet sur le côté.
3. **Budget d'un voyage**
   - Le total dépensé face au budget prévu, avec la barre et la répartition par catégorie.
   - « Qui doit quoi » (« Hugo → Camille : 133,50 € », bouton « Remboursé »).
   - Le tableau des dépenses par jour.
   - L'ajout d'une dépense dans une **fenêtre centrée**, et non un panneau qui monte du bas. Elle contient : montant, intitulé, catégorie en pastilles, date, payé par, et pour qui (parts égales ou montants).
4. **Photos d'un voyage**
   - Une grille large de 5 à 6 colonnes, regroupée par jour.
   - Un dépôt de photos par glisser-déposer, avec une zone qui s'illumine.
   - Une sélection multiple avec sa barre d'actions : « Rendre publiques », « Supprimer ».
5. **Visionneuse plein écran** sur fond noir.
   - La photo au centre et des flèches de chaque côté.
   - Un panneau d'informations à droite : auteur, ville, date et réactions.
   - Une bande de miniatures en bas.
6. **Explorer**
   - Une recherche de ville.
   - Les villes tendances.
   - Une grille de photos de la communauté, en mosaïque, avec un aperçu des réactions au survol.
7. **Billet**
   - La carte d'embarquement, au centre, dans le style d'un vrai billet : ORY → LIS, siège 14A, porte B32, embarquement à 06:35.
   - Le PDF d'origine et les actions à côté.

**Comportements à montrer.**
- Les états de survol : cartes qui montent légèrement, boutons.
- Les panneaux du bas du mobile deviennent des fenêtres centrées ou des panneaux latéraux.
- Le contenu ne dépasse jamais environ 1 280 px de large.

**Données d'exemple.** Utilise :
- les voyageurs Camille et Hugo ;
- les voyages Lisbonne & Porto, Kyoto & Tokyo, Road trip en Islande, New York, Cyclades, Marrakech ;
- de vraies photos de voyage.
