import { ChevronRight, CloudOff, FileText, Image as ImageIcon, Paperclip, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTrips } from '../data/store'
import type { Booking, BookingFile } from '../data/types'
import { checkFile, FILE_ACCEPT, formatSize, isCached, isPdf } from '../lib/files'
import { errorMessage } from '../lib/supabase'
import './BookingFiles.css'

/** Documents joints à une réservation : ouverture, ajout et suppression (participants seulement). */
export function BookingFiles({
  tripId,
  booking,
  editable,
  onOpen,
  refreshKey,
}: {
  tripId: string
  booking: Booking
  editable: boolean
  onOpen: (file: BookingFile) => void
  /** Change à la fermeture de la visionneuse : le fichier ouvert vient peut-être d'être copié */
  refreshKey: number
}) {
  const { attachFile, removeFile } = useTrips()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [offline, setOffline] = useState<Record<string, boolean>>({})
  const input = useRef<HTMLInputElement>(null)

  // Indique, fichier par fichier, s'il est déjà copié sur le téléphone
  useEffect(() => {
    let cancelled = false
    Promise.all(booking.files.map(async (f) => [f.id, await isCached(f.path)] as const)).then(
      (entries) => !cancelled && setOffline(Object.fromEntries(entries)),
    )
    return () => {
      cancelled = true
    }
  }, [booking.files, refreshKey])

  if (booking.files.length === 0 && !editable) return null

  const add = async (file: File) => {
    const problem = checkFile(file)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await attachFile(tripId, booking.id, file)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (file: BookingFile) => {
    setBusy(true)
    setError(null)
    try {
      await removeFile(file)
      setConfirmId(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="files" aria-label="Documents">
      <h2 className="overline muted">Documents</h2>
      {booking.files.length > 0 && (
        <ul className="card files__list">
          {booking.files.map((f) => {
            const Icon = isPdf(f) ? FileText : ImageIcon
            return (
              <li key={f.id}>
                {confirmId === f.id ? (
                  <div className="files__confirm">
                    <span className="caption">Supprimer « {f.name} » ?</span>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn--accent" disabled={busy} onClick={() => remove(f)}>
                        Supprimer
                      </button>
                      <button className="btn btn--ghost" onClick={() => setConfirmId(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="files__row">
                    <button className="files__open" onClick={() => onOpen(f)}>
                      <span className="files__icon" aria-hidden>
                        <Icon size={20} />
                      </span>
                      <span className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <span className="strong files__name">{f.name}</span>
                        <span className="caption muted">
                          {f.size ? formatSize(f.size) + ' · ' : ''}
                          {offline[f.id] ? (
                            'Disponible hors ligne'
                          ) : (
                            <span className="files__online">
                              <CloudOff size={12} /> Pas encore sur le téléphone
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight size={18} className="muted" aria-hidden />
                    </button>
                    {editable && (
                      <button className="files__delete" onClick={() => setConfirmId(f.id)} aria-label={`Supprimer ${f.name}`}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {editable && (
        <>
          <button className="btn btn--ghost files__add" disabled={busy} onClick={() => input.current?.click()}>
            <Paperclip size={16} /> {busy ? 'Envoi…' : booking.files.length ? 'Joindre un autre fichier' : 'Joindre le billet (PDF ou capture)'}
          </button>
          <input
            ref={input}
            type="file"
            accept={FILE_ACCEPT}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) add(file)
            }}
          />
        </>
      )}
      {error && (
        <p className="caption form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
