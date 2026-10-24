/**
 * Adresse de transfert des e-mails : {alias}@{VITE_IMPORT_DOMAIN}.
 * Tant que le domaine d'import n'est pas configuré (.env), la fonction reste cachée dans l'app.
 */
export const IMPORT_DOMAIN: string | undefined = import.meta.env.VITE_IMPORT_DOMAIN || undefined

export function importAddress(alias: string | null): string | null {
  return alias && IMPORT_DOMAIN ? `${alias}@${IMPORT_DOMAIN}` : null
}
