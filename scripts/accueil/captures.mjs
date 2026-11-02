// Captures de l'app (données de démo) pour la page d'accueil, via Chrome sans fenêtre (protocole DevTools).
// Usage : node captures.mjs <dossier de sortie>
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT = process.argv[2]
const BASE = 'http://localhost:5174'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333

const shots = [
  { name: 'app-globe', path: '/monde', vue: 'globe' },
  { name: 'app-carte', path: '/monde', vue: 'carte' },
  { name: 'app-voyage', path: '/voyages/t1' },
  { name: 'app-billet', path: '/voyages/t1/reservations/b1' },
  { name: 'app-souvenirs', path: '/souvenirs' },
  { name: 'app-voyages', path: '/voyages' },
  { name: 'app-stats', path: '/stats' },
]

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'tm-'))}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let target
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250)
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    target = list.find((t) => t.type === 'page')
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, (m) => (m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result)))
    ws.send(JSON.stringify({ id: n, method, params }))
  })

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await send('Page.navigate', { url: BASE + '/monde' })
await sleep(1500)

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 30
const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', exp, role: 'authenticated', aud: 'authenticated' })}.sig`
const session = { access_token: token, refresh_token: 'r', expires_at: exp, expires_in: 2592000, token_type: 'bearer', user: { id: 'u1', email: 'camille@test.local', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } }

for (const shot of shots) {
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('voyages:acces', '2786dac2f071901ded30244346c7d6c055d1071678061e7b2a19fb0ac59e595f');
      localStorage.setItem('voyages:installation', '{"never":true}');
      localStorage.setItem('voyages:vue-monde', ${JSON.stringify(shot.vue ?? 'globe')});
      localStorage.setItem('sb-localhost-auth-token', ${JSON.stringify(JSON.stringify(session))});`,
  })
  await send('Page.navigate', { url: BASE + shot.path })
  await sleep(3500)
  const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 86 })
  writeFileSync(join(OUT, shot.name + '.webp'), Buffer.from(data, 'base64'))
  console.log('ok', shot.name)
}
ws.close()
chrome.kill()
