import { Check, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Trip } from '../data/types'
import { equalShares } from '../lib/balances'
import { CATEGORIES, deleteExpense, formatCents, parseCents, saveExpense, type Expense, type ExpenseCategory } from '../lib/expenses'
import { errorMessage } from '../lib/supabase'
import { CategoryIcon } from './CategoryIcon'
import { Sheet } from './Sheet'

const today = () => new Date().toLocaleDateString('sv-SE')
const toText = (cents: number) => (cents / 100).toFixed(2).replace('.', ',').replace(',00', '')

/**
 * Ajout ou modification d'une dépense : montant, intitulé, catégorie, date, qui a payé, et pour qui.
 * Partage à parts égales par défaut ; « Montants » permet de saisir la part de chacun.
 */
export function ExpenseSheet({
  trip,
  me,
  expense,
  open,
  onClose,
  onSaved,
}: {
  trip: Trip
  me?: string
  /** Dépense à modifier ; sans elle, nouvelle dépense */
  expense?: Expense
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const members = trip.members
  const everyone = members.map((m) => m.userId)
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('repas')
  const [spentOn, setSpentOn] = useState(today())
  const [paidBy, setPaidBy] = useState<string>('')
  const [forWhom, setForWhom] = useState<string[]>(everyone)
  const [custom, setCustom] = useState(false)
  const [parts, setParts] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // À chaque ouverture : la dépense à modifier, ou des valeurs utiles (aujourd'hui dans le voyage, payé par moi, pour tous)
  useEffect(() => {
    if (!open) return
    setError(null)
    setConfirmDelete(false)
    if (expense) {
      setAmount(toText(expense.amountCents))
      setTitle(expense.title)
      setCategory(expense.category)
      setSpentOn(expense.spentOn)
      setPaidBy(expense.paidBy ?? '')
      setForWhom(expense.shares.map((s) => s.userId))
      const even = equalShares(expense.amountCents, expense.shares.map((s) => s.userId))
      const isEven = even.every((e, i) => e.amountCents === expense.shares[i].amountCents)
      setCustom(!isEven)
      setParts(Object.fromEntries(expense.shares.map((s) => [s.userId, toText(s.amountCents)])))
    } else {
      const day = today()
      setAmount('')
      setTitle('')
      setCategory('repas')
      setSpentOn(day >= trip.start && day <= trip.end ? day : trip.start)
      setPaidBy(me && everyone.includes(me) ? me : (everyone[0] ?? ''))
      setForWhom(everyone)
      setCustom(false)
      setParts({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id])

  const cents = parseCents(amount)
  // Cocher ou décocher quelqu'un, en gardant l'ordre des voyageurs
  const toggle = (id: string) => setForWhom((list) => (list.includes(id) ? list.filter((u) => u !== id) : everyone.filter((u) => u === id || list.includes(u))))
  const customCents = forWhom.map((u) => parseCents(parts[u] ?? '') ?? 0)
  const customTotal = customCents.reduce((n, c) => n + c, 0)
  const remaining = (cents ?? 0) - customTotal
  const name = (id: string) => (id === me ? 'Moi' : (members.find((m) => m.userId === id)?.name ?? 'Ancien voyageur'))

  const submit = async () => {
    if (!cents) return setError('Indiquez un montant, par exemple 24,50.')
    if (!title.trim()) return setError('Donnez un nom à la dépense, par exemple « Courses ».')
    if (forWhom.length === 0) return setError('Choisissez au moins une personne concernée.')
    if (custom && remaining !== 0) return setError(`Les parts doivent faire ${formatCents(cents, trip.currency)}.`)
    const shares = custom ? forWhom.map((userId, i) => ({ userId, amountCents: customCents[i] })) : equalShares(cents, forWhom)
    setBusy(true)
    setError(null)
    try {
      await saveExpense(trip.id, { id: expense?.id, title: title.trim(), amountCents: cents, category, paidBy: paidBy || undefined, spentOn, shares })
      await onSaved()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!expense) return
    setBusy(true)
    try {
      await deleteExpense(expense.id)
      await onSaved()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label={expense ? 'Modifier la dépense' : 'Nouvelle dépense'}>
      <div className="stack expense-form" style={{ gap: 14 }}>
        <h2 className="display-l">{expense ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>

        <label className="field">
          <span className="overline muted">Montant ({trip.currency === 'EUR' ? '€' : trip.currency})</span>
          <input className="input expense-form__amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!expense} />
        </label>
        <label className="field">
          <span className="overline muted">Pour quoi</span>
          <input className="input" maxLength={120} placeholder="Courses, taxi, dîner…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <div className="field">
          <span className="overline muted">Catégorie</span>
          <div className="expense-form__chips" role="radiogroup" aria-label="Catégorie">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={category === c.id} className={category === c.id ? 'is-active' : ''} onClick={() => setCategory(c.id)}>
                <CategoryIcon category={c.id} size={15} /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Date</span>
            <input className="input" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="overline muted">Payé par</span>
            <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {name(m.userId)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <div className="row between">
            <span className="overline muted">Pour qui</span>
            <div className="expense-form__mode" role="radiogroup" aria-label="Partage">
              <button type="button" role="radio" aria-checked={!custom} className={!custom ? 'is-active' : ''} onClick={() => setCustom(false)}>
                Parts égales
              </button>
              <button type="button" role="radio" aria-checked={custom} className={custom ? 'is-active' : ''} onClick={() => setCustom(true)}>
                Montants
              </button>
            </div>
          </div>
          <ul className="expense-form__people">
            {members.map((m) => {
              const on = forWhom.includes(m.userId)
              const share = !custom && cents && on ? equalShares(cents, forWhom).find((s) => s.userId === m.userId)?.amountCents : undefined
              return (
                <li key={m.userId}>
                  <label className="expense-form__person">
                    <input type="checkbox" checked={on} onChange={() => toggle(m.userId)} />
                    <span>{name(m.userId)}</span>
                  </label>
                  {custom && on ? (
                    <input
                      className="input expense-form__part"
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`Part de ${name(m.userId)}`}
                      value={parts[m.userId] ?? ''}
                      onChange={(e) => setParts((p) => ({ ...p, [m.userId]: e.target.value }))}
                    />
                  ) : (
                    <span className="caption muted">{share !== undefined ? formatCents(share, trip.currency) : ''}</span>
                  )}
                </li>
              )
            })}
          </ul>
          {custom && cents && (
            <span className={`caption ${remaining === 0 ? 'muted' : 'form-error'}`}>
              {remaining === 0 ? 'Le compte est bon.' : remaining > 0 ? `Reste ${formatCents(remaining, trip.currency)} à répartir.` : `${formatCents(-remaining, trip.currency)} de trop.`}
            </span>
          )}
        </div>

        {error && (
          <p className="caption form-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button className="btn btn--primary" onClick={submit} disabled={busy}>
          <Check size={16} /> {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {expense &&
          (confirmDelete ? (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--accent" style={{ flex: 1 }} onClick={remove} disabled={busy}>
                <Trash2 size={16} /> Oui, supprimer
              </button>
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Annuler
              </button>
            </div>
          ) : (
            <button className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Supprimer la dépense
            </button>
          ))}
      </div>
    </Sheet>
  )
}
