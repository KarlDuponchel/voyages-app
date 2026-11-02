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
