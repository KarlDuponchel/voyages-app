/**
 * Notifications sur le téléphone (Web Push, RFC 8291), envoyées depuis les fonctions serveur.
 *
 * Les clés VAPID identifient l'app auprès des services de notification (Apple, Google, Mozilla) :
 * la clé publique est dans l'app (VITE_VAPID_PUBLIC_KEY), la paire complète dans le secret VAPID_KEYS.
 */
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3'
import type { BookingDraft } from './extract.ts'

export type PushPayload = {
  title: string
  body: string
  /** Page ouverte en touchant la notification */
  url: string
  /** Une notification du même tag remplace la précédente au lieu de s'empiler */
  tag?: string
}

let server: Promise<webpush.ApplicationServer> | null = null

function applicationServer(): Promise<webpush.ApplicationServer> | null {
  const raw = Deno.env.get('VAPID_KEYS')
  if (!raw) return null
  server ??= (async () =>
    webpush.ApplicationServer.new({
      // Adresse de contact demandée par les services de notification en cas de problème
      contactInformation: Deno.env.get('VAPID_CONTACT') || 'https://tripmates.app',
      // Le secret contient la paire de clés en JSON, encodée en base64 (scripts/cles-notifications.ts)
      vapidKeys: await webpush.importVapidKeys(JSON.parse(raw.trim().startsWith('{') ? raw : atob(raw.trim())) as webpush.ExportedVapidKeys),
    }))()
  return server
}

/**
 * Envoie la notification à tous les appareils de l'utilisateur. Ne lève jamais d'erreur :
 * une notification manquée ne doit pas faire échouer l'import. Les abonnements expirés sont supprimés.
 */
export async function notifyUser(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  const app = applicationServer()
  if (!app) return 0 // notifications pas encore configurées
  try {
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
    let sent = 0
    for (const s of subs ?? []) {
      try {
        const subscriber = (await app).subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
        await subscriber.pushTextMessage(JSON.stringify(payload), { ttl: 24 * 3600, urgency: webpush.Urgency.High, topic: payload.tag })
        sent++
      } catch (e) {
        if (e instanceof webpush.PushMessageError && e.isGone()) await admin.from('push_subscriptions').delete().eq('id', s.id)
        else console.error('notification', e instanceof Error ? e.message : String(e))
      }
    }
    return sent
  } catch (e) {
    console.error('notifications', e instanceof Error ? e.message : String(e))
    return 0
  }
}

/** Texte de la notification après l'analyse d'un e-mail transféré */
export function importNotification(subject: string, drafts: BookingDraft[], failed: boolean): PushPayload {
  const titleOf = (d: BookingDraft) => d.title
  if (failed || drafts.length === 0)
    return {
      title: 'E-mail analysé : rien trouvé',
      body: subject ? `Aucune réservation dans « ${subject} ».` : 'Aucune réservation trouvée dans cet e-mail.',
      url: '/imports',
      tag: 'import',
    }
  const first = drafts.slice(0, 2).map(titleOf).join(', ')
  const more = drafts.length > 2 ? ` et ${drafts.length - 2} autre${drafts.length > 3 ? 's' : ''}` : ''
  return {
    title: drafts.length === 1 ? 'Nouvelle réservation à valider' : `${drafts.length} réservations à valider`,
    body: `${first}${more}. Touchez pour vérifier et ajouter.`,
    url: '/imports',
    tag: 'import',
  }
}
