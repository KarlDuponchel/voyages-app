import type { CSSProperties } from 'react'
import type { Trip } from '../data/types'
import { coverThemeOf, coverThemeUrl } from '../lib/covers'
import { usePhotoUrl } from '../lib/photos'
import { Cover } from './Cover'
import './TripCover.css'

/**
 * Couverture d'un voyage : la photo choisie, sinon la photo d'ambiance du thème (plage, montagne…).
 * Le dégradé reste dessous pendant le chargement (ou hors ligne si l'image n'est pas encore en cache).
 * `large` : image en grand format (en-tête d'un voyage, carte « Il y a 1 an »), sinon la miniature.
 */
export function TripCover({ trip, large = false, skyline = false, fadeTo }: { trip: Trip; large?: boolean; skyline?: boolean; fadeTo?: string }) {
  const photo = trip.coverPhoto
  const photoUrl = usePhotoUrl(photo ? (large ? photo.path : photo.thumbPath) : undefined)
  // Tant que la photo choisie n'est pas là, on n'affiche pas l'ambiance (elle clignoterait avant la photo)
  const url = photo ? photoUrl : coverThemeUrl(coverThemeOf(trip), large)
  return (
    <span className="trip-cover">
      <Cover colors={trip.cover} skyline={skyline && !url} fadeTo={fadeTo} />
      {url && <img className="trip-cover__photo" src={url} alt="" draggable={false} onError={(e) => (e.currentTarget.style.display = 'none')} />}
      {url && fadeTo && <span className="trip-cover__fade" style={{ '--fade-to': fadeTo } as CSSProperties} aria-hidden />}
    </span>
  )
}
