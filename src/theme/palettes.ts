/**
 * 🎨 PALETTES DE COULEURS — le seul fichier à modifier pour changer les couleurs de l'app.
 *
 * - `sombre` et `clair` ont exactement les mêmes clés : changez une valeur, sauvegardez, c'est appliqué partout.
 * - Les noms suivent les maquettes Figma (bg/base, text/primary, accent/sunset…).
 * - Le choix Auto / Clair / Sombre se fait dans l'onglet Profil de l'app.
 *
 * Astuce : une couleur peut être n'importe quelle valeur CSS (#hex, rgb(), hsl()…).
 */

export const palettes = {
  sombre: {
    // Fonds
    bgBase: '#0A0F1F', // fond de l'app
    bgSurface: '#141B2F', // cartes
    bgElevated: '#1D2640', // éléments posés sur une carte (barres, champs)
    borderSubtle: '#2A3352', // bordures fines

    // Textes
    textPrimary: '#F5F1E8',
    textSecondary: '#9AA2BD',
    textInverse: '#0A0F1F', // texte posé sur un fond "textPrimary" (bouton actif…)
    textOnAccent: '#0A0F1F', // texte posé sur les dégradés orange/jaune

    // Accents
    accentSunset: '#FF7A59', // couleur principale (boutons, pays visités)
    accentSun: '#F6C46A', // repères sur le globe, étiquettes
    accentLagoon: '#4FD1C5', // activités, "hors ligne"
    accentLavender: '#A78BFA', // hôtels

    // Globe
    globeOceanLight: '#1E5A9E',
    globeOceanDark: '#070D1C',
    globeLand: '#2B4A7A',
    globeVisited: '#FF7A59',
    globeGlow: '#4FD1C5',

    // Effets
    starsOpacity: '1', // étoiles en fond de l'écran Monde (0 pour les masquer)
    shadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
  },

  clair: {
    bgBase: '#F6F1E7',
    bgSurface: '#FFFFFF',
    bgElevated: '#EEE7DA',
    borderSubtle: '#E2D9C9',

    textPrimary: '#1A1F33',
    textSecondary: '#6A6F82',
    textInverse: '#FFFFFF',
    textOnAccent: '#0A0F1F',

    accentSunset: '#EE5F3B',
    accentSun: '#D4952A',
    accentLagoon: '#159C8E',
    accentLavender: '#7B5BDF',

    globeOceanLight: '#1E5A9E',
    globeOceanDark: '#0B1A33',
    globeLand: '#2B4A7A',
    globeVisited: '#FF7A59',
    globeGlow: '#4FD1C5',

    starsOpacity: '0',
    shadow: '0 16px 36px rgba(26, 31, 51, 0.16)',
  },
}

/** Dégradés de la marque (carte "Prochain départ", billet, barres de progression). */
export const gradients = {
  sunset: 'linear-gradient(120deg, #FF7A59 0%, #F6C46A 100%)',
  dusk: 'linear-gradient(90deg, #A78BFA 0%, #FF7A59 100%)',
}

export type PaletteName = keyof typeof palettes
export type Palette = (typeof palettes)['sombre']
