import { ImagePlus, Play, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { formatDayHeader } from '../lib/format'
import { listPhotos, uploadError, uploadMedia, usePhotoUrl, type TripPhoto, type UploadStep } from '../lib/photos'
import { canEdit } from '../lib/trip'
import { PhotoViewer } from './PhotoViewer'
import './TripPhotos.css'

type Job = { name: string; step: UploadStep | 'attente' | 'fini' | 'erreur'; progress?: number; error?: string }

/** « 1:05 » */
export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** Jour local (AAAA-MM-JJ) d'une date ISO */
const localDay = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')

function Thumb({ photo, onOpen }: { photo: TripPhoto; onOpen: () => void }) {
  const url = usePhotoUrl(photo.thumbPath)
  return (
    <button className="photos__thumb" onClick={onOpen} aria-label={photo.kind === 'video' ? 'Ouvrir la vidéo' : 'Ouvrir la photo'}>
      {url && <img src={url} alt="" loading="lazy" draggable={false} />}
      {photo.kind === 'video' && (
        <span className="photos__duration">
          <Play size={11} fill="currentColor" /> {photo.durationSeconds ? formatDuration(photo.durationSeconds) : ''}
        </span>
      )}
    </button>
  )
}

/** Onglet Photos d'un voyage : grille par jour, ajout (photos et vidéos), visionneuse */
export function TripPhotos({
  trip,
  incoming,
  onIncomingHandled,
}: {
  trip: Trip
  /** Fichiers choisis depuis le menu « Ajouter au voyage » : envoyés dès l'ouverture de l'onglet */
  incoming?: File[] | null
  onIncomingHandled?: () => void
}) {
  const { refresh } = useTrips()
  const [photos, setPhotos] = useState<TripPhoto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const editable = canEdit(trip)

  const load = useCallback(async () => {
    try {
      setPhotos(await listPhotos(trip.id))
      setError(null)
    } catch {
      setError(navigator.onLine ? 'Impossible de charger les photos.' : 'Hors ligne : les photos se chargeront au retour du réseau.')
    }
  }, [trip.id])

  useEffect(() => {
    load()
  }, [load])

  // Un même lot n'est envoyé qu'une fois (l'effet peut s'exécuter deux fois en développement)
  const handled = useRef<File[] | null>(null)
  useEffect(() => {
    if (!incoming || incoming.length === 0 || handled.current === incoming) return
    handled.current = incoming
    onIncomingHandled?.()
    addFiles(incoming)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  const uploading = jobs.some((j) => j.step !== 'fini' && j.step !== 'erreur')

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return
    const start = jobs.length
    setJobs((all) => [...all, ...files.map((f) => ({ name: f.name, step: 'attente' as const }))])
    const update = (i: number, patch: Partial<Job>) => setJobs((all) => all.map((j, k) => (k === start + i ? { ...j, ...patch } : j)))
    // Une à la fois : la compression d'une vidéo occupe déjà bien le téléphone
    for (const [i, file] of files.entries()) {
      try {
        await uploadMedia(trip.id, file, (step, progress) => update(i, { step, progress }))
        update(i, { step: 'fini' })
      } catch (e) {
        update(i, { step: 'erreur', error: uploadError(e) })
      }
      await load()
    }
    await refresh() // nombre de photos, couverture
  }

  const done = jobs.filter((j) => j.step === 'fini').length
  const current = jobs.find((j) => j.step === 'preparation' || j.step === 'envoi')
  const failed = jobs.filter((j) => j.step === 'erreur')

  // Grille par jour de prise de vue
  const days: [string, { photo: TripPhoto; index: number }[]][] = []
  for (const [index, photo] of (photos ?? []).entries()) {
    const day = localDay(photo.date)
    const last = days.at(-1)
    if (last?.[0] === day) last[1].push({ photo, index })
    else days.push([day, [{ photo, index }]])
  }
  const videos = (photos ?? []).filter((p) => p.kind === 'video').length

  return (
    <>
      <section className="px stack fade-in photos" style={{ gap: 14 }}>
        {jobs.length > 0 && (
          <div className="card photos__jobs" role="status" aria-live="polite">
            {uploading ? (
              <>
                <span className="strong">
                  Envoi {Math.min(done + 1, jobs.length)} sur {jobs.length}
                  {current?.step === 'preparation' &&
                    (current.progress !== undefined ? ` · compression ${Math.round(current.progress * 100)} %` : ' · préparation')}
                </span>
                <div className="progress">
                  <span style={{ width: `${(done / jobs.length) * 100}%` }} />
                </div>
                <span className="caption muted">Gardez l'app ouverte pendant l'envoi.</span>
              </>
            ) : (
              <span className="strong">
                {done} élément{done > 1 ? 's' : ''} ajouté{done > 1 ? 's' : ''}
                {failed.length > 0 && `, ${failed.length} en échec`}
              </span>
            )}
            {failed.map((j, k) => (
              <span key={k} className="caption form-error">
                {j.name} : {j.error}
              </span>
            ))}
            {!uploading && (
              <button className="photos__dismiss caption" onClick={() => setJobs([])}>
                Masquer
              </button>
            )}
          </div>
        )}

        {error && <p className="caption muted">{error}</p>}

        {photos && photos.length === 0 && !uploading && (
          <div className="card voyage__empty">
            <span className="strong">Pas encore de photos</span>
            <span className="caption muted">
              {editable
                ? 'Ajoutez les photos et vidéos du voyage : tous les voyageurs les verront.'
                : 'Les photos ajoutées par les voyageurs apparaîtront ici.'}
            </span>
            {editable && (
              <button className="btn btn--accent" style={{ marginTop: 6 }} onClick={() => input.current?.click()}>
                <ImagePlus size={16} /> Ajouter des photos
              </button>
            )}
          </div>
        )}

        {photos && photos.length > 0 && (
          <span className="caption muted">
            {photos.length - videos} photo{photos.length - videos > 1 ? 's' : ''}
            {videos > 0 && ` · ${videos} vidéo${videos > 1 ? 's' : ''}`}
          </span>
        )}

        {days.map(([day, items]) => (
          <div key={day} className="stack" style={{ gap: 8 }}>
            <h2 className="voyage__day overline muted">
              <i aria-hidden />
              {formatDayHeader(day)}
            </h2>
            <div className="photos__grid">
              {items.map(({ photo, index }) => (
                <Thumb key={photo.id} photo={photo} onOpen={() => setOpen(index)} />
              ))}
            </div>
          </div>
        ))}

        {photos && photos.length > 0 && (
          <p className="caption muted" style={{ margin: 0 }}>
            L'app garde des copies compressées, sans le lieu de prise de vue. Ce n'est pas une sauvegarde de vos originaux.
          </p>
        )}
      </section>

      {/* Hors de la section animée : une transformation CSS décalerait le bouton flottant (position fixe) */}
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          addFiles(files)
        }}
      />
      {editable && (
        <button className="fab btn btn--accent" onClick={() => input.current?.click()} disabled={uploading}>
          <Plus size={20} /> Photos
        </button>
      )}

      {open !== null && photos && photos[open] && (
        <PhotoViewer
          trip={trip}
          photos={photos}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          onChanged={async () => {
            await load()
            await refresh()
          }}
        />
      )}
    </>
  )
}
