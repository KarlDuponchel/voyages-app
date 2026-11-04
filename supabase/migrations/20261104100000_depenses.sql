-- =====================================================================
-- Budget partagé (feuille de route, étape 5 ; demande de Karl, 04/11) : qui a payé quoi, et qui doit combien.
-- - expenses : une dépense du voyage (montant en centimes, dans la devise du voyage), payée par un voyageur.
-- - expense_shares : la part de chaque voyageur concerné ; leur somme vaut le montant (vérifié par save_expense).
-- - settlements : un remboursement entre deux voyageurs (« Léa a remboursé 42 € à Karl »).
-- Mêmes droits que les réservations : tous les membres voient, les participants (owner, editor) ajoutent,
-- modifient et suppriment. Les soldes sont calculés dans l'app (src/lib/balances.ts).
-- =====================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents < 10000000000),
  category text not null default 'autre' check (category in ('transport', 'logement', 'repas', 'activites', 'courses', 'autre')),
  paid_by uuid references public.profiles (id) on delete set null,
  spent_on date not null default current_date,
  booking_id uuid references public.bookings (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_trip_idx on public.expenses (trip_id, spent_on);

create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents bigint not null check (amount_cents >= 0),
  primary key (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents < 10000000000),
  settled_on date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index settlements_trip_idx on public.settlements (trip_id);

alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

create policy "voir les dépenses" on public.expenses for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "ajouter une dépense" on public.expenses for insert to authenticated
  with check (private.can_edit_trip(trip_id));
create policy "modifier une dépense" on public.expenses for update to authenticated
  using (private.can_edit_trip(trip_id)) with check (private.can_edit_trip(trip_id));
create policy "supprimer une dépense" on public.expenses for delete to authenticated
  using (private.can_edit_trip(trip_id));

create policy "voir les parts" on public.expense_shares for select to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.is_trip_member(e.trip_id)));
create policy "écrire les parts" on public.expense_shares for all to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_id and private.can_edit_trip(e.trip_id)))
  with check (exists (select 1 from public.expenses e where e.id = expense_id and private.can_edit_trip(e.trip_id)));

create policy "voir les remboursements" on public.settlements for select to authenticated
  using (private.is_trip_member(trip_id));
-- Les deux personnes doivent être membres du voyage
create policy "ajouter un remboursement" on public.settlements for insert to authenticated
  with check (
    private.can_edit_trip(trip_id)
    and exists (select 1 from public.trip_members m where m.trip_id = settlements.trip_id and m.user_id = from_user)
    and exists (select 1 from public.trip_members m where m.trip_id = settlements.trip_id and m.user_id = to_user)
  );
create policy "supprimer un remboursement" on public.settlements for delete to authenticated
  using (private.can_edit_trip(trip_id));

/**
 * Enregistre une dépense et ses parts d'un coup (création si p_id est vide, sinon modification).
 * p_shares : [{ "user_id": "…", "amount_cents": 1250 }, …], somme égale au montant, voyageurs du voyage.
 * Droits de l'appelant (security invoker) : seules les règles ci-dessus s'appliquent.
 */
create function public.save_expense(
  p_trip uuid,
  p_id uuid,
  p_title text,
  p_amount_cents bigint,
  p_category text,
  p_paid_by uuid,
  p_spent_on date,
  p_shares jsonb,
  p_booking uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_total bigint;
  v_outsiders integer;
begin
  if not private.can_edit_trip(p_trip) then
    raise exception 'Seuls les participants du voyage peuvent ajouter des dépenses.';
  end if;
  if jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Choisissez au moins une personne concernée.';
  end if;
  select coalesce(sum((s->>'amount_cents')::bigint), 0) into v_total from jsonb_array_elements(p_shares) s;
  if v_total <> p_amount_cents then
    raise exception 'La somme des parts (% centimes) ne correspond pas au montant (% centimes).', v_total, p_amount_cents;
  end if;
  if exists (select 1 from jsonb_array_elements(p_shares) s where (s->>'amount_cents')::bigint < 0) then
    raise exception 'Une part ne peut pas être négative.';
  end if;
  select count(*) into v_outsiders
  from (select (s->>'user_id')::uuid as u from jsonb_array_elements(p_shares) s union select p_paid_by) x
  where not exists (select 1 from public.trip_members m where m.trip_id = p_trip and m.user_id = x.u);
  if v_outsiders > 0 then
    raise exception 'Le payeur et les personnes concernées doivent être des voyageurs du voyage.';
  end if;

  if v_id is null then
    insert into public.expenses (trip_id, title, amount_cents, category, paid_by, spent_on, booking_id)
    values (p_trip, trim(p_title), p_amount_cents, p_category, p_paid_by, p_spent_on, p_booking)
    returning id into v_id;
  else
    update public.expenses
    set title = trim(p_title), amount_cents = p_amount_cents, category = p_category, paid_by = p_paid_by,
        spent_on = p_spent_on, booking_id = p_booking, updated_at = now()
    where id = v_id and trip_id = p_trip;
    if not found then
      raise exception 'Dépense introuvable.';
    end if;
    delete from public.expense_shares where expense_id = v_id;
  end if;

  insert into public.expense_shares (expense_id, user_id, amount_cents)
  select v_id, (s->>'user_id')::uuid, (s->>'amount_cents')::bigint from jsonb_array_elements(p_shares) s;
  return v_id;
end;
$$;

revoke all on function public.save_expense(uuid, uuid, text, bigint, text, uuid, date, jsonb, uuid) from public, anon;
grant execute on function public.save_expense(uuid, uuid, text, bigint, text, uuid, date, jsonb, uuid) to authenticated;
