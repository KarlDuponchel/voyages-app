import { supabase } from './supabase'

/**
 * Budget partagé (migration 20261104100000_depenses.sql) : dépenses, parts de chacun et remboursements.
 * Les montants sont en centimes, dans la devise du voyage. Les soldes se calculent dans balances.ts.
 */

export type ExpenseCategory = 'transport' | 'logement' | 'repas' | 'activites' | 'courses' | 'autre'

export const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'repas', label: 'Repas' },
  { id: 'logement', label: 'Logement' },
  { id: 'transport', label: 'Transport' },
  { id: 'activites', label: 'Activités' },
  { id: 'courses', label: 'Courses' },
  { id: 'autre', label: 'Autre' },
]

export type Expense = {
  id: string
  title: string
  amountCents: number
  category: ExpenseCategory
  paidBy?: string
  spentOn: string
  shares: { userId: string; amountCents: number }[]
}

export type Settlement = { id: string; from: string; to: string; amountCents: number; settledOn: string }

type ExpenseRow = {
  id: string
  title: string
  amount_cents: number
  category: ExpenseCategory
  paid_by: string | null
  spent_on: string
  expense_shares: { user_id: string; amount_cents: number }[]
}

export async function loadBudget(tripId: string): Promise<{ expenses: Expense[]; settlements: Settlement[] }> {
  const [e, s] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, title, amount_cents, category, paid_by, spent_on, expense_shares ( user_id, amount_cents )')
      .eq('trip_id', tripId)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('settlements').select('id, from_user, to_user, amount_cents, settled_on').eq('trip_id', tripId).order('created_at', { ascending: false }),
  ])
  if (e.error) throw e.error
  if (s.error) throw s.error
  return {
    expenses: ((e.data ?? []) as unknown as ExpenseRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      amountCents: Number(r.amount_cents),
      category: r.category,
      paidBy: r.paid_by ?? undefined,
      spentOn: r.spent_on,
      shares: r.expense_shares.map((x) => ({ userId: x.user_id, amountCents: Number(x.amount_cents) })),
    })),
    settlements: (s.data ?? []).map((r) => ({
      id: r.id,
      from: r.from_user,
      to: r.to_user,
      amountCents: Number(r.amount_cents),
      settledOn: r.settled_on,
    })),
  }
}

/** Création (sans id) ou modification ; la base vérifie que les parts font le total et que tout le monde est du voyage */
export async function saveExpense(tripId: string, e: Omit<Expense, 'id'> & { id?: string }): Promise<void> {
  const { error } = await supabase.rpc('save_expense', {
    p_trip: tripId,
    p_id: e.id ?? null,
    p_title: e.title,
    p_amount_cents: e.amountCents,
    p_category: e.category,
    p_paid_by: e.paidBy ?? null,
    p_spent_on: e.spentOn,
    p_shares: e.shares.map((s) => ({ user_id: s.userId, amount_cents: s.amountCents })),
  })
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function addSettlement(tripId: string, from: string, to: string, amountCents: number): Promise<void> {
  const { error } = await supabase.from('settlements').insert({ trip_id: tripId, from_user: from, to_user: to, amount_cents: amountCents })
  if (error) throw error
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await supabase.from('settlements').delete().eq('id', id)
  if (error) throw error
}

/** « 1 234,50 € » */
export const formatCents = (cents: number, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)

/** « 12,5 », « 12.50 », « 1 234,5 » → centimes ; null si ce n'est pas un montant positif */
export function parseCents(text: string): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null
  const cents = Math.round(Number(clean) * 100)
  return cents > 0 ? cents : null
}
