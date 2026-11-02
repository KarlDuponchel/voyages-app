import { Check, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchPlan, formatBytes, openBillingPortal, PRICES, startCheckout, type Plan } from '../lib/plan'
import { errorMessage } from '../lib/supabase'

const longDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function Meter({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  const ratio = Math.min(value / max, 1)
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row between">
        <span className="caption">{label}</span>
        <span className={`caption ${ratio >= 1 ? 'form-error' : 'muted'}`}>{detail}</span>
      </div>
      <div className={`progress ${ratio >= 0.9 ? 'progress--full' : ''}`}>
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

/** États Stripe où il existe un abonnement à gérer (changer de carte, résilier, factures) */
const SUBSCRIBED = ['active', 'trialing', 'past_due', 'unpaid']

/** Offre du compte : place utilisée, lectures par l'IA, passage au premium ou gestion de l'abonnement */
export function PlanCard() {
  const location = useLocation()
  const thanks = new URLSearchParams(location.search).get('premium') === 'merci'
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setPlan(await fetchPlan())
    } catch (e) {
      setError(navigator.onLine ? errorMessage(e) : 'Hors ligne : votre offre s’affichera au retour du réseau.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Retour du paiement : le webhook de Stripe arrive en quelques secondes
  useEffect(() => {
    if (!thanks || plan?.premium) return
    const t = setTimeout(load, 3000)
    return () => clearTimeout(t)
  }, [thanks, plan, load])

  // Lien « Voir l'offre » depuis un message de quota
  useEffect(() => {
    if (location.hash === '#offre') card.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, plan])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div ref={card} id="offre" className="card profil-card">
      {!plan ? (
        <p className="caption muted" style={{ margin: 0 }}>
          {error ?? 'Chargement…'}
        </p>
      ) : (
        <>
          <div className="row between">
            <span className="strong plan__name">
              {plan.premium && <Sparkles size={16} />} {plan.premium ? 'Premium' : 'Gratuit'}
            </span>
            {plan.premium && plan.periodEnd && (
              <span className="caption muted">
                {plan.status === 'past_due'
                  ? 'Paiement en attente'
                  : plan.cancelAtPeriodEnd
                    ? `Jusqu’au ${longDate(plan.periodEnd)}`
                    : `Renouvelé le ${longDate(plan.periodEnd)}`}
              </span>
            )}
            {plan.status === 'offert' && <span className="caption muted">Offert</span>}
          </div>

          {thanks && !plan.premium && <p className="caption" style={{ margin: 0 }}>Merci ! Votre premium s’active dans quelques secondes…</p>}
          {thanks && plan.premium && (
            <p className="caption" style={{ margin: 0 }}>
              <Check size={14} style={{ verticalAlign: -2, color: 'var(--accent-lagoon)' }} /> Merci, vous êtes premium !
            </p>
          )}

          <Meter
            label="Photos et vidéos"
            value={plan.photoBytes}
            max={plan.photoBytesLimit}
            detail={`${formatBytes(plan.photoBytes)} sur ${formatBytes(plan.photoBytesLimit)}`}
          />
          {plan.photoTripsLimit !== null && (
            <Meter
              label="Voyages avec photos"
              value={plan.photoTrips}
              max={plan.photoTripsLimit}
              detail={`${plan.photoTrips} sur ${plan.photoTripsLimit}`}
            />
          )}
          <Meter
            label="Lectures par l’IA"
            value={plan.aiUsed}
            max={plan.aiLimit}
            detail={plan.aiMonthly ? `${plan.aiUsed} sur ${plan.aiLimit} ces 30 jours` : `${plan.aiUsed} sur ${plan.aiLimit} offertes`}
          />
          <p className="caption muted" style={{ margin: 0 }}>
            Les photos de tous les voyageurs comptent dans l’espace du propriétaire du voyage.
          </p>

          {!plan.premium && (
            <div className="stack plan__offer" style={{ gap: 10 }}>
              <span className="strong">Passer premium</span>
              <ul className="caption plan__perks">
                <li>Lecture des billets et des e-mails par l’IA, sans compter</li>
                <li>Photos et vidéos dans tous vos voyages, 20 Go</li>
                <li>Vos voyageurs en profitent dans vos voyages</li>
              </ul>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn--accent" style={{ flex: 1 }} disabled={busy} onClick={() => run(() => startCheckout('year'))}>
                  {PRICES.year} / an
                </button>
                <button className="btn btn--ghost" style={{ flex: 1 }} disabled={busy} onClick={() => run(() => startCheckout('month'))}>
                  {PRICES.month} / mois
                </button>
              </div>
              <span className="caption muted">Sans engagement, résiliable à tout moment. Paiement sécurisé par Stripe.</span>
            </div>
          )}
          {/* Un client Stripe existe dès qu'un paiement est commencé, même abandonné : le portail ne sert qu'avec un vrai abonnement */}
          {plan.managedByStripe && SUBSCRIBED.includes(plan.status ?? '') && (
            <button className="btn btn--ghost" disabled={busy} onClick={() => run(openBillingPortal)}>
              Gérer l’abonnement
            </button>
          )}
          {error && <p className="caption form-error">{error}</p>}
        </>
      )}
    </div>
  )
}
