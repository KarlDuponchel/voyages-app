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
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
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
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
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
  await as('karl', 'select public.delete_my_account()')
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
