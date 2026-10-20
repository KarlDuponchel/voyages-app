import { Check, FileUp, Mail, Plus } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { bookingKinds } from '../components/BookingCard'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { BookingKind, Trip } from '../data/types'
import './AddBookingSheet.css'

/** Domaine de l'adresse de transfert d'e-mails (à brancher en V2 sur Cloudflare Email Routing). */
const EMAIL_DOMAIN = 'mes-voyages.app'

type Mode = 'menu' | 'manuel'

export function AddBookingSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { addBooking } = useTrips()
  const [mode, setMode] = useState<Mode>('menu')
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const address = `${trip.id.split('-')[0]}@${EMAIL_DOMAIN}`

  const close = () => {
    setMode('menu')
    setFileName(null)
    onClose()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // presse-papiers indisponible : l'adresse reste affichée
    }
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const date = String(f.get('date'))
    const time = String(f.get('time') || '00:00')
    addBooking(trip.id, {
      kind: f.get('kind') as BookingKind,
      title: String(f.get('title')),
      detail: String(f.get('detail') || ''),
      start: `${date}T${time}`,
      reference: String(f.get('reference') || '') || undefined,
      source: fileName ? 'pdf' : 'manuel',
    })
    close()
  }

  return (
    <Sheet open={open} onClose={close} label="Ajouter une réservation">
      {mode === 'menu' ? (
        <>
          <div className="stack" style={{ gap: 4 }}>
            <h2 className="display-l">Ajouter une réservation</h2>
            <p className="caption muted" style={{ margin: 0 }}>
              Vol, train, hôtel, activité… tout est rangé dans {trip.city}.
            </p>
          </div>

          <div className="add-option add-option--featured">
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--accent-sunset)' }}>
                <Mail size={22} />
              </span>
              <div className="stack" style={{ gap: 2 }}>
                <span className="strong">Transférer un e-mail</span>
                <span className="caption muted">Le plus rapide : on lit la confirmation pour vous.</span>
              </div>
            </div>
            <div className="add-option__address">
              <span className="caption">{address}</span>
              <button className="btn btn--accent add-option__copy" onClick={copy}>
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <span className="caption muted">Lecture automatique des e-mails : prochaine version.</span>
          </div>

          <button className="add-option" onClick={() => fileInput.current?.click()}>
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--accent-lavender)' }}>
                <FileUp size={22} />
              </span>
              <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                <span className="strong">Importer un PDF ou une capture</span>
                <span className="caption muted">Billet, réservation, QR code.</span>
              </div>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setFileName(file.name)
                setMode('manuel')
              }
            }}
          />

          <button className="add-option" onClick={() => setMode('manuel')}>
            <div className="row" style={{ gap: 14 }}>
              <span className="add-option__chip" style={{ color: 'var(--text-secondary)' }}>
                <Plus size={22} />
              </span>
              <div className="stack" style={{ gap: 2, textAlign: 'left' }}>
                <span className="strong">Saisie manuelle</span>
                <span className="caption muted">Pour ce qui n'a pas d'e-mail.</span>
              </div>
            </div>
          </button>
        </>
      ) : (
        <form className="stack add-form" style={{ gap: 12 }} onSubmit={submit}>
          <h2 className="display-l">Nouvelle réservation</h2>
          {fileName && (
            <p className="caption add-form__file">
              <FileUp size={14} /> {fileName} — la lecture automatique arrive bientôt, complétez les infos ci-dessous.
            </p>
          )}
          <fieldset className="add-form__kinds">
            <legend className="overline muted">Type</legend>
            {(Object.keys(bookingKinds) as BookingKind[]).map((k, i) => {
              const { label, Icon, color } = bookingKinds[k]
              return (
                <label key={k} style={{ color }}>
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} />
                  <Icon size={18} />
                  <span>{label}</span>
                </label>
              )
            })}
          </fieldset>
          <label className="field">
            <span className="overline muted">Titre</span>
            <input className="input" name="title" required placeholder="Paris → Lisbonne, Hôtel Memmo…" />
          </label>
          <label className="field">
            <span className="overline muted">Détail</span>
            <input className="input" name="detail" placeholder="Compagnie, n° de vol, nombre de nuits…" />
          </label>
          <div className="row" style={{ gap: 10, alignItems: 'stretch' }}>
            <label className="field" style={{ flex: 1.4 }}>
              <span className="overline muted">Date</span>
              <input className="input" name="date" type="date" required defaultValue={trip.start} min={trip.start} max={trip.end} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span className="overline muted">Heure</span>
              <input className="input" name="time" type="time" defaultValue="10:00" />
            </label>
          </div>
          <label className="field">
            <span className="overline muted">Référence</span>
            <input className="input" name="reference" placeholder="Facultatif" />
          </label>
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
              <Check size={16} /> Ajouter au voyage
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMode('menu')}>
              Retour
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
