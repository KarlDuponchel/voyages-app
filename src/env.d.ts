interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** Domaine qui reçoit les e-mails transférés (ex. import.mondomaine.fr) ; vide = import par e-mail caché */
  readonly VITE_IMPORT_DOMAIN?: string
  /** Clé publique VAPID des notifications ; vide = notifications cachées dans l'app */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
