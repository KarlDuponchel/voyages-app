import { ArrowRight, Check, Plus, Receipt, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../data/auth'
import type { Trip } from '../data/types'
import { balances, transfers } from '../lib/balances'
import { addSettlement, CATEGORIES, deleteSettlement, formatCents, loadBudget, type Expense, type Settlement } from '../lib/expenses'
import { formatDayHeader } from '../lib/format'
import { errorMessage } from '../lib/supabase'
import { canEdit } from '../lib/trip'
import { CategoryIcon } from './CategoryIcon'
import { ExpenseSheet } from './ExpenseSheet'
import './TripBudget.css'

/**
 * Onglet Budget d'un voyage : total dépensé face au budget prévu, répartition par catégorie,
 * « qui doit quoi » (le moins de virements possible), dépenses par jour et remboursements.
 */
export function TripBudget({ trip }: { trip: Trip }) {
  const { session } = useAuth()
  const me = session?.user.id
  const editable = canEdit(trip)
  const [data, setData] = useState<{ expenses: Expense[]; settlements: Settlement[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await loadBudget(trip.id))
      setError(null)
    } catch {
      setError(navigator.onLine ? 'Impossible de charger les dépenses.' : 'Hors ligne : les dépenses se chargeront au retour du réseau.')
    }
  }, [trip.id])
  useEffect(() => {
    load()
  }, [load])

  const money = (cents: number) => formatCents(cents, trip.currency)
  const name = (id?: string) => (!id ? 'Ancien voyageur' : id === me ? 'Vous' : (trip.members.find((m) => m.userId === id)?.name ?? 'Ancien voyageur'))

  const expenses = data?.expenses ?? []
  const settlements = data?.settlements ?? []
  const total = expenses.reduce((n, e) => n + e.amountCents, 0)
  const budgetCents = trip.budget != null ? Math.round(trip.budget * 100) : null
  const balance = useMemo(() => balances(expenses, settlements), [expenses, settlements])
  const toSettle = useMemo(() => transfers(balance), [balance])
  const byCategory = CATEGORIES.map((c) => ({ ...c, cents: expenses.filter((e) => e.category === c.id).reduce((n, e) => n + e.amountCents, 0) }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents)
  const mine = me ? (balance.get(me) ?? 0) : 0

  // Par jour, le plus récent d'abord (tri stable : l'ordre d'ajout est gardé dans une même journée)
  const days: [string, Expense[]][] = []
  for (const e of [...expenses].sort((a, b) => b.spentOn.localeCompare(a.spentOn))) {
    const last = days.at(-1)
    if (last?.[0] === e.spentOn) last[1].push(e)
    else days.push([e.spentOn, [e]])
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      await load()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="px stack fade-in budget" style={{ gap: 14 }}>
        {/* Total face au budget prévu */}
        <div className="card budget__summary">
          <span className="overline muted">Dépensé</span>
          <span className="numeric-l">{money(total)}</span>
          {budgetCents !== null && budgetCents > 0 && (
            <>
              <div className={`progress budget__progress${total > budgetCents ? ' is-over' : ''}`}>
                <span style={{ width: `${Math.min(100, (total / budgetCents) * 100)}%` }} />
              </div>
              <span className="caption muted">
                {total > budgetCents ? `Budget de ${money(budgetCents)} dépassé de ${money(total - budgetCents)}` : `Sur ${money(budgetCents)} prévus · reste ${money(budgetCents - total)}`}
              </span>
            </>
          )}
          {byCategory.length > 0 && (
            <ul className="budget__categories">
              {byCategory.map((c) => (
                <li key={c.id}>
                  <CategoryIcon category={c.id} size={15} />
                  <span>{c.label}</span>
                  <span className="budget__cat-bar" aria-hidden>
                    <i style={{ width: `${(c.cents / total) * 100}%` }} />
                  </span>
                  <span className="caption">{money(c.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Qui doit quoi */}
        {expenses.length > 0 && trip.members.length > 1 && (
          <div className="card budget__settle">
            <div className="row between">
              <span className="strong">Qui doit quoi</span>
              {me && mine !== 0 && <span className={`caption ${mine > 0 ? 'budget__plus' : 'budget__minus'}`}>{mine > 0 ? `On vous doit ${money(mine)}` : `Vous devez ${money(-mine)}`}</span>}
            </div>
            {toSettle.length === 0 ? (
              <span className="caption muted budget__even">
                <Check size={15} aria-hidden /> Tout le monde est quitte.
              </span>
            ) : (
              <ul className="budget__transfers">
                {toSettle.map((t) => (
                  <li key={`${t.from}-${t.to}`}>
                    <span className="budget__who">
                      {name(t.from)} <ArrowRight size={14} aria-label="doit à" /> {name(t.to)}
                    </span>
                    <span className="strong">{money(t.amountCents)}</span>
                    {editable && (
                      <button className="btn btn--ghost budget__paid" disabled={busy} onClick={() => run(() => addSettlement(trip.id, t.from, t.to, t.amountCents))}>
                        Remboursé
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="caption form-error">{error}</p>}

        {data && expenses.length === 0 && (
          <div className="card voyage__empty">
            <Receipt size={22} className="budget__empty-icon" aria-hidden />
            <span className="strong">Pas encore de dépenses</span>
            <span className="caption muted">
              {editable ? 'Notez qui a payé quoi : l’app calcule qui doit combien à qui.' : 'Les dépenses ajoutées par les voyageurs apparaîtront ici.'}
            </span>
            {editable && (
              <button className="btn btn--accent" style={{ marginTop: 6 }} onClick={() => setEditing('new')}>
                <Plus size={16} /> Ajouter une dépense
              </button>
            )}
          </div>
        )}

        {/* Dépenses par jour */}
        {days.map(([day, items]) => (
          <div key={day} className="stack" style={{ gap: 8 }}>
            <h2 className="voyage__day overline muted">
              <i aria-hidden />
              {formatDayHeader(day)}
            </h2>
            {items.map((e) => (
              <button key={e.id} className="card budget__expense" onClick={() => editable && setEditing(e)} disabled={!editable}>
                <span className="budget__icon">
                  <CategoryIcon category={e.category} />
                </span>
                <span className="stack" style={{ gap: 1, flex: 1, minWidth: 0 }}>
                  <span className="strong budget__title">{e.title}</span>
                  <span className="caption muted">
                    {name(e.paidBy)} {e.paidBy === me ? 'avez payé' : 'a payé'}
                    {e.shares.length < trip.members.length ? ` · pour ${e.shares.length}` : ''}
                  </span>
                </span>
                <span className="strong">{money(e.amountCents)}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Remboursements enregistrés */}
        {settlements.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <h2 className="overline muted">Remboursements</h2>
            {settlements.map((s) => (
              <div key={s.id} className="budget__settlement caption">
                <span>
                  {name(s.from)} {s.from === me ? 'avez remboursé' : 'a remboursé'} {money(s.amountCents)} à {s.to === me ? 'vous' : name(s.to)}
                </span>
                {editable && (
                  <button className="budget__undo" disabled={busy} onClick={() => run(() => deleteSettlement(s.id))} aria-label="Annuler ce remboursement">
                    <Undo2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {editable && (
        <button className="fab btn btn--accent" onClick={() => setEditing('new')}>
          <Plus size={20} /> Dépense
        </button>
      )}
      <ExpenseSheet
        trip={trip}
        me={me}
        expense={editing && editing !== 'new' ? editing : undefined}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </>
  )
}
