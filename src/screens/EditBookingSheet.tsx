import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BookingForm } from '../components/BookingForm'
import { Sheet } from '../components/Sheet'
import { useTrips } from '../data/store'
import type { Booking, Trip } from '../data/types'
import { errorMessage } from '../lib/supabase'
import './AddBookingSheet.css'

/** Modification ou suppression d'une réservation. `onDeleted` : la réservation n'existe plus, on quitte l'écran. */
export function EditBookingSheet({
  trip,
  booking,
  open,
  onClose,
  onDeleted,
}: {
  trip: Trip
  booking: Booking
  open: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const { updateBooking, deleteBooking } = useTrips()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setConfirm(false)
    setError(null)
    onClose()
  }

  const remove = async () => {
    setError(null)
    try {
      await deleteBooking(booking.id)
      onDeleted()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Sheet open={open} onClose={close} label="Modifier la réservation">
      <h2 className="display-l">Modifier</h2>
      <BookingForm
        trip={trip}
        initial={booking}
        submitLabel="Enregistrer"
        onSubmit={async (input) => {
          await updateBooking(booking.id, input)
          close()
        }}
      >
        {confirm ? (
          <div className="stack" style={{ gap: 8 }}>
            <p className="caption" style={{ margin: 0 }}>
              La réservation sera supprimée pour tous les voyageurs.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn--accent" style={{ flex: 1 }} onClick={remove}>
                Oui, supprimer
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirm(true)}>
            <Trash2 size={16} /> Supprimer la réservation
          </button>
        )}
        {error && (
          <p className="caption form-error" role="alert">
            {error}
          </p>
        )}
      </BookingForm>
    </Sheet>
  )
}
