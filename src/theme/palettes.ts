/**
 * 🎨 PALETTES DE COULEURS — le seul fichier à modifier pour changer les couleurs de l'app.
 *
 * - `sombre` et `clair` ont exactement les mêmes clés : changez une valeur, sauvegardez, c'est appliqué partout.
 * - Les couleurs suivent les maquettes Figma de Tripmates (figma_mockups/) : Forest, Warm Cream, Paper,
 *   Travel Coral, Golden Hour, Soft Sage.
 * - Le choix Auto / Clair / Sombre se fait dans l'onglet Profil de l'app.
 *
 * Astuce : une couleur peut être n'importe quelle valeur CSS (#hex, rgb(), hsl()…).
 */

export const palettes = {
  // Absent des maquettes : forêt profonde, texte crème, mêmes accents corail et doré
  sombre: {
    // Fonds
    bgBase: '#0F302A', // fond de l'app (Deep Forest)
    bgSurface: '#183F37', // cartes (Forest)
    bgElevated: '#22493F', // éléments posés sur une carte (barres, champs)
    borderSubtle: 'rgba(247, 243, 233, 0.14)', // bordures fines

    // Textes
    textPrimary: '#F7F3E9',
    textSecondary: '#ABC0BA',
    textInverse: '#0F302A', // texte posé sur un fond "textPrimary" (bouton actif…)
    textOnAccent: '#FFFFFF', // texte posé sur le corail (boutons)
    textOnGradient: '#0F302A', // texte posé sur les dégradés corail/doré

    // Accents
    accentSunset: '#F26B4B', // couleur principale (boutons, pays visités)
    accentText: '#F58A70', // corail pour du texte (lisible sur le fond)
    accentSun: '#E9AD3A', // repères sur le globe, étiquettes
    accentLagoon: '#7FC4B2', // activités, "hors ligne"
    accentLavender: '#B9A8E2', // hôtels

    // Globe
    globeOceanLight: '#2A564B',
    globeOceanDark: '#14372F',
    globeLand: '#4C7366',
    globeLandStroke: '#7FA294',
    globeVisited: '#F26B4B',
    globeOutline: 'rgba(247, 243, 233, 0.35)',
    globeShade: 'rgba(0, 0, 0, 0.35)',

    // Barre d'onglets en verre
    glassBg: 'linear-gradient(135deg, rgba(36, 77, 67, 0.82), rgba(15, 48, 42, 0.7))',
    glassBorder: 'rgba(247, 243, 233, 0.16)',
    glassActive: 'rgba(247, 243, 233, 0.1)',

    // Effets
    starsOpacity: '0.25', // étoiles en fond de l'écran Monde (0 pour les masquer)
    shadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
    shadowSoft: '0 10px 30px rgba(0, 0, 0, 0.22)',
  },

  clair: {
    bgBase: '#F7F3E9', // Warm Cream
    bgSurface: '#FFFCF4', // Paper
    bgElevated: '#DFE5CF', // Soft Sage
    borderSubtle: 'rgba(24, 63, 55, 0.16)',

    textPrimary: '#183F37', // Forest
    textSecondary: '#597069',
    textInverse: '#FFFCF4',
    textOnAccent: '#FFFFFF',
    textOnGradient: '#0F302A',

    accentSunset: '#F26B4B',
    accentText: '#C4472B', // le corail des maquettes n'est pas assez contrasté pour du petit texte sur la crème
    accentSun: '#E9AD3A',
    accentLagoon: '#3E8573',
    accentLavender: '#7D6BB0',

    // Globe « papier »
    globeOceanLight: '#FFFDF5',
    globeOceanDark: '#E5E5D2',
    globeLand: '#CAD3AD',
    globeLandStroke: '#718872',
    globeVisited: '#F26B4B',
    globeOutline: 'rgba(24, 63, 55, 0.45)',
    globeShade: 'rgba(15, 48, 42, 0.12)',

    glassBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(239, 242, 224, 0.55))',
    glassBorder: 'rgba(255, 255, 255, 0.76)',
    glassActive: 'rgba(255, 255, 255, 0.6)',

    starsOpacity: '0',
    shadow: '0 30px 70px rgba(15, 48, 42, 0.18)',
    shadowSoft: '0 10px 30px rgba(15, 48, 42, 0.1)',
  },
}

/** Dégradés de la marque (billet, stories, barres de progression). */
export const gradients = {
  sunset: 'linear-gradient(120deg, #F26B4B 0%, #E9AD3A 100%)',
  dusk: 'linear-gradient(90deg, #E9AD3A 0%, #F26B4B 100%)',
}

export type PaletteName = keyof typeof palettes
export type Palette = (typeof palettes)['sombre']
