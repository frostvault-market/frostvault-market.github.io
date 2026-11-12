/* FrostVault web app. Plain JS, no build step. All user text goes through esc(). */
(() => {
'use strict';
const view = document.getElementById('view');
const toastEl = document.getElementById('toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
const tierOf = (fc) => fc >= 9 ? { n: 'LEGENDARY', c: '#FFD23F' } : fc >= 5 ? { n: 'EPIC', c: '#C9A4FF' } : fc >= 1 ? { n: 'RARE', c: '#7FC4FF' } : { n: 'COMMON', c: '#B9C6EA' };
const fcLabel = (fc) => fc > 0 ? 'FC' + fc : 'Lv 30';
const rankOf = (t) => t >= 20 ? 'Veteran trader' : t >= 5 ? 'Trusted trader' : 'Rookie trader';
const feePct = (price) => price < 10000 ? 5 : price < 20000 ? 3 : 2;
const CHARMS = ['1-3', '3-5', '5-7', '7-9', '9-11', '11-13', '13-15', '15-17', '17-18'];
const LOGIN = { google: 'Google Play', gamecenter: 'Game Center', facebook: 'Facebook' };
const STATUS = { awaiting_payment: 'Waiting for payment', paid: 'Payment locked', seller_unbound: 'Seller unbound', hold: 'Hold period', completed: 'Completed', disputed: 'In dispute', cancelled: 'Cancelled', refunded: 'Refunded', pending: 'In review', active: 'Live', reserved: 'Reserved', sold: 'Sold', rejected: 'Rejected', removed: 'Removed' };
const FLAME = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#1A1430"><path d="M12 2c1 4 6 5.5 6 11a6 6 0 01-12 0c0-2.5 1-4 2.5-5.5 0 2 .8 3 2 3.5C10.5 8 10 5 12 2z"/></svg>';

let sb = null, session = null, profile = null, channel = null, browseFilter = 'ALL', browseQuery = '';
let settings = { buyer_fee_pct: 0, seller_fee_pct: 0, hold_days: 3, payment_instructions: '' };

function toast(msg, ok) {
  toastEl.textContent = msg; toastEl.className = ok ? 'ok' : ''; toastEl.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.style.display = 'none'; }, 4500);
}
const fail = (error) => { if (error) { toast(error.message || 'Something went wrong'); return true; } return false; };
const uid = () => session?.user?.id || null;
const isAdmin = () => !!profile?.is_admin;
const isStaff = () => !!(profile?.is_admin || profile?.is_mod);
let chatRoles = {};
const shotUrl = (path) => sb.storage.from('screenshots').getPublicUrl(path).data.publicUrl;
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

/* ---------- shared pieces ---------- */
function listingCard(l) {
  const t = tierOf(l.fc);
  return `<a class="card" href="#/listing/${esc(l.id)}" style="border-color:${t.c}">
    <div class="row">
      <div class="emblem" style="background:${t.c}">${FLAME}${esc(fcLabel(l.fc))}</div>
      <div style="flex:1;min-width:0">
        <div class="tier" style="color:${t.c}">${t.n}</div>
        <div class="power">${esc(l.power_m)}M Power</div>
        <div class="small" style="color:var(--soft);font-weight:700">VIP ${esc(l.vip)} · State ${esc(l.state)}${l.infantry ? ' · Troops ' + esc(l.infantry) : ''}</div>
      </div>
      <div class="price">${money(l.price)}</div>
    </div>
    <div class="row between small" style="color:var(--muted);font-weight:700">
      <span>${esc(rankOf(l.seller?.trades || 0))} · ${esc(l.seller?.trades || 0)} trades</span>
      <span style="color:var(--ice)">${l.status === 'active' ? 'Vault protected' : esc(STATUS[l.status] || l.status)}</span>
    </div></a>`;
}
const needLogin = (what) => `<h1>${esc(what)}</h1><p class="muted">You need an account for this.</p><a class="btn" href="#/auth">SIGN IN OR JOIN</a>`;
const backBtn = (href) => `<a class="btn2 icon-btn" href="${href}" aria-label="Back"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></a>`;

/* ---------- views ---------- */
async function vBrowse() {
  const { data, error } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('status', 'active').order('created_at', { ascending: false }).limit(200);
  if (fail(error)) return '<p class="muted">Could not load listings.</p>';
  const q = browseQuery.trim().toLowerCase();
  const rows = data.filter((l) => (browseFilter === 'ALL' || tierOf(l.fc).n === browseFilter) && (!q || `${fcLabel(l.fc)} ${l.power_m}m vip${l.vip} vip ${l.vip} state ${l.state} ${l.state}`.toLowerCase().includes(q)));
  const chips = ['ALL', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON'].map((c) => `<button class="chip ${browseFilter === c ? 'on' : ''}" data-act="filter" data-v="${c}" aria-pressed="${browseFilter === c}">${c[0] + c.slice(1).toLowerCase()}</button>`).join('');
  return `<div class="panel ice row" style="background:var(--btn2)">
      <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="#FF9A2E" style="flex-shrink:0"><path d="M12 2c1 4 6 5.5 6 11a6 6 0 01-12 0c0-2.5 1-4 2.5-5.5 0 2 .8 3 2 3.5C10.5 8 10 5 12 2z"/></svg>
      <div><h2 style="font-size:22px;line-height:26px">Skip the grind. Trade safe.</h2><p class="muted" style="color:var(--soft)">Whiteout Survival accounts, every deal locked in the vault.</p></div>
    </div>
    <input id="q" type="search" aria-label="Search accounts" placeholder="Search furnace, state, power" value="${esc(browseQuery)}">
    <div class="chips">${chips}</div>
    <h2>Fresh drops</h2>
    <div class="col" style="gap:12px">${rows.map(listingCard).join('') || '<p class="muted">No accounts here yet. Be the first to list one.</p>'}</div>`;
}

async function vListing(id) {
  const { data: l, error } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('id', id).maybeSingle();
  if (fail(error) || !l) return `${backBtn('#/')}<p class="muted">This listing is not available.</p>`;
  const t = tierOf(l.fc), mine = uid() === l.seller_id, admin = isStaff();
  let cta = '';
  if (admin && l.status === 'pending') cta = `<div class="grid2"><button class="btn" data-act="review" data-id="${esc(l.id)}" data-v="active">APPROVE</button><button class="btn2" style="min-height:54px" data-act="review" data-id="${esc(l.id)}" data-v="rejected">Reject</button></div><button class="btn2" data-act="adminremove" data-id="${esc(l.id)}">Delete this listing (crew)</button>`;
  else if (admin && ['active', 'rejected'].includes(l.status)) cta = `<button class="btn2" data-act="adminremove" data-id="${esc(l.id)}">Delete this listing (crew)</button>${l.status === 'active' && !mine ? `<a class="btn" href="#/checkout/${esc(l.id)}">CLAIM THIS ACCOUNT</a>` : ''}`;
  else if (admin && l.status === 'reserved') cta = '<p class="muted">This listing has an open order. Cancel or refund the order first, then you can delete it.</p>';
  else if (mine && ['pending', 'active', 'rejected'].includes(l.status)) cta = `<button class="btn2" data-act="remove" data-id="${esc(l.id)}">Remove my listing</button>`;
  else if (l.status === 'active' && !mine) cta = uid() ? `<a class="btn" href="#/checkout/${esc(l.id)}">CLAIM THIS ACCOUNT</a>` : `<a class="btn" href="#/auth">SIGN IN TO CLAIM</a>`;
  return `<div class="row between">${backBtn('#/')}<span class="tag">${esc(STATUS[l.status] || l.status)}</span></div>
    <div class="panel row" style="border-color:${t.c};gap:14px">
      <div class="emblem big" style="background:${t.c}">${FLAME}${esc(fcLabel(l.fc))}</div>
      <div><div class="tier" style="color:${t.c}">${t.n}</div><h1>${esc(l.power_m)}M Power</h1><h2 style="font-size:24px;color:var(--ember)">${money(l.price)}</h2></div>
    </div>
    <div class="grid3">
      <div class="stat"><b>${esc(l.vip)}</b><span>VIP</span></div>
      <div class="stat"><b>${esc(l.state)}</b><span>STATE</span></div>
      <div class="stat"><b>${esc(LOGIN[l.login_type] || l.login_type)}</b><span>LOGIN</span></div>
      <div class="stat"><b>${esc(l.gear_tier || '-')}</b><span>GEAR</span></div>
      <div class="stat"><b>${esc(l.charm || '-')}</b><span>CHARM</span></div>
      <div class="stat"><b>${esc(l.infantry || '-')}</b><span>INFANTRY</span></div>
      <div class="stat"><b>${esc(l.lancer || '-')}</b><span>LANCERS</span></div>
      <div class="stat"><b>${esc(l.marksman || '-')}</b><span>MARKSMEN</span></div>
    </div>
    ${l.chief_gear ? `<div class="panel"><div class="tier" style="color:var(--ice)">CHIEF GEAR</div><p style="font-size:15px;line-height:21px;font-weight:700;overflow-wrap:anywhere">${esc(l.chief_gear)}</p></div>` : ''}
    <div class="shots">${(l.screenshots || []).map((p) => `<a href="${esc(shotUrl(p))}" target="_blank" rel="noopener"><img src="${esc(shotUrl(p))}" alt="In-game screenshot" loading="lazy"></a>`).join('')}</div>
    ${l.description ? `<div class="panel"><p style="font-size:14px;line-height:20px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(l.description)}</p></div>` : ''}
    <div class="panel row"><div style="flex:1"><h2 style="font-size:17px">${esc(l.seller?.display_name || 'Seller')}</h2><p class="small" style="color:var(--muted);font-weight:700">${esc(rankOf(l.seller?.trades || 0))} · ${esc(l.seller?.trades || 0)} completed trades</p></div></div>
    <p class="small" style="color:var(--muted)">Heads up: account trading breaks the game publisher's terms and can get an account banned. <a href="#/shield">Read the risks</a></p>
    ${cta}`;
}

async function vCheckout(id) {
  if (!uid()) return needLogin('Claim this account');
  const { data: l, error } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
  if (fail(error) || !l || l.status !== 'active') return `${backBtn('#/')}<p class="muted">This account is no longer available.</p>`;
  const pct = feePct(Number(l.price)), fee = Math.round(l.price * pct) / 100, t = tierOf(l.fc);
  return `<div class="row">${backBtn('#/listing/' + esc(l.id))}<h1 style="font-size:24px">Lock it in the vault</h1></div>
    <div class="panel ice col">
      <div><div class="tier" style="color:${t.c}">${t.n} · ${esc(fcLabel(l.fc))}</div><h2 style="font-size:20px">${esc(l.power_m)}M Power account</h2></div>
      <div class="row between" style="font-size:14px;font-weight:700"><span style="color:var(--muted)">Account price</span><span>${money(l.price)}</span></div>
      <div class="row between" style="font-size:14px;font-weight:700"><span style="color:var(--muted)">Shield fee (${pct}%)</span><span>${money(fee)}</span></div>
      <div style="height:2px;background:var(--line)"></div>
      <div class="row between"><b style="font-size:14px">Goes into the vault</b><h2 style="font-size:22px;color:var(--ember)">${money(Number(l.price) + fee)}</h2></div>
    </div>
    <div class="grid3">
      <div class="stat"><b style="color:var(--gold)">1</b><span>You pay the crew</span></div>
      <div class="stat"><b style="color:var(--gold)">2</b><span>Seller hands over</span></div>
      <div class="stat"><b style="color:var(--gold)">3</b><span>You confirm, seller is paid</span></div>
    </div>
    <p class="muted">Payment details appear on the next screen. The account is reserved for you while you pay.</p>
    <label class="check"><input id="risk" type="checkbox">I know the game publisher can ban traded accounts, and the shield does not cover that.</label>
    <button class="btn" data-act="order" data-id="${esc(l.id)}">RESERVE AND PAY</button>`;
}

async function vOrders() {
  if (!uid()) return needLogin('Your quests');
  const { data, error } = await sb.from('orders').select('*, listing:listings(fc,power_m)').or(`buyer_id.eq.${uid()},seller_id.eq.${uid()}`).order('created_at', { ascending: false });
  if (fail(error)) return '<p class="muted">Could not load your orders.</p>';
  return `<h1>Your quests</h1>${data.map(orderRow).join('') || '<p class="muted">No trades yet. Claim an account or list your own.</p>'}`;
}
function orderRow(o) {
  const role = o.buyer_id === uid() ? 'Buying' : o.seller_id === uid() ? 'Selling' : 'Order';
  return `<a class="card" href="#/order/${esc(o.id)}"><div class="row between"><div><div class="tier" style="color:var(--ice)">${role.toUpperCase()} · #${esc(o.id.slice(0, 8))}</div><div class="power" style="font-size:19px">${esc(fcLabel(o.listing?.fc ?? 0))} · ${esc(o.listing?.power_m ?? '?')}M</div></div><div class="price">${money(o.price)}</div></div><span class="tag" style="align-self:flex-start">${esc(STATUS[o.status] || o.status)}</span></a>`;
}

async function vOrder(id) {
  if (!uid()) return needLogin('Handover quest');
  const { data: o, error } = await sb.from('orders').select('*, listing:listings(*), buyer:profiles!orders_buyer_id_fkey(display_name), seller:profiles!orders_seller_id_fkey(display_name)').eq('id', id).maybeSingle();
  if (fail(error) || !o) return `${backBtn('#/orders')}<p class="muted">Order not found.</p>`;
  const admin = isAdmin(), staff = isStaff(), buyer = o.buyer_id === uid(), seller = o.seller_id === uid();
  chatRoles = { [o.buyer_id]: 'Buyer', [o.seller_id]: 'Seller' };
  const idx = { awaiting_payment: 0, paid: 1, seller_unbound: 2, hold: 3, completed: 5 }[o.status];
  const closed = ['cancelled', 'refunded'].includes(o.status), disputed = o.status === 'disputed';
  const total = Number(o.price) + Number(o.buyer_fee), ref = 'FV-' + o.id.slice(0, 8).toUpperCase();
  const steps = [
    ['Payment locked', 'The crew confirms your payment arrived.'],
    ['Seller unbinds their login', `Removes their ${LOGIN[o.listing?.login_type] || 'login'} binding.`],
    ['Buyer binds and confirms', 'Bind your own login, then confirm the account is yours.'],
    ['Hold period', o.hold_until ? 'Ends ' + new Date(o.hold_until).toLocaleString() : 'Protects the buyer from account recovery.'],
    ['Seller gets paid', `Payout ${money(Number(o.price) - Number(o.seller_fee))} when the hold ends.`]
  ];
  const done = idx === undefined ? 0 : Math.min(idx, 5);
  const stepHtml = steps.map((s, i) => `<div class="step ${idx !== undefined && i < idx ? 'done' : i === idx ? 'now' : ''}"><div class="n">${idx !== undefined && i < idx ? '✓' : i + 1}</div><div><b>${s[0]}</b><span>${esc(s[1])}</span></div></div>`).join('');
  const act = (a, label, primary) => `<button class="${primary ? 'btn' : 'btn2'}" data-act="oact" data-id="${esc(o.id)}" data-v="${a}">${label}</button>`;
  let actions = '';
  if (o.status === 'awaiting_payment') {
    if (buyer) actions += `<div class="panel warn col"><h2>Send ${money(total)}</h2><p style="font-size:14px;line-height:20px;white-space:pre-wrap;overflow-wrap:anywhere">${esc(settings.payment_instructions || 'The crew will post payment details in the chat below.')}</p><p class="small" style="font-weight:800">Write this reference with your payment: ${esc(ref)}</p></div>`;
    if (admin) actions += act('confirm_payment', 'CONFIRM PAYMENT RECEIVED', true);
    if (buyer || admin) actions += act('cancel', 'Cancel order');
  }
  if (o.status === 'paid' && seller) actions += act('seller_unbound', 'I UNBOUND MY LOGIN', true);
  if (o.status === 'seller_unbound' && buyer) actions += act('buyer_confirm', 'ACCOUNT IS MINE', true);
  if (admin && (o.status === 'hold' || disputed)) actions += act('release', `RELEASE ${money(Number(o.price) - Number(o.seller_fee))} TO SELLER`, true);
  if (admin && ['paid', 'seller_unbound', 'hold', 'disputed'].includes(o.status)) actions += act('refund', 'Refund buyer and close');
  if ((buyer || seller) && ['paid', 'seller_unbound', 'hold'].includes(o.status)) actions += act('dispute', 'Open dispute');
  const title = closed ? STATUS[o.status] : disputed ? 'In dispute' : o.status === 'completed' ? 'Quest complete' : 'Handover quest';
  setTimeout(() => loadChat(o.id), 0);
  return `<div class="row">${backBtn(staff && !buyer && !seller ? '#/admin' : '#/orders')}<div><p class="small" style="color:var(--muted);font-weight:700">Order ${esc(ref)} · ${esc(o.buyer?.display_name)} buys from ${esc(o.seller?.display_name)}</p><h1>${esc(title)}</h1></div></div>
    <div class="panel ice col"><div class="row between"><h2 style="font-size:20px">${money(total)} ${o.status === 'completed' ? 'paid out' : closed ? 'closed' : idx >= 1 || disputed ? 'in the vault' : 'to pay'}</h2><b style="color:var(--gold);font-size:13px">${done} / 5</b></div>
      <div class="bar" role="img" aria-label="Progress ${done} of 5"><div style="width:${done * 20}%"></div></div></div>
    ${disputed ? '<div class="panel warn"><p style="font-size:14px;font-weight:700">A dispute is open. The crew is reviewing. Keep everything in this chat.</p></div>' : ''}
    ${closed ? '' : `<div class="col" style="gap:8px">${stepHtml}</div>`}
    <div class="col">${actions}</div>
    ${staff && !admin && !buyer && !seller ? '<p class="muted">You are helping on this order. Payment steps are done by the main admin.</p>' : ''}
    <div class="panel col"><h2>Chat with the crew</h2><p class="small" style="color:var(--muted)">Crew messages have a gold border. The crew never asks for your payment password.</p>
      <div id="chat" class="chat"><p class="muted">Loading chat…</p></div>
      <form id="chat-form" class="row"><input id="chat-in" aria-label="Message" maxlength="2000" placeholder="Write a message" autocomplete="off"><button class="btn2" style="width:auto">Send</button></form></div>`;
}
async function loadChat(orderId) {
  const box = document.getElementById('chat'); if (!box) return;
  const { data, error } = await sb.from('messages').select('*, sender:profiles!messages_sender_id_fkey(display_name,is_admin,is_mod)').eq('order_id', orderId).order('id');
  if (error) { box.innerHTML = '<p class="muted">Could not load chat.</p>'; return; }
  box.innerHTML = data.map((m) => `<div class="msg ${m.sender_id === uid() ? 'me' : ''} ${m.sender?.is_admin || m.sender?.is_mod ? 'crew' : ''}"><small>${esc(m.sender?.display_name || '')} · ${esc(chatRoles[m.sender_id] || (m.sender?.is_admin || m.sender?.is_mod ? 'Crew' : 'Member'))}</small>${esc(m.body)}</div>`).join('') || '<p class="muted">No messages yet.</p>';
  box.scrollTop = box.scrollHeight;
  if (!channel) {
    channel = sb.channel('order-' + orderId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'order_id=eq.' + orderId }, () => loadChat(orderId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + orderId }, () => route())
      .subscribe();
  }
}

function vSell() {
  if (!uid()) return needLogin('Cash in your grind');
  const fcOpts = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<option value="${n}">${n ? 'FC' + n : 'Level 30 or below'}</option>`).join('');
  return `<h1>Cash in your grind</h1><p class="muted">Fill in your stats. The crew checks them against your screenshots before the listing goes live.</p>
    <form id="sell-form" class="col" style="gap:12px">
      <div class="panel grid2">
        <label>Furnace<select name="fc" required>${fcOpts}</select></label>
        <label>VIP<input name="vip" type="number" inputmode="numeric" min="0" max="20" required placeholder="12"></label>
        <label>Power (millions)<input name="power_m" type="number" inputmode="decimal" min="0.1" step="0.1" required placeholder="610"></label>
        <label>State<input name="state" type="number" inputmode="numeric" min="1" max="99999" required placeholder="1412"></label>
      </div>
      <div class="grid2">
        <label>Bound to<select name="login_type" required><option value="google">Google Play</option><option value="gamecenter">Game Center</option><option value="facebook">Facebook</option></select></label>
        <label style="color:var(--ember)">Your price (USD)<input name="price" type="number" inputmode="decimal" min="1" max="100000" step="0.01" required placeholder="720" style="border-color:var(--ember)"></label>
      </div>
      <div class="panel grid2">
        <label>Gear tier<select name="gear_tier" required><option value="">Choose</option><option>T1</option><option>T2</option><option>T3</option><option>Mix</option></select></label>
        <label>Charm level<select name="charm" required><option value="">Choose</option>${CHARMS.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label style="grid-column:1/-1">Chief gear<input name="chief_gear" maxlength="60" required placeholder="Type the chief gear, e.g. Mythic T2"></label>
      </div>
      <div class="panel grid3">
        ${[['infantry', 'Infantry'], ['lancer', 'Lancers'], ['marksman', 'Marksmen']].map(([n, t]) => `<label>${t}<select name="${n}" required><option value="">Choose</option><option>T12</option><option>T11</option><option>T10</option></select></label>`).join('')}
      </div>
      <p class="small" style="color:var(--muted)">Buyers pay a shield fee on top of your price: 5% under $10,000, 3% from $10,000 to $19,999, 2% from $20,000.${Number(settings.seller_fee_pct) ? ` Seller fee is ${esc(settings.seller_fee_pct)}%.` : ''}</p>
      <label>Extra details (optional)<textarea name="description" maxlength="1000" placeholder="Heroes, chief gear, pets, state age"></textarea></label>
      <label>In-game screenshots (1 to 6, max 3 MB each)<input name="shots" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>
      <label class="check"><input name="attested" type="checkbox" required>This account is mine, it was not hacked, and I will not try to recover it after the sale.</label>
      <button class="btn">SEND FOR REVIEW</button>
    </form>`;
}

function vShield() {
  const li = (c, t) => `<p style="font-size:14px;line-height:20px;font-weight:700"><span style="color:${c};font-weight:800">${c === 'var(--ice)' ? '✓' : '!'}</span> ${t}</p>`;
  return `<h1>Your shield</h1><p class="muted">What it blocks, and what it can't.</p>
    <div class="panel ice col"><h2 style="color:var(--ice)">Shield blocks</h2>${['Seller never hands over the account', 'Account does not match the listing', `Seller recovers the account during the ${esc(settings.hold_days)}-day hold`, 'Fake payment proof'].map((t) => li('var(--ice)', t)).join('')}</div>
    <div class="panel warn col"><h2 style="color:var(--ember)">Shield can't block</h2>${['A ban from the game publisher. Trading breaks its terms.', 'Recovery after the hold has ended.', 'Deals made outside the app.'].map((t) => li('var(--ember)', t)).join('')}</div>
    <div class="panel col"><h2>How a trade works</h2><p class="muted" style="color:var(--soft)">The buyer pays the crew. The seller unbinds their login. The buyer binds their own and confirms. After the hold, the crew pays the seller.</p></div>
    <p class="small" style="color:var(--muted)">Found a stolen account or have a problem? Open a dispute from your order, the crew reads every chat.</p>
    <p class="small" style="color:var(--muted)">FrostVault is an independent service. It is not affiliated with, endorsed by or sponsored by Century Games or Whiteout Survival.</p>`;
}

let authMode = 'in';
function vAuth() {
  if (uid()) { setTimeout(() => go('#/me'), 0); return ''; }
  const up = authMode === 'up';
  return `<img class="hero-logo" src="logo.webp" alt="FrostVault" width="150" height="150"><h1 style="text-align:center">${up ? 'Join the vault' : 'Welcome back, Chief'}</h1>
    <form id="auth-form" class="panel col">
      ${up ? '<label>Trader name<input name="name" required minlength="2" maxlength="24" autocomplete="nickname"></label>' : ''}
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Password<input name="password" type="password" required minlength="8" autocomplete="${up ? 'new-password' : 'current-password'}"></label>
      <button class="btn">${up ? 'CREATE ACCOUNT' : 'SIGN IN'}</button>
    </form>
    <button class="btn2" data-act="authmode">${up ? 'I already have an account' : 'New here? Create an account'}</button>`;
}

async function vMe() {
  if (!uid()) { setTimeout(() => go('#/auth'), 0); return ''; }
  const { data } = await sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('seller_id', uid()).neq('status', 'removed').order('created_at', { ascending: false });
  return `<h1>${esc(profile?.display_name || 'Chief')}</h1><p class="muted">${esc(rankOf(profile?.trades || 0))} · ${esc(profile?.trades || 0)} completed trades · ${esc(session.user.email)}</p>
    ${isStaff() ? '<a class="btn" href="#/admin">CREW PANEL</a>' : ''}
    <h2>My listings</h2><div class="col" style="gap:12px">${(data || []).map(listingCard).join('') || '<p class="muted">Nothing listed yet.</p>'}</div>
    <button class="btn2" data-act="signout">Sign out</button>`;
}

async function vAdmin() {
  if (!isStaff()) return '<h1>Crew only</h1><p class="muted">This area is for the FrostVault crew.</p>';
  const [pend, ords, usersRes] = await Promise.all([
    sb.from('listings').select('*, seller:profiles!listings_seller_id_fkey(display_name,trades)').eq('status', 'pending').order('created_at'),
    sb.from('orders').select('*, listing:listings(fc,power_m)').in('status', ['awaiting_payment', 'paid', 'seller_unbound', 'hold', 'disputed']).order('updated_at'),
    isAdmin() ? sb.rpc('admin_list_users') : Promise.resolve({ data: [] })
  ]);
  const s = settings, users = Array.isArray(usersRes.data) ? usersRes.data : [];
  const userRow = (u) => `<div class="panel col" style="gap:8px"><div class="row between"><div style="min-width:0"><h2 style="font-size:17px;overflow-wrap:anywhere">${esc(u.display_name)}</h2><p class="small" style="color:var(--muted);font-weight:700;overflow-wrap:anywhere">${esc(u.email)}</p></div><span class="tag" style="flex-shrink:0;${u.is_admin ? 'border-color:var(--gold);color:var(--gold)' : u.is_mod ? 'border-color:var(--ice);color:var(--ice)' : ''}">${u.is_admin ? 'Admin' : u.is_mod ? 'Helper' : 'Member'}</span></div>
    <p class="small" style="color:var(--muted)">${esc(u.trades)} completed trades · joined ${esc(new Date(u.created_at).toLocaleDateString())}</p>
    ${u.is_admin ? '' : `<button class="btn2" data-act="helper" data-id="${esc(u.id)}" data-v="${u.is_mod ? 'off' : 'on'}">${u.is_mod ? 'Remove helper rights' : 'Make crew helper'}</button>`}</div>`;
  if (!isAdmin()) return `<h1>Crew panel</h1><p class="muted">You are a crew helper: you can review listings and help in order chats. Payments, settings and accounts are handled by the main admin.</p>
    <h2>Listings to review (${pend.data?.length || 0})</h2><div class="col" style="gap:12px">${(pend.data || []).map(listingCard).join('') || '<p class="muted">Nothing waiting.</p>'}</div>
    <h2>Open orders (${ords.data?.length || 0})</h2>${(ords.data || []).map(orderRow).join('') || '<p class="muted">No open orders.</p>'}`;
  return `<h1>Crew panel</h1>
    <h2>Listings to review (${pend.data?.length || 0})</h2><div class="col" style="gap:12px">${(pend.data || []).map(listingCard).join('') || '<p class="muted">Nothing waiting.</p>'}</div>
    <h2>Open orders (${ords.data?.length || 0})</h2>${(ords.data || []).map(orderRow).join('') || '<p class="muted">No open orders.</p>'}
    <h2>Settings</h2>
    <form id="settings-form" class="panel col">
      <p class="small" style="color:var(--muted)">Buyer shield fee is fixed by price: 5% under $10,000, 3% from $10,000 to $19,999, 2% from $20,000.</p>
      <div class="grid2">
        <label>Seller fee %<input name="seller_fee_pct" type="number" min="0" max="50" step="0.01" required value="${esc(s.seller_fee_pct)}"></label>
        <label>Hold days<input name="hold_days" type="number" min="0" max="30" required value="${esc(s.hold_days)}"></label>
      </div>
      <label>Payment instructions shown to buyers<textarea name="payment_instructions" maxlength="2000" placeholder="How buyers should pay you">${esc(s.payment_instructions)}</textarea></label>
      <button class="btn2">Save settings</button>
    </form>
    <h2>Accounts (${users.length})</h2>
    <p class="small" style="color:var(--muted)">Helpers can approve, reject and delete listings and reply in order chats. They cannot confirm payments, release or refund money, change settings or manage accounts.</p>
    <div class="col" style="gap:12px">${users.map(userRow).join('') || '<p class="muted">No accounts yet.</p>'}</div>`;
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
  } catch (e) { console.error(e); view.innerHTML = '<p class="muted">Something went wrong. Pull to refresh.</p>'; }
}

/* ---------- actions ---------- */
const actions = {
  filter: (el) => { browseFilter = el.dataset.v; route(); },
  authmode: () => { authMode = authMode === 'in' ? 'up' : 'in'; route(); },
  signout: async () => { await sb.auth.signOut(); go('#/'); },
  order: async (el) => {
    if (!document.getElementById('risk')?.checked) return toast('Tick the box to confirm you understand the ban risk.');
    const { data, error } = await sb.rpc('create_order', { p_listing: el.dataset.id });
    if (!fail(error)) go('#/order/' + data);
  },
  oact: async (el) => {
    const a = el.dataset.v;
    const sure = { cancel: 'Cancel this order?', dispute: 'Open a dispute? The crew will step in.', buyer_confirm: 'Only confirm after YOUR login is bound and the old one is gone. Continue?', release: 'Release the money to the seller? Make sure you have paid them.', refund: 'Mark as refunded? Make sure you have sent the money back to the buyer.', confirm_payment: 'Confirm the full payment has arrived?' }[a];
    if (sure && !window.confirm(sure)) return;
    const { error } = await sb.rpc('order_action', { p_order: el.dataset.id, p_action: a });
    if (!fail(error)) route();
  },
  review: async (el) => {
    const { error } = await sb.from('listings').update({ status: el.dataset.v }).eq('id', el.dataset.id);
    if (!fail(error)) { toast(el.dataset.v === 'active' ? 'Listing is live.' : 'Listing rejected.', true); go('#/admin'); }
  },
  helper: async (el) => {
    const on = el.dataset.v === 'on';
    if (!window.confirm(on ? 'Give this account crew helper rights?' : 'Remove helper rights from this account?')) return;
    const { error } = await sb.rpc('admin_set_helper', { p_user: el.dataset.id, p_on: on });
    if (!fail(error)) { toast(on ? 'Helper added.' : 'Helper removed.', true); route(); }
  },
  adminremove: async (el) => {
    if (!window.confirm('Delete this listing from the market? Buyers will no longer see it.')) return;
    const { data, error } = await sb.from('listings').update({ status: 'removed' }).eq('id', el.dataset.id).in('status', ['pending', 'active', 'rejected']).select('id');
    if (fail(error)) return;
    if (!data?.length) return toast('Could not delete. It may have an open order.');
    toast('Listing deleted.', true); go('#/admin');
  },
  remove: async (el) => {
    if (!window.confirm('Remove this listing?')) return;
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
        if (error && (error.status === 429 || /rate limit/i.test(error.message || ''))) toast('Too many sign-ups right now. Please try again in a little while.');
        else if (!fail(error)) { if (data.session) go('#/'); else toast('Check your email to confirm your account, then sign in.', true); }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (!fail(error)) go('#/');
      }
    } else if (f.id === 'chat-form') {
      const body = document.getElementById('chat-in').value.trim(), orderId = location.hash.split('/')[2];
      if (body) { const { error } = await sb.from('messages').insert({ order_id: orderId, body }); if (!fail(error)) { f.reset(); loadChat(orderId); } }
    } else if (f.id === 'sell-form') {
      const files = fd.getAll('shots').filter((x) => x && x.size);
      if (files.length < 1 || files.length > 6) return toast('Add 1 to 6 screenshots.');
      if (files.some((x) => x.size > 3 * 1024 * 1024)) return toast('Each screenshot must be under 3 MB.');
      const paths = [];
      for (const file of files) {
        const ext = { 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'jpg';
        const path = `${uid()}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from('screenshots').upload(path, file, { contentType: file.type });
        if (fail(error)) return; paths.push(path);
      }
      const { error } = await sb.from('listings').insert({ fc: +fd.get('fc'), vip: +fd.get('vip'), power_m: +fd.get('power_m'), state: +fd.get('state'), login_type: fd.get('login_type'), price: +fd.get('price'), description: (fd.get('description') || '').trim(), gear_tier: fd.get('gear_tier'), charm: fd.get('charm'), chief_gear: (fd.get('chief_gear') || '').trim(), infantry: fd.get('infantry'), lancer: fd.get('lancer'), marksman: fd.get('marksman'), screenshots: paths, attested: true });
      if (!fail(error)) { toast('Sent for review. You will see it under your account.', true); go('#/me'); }
    } else if (f.id === 'settings-form') {
      const patch = { seller_fee_pct: +fd.get('seller_fee_pct'), hold_days: +fd.get('hold_days'), payment_instructions: fd.get('payment_instructions').trim() };
      const { error } = await sb.from('settings').update(patch).eq('id', 1);
      if (!fail(error)) { Object.assign(settings, patch); toast('Settings saved.', true); }
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
    view.innerHTML = '<h1>Setup needed</h1><p class="muted">Open config.js and paste your Supabase project URL and anon key, then reload.</p>'; return;
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
