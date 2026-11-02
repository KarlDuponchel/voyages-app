import { Camera, ChevronRight, Heart, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countryById } from '../data/countries'
import { compact, listTrendingPlaces, type TrendingPlace } from '../lib/explore'
import './CommunityMemories.css'

const plural = (n: number, word: string) => `${compact(n)} ${word}${n > 1 ? 's' : ''}`

function PlaceCard({ place, rank }: { place: TrendingPlace; rank: number }) {
  const country = countryById(place.countryId)?.name
  const shown = place.thumbUrls.slice(0, 4)
  return (
    <Link
      to={`/explorer?ville=${encodeURIComponent(place.city)}&pays=${place.countryId}`}
      className="card community__card"
      aria-label={`${place.city} : ${plural(place.photos, 'photo')}, ${plural(place.travelers, 'voyageur')}, ${plural(place.reactions, 'réaction')}`}
    >
      <div className={`community__mosaic community__mosaic--${Math.max(shown.length, 1)}`}>
        {shown.length === 0 ? (
          <span className="community__placeholder" aria-hidden>
            <Camera size={28} />
          </span>
        ) : (
          shown.map((url, i) => <img key={i} src={url} alt="" loading="lazy" draggable={false} />)
        )}
        <span className="community__rank">{rank === 1 ? '🔥 Tendance' : `#${rank}`}</span>
        <div className="community__title">
          <span className="community__city">{place.city}</span>
          {country && country !== place.city && <span className="caption">{country}</span>}
        </div>
      </div>
      <div className="community__stats caption">
        <span>
          <Camera size={13} /> {compact(place.photos)}
        </span>
        <span>
          <Users size={13} /> {compact(place.travelers)}
        </span>
        <span>
          <Heart size={13} /> {compact(place.reactions)}
        </span>
        {place.recent > 0 && <span className="community__recent">+{compact(place.recent)} ce mois-ci</span>}
      </div>
    </Link>
  )
}

/** Accueil : les villes tendances des photos publiques, avec leurs chiffres */
export function CommunityMemories() {
  const [places, setPlaces] = useState<TrendingPlace[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listTrendingPlaces()
      .then((p) => !cancelled && setPlaces(p))
      // Hors ligne ou indisponible : la section ne s'affiche pas
      .catch(() => !cancelled && setPlaces(null))
    return () => {
      cancelled = true
    }
  }, [])

  if (places === null) return null

  return (
    <section className="stack community" style={{ gap: 12 }}>
      <div className="px stack" style={{ gap: 2 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <span className="overline muted">Villes tendances</span>
          {places.length > 0 && (
            <Link to="/explorer" className="caption community__all">
              Tout voir <ChevronRight size={14} />
            </Link>
          )}
        </div>
        <h2 className="display-l">Les souvenirs de la communauté</h2>
      </div>

      {places.length === 0 ? (
        <div className="px">
          <div className="card community__empty">
            <span className="strong">Les plus belles photos des voyageurs arriveront ici</span>
            <span className="caption muted">Ouvrez une photo d’un de vos voyages, puis « Rendre publique » : elle rejoindra sa ville.</span>
          </div>
        </div>
      ) : (
        <div className="community__scroller">
          {places.map((p, i) => (
            <PlaceCard key={`${p.countryId}-${p.city}`} place={p} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  )
}
