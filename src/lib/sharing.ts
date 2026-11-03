import { supabase } from './supabase'

/**
 * Partage public des photos (migration 20261102100000_partage.sql) : une photo reste privée tant que
 * son auteur ne la publie pas. Publiée, elle est visible de tous les utilisateurs connectés, avec la
 * ville choisie, le mois de prise de vue et le prénom de l'auteur — jamais le voyage ni ses voyageurs.
 */

export type PhotoShare = {
  city: string
  destinationId?: string
  caption?: string
  /** Masquée par la modération (après signalements) */
  hidden: boolean
}

export async function publishPhoto(photoId: string, destinationId: string, caption?: string): Promise<void> {
  const { error } = await supabase.rpc('publish_photo', { p_photo: photoId, p_destination: destinationId, p_caption: caption?.trim() || undefined })
  if (error) throw error
}

/** Dépublier : l'auteur, ou le propriétaire du voyage ; les réactions partent avec */
export async function unpublishPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.from('photo_shares').delete().eq('photo_id', photoId)
  if (error) throw error
}

export const REPORT_REASONS = [
  { value: 'inapproprie', label: 'Contenu choquant ou inapproprié' },
  { value: 'personne', label: 'On me reconnaît, je n’ai pas donné mon accord' },
  { value: 'droits', label: 'Ce n’est pas sa photo' },
  { value: 'spam', label: 'Publicité ou spam' },
  { value: 'autre', label: 'Autre raison' },
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]['value']

/** Une fois par personne ; à 3 signalements, la photo est masquée en attendant une décision */
export async function reportPhoto(photoId: string, reason: ReportReason, details?: string): Promise<void> {
  const { error } = await supabase.from('photo_reports').insert({ photo_id: photoId, reason, details: details?.trim() || null })
  if (error?.code === '23505') return // déjà signalée par moi : rien à faire
  if (error) throw error
  // L'équipe est prévenue par e-mail ; un échec ici ne doit pas annuler le signalement
  supabase.functions.invoke('notify-report', { body: { photoId } }).catch(() => {})
}

/** On ne voit plus ses photos, et il ne voit plus les nôtres */
export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: userId })
  if (error && error.code !== '23505') throw error
}
