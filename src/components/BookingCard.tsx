import { BedDouble, Bus, CarFront, ChevronRight, Compass, MapPin, Plane, Ship, TrainFront, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Booking, BookingKind } from '../data/types'
import { formatTime } from '../lib/format'
import './BookingCard.css'

export const bookingKinds: Record<BookingKind, { label: string; Icon: LucideIcon; color: string }> = {
  vol: { label: 'Vol', Icon: Plane, color: 'var(--accent-sunset)' },
  train: { label: 'Train', Icon: TrainFront, color: 'var(--accent-sun)' },
  car: { label: 'Car', Icon: Bus, color: 'var(--accent-sun)' },
  bateau: { label: 'Bateau', Icon: Ship, color: 'var(--accent-lagoon)' },
  location: { label: 'Location', Icon: CarFront, color: 'var(--accent-sun)' },
  hotel: { label: 'Hôtel', Icon: BedDouble, color: 'var(--accent-lavender)' },
  activite: { label: 'Activité', Icon: Compass, color: 'var(--accent-lagoon)' },
  autre: { label: 'Autre', Icon: MapPin, color: 'var(--text-secondary)' },
}

function typeLine(b: Booking) {
  const { label } = bookingKinds[b.kind]
  const start = formatTime(b.start)
  if (b.kind === 'hotel') return `${label} · arrivée ${start}`
  if (b.end && b.ticket) return `${label} · ${start} → ${formatTime(b.end)}`
  return `${label} · ${start}`
}

export function BookingCard({ booking, href }: { booking: Booking; href: string }) {
  const { Icon, color } = bookingKinds[booking.kind]
  return (
    <Link to={href} className="booking card" style={{ '--tint': color } as CSSProperties}>
      <span className="booking__chip" aria-hidden>
        <Icon size={22} />
      </span>
      <span className="booking__body">
        <span className="overline booking__type">{typeLine(booking)}</span>
        <span className="strong">{booking.title}</span>
        <span className="caption muted">{booking.detail}</span>
      </span>
      <ChevronRight size={18} className="muted" aria-hidden />
    </Link>
  )
}
