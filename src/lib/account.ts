import { supabase } from './supabase'

/**
 * Export de ses données (RGPD, fonction export-data) : un fichier JSON, partagé sur téléphone
 * (Enregistrer dans Fichiers, Mail…) ou téléchargé sur ordinateur.
 */
export async function downloadMyData(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<unknown>('export-data', { method: 'POST' })
  if (error) {
    const context = (error as { context?: Response }).context
    const res = context ? await context.json().catch(() => null) : null
    throw new Error(res?.error ?? 'L’export de vos données a échoué. Réessayez dans un moment.')
  }
  const name = `tripmates-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([JSON.stringify(data, null, 2)], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Mes données Tripmates' }).catch(() => {})
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
