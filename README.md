# Voyages

App de voyage perso (PWA) : billets et réservations au même endroit, globe des pays visités, souvenirs et statistiques.
Maquettes : [Figma – App Voyages](https://www.figma.com/design/J8QdhWNMcqYjOMrcb3tMR5)

## Lancer l'app

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173 (dans Chrome : outils de développement → mode téléphone pour voir le rendu iPhone).

## Changer les couleurs

Tout est dans **`src/theme/palettes.ts`** : une palette `sombre` et une palette `clair`, avec les mêmes noms que dans Figma.
Modifiez une valeur, sauvegardez : l'app se met à jour toute seule. Le choix Auto / Clair / Sombre est dans l'onglet **Profil**.

## Polices

Titres en **Bricolage Grotesque**, texte en **DM Sans** (Google Fonts, embarquées dans l'app via `@fontsource` : elles marchent hors ligne).

## Où sont les choses

| Dossier | Contenu |
|---|---|
| `src/screens/` | Les écrans : Monde, Voyages, Voyage, Billet, Souvenirs, Stats, Profil, ajout de réservation |
| `src/components/` | Éléments réutilisables : globe, barre d'onglets, carte de réservation… |
| `src/data/` | Voyages d'exemple, pays visités, sauvegarde sur le téléphone |
| `src/lib/` | Calcul des statistiques, formats de dates |
| `public/logo.svg` | Icône de l'app (régénérer les icônes avec `npm run icons`) |

## Installer sur l'iPhone

L'installation complète (icône, plein écran, mode hors ligne) demande une adresse en **https** : il faudra publier l'app
(Vercel ou Cloudflare Pages, gratuits). Ensuite, dans Safari : Partager → « Sur l'écran d'accueil ».

## Prochaines étapes

- Synchronisation entre les deux téléphones (Supabase)
- Lecture automatique des e-mails et PDF de réservation
- Import des photos et vidéos, souvenirs automatiques
- Budget partagé
