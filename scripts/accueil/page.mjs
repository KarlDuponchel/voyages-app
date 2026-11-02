// Capture d'une page : node page.mjs <url> <largeur> <hauteur> <fichier> [pleine page: 1] [format: jpeg|webp|png] [échelle]
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, w, h, out, full = '0', format = 'jpeg', scale = '1'] = process.argv.slice(2)
const PORT = 9334
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'tm-'))}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250)
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page')
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id))
})
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const n = ++id
    pending.set(n, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)))
    ws.send(JSON.stringify({ id: n, method, params }))
  })
const width = Number(w)
await send('Emulation.setDeviceMetricsOverride', { width, height: Number(h), deviceScaleFactor: Number(scale), mobile: width < 768 })
await send('Page.navigate', { url })
await sleep(2000)
// Fait défiler la page pour charger les images différées
await send('Runtime.evaluate', { expression: `(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) } scrollTo(0, 0) })()`, awaitPromise: true })
await sleep(1500)
let clip
if (full === '1') {
  const { result } = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })
  clip = { x: 0, y: 0, width, height: result.value, scale: 1 }
}
const { data } = await send('Page.captureScreenshot', { format, quality: format === 'png' ? undefined : 85, captureBeyondViewport: !!clip, clip })
writeFileSync(out, Buffer.from(data, 'base64'))
console.log('ok', out)
ws.close()
chrome.kill()
