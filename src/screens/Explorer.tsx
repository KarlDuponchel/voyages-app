import { Compass, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PublicViewer } from '../components/PublicViewer'
import { formatDuration } from '../components/TripPhotos'
import { listPublicPhotos, listPublicPlaces, PAGE, REACTIONS, setReaction, signedUrls, toggled, type PublicPhoto, type PublicPlace, type ReactionKind } from '../lib/explore'
import { useDesktop } from '../lib/useDesktop'
import { errorMessage } from '../lib/supabase'
import '../components/TripPhotos.css'
import './Explorer.css'

type Tab = 'recentes' | 'wishlist'

/**
 * Grille éditoriale (ordinateur) : sur chaque série de 10 photos, une grande (2 × 2), deux hautes et une large,
 * les autres en simple case (voir .explorer__grid dans src/desktop.css). Mêmes rangs que les règles CSS.
 */
const LARGE_TILES = new Set([0, 3, 6, 7])

/** Une photo de la grille ; en grande case sur ordinateur, la photo entière remplace la miniature (trop petite) */
function Tile({ photo, index, onOpen }: { photo: PublicPhoto; index: number; onOpen: () => void }) {
  const desktop = useDesktop()
  const large = desktop && photo.kind === 'photo' && LARGE_TILES.has(index % 10)
  const [full, setFull] = useState<string | null>(null)
  useEffect(() => {
    if (!large) return
    let cancelled = false
    signedUrls([photo.path])
      .then((urls) => {
        const url = urls[photo.path]
        if (!url || cancelled) return
        // Remplacée seulement une fois chargée : la miniature reste affichée entre-temps
        const img = new Image()
        img.onload = () => !cancelled && setFull(url)
        img.src = url
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [large, photo.path])
  const src = (large && full) || photo.thumbUrl
  return (
    <button className="photos__thumb" onClick={onOpen} aria-label={`Photo à ${photo.city}, par ${photo.author.name}`}>
      {src && <img src={src} alt="" loading="lazy" draggable={false} />}
      {photo.kind === 'video' && (
        <span className="photos__duration">
          <Play size={11} fill="currentColor" /> {photo.durationSeconds ? formatDuration(photo.durationSeconds) : ''}
        </span>
      )}
      {photo.mine && <span className="explorer__mine">{REACTIONS.find((r) => r.kind === photo.mine)?.emoji}</span>}
      {/* Ville et auteur, au survol de la souris (ordinateur) */}
      <span className="explorer__caption" aria-hidden>
        <span className="strong">{photo.city}</span>
        <span>par {photo.author.name}</span>
      </span>
    </button>
  )
}

/** Photos publiques des voyageurs : par ville, les plus récentes d'abord ; et ma Wishlist */
export function Explorer() {
  const [params, setParams] = useSearchParams()
  const city = params.get('ville') ?? undefined
  const countryId = params.get('pays') ?? undefined
  const tab: Tab = params.get('onglet') === 'wishlist' ? 'wishlist' : 'recentes'
  const [places, setPlaces] = useState<PublicPlace[]>([])
  const [photos, setPhotos] = useState<PublicPhoto[] | null>(null)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const filter = useMemo(() => ({ city, countryId, wishlist: tab === 'wishlist' }), [city, countryId, tab])

  const load = useCallback(async () => {
    setError(null)
    try {
      const page = await listPublicPhotos(filter)
      setPhotos(page)
      setMore(page.length === PAGE)
    } catch (e) {
      setPhotos([])
      setError(navigator.onLine ? errorMessage(e) : 'Hors ligne : Explorer a besoin du réseau.')
    }
  }, [filter])

  useEffect(() => {
    setPhotos(null)
    load()
  }, [load])

  useEffect(() => {
    listPublicPlaces()
      .then(setPlaces)
      .catch(() => {})
  }, [])

  const loadMore = async () => {
    if (!photos?.length) return
    setLoadingMore(true)
    try {
      const page = await listPublicPhotos({ ...filter, before: photos.at(-1)?.publishedAt })
      setPhotos([...photos, ...page])
      setMore(page.length === PAGE)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoadingMore(false)
    }
  }

  const choose = (next: { ville?: string; pays?: string; onglet?: Tab }) => {
    const p = new URLSearchParams()
    if (next.ville) p.set('ville', next.ville)
    if (next.pays) p.set('pays', next.pays)
    if (next.onglet === 'wishlist') p.set('onglet', 'wishlist')
    setParams(p, { replace: true })
  }

  const react = async (photo: PublicPhoto, kind: ReactionKind) => {
    const next = toggled(photo, kind)
    const replace = (p: PublicPhoto) => setPhotos((all) => all?.map((x) => (x.id === p.id ? p : x)) ?? null)
    replace(next)
    try {
      await setReaction(photo.id, next.mine ?? null)
    } catch (e) {
      replace(photo)
      setError(errorMessage(e))
    }
  }

  const blocked = (authorId: string) => {
    setOpen(null)
    setPhotos((all) => all?.filter((p) => p.author.id !== authorId) ?? null)
  }

  // La ville choisie reste en tête, même si elle n'a pas encore de photos
  const chips = useMemo(() => {
    const top = places.slice(0, 20)
    if (city && !top.some((p) => p.city.toLowerCase() === city.toLowerCase()))
      top.unshift({ city, countryId: countryId ?? '', lat: 0, lng: 0, count: 0 })
    return top
  }, [places, city, countryId])

  return (
    <main className="screen explorer">
      <header className="px stack" style={{ gap: 4 }}>
        <span className="overline muted">Photos des voyageurs</span>
        <h1 className="display-xl">Explorer</h1>
      </header>

      <section className="px stack" style={{ gap: 12 }}>
        <div className="explorer__tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'recentes'} onClick={() => choose({ ville: city, pays: countryId })}>
            Récentes
          </button>
          <button role="tab" aria-selected={tab === 'wishlist'} onClick={() => choose({ onglet: 'wishlist' })}>
            🧳 Wishlist
          </button>
        </div>

        {tab === 'recentes' && chips.length > 0 && (
          <div className="explorer__places" role="radiogroup" aria-label="Ville">
            <button role="radio" aria-checked={!city} className={!city ? 'is-active' : ''} onClick={() => choose({})}>
              Partout
            </button>
            {chips.map((p) => {
              const active = city?.toLowerCase() === p.city.toLowerCase()
              return (
                <button
                  key={`${p.countryId}-${p.city}`}
                  role="radio"
                  aria-checked={active}
                  className={active ? 'is-active' : ''}
                  onClick={() => choose({ ville: p.city, pays: p.countryId || undefined })}
                >
                  {p.city}
                  {p.count > 0 && <span className="muted"> {p.count}</span>}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="caption form-error">{error}</p>}

        {photos === null && <p className="caption muted">Chargement…</p>}

        {photos && photos.length === 0 && !error && (
          <div className="card voyage__empty">
            <Compass size={22} className="explorer__empty-icon" />
            <span className="strong">
              {tab === 'wishlist' ? 'Votre Wishlist est vide' : city ? `Pas encore de photos publiques à ${city}` : 'Pas encore de photos publiques'}
            </span>
            <span className="caption muted">
              {tab === 'wishlist'
                ? 'Touchez 🧳 sur une photo qui vous donne envie : elle se range ici.'
                : 'Rendez publiques vos plus belles photos depuis un voyage : touchez une photo, puis « Rendre publique ».'}
            </span>
          </div>
        )}

        {photos && photos.length > 0 && (
          <div className="photos__grid explorer__grid">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} index={i} onOpen={() => setOpen(i)} />
            ))}
          </div>
        )}

        {more && (
          <button className="btn btn--ghost" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Chargement…' : 'Voir plus'}
          </button>
        )}
      </section>

      {open !== null && photos && photos[open] && (
        <PublicViewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} onReact={react} onBlocked={blocked} />
      )}
    </main>
  )
}
