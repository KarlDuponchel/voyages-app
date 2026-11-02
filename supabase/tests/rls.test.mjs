import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'

/**
 * Vérifie les règles de sécurité (RLS) dans un Postgres embarqué, sans compte Supabase.
 * Lancer : npm run test:db
 */
const db = new PGlite()
const dir = new URL('../migrations/', import.meta.url)
const migration = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n')

// Imitation minimale de l'environnement Supabase
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant execute on all functions in schema auth to anon, authenticated;
  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated;
`)
await db.exec(migration)

const U = {
  karl: '11111111-1111-1111-1111-111111111111',
  lea: '22222222-2222-2222-2222-222222222222',
  inconnu: '33333333-3333-3333-3333-333333333333',
}
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${U.karl}', 'karl@example.com', '{"display_name":"Karl"}'),
  ('${U.lea}', 'lea@example.com', '{}'),
  ('${U.inconnu}', 'x@example.com', '{}')`)

let failures = 0
async function as(user, sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[user]}', false);
    select set_config('request.jwt.claims', '{"email":"${user}@example.com"}', false); set role authenticated;`)
  try {
    return (await db.query(sql)).rows
  } finally {
    await db.exec('reset role')
  }
}
async function ok(label, fn) {
  try {
    const r = await fn()
    console.log('✔', label, r === undefined ? '' : JSON.stringify(r))
  } catch (e) {
    failures++
    console.log('✘', label, '→', e.message)
  }
}
async function denied(label, fn, match) {
  try {
    const r = await fn()
    failures++
    console.log('✘', label, '→ aurait dû être refusé, résultat :', JSON.stringify(r))
  } catch (e) {
    if (match && !e.message.includes(match)) {
      failures++
      console.log('✘', label, '→ mauvaise erreur :', e.message)
    } else console.log('✔', label, '(refusé :', e.message + ')')
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

await ok('profils créés automatiquement', async () => (await db.query('select display_name from public.profiles order by id')).rows.map((r) => r.display_name))

let trip
await ok('Karl crée un voyage (avec RETURNING)', async () => {
  ;[trip] = await as('karl', `insert into public.trips (title, start_date, end_date) values ('Lisbonne', '2025-05-01', '2025-05-08') returning id`)
  trip = trip.id
})
await ok('Karl est propriétaire', async () => {
  const r = await as('karl', `select role from public.trip_members where trip_id = '${trip}'`)
  expect(r[0]?.role === 'owner', JSON.stringify(r))
})
await ok('Karl ajoute une étape et une réservation', async () => {
  await as('karl', `insert into public.trip_destinations (trip_id, city, country_code, lat, lng) values ('${trip}', 'Lisbonne', '620', 38.72, -9.14)`)
  await as('karl', `insert into public.bookings (trip_id, kind, title, starts_at, ticket) values ('${trip}', 'vol', 'CDG → LIS', '2025-05-01 07:15', '{"carrier":"TAP"}')`)
})
await ok('un inconnu ne voit rien', async () => {
  const t = await as('inconnu', 'select * from public.trips')
  const b = await as('inconnu', 'select * from public.bookings')
  const m = await as('inconnu', 'select * from public.trip_members')
  expect(t.length + b.length + m.length === 0, 'fuite')
})
await denied("un inconnu ne peut pas ajouter de réservation", () =>
  as('inconnu', `insert into public.bookings (trip_id, kind, title, starts_at) values ('${trip}', 'hotel', 'x', '2025-05-01')`))
await denied("un inconnu ne peut pas s'ajouter comme membre", () =>
  as('inconnu', `insert into public.trip_members (trip_id, user_id, role) values ('${trip}', '${U.inconnu}', 'owner')`))
await denied("un inconnu ne peut pas créer un voyage au nom de Karl", () =>
  as('inconnu', `insert into public.trips (title, start_date, end_date, created_by) values ('x', '2025-01-01', '2025-01-02', '${U.karl}')`))
await denied("un inconnu ne peut pas créer d'invitation", async () => {
  const r = await as('inconnu', `insert into public.trip_invitations (trip_id) values ('${trip}') returning token`)
  return r
})

let token
await ok('Karl crée une invitation éditeur', async () => {
  ;[{ token }] = await as('karl', `insert into public.trip_invitations (trip_id, role) values ('${trip}', 'editor') returning token`)
})
await ok("aperçu de l'invitation", async () => (await as('lea', `select * from public.invitation_preview('${token}')`))[0])
await ok('Léa accepte', async () => {
  const [r] = await as('lea', `select public.accept_invitation('${token}') as trip_id`)
  expect(r.trip_id === trip, 'mauvais voyage')
})
await denied("l'invitation ne sert qu'une fois", () => as('inconnu', `select public.accept_invitation('${token}')`), 'déjà utilisée')
await ok('Léa voit le voyage et la réservation, et le profil de Karl', async () => {
  const b = await as('lea', 'select title from public.bookings')
  const p = await as('lea', 'select display_name from public.profiles order by display_name')
  expect(b.length === 1, 'réservation absente')
  return p.map((x) => x.display_name)
})
await ok("l'inconnu ne voit pas les profils de Karl et Léa", async () => {
  const p = await as('inconnu', 'select display_name from public.profiles')
  expect(p.length === 1, JSON.stringify(p))
})
await ok('Léa (éditrice) ajoute une réservation', () =>
  as('lea', `insert into public.bookings (trip_id, kind, title, starts_at) values ('${trip}', 'hotel', 'Memmo Alfama', '2025-05-01 15:00')`))
await denied('Léa ne peut pas déplacer une réservation vers un autre voyage', () =>
  as('lea', `update public.bookings set trip_id = gen_random_uuid()`), 'permission denied')
await ok("Léa ne peut pas supprimer le voyage (0 ligne)", async () => {
  await as('lea', `delete from public.trips where id = '${trip}'`)
  const r = await db.query(`select 1 from public.trips where id = '${trip}'`)
  expect(r.rows.length === 1, 'supprimé !')
})
await ok("Léa ne peut pas se promouvoir propriétaire (0 ligne)", async () => {
  await as('lea', `update public.trip_members set role = 'owner' where user_id = '${U.lea}'`)
  const r = await db.query(`select role from public.trip_members where user_id = '${U.lea}'`)
  expect(r.rows[0].role === 'editor', 'promue !')
})
await denied("Léa (éditrice) ne peut pas inviter un propriétaire", () =>
  as('lea', `insert into public.trip_invitations (trip_id, role) values ('${trip}', 'owner')`))

let token2
await ok('Léa invite un lecteur, réservé à inconnu@example.com', async () => {
  ;[{ token: token2 }] = await as('lea', `insert into public.trip_invitations (trip_id, role, email) values ('${trip}', 'viewer', 'inconnu@example.com') returning token`)
})
await denied('invitation nominative : un tiers ne peut pas la prendre', async () => {
  await db.exec(`insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444', 'tiers@example.com')`)
  U.tiers = '44444444-4444-4444-4444-444444444444'
  return as('tiers', `select public.accept_invitation('${token2}')`)
}, 'autre adresse')
await ok("l'inconnu accepte l'invitation lecteur", () => as('inconnu', `select public.accept_invitation('${token2}')`))
await denied("le lecteur ne peut pas ajouter de réservation", () =>
  as('inconnu', `insert into public.bookings (trip_id, kind, title, starts_at) values ('${trip}', 'hotel', 'x', '2025-05-01')`))

await ok("Léa (éditrice) modifie le voyage, une réservation et l'ordre des étapes", async () => {
  await as('lea', `update public.trips set title = 'Lisbonne & Porto', budget_amount = 1200 where id = '${trip}'`)
  await as('lea', `update public.bookings set title = 'Hôtel Memmo', ends_at = '2025-05-04 11:00' where trip_id = '${trip}' and kind = 'hotel'`)
  await as('lea', `update public.trip_destinations set position = 3 where trip_id = '${trip}'`)
  const r = await db.query(`select t.title, (select position from public.trip_destinations where trip_id = t.id) pos from public.trips t where id = '${trip}'`)
  expect(r.rows[0].title === 'Lisbonne & Porto' && r.rows[0].pos === 3, JSON.stringify(r.rows))
})
await ok('le lecteur ne peut ni modifier ni supprimer (0 ligne)', async () => {
  await as('inconnu', `update public.trips set title = 'piraté' where id = '${trip}'`)
  await as('inconnu', `update public.bookings set title = 'piraté' where trip_id = '${trip}'`)
  await as('inconnu', `delete from public.bookings where trip_id = '${trip}'`)
  const r = await db.query(`select (select count(*) from public.bookings where trip_id = '${trip}') n, (select count(*) from public.bookings where title = 'piraté') p, (select title from public.trips where id = '${trip}') t`)
  expect(Number(r.rows[0].n) === 2 && Number(r.rows[0].p) === 0 && r.rows[0].t !== 'piraté', JSON.stringify(r.rows))
})
await ok('Léa supprime une réservation', async () => {
  await as('lea', `delete from public.bookings where trip_id = '${trip}' and kind = 'hotel'`)
  const r = await db.query(`select count(*) n from public.bookings where trip_id = '${trip}'`)
  expect(Number(r.rows[0].n) === 1, JSON.stringify(r.rows))
})
await ok('stockage : Léa dépose un PDF dans le dossier du voyage', () =>
  as('lea', `insert into storage.objects (bucket_id, name) values ('trip-files', '${trip}/billet.pdf')`))
await denied('stockage : le lecteur ne peut pas déposer', () =>
  as('inconnu', `insert into storage.objects (bucket_id, name) values ('trip-files', '${trip}/x.pdf')`))
await denied('stockage : chemin invalide refusé', () =>
  as('lea', `insert into storage.objects (bucket_id, name) values ('trip-files', 'nimportequoi/x.pdf')`))
await ok('stockage : le tiers ne voit pas le fichier', async () => {
  const r = await as('tiers', `select * from storage.objects`)
  expect(r.length === 0, 'fuite')
})

await ok('pays visités (voyage terminé + saisie manuelle)', async () => {
  await as('lea', `insert into public.user_countries (country_code) values ('392')`)
  return (await as('lea', 'select country_code from public.my_visited_countries order by 1')).map((r) => r.country_code)
})

await denied('Karl ne peut pas se rétrograder (dernier propriétaire)', () =>
  as('karl', `update public.trip_members set role = 'editor' where user_id = '${U.karl}'`), 'propriétaire')
await ok("Karl supprime son compte → Léa (éditrice) devient propriétaire, pas le lecteur", async () => {
  // Ce que fait la fonction serveur delete-account, après avoir effacé les fichiers
  await db.query(`delete from auth.users where id = '${U.karl}'`)
  expect((await db.query(`select 1 from public.profiles where id = '${U.karl}'`)).rows.length === 0, 'profil restant')
  const r = await db.query(`select user_id, role from public.trip_members where trip_id = '${trip}' order by role`)
  expect(r.rows.find((m) => m.user_id === U.lea)?.role === 'owner', JSON.stringify(r.rows))
})
await ok('Léa supprime le voyage → tout part en cascade', async () => {
  await as('lea', `delete from public.trips where id = '${trip}'`)
  const r = await db.query(`select (select count(*) from public.trips) t, (select count(*) from public.bookings) b, (select count(*) from public.trip_members) m`)
  expect(Number(r.rows[0].t) + Number(r.rows[0].b) + Number(r.rows[0].m) === 0, JSON.stringify(r.rows))
})
await ok('voyage abandonné par tous ses membres → supprimé', async () => {
  const [{ id }] = await as('lea', `insert into public.trips (title, start_date, end_date) values ('Solo', '2026-01-01', '2026-01-02') returning id`)
  await as('lea', `delete from public.trip_members where trip_id = '${id}'`)
  const r = await db.query(`select 1 from public.trips where id = '${id}'`)
  expect(r.rows.length === 0, 'voyage orphelin')
})
// ---- Import par l'IA (migration 20261024100000) ----
await ok("chaque compte a une adresse d'import, y compris un compte créé après la migration", async () => {
  const r = await db.query(`select count(*) n from public.profiles p left join public.import_addresses a on a.user_id = p.id where a.alias is null`)
  expect(Number(r.rows[0].n) === 0, 'profil sans adresse')
  expect((await db.query(`select 1 from public.import_addresses where user_id = '${U.tiers}'`)).rows.length === 1, 'tiers sans adresse')
})
await ok("Léa ne voit que sa propre adresse d'import", async () => {
  const r = await as('lea', 'select user_id from public.import_addresses')
  expect(r.length === 1 && r[0].user_id === U.lea, JSON.stringify(r))
})
await denied("Léa ne peut pas choisir son adresse d'import à la main", () =>
  as('lea', `update public.import_addresses set alias = 'adresse0choisie' where user_id = '${U.lea}'`), 'permission denied')
await ok("Léa change d'adresse d'import (l'ancienne ne marche plus)", async () => {
  const [before] = await as('lea', 'select alias from public.import_addresses')
  const [{ regenerate_import_alias: alias }] = await as('lea', 'select public.regenerate_import_alias()')
  expect(alias && alias !== before.alias, `${before.alias} → ${alias}`)
  expect((await db.query(`select 1 from public.import_addresses where alias = '${before.alias}'`)).rows.length === 0, 'ancienne adresse active')
})

let imp
await ok("un e-mail reçu pour Léa (écrit par la fonction serveur) n'est visible que par elle", async () => {
  ;[{ id: imp }] = (await db.query(`insert into public.pending_imports (user_id, subject, status, drafts) values ('${U.lea}', 'Votre vol', 'a_valider', '[{"title":"CDG → LIS"}]') returning id`)).rows
  expect((await as('lea', 'select id from public.pending_imports')).length === 1, 'Léa ne le voit pas')
  expect((await as('inconnu', 'select id from public.pending_imports')).length === 0, 'fuite')
})
await denied("Léa ne peut pas modifier les réservations proposées", () =>
  as('lea', `update public.pending_imports set drafts = '[]' where id = '${imp}'`), 'permission denied')
await denied("Léa ne peut pas créer un import elle-même", () =>
  as('lea', `insert into public.pending_imports (user_id) values ('${U.lea}')`), 'permission denied')
await denied("Léa ne peut pas déclarer sa propre consommation d'IA", () =>
  as('lea', `insert into public.ai_usage (user_id, source, model) values ('${U.lea}', 'fichier', 'x')`), 'permission denied')
await ok("pièces jointes : Léa lit les siennes, pas l'inconnu ; elle peut les supprimer", async () => {
  await db.query(`insert into storage.objects (bucket_id, name) values ('imports', '${U.lea}/${imp}/billet.pdf')`)
  expect((await as('lea', `select 1 from storage.objects where bucket_id = 'imports'`)).length === 1, 'Léa ne voit pas sa pièce jointe')
  expect((await as('inconnu', `select 1 from storage.objects where bucket_id = 'imports'`)).length === 0, 'fuite')
  await as('lea', `delete from storage.objects where bucket_id = 'imports'`)
  expect((await db.query(`select 1 from storage.objects where bucket_id = 'imports'`)).rows.length === 0, 'non supprimée')
})
await ok("l'inconnu ne peut pas supprimer l'import de Léa ; Léa oui", async () => {
  await as('inconnu', `delete from public.pending_imports where id = '${imp}'`)
  expect((await db.query(`select 1 from public.pending_imports where id = '${imp}'`)).rows.length === 1, 'supprimé par un autre')
  await as('lea', `delete from public.pending_imports where id = '${imp}'`)
  expect((await db.query(`select 1 from public.pending_imports where id = '${imp}'`)).rows.length === 0, 'non supprimé')
})
await denied('anon ne lit pas les imports', async () => {
  await db.exec('set role anon')
  try {
    return (await db.query('select * from public.pending_imports')).rows
  } finally {
    await db.exec('reset role')
  }
}, 'permission denied')

// ---- Notifications (migration 20261027100000) ----
const endpoint = 'https://web.push.apple.com/abc123'
await ok("Léa enregistre son téléphone pour les notifications ; elle seule le voit", async () => {
  await as('lea', `select public.save_push_subscription('${endpoint}', 'cle', 'secret', 'iPhone')`)
  expect((await as('lea', 'select endpoint from public.push_subscriptions')).length === 1, 'Léa ne voit pas son appareil')
  expect((await as('inconnu', 'select endpoint from public.push_subscriptions')).length === 0, 'fuite')
})
await denied("on ne peut pas inscrire un appareil au nom de quelqu'un d'autre", () =>
  as('inconnu', `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${U.lea}', 'https://x', 'k', 'a')`), 'permission denied')
await denied('une adresse non https est refusée', () => as('lea', `select public.save_push_subscription('http://pirate', 'k', 'a')`), 'invalide')
await ok("le même téléphone, connecté à un autre compte, passe à ce compte", async () => {
  await as('inconnu', `select public.save_push_subscription('${endpoint}', 'cle2', 'secret2', 'iPhone')`)
  const r = await db.query(`select user_id from public.push_subscriptions where endpoint = '${endpoint}'`)
  expect(r.rows.length === 1 && r.rows[0].user_id === U.inconnu, JSON.stringify(r.rows))
})
await ok("l'inconnu retire son appareil", async () => {
  await as('inconnu', `delete from public.push_subscriptions where endpoint = '${endpoint}'`)
  expect((await db.query(`select 1 from public.push_subscriptions`)).rows.length === 0, 'non retiré')
})

// ---- Photos et vidéos (migration 20261028100000) ----
let t2, photoLea, photoTiers
const uuid = () => crypto.randomUUID()
await ok('voyage à trois rôles : Léa propriétaire, tiers participant, inconnu lecteur', async () => {
  ;[{ id: t2 }] = await as('lea', `insert into public.trips (title, start_date, end_date) values ('Photos', '2025-06-01', '2025-06-10') returning id`)
  await db.query(`insert into public.trip_members (trip_id, user_id, role) values ('${t2}', '${U.tiers}', 'editor'), ('${t2}', '${U.inconnu}', 'viewer')`)
})
const photoRow = (id, kind = 'photo') => `('${id}', '${t2}', '${kind}', '${t2}/${id}/full.jpg', '${t2}/${id}/thumb.jpg', 'image/jpeg', 400000)`
await ok('Léa et le participant ajoutent chacun une photo (fichiers puis ligne)', async () => {
  photoLea = uuid()
  photoTiers = uuid()
  await as('lea', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${photoLea}/full.jpg'), ('trip-photos', '${t2}/${photoLea}/thumb.jpg')`)
  await as('lea', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ${photoRow(photoLea)}`)
  await as('tiers', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${photoTiers}/full.jpg')`)
  await as('tiers', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ${photoRow(photoTiers)}`)
})
await denied('le lecteur ne peut pas ajouter de photo', () =>
  as('inconnu', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ${photoRow(uuid())}`), 'row-level security')
await denied('le lecteur ne peut pas envoyer de fichier', () =>
  as('inconnu', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${uuid()}/full.jpg')`))
await ok('le lecteur voit les photos ; Karl (hors du voyage) non', async () => {
  expect((await as('inconnu', `select id from public.trip_photos where trip_id = '${t2}'`)).length === 2, 'le lecteur ne voit pas tout')
  expect((await as('inconnu', `select 1 from storage.objects where bucket_id = 'trip-photos'`)).length === 3, 'fichiers invisibles')
  await db.exec(`insert into auth.users (id, email) values ('${U.karl}', 'karl@example.com') on conflict do nothing`)
  expect((await as('karl', `select id from public.trip_photos`)).length === 0, 'fuite')
  expect((await as('karl', `select 1 from storage.objects where bucket_id = 'trip-photos'`)).length === 0, 'fuite de fichiers')
})
await ok("le participant ne peut pas supprimer la photo de Léa (ni sa ligne, ni son fichier)", async () => {
  await as('tiers', `delete from public.trip_photos where id = '${photoLea}'`)
  await as('tiers', `delete from storage.objects where name = '${t2}/${photoLea}/full.jpg'`)
  expect((await db.query(`select 1 from public.trip_photos where id = '${photoLea}'`)).rows.length === 1, 'ligne supprimée')
  expect((await db.query(`select 1 from storage.objects where name = '${t2}/${photoLea}/full.jpg'`)).rows.length === 1, 'fichier supprimé')
})
await ok("couverture : une photo du voyage, pas une vidéo ni la photo d'un autre voyage", async () => {
  await as('tiers', `update public.trips set cover_photo_id = '${photoLea}' where id = '${t2}'`)
  expect((await db.query(`select cover_photo_id from public.trips where id = '${t2}'`)).rows[0].cover_photo_id === photoLea, 'couverture non définie')
})
await denied("couverture d'un autre voyage refusée", () => as('tiers', `update public.trips set cover_photo_id = '${uuid()}' where id = '${t2}'`), 'couverture')
await ok('le propriétaire supprime la photo du participant ; le participant supprime un fichier orphelin', async () => {
  await as('lea', `delete from storage.objects where name like '${t2}/${photoTiers}/%'`)
  await as('lea', `delete from public.trip_photos where id = '${photoTiers}'`)
  expect((await db.query(`select 1 from public.trip_photos where id = '${photoTiers}'`)).rows.length === 0, 'photo restée')
  const orphan = uuid()
  await as('tiers', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${orphan}/full.jpg')`)
  await as('tiers', `delete from storage.objects where name = '${t2}/${orphan}/full.jpg'`)
  expect((await db.query(`select 1 from storage.objects where name = '${t2}/${orphan}/full.jpg'`)).rows.length === 0, 'orphelin resté')
})
await ok("supprimer la photo de couverture remet le dégradé (couverture vide)", async () => {
  await as('lea', `delete from public.trip_photos where id = '${photoLea}'`)
  expect((await db.query(`select cover_photo_id from public.trips where id = '${t2}'`)).rows[0].cover_photo_id === null, 'couverture fantôme')
})

// ---- Partage public et réactions (migration 20261102100000) ----
let porto, lisbonne, pubLea, privTiers
await ok('Léa et le participant ajoutent une photo à Porto', async () => {
  ;[{ id: porto }] = await as('lea', `insert into public.trip_destinations (trip_id, city, country_code, lat, lng) values ('${t2}', 'Porto', '620', 41.15, -8.61) returning id`)
  const [{ id: t3 }] = await as('karl', `insert into public.trips (title, start_date, end_date) values ('Ailleurs', '2025-07-01', '2025-07-05') returning id`)
  ;[{ id: lisbonne }] = await as('karl', `insert into public.trip_destinations (trip_id, city, country_code, lat, lng) values ('${t3}', 'Lisbonne', '620', 38.72, -9.14) returning id`)
  pubLea = uuid()
  privTiers = uuid()
  await as('lea', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${pubLea}/full.jpg'), ('trip-photos', '${t2}/${pubLea}/thumb.jpg')`)
  await as('lea', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes, taken_at) values ('${pubLea}', '${t2}', 'photo', '${t2}/${pubLea}/full.jpg', '${t2}/${pubLea}/thumb.jpg', 'image/jpeg', 400000, '2025-06-03 18:42')`)
  await as('tiers', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${t2}/${privTiers}/full.jpg')`)
  await as('tiers', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ${photoRow(privTiers)}`)
})
await ok('une photo est privée par défaut : Karl ne la voit pas', async () => {
  expect((await as('karl', 'select * from public.public_photos()')).length === 0, 'fuite')
  expect((await as('karl', `select 1 from storage.objects where name like '${t2}/%'`)).length === 0, 'fuite de fichiers')
})
await denied("le participant ne peut pas publier la photo de Léa", () => as('tiers', `select public.publish_photo('${pubLea}', '${porto}')`), "auteur")
await denied("la ville doit être une étape du voyage", () => as('lea', `select public.publish_photo('${pubLea}', '${lisbonne}')`), 'étape')
await denied('on ne publie pas en écrivant directement dans la table', () =>
  as('lea', `insert into public.photo_shares (photo_id, trip_id, author_id, city, country_code, lat, lng) values ('${pubLea}', '${t2}', '${U.lea}', 'Paris', '250', 48.85, 2.35)`), 'permission denied')
await ok('Léa publie sa photo à Porto', () => as('lea', `select public.publish_photo('${pubLea}', '${porto}', '  Coucher de soleil  ')`))
await ok("Karl la voit : ville, mois, auteur, sans rien du voyage", async () => {
  const r = await as('karl', 'select * from public.public_photos()')
  expect(r.length === 1 && r[0].city === 'Porto' && r[0].author_name === 'lea' && r[0].caption === 'Coucher de soleil', JSON.stringify(r))
  expect(new Date(r[0].taken_month).toISOString().startsWith('2025-06-01'), 'mois : ' + r[0].taken_month)
  expect(!('trip_id' in r[0]) && !('title' in r[0]), 'le voyage fuit')
  expect((await as('karl', `select 1 from storage.objects where name like '${t2}/${pubLea}/%'`)).length === 2, 'fichiers publics illisibles')
  expect((await as('karl', `select 1 from storage.objects where name like '${t2}/${privTiers}/%'`)).length === 0, 'fichier privé lisible')
  expect((await as('karl', 'select 1 from public.photo_shares')).length === 0, 'table lisible directement')
  expect((await as('karl', 'select 1 from public.trip_photos')).length === 0, 'ligne privée lisible')
})
await ok('filtres par pays et ville, et villes du globe', async () => {
  expect((await as('karl', `select 1 from public.public_photos('620', 'porto')`)).length === 1, 'filtre ville')
  expect((await as('karl', `select 1 from public.public_photos('250')`)).length === 0, 'filtre pays')
  const [p] = await as('karl', 'select * from public.public_places()')
  expect(p.city === 'Porto' && Number(p.photo_count) === 1 && p.cover_thumb_path === `${t2}/${pubLea}/thumb.jpg`, JSON.stringify(p))
})
await ok('les membres du voyage voient quelles photos sont publiques', async () => {
  expect((await as('inconnu', `select photo_id from public.photo_shares`)).length === 1, 'badge invisible')
})
await ok("Karl réagit « J'adore », puis passe à « Wishlist »", async () => {
  await as('karl', `select public.react_to_photo('${pubLea}', 'jadore')`)
  await as('karl', `select public.react_to_photo('${pubLea}', 'wishlist')`)
  await as('tiers', `select public.react_to_photo('${pubLea}', 'jaime')`)
  await as('inconnu', `select public.react_to_photo('${pubLea}', 'waouh')`)
  await as('inconnu', `select public.react_to_photo('${pubLea}', null)`)
  const [r] = await as('karl', 'select reactions, my_reaction from public.public_photos()')
  expect(r.my_reaction === 'wishlist' && r.reactions.wishlist === 1 && r.reactions.jaime === 1 && !r.reactions.jadore, JSON.stringify(r))
  expect((await as('karl', 'select 1 from public.public_photos(p_wishlist => true)')).length === 1, 'wishlist vide')
  expect((await as('lea', 'select 1 from public.public_photos(p_wishlist => true)')).length === 0, 'wishlist de Léa non vide')
  expect((await as('lea', 'select 1 from public.photo_reactions')).length === 0, 'réactions des autres lisibles')
})
await denied('on ne réagit pas à une photo privée', () => as('karl', `insert into public.photo_reactions (photo_id, kind) values ('${privTiers}', 'jaime')`), 'row-level security')
await denied("on ne réagit pas au nom d'un autre", () => as('karl', `insert into public.photo_reactions (photo_id, user_id, kind) values ('${pubLea}', '${U.lea}', 'jaime')`), 'row-level security')
await denied('réaction inconnue refusée', () => as('lea', `insert into public.photo_reactions (photo_id, kind) values ('${pubLea}', 'grr')`), 'check')
await ok('une photo masquée par la modération disparaît pour Karl, pas pour Léa', async () => {
  await db.query(`update public.photo_shares set hidden_at = now() where photo_id = '${pubLea}'`)
  expect((await as('karl', 'select 1 from public.public_photos()')).length === 0, 'encore visible')
  expect((await as('karl', `select 1 from storage.objects where name like '${t2}/${pubLea}/%'`)).length === 0, 'fichier encore lisible')
  expect((await as('lea', `select 1 from public.trip_photos where id = '${pubLea}'`)).length === 1, "Léa l'a perdue")
  await db.query(`update public.photo_shares set hidden_at = null where photo_id = '${pubLea}'`)
})
await ok("le participant ne peut pas dépublier ; Léa dépublie, Karl perd l'accès et les réactions partent", async () => {
  await as('tiers', `delete from public.photo_shares where photo_id = '${pubLea}'`)
  expect((await db.query(`select 1 from public.photo_shares`)).rows.length === 1, 'dépubliée par le participant')
  await as('lea', `delete from public.photo_shares where photo_id = '${pubLea}'`)
  expect((await as('karl', 'select 1 from public.public_photos()')).length === 0, 'encore publique')
  expect((await as('karl', `select 1 from storage.objects where name like '${t2}/${pubLea}/%'`)).length === 0, 'fichier encore lisible')
  expect((await db.query(`select 1 from public.photo_reactions`)).rows.length === 0, 'réactions orphelines')
})
await ok('supprimer la photo du voyage la retire du partage', async () => {
  await as('lea', `select public.publish_photo('${pubLea}', '${porto}')`)
  await as('lea', `delete from public.trip_photos where id = '${pubLea}'`)
  expect((await db.query(`select 1 from public.photo_shares`)).rows.length === 0, 'partage fantôme')
})
await denied('anon ne voit pas les photos publiques', async () => {
  await db.exec('set role anon')
  try {
    return (await db.query('select * from public.public_photos()')).rows
  } finally {
    await db.exec('reset role')
  }
}, 'permission denied')

/// ---- Modération : signalements, blocages, limite de publications ----
const photoIn = async (user, tripId) => {
  const id = uuid()
  await as(user, `insert into storage.objects (bucket_id, name) values ('trip-photos', '${tripId}/${id}/full.jpg')`)
  await as(user, `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ('${id}', '${tripId}', 'photo', '${tripId}/${id}/full.jpg', '${tripId}/${id}/thumb.jpg', 'image/jpeg', 1000)`)
  return id
}
let m1, mKarl, t3
await ok('Léa publie une photo ; Karl en publie une de son voyage', async () => {
  m1 = await photoIn('lea', t2)
  await as('lea', `select public.publish_photo('${m1}', '${porto}')`)
  ;[{ trip_id: t3 }] = (await db.query(`select trip_id from public.trip_destinations where id = '${lisbonne}'`)).rows
  mKarl = await photoIn('karl', t3)
  await as('karl', `select public.publish_photo('${mKarl}', '${lisbonne}')`)
})
await ok("villes tendances : activité récente d'abord, chiffres et miniatures, blocages respectés", async () => {
  await as('tiers', `select public.react_to_photo('${mKarl}', 'jadore')`)
  await as('inconnu', `select public.react_to_photo('${mKarl}', 'waouh')`)
  const rows = await as('tiers', 'select * from public.public_trending_places()')
  expect(rows.length === 2 && rows[0].city === 'Lisbonne' && rows[1].city === 'Porto', JSON.stringify(rows))
  const [lis] = rows
  expect(Number(lis.photo_count) === 1 && Number(lis.traveler_count) === 1 && Number(lis.reaction_count) === 2 && Number(lis.recent_count) === 3, JSON.stringify(lis))
  expect(lis.thumb_paths.length === 1 && lis.thumb_paths[0] === `${t3}/${mKarl}/thumb.jpg`, JSON.stringify(lis.thumb_paths))
  await as('lea', `insert into public.user_blocks (blocked_id) values ('${U.karl}')`)
  const leaRows = await as('lea', 'select city from public.public_trending_places()')
  expect(leaRows.length === 1 && leaRows[0].city === 'Porto', JSON.stringify(leaRows))
  await as('lea', `delete from public.user_blocks where blocked_id = '${U.karl}'`)
  await as('tiers', `select public.react_to_photo('${mKarl}', null)`)
  await as('inconnu', `select public.react_to_photo('${mKarl}', null)`)
})
await denied('on ne signale pas sa propre photo', () => as('lea', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'spam')`), 'row-level security')
await ok('Karl signale la photo de Léa ; il ne voit que son signalement', async () => {
  await as('karl', `insert into public.photo_reports (photo_id, reason, details) values ('${m1}', 'spam', 'publicité')`)
  expect((await as('karl', 'select 1 from public.photo_reports')).length === 1, 'signalement invisible')
  expect((await as('lea', 'select 1 from public.photo_reports')).length === 0, "Léa voit qui l'a signalée")
})
await denied('un seul signalement par personne', () => as('karl', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'autre')`), 'duplicate')
await denied('motif inconnu refusé', () => as('tiers', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'moche')`), 'check')
await ok('à 3 signalements, la photo est masquée pour tous les autres', async () => {
  await as('tiers', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'personne')`)
  expect((await db.query(`select hidden_at from public.photo_shares where photo_id = '${m1}'`)).rows[0].hidden_at === null, 'masquée trop tôt')
  await as('inconnu', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'inapproprie')`)
  const [row] = (await db.query(`select hidden_at, hidden_reason from public.photo_shares where photo_id = '${m1}'`)).rows
  expect(row.hidden_at && row.hidden_reason === 'signalements', JSON.stringify(row))
  expect((await as('karl', `select 1 from public.public_photos() where photo_id = '${m1}'`)).length === 0, 'encore visible')
})
await denied('une photo masquée ne peut plus être signalée', async () => {
  await db.query(`insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'cinq@example.com')`)
  U.cinq = '55555555-5555-5555-5555-555555555555'
  return as('cinq', `insert into public.photo_reports (photo_id, reason) values ('${m1}', 'spam')`)
}, 'row-level security')
await ok("republier ne démasque pas une photo masquée", async () => {
  await as('lea', `select public.publish_photo('${m1}', '${porto}', 'autre légende')`)
  expect((await db.query(`select hidden_at from public.photo_shares where photo_id = '${m1}'`)).rows[0].hidden_at !== null, 'démasquée')
  await db.query(`update public.photo_shares set hidden_at = null, hidden_reason = null where photo_id = '${m1}'`)
})
await ok('Karl bloque Léa : chacun ne voit plus les photos de l’autre ; le participant voit les deux', async () => {
  await as('karl', `insert into public.user_blocks (blocked_id) values ('${U.lea}')`)
  const karlSees = (await as('karl', 'select photo_id from public.public_photos()')).map((r) => r.photo_id)
  const leaSees = (await as('lea', 'select photo_id from public.public_photos()')).map((r) => r.photo_id)
  const tiersSees = (await as('tiers', 'select photo_id from public.public_photos()')).map((r) => r.photo_id)
  expect(!karlSees.includes(m1) && !leaSees.includes(mKarl) && tiersSees.length === 2, JSON.stringify({ karlSees, leaSees, tiersSees }))
  expect((await as('lea', 'select 1 from public.user_blocks')).length === 0, 'Léa voit qui la bloque')
})
await denied("on ne bloque pas au nom d'un autre", () => as('lea', `insert into public.user_blocks (blocker_id, blocked_id) values ('${U.karl}', '${U.tiers}')`), 'row-level security')
await ok('Karl débloque Léa', async () => {
  await as('karl', `delete from public.user_blocks where blocked_id = '${U.lea}'`)
  expect((await as('karl', `select 1 from public.public_photos() where photo_id = '${m1}'`)).length === 1, 'toujours bloquée')
})
await denied('au plus 30 nouvelles publications par jour', async () => {
  // 29 de plus que m1, publiées aujourd'hui
  await db.query(`create temp table ids as select gen_random_uuid() as id from generate_series(1, 29)`)
  await db.query(`insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes, uploaded_by)
    select id, '${t2}', 'photo', '${t2}/' || id || '/f.jpg', '${t2}/' || id || '/t.jpg', 'image/jpeg', 1, '${U.lea}' from ids`)
  await db.query(`insert into public.photo_shares (photo_id, trip_id, author_id, city, country_code, lat, lng)
    select id, '${t2}', '${U.lea}', 'Porto', '620', 41.15, -8.61 from ids`)
  const extra = await photoIn('lea', t2)
  return as('lea', `select public.publish_photo('${extra}', '${porto}')`)
}, '30 photos')
await ok('nettoyage des photos de modération', async () => {
  await db.query(`delete from public.trip_photos where size_bytes <= 1000 and trip_id in ('${t2}', '${t3}')`)
  expect((await db.query('select 1 from public.photo_shares')).rows.length === 0, 'partages restants')
})

// ---- Premium et quotas (migration 20261102110000) ----
const MB = 1024 * 1024
const newTrip = async (user, title) => (await as(user, `insert into public.trips (title, start_date, end_date) values ('${title}', '2025-08-01', '2025-08-05') returning id`))[0].id
const addPhoto = async (user, tripId, { bytes = 400000, stored } = {}) => {
  const id = uuid()
  const meta = stored ? `'{"size": ${stored}}'` : 'null'
  await as(user, `insert into storage.objects (bucket_id, name, metadata) values ('trip-photos', '${tripId}/${id}/full.jpg', ${meta})`)
  await as(user, `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ('${id}', '${tripId}', 'photo', '${tripId}/${id}/full.jpg', '${tripId}/${id}/thumb.jpg', 'image/jpeg', ${bytes})`)
  return id
}
async function asService(sql) {
  await db.exec('set role service_role')
  try {
    return (await db.query(sql)).rows
  } finally {
    await db.exec('reset role')
  }
}
let q1, q2, q3
await ok('offre gratuite de Léa : 1 voyage avec photos, 250 Mo, 5 lectures', async () => {
  const [{ my_plan: p }] = await as('lea', 'select public.my_plan()')
  expect(!p.premium && p.photoTrips === 1 && p.photoTripsLimit === 2 && p.photoBytesLimit === 250 * MB && p.aiLimit === 5 && !p.aiMonthly, JSON.stringify(p))
})
await ok('gratuit : photos dans un 2e voyage, pas dans un 3e', async () => {
  q1 = await newTrip('lea', 'Quota 1')
  q2 = await newTrip('lea', 'Quota 2')
  await addPhoto('lea', q1)
  const [{ photo_quota_check: msg }] = await as('lea', `select public.photo_quota_check('${q2}', 1000)`)
  expect(msg?.includes('2 voyages'), 'message : ' + msg)
  expect((await as('lea', `select public.photo_quota_check('${q1}', 1000) as m`))[0].m === null, 'voyage existant bloqué')
})
await denied('3e voyage : la ligne est refusée (même sans fichier)', () => {
  const id = uuid()
  return as('lea', `insert into public.trip_photos (id, trip_id, kind, path, thumb_path, mime_type, size_bytes) values ('${id}', '${q2}', 'photo', '${q2}/${id}/full.jpg', '${q2}/${id}/thumb.jpg', 'image/jpeg', 1000)`)
}, 'gratuite')
await denied("3e voyage : le fichier aussi, avant même l'envoi", () =>
  as('lea', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${q2}/${uuid()}/full.jpg')`), 'row-level security')
await denied('le poids compté est celui du fichier stocké, pas celui annoncé', () => addPhoto('lea', q1, { bytes: 1000, stored: 260 * MB }), 'plein')
await ok('espace plein : message pour le propriétaire, et pour un participant', async () => {
  await db.query(`insert into public.trip_members (trip_id, user_id, role) values ('${q1}', '${U.tiers}', 'editor')`)
  const [{ m: mine }] = await as('lea', `select public.photo_quota_check('${q1}', ${251 * MB}) as m`)
  const [{ m: theirs }] = await as('tiers', `select public.photo_quota_check('${q1}', ${251 * MB}) as m`)
  expect(mine.includes('Votre espace photos est plein (250 Mo)') && theirs.includes('propriétaire'), mine + ' / ' + theirs)
  expect((await as('karl', `select public.photo_quota_check('${q1}', 1) as m`))[0].m === null, 'un étranger apprend quelque chose')
})
await ok("les photos d'un participant comptent chez le propriétaire", async () => {
  await addPhoto('tiers', q1, { bytes: 5 * MB })
  const [{ my_plan: lea }] = await as('lea', 'select public.my_plan()')
  const [{ my_plan: tiers }] = await as('tiers', 'select public.my_plan()')
  expect(lea.photoBytes === 400000 * 2 + 5 * MB && tiers.photoBytes === 0, `${lea.photoBytes} / ${tiers.photoBytes}`)
})
await denied("on ne s'offre pas le premium", () => as('lea', `insert into public.subscriptions (user_id, status) values ('${U.lea}', 'offert')`), 'permission denied')
await ok('premium (offert) : photos dans le 3e voyage, 20 Go, 300 lectures sur 30 jours', async () => {
  await db.query(`insert into public.subscriptions (user_id, status) values ('${U.lea}', 'offert')`)
  await addPhoto('lea', q2)
  q3 = await newTrip('lea', 'Quota 3')
  await addPhoto('lea', q3)
  const [{ my_plan: p }] = await as('lea', 'select public.my_plan()')
  expect(p.premium && p.photoTripsLimit === null && p.photoBytesLimit === 20 * 1024 * MB && p.aiLimit === 300 && p.aiMonthly && !p.managedByStripe, JSON.stringify(p))
})
await ok("abonnement résilié et échu : retour au gratuit (les photos restent, l'ajout est bloqué)", async () => {
  await db.query(`update public.subscriptions set status = 'canceled', current_period_end = now() - interval '10 days', stripe_customer_id = 'cus_1' where user_id = '${U.lea}'`)
  const [{ my_plan: p }] = await as('lea', 'select public.my_plan()')
  expect(!p.premium && p.photoTrips === 4 && p.managedByStripe, JSON.stringify(p))
  expect((await as('lea', `select public.photo_quota_check('${q3}', 1) as m`))[0].m !== null, 'ajout encore possible')
  expect((await as('lea', `select count(*)::int as n from public.trip_photos where trip_id = '${q3}'`))[0].n === 1, 'photos perdues')
})
await ok("paiement en retard : premium jusqu'à 3 jours après l'échéance", async () => {
  await db.query(`update public.subscriptions set status = 'past_due', current_period_end = now() - interval '1 day' where user_id = '${U.lea}'`)
  expect((await as('lea', 'select public.my_plan()'))[0].my_plan.premium, 'grâce non appliquée')
  await db.query(`update public.subscriptions set current_period_end = now() - interval '4 days' where user_id = '${U.lea}'`)
  expect(!(await as('lea', 'select public.my_plan()'))[0].my_plan.premium, 'grâce trop longue')
})
await denied("l'app ne peut pas lire les droits à l'IA d'un autre", () => as('lea', `select public.ai_allowance('${U.tiers}')`), 'permission denied')
await ok("IA : 5 lectures en gratuit ; dans le voyage d'un propriétaire premium, 300", async () => {
  await db.query(`insert into public.ai_usage (user_id, source, model) select '${U.tiers}', 'fichier', 'm' from generate_series(1, 5)`)
  const [{ a: free }] = await asService(`select public.ai_allowance('${U.tiers}') as a`)
  expect(!free.allowed && free.used === 5 && free.limit === 5, JSON.stringify(free))
  await db.query(`update public.subscriptions set status = 'active', current_period_end = now() + interval '20 days' where user_id = '${U.lea}'`)
  const [{ a: inTrip }] = await asService(`select public.ai_allowance('${U.tiers}', '${q1}') as a`)
  expect(inTrip.allowed && inTrip.premium && inTrip.limit === 300, JSON.stringify(inTrip))
  const [{ a: elsewhere }] = await asService(`select public.ai_allowance('${U.tiers}') as a`)
  expect(!elsewhere.allowed, 'premium hors du voyage')
})
await ok('premium : seules les lectures des 30 derniers jours comptent', async () => {
  await db.query(`insert into public.ai_usage (user_id, source, model, created_at) select '${U.lea}', 'email', 'm', now() - interval '40 days' from generate_series(1, 300)`)
  const [{ a }] = await asService(`select public.ai_allowance('${U.lea}') as a`)
  expect(a.allowed && a.used === 0, JSON.stringify(a))
})

// ---- Suppression de compte (migration 20261103100000) ----
Object.assign(U, { alix: '77777777-7777-7777-7777-777777777777', bao: '88888888-8888-8888-8888-888888888888', cyd: '99999999-9999-9999-9999-999999999999' })
await db.exec(`insert into auth.users (id, email) values ('${U.alix}', 'alix@example.com'), ('${U.bao}', 'bao@example.com'), ('${U.cyd}', 'cyd@example.com')`)
let solo, shared, soloPhoto, sharedPhoto
await ok("préparation : un voyage d'Alix seule, un voyage partagé avec Bao puis Cyd, des fichiers partout", async () => {
  solo = await newTrip('alix', 'Seule')
  shared = await newTrip('alix', 'Ensemble')
  await db.query(`insert into public.trip_members (trip_id, user_id, role, joined_at) values
    ('${shared}', '${U.bao}', 'editor', now() - interval '2 days'), ('${shared}', '${U.cyd}', 'editor', now() - interval '1 day')`)
  const [{ id: booking }] = await as('alix', `insert into public.bookings (trip_id, kind, title, starts_at) values ('${solo}', 'vol', 'CDG → LIS', '2025-08-01 07:00') returning id`)
  await as('alix', `insert into storage.objects (bucket_id, name) values ('trip-files', '${solo}/billet.pdf'), ('trip-files', '${shared}/billet.pdf')`)
  await as('alix', `insert into public.booking_files (booking_id, trip_id, storage_path, file_name) values ('${booking}', '${solo}', '${solo}/billet.pdf', 'billet.pdf')`)
  soloPhoto = await addPhoto('alix', solo)
  sharedPhoto = await addPhoto('alix', shared, { bytes: 3 * MB })
  // Envoi interrompu : un fichier sans ligne trip_photos
  await as('alix', `insert into storage.objects (bucket_id, name) values ('trip-photos', '${solo}/${uuid()}/thumb.jpg')`)
  await db.query(`insert into storage.objects (bucket_id, name) values ('imports', '${U.alix}/${uuid()}/mail.pdf'), ('imports', '${U.bao}/${uuid()}/mail.pdf')`)
  await db.query(`insert into public.subscriptions (user_id, status, stripe_subscription_id) values ('${U.alix}', 'active', 'sub_alix')`)
})
await denied("l'app ne peut pas lister les fichiers d'un compte", () => as('alix', `select * from public.account_files('${U.alix}')`), 'permission denied')
await denied("l'ancienne suppression par la base (qui oubliait les fichiers) n'existe plus", () => as('alix', 'select public.delete_my_account()'), 'does not exist')
await ok("fichiers à effacer : ceux du voyage d'Alix seule et ses e-mails, pas ceux du voyage partagé ni de Bao", async () => {
  const files = (await asService(`select bucket_id || ':' || name as f from public.account_files('${U.alix}')`)).map((r) => r.f)
  const expected = [`imports:${U.alix}/`, `trip-files:${solo}/billet.pdf`, `trip-photos:${solo}/${soloPhoto}/full.jpg`, `trip-photos:${solo}/`]
  expect(files.length === 4 && expected.every((e) => files.some((f) => f.startsWith(e))), JSON.stringify(files))
  expect(!files.some((f) => f.includes(shared) || f.includes(U.bao)), 'fichier partagé ou d’un autre compte')
  const bao = (await asService(`select name from public.account_files('${U.bao}')`)).map((r) => r.name)
  expect(bao.length === 1 && bao[0].startsWith(U.bao), 'Bao : ' + JSON.stringify(bao))
})
await ok('Alix supprime son compte → son voyage seul disparaît avec tout son contenu', async () => {
  await db.query(`delete from auth.users where id = '${U.alix}'`)
  const r = await db.query(`select
    (select count(*) from public.trips where id = '${solo}')::int t,
    (select count(*) from public.bookings where trip_id = '${solo}')::int b,
    (select count(*) from public.booking_files where trip_id = '${solo}')::int f,
    (select count(*) from public.trip_photos where trip_id = '${solo}')::int p,
    (select count(*) from public.subscriptions where user_id = '${U.alix}')::int s,
    (select count(*) from public.trips t where not exists (select 1 from public.trip_members m where m.trip_id = t.id))::int orphelins`)
  expect(Object.values(r.rows[0]).every((n) => n === 0), JSON.stringify(r.rows[0]))
})
await ok('voyage partagé : il reste, Bao (le plus ancien) en devient propriétaire, Cyd reste participant', async () => {
  const r = await db.query(`select user_id, role from public.trip_members where trip_id = '${shared}' order by joined_at`)
  expect(r.rows.length === 2 && r.rows[0].user_id === U.bao && r.rows[0].role === 'owner' && r.rows[1].role === 'editor', JSON.stringify(r.rows))
  const p = await db.query(`select uploaded_by from public.trip_photos where id = '${sharedPhoto}'`)
  expect(p.rows.length === 1 && p.rows[0].uploaded_by === null, 'photo partagée perdue ou encore signée')
})
await ok("premium : les photos du voyage partagé comptent désormais chez Bao, qui le paie", async () => {
  const [{ my_plan: p }] = await as('bao', 'select public.my_plan()')
  expect(p.photoBytes === 3 * MB && p.photoTrips === 1, JSON.stringify(p))
  const [{ m }] = await as('cyd', `select public.photo_quota_check('${shared}', 1000) as m`)
  expect(m === null, 'Cyd ne peut plus ajouter de photo : ' + m)
})

await denied('anon ne lit rien', async () => {
  await db.exec('set role anon')
  try {
    return (await db.query('select * from public.trips')).rows
  } finally {
    await db.exec('reset role')
  }
}, 'permission denied')

console.log(failures ? `\n${failures} échec(s)` : '\nTous les tests passent')
process.exit(failures ? 1 : 0)
