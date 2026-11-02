// Charge les villes préparées par preparer.mjs dans la base Supabase en ligne, fichier par fichier.
// Usage : node scripts/lieux/importer.mjs <dossier de sortie de preparer.mjs>
// Utilise la CLI Supabase du projet lié (aucun mot de passe à fournir). Voir docs/lieux.md.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const [DOSSIER] = process.argv.slice(2)
if (!DOSSIER) throw new Error('Usage : node scripts/lieux/importer.mjs <dossier SQL>')

const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.sql')).sort()
const debut = Date.now()
for (const [i, f] of fichiers.entries()) {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--remote', '--yes', '-f', join(DOSSIER, f)], { shell: true, encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(`Échec sur ${f} :\n${r.stderr || r.stdout}`)
    console.error('Relancer la commande : 000-vider.sql repart de tables vides.')
    process.exit(1)
  }
  console.log(`${i + 1}/${fichiers.length} ${f}`)
}
console.log(`Terminé en ${Math.round((Date.now() - debut) / 1000)} s`)
