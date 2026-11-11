-- FrostVault database. Run this ONCE in Supabase: SQL Editor > New query > paste > Run.

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  is_admin boolean not null default false,
  trades int not null default 0,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  buyer_fee_pct numeric(5,2) not null default 5 check (buyer_fee_pct between 0 and 50),
  seller_fee_pct numeric(5,2) not null default 0 check (seller_fee_pct between 0 and 50),
  hold_days int not null default 3 check (hold_days between 0 and 30),
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 2000)
);
insert into public.settings (id) values (1);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid(),
  fc int not null check (fc between 0 and 10),
  power_m numeric(8,1) not null check (power_m > 0),
  vip int not null check (vip between 0 and 20),
  state int not null check (state between 1 and 99999),
  login_type text not null check (login_type in ('google','gamecenter','facebook')),
  price numeric(10,2) not null check (price between 1 and 100000),
  description text not null default '' check (char_length(description) <= 1000),
  screenshots text[] not null check (cardinality(screenshots) between 1 and 6),
  attested boolean not null check (attested),
  status text not null default 'pending'
    check (status in ('pending','active','reserved','sold','rejected','removed')),
  created_at timestamptz not null default now(),
  constraint listings_seller_id_fkey foreign key (seller_id) references public.profiles(id)
);
create index on public.listings (status, created_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  buyer_id uuid not null,
  seller_id uuid not null,
  price numeric(10,2) not null,
  buyer_fee numeric(10,2) not null default 0,
  seller_fee numeric(10,2) not null default 0,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','paid','seller_unbound','hold','completed','disputed','cancelled','refunded')),
  hold_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_listing_id_fkey foreign key (listing_id) references public.listings(id),
  constraint orders_buyer_id_fkey foreign key (buyer_id) references public.profiles(id),
  constraint orders_seller_id_fkey foreign key (seller_id) references public.profiles(id)
);
-- only one open order per listing
create unique index orders_one_open_per_listing on public.orders (listing_id)
  where status not in ('cancelled','refunded','completed');

create table public.messages (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  sender_id uuid not null default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id) references public.profiles(id)
);
create index on public.messages (order_id, id);

-- ---------- helpers ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false)
$$;

-- every new sign-up gets a profile row
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  n := left(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), 24);
  if char_length(n) < 2 then n := 'Chief' || substr(new.id::text, 1, 6); end if;
  insert into public.profiles (id, display_name) values (new.id, n);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.listings enable row level security;
alter table public.orders   enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles, public.settings, public.listings, public.orders, public.messages
  from anon, authenticated;

-- profiles: public names, each user may rename only themselves (never is_admin / trades)
grant select on public.profiles to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_rename on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- settings: everyone reads, only admin edits
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- orders: only buyer, seller and admin can see. All changes go through functions below.
grant select on public.orders to authenticated;
create policy orders_read on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

-- listings: public sees active ones; seller sees own; buyer sees the one they ordered
grant select on public.listings to anon, authenticated;
grant insert, update on public.listings to authenticated;
create policy listings_read_public on public.listings for select to anon
  using (status = 'active');
create policy listings_read on public.listings for select to authenticated
  using (
    status = 'active'
    or seller_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.orders o where o.listing_id = listings.id and o.buyer_id = auth.uid())
  );
create policy listings_create on public.listings for insert to authenticated
  with check (seller_id = auth.uid() and status = 'pending');
create policy listings_admin on public.listings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- messages: order participants and admin
grant select, insert on public.messages to authenticated;
grant usage on sequence public.messages_id_seq to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (exists (select 1 from public.orders o where o.id = messages.order_id
                 and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin())));
create policy messages_send on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = messages.order_id
                and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin())));

-- ---------- actions (the only way to change an order) ----------
create function public.remove_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update listings set status = 'removed'
   where id = p_listing and seller_id = auth.uid() and status in ('pending','active','rejected');
  if not found then raise exception 'This listing cannot be removed right now'; end if;
end $$;

create function public.create_order(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare l listings; s settings; uid uuid := auth.uid(); oid uuid;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select * into l from listings where id = p_listing for update;
  if not found or l.status <> 'active' then raise exception 'This account is no longer available'; end if;
  if l.seller_id = uid then raise exception 'You cannot buy your own listing'; end if;
  if (select count(*) from orders where buyer_id = uid and status = 'awaiting_payment') >= 2 then
    raise exception 'Finish or cancel your unpaid orders first';
  end if;
  select * into s from settings where id = 1;
  insert into orders (listing_id, buyer_id, seller_id, price, buyer_fee, seller_fee)
  values (l.id, uid, l.seller_id, l.price,
          round(l.price * s.buyer_fee_pct / 100, 2), round(l.price * s.seller_fee_pct / 100, 2))
  returning id into oid;
  update listings set status = 'reserved' where id = l.id;
  return oid;
end $$;

create function public.order_action(p_order uuid, p_action text) returns text
language plpgsql security definer set search_path = public as $$
declare o orders; uid uuid := auth.uid(); adm boolean := public.is_admin(); nxt text; hd int;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (adm or uid = o.buyer_id or uid = o.seller_id) then raise exception 'Not your order'; end if;

  if p_action = 'confirm_payment' and adm and o.status = 'awaiting_payment' then
    nxt := 'paid';
  elsif p_action = 'seller_unbound' and uid = o.seller_id and o.status = 'paid' then
    nxt := 'seller_unbound';
  elsif p_action = 'buyer_confirm' and uid = o.buyer_id and o.status = 'seller_unbound' then
    nxt := 'hold';
    select hold_days into hd from settings where id = 1;
    update orders set hold_until = now() + make_interval(days => hd) where id = o.id;
  elsif p_action = 'release' and adm and o.status in ('hold','disputed') then
    nxt := 'completed';
    update listings set status = 'sold' where id = o.listing_id;
    update profiles set trades = trades + 1 where id = o.seller_id;
  elsif p_action = 'refund' and adm and o.status in ('paid','seller_unbound','hold','disputed') then
    nxt := 'refunded';
    update listings set status = 'removed' where id = o.listing_id;
  elsif p_action = 'dispute' and (uid = o.buyer_id or uid = o.seller_id)
        and o.status in ('paid','seller_unbound','hold') then
    nxt := 'disputed';
  elsif p_action = 'cancel' and o.status = 'awaiting_payment' and (adm or uid = o.buyer_id) then
    nxt := 'cancelled';
    update listings set status = 'active' where id = o.listing_id;
  else
    raise exception 'That step is not available right now';
  end if;

  update orders set status = nxt, updated_at = now() where id = o.id;
  return nxt;
end $$;

revoke execute on function public.remove_listing(uuid), public.create_order(uuid),
  public.order_action(uuid, text) from public, anon;
grant execute on function public.remove_listing(uuid), public.create_order(uuid),
  public.order_action(uuid, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- live chat / order updates ----------
alter publication supabase_realtime add table public.messages, public.orders;

-- ---------- screenshots storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy screenshots_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- AFTER you sign up in the app, make yourself admin (edit the email, run separately) ----------
-- update public.profiles set is_admin = true
--  where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
