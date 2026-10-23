import { ChevronLeft, CircleCheck, FileText, Mail, PenLine, Plane, QrCode, Share } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { bookingKinds } from '../components/BookingCard'
import { BookingFiles } from '../components/BookingFiles'
import { FileViewer } from '../components/FileViewer'
import { useTrips } from '../data/store'
import type { Booking, BookingFile } from '../data/types'
import { isPdf } from '../lib/files'
import { formatShortDate, formatTime, parseLocal } from '../lib/format'
import { canEdit } from '../lib/trip'
import { EditBookingSheet } from './EditBookingSheet'
import './Billet.css'

function sourceLine(b: Booking) {
  const when = b.importedAt ? ` · ${formatShortDate(b.importedAt)}` : ''
  if (b.source === 'email') return { Icon: Mail, text: `Importé depuis votre e-mail ${b.provider ?? ''}${when}` }
  if (b.source === 'pdf') return { Icon: FileText, text: `Importé depuis un PDF${when}` }
  return { Icon: PenLine, text: 'Ajouté à la main' }
}

export function Billet() {
  const { tripId, bookingId } = useParams()
  const navigate = useNavigate()
  const { trips, status } = useTrips()
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState<BookingFile | null>(null)
  const [viewerClosed, setViewerClosed] = useState(0)
  const trip = trips.find((t) => t.id === tripId)
  const booking = trip?.bookings.find((b) => b.id === bookingId)
  // Réservation introuvable (supprimée, ou lien périmé) : retour au voyage s'il existe encore
  if (!trip || !booking) return status === 'chargement' ? null : <Navigate to={trip ? `/voyages/${trip.id}` : '/voyages'} replace />

  const t = booking.ticket
  const kind = bookingKinds[booking.kind]
  /** Fichier montré par « Afficher le billet » : le premier PDF, sinon le premier fichier */
  const mainFile = booking.files.find(isPdf) ?? booking.files[0]
  const src = sourceLine(booking)
  const isFlight = booking.kind === 'vol'
  const title = isFlight ? "Carte d'embarquement" : t ? 'Billet' : kind.label

  const share = async () => {
    try {
      const text = `${booking.title} — ${formatShortDate(booking.start)} ${formatTime(booking.start)}${booking.reference ? ` · Réf. ${booking.reference}` : ''}`
      if (navigator.share) await navigator.share({ title: booking.title, text })
      else await navigator.clipboard.writeText(text)
    } catch {
      // partage annulé
    }
  }

  return (
    <main className="screen screen--no-tabbar billet">
      <header className="row between px">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Retour">
          <ChevronLeft size={20} />
        </button>
        <h1 className="title-m">{title}</h1>
        <button className="icon-btn" onClick={share} aria-label="Partager">
          <Share size={20} />
        </button>
      </header>

      <span className="pill billet__offline">
        <CircleCheck size={14} /> Disponible hors ligne
      </span>

      <article className="ticket">
        <div className="ticket__band">
          <span className="strong">{t?.carrier ?? booking.provider ?? kind.label}</span>
          <span className="overline">{[t?.number, t?.cabin].filter(Boolean).join(' · ') || booking.reference}</span>
        </div>

        {t ? (
          <div className="ticket__route">
            <div className="stack">
              <span className="ticket__code">{t.from}</span>
              <span className="caption ticket__dim">{t.fromCity}</span>
              <span className="title-m">{t.departure}</span>
            </div>
            <div className="stack ticket__mid">
              {isFlight ? <Plane size={22} style={{ transform: 'rotate(45deg)' }} /> : <kind.Icon size={22} />}
              <span className="caption ticket__dim">{t.duration}</span>
            </div>
            <div className="stack" style={{ alignItems: 'flex-end' }}>
              <span className="ticket__code">{t.to}</span>
              <span className="caption ticket__dim">{t.toCity}</span>
              <span className="title-m">{t.arrival}</span>
            </div>
          </div>
        ) : (
          <div className="ticket__route ticket__route--simple">
            <span className="display-l">{booking.title}</span>
            <span className="caption ticket__dim">{booking.detail}</span>
          </div>
        )}

        <dl className="ticket__grid">
          {t?.passenger && <Info label="Passager" value={t.passenger} />}
          <Info label="Date" value={formatShortDate(booking.start)} />
          {!t && <Info label={booking.kind === 'hotel' ? 'Arrivée' : 'Heure'} value={formatTime(booking.start)} />}
          {!t && booking.end && <Info label="Départ" value={`${formatShortDate(booking.end)} · ${formatTime(booking.end)}`} />}
          {t?.boarding && <Info label="Embarq." value={t.boarding} />}
          {t?.gate && <Info label="Porte" value={t.gate} />}
          {t?.seat && <Info label="Siège" value={t.seat} />}
        </dl>

        {(booking.reference || mainFile) && (
          <>
            <div className="ticket__perf" aria-hidden />
            <div className="ticket__ref">
              {booking.reference && (
                <>
                  <span className="overline ticket__dim">Référence</span>
                  <span className="ticket__ref-code">{booking.reference}</span>
                </>
              )}
              {mainFile && (
                <button className="btn ticket__open" onClick={() => setViewing(mainFile)}>
                  <QrCode size={18} /> Afficher le billet
                </button>
              )}
            </div>
          </>
        )}
      </article>

      <BookingFiles
        tripId={trip.id}
        booking={booking}
        editable={canEdit(trip)}
        onOpen={setViewing}
        refreshKey={viewerClosed}
      />
      {viewing && (
        <FileViewer
          file={viewing}
          onClose={() => {
            setViewing(null)
            setViewerClosed((n) => n + 1)
          }}
        />
      )}

      <p className="card billet__source caption muted">
        <src.Icon size={18} /> {src.text}
        {parseLocal(booking.start) < new Date() && ' · voyage passé'}
      </p>

      {canEdit(trip) && (
        <>
          <button className="btn btn--ghost billet__edit" onClick={() => setEditing(true)}>
            <PenLine size={16} /> Modifier ou supprimer
          </button>
          <EditBookingSheet
            trip={trip}
            booking={booking}
            open={editing}
            onClose={() => setEditing(false)}
            onDeleted={() => navigate(`/voyages/${trip.id}`, { replace: true })}
          />
        </>
      )}
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="overline ticket__dim">{label}</dt>
      <dd className="strong">{value}</dd>
    </div>
  )
}
