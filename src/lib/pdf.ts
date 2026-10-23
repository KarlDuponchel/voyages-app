// pdf.js est lourd : chargé seulement à l'ouverture d'un PDF (puis gardé hors ligne par le service worker).
// Version « legacy » : compatible avec les iPhone qui n'ont pas la toute dernière version d'iOS.
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

/**
 * Dessine chaque page du PDF dans un canvas, à la largeur demandée (en pixels CSS).
 * Renvoie une fonction d'arrêt, à appeler si l'affichage est fermé avant la fin.
 */
export async function renderPdf(blob: Blob, container: HTMLElement, cssWidth: number): Promise<() => void> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
  let stopped = false
  const stop = () => {
    stopped = true
    task.destroy()
  }

  const doc = await task.promise
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  for (let n = 1; n <= doc.numPages && !stopped; n++) {
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${cssWidth}px`
    canvas.setAttribute('aria-label', `Page ${n} sur ${doc.numPages}`)
    container.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) break
    await page.render({ canvasContext: ctx, viewport }).promise
  }
  return stop
}
