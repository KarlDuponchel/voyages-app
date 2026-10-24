import { Check, ChevronLeft, Inbox, Mail, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { bookingKinds } from '../components/BookingCard'
import { BookingForm } from '../components/BookingForm'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { BookingDraft, PendingImport, Trip } from '../data/types'
import { formatRange, formatShortDate, formatTime } from '../lib/format'
import { importAddress } from '../lib/importAddress'
import { errorMessage } from '../lib/supabase'
import { canEdit, draftTimezone } from '../lib/trip'
import { NewTripSheet } from './NewTripSheet'
import './Imports.css'

/** Ajout d'une réservation proposée par un e-mail : formulaire pré-rempli, pièces jointes jointes */
function DraftSheet({ imp, draft, trip, onClose, onAdded }: { imp: PendingImport; draft: BookingDraft; trip: Trip; onClose: () => void; onAdded: () => void }) {
  const { addBooking, attachImportFiles } = useTrips()
  const [createdId, setCreatedId] = useState<string | null>(null)

  return (
    <Sheet open onClose={onClose} label="Ajouter la réservation">
      <div className="stack" style={{ gap: 2 }}>
        <span className="overline muted">Dans {trip.title}</span>
        <h2 className="display-l">Vérifiez et ajoutez</h2>
      </div>
      <p className="caption imports__ai">
        <Sparkles size={14} /> Rempli par l'IA à partir de l'e-mail : vérifiez avant d'ajouter.
      </p>
      <BookingForm
        trip={trip}
        initial={draft}
        submitLabel="Ajouter au voyage"
        onSubmit={async (input) => {
          // Si l'envoi des pièces jointes échoue, la réservation existe déjà : un nouvel essai ne la recrée pas
          const id =
            createdId ??
            (await addBooking(trip.id, {
              ...input,
              provider: draft.provider,
              ticket: draft.ticket,
              timezone: draftTimezone(trip, draft),
              source: 'email',
              importedAt: imp.receivedAt,
            }))
          setCreatedId(id)
          try {
            await attachImportFiles(imp, trip.id, id)
          } catch (e) {
            throw new Error(`Réservation enregistrée, mais les pièces jointes n'ont pas pu être copiées (${errorMessage(e)}). Réessayez.`)
          }
          onAdded()
        }}
      >
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Annuler
        </button>
      </BookingForm>
    </Sheet>
  )
}

/** Date de réception (horodatage UTC du serveur) en heure du téléphone : « sam. 24 oct. » */
const receivedOn = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function ImportCard({ imp, trips }: { imp: PendingImport; trips: Trip[] }) {
  const { dismissImport } = useTrips()
  const editable = trips.filter(canEdit)
  const [tripId, setTripId] = useState(() => (editable.some((t) => t.id === imp.suggestedTripId) ? imp.suggestedTripId! : (editable[0]?.id ?? '')))
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const trip = editable.find((t) => t.id === tripId)
  const allAdded = imp.drafts.length > 0 && added.size === imp.drafts.length

  const dismiss = async () => {
    setBusy(true)
    setError(null)
    try {
      await dismissImport(imp)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <article className="card imports__card">
      <header className="stack" style={{ gap: 2 }}>
        <span className="overline muted">
          <Mail size={12} /> Reçu le {receivedOn(imp.receivedAt)}
        </span>
        <span className="strong">{imp.subject || 'E-mail sans objet'}</span>
      </header>

      {imp.status === 'en_cours' && (
        <p className="caption muted imports__reading" role="status">
          <Sparkles size={14} /> Lecture par l'IA en cours…
        </p>
      )}
      {imp.status === 'erreur' && <p className="caption form-error">{imp.error ?? "La lecture de l'e-mail a échoué."}</p>}

      {imp.status === 'a_valider' && (
        <>
          {editable.length > 0 ? (
            <label className="field">
              <span className="overline muted">Voyage</span>
              <select className="input" value={tripId} onChange={(e) => setTripId(e.target.value)}>
                {editable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {formatRange(t.start, t.end)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="caption muted" style={{ margin: 0 }}>
              Créez d'abord le voyage auquel ajouter ces réservations.
            </p>
          )}
          <button type="button" className="imports__new-trip caption" onClick={() => setCreating(true)}>
            <Plus size={14} /> Nouveau voyage
          </button>

          <ul className="imports__drafts">
            {imp.drafts.map((d, i) => {
              const { Icon, color, label } = bookingKinds[d.kind] ?? bookingKinds.autre
              return (
                <li key={i}>
                  <span className="imports__chip" style={{ color }} aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
                    <span className="strong">{d.title}</span>
                    <span className="caption muted">
                      {label} · {formatShortDate(d.start)}
                      {d.start.slice(11) !== '00:00' && ` · ${formatTime(d.start)}`}
                    </span>
                  </span>
                  {added.has(i) ? (
                    <span className="imports__done caption">
                      <Check size={14} /> Ajoutée
                    </span>
                  ) : (
                    <button className="btn btn--accent imports__add" disabled={!trip} onClick={() => setOpen(i)}>
                      Ajouter
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {error && <p className="caption form-error">{error}</p>}
      {/* Pendant la lecture, la fonction serveur écrit encore dans l'import : on attend la fin */}
      {imp.status !== 'en_cours' && (
        <button className={`btn ${allAdded ? 'btn--primary' : 'btn--ghost'}`} onClick={dismiss} disabled={busy}>
          {allAdded ? (
            <>
              <Check size={16} /> Terminé
            </>
          ) : (
            <>
              <Trash2 size={16} /> {added.size > 0 ? 'Terminer (le reste est ignoré)' : 'Ignorer cet e-mail'}
            </>
          )}
        </button>
      )}

      {open !== null && trip && (
        <DraftSheet
          imp={imp}
          draft={imp.drafts[open]}
          trip={trip}
          onClose={() => setOpen(null)}
          onAdded={() => {
            setAdded(new Set(added).add(open))
            setOpen(null)
          }}
        />
      )}
      <NewTripSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={setTripId}
        defaults={{ start: imp.drafts[0]?.start.slice(0, 10), end: (imp.drafts.at(-1)?.end ?? imp.drafts.at(-1)?.start)?.slice(0, 10) }}
      />
    </article>
  )
}

/** E-mails transférés à l'adresse d'import, lus par l'IA, en attente de validation */
export function Imports() {
  const { imports, importAlias, trips, refresh } = useTrips()
  const navigate = useNavigate()
  const address = importAddress(importAlias)
  const reading = imports.some((i) => i.status === 'en_cours')

  // Tant qu'un e-mail est en cours de lecture, on vérifie toutes les 4 secondes
  useEffect(() => {
    if (!reading) return
    const timer = setInterval(refresh, 4000)
    return () => clearInterval(timer)
  }, [reading, refresh])

  return (
    <main className="screen">
      <header className="px stack" style={{ gap: 10 }}>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <h1 className="display-xl">E-mails à valider</h1>
        {address && (
          <p className="caption muted" style={{ margin: 0 }}>
            Transférez vos confirmations à <span className="strong imports__address">{address}</span>. Adresse et explications dans le{' '}
            <Link to="/profil" className="strong">
              profil
            </Link>
            .
          </p>
        )}
      </header>

      {imports.length === 0 ? (
        <section className="px">
          <div className="card imports__empty">
            <Inbox size={26} aria-hidden />
            <span className="strong">Rien à valider</span>
            <span className="caption muted">Les e-mails transférés apparaissent ici après quelques secondes de lecture.</span>
          </div>
        </section>
      ) : (
        <section className="px stack" style={{ gap: 12 }}>
          {imports.map((imp) => (
            <ImportCard key={imp.id} imp={imp} trips={trips} />
          ))}
        </section>
      )}
    </main>
  )
}
