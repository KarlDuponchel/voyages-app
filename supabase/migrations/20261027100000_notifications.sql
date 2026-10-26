-- =====================================================================
-- Notifications sur le téléphone (Web Push)
--
-- Chaque appareil qui active les notifications enregistre ici son « abonnement »
-- (adresse du service de notification d'Apple ou de Google, et clés de chiffrement).
-- Les fonctions serveur l'utilisent pour prévenir, par exemple, qu'un e-mail transféré a été analysé.
-- =====================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  -- Adresse unique de l'appareil chez le service de notification (toujours en https)
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  -- Pour s'y retrouver dans le profil (« iPhone », « Android »…)
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "mes appareils" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "retirer un appareil" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
-- L'ajout passe par save_push_subscription (un appareil peut changer de compte)
revoke insert, update on public.push_subscriptions from authenticated;
revoke all on public.push_subscriptions from anon;

-- Enregistre l'appareil pour l'utilisateur connecté. Si le même appareil était rattaché à un autre
-- compte (déconnexion puis connexion avec un autre e-mail), il passe au nouveau compte.
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if p_endpoint is null or p_endpoint not like 'https://%' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Abonnement invalide';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
