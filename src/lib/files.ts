import type { BookingFile } from '../data/types'
import { supabase } from './supabase'

/**
 * Fichiers joints aux réservations (PDF de billets, captures), rangés dans le bucket privé « trip-files »
 * sous {trip_id}/{booking_id}/… : la base n'autorise que les membres du voyage à les lire.
 *
 * Une copie est gardée dans le cache du navigateur (Cache Storage) : le billet s'ouvre sans réseau,
 * à l'aéroport ou à l'étranger. Les fichiers des voyages à venir sont copiés à l'avance.
 */

const BUCKET = 'trip-files'
const CACHE_NAME = 'voyages:fichiers:v1'
/** Même limite que le bucket Supabase (20 Mo) */
export const MAX_FILE_BYTES = 20 * 1024 * 1024
/** Types acceptés par le bucket. Safari convertit les photos HEIC en JPEG au moment du choix. */
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
export const FILE_ACCEPT = ALLOWED_TYPES.join(',')

export const isPdf = (f: Pick<BookingFile, 'mimeType' | 'name'>) => f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name)

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}

/** Message d'erreur si le fichier ne peut pas être envoyé, sinon null. */
export function checkFile(file: File): string | null {
  if (file.type && !ALLOWED_TYPES.includes(file.type)) return 'Format non pris en charge : choisissez un PDF ou une image (JPEG, PNG, HEIC, WebP).'
  if (file.size > MAX_FILE_BYTES) return `Fichier trop lourd (${formatSize(file.size)}) : 20 Mo maximum.`
  return null
}

/** « Billet Air France (1).pdf » → « billet-air-france-1.pdf » (les clés de stockage n'aiment pas les accents) */
function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  return `${base || 'fichier'}${ext ? '.' + ext : ''}`
}

export async function uploadBookingFile(tripId: string, bookingId: string, file: File): Promise<void> {
  const problem = checkFile(file)
  if (problem) throw new Error(problem)
  const path = `${tripId}/${bookingId}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`
  const contentType = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/octet-stream')

  const upload = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false })
  if (upload.error) throw upload.error

  const row = await supabase.from('booking_files').insert({
    booking_id: bookingId,
    trip_id: tripId,
    storage_path: path,
    file_name: file.name.slice(0, 200),
    mime_type: contentType,
    size_bytes: file.size,
  })
  if (row.error) {
    // Pas de fichier orphelin dans le stockage si la ligne n'a pas pu être créée
    await supabase.storage.from(BUCKET).remove([path])
    throw row.error
  }
  // Le fichier qu'on vient d'envoyer est déjà disponible hors ligne
  await putInCache(path, file, contentType)
}

/** Supprime des fichiers du stockage (et de la copie locale). Les lignes booking_files suivent la réservation. */
export async function removeStoredFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
  await Promise.all(paths.map(dropFromCache))
}

export async function deleteBookingFile(file: BookingFile): Promise<void> {
  const row = await supabase.from('booking_files').delete().eq('id', file.id)
  if (row.error) throw row.error
  await removeStoredFiles([file.path])
}

// ---- Copie hors ligne ----------------------------------------------------------------

const cacheUrl = (path: string) => `${location.origin}/__fichiers/${encodeURIComponent(path)}`

async function openCache(): Promise<Cache | null> {
  try {
    return 'caches' in window ? await caches.open(CACHE_NAME) : null
  } catch {
    return null // navigation privée, stockage bloqué…
  }
}

async function putInCache(path: string, blob: Blob, contentType = blob.type) {
  const cache = await openCache()
  await cache?.put(cacheUrl(path), new Response(blob, { headers: { 'Content-Type': contentType } })).catch(() => {})
}

async function dropFromCache(path: string) {
  const cache = await openCache()
  await cache?.delete(cacheUrl(path)).catch(() => false)
}

export async function isCached(path: string): Promise<boolean> {
  const cache = await openCache()
  return Boolean(await cache?.match(cacheUrl(path)))
}

/** Contenu du fichier : copie locale d'abord, sinon téléchargement (puis mise en cache). */
export async function getFileBlob(file: BookingFile): Promise<Blob> {
  const cache = await openCache()
  const hit = await cache?.match(cacheUrl(file.path))
  if (hit) return hit.blob()
  const { data, error } = await supabase.storage.from(BUCKET).download(file.path)
  if (error || !data) throw error ?? new Error('Fichier introuvable')
  await putInCache(file.path, data, file.mimeType ?? data.type)
  return data
}

/** Copie à l'avance les fichiers manquants (voyages à venir), sans bloquer ni signaler d'erreur. */
export async function prefetchFiles(files: BookingFile[]): Promise<void> {
  if (!navigator.onLine) return
  for (const f of files) {
    if (await isCached(f.path)) continue
    await getFileBlob(f).catch(() => {})
  }
}

/** À la déconnexion : aucun billet ne doit rester lisible sur le téléphone. */
export async function clearFileCache(): Promise<void> {
  try {
    if ('caches' in window) await caches.delete(CACHE_NAME)
  } catch {
    // rien à effacer
  }
}
