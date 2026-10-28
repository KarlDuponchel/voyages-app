import type { CSSProperties } from 'react'
import type { Trip } from '../data/types'
import { usePhotoUrl } from '../lib/photos'
import { Cover } from './Cover'
import './TripCover.css'

/**
 * Couverture d'un voyage : la photo choisie, sinon le dégradé illustré.
 * Le dégradé reste dessous pendant le chargement de la photo (ou hors ligne si elle n'est pas copiée).
 * `large` : photo en grand format (en-tête d'un voyage, carte « Il y a 1 an »), sinon la miniature.
 */
export function TripCover({ trip, large = false, skyline = false, fadeTo }: { trip: Trip; large?: boolean; skyline?: boolean; fadeTo?: string }) {
  const photo = trip.coverPhoto
  const url = usePhotoUrl(photo ? (large ? photo.path : photo.thumbPath) : undefined)
  return (
    <span className="trip-cover">
      <Cover colors={trip.cover} skyline={skyline && !url} fadeTo={fadeTo} />
      {url && <img className="trip-cover__photo" src={url} alt="" draggable={false} />}
      {url && fadeTo && <span className="trip-cover__fade" style={{ '--fade-to': fadeTo } as CSSProperties} aria-hidden />}
    </span>
  )
}
