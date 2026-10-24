# Import automatique par l'IA

L'import se fait de deux façons :

- **A. Lire un billet.** On ajoute une réservation avec un PDF ou une capture, Claude le lit et le formulaire se remplit tout seul.
- **B. Transférer un e-mail.** On transfère une confirmation à son adresse d'import, Claude la lit, et les réservations attendent dans « E-mails à valider ».

**Rien n'est enregistré sans validation :** l'IA propose, l'utilisateur vérifie, corrige si besoin, puis ajoute.

## Comment ça marche

```
A.  App ──(fichier en base64 + session)──▶ fonction extract-booking ──▶ Claude
        ◀────────── réservations proposées ──────────┘

B.  E-mail transféré ──▶ Cloudflare Email Routing ──▶ relais email-worker
        ──(JSON + secret partagé)──▶ fonction inbound-email ──▶ Claude
        ──▶ table pending_imports (+ pièces jointes, bucket « imports »)
    App ──▶ « E-mails à valider » ──▶ réservations ajoutées au voyage choisi
```

| Élément | Où | Rôle |
|---|---|---|
| `supabase/functions/_shared/extract.ts` | Supabase | Appel à Claude, consignes, schéma de la réponse, contrôle des dates et heures |
| `supabase/functions/extract-booking/` | Supabase | A : vérifie la session et le droit de modifier le voyage, applique la limite quotidienne, lit le fichier |
| `supabase/functions/inbound-email/` | Supabase | B : vérifie le secret, l'alias et l'expéditeur, garde les pièces jointes, lit l'e-mail, propose le voyage |
| `email-worker/` | Cloudflare | Reçoit les e-mails du domaine d'import, les décode et les transmet. Ne garde rien |
| `supabase/migrations/20261024100000_import_ia.sql` | Base | Tables `ai_usage`, `import_addresses`, `pending_imports` et bucket `imports` |
| `src/lib/ai.ts`, `src/screens/Imports.tsx` | App | Appel de la lecture (A), écran de validation (B) |

### Sécurité et coûts

- **Clé Anthropic** : elle n'existe que dans les secrets Supabase, jamais dans l'app ni sur GitHub.
- **Limite quotidienne** : 40 lectures par personne sur 24 h, réglable avec le secret `AI_DAILY_LIMIT`. Chaque lecture est comptée dans `ai_usage`, avec les tokens consommés.
- **Partie A** : seuls les propriétaires et participants du voyage peuvent faire lire un billet. La fonction vérifie avec les droits de l'utilisateur.
- **Partie B** : un e-mail n'est accepté que si trois conditions sont réunies. Il passe par le relais, qui connaît le secret partagé. Il est adressé à un alias existant. Et il est **envoyé depuis l'adresse du compte** : on transfère soi-même ses confirmations. Les autres e-mails sont ignorés sans réponse.
- **Les adresses d'import restent privées** : elles sont rangées dans une table que seul leur titulaire peut lire. Les compagnons de voyage, qui voient le profil, ne voient pas l'adresse. Une nouvelle adresse peut être générée depuis le profil.
- **Les documents sont traités comme des données** : la consigne donnée à Claude lui interdit de suivre les instructions qu'un e-mail contiendrait. Et rien n'est enregistré sans validation.
- **Modèle** : `claude-opus-5-5` par défaut, avec `effort: medium` et le repli automatique en cas de refus (`fallbacks: "default"`). Le modèle se change avec le secret `EXTRACT_MODEL`, par exemple `claude-haiku-5-5`, environ 40 fois moins cher (le repli n'existe pas pour Haiku).
- **Coût estimé avec Opus 5.5** : environ 0,05 à 0,10 $ par billet d'une ou deux pages. C'est une estimation : le coût exact dépend du document, et il se lit dans `ai_usage` et sur console.anthropic.com.
- **RGPD** : le contenu des billets (noms, références) est envoyé à Anthropic, qui devient sous-traitant. Par défaut, Anthropic n'utilise pas les données de l'API pour entraîner ses modèles. Il faudra le mentionner dans la politique de confidentialité avant l'ouverture au public.

## Mise en route, partie A : lecture des billets

**1. Créer une clé API Anthropic**
- Sur [console.anthropic.com](https://console.anthropic.com), crée ton compte si besoin, puis ajoute un moyen de paiement dans **Billing**.
- Fixe une **limite de dépense mensuelle** dans **Billing → Limits**, par exemple 10 $. C'est un filet de sécurité.
- Crée une clé dans **API Keys**. Copie-la, mais ne la colle nulle part ailleurs que dans Supabase (étape 4).

**2. Appliquer la migration** (depuis le dossier du projet)
```bash
npx supabase db push
```

**3. Régénérer les types de la base**
```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/data/database.types.ts
```

**4. Enregistrer la clé dans Supabase**
- Dans le tableau de bord Supabase, ouvre **Edge Functions → Secrets** (selon la version du tableau de bord : **Project Settings → Edge Functions**).
- Ajoute `ANTHROPIC_API_KEY` avec la clé.
- Passe par le tableau de bord plutôt que par une commande : ainsi, la clé ne reste pas dans l'historique du terminal.
- Facultatif : ajoute aussi `AI_DAILY_LIMIT` (40 par défaut) et `EXTRACT_MODEL` (`claude-opus-5-5` par défaut).

**5. Déployer la fonction**
```bash
npx supabase functions deploy extract-booking
```

**6. Mettre l'app en ligne** (fusion dans `main`, puis Vercel), puis tester. Dans un voyage : **Ajouter → Avec le billet (PDF ou capture)**.

## Mise en route, partie B : e-mails transférés

**1. Un domaine sur Cloudflare** : `tripmates.app`, acheté le 24/10 chez Cloudflare Registrar. Cloudflare Email Routing, gratuit, ne fonctionne qu'avec un domaine dont le DNS est géré par Cloudflare. Deux possibilités :
- **Recommandé : un domaine dédié à l'app**, acheté chez Cloudflare Registrar (environ 10 € par an). Il servira aussi pour l'ouverture au public.
- **Ou `karlduponchel.fr` déplacé chez Cloudflare.** Il faut recopier tous les enregistrements DNS existants, en particulier ceux qui servent à l'envoi des e-mails `noreply@` (SPF, DKIM). L'import utilisera seulement un sous-domaine, sans toucher à la réception des e-mails du domaine principal.

**2. Activer Email Routing sur un sous-domaine.**
- Dans Cloudflare, ouvre **Email → Email Routing** et active-le pour `import.<ton-domaine>`.
- Cloudflare ajoute lui-même les enregistrements MX et TXT de ce sous-domaine.

**3. Créer un secret partagé** entre le relais et Supabase, par exemple dans PowerShell :
```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

**4. Enregistrer ce secret dans Supabase.** Dans **Edge Functions → Secrets**, ajoute `INBOUND_SECRET` avec la valeur générée.

**5. Déployer la fonction**
```bash
npx supabase functions deploy inbound-email
```

**6. Déployer le relais** (depuis le dossier `email-worker`). `wrangler login` ouvre le navigateur pour te connecter à Cloudflare, et `secret put` demande le secret : colle la même valeur qu'à l'étape 4.
```bash
cd email-worker
npm install
npx wrangler login
npx wrangler deploy
npx wrangler secret put INBOUND_SECRET
```

**7. Brancher le relais.** Dans Cloudflare, ouvre **Email Routing → Routing rules → Catch-all address** du sous-domaine. Choisis l'action **Send to a Worker**, puis `voyages-email`, et active la règle.

**8. Afficher l'adresse dans l'app.**
- Ajoute la ligne `VITE_IMPORT_DOMAIN=import.<ton-domaine>` dans `.env`, puis mets l'app en ligne.
- Tant que cette ligne n'existe pas, la fonction est cachée dans l'app.

**9. Tester.**
- Dans **Profil → Import par e-mail**, copie ton adresse.
- Transfère une confirmation **depuis l'adresse de ton compte**.
- Au bout de quelques secondes, elle apparaît dans **Voyages → E-mails à valider**.

## En cas de problème

- **Journaux des fonctions** : dans le tableau de bord Supabase, **Edge Functions → (la fonction) → Logs**.
- **Journaux du relais** : dans le dossier `email-worker`, lance la commande ci-dessous, puis transfère un e-mail.
  ```bash
  npx wrangler tail
  ```
- **« La lecture par l'IA n'est pas encore configurée »** : la clé `ANTHROPIC_API_KEY` manque dans les secrets.
- **Rien n'arrive dans « E-mails à valider »** : vérifie que l'e-mail part bien de l'adresse du compte, que les deux `INBOUND_SECRET` sont identiques, et que la règle catch-all est active.

## Tests

```bash
npm run test:db
```
Ces tests vérifient la sécurité des nouvelles tables : chacun ne voit que ses imports et son adresse, personne ne peut écrire à la place des fonctions, et une personne non connectée n'a accès à rien.

```bash
npm run test:functions
```
Ces tests vérifient la logique serveur (contrôle des réponses de l'IA, requête envoyée, e-mails, voyage proposé) avec un faux client : aucun appel facturé.
