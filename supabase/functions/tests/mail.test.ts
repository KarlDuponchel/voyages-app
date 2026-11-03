/**
 * E-mails à l'équipe : texte d'un signalement et d'un retour (aucun envoi réel). Lancer : npm run test:functions
 */
import { assertEquals, assertMatch } from 'jsr:@std/assert@1.0.13'
import { feedbackMail, reportMail } from '../_shared/mail.ts'

Deno.test('signalement : motif, compte, masquage, alerte RGPD', () => {
  const first = reportMail({ city: 'Porto', author: 'Marie', reason: 'spam', reports: 1, hidden: false, photoId: 'p1' })
  assertEquals(first.subject, '🚩 Photo signalée à Porto (1/3 avant masquage)')
  assertMatch(first.text, /Motif : Publicité ou spam/)

  const third = reportMail({ city: 'Porto', author: 'Marie', reason: 'personne', details: 'C’est moi', reports: 3, hidden: true, photoUrl: 'https://x', photoId: 'p1' })
  assertEquals(third.subject, '🚩 Photo signalée à Porto (masquée automatiquement)')
  assertMatch(third.text, /Précision : C’est moi/)
  assertMatch(third.text, /RGPD/)
  assertMatch(third.text, /https:\/\/x/)
})

Deno.test('retour : sujet, réponse à l’utilisateur, contexte', () => {
  const m = feedbackMail({ kind: 'bug', message: 'La carte ne charge pas\nsur iPhone', name: 'Léa', email: 'lea@test.fr', page: '/monde', device: 'iPhone' })
  assertEquals(m.subject, '🐞 Bug de Léa : La carte ne charge pas')
  assertEquals(m.replyTo, 'lea@test.fr')
  assertMatch(m.text, /Page : \/monde/)
  const idea = feedbackMail({ kind: 'idee', message: 'x'.repeat(80), name: 'Tom' })
  assertMatch(idea.subject, /^💡 Idée de Tom : x{60}…$/)
})
