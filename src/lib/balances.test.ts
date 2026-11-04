// Soldes du budget partagé. Lancer : npm run test:app
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { balances, equalShares, transfers } from './balances.ts'

test('parts égales : les centimes en trop vont aux premiers, la somme est exacte', () => {
  const s = equalShares(10000, ['a', 'b', 'c'])
  assert.deepEqual(s.map((x) => x.amountCents), [3334, 3333, 3333])
  assert.equal(s.reduce((n, x) => n + x.amountCents, 0), 10000)
})

test('soldes : un dîner payé par Karl pour deux', () => {
  const b = balances([{ amountCents: 6000, paidBy: 'karl', shares: equalShares(6000, ['karl', 'lea']) }], [])
  assert.equal(b.get('karl'), 3000)
  assert.equal(b.get('lea'), -3000)
  assert.deepEqual(transfers(b), [{ from: 'lea', to: 'karl', amountCents: 3000 }])
})

test('remboursement enregistré : tout le monde est quitte', () => {
  const b = balances(
    [{ amountCents: 6000, paidBy: 'karl', shares: equalShares(6000, ['karl', 'lea']) }],
    [{ from: 'lea', to: 'karl', amountCents: 3000 }],
  )
  assert.equal(b.get('karl'), 0)
  assert.equal(b.get('lea'), 0)
  assert.deepEqual(transfers(b), [])
})

test('trois voyageurs : au plus deux virements, et chacun finit à zéro', () => {
  const expenses = [
    { amountCents: 9000, paidBy: 'karl', shares: equalShares(9000, ['karl', 'lea', 'tom']) },
    { amountCents: 3000, paidBy: 'lea', shares: equalShares(3000, ['karl', 'lea', 'tom']) },
    { amountCents: 1500, paidBy: 'tom', shares: equalShares(1500, ['lea', 'tom']) },
  ]
  const b = balances(expenses, [])
  const t = transfers(b)
  assert.ok(t.length <= 2, JSON.stringify(t))
  const after = balances(expenses, t)
  for (const [, c] of after) assert.equal(c, 0)
})

test('une dépense dont le payeur a quitté l’app compte quand même pour les autres', () => {
  const b = balances([{ amountCents: 2000, shares: equalShares(2000, ['lea', 'tom']) }], [])
  assert.equal(b.get('lea'), -1000)
  assert.equal(b.has(''), false)
})
