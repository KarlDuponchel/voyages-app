import { FileUp, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { BookingForm } from '../components/BookingForm'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { Trip } from '../data/types'
import { checkFile, FILE_ACCEPT, formatSize } from '../lib/files'
import { errorMessage } from '../lib/supabase'
import './AddBookingSheet.css'
import './Connexion.css'

type Mode = 'menu' | 'formulaire'

export function AddBookingSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { addBooking, attachFile } = useTrips()
  const [mode, setMode] = useState<Mode>('menu')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const created = useRef<string | null>(null)

  const close = () => {
    created.current = null
    setMode('menu')
    setFile(null)
    setFileError(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} label="Ajouter une réservation">
      {mode === 'menu' ? (
        <>
          <div className="stack" style={{ gap: 4 }}>
            <h2 className="display-l">Ajouter une réservation</h2>
            <p className="caption muted" style={{ margin: 0 }}>
              Vol, train, hôtel, activité… tout est rangé dans {trip.title}.
            </p>
          </div>

          <button className="add-option add-option--featured" onClick={() => fileInput.current?.click()}>
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--accent-sunset)' }}>
                <FileUp size={22} />
              </span>
              <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                <span className="strong">Avec le billet (PDF ou capture)</span>
                <span className="caption muted">Le fichier reste joint à la réservation et consultable hors ligne, QR code compris.</span>
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
              setMode('formulaire')
            }}
          />
          {fileError && (
            <p className="caption form-error" role="alert">
              {fileError}
            </p>
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
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <h2 className="display-l">Nouvelle réservation</h2>
          {file && (
            <p className="caption add-form__file">
              <FileUp size={14} /> {file.name} · {formatSize(file.size)} — complétez les infos, le fichier sera joint.
            </p>
          )}
          <BookingForm
            trip={trip}
            submitLabel="Ajouter au voyage"
            onSubmit={async (input) => {
              // Si l'envoi du fichier échoue, la réservation existe déjà : un nouvel essai ne la recrée pas
              created.current ??= await addBooking(trip.id, { ...input, source: file ? 'pdf' : 'manuel' })
              if (file) {
                try {
                  await attachFile(trip.id, created.current, file)
                } catch (e) {
                  throw new Error(`Réservation enregistrée, mais le fichier n'a pas pu être envoyé (${errorMessage(e)}). Réessayez.`)
                }
              }
              close()
            }}
          >
            <button type="button" className="btn btn--ghost" onClick={() => setMode('menu')}>
              Retour
            </button>
          </BookingForm>
        </div>
      )}
    </Sheet>
  )
}
