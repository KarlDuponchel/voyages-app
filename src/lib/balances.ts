/**
 * Soldes du budget partagé, en centimes (sans dépendance : testé par `npm run test:app`).
 * Solde positif : on doit de l'argent à la personne ; négatif : elle doit de l'argent.
 */

export type ExpenseLike = { amountCents: number; paidBy?: string; shares: { userId: string; amountCents: number }[] }
export type SettlementLike = { from: string; to: string; amountCents: number }
export type Transfer = { from: string; to: string; amountCents: number }

export function balances(expenses: ExpenseLike[], settlements: SettlementLike[]): Map<string, number> {
  const b = new Map<string, number>()
  const add = (user: string | undefined, cents: number) => {
    if (!user) return
    b.set(user, (b.get(user) ?? 0) + cents)
  }
  for (const e of expenses) {
    add(e.paidBy, e.amountCents)
    for (const s of e.shares) add(s.userId, -s.amountCents)
  }
  // Rembourser, c'est comme payer pour l'autre : le payeur remonte, celui qui reçoit descend
  for (const s of settlements) {
    add(s.from, s.amountCents)
    add(s.to, -s.amountCents)
  }
  return b
}

/**
 * Remboursements pour que tout le monde soit quitte, en peu de virements : à chaque tour, la personne
 * qui doit le plus rembourse celle à qui l'on doit le plus. Au plus (nombre de personnes − 1) virements.
 */
export function transfers(balance: Map<string, number>): Transfer[] {
  const debtors = [...balance].filter(([, c]) => c < 0).map(([u, c]) => ({ u, c: -c }))
  const creditors = [...balance].filter(([, c]) => c > 0).map(([u, c]) => ({ u, c }))
  const out: Transfer[] = []
  for (;;) {
    debtors.sort((a, b) => b.c - a.c)
    creditors.sort((a, b) => b.c - a.c)
    const d = debtors[0]
    const k = creditors[0]
    if (!d || !k || d.c === 0 || k.c === 0) break
    const amount = Math.min(d.c, k.c)
    out.push({ from: d.u, to: k.u, amountCents: amount })
    d.c -= amount
    k.c -= amount
    if (d.c === 0) debtors.shift()
    if (k.c === 0) creditors.shift()
  }
  return out
}

/**
 * Parts égales d'un montant entre plusieurs personnes ; les centimes en trop vont aux premières
 * (100 € entre 3 : 33,34 + 33,33 + 33,33), pour que la somme fasse exactement le montant.
 */
export function equalShares(amountCents: number, users: string[]): { userId: string; amountCents: number }[] {
  if (users.length === 0) return []
  const base = Math.floor(amountCents / users.length)
  const rest = amountCents - base * users.length
  return users.map((userId, i) => ({ userId, amountCents: base + (i < rest ? 1 : 0) }))
}
