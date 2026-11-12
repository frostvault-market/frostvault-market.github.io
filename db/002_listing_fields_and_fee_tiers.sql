-- Applied 2026-11-12: extra listing fields and tiered buyer fee.
alter table public.listings
  add column gear_tier text check (gear_tier in ('T1','T2','T3','Mix')),
  add column charm text check (charm in ('1-3','3-5','5-7','7-9','9-11','11-13','13-15','15-17','17-18')),
  add column chief_gear text not null default '' check (char_length(chief_gear) <= 60),
  add column infantry text check (infantry in ('T12','T11','T10')),
  add column lancer text check (lancer in ('T12','T11','T10')),
  add column marksman text check (marksman in ('T12','T11','T10'));

-- Buyer fee: 5% under 10,000, 3% from 10,000 to 19,999, 2% from 20,000.
create function public.fee_pct(p_price numeric) returns numeric
language sql immutable set search_path = public as $$
  select case when p_price < 10000 then 5 when p_price < 20000 then 3 else 2 end::numeric
$$;
-- create_order now uses public.fee_pct(price) for buyer_fee (see Supabase migration history for the full body).
