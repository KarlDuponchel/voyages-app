import { supabase } from './supabase'

/**
 * Explorer : les photos publiques des autres voyageurs, par ville, et leurs réactions.
 * Pas de copie sur le téléphone (contrairement aux photos de ses voyages) : des adresses signées
 * d'une heure, demandées en une fois pour toute une page.
 */

const BUCKET = 'trip-photos'

export const REACTIONS = [
  { kind: 'jaime', emoji: '❤️', label: 'J’aime' },
  { kind: 'jadore', emoji: '😍', label: 'J’adore' },
  { kind: 'waouh', emoji: '🤩', label: 'Waouh' },
  { kind: 'wishlist', emoji: '🧳', label: 'Wishlist' },
] as const
export type ReactionKind = (typeof REACTIONS)[number]['kind']

export type PublicPhoto = {
  id: string
  kind: 'photo' | 'video'
  path: string
  thumbPath: string
  thumbUrl?: string
  width?: number
  height?: number
  durationSeconds?: number
  /** Premier jour du mois de prise de vue (AAAA-MM-JJ) */
  month: string
  city: string
  countryId: string
  caption?: string
  publishedAt: string
  author: { id: string; name: string }
  reactions: Partial<Record<ReactionKind, number>>
  mine?: ReactionKind
}

export type PublicPlace = { city: string; countryId: string; lat: number; lng: number; count: number; coverThumbPath?: string }

export const PAGE = 30

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  if (error) throw error
  return Object.fromEntries((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])))
}

export async function listPublicPhotos(filter: { city?: string; countryId?: string; before?: string; wishlist?: boolean }): Promise<PublicPhoto[]> {
  const { data, error } = await supabase.rpc('public_photos', {
    p_city: filter.city,
    p_country: filter.countryId,
    p_before: filter.before,
    p_wishlist: filter.wishlist,
    p_limit: PAGE,
  })
  if (error) throw error
  const rows = data ?? []
  const urls = await signedUrls(rows.map((r) => r.thumb_path))
  return rows.map((r) => ({
    id: r.photo_id,
    kind: r.kind as 'photo' | 'video',
    path: r.path,
    thumbPath: r.thumb_path,
    thumbUrl: urls[r.thumb_path],
    width: r.width ?? undefined,
    height: r.height ?? undefined,
    durationSeconds: r.duration_seconds ?? undefined,
    month: r.taken_month,
    city: r.city,
    countryId: r.country_code,
    caption: r.caption ?? undefined,
    publishedAt: r.published_at,
    author: { id: r.author_id, name: r.author_name },
    reactions: (r.reactions ?? {}) as PublicPhoto['reactions'],
    mine: (r.my_reaction ?? undefined) as ReactionKind | undefined,
  }))
}

export async function listPublicPlaces(): Promise<PublicPlace[]> {
  const { data, error } = await supabase.rpc('public_places')
  if (error) throw error
  return (data ?? []).map((p) => ({
    city: p.city,
    countryId: p.country_code,
    lat: p.lat,
    lng: p.lng,
    count: Number(p.photo_count),
    coverThumbPath: p.cover_thumb_path ?? undefined,
  }))
}

/** Une réaction par personne : la même la retire, une autre la remplace */
export async function setReaction(photoId: string, kind: ReactionKind | null): Promise<void> {
  const { error } = await supabase.rpc('react_to_photo', { p_photo: photoId, p_kind: kind })
  if (error) throw error
}

/** Nouvel état local d'une photo après un appui sur une réaction (avant la réponse du serveur) */
export function toggled(photo: PublicPhoto, kind: ReactionKind): PublicPhoto {
  const next = photo.mine === kind ? undefined : kind
  const reactions = { ...photo.reactions }
  if (photo.mine) reactions[photo.mine] = Math.max((reactions[photo.mine] ?? 1) - 1, 0)
  if (next) reactions[next] = (reactions[next] ?? 0) + 1
  return { ...photo, mine: next, reactions }
}

export const monthLabel = (month: string) => new Date(`${month.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
