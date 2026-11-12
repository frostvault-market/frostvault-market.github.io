/* FrostVault web app. Plain JS, no build step. All user text goes through esc(). */
(() => {
'use strict';
const view = document.getElementById('view');
const toastEl = document.getElementById('toast');
const DICT = window.FV_I18N;
let lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
const t = (k, v) => String((DICT[lang] && DICT[lang][k]) ?? DICT.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (v && v[n] != null ? v[n] : ''));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const te = (k, v) => esc(t(k, v));
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const tierKey = (fc) => fc >= 9 ? 'LEGENDARY' : fc >= 5 ? 'EPIC' : fc >= 1 ? 'RARE' : 'COMMON';
const TIER_COLOR = { LEGENDARY: '#FFD23F', EPIC: '#C9A4FF', RARE: '#7FC4FF', COMMON: '#B9C6EA' };
const tierOf = (fc) => { const k = tierKey(fc); return { k, n: t('tier_' + k), c: TIER_COLOR[k] }; };
const fcLabel = (fc) => fc > 0 ? 'FC' + fc : t('fc_short_low');
const rankOf = (n) => t(n >= 20 ? 'rank_veteran' : n >= 5 ? 'rank_trusted' : 'rank_rookie');
const feePct = (price) => price < 10000 ? 5 : price < 20000 ? 3 : 2;
const CHARMS = ['1-3', '3-5', '5-7', '7-9', '9-11', '11-13', '13-15', '15-17', '17-18'];
const LOGIN = { google: 'Google Play', gamecenter: 'Game Center', facebook: 'Facebook' };
const status = (s) => t('st_' + s);
const dname = (n) => n === 'Deleted user' ? t('deleted_user') : (n || '');
const locale = () => lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
const FLAME = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#1A1430"><path d="M12 2c1 4 6 5.5 6 11a6 6 0 01-12 0c0-2.5 1-4 2.5-5.5 0 2 .8 3 2 3.5C10.5 8 10 5 12 2z"/></svg>';

let sb = null, session = null, profile = null, channel = null, browseFilter = 'ALL', browseQuery = '', userQuery = '';
let settings = { buyer_fee_pct: 0, seller_fee_pct: 0, hold_days: 3, payment_instructions: '' };
let chatRoles = {}, chatChan = 'group', chatOrder = null, chatChans = ['group'];

function toast(msg, ok) {
  toastEl.textContent = msg; toastEl.className = ok ? 'ok' : ''; toastEl.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.style.display = 'none'; }, 4500);
}
const errText = (m) => {
  const msg = String(m || '');
  if (lang === 'ar') return DICT.errors_ar[msg] || DICT.errors_ar[msg.replace(/\.$/, '')] || t('error_generic');
  return msg || t('error_generic');
};
const fail = (error) => { if (error) { toast(errText(error.message)); return true; } return false; };
const uid = () => session?.user?.id || null;
const isAdmin = () => !!profile?.is_admin;
const isStaff = () => !!(profile?.is_admin || profile?.is_mod);
const shotUrl = (path) => sb.storage.from('screenshots').getPublicUrl(path).data.publicUrl;
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

/* ---------- language ---------- */
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  const b = document.getElementById('lang-btn');
  if (b) { b.setAttribute('aria-label', t('lang_switch')); b.setAttribute('lang', lang === 'ar' ? 'en' : 'ar'); }
  const l = document.getElementById('lang-label'); if (l) l.textContent = t('lang_short');
}
function setLang(next) {
  lang = next === 'ar' ? 'ar' : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem('fv_lang', lang); } catch (e) { /* private mode: keep for this visit only */ }
  applyStatic();
  if (sb) route();
}
document.getElementById('lang-btn')?.addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
applyStatic();

/* ---------- shared pieces ---------- */
function listingCard(l) {
  const tr = tierOf(l.fc);
  return `<a class="card" href="#/listing/${esc(l.id)}" style="border-color:${tr.c}">
    <div class="row">
      <div class="emblem" style="background:${tr.c}">${FLAME}<span class="ltr">${esc(fcLabel(l.fc))}</span></div>
      <div style="flex:1;min-width:0">
        <div class="tier" style="color:${tr.c}">${esc(tr.n)}</div>
        <div class="power">${te('power', { p: l.power_m })}</div>
        <div class="small" style="color:var(--soft);font-weight:700">${te('vip_state', { v: l.vip, s: l.state })}${l.infantry ? ' · ' + te('troops_short', { t: l.infantry }) : ''}</div>
      </div>
      <div class="price">${money(l.price)}</div>
    </div>
    <div class="row between small" style="color:var(--muted);font-weight:700">
      <span>${esc(rankOf(l.seller?.trades || 0))} · ${te('trades_n', { n: l.seller?.trades || 0 })}</span>
      <span style="color:var(--ice)">${l.status === 'active' ? te('vault_protected') : esc(status(l.status))}</span>
    </div></a>`;
}
const cards = (list, emptyKey) => list.length ? `<div class="cards">${list.map(listingCard).join('')}</div>` : `<p class="muted">${te(emptyKey)}</p>`;
const needLogin = (titleKey) => `<h1>${te(titleKey)}</h1><p class="muted">${te('need_account')}</p><a class="btn" href="#/auth">${te('sign_in_or_join')}</a>`;
const backBtn = (href) => `<a class="btn2 icon-btn" href="${href}" aria-label="${te('back')}"><svg class="flip" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>`;

/* ---------- views ---------- */
async function vBrowse() {
  const { data, error } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('status', 'active').order('created_at', { ascending: false }).limit(200);
  if (fail(error)) return `<p class="muted">${te('load_listings_fail')}</p>`;
  const q = browseQuery.trim().toLowerCase();
  const rows = data.filter((l) => (browseFilter === 'ALL' || tierKey(l.fc) === browseFilter) && (!q || `${fcLabel(l.fc)} fc${l.fc} ${l.power_m}m vip${l.vip} vip ${l.vip} state ${l.state} ${l.state}`.toLowerCase().includes(q)));
  const chips = ['ALL', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'].map((c) => `<button class="chip ${browseFilter === c ? 'on' : ''}" data-act="filter" data-v="${c}" aria-pressed="${browseFilter === c}">${te('filter_' + c)}</button>`).join('');
  return `<div class="panel ice row" style="background:var(--btn2)">
      <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="#FF9A2E" style="flex-shrink:0"><path d="M12 2c1 4 6 5.5 6 11a6 6 0 01-12 0c0-2.5 1-4 2.5-5.5 0 2 .8 3 2 3.5C10.5 8 10 5 12 2z"/></svg>
      <div><h2 style="font-size:22px">${te('hero_title')}</h2><p class="muted" style="color:var(--soft)">${te('hero_sub')}</p></div>
    </div>
    <input id="q" type="search" aria-label="${te('search_label')}" placeholder="${te('search_ph')}" value="${esc(browseQuery)}">
    <div class="chips">${chips}</div>
    <h2>${te('fresh_drops')}</h2>
    ${cards(rows, 'no_listings')}`;
}

async function vListing(id) {
  const { data: l, error } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('id', id).maybeSingle();
  if (fail(error) || !l) return `${backBtn('#/')}<p class="muted">${te('listing_na')}</p>`;
  const tr = tierOf(l.fc), mine = uid() === l.seller_id, staff = isStaff();
  const claimBtn = `<a class="btn" href="#/checkout/${esc(l.id)}">${te('claim')}</a>`;
  const delBtn = `<button class="btn2 danger" data-act="adminremove" data-id="${esc(l.id)}">${te('crew_delete_listing')}</button>`;
  let cta = '';
  if (staff && l.status === 'pending') cta = `<div class="grid2"><button class="btn" data-act="review" data-id="${esc(l.id)}" data-v="active">${te('approve')}</button><button class="btn2" style="min-height:54px" data-act="review" data-id="${esc(l.id)}" data-v="rejected">${te('reject')}</button></div>${delBtn}`;
  else if (staff && ['active', 'rejected'].includes(l.status)) cta = `${l.status === 'active' && !mine ? claimBtn : ''}${delBtn}`;
  else if (staff && l.status === 'reserved') cta = `<p class="muted">${te('reserved_note')}</p>`;
  else if (mine && ['pending', 'active', 'rejected'].includes(l.status)) cta = `<button class="btn2" data-act="remove" data-id="${esc(l.id)}">${te('remove_mine')}</button>`;
  else if (l.status === 'active' && !mine) cta = uid() ? claimBtn : `<a class="btn" href="#/auth">${te('sign_in_claim')}</a>`;
  const stat = (v, k) => `<div class="stat"><b class="ltr">${esc(v || '-')}</b><span>${te(k)}</span></div>`;
  return `<div class="row between">${backBtn('#/')}<span class="tag">${esc(status(l.status))}</span></div>
    <div class="panel row" style="border-color:${tr.c};gap:14px">
      <div class="emblem big" style="background:${tr.c}">${FLAME}<span class="ltr">${esc(fcLabel(l.fc))}</span></div>
      <div style="min-width:0"><div class="tier" style="color:${tr.c}">${esc(tr.n)}</div><h1>${te('power', { p: l.power_m })}</h1><h2 class="ltr" style="font-size:24px;color:var(--ember);display:inline-block">${money(l.price)}</h2></div>
    </div>
    <div class="grid3 stats">
      ${stat(l.vip, 's_vip')}${stat(l.state, 's_state')}${stat(LOGIN[l.login_type] || l.login_type, 's_login')}${stat(l.gear_tier, 's_gear')}
      ${stat(l.charm, 's_charm')}${stat(l.infantry, 's_inf')}${stat(l.lancer, 's_lan')}${stat(l.marksman, 's_mark')}
      ${stat(l.chief_gear, 's_chief')}${stat(l.pet_power, 's_pets')}
    </div>
    ${textPanel(l.experts, 's_experts')}${textPanel(l.island, 's_island')}
    ${shotsHtml(l)}
    ${l.description ? `<div class="panel"><p style="font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext">${esc(l.description)}</p></div>` : ''}
    <div class="panel row"><div style="flex:1;min-width:0"><h2 style="font-size:17px;overflow-wrap:anywhere">${esc(dname(l.seller?.display_name) || t('seller_fallback'))}</h2><p class="small" style="color:var(--muted);font-weight:700">${esc(rankOf(l.seller?.trades || 0))} · ${te('completed_trades', { n: l.seller?.trades || 0 })}</p></div></div>
    <p class="small" style="color:var(--muted)">${te('ban_warning')} <a href="#/shield">${te('read_risks')}</a></p>
    ${cta}`;
}

function textPanel(v, k) {
  return v ? `<div class="panel"><div class="tier" style="color:var(--ice)">${te(k)}</div><p style="font-size:15px;line-height:1.45;font-weight:700;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext">${esc(v)}</p></div>` : '';
}
function shotsHtml(l) {
  const one = (p, k) => `<figure style="margin:0;flex-shrink:0;display:flex;flex-direction:column;gap:4px"><a href="${esc(shotUrl(p))}" target="_blank" rel="noopener"><img src="${esc(shotUrl(p))}" alt="${te(k)}" loading="lazy"></a>${k !== 'shot_alt' ? `<figcaption class="small" style="color:var(--ice);font-weight:800">${te(k)}</figcaption>` : ''}</figure>`;
  const named = [[l.profile_shot, 'shot_profile'], [l.gear_shot, 'shot_gear']].filter((x) => x[0]);
  const rest = (l.screenshots || []).filter((p) => p !== l.profile_shot && p !== l.gear_shot);
  return `<div class="shots">${named.map(([p, k]) => one(p, k)).join('')}${rest.map((p) => one(p, 'shot_alt')).join('')}</div>`;
}
async function vCheckout(id) {
  if (!uid()) return needLogin('claim_title');
  const { data: l, error } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
  if (fail(error) || !l || l.status !== 'active') return `${backBtn('#/')}<p class="muted">${te('no_longer')}</p>`;
  const pct = feePct(Number(l.price)), fee = Math.round(l.price * pct) / 100, tr = tierOf(l.fc);
  return `<div class="row">${backBtn('#/listing/' + esc(l.id))}<h1 style="font-size:24px">${te('lock_title')}</h1></div>
    <div class="panel ice col">
      <div><div class="tier" style="color:${tr.c}">${esc(tr.n)} · <span class="ltr">${esc(fcLabel(l.fc))}</span></div><h2 style="font-size:20px">${te('account_of', { p: l.power_m })}</h2></div>
      <div class="row between" style="font-size:14px;font-weight:700"><span style="color:var(--muted)">${te('account_price')}</span><span class="ltr">${money(l.price)}</span></div>
      <div class="row between" style="font-size:14px;font-weight:700"><span style="color:var(--muted)">${te('shield_fee', { p: pct })}</span><span class="ltr">${money(fee)}</span></div>
      <div style="height:2px;background:var(--line)"></div>
      <div class="row between"><b style="font-size:14px">${te('into_vault')}</b><h2 class="ltr" style="font-size:22px;color:var(--ember)">${money(Number(l.price) + fee)}</h2></div>
    </div>
    <div class="grid3">
      <div class="stat"><b style="color:var(--gold)">1</b><span>${te('step_pay')}</span></div>
      <div class="stat"><b style="color:var(--gold)">2</b><span>${te('step_hand')}</span></div>
      <div class="stat"><b style="color:var(--gold)">3</b><span>${te('step_confirm')}</span></div>
    </div>
    <p class="muted">${te('pay_next')}</p>
    <label class="check"><input id="risk" type="checkbox">${te('risk_check')}</label>
    <button class="btn" data-act="order" data-id="${esc(l.id)}">${te('reserve_pay')}</button>`;
}

async function vOrders() {
  if (!uid()) return needLogin('quests');
  const { data, error } = await sb.from('orders').select('*, listing:listings(fc,power_m)').or(`buyer_id.eq.${uid()},seller_id.eq.${uid()}`).order('created_at', { ascending: false });
  if (fail(error)) return `<p class="muted">${te('load_orders_fail')}</p>`;
  return `<h1>${te('quests')}</h1>${data.length ? `<div class="cards">${data.map(orderRow).join('')}</div>` : `<p class="muted">${te('no_orders')}</p>`}`;
}
function orderRow(o) {
  const role = t(o.buyer_id === uid() ? 'role_buying' : o.seller_id === uid() ? 'role_selling' : 'role_order');
  return `<a class="card" href="#/order/${esc(o.id)}"><div class="row between"><div style="min-width:0"><div class="tier" style="color:var(--ice)">${esc(role)} · <span class="ltr">#${esc(o.id.slice(0, 8))}</span></div><div class="power ltr" style="font-size:19px">${esc(fcLabel(o.listing?.fc ?? 0))} · ${esc(o.listing?.power_m ?? '?')}M</div></div><div class="price">${money(o.price)}</div></div><span class="tag" style="align-self:flex-start">${esc(status(o.status))}</span></a>`;
}

async function vOrder(id) {
  if (!uid()) return needLogin('handover');
  const { data: o, error } = await sb.from('orders').select('*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(display_name), seller:profiles!orders_seller_id_fkey(display_name)').eq('id', id).maybeSingle();
  if (fail(error) || !o) return `${backBtn('#/orders')}<p class="muted">${te('order_nf')}</p>`;
  const admin = isAdmin(), staff = isStaff(), buyer = o.buyer_id === uid(), seller = o.seller_id === uid();
  chatRoles = { [o.buyer_id]: 'role_buyer', [o.seller_id]: 'role_seller' };
  chatChans = staff ? ['group', 'seller', 'buyer'] : seller ? ['group', 'seller'] : buyer ? ['group', 'buyer'] : ['group'];
  if (chatOrder !== o.id || !chatChans.includes(chatChan)) { chatOrder = o.id; chatChan = 'group'; }
  const idx = { awaiting_payment: 0, paid: 1, seller_unbound: 2, hold: 3, completed: 5 }[o.status];
  const closed = ['cancelled', 'refunded'].includes(o.status), disputed = o.status === 'disputed';
  const total = Number(o.price) + Number(o.buyer_fee), ref = 'FV-' + o.id.slice(0, 8).toUpperCase();
  const payout = money(Number(o.price) - Number(o.seller_fee));
  const steps = [
    [t('s1t'), t('s1d')],
    [t('s2t'), t('s2d', { login: LOGIN[o.listing?.login_type] || '' })],
    [t('s3t'), t('s3d')],
    [t('s4t'), o.hold_until ? t('s4d_end', { d: new Date(o.hold_until).toLocaleString(locale()) }) : t('s4d')],
    [t('s5t'), t('s5d', { m: payout })]
  ];
  const done = idx === undefined ? 0 : Math.min(idx, 5);
  const stepHtml = steps.map((s, i) => `<div class="step ${idx !== undefined && i < idx ? 'done' : i === idx ? 'now' : ''}"><div class="n">${idx !== undefined && i < idx ? '✓' : i + 1}</div><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div></div>`).join('');
  const act = (a, label, primary) => `<button class="${primary ? 'btn' : 'btn2'}" data-act="oact" data-id="${esc(o.id)}" data-v="${a}">${esc(label)}</button>`;
  let actions = '';
  if (o.status === 'awaiting_payment') {
    if (buyer) actions += `<div class="panel warn col"><h2>${te('send_amount', { m: money(total) })}</h2><p style="font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext">${esc(settings.payment_instructions || t('pay_fallback'))}</p><p class="small" style="font-weight:800">${te('pay_ref', { r: ref })}</p></div>`;
    if (admin) actions += act('confirm_payment', t('a_confirm'), true);
    if (buyer || admin) actions += act('cancel', t('a_cancel'));
  }
  if (o.status === 'paid' && seller) actions += act('seller_unbound', t('a_unbound'), true);
  if (o.status === 'seller_unbound' && buyer) actions += act('buyer_confirm', t('a_mine'), true);
  if (admin && (o.status === 'hold' || disputed)) actions += act('release', t('a_release', { m: payout }), true);
  if (admin && ['paid', 'seller_unbound', 'hold', 'disputed'].includes(o.status)) actions += act('refund', t('a_refund'));
  if ((buyer || seller) && ['paid', 'seller_unbound', 'hold'].includes(o.status)) actions += act('dispute', t('a_dispute'));
  const title = closed ? status(o.status) : disputed ? status('disputed') : o.status === 'completed' ? t('quest_complete') : t('handover');
  const amtKey = o.status === 'completed' ? 'amt_paid' : closed ? 'amt_closed' : idx >= 1 || disputed ? 'amt_vault' : 'amt_topay';
  setTimeout(() => loadChat(o.id), 0);
  return `<div class="row">${backBtn(staff && !buyer && !seller ? '#/admin' : '#/orders')}<div style="min-width:0"><p class="small" style="color:var(--muted);font-weight:700;overflow-wrap:anywhere">${te('order_line', { r: ref, b: dname(o.buyer?.display_name), s: dname(o.seller?.display_name) })}</p><h1>${esc(title)}</h1></div></div>
    <div class="panel ice col"><div class="row between"><h2 style="font-size:20px">${te(amtKey, { m: money(total) })}</h2><b class="ltr" style="color:var(--gold);font-size:13px">${done} / 5</b></div>
      <div class="bar" role="img" aria-label="${te('progress', { d: done })}"><div style="width:${done * 20}%"></div></div></div>
    ${disputed ? `<div class="panel warn"><p style="font-size:14px;font-weight:700">${te('dispute_open')}</p></div>` : ''}
    ${closed ? '' : `<div class="col" style="gap:8px">${stepHtml}</div>`}
    <div class="col">${actions}</div>
    ${staff && !admin && !buyer && !seller ? `<p class="muted">${te('helper_note')}</p>` : ''}
    <div class="panel col"><h2>${te('chat_title')}</h2>
      <div class="chips" role="tablist">${chatChans.map((c) => `<button class="chip ${c === chatChan ? 'on' : ''}" role="tab" aria-selected="${c === chatChan}" data-act="chatchan" data-v="${c}" id="chan-${c}">${te(chanLabel(c, staff))}</button>`).join('')}</div>
      <p id="chat-note" class="small" style="color:var(--muted)">${te(chanNote(chatChan, staff))}</p>
      <div id="chat" class="chat"><p class="muted">${te('chat_loading')}</p></div>
      <form id="chat-form" class="row"><input id="chat-in" aria-label="${te('chat_label')}" maxlength="2000" placeholder="${te('chat_ph')}" autocomplete="off" dir="auto"><button class="btn2" style="width:auto;flex-shrink:0">${te('send')}</button></form></div>`;
}
const chanLabel = (c, staff) => c === 'group' ? 'chan_group' : staff ? (c === 'seller' ? 'chan_seller' : 'chan_buyer') : 'chan_private';
const chanNote = (c, staff) => c === 'group' ? 'chat_note' : staff ? (c === 'seller' ? 'note_seller_staff' : 'note_buyer_staff') : (c === 'seller' ? 'note_seller_private' : 'note_buyer_private');
async function loadChat(orderId) {
  const box = document.getElementById('chat'); if (!box) return;
  const { data, error } = await sb.from('messages').select('*, sender:profiles!messages_sender_id_fkey(display_name,is_admin,is_mod)').eq('order_id', orderId).eq('channel', chatChan).order('id');
  if (!document.getElementById('chat')) return;
  if (error) { box.innerHTML = `<p class="muted">${te('chat_fail')}</p>`; return; }
  const roleOf = (m) => chatRoles[m.sender_id] || (m.sender?.is_admin || m.sender?.is_mod ? 'role_crew' : 'role_member');
  box.innerHTML = data.map((m) => `<div class="msg ${m.sender_id === uid() ? 'me' : ''} ${m.sender?.is_admin || m.sender?.is_mod ? 'crew' : ''}"><small>${esc(dname(m.sender?.display_name))} · ${te(roleOf(m))}</small>${esc(m.body)}</div>`).join('') || `<p class="muted">${te('chat_empty')}</p>`;
  box.scrollTop = box.scrollHeight;
  if (!channel) {
    channel = sb.channel('order-' + orderId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'order_id=eq.' + orderId }, (p) => {
        const c = p.new?.channel || 'group';
        if (c === chatChan) loadChat(orderId); else document.getElementById('chan-' + c)?.classList.add('dot');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + orderId }, () => route())
      .subscribe();
  }
}

function vSell() {
  if (!uid()) return needLogin('sell_title');
  const fcOpts = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<option value="${n}">${n ? 'FC' + n : te('fc_low')}</option>`).join('');
  const choose = `<option value="">${te('choose')}</option>`;
  const troop = (n, k) => `<label>${te(k)}<select name="${n}" required>${choose}<option>T12</option><option>T11</option><option>T10</option></select></label>`;
  return `<h1>${te('sell_title')}</h1><p class="muted">${te('sell_sub')}</p>
    <form id="sell-form" class="col" style="gap:12px">
      <div class="panel grid2">
        <label>${te('f_furnace')}<select name="fc" required>${fcOpts}</select></label>
        <label>${te('f_vip')}<input name="vip" type="number" inputmode="numeric" min="0" max="20" required placeholder="12" dir="ltr"></label>
        <label>${te('f_power')}<input name="power_m" type="number" inputmode="decimal" min="0.1" step="0.1" required placeholder="610" dir="ltr"></label>
        <label>${te('f_state')}<input name="state" type="number" inputmode="numeric" min="1" max="99999" required placeholder="1412" dir="ltr"></label>
      </div>
      <div class="grid2">
        <label>${te('f_bound')}<select name="login_type" required><option value="google">Google Play</option><option value="gamecenter">Game Center</option><option value="facebook">Facebook</option></select></label>
        <label style="color:var(--ember)">${te('f_price')}<input name="price" type="number" inputmode="decimal" min="1" max="100000" step="0.01" required placeholder="720" dir="ltr" style="border-color:var(--ember)"></label>
      </div>
      <div class="panel grid2">
        <label>${te('f_gear')}<select name="gear_tier" required>${choose}<option>T1</option><option>T2</option><option>T3</option><option value="Mix">Mix</option></select></label>
        <label>${te('f_charm')}<select name="charm" required>${choose}${CHARMS.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label>${te('f_chief')}<select name="chief_gear" required>${choose}${['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Max'].map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label>${te('f_pets')}<input name="pet_power" maxlength="60" required placeholder="${te('f_pets_ph')}" dir="auto"></label>
      </div>
      <div class="panel grid3">${troop('infantry', 'f_inf')}${troop('lancer', 'f_lan')}${troop('marksman', 'f_mark')}</div>
      <p class="small" style="color:var(--muted);white-space:pre-line">${te('fee_note')}${Number(settings.seller_fee_pct) ? ' ' + te('seller_fee_note', { p: settings.seller_fee_pct }) : ''}</p>
      <label>${te('f_experts')}<textarea name="experts" maxlength="1000" placeholder="${te('f_free_ph')}" dir="auto"></textarea></label>
      <label>${te('f_island')}<textarea name="island" maxlength="1000" placeholder="${te('f_free_ph')}" dir="auto"></textarea></label>
      <label>${te('f_extra')}<textarea name="description" maxlength="1000" placeholder="${te('f_extra_ph')}" dir="auto"></textarea></label>
      <div class="panel col">
        <label>${te('f_shot_profile')}<input name="shot_profile" type="file" accept="image/jpeg,image/png,image/webp" required></label>
        <label>${te('f_shot_gear')}<input name="shot_gear" type="file" accept="image/jpeg,image/png,image/webp" required></label>
        <label>${te('f_shots_more')}<input name="shots" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
      </div>
      <label class="check"><input name="attested" type="checkbox" required>${te('attest')}</label>
      <button class="btn">${te('send_review')}</button>
    </form>`;
}

function vShield() {
  const li = (c, s) => `<p style="font-size:14px;line-height:1.45;font-weight:700"><span style="color:${c};font-weight:800">${c === 'var(--ice)' ? '✓' : '!'}</span> ${esc(s)}</p>`;
  return `<h1>${te('shield_title')}</h1><p class="muted">${te('shield_sub')}</p>
    <div class="panel ice col"><h2 style="color:var(--ice)">${te('blocks')}</h2>${[t('b1'), t('b2'), t('b3', { d: settings.hold_days }), t('b4')].map((s) => li('var(--ice)', s)).join('')}</div>
    <div class="panel warn col"><h2 style="color:var(--ember)">${te('cant')}</h2>${[t('n1'), t('n2'), t('n3')].map((s) => li('var(--ember)', s)).join('')}</div>
    <div class="panel col"><h2>${te('how')}</h2><p class="muted" style="color:var(--soft)">${te('how_d')}</p></div>
    <p class="small" style="color:var(--muted)">${te('problem')}</p>
    <p class="small" style="color:var(--muted)">${te('disclaimer')}</p>`;
}

let authMode = 'in';
function vAuth() {
  if (uid()) { setTimeout(() => go('#/me'), 0); return ''; }
  const up = authMode === 'up';
  return `<img class="hero-logo" src="logo.webp" alt="FrostVault" width="150" height="150"><h1 style="text-align:center">${te(up ? 'join' : 'welcome')}</h1>
    <form id="auth-form" class="panel col">
      ${up ? `<label>${te('f_name')}<input name="name" required minlength="2" maxlength="24" autocomplete="nickname" dir="auto"></label>` : ''}
      <label>${te('f_email')}<input name="email" type="email" required autocomplete="email" dir="ltr"></label>
      <label>${te('f_pass')}<input name="password" type="password" required minlength="8" autocomplete="${up ? 'new-password' : 'current-password'}" dir="ltr"></label>
      <button class="btn">${te(up ? 'create' : 'signin')}</button>
    </form>
    <button class="btn2" data-act="authmode">${te(up ? 'have_acc' : 'new_here')}</button>`;
}

async function vMe() {
  if (!uid()) { setTimeout(() => go('#/auth'), 0); return ''; }
  const { data } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('seller_id', uid()).neq('status', 'removed').order('created_at', { ascending: false });
  return `<h1 style="overflow-wrap:anywhere">${esc(profile?.display_name || t('chief'))}</h1><p class="muted">${esc(rankOf(profile?.trades || 0))} · ${te('completed_trades', { n: profile?.trades || 0 })} · <span class="ltr">${esc(session.user.email)}</span></p>
    ${isStaff() ? `<a class="btn" href="#/admin">${te('crew_panel')}</a>` : ''}
    <h2>${te('my_listings')}</h2>${cards(data || [], 'nothing_listed')}
    <button class="btn2" data-act="signout">${te('signout')}</button>`;
}

function userRow(u) {
  const me = u.id === uid();
  const roleKey = u.closed ? 'r_closed' : u.is_admin ? 'r_admin' : u.is_mod ? 'r_helper' : 'r_member';
  const roleStyle = u.closed ? 'border-color:#C65A5A;color:#FF9B9B' : u.is_admin ? 'border-color:var(--gold);color:var(--gold)' : u.is_mod ? 'border-color:var(--ice);color:var(--ice)' : '';
  const buttons = (u.is_admin || u.closed || me) ? '' : `<div class="grid2">
      <button class="btn2" data-act="helper" data-id="${esc(u.id)}" data-v="${u.is_mod ? 'off' : 'on'}">${te(u.is_mod ? 'remove_helper' : 'make_helper')}</button>
      <button class="btn2 danger" data-act="deluser" data-id="${esc(u.id)}" data-name="${esc(u.display_name)}">${te('delete_acc')}</button></div>`;
  return `<div class="panel col" style="gap:8px;min-width:0"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><h2 style="font-size:17px;overflow-wrap:anywhere">${esc(dname(u.display_name))}${me ? ` <span class="small" style="color:var(--muted)">(${te('r_you')})</span>` : ''}</h2><p class="small ltr" style="color:var(--muted);font-weight:700;overflow-wrap:anywhere;display:block">${esc(u.email)}</p></div><span class="tag" style="flex-shrink:0;${roleStyle}">${te(roleKey)}</span></div>
    <p class="small" style="color:var(--muted)">${te('joined', { n: u.trades, d: new Date(u.created_at).toLocaleDateString(locale()) })}</p>${buttons}</div>`;
}
function renderUsers() {
  const box = document.getElementById('user-list'); if (!box) return;
  const q = userQuery.trim().toLowerCase();
  const list = (vAdmin.users || []).filter((u) => !q || `${u.display_name} ${u.email}`.toLowerCase().includes(q));
  box.innerHTML = list.length ? list.map(userRow).join('') : `<p class="muted">${te('no_accounts')}</p>`;
}
async function vAdmin() {
  if (!isStaff()) return `<h1>${te('crew_only')}</h1><p class="muted">${te('crew_only_d')}</p>`;
  const [pend, ords, usersRes] = await Promise.all([
    sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('status', 'pending').order('created_at'),
    sb.from('orders').select('*, listing:listings(fc,power_m)').in('status', ['awaiting_payment', 'paid', 'seller_unbound', 'hold', 'disputed']).order('updated_at'),
    isAdmin() ? sb.rpc('admin_list_users') : Promise.resolve({ data: [] })
  ]);
  const s = settings, users = Array.isArray(usersRes.data) ? usersRes.data : [];
  vAdmin.users = users;
  const pendList = pend.data || [], ordList = ords.data || [];
  const common = `<h2>${te('to_review', { n: pendList.length })}</h2>${cards(pendList, 'nothing_waiting')}
    <h2>${te('open_orders', { n: ordList.length })}</h2>${ordList.length ? `<div class="cards">${ordList.map(orderRow).join('')}</div>` : `<p class="muted">${te('no_open')}</p>`}`;
  if (!isAdmin()) return `<h1>${te('panel')}</h1><p class="muted">${te('helper_intro')}</p>${common}`;
  setTimeout(renderUsers, 0);
  return `<h1>${te('panel')}</h1>${common}
    <h2>${te('accounts', { n: users.length })}</h2>
    <p class="small" style="color:var(--muted)">${te('helpers_note')}</p>
    <input id="uq" type="search" aria-label="${te('accounts_search')}" placeholder="${te('accounts_search')}" value="${esc(userQuery)}" dir="auto">
    <div id="user-list" class="cards"></div>
    <h2>${te('settings')}</h2>
    <form id="settings-form" class="panel col">
      <p class="small" style="color:var(--muted);white-space:pre-line">${te('fee_fixed')}</p>
      <div class="grid2">
        <label>${te('s_seller_fee')}<input name="seller_fee_pct" type="number" min="0" max="50" step="0.01" required value="${esc(s.seller_fee_pct)}" dir="ltr"></label>
        <label>${te('s_hold')}<input name="hold_days" type="number" min="0" max="30" required value="${esc(s.hold_days)}" dir="ltr"></label>
      </div>
      <label>${te('s_pay')}<textarea name="payment_instructions" maxlength="2000" placeholder="${te('s_pay_ph')}" dir="auto">${esc(s.payment_instructions)}</textarea></label>
      <button class="btn2">${te('save')}</button>
    </form>`;
}

/* ---------- router ---------- */
async function route() {
  if (channel) { sb.removeChannel(channel); channel = null; }
  const [, name = '', arg = ''] = location.hash.split('/');
  const tab = { '': 'browse', listing: 'browse', checkout: 'browse', sell: 'sell', orders: 'orders', order: 'orders', shield: 'shield' }[name];
  document.querySelectorAll('nav a').forEach((a) => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  const views = { '': vBrowse, listing: vListing, checkout: vCheckout, sell: vSell, orders: vOrders, order: vOrder, shield: vShield, auth: vAuth, me: vMe, admin: vAdmin };
  const token = route.token = Symbol();
  try {
    const html = await (views[name] || vBrowse)(arg);
    if (route.token === token) view.innerHTML = html;
  } catch (e) { console.error(e); view.innerHTML = `<p class="muted">${te('load_fail')}</p>`; }
}

/* ---------- actions ---------- */
const ask = (k, v) => window.confirm(t(k, v));
const actions = {
  filter: (el) => { browseFilter = el.dataset.v; route(); },
  chatchan: (el) => {
    chatChan = el.dataset.v;
    document.querySelectorAll('[data-act=chatchan]').forEach((b) => { const on = b.dataset.v === chatChan; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) b.classList.remove('dot'); });
    const staff = isStaff(), note = document.getElementById('chat-note'); if (note) note.textContent = t(chanNote(chatChan, staff));
    const box = document.getElementById('chat'); if (box) box.innerHTML = `<p class="muted">${te('chat_loading')}</p>`;
    loadChat(chatOrder);
  },
  authmode: () => { authMode = authMode === 'in' ? 'up' : 'in'; route(); },
  signout: async () => { await sb.auth.signOut(); go('#/'); },
  order: async (el) => {
    if (!document.getElementById('risk')?.checked) return toast(t('risk_needed'));
    const { data, error } = await sb.rpc('create_order', { p_listing: el.dataset.id });
    if (!fail(error)) go('#/order/' + data);
  },
  oact: async (el) => {
    const a = el.dataset.v;
    if (['cancel', 'dispute', 'buyer_confirm', 'release', 'refund', 'confirm_payment'].includes(a) && !ask('c_' + a)) return;
    const { error } = await sb.rpc('order_action', { p_order: el.dataset.id, p_action: a });
    if (!fail(error)) route();
  },
  review: async (el) => {
    const { error } = await sb.from('listings').update({ status: el.dataset.v }).eq('id', el.dataset.id);
    if (!fail(error)) { toast(t(el.dataset.v === 'active' ? 'listing_live' : 'listing_rejected'), true); go('#/admin'); }
  },
  helper: async (el) => {
    const on = el.dataset.v === 'on';
    if (!ask(on ? 'c_helper_on' : 'c_helper_off')) return;
    const { error } = await sb.rpc('admin_set_helper', { p_user: el.dataset.id, p_on: on });
    if (!fail(error)) { toast(t(on ? 'helper_added' : 'helper_removed'), true); route(); }
  },
  deluser: async (el) => {
    if (!ask('c_delete_acc', { name: el.dataset.name })) return;
    const { data, error } = await sb.rpc('admin_delete_user', { p_user: el.dataset.id });
    if (!fail(error)) { toast(t(data === 'deleted' ? 'acc_deleted' : 'acc_closed'), true); route(); }
  },
  adminremove: async (el) => {
    if (!ask('c_del_listing')) return;
    const { data, error } = await sb.from('listings').update({ status: 'removed' }).eq('id', el.dataset.id).in('status', ['pending', 'active', 'rejected']).select('id');
    if (fail(error)) return;
    if (!data?.length) return toast(t('del_fail'));
    toast(t('listing_deleted'), true); go('#/admin');
  },
  remove: async (el) => {
    if (!ask('c_remove')) return;
    const { error } = await sb.rpc('remove_listing', { p_listing: el.dataset.id });
    if (!fail(error)) go('#/me');
  }
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  e.preventDefault(); el.disabled = true;
  Promise.resolve(actions[el.dataset.act]?.(el)).finally(() => { el.disabled = false; });
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'uq') { userQuery = e.target.value; renderUsers(); return; }
  if (e.target.id !== 'q') return;
  browseQuery = e.target.value; clearTimeout(route.q);
  route.q = setTimeout(async () => { await route(); const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350);
});
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, btn = f.querySelector('button'), fd = new FormData(f);
  if (btn.disabled) return; btn.disabled = true;
  try {
    if (f.id === 'auth-form') {
      const email = fd.get('email').trim(), password = fd.get('password');
      if (authMode === 'up') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: fd.get('name').trim() }, emailRedirectTo: location.origin + location.pathname } });
        if (error && (error.status === 429 || /rate limit/i.test(error.message || ''))) toast(t('rate'));
        else if (!fail(error)) { if (data.session) go('#/'); else toast(t('check_email'), true); }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (!fail(error)) go('#/');
      }
    } else if (f.id === 'chat-form') {
      const body = document.getElementById('chat-in').value.trim(), orderId = location.hash.split('/')[2];
      if (body) { const { error } = await sb.from('messages').insert({ order_id: orderId, body, channel: chatChan }); if (!fail(error)) { f.reset(); loadChat(orderId); } }
    } else if (f.id === 'sell-form') {
      const prof = fd.get('shot_profile'), gear = fd.get('shot_gear');
      if (!prof?.size || !gear?.size) return toast(t('shots_required'));
      const more = fd.getAll('shots').filter((x) => x && x.size);
      if (more.length > 4) return toast(t('shots_count'));
      const files = [prof, gear, ...more];
      if (files.some((x) => x.size > 3 * 1024 * 1024)) return toast(t('shots_size'));
      const paths = [];
      for (const file of files) {
        const ext = { 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'jpg';
        const path = `${uid()}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from('screenshots').upload(path, file, { contentType: file.type || 'image/jpeg' });
        if (fail(error)) return; paths.push(path);
      }
      const { error } = await sb.from('listings').insert({ fc: +fd.get('fc'), vip: +fd.get('vip'), power_m: +fd.get('power_m'), state: +fd.get('state'), login_type: fd.get('login_type'), price: +fd.get('price'), description: (fd.get('description') || '').trim(), gear_tier: fd.get('gear_tier'), charm: fd.get('charm'), chief_gear: fd.get('chief_gear'), pet_power: (fd.get('pet_power') || '').trim(), experts: (fd.get('experts') || '').trim(), island: (fd.get('island') || '').trim(), profile_shot: paths[0], gear_shot: paths[1], infantry: fd.get('infantry'), lancer: fd.get('lancer'), marksman: fd.get('marksman'), screenshots: paths, attested: true });
      if (!fail(error)) { toast(t('sent_review'), true); go('#/me'); }
    } else if (f.id === 'settings-form') {
      const patch = { seller_fee_pct: +fd.get('seller_fee_pct'), hold_days: +fd.get('hold_days'), payment_instructions: fd.get('payment_instructions').trim() };
      const { error } = await sb.from('settings').update(patch).eq('id', 1);
      if (!fail(error)) { Object.assign(settings, patch); toast(t('saved'), true); }
    }
  } finally { btn.disabled = false; }
});

/* ---------- boot ---------- */
async function loadProfile() {
  profile = null;
  if (uid()) { const { data } = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle(); profile = data; }
  document.getElementById('me-btn').setAttribute('href', uid() ? '#/me' : '#/auth');
}
setTimeout(() => document.getElementById('splash')?.remove(), 2800);
async function boot() {
  const c = window.FV_CONFIG || {};
  if (!window.supabase || !/^https:\/\//.test(c.SUPABASE_URL || '') || !c.SUPABASE_KEY || c.SUPABASE_KEY.startsWith('PASTE')) {
    view.innerHTML = `<h1>${te('setup')}</h1><p class="muted">${te('setup_d')}</p>`; return;
  }
  sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_KEY);
  session = (await sb.auth.getSession()).data.session;
  const s = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
  if (s.data) settings = s.data;
  await loadProfile();
  sb.auth.onAuthStateChange((_evt, sess) => {
    const changed = (sess?.user?.id || null) !== uid(); session = sess;
    if (changed) setTimeout(async () => { await loadProfile(); route(); }, 0);
  });
  window.addEventListener('hashchange', route);
  route();
}
boot();
})();
