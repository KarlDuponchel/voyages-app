import { useEffect, useState } from 'react'
import { dropFromCache, getCachedBlob, putInCache } from './files'
import { isVideoFile, MediaError, preparePhoto, prepareVideo } from './media'
import { supabase } from './supabase'

/**
 * Photos et vidéos des voyages : bucket privé « trip-photos », chemins {trip_id}/{photo_id}/…
 * (seuls les membres du voyage peuvent les lire, voir la migration 20261028100000_photos.sql).
 * Les miniatures, et les photos déjà ouvertes, restent sur le téléphone pour l'affichage hors ligne.
 */

const BUCKET = 'trip-photos'

export type TripPhoto = {
  id: string
  kind: 'photo' | 'video'
  path: string
  thumbPath: string
  mimeType: string
  width?: number
  height?: number
  durationSeconds?: number
  size: number
  /** Date de prise de vue, sinon d'envoi (ISO) */
  date: string
  uploadedBy?: string
  caption?: string
}

type Row = {
  id: string
  kind: 'photo' | 'video'
  path: string
  thumb_path: string
  mime_type: string
  width: number | null
  height: number | null
  duration_seconds: number | null
  size_bytes: number
  taken_at: string | null
  created_at: string
  uploaded_by: string | null
  caption: string | null
}

const toPhoto = (r: Row): TripPhoto => ({
  id: r.id,
  kind: r.kind,
  path: r.path,
  thumbPath: r.thumb_path,
  mimeType: r.mime_type,
  width: r.width ?? undefined,
  height: r.height ?? undefined,
  durationSeconds: r.duration_seconds ?? undefined,
  size: r.size_bytes,
  date: r.taken_at ?? r.created_at,
  uploadedBy: r.uploaded_by ?? undefined,
  caption: r.caption ?? undefined,
})

export async function listPhotos(tripId: string): Promise<TripPhoto[]> {
  const { data, error } = await supabase
    .from('trip_photos')
    .select('id, kind, path, thumb_path, mime_type, width, height, duration_seconds, size_bytes, taken_at, created_at, uploaded_by, caption')
    .eq('trip_id', tripId)
  if (error) throw error
  return ((data ?? []) as Row[]).map(toPhoto).sort((a, b) => a.date.localeCompare(b.date))
}

export type UploadStep = 'preparation' | 'envoi'

/** Prépare (compresse) puis envoie une photo ou une vidéo ; les fichiers d'abord, la ligne ensuite */
export async function uploadMedia(tripId: string, file: File, onStep: (step: UploadStep, progress?: number) => void): Promise<void> {
  onStep('preparation')
  const prepared = isVideoFile(file) ? await prepareVideo(file, (p) => onStep('preparation', p)) : await preparePhoto(file)
  const id = crypto.randomUUID()
  const ext = prepared.kind === 'video' ? (prepared.mimeType === 'video/quicktime' ? 'mov' : 'mp4') : 'jpg'
  const path = `${tripId}/${id}/original.${ext}`
  const thumbPath = `${tripId}/${id}/miniature.jpg`

  onStep('envoi')
  const up1 = await supabase.storage.from(BUCKET).upload(thumbPath, prepared.thumb, { contentType: 'image/jpeg' })
  if (up1.error) throw up1.error
  const up2 = await supabase.storage.from(BUCKET).upload(path, prepared.full, { contentType: prepared.mimeType })
  if (up2.error) {
    await supabase.storage.from(BUCKET).remove([thumbPath])
    throw up2.error
  }
  const { data: auth } = await supabase.auth.getUser()
  const row = await supabase.from('trip_photos').insert({
    id,
    trip_id: tripId,
    uploaded_by: auth.user?.id,
    kind: prepared.kind,
    path,
    thumb_path: thumbPath,
    mime_type: prepared.mimeType,
    width: prepared.width,
    height: prepared.height,
    duration_seconds: prepared.durationSeconds ?? null,
    size_bytes: prepared.full.size + prepared.thumb.size,
    taken_at: prepared.takenAt ?? null,
  })
  if (row.error) {
    await supabase.storage.from(BUCKET).remove([path, thumbPath])
    throw row.error
  }
  // Déjà sur le téléphone : la miniature s'affiche tout de suite, même hors ligne
  await putInCache(thumbPath, prepared.thumb, 'image/jpeg')
  if (prepared.kind === 'photo') await putInCache(path, prepared.full, 'image/jpeg')
}

/** Message lisible pour une erreur d'envoi */
export function uploadError(e: unknown): string {
  if (e instanceof MediaError) return e.message
  if (!navigator.onLine) return 'Pas de connexion.'
  return e instanceof Error ? e.message : 'Envoi impossible.'
}

/** Fichiers d'abord (la règle d'accès a besoin de la ligne), puis la ligne */
export async function deletePhoto(photo: TripPhoto): Promise<void> {
  const files = await supabase.storage.from(BUCKET).remove([photo.path, photo.thumbPath])
  if (files.error) throw files.error
  const row = await supabase.from('trip_photos').delete().eq('id', photo.id)
  if (row.error) throw row.error
  await Promise.all([dropFromCache(photo.path), dropFromCache(photo.thumbPath)])
}

/** Fichiers des photos d'un voyage, à supprimer avec lui */
export async function removeTripPhotos(tripId: string): Promise<void> {
  const { data } = await supabase.from('trip_photos').select('path, thumb_path').eq('trip_id', tripId)
  const paths = (data ?? []).flatMap((p) => [p.path, p.thumb_path])
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
  await Promise.all(paths.map(dropFromCache))
}

export async function setCover(tripId: string, photoId: string | null): Promise<void> {
  const { error } = await supabase.from('trips').update({ cover_photo_id: photoId }).eq('id', tripId)
  if (error) throw error
}

/** Adresse temporaire pour lire une vidéo en streaming (pas copiée sur le téléphone : trop lourde) */
export async function videoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) throw error ?? new Error('Vidéo introuvable')
  return data.signedUrl
}

/**
 * Adresse affichable d'une image stockée (miniature ou photo), via la copie locale.
 * Renvoie null tant qu'elle charge ou si elle est introuvable.
 */
export function usePhotoUrl(path: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
    let objectUrl: string | null = null
    let cancelled = false
    getCachedBlob(BUCKET, path, 'image/jpeg')
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setUrl(null))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [path])
  return url
}
