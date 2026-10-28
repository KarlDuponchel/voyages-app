import { FileUp, ImagePlus, Plus, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { BookingForm } from '../components/BookingForm'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { BookingDraft, Trip } from '../data/types'
import { canReadWithAi, readTicket } from '../lib/ai'
import { checkFile, FILE_ACCEPT, formatSize } from '../lib/files'
import { errorMessage } from '../lib/supabase'
import { draftTimezone } from '../lib/trip'
import './AddBookingSheet.css'

type Mode = 'menu' | 'lecture' | 'formulaire'

/**
 * Ajout d'une réservation : avec le billet (lu par l'IA, puis vérifié) ou à la main.
 * Un billet peut contenir plusieurs réservations (aller et retour) : on les valide une à une,
 * et le fichier est joint à chacune.
 */
export function AddBookingSheet({
  trip,
  open,
  onClose,
  onAddPhotos,
}: {
  trip: Trip
  open: boolean
  onClose: () => void
  /** Photos et vidéos choisies depuis ce menu (l'envoi se fait dans l'onglet Photos) */
  onAddPhotos?: (files: File[]) => void
}) {
  const { addBooking, attachFile } = useTrips()
  const [mode, setMode] = useState<Mode>('menu')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<BookingDraft[]>([])
  const [index, setIndex] = useState(0)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const created = useRef<string | null>(null)
  /** Lecture en cours ; ignorée si l'utilisateur est passé à la saisie manuelle entre-temps */
  const reading = useRef(0)

  const close = () => {
    reading.current++
    created.current = null
    setMode('menu')
    setFile(null)
    setFileError(null)
    setDrafts([])
    setIndex(0)
    setAiNote(null)
    onClose()
  }

  const read = async (picked: File) => {
    const id = ++reading.current
    setMode('lecture')
    try {
      const found = await readTicket(trip.id, picked)
      if (id !== reading.current) return
      setDrafts(found)
      setAiNote(found.length === 0 ? "L'IA n'a pas trouvé de réservation dans ce fichier : complétez à la main." : null)
    } catch (e) {
      if (id !== reading.current) return
      setAiNote(`${errorMessage(e)} Complétez à la main, le fichier sera tout de même joint.`)
    }
    setMode('formulaire')
  }

  const draft = drafts[index] as BookingDraft | undefined
  const next = () => {
    created.current = null
    if (index + 1 < drafts.length) setIndex(index + 1)
    else close()
  }

  return (
    <Sheet open={open} onClose={close} label="Ajouter une réservation">
      {mode === 'menu' && (
        <>
          <div className="stack" style={{ gap: 4 }}>
            <h2 className="display-l">Ajouter au voyage</h2>
            <p className="caption muted" style={{ margin: 0 }}>
              Billets, réservations, photos… tout est rangé dans {trip.title}.
            </p>
          </div>

          <button className="add-option add-option--featured" onClick={() => fileInput.current?.click()}>
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--accent-sunset)' }}>
                <FileUp size={22} />
              </span>
              <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                <span className="strong">Billet ou réservation (PDF, capture)</span>
                <span className="caption muted">L'IA le lit et remplit la réservation, vous vérifiez. Le fichier reste joint et consultable hors ligne.</span>
              </div>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={FILE_ACCEPT}
            hidden
            onChange={(e) => {
              const picked = e.target.files?.[0]
              e.target.value = ''
              if (!picked) return
              const problem = checkFile(picked)
              setFileError(problem)
              if (problem) return
              setFile(picked)
              if (canReadWithAi(picked)) read(picked)
              else {
                setAiNote("Ce format ne peut pas être lu par l'IA : complétez à la main, le fichier sera joint.")
                setMode('formulaire')
              }
            }}
          />
          {fileError && (
            <p className="caption form-error" role="alert">
              {fileError}
            </p>
          )}

          {onAddPhotos && (
            <>
              {/* La pellicule s'ouvre dans le geste même (Safari bloque une ouverture différée) */}
              <button className="add-option" onClick={() => photoInput.current?.click()}>
                <div className="row" style={{ gap: 14 }}>
                  <span className="add-option__chip" style={{ color: 'var(--accent-lavender)' }}>
                    <ImagePlus size={22} />
                  </span>
                  <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                    <span className="strong">Photos et vidéos</span>
                    <span className="caption muted">Depuis la pellicule, plusieurs à la fois. Tous les voyageurs les verront.</span>
                  </div>
                </div>
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = ''
                  if (files.length === 0) return
                  close()
                  onAddPhotos(files)
                }}
              />
            </>
          )}

          <button className="add-option" onClick={() => setMode('formulaire')}>
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--text-secondary)' }}>
                <Plus size={22} />
              </span>
              <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                <span className="strong">Saisie manuelle</span>
                <span className="caption muted">Sans fichier : vous pourrez en joindre un plus tard.</span>
              </div>
            </div>
          </button>
        </>
      )}

      {mode === 'lecture' && (
        <div className="stack add-reading" role="status" aria-live="polite">
          <span className="add-reading__icon" aria-hidden>
            <Sparkles size={26} />
          </span>
          <h2 className="display-l">Lecture du billet…</h2>
          <p className="caption muted" style={{ margin: 0 }}>
            L'IA cherche les dates, horaires et références de {file?.name}. Quelques secondes.
          </p>
          <button
            className="btn btn--ghost"
            onClick={() => {
              reading.current++ // le résultat de la lecture en cours sera ignoré
              setMode('formulaire')
            }}
          >
            Remplir à la main
          </button>
        </div>
      )}

      {mode === 'formulaire' && (
        <div className="stack" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 2 }}>
            {drafts.length > 1 && (
              <span className="overline muted">
                Réservation {index + 1} sur {drafts.length} trouvées dans le billet
              </span>
            )}
            <h2 className="display-l">{draft ? 'Vérifiez et ajoutez' : 'Nouvelle réservation'}</h2>
          </div>
          {draft && (
            <p className="caption add-form__ai">
              <Sparkles size={14} /> Rempli par l'IA à partir du billet : vérifiez avant d'ajouter.
            </p>
          )}
          {aiNote && <p className="caption add-form__note">{aiNote}</p>}
          {file && (
            <p className="caption add-form__file">
              <FileUp size={14} /> {file.name} · {formatSize(file.size)} — le fichier sera joint.
            </p>
          )}
          <BookingForm
            key={index}
            trip={trip}
            initial={draft}
            submitLabel="Ajouter au voyage"
            onSubmit={async (input) => {
              // Si l'envoi du fichier échoue, la réservation existe déjà : un nouvel essai ne la recrée pas
              created.current ??= await addBooking(trip.id, {
                ...input,
                provider: draft?.provider,
                ticket: draft?.ticket,
                timezone: draftTimezone(trip, draft),
                source: file ? 'pdf' : 'manuel',
                importedAt: draft ? new Date().toISOString() : undefined,
              })
              if (file) {
                try {
                  await attachFile(trip.id, created.current, file)
                } catch (e) {
                  throw new Error(`Réservation enregistrée, mais le fichier n'a pas pu être envoyé (${errorMessage(e)}). Réessayez.`)
                }
              }
              next()
            }}
          >
            {drafts.length > 1 && index + 1 < drafts.length ? (
              <button type="button" className="btn btn--ghost" onClick={next}>
                Ignorer celle-ci
              </button>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={close}>
                Annuler
              </button>
            )}
          </BookingForm>
        </div>
      )}
    </Sheet>
  )
}
