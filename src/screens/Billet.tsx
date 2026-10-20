import { ChevronLeft, CircleCheck, FileText, Mail, PenLine, Plane, Share } from 'lucide-react'
import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { bookingKinds } from '../components/BookingCard'
import { useTrips } from '../data/store'
import type { Booking } from '../data/types'
import { formatShortDate, formatTime, parseLocal } from '../lib/format'
import './Billet.css'

/**
 * QR code d'illustration, généré à partir de la référence.
 * Le vrai QR sera repris du PDF/e-mail importé quand la lecture automatique sera en place.
 */
function DemoQr({ seedText }: { seedText: string }) {
  const cells = useMemo(() => {
    let seed = [...seedText].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32)
    const n = 25
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)
    const out: string[] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) out.push(`M${x} ${y}h1v1h-1Z`)
    const finder = (x: number, y: number) => `M${x} ${y}h7v7h-7Z M${x + 1} ${y + 1}v5h5v-5Z M${x + 2} ${y + 2}h3v3h-3Z`
    return [finder(0, 0), finder(n - 7, 0), finder(0, n - 7), ...out].join(' ')
  }, [seedText])
  return (
    <svg viewBox="-1.5 -1.5 28 28" width="170" height="170" className="qr" role="img" aria-label="QR code">
      <rect x="-1.5" y="-1.5" width="28" height="28" fill="#fff" rx="1" />
      <path d={cells} fill="#0A0F1F" fillRule="evenodd" />
    </svg>
  )
}

function sourceLine(b: Booking) {
  const when = b.importedAt ? ` · ${formatShortDate(b.importedAt)}` : ''
  if (b.source === 'email') return { Icon: Mail, text: `Importé depuis votre e-mail ${b.provider ?? ''}${when}` }
  if (b.source === 'pdf') return { Icon: FileText, text: `Importé depuis un PDF${when}` }
  return { Icon: PenLine, text: 'Ajouté à la main' }
}

export function Billet() {
  const { tripId, bookingId } = useParams()
  const navigate = useNavigate()
  const { trips } = useTrips()
  const trip = trips.find((t) => t.id === tripId)
  const booking = trip?.bookings.find((b) => b.id === bookingId)
  if (!trip || !booking) return <Navigate to="/voyages" replace />

  const t = booking.ticket
  const kind = bookingKinds[booking.kind]
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

        {booking.reference && (
          <>
            <div className="ticket__perf" aria-hidden />
            <div className="ticket__qr">
              <DemoQr seedText={booking.reference} />
              <span className="caption ticket__dim">Réf. {booking.reference}</span>
            </div>
          </>
        )}
      </article>

      <p className="card billet__source caption muted">
        <src.Icon size={18} /> {src.text}
        {parseLocal(booking.start) < new Date() && ' · voyage passé'}
      </p>
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
