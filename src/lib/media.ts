/**
 * Préparation des photos et vidéos sur le téléphone, avant l'envoi.
 *
 * - Photos : redimensionnées (2 048 px au plus) et réenregistrées en JPEG, ce qui efface aussi toutes
 *   les métadonnées, dont le lieu (GPS). Seule la date de prise de vue est lue avant, pour ranger par jour.
 * - Vidéos : recompressées en 720p H.264 (environ 16 Mo par minute) avec Mediabunny, chargé seulement
 *   quand on choisit une vidéo. 30 Mo au plus après compression.
 * - Chaque élément a une miniature JPEG légère pour les grilles.
 */

export const MAX_VIDEO_BYTES = 30 * 1024 * 1024
/** Au-delà, la compression sur le téléphone serait trop longue et dépasserait de toute façon 30 Mo */
export const MAX_VIDEO_SECONDS = 180
const FULL_SIZE = 2048
const THUMB_SIZE = 480
const VIDEO_SIZE = 1280
const VIDEO_BITRATE = 2_000_000

export type Prepared = {
  kind: 'photo' | 'video'
  full: Blob
  thumb: Blob
  mimeType: string
  width: number
  height: number
  durationSeconds?: number
  takenAt?: string
}

export class MediaError extends Error {}

export const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(f.name)

/** Dimensions réduites pour que le plus grand côté ne dépasse pas `max` (nombres pairs pour la vidéo) */
function fit(width: number, height: number, max: number, even = false) {
  const scale = Math.min(1, max / Math.max(width, height))
  const round = (v: number) => (even ? Math.max(2, Math.round((v * scale) / 2) * 2) : Math.max(1, Math.round(v * scale)))
  return { width: round(width), height: round(height) }
}

function toJpeg(source: CanvasImageSource, width: number, height: number, max: number, quality: number): Promise<Blob> {
  const size = fit(width, height, max)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new MediaError('Impossible de préparer l’image.')
  ctx.drawImage(source, 0, 0, size.width, size.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new MediaError('Impossible de compresser l’image.'))), 'image/jpeg', quality),
  )
}

/** Date de prise de vue lue dans les métadonnées de la photo (avant qu'elles soient effacées) */
async function readTakenAt(file: File): Promise<string | undefined> {
  try {
    const exifr = (await import('exifr')).default
    const data = (await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined
    const date = data?.DateTimeOriginal ?? data?.CreateDate
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined
  } catch {
    return undefined
  }
}

/** Décode une image en respectant son orientation (les navigateurs appliquent l'EXIF aux <img>) */
async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new MediaError('Ce format d’image ne peut pas être lu sur cet appareil.')
  } finally {
    // L'image décodée reste utilisable après la révocation
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export async function preparePhoto(file: File): Promise<Prepared> {
  const takenAt = await readTakenAt(file)
  const img = await loadImage(file)
  const { naturalWidth: w, naturalHeight: h } = img
  const full = await toJpeg(img, w, h, FULL_SIZE, 0.82)
  const thumb = await toJpeg(img, w, h, THUMB_SIZE, 0.72)
  const size = fit(w, h, FULL_SIZE)
  return { kind: 'photo', full, thumb, mimeType: 'image/jpeg', ...size, takenAt }
}

/** Durée, dimensions et image d'aperçu d'une vidéo, via un élément <video> */
async function probeVideo(file: Blob): Promise<{ duration: number; width: number; height: number; poster: Blob }> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new MediaError('Cette vidéo ne peut pas être lue sur cet appareil.'))
      video.load()
    })
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    // Aperçu pris un peu après le début (la première image est souvent noire)
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      video.currentTime = Math.min(1, duration / 2)
    })
    const poster = await toJpeg(video, video.videoWidth, video.videoHeight, THUMB_SIZE, 0.72)
    return { duration, width: video.videoWidth, height: video.videoHeight, poster }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/** Recompresse en 720p ; renvoie null si le téléphone ne sait pas le faire (ou si le son serait perdu) */
async function compressVideo(file: File, onProgress: (p: number) => void): Promise<Blob | null> {
  try {
    const mb = await import('mediabunny')
    if (!(await mb.canEncodeVideo('avc'))) return null
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS })
    const track = await input.getPrimaryVideoTrack()
    if (!track) return null
    const size = fit(track.displayWidth, track.displayHeight, VIDEO_SIZE, true)
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: { ...size, fit: 'contain', codec: 'avc', bitrate: VIDEO_BITRATE },
      // Son recopié tel quel (AAC sur iPhone) : tous les navigateurs ne savent pas l'encoder
      audio: {},
    })
    // Une piste abandonnée (souvent le son) : on préfère garder l'original s'il est assez léger
    if (!conversion.isValid || conversion.discardedTracks.length > 0) return null
    conversion.onProgress = (p) => onProgress(p)
    await conversion.execute()
    const buffer = output.target.buffer
    return buffer ? new Blob([buffer], { type: 'video/mp4' }) : null
  } catch {
    return null
  }
}

export async function prepareVideo(file: File, onProgress: (p: number) => void = () => {}): Promise<Prepared> {
  const probe = await probeVideo(file)
  if (probe.duration > MAX_VIDEO_SECONDS)
    throw new MediaError(`Vidéo trop longue (${Math.round(probe.duration / 60)} min) : 3 minutes au plus. Raccourcissez-la dans Photos avant de l'ajouter.`)

  const compressed = await compressVideo(file, onProgress)
  const full = compressed ?? file
  if (full.size > MAX_VIDEO_BYTES)
    throw new MediaError(
      compressed
        ? `Vidéo trop lourde même compressée (${Math.round(full.size / 1024 / 1024)} Mo) : 30 Mo au plus. Raccourcissez-la.`
        : `Vidéo trop lourde (${Math.round(full.size / 1024 / 1024)} Mo) et ce téléphone ne sait pas la compresser : 30 Mo au plus.`,
    )
  const mimeType = compressed ? 'video/mp4' : file.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4'
  const size = compressed ? fit(probe.width, probe.height, VIDEO_SIZE, true) : { width: probe.width, height: probe.height }
  return {
    kind: 'video',
    full,
    thumb: probe.poster,
    mimeType,
    ...size,
    durationSeconds: Math.round(probe.duration * 100) / 100,
    takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
  }
}
