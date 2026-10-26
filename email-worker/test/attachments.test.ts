// Tests du tri des pièces jointes du relais. Lancer : npm test (dans email-worker)
// Un vrai PDF peut être passé avec la variable PDF_DE_TEST ; sinon, un petit PDF factice est utilisé.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import PostalMime from 'postal-mime'
import { collectAttachments, readableType } from '../src/attachments.ts'

const pdf = process.env.PDF_DE_TEST ? readFileSync(process.env.PDF_DE_TEST) : Buffer.from('%PDF-1.4\n% faux billet\n')
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/(.{76})/g, '$1\r\n')

const mime = (parts: string[], boundary = 'XYZ') =>
  [
    'From: Karl <karl@example.fr>',
    'To: ab12cd34ef56@tripmates.app',
    'Subject: Fwd: Vos documents de voyage',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Début du message réexpédié',
    ...parts.flatMap((p) => [`--${boundary}`, p]),
    `--${boundary}--`,
    '',
  ].join('\r\n')

const attachment = (type: string, name: string, content: Buffer = pdf) =>
  [`Content-Type: ${type}; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`, 'Content-Transfer-Encoding: base64', '', b64(content)].join('\r\n')

const parse = (raw: string) => PostalMime.parse(raw, { attachmentEncoding: 'base64' })

test('un PDF déclaré « application/octet-stream » est reconnu et transmis', async () => {
  const { attachments, skipped } = await collectAttachments(await parse(mime([attachment('application/octet-stream', 'Documents-de-voyage.pdf')])))
  assert.equal(attachments.length, 1, skipped.join(' ; '))
  assert.equal(attachments[0].mimeType, 'application/pdf')
})

test('un PDF sans extension ni bon type est reconnu à son contenu', async () => {
  const { attachments } = await collectAttachments(await parse(mime([attachment('application/octet-stream', 'document')])))
  assert.equal(attachments[0]?.mimeType, 'application/pdf')
})

test("un e-mail transféré en pièce jointe est ouvert : son texte et son PDF sont récupérés", async () => {
  const inner = mime([attachment('application/pdf', 'bon-echange.pdf')], 'INNER').replace('Subject: Fwd: Vos documents de voyage', 'Subject: Vos documents de voyage 26YW95ME')
  const outer = mime([['Content-Type: message/rfc822', 'Content-Disposition: attachment; filename="original.eml"', '', inner].join('\r\n')])
  const { attachments, forwardedText } = await collectAttachments(await parse(outer))
  assert.equal(attachments.length, 1)
  assert.equal(attachments[0].filename, 'bon-echange.pdf')
  assert.match(forwardedText[0], /26YW95ME/)
})

test('les formats illisibles sont écartés, avec la raison', async () => {
  const { attachments, skipped } = await collectAttachments(await parse(mime([attachment('application/zip', 'archive.zip', Buffer.from('PK\x03\x04 pas un PDF'))])))
  assert.equal(attachments.length, 0)
  assert.match(skipped[0], /archive\.zip/)
  assert.equal(readableType({ mimeType: 'image/jpg', filename: null, content: '' }), 'image/jpeg')
})
