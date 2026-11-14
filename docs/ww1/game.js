// ===== الواجهة + الأونلاين =====
const $ = s => document.querySelector(s);
const app = () => $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- أيقونات SVG ----------
const SVG = {
  soldier: '<circle cx="32" cy="17" r="7"/><ellipse cx="32" cy="12" rx="13" ry="4"/><path d="M22 27h20l4 20h-6l-2 13h-6l-1-11-1 11h-6l-2-13h-6z"/><rect x="45" y="6" width="3" height="40" rx="1" transform="rotate(12 46 26)"/>',
  knife: '<circle cx="32" cy="17" r="7"/><ellipse cx="32" cy="12" rx="13" ry="4"/><path d="M22 27h20l4 20h-6l-2 13h-6l-1-11-1 11h-6l-2-13h-6z"/><path d="M48 22l10-14 2 2-9 15z"/><circle cx="14" cy="40" r="5"/><rect x="12" y="30" width="4" height="7"/>',
  mg: '<rect x="8" y="22" width="40" height="8" rx="2"/><rect x="46" y="24" width="14" height="3"/><rect x="12" y="16" width="14" height="6" rx="2"/><path d="M26 30l-14 26h5l11-20 11 20h5l-14-26z"/><rect x="2" y="44" width="60" height="6" rx="3" opacity=".5"/>',
  atrifle: '<rect x="2" y="30" width="60" height="4" rx="1"/><path d="M4 30h18l3 10H8z"/><rect x="26" y="26" width="10" height="4"/><path d="M40 34l-6 16h3l6-14 6 14h3l-6-16z"/><circle cx="32" cy="16" r="6"/><ellipse cx="32" cy="12" rx="11" ry="3"/>',
  tank: '<path d="M2 44l9-18h42l9 18-6 10H8z"/><rect x="20" y="16" width="22" height="10" rx="2"/><rect x="42" y="19" width="14" height="4"/><circle cx="14" cy="47" r="3" fill="#0004"/><circle cx="24" cy="49" r="3" fill="#0004"/><circle cx="34" cy="49" r="3" fill="#0004"/><circle cx="44" cy="49" r="3" fill="#0004"/><circle cx="52" cy="46" r="3" fill="#0004"/>',
  light: '<rect x="6" y="36" width="50" height="16" rx="8"/><path d="M18 36l4-10h18l4 10z"/><rect x="22" y="18" width="16" height="10" rx="4"/><rect x="36" y="21" width="22" height="4"/><circle cx="14" cy="44" r="3" fill="#0004"/><circle cx="26" cy="44" r="3" fill="#0004"/><circle cx="38" cy="44" r="3" fill="#0004"/><circle cx="50" cy="44" r="3" fill="#0004"/>',
  car: '<path d="M6 42V30l8-8h30l6 8h8v12z"/><rect x="24" y="12" width="14" height="10" rx="3"/><rect x="36" y="15" width="18" height="3"/><circle cx="16" cy="46" r="7"/><circle cx="48" cy="46" r="7"/><circle cx="16" cy="46" r="3" fill="#0006"/><circle cx="48" cy="46" r="3" fill="#0006"/>',
  gun: '<rect x="14" y="22" width="46" height="7" rx="2" transform="rotate(-22 20 30)"/><path d="M8 34h24v8H8z"/><circle cx="20" cy="46" r="11" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="20" cy="46" r="3"/><path d="M28 40l26 14-2 3-26-12z"/>',
  mortar: '<rect x="24" y="8" width="10" height="38" rx="3" transform="rotate(-25 29 46)"/><path d="M8 52h40l-4 6H12z"/><path d="M40 40l8 12h-4l-8-10z"/>',
};
function icon(c, cls = '') {
  const i = c.icon;
  if (SVG[i]) return `<svg class="ic ${cls}" viewBox="0 0 64 64" fill="currentColor">${SVG[i]}</svg>`;
  return `<span class="ic emo ${cls}">${i}</span>`;
}
function kwBadges(c, u) {
  let s = c.kw.map(k => `<b title="${KW_TEXT[k][1]}">${KW_TEXT[k][0]}</b>`).join('');
  if (u && u.guard && !c.kw.includes('guard')) s += '<b>🧱</b>';
  return s;
}
function cardText(c) {
  if (c.kind === 'tactic') return esc(c.text);
  const t = c.kw.map(k => `<b>${KW_TEXT[k][1]}</b>`);
  if (c.armor) t.unshift(`<b>درع ${c.armor}</b>`);
  if (c.deploy) t.push(DEPLOY_TEXT[c.deploy]);
  return t.join(' · ') || 'وحدة أساسية';
}
function statLine(c, u) {
  if (c.kind !== 'troop') return '';
  return `⚔️ ضرر ${u ? u.atk : c.atk} · ❤️ صحة ${u ? u.hp + '/' + u.maxHp : c.hp}${c.armor ? ' · 🛡️ درع ' + c.armor : ''} · `;
}
function cardHTML(c, extra = '', cls = '') {
  const nat = NATIONS[c.nat];
  return `<div class="card ${c.kind} r-${c.rarity} ${cls}" ${extra}>
    <div class="cost">${c.cost}</div>
    <div class="nat" style="background:${nat.c}">${c.kind === 'tactic' ? 'تكتيك' : TYPE_TEXT[c.type] + ' · ' + nat.n}</div>
    <div class="art">${icon(c)}</div>
    <div class="cname">${esc(c.name)}</div>
    <div class="ctext">${cardText(c)}</div>
    ${c.kind === 'troop' ? `<div class="stats"><span class="a">${c.atk}</span>${c.armor ? `<span class="ar">${c.armor}</span>` : ''}<span class="h">${c.hp}</span></div>` : ''}
  </div>`;
}
function fullInfo(c) {
  let kw = '';
  if (c.kind === 'troop') {
    if (c.armor) kw += `<li><b>🛡️ درع ${c.armor}:</b> بيقلّل الضرر من أي هجوم مش مضاد دروع.</li>`;
    c.kw.forEach(k => kw += `<li><b>${KW_TEXT[k][0]} ${KW_TEXT[k][1]}:</b> ${KW_TEXT[k][2]}</li>`);
    if (c.deploy) kw += `<li>${DEPLOY_TEXT[c.deploy]}</li>`;
  }
  return `<div class="info-name">${esc(c.name)} <small>${esc(c.en)} · ${RARITY_TEXT[c.rarity]}</small></div>
    ${c.kind === 'tactic' ? `<p>${esc(c.text)}</p>` : `<p>${TYPE_TEXT[c.type]} · ${NATIONS[c.nat].n} · ضرر ${c.atk} · صحة ${c.hp}</p>`}
    ${kw ? `<ul>${kw}</ul>` : ''}${c.fact ? `<p class="fact">📜 ${esc(c.fact)}</p>` : ''}`;
}

// ---------- الملف الشخصي ----------
let P = loadProfile();
function loadProfile() {
  try { const p = JSON.parse(localStorage.getItem('ww1_profile')); if (p && p.owned && validDeck(p.deck)) return p; } catch (e) {}
  const owned = {}; Object.values(CARDS).forEach(c => { if (!c.token && c.rarity === 'common') owned[c.id] = 2; });
  return { name: 'جندي ' + Math.floor(Math.random() * 900 + 100), coins: 300, owned, deck: STARTER_DECK.slice(), wins: 0, losses: 0 };
}
function save() { localStorage.setItem('ww1_profile', JSON.stringify(P)); }
save();

function toast(m, ms = 2200) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function modal(html, onClick) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); else onClick && onClick(e, m); });
  document.body.appendChild(m); return m;
}

// ---------- القائمة ----------
function showMenu() {
  leaveNet(); M = null;
  app().innerHTML = `<div class="screen menu">
    <button class="mute" id="mute">${SFX.on() ? '🔊' : '🔇'}</button>
    <div class="logo"><div class="emblem">✠</div><h1>جبهة الكروت</h1><small>الحرب العالمية الأولى · 1914–1918</small></div>
    <div class="stats-row"><span>🪙 ${P.coins}</span><span>🏆 ${P.wins}</span><span>💀 ${P.losses}</span></div>
    <label class="namebox">اسم القائد <input id="pname" maxlength="16" value="${esc(P.name)}"></label>
    <button class="big gold" data-go="online">🌐 معركة أونلاين 1 ضد 1</button>
    <button class="big" data-go="camp">🗺️ الحملة: ${CAMPAIGN[Math.min(P.camp || 0, CAMPAIGN.length - 1)].name} <small>(${P.camp || 0}/${CAMPAIGN.length})</small></button>
    <button class="big" data-go="ai">⚔️ معركة تدريب ضد الكمبيوتر</button>
    <button class="big" data-go="deck">🎖️ تجهيز الكتيبة (الديك)</button>
    <button class="big" data-go="shop">📦 صناديق الإمداد</button>
    <button class="big" data-go="rules">📖 طريقة اللعب</button>
  </div>`;
  $('#pname').onchange = e => { P.name = e.target.value.trim().slice(0, 16) || P.name; save(); };
  $('#mute').onclick = () => { $('#mute').textContent = SFX.toggle() ? '🔊' : '🔇'; };
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  const n = $('#pname'); if (n) { P.name = n.value.trim().slice(0, 16) || P.name; save(); }
  ({ ai: showPractice, camp: showCampaign, online: showOnline, deck: showDeck, shop: showShop, rules: showRules, menu: showMenu })[g.dataset.go]();
});

function showRules() {
  app().innerHTML = `<div class="screen rules"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>طريقة اللعب</h2></div><div class="txt">
  <h3>الهدف</h3><p>دمّر <b>قيادة</b> العدو (${HQ_HP} صحة) قبل ما يدمّر قيادتك.</p>
  <h3>الكتيبة (الديك)</h3><p>بتدخل المعركة بـ <b>${DECK_TROOPS} كارت جنود ودبابات</b> و <b>${DECK_TACTICS} كروت تكتيكات</b>. أقصى نسختين من كل كارت (والأسطوري نسخة واحدة). بتجمّع كروت جديدة من صناديق الإمداد بالعملات اللي بتكسبها من المعارك.</p>
  <h3>مين يبدأ؟</h3><p>القرعة بتحدد مين يبدأ. اللي بيبدأ مش بيسحب كارت في أول دور، والتاني بياخد كارت زيادة + كارت <b>⛽ إمداد احتياطي</b> عشان اللعبة تبقى عادلة.</p>
  <h3>الدور</h3><p>كل دور بتاخد <b>⛽ إمداد</b> بيزيد 1 كل دور لحد 10، وبتسحب كارت. انزل جنود في الخانات الفاضية (5 خانات) والعب تكتيكات، وبعدين هاجم بوحداتك. الوحدة الجديدة مش بتهاجم غير الدور الجاي (إلا لو عندها ⚡ هجوم خاطف). كل دور ليه وقت 75 ثانية في الأونلاين.</p>
  <h3>القتال</h3><p>على كل وحدة: <b style="color:#d9a03b">الدايرة الدهبي = الضرر ⚔️</b>، <b style="color:#e05a4a">الدايرة الحمرا = الصحة ❤️</b>، والمربع الرمادي = الدرع 🛡️. لما وحدة تهاجم وحدة، الاتنين بيضربوا بعض (إلا لو المهاجم 🎯 بعيد المدى). لو العدو عنده وحدة <b>🧱 متحصّنة</b> لازم تهاجمها الأول.</p>
  <h3>حجر-ورقة-مقص</h3><ul>
   <li><b>🛡️ الدبابات</b> عندها درع بيقلّل ضرر الجنود العاديين، وأحيانًا بيلغيه خالص.</li>
   <li><b>🧨 مضاد الدروع</b> (بندقية T-Gewehr، الشحنة المجمّعة، مدفع 77 مم، مارك 4 ذكر) ضرره ×2 على الدبابات وبيتجاهل الدرع.</li>
   <li><b>💢 مضاد الأفراد</b> (الرشاشات، قاذف اللهب، مارك 4 أنثى) ضرره ×2 على المشاة.</li>
   <li><b>🔍 القنّاص والمدفع الدقيق</b> بيتخطّوا التحصين، و<b>🏚️ الحصار</b> ضرره ×2 على القيادة.</li></ul>
  <h3>التكتيكات</h3><p>مظلّيين، قصف بعيد، غارة قاذفات، ألغام مخفية، خنادق، مدافع محصّنة، غاز، أسلاك شائكة، استطلاع، قافلة إمدادات ومستشفى ميداني.</p>
  <h3>الحملة</h3><p>9 معارك حقيقية بالترتيب من مونس 1914 لأميان 1918. كل معركة بتكسبها بتفتح اللي بعدها وبتديك عملات وكارت جديد.</p>
  <h3>الأونلاين</h3><p>"دوّر على خصم" بيوصّلك بأي حد بيدوّر في نفس الوقت. أو واحد يعمل <b>أوضة</b> وياخد كود من 5 حروف ويبعته لصاحبه، والتاني يكتب الكود ويدخل. الاتصال مباشر بين التليفونين.</p>
  <h3>ملاحظة تاريخية</h3><p>الـRPG ماكانش موجود في الحرب العالمية الأولى (اتعمل في الحرب التانية)، فبدله اللعبة فيها الأسلحة الحقيقية اللي استخدموها ضد الدبابات وقتها. والمظلّيين كانوا خطة أمريكية لسنة 1918 الحرب خلصت قبل تنفيذها.</p>
  </div></div>`;
}

// ---------- المتجر ----------
const PACK_PRICE = 100, PACK_SIZE = 4;
function showShop() {
  const owned = Object.values(CARDS).filter(c => !c.token && P.owned[c.id]).length, total = Object.values(CARDS).filter(c => !c.token).length;
  app().innerHTML = `<div class="screen shop"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>صناديق الإمداد</h2><span class="coins">🪙 ${P.coins}</span></div>
    <div class="crate" id="crate">📦</div>
    <p class="center">كل صندوق فيه ${PACK_SIZE} كروت. الكارت الزيادة عن الحد بيتحوّل لـ 20 🪙.</p>
    <button class="big gold" id="buy" ${P.coins < PACK_PRICE ? 'disabled' : ''}>افتح صندوق (${PACK_PRICE} 🪙)</button>
    <p class="center muted">مجموعتك: ${owned} من ${total} كارت · المكسب: فوز تدريب 60 🪙، فوز أونلاين 120 🪙، خسارة 25 🪙</p>
    <div id="reveal" class="grid"></div></div>`;
  $('#buy').onclick = openPack;
}
function openPack() {
  if (P.coins < PACK_PRICE) return;
  P.coins -= PACK_PRICE;
  const pool = Object.values(CARDS).filter(c => !c.token);
  const W = { common: 60, rare: 28, epic: 10, legendary: 3 };
  const got = []; let refund = 0;
  for (let i = 0; i < PACK_SIZE; i++) {
    let r = Math.random() * 101, rar = 'common';
    for (const k of ['legendary', 'epic', 'rare', 'common']) { if (r < W[k]) { rar = k; break; } r -= W[k]; }
    // نفضّل الكروت اللي لسه مكمّلتش عندك؛ لو الندرة دي كلها مكمّلة نطلع لندرة أعلى
    const order = ['common', 'rare', 'epic', 'legendary'];
    let list = [];
    for (let k = order.indexOf(rar); k < order.length && !list.length; k++) list = pool.filter(c => c.rarity === order[k] && (P.owned[c.id] || 0) < maxCopies(c.id));
    if (!list.length) list = pool.filter(c => c.rarity === rar);
    const c = list[Math.floor(Math.random() * list.length)];
    const n = P.owned[c.id] || 0; let dupe = false;
    if (n >= maxCopies(c.id)) { refund += 20; dupe = true; } else P.owned[c.id] = n + 1;
    got.push({ c, dupe, isNew: n === 0 });
  }
  P.coins += refund; save();
  SFX.play('pack');
  showShop();
  $('#crate').classList.add('open');
  $('#reveal').innerHTML = got.map((g, i) => `<div class="flip" style="animation-delay:${i * 0.25}s">${cardHTML(g.c)}${g.isNew ? '<i class="new">جديد!</i>' : ''}${g.dupe ? '<i class="dup">+20 🪙</i>' : ''}</div>`).join('');
}

// ---------- الديك ----------
let draft = null, deckTab = 'troop';
function showDeck() { draft = P.deck.slice(); renderDeck(); }
function renderDeck() {
  const cnt = {}; draft.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
  const tr = draft.filter(id => CARDS[id].kind === 'troop').length, tc = draft.length - tr;
  const list = Object.values(CARDS).filter(c => !c.token && c.kind === deckTab).sort((a, b) => a.cost - b.cost);
  app().innerHTML = `<div class="screen deck"><div class="hdr"><button id="dback">→ رجوع</button><h2>الكتيبة</h2>
      <button id="dsave" class="gold" ${validDeck(draft) ? '' : 'disabled'}>حفظ</button></div>
    <div class="deckbar"><span class="${tr === DECK_TROOPS ? 'ok' : ''}">🪖 جنود ${tr}/${DECK_TROOPS}</span><span class="${tc === DECK_TACTICS ? 'ok' : ''}">🎴 تكتيكات ${tc}/${DECK_TACTICS}</span></div>
    <div class="tabs"><button data-tab="troop" class="${deckTab === 'troop' ? 'on' : ''}">جنود ودبابات</button><button data-tab="tactic" class="${deckTab === 'tactic' ? 'on' : ''}">تكتيكات</button></div>
    <div class="row2"><button id="dauto">⚡ كمّل تلقائي</button><button id="dclear">🗑️ فضّي</button><button id="dstart">↩️ الأساسية</button></div>
    <p class="muted center">دوس على كارت عشان تشوف تفاصيله وتضيفه أو تشيله.</p>
    <div class="grid">${list.map(c => {
      const own = P.owned[c.id] || 0, inD = cnt[c.id] || 0;
      return `<div class="cell ${own ? '' : 'locked'}" data-card="${c.id}">${cardHTML(c)}<div class="cnt">${own ? `في الديك ${inD} · عندك ${own}` : '🔒 مش عندك'}</div></div>`;
    }).join('')}</div></div>`;
  $('#dback').onclick = () => { if (draft.join() !== P.deck.join() && !confirm('تخرج من غير حفظ؟')) return; showMenu(); };
  $('#dsave').onclick = () => { P.deck = draft.slice(); save(); toast('✅ الكتيبة اتحفظت'); };
  $('#dauto').onclick = () => { autoFill(); renderDeck(); };
  $('#dclear').onclick = () => { draft = []; renderDeck(); };
  $('#dstart').onclick = () => { draft = STARTER_DECK.filter(id => P.owned[id]); autoFill(); renderDeck(); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { deckTab = b.dataset.tab; renderDeck(); });
  document.querySelectorAll('[data-card]').forEach(el => el.onclick = () => deckCardModal(el.dataset.card));
}
function autoFill() {
  const rank = { legendary: 4, epic: 3, rare: 2, common: 1 };
  for (const [kind, need] of [['troop', DECK_TROOPS], ['tactic', DECK_TACTICS]]) {
    const cnt = {}; draft.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
    let have = draft.filter(id => CARDS[id].kind === kind).length;
    const cands = Object.keys(P.owned).filter(id => CARDS[id] && CARDS[id].kind === kind)
      .sort((a, b) => (rank[CARDS[b].rarity] - rank[CARDS[a].rarity]) || (Math.random() - 0.5));
    // منحنى تكلفة معقول: مش أكتر من 4 كروت تمنها 5 أو أكتر
    let heavy = draft.filter(id => CARDS[id].kind === 'troop' && CARDS[id].cost >= 5).length;
    for (let pass = 0; pass < 2 && have < need; pass++) for (const id of cands) {
      if (have >= need) break;
      const lim = Math.min(P.owned[id], maxCopies(id));
      if ((cnt[id] || 0) >= (pass === 0 ? Math.min(1, lim) : lim)) continue;
      if (kind === 'troop' && CARDS[id].cost >= 5 && heavy >= 4) continue;
      draft.push(id); cnt[id] = (cnt[id] || 0) + 1; have++; if (CARDS[id].cost >= 5 && kind === 'troop') heavy++;
    }
  }
}
function deckCardModal(id) {
  const c = CARDS[id], own = P.owned[id] || 0;
  const inD = draft.filter(x => x === id).length;
  const full = c.kind === 'troop' ? draft.filter(x => CARDS[x].kind === 'troop').length >= DECK_TROOPS : draft.filter(x => CARDS[x].kind === 'tactic').length >= DECK_TACTICS;
  const canAdd = own > inD && inD < maxCopies(id) && !full;
  modal(`<div class="mcard">${cardHTML(c)}</div>${fullInfo(c)}
    <div class="row"><button data-m="add" class="gold" ${canAdd ? '' : 'disabled'}>➕ ضيف</button><button data-m="rem" ${inD ? '' : 'disabled'}>➖ شيل</button><button data-m="x">قفل</button></div>
    ${!own ? '<p class="muted">الكارت ده بيطلع من صناديق الإمداد.</p>' : full && !canAdd && own > inD ? '<p class="muted">القسم ده مليان، شيل كارت الأول.</p>' : ''}`,
    (e, m) => {
      const b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
      if (b.dataset.m === 'add') draft.push(id);
      if (b.dataset.m === 'rem') draft.splice(draft.indexOf(id), 1);
      m.remove(); renderDeck();
    });
}

// ---------- المعركة ----------
let M = null; // { st, me, mode:'ai'|'host'|'guest', level, camp, sel, lastEv, deadline, rewarded }
const TURN_MS = 75000;
const LEVELS = [{ n: 'سهل', d: 'مجنّد جديد بيغلط كتير', prize: 40 }, { n: 'متوسط', d: 'ضابط عارف شغله', prize: 60 }, { n: 'صعب', d: 'جنرال بيحسب كل حركة', prize: 90 }];
const FOES = ['الجنرال فون كلوك', 'المارشال فوش', 'الجنرال هيج', 'الجنرال لودندورف', 'الجنرال بيرشينج', 'المارشال جوفر', 'الجنرال بروسيلوف', 'الجنرال كادورنا'];

function randomDeck() {
  const pool = Object.values(CARDS).filter(c => !c.token);
  const pick = (kind, n) => { const out = [], cnt = {}; const L = pool.filter(c => c.kind === kind);
    while (out.length < n) { const c = L[Math.floor(Math.random() * L.length)]; if (c.kind === 'troop' && c.cost >= 6 && Math.random() < 0.6) continue;
      if ((cnt[c.id] || 0) < maxCopies(c.id)) { cnt[c.id] = (cnt[c.id] || 0) + 1; out.push(c.id); } } return out; };
  return pick('troop', DECK_TROOPS).concat(pick('tactic', DECK_TACTICS));
}
function showPractice() {
  modal(`<h3>معركة تدريب</h3><p class="muted">اختار مستوى الخصم:</p><div class="col">${LEVELS.map((l, i) =>
    `<button data-lv="${i}" class="${i === 1 ? 'gold' : ''}">${['🟢', '🟡', '🔴'][i]} ${l.n}<br><small>${l.d} · المكسب ${l.prize} 🪙</small></button>`).join('')}</div>`, (e, m) => {
    const b = e.target.closest('[data-lv]'); if (!b) return; m.remove(); P.lastLevel = +b.dataset.lv; save(); startAI(+b.dataset.lv);
  });
}
function startAI(level = 1, camp = null) {
  let foe = FOES[Math.floor(Math.random() * FOES.length)], deck = randomDeck(), hq;
  if (camp != null) { const b = CAMPAIGN[camp]; foe = b.foe; deck = b.deck.slice(); hq = b.hq; level = b.level; }
  const st = newGame({ name: P.name, deck: P.deck }, { name: foe, deck, hq }, (Math.random() * 2 ** 31) | 0);
  beginMatch('ai', st, 0, { level, camp });
  if (!P.tut) showTutorial();
}
function beginMatch(mode, st, me, opt = {}) {
  document.querySelectorAll('.modal').forEach(m => m.remove());
  M = { st, me, mode, level: opt.level ?? 1, camp: opt.camp ?? null, sel: null, lastEv: 0, deadline: Date.now() + TURN_MS, lastTurn: st.turnNo, rewarded: false, rm: [false, false] };
  renderMatch(); afterChange();
}

const TUT = [
  ['🎯', 'الهدف', 'دمّر <b>قيادة العدو 🏰</b> فوق قبل ما يدمّر <b>قيادتك ⛺</b> تحت.'],
  ['⛽', 'الإمداد', 'كل كارت ليه تمن (الرقم في الدايرة الزرقا). الإمداد بيزيد 1 كل دور لحد 10. الكروت اللي تقدر تلعبها بتنوّر أخضر.'],
  ['🃏', 'نزّل وحداتك', 'دوس على كارت من إيدك، وبعدين دوس على خانة فاضية عندك. التكتيكات: دوس عليها وبعدين على الهدف أو على زرار <b>استخدم</b>.'],
  ['⚔️', 'الهجوم', 'الوحدات اللي بتنوّر أخضر جاهزة: دوس عليها وبعدين على الهدف اللي بينوّر أحمر. <b style="color:#b8862b">الدهبي = ضرر</b>، <b style="color:#a33a2a">الأحمر = صحة</b>، <b style="color:#55606a">الرمادي = درع</b>.'],
  ['🧨', 'اعرف عدوك', '<b>🧨 مضاد الدروع</b> بيكسّر الدبابات، <b>💢 مضاد الأفراد</b> بيحصد المشاة، و<b>🧱 المتحصّن</b> لازم يتضرب الأول. دوس ℹ️ على أي كارت تعرف تفاصيله. بالتوفيق يا قائد!'],
];
function showTutorial(i = 0) {
  const [e, t, s] = TUT[i];
  modal(`<div class="tut"><div class="big-emo">${e}</div><h3>${t}</h3><p>${s}</p><div class="dots">${TUT.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row"><button data-m="skip">تخطّي</button><button data-m="next" class="gold">${i < TUT.length - 1 ? 'التالي ←' : 'يلا بينا ⚔️'}</button></div></div>`, (ev, m) => {
    const b = ev.target.closest('[data-m]'); if (!b) return; m.remove();
    if (b.dataset.m === 'next' && i < TUT.length - 1) showTutorial(i + 1); else { P.tut = 1; save(); }
  });
}

function act(a) {
  if (!M || M.st.winner != null) return;
  if (M.mode === 'guest') { NET.conn && NET.conn.send({ type: 'act', a }); M.sel = null; return; }
  const r = apply(M.st, M.me, a);
  if (!r.ok) { toast(r.err); return; }
  M.sel = null; afterChange();
}
function afterChange() {
  if (!M) return;
  if (M.st.turnNo !== M.lastTurn) { M.lastTurn = M.st.turnNo; M.deadline = Date.now() + TURN_MS; }
  renderMatch();
  if (M.mode === 'host') sendState();
  if (M.mode === 'ai' && M.st.turn !== M.me && M.st.winner == null && !M.aiBusy) runAI();
}
function runAI() {
  M.aiBusy = true; const myM = M;
  const step = () => {
    if (M !== myM || M.st.winner != null) { myM.aiBusy = false; return; }
    const a = aiPick(M.st, 1 - M.me, M.level);
    const r = apply(M.st, 1 - M.me, a);
    if (!r.ok) apply(M.st, 1 - M.me, { t: 'end' });
    renderMatch();
    if (a.t !== 'end' && r.ok && M.st.winner == null) setTimeout(step, 850);
    else { M.aiBusy = false; afterChange(); }
  };
  setTimeout(step, 1100);
}

// الأهداف المسموحة للحاجة المختارة
function targets() {
  const T = new Set(); if (!M || !M.sel || M.st.turn !== M.me) return T;
  const st = M.st, me = M.me, op = 1 - me, P0 = st.players[me], P1 = st.players[op];
  const sel = M.sel;
  if (sel.k === 'unit') { attackTargets(st, me, sel.s).forEach(s => T.add(op + ':' + s)); return T; }
  const c = CARDS[P0.hand[sel.h]]; if (!c || c.cost > P0.supply) return T;
  const empties = () => P0.board.forEach((u, s) => !u && T.add(me + ':' + s));
  if (c.kind === 'troop' || c.tgt === 'slot') empties();
  else if (c.tgt === 'enemy') { T.add(op + ':-1'); P1.board.forEach((u, s) => u && T.add(op + ':' + s)); }
  else if (c.tgt === 'enemyUnit') P1.board.forEach((u, s) => u && T.add(op + ':' + s));
  else if (c.tgt === 'friendUnit') P0.board.forEach((u, s) => u && T.add(me + ':' + s));
  return T;
}

function unitHTML(u, p, s, T) {
  const c = CARDS[u.id], mine = p === M.me;
  const ready = mine && M.st.turn === M.me && u.canAtk && u.atk > 0;
  const cls = ['unit', 't-' + c.type, u.guard ? 'guard' : '', ready ? 'ready' : '', u.stun ? 'stun' : '',
    M.sel && M.sel.k === 'unit' && M.sel.s === s && mine ? 'sel' : '', T.has(p + ':' + s) ? 'tgt' : ''].join(' ');
  return `<div class="slot" data-p="${p}" data-s="${s}"><div class="${cls}" style="--nc:${NATIONS[c.nat].c}">
    <div class="art">${icon(c)}</div><div class="uname">${esc(c.name)}</div><div class="kws">${kwBadges(c, u)}</div>
    <span class="a">${u.atk}</span>${u.armor ? `<span class="ar">${u.armor}</span>` : ''}<span class="h ${u.hp < u.maxHp ? 'hurt' : ''}">${u.hp}</span>
    ${u.stun ? '<span class="stunmark">🕸️</span>' : ''}</div></div>`;
}
function boardHTML(p, T) {
  return M.st.players[p].board.map((u, s) => u ? unitHTML(u, p, s, T) : `<div class="slot empty ${T.has(p + ':' + s) ? 'tgt' : ''}" data-p="${p}" data-s="${s}"></div>`).join('');
}
function pips(p) { let s = ''; for (let i = 0; i < Math.max(p.maxSupply, p.supply); i++) s += `<i class="${i < p.supply ? 'on' : ''}"></i>`; return s; }

function renderMatch() {
  if (!M) return;
  const st = M.st, me = M.me, op = 1 - me, A = st.players[me], B = st.players[op], T = targets();
  const myTurn = st.turn === me && st.winner == null;
  let detail;
  if (M.sel) {
    const su = M.sel.k === 'unit' ? A.board[M.sel.s] : M.sel.k === 'view' ? st.players[M.sel.p].board[M.sel.s] : null;
    const c = M.sel.k === 'hand' ? CARDS[A.hand[M.sel.h]] : CARDS[su?.id];
    if (c) {
      let hint = '';
      if (M.sel.k === 'hand') hint = c.cost > A.supply ? '⛽ الإمداد مش كفاية' : c.kind === 'troop' || c.tgt === 'slot' ? '👇 اختار خانة فاضية عندك' : c.tgt === 'none' ? '' : '🎯 اختار الهدف';
      if (M.sel.k === 'unit') hint = T.size ? '🎯 اختار هدف للهجوم' : 'الوحدة دي مش هتقدر تهاجم دلوقتي';
      detail = `<div class="dtext"><b>${esc(c.name)}</b> <small>${esc(c.en)}</small><div>${statLine(c, su)}${cardText(c)}</div>${hint ? `<em>${hint}</em>` : ''}</div>
        <div class="dbtns">${M.sel.k === 'hand' && c.kind === 'tactic' && c.tgt === 'none' && myTurn && c.cost <= A.supply ? '<button id="use" class="gold">استخدم</button>' : ''}
        <button id="info">ℹ️</button><button id="cancel">✖</button></div>`;
    }
  }
  if (!detail && myTurn && (P.wins + P.losses) < 3) {
    const canPlay = A.hand.some(id => CARDS[id].cost <= A.supply), canAtk = A.board.some((u, s) => u && attackTargets(st, me, s).length);
    detail = `<div class="dtext hint">💡 ${canPlay ? 'دوس على كارت منوّر أخضر في إيدك عشان تلعبه' : canAtk ? 'دوس على وحدة منوّرة أخضر عشان تهاجم بيها' : 'خلاص كده، دوس "إنهاء الدور"'}</div><div class="dbtns"><button id="logbtn">📜</button></div>`;
  }
  if (!detail) detail = `<div class="dtext log">${esc(st.log[st.log.length - 1] || '')}</div><div class="dbtns"><button id="logbtn">📜</button></div>`;

  app().innerHTML = `<div class="match ${myTurn ? 'myturn' : ''}">
    <div class="bar top"><button id="mmenu">☰</button>${M.mode !== 'ai' ? '<button id="emote">💬</button>' : ''}<span class="pname">${esc(B.name)}</span>
      <span title="كروت في إيده">🃏${B.hand.length}</span><span title="الديك">📚${B.deck.length}</span>${B.traps ? `<span title="ألغام مزروعة">⚠️${B.traps}</span>` : ''}
      <span class="sup">⛽${B.supply}/${B.maxSupply}</span></div>
    <div class="hq enemy ${T.has(op + ':-1') ? 'tgt' : ''}" data-p="${op}" data-s="-1"><span class="hqic">🏰</span><span class="hqhp">${B.hq}</span><span class="hqlbl">قيادة العدو</span></div>
    <div class="board enemy">${boardHTML(op, T)}</div>
    <div class="nomans">${M.camp != null ? `<span class="camplbl">🗺️ ${CAMPAIGN[M.camp].name}</span>` : M.mode === 'ai' ? `<span class="camplbl">${LEVELS[M.level].n}</span>` : ''}<span id="turnlbl">${st.winner != null ? 'انتهت المعركة' : myTurn ? '🟢 دورك' : '⏳ دور الخصم'}</span><span id="timer"></span></div>
    <div class="board mine">${boardHTML(me, T)}</div>
    <div class="hq mine" data-p="${me}" data-s="-1"><span class="hqic">⛺</span><span class="hqhp">${A.hq}</span><span class="hqlbl">قيادتك</span>
      ${A.traps ? `<span>⚠️${A.traps}</span>` : ''}<span class="pips">${pips(A)}</span><span class="sup">⛽${A.supply}/${A.maxSupply}</span><span>📚${A.deck.length}</span></div>
    <div class="detail">${detail}</div>
    <div class="handwrap"><div class="hand">${A.hand.map((id, h) => cardHTML(CARDS[id], `data-h="${h}"`,
      (CARDS[id].cost <= A.supply && myTurn ? 'play' : 'dim') + (M.sel && M.sel.k === 'hand' && M.sel.h === h ? ' sel' : ''))).join('')}</div></div>
    <button id="endturn" class="${myTurn ? 'gold' : ''}" ${myTurn ? '' : 'disabled'}>إنهاء الدور ⏭️</button>
  </div>`;

  bindMatch(T);
  animateEvents();
  tick();
  if (st.winner != null) gameOver();
}

function bindMatch(T) {
  const st = M.st, me = M.me;
  $('#mmenu').onclick = matchMenu;
  const em = $('#emote'); if (em) em.onclick = emoteMenu;
  $('#endturn').onclick = () => act({ t: 'end' });
  const c = $('#cancel'); if (c) c.onclick = () => { M.sel = null; renderMatch(); };
  const u = $('#use'); if (u) u.onclick = () => act({ t: 'play', h: M.sel.h });
  const lb = $('#logbtn'); if (lb) lb.onclick = () => modal(`<h3>سجل المعركة</h3><div class="logbox">${st.log.slice().reverse().map(l => `<div>${esc(l)}</div>`).join('')}</div>`);
  const ib = $('#info'); if (ib) ib.onclick = () => {
    const s = M.sel; const id = s.k === 'hand' ? st.players[me].hand[s.h] : s.k === 'unit' ? st.players[me].board[s.s].id : st.players[s.p].board[s.s].id;
    modal(`<div class="mcard">${cardHTML(CARDS[id])}</div>${fullInfo(CARDS[id])}`);
  };
  document.querySelectorAll('.hand .card').forEach(el => el.onclick = () => {
    const h = +el.dataset.h; M.sel = M.sel && M.sel.k === 'hand' && M.sel.h === h ? null : { k: 'hand', h }; renderMatch();
  });
  document.querySelectorAll('[data-p][data-s]').forEach(el => el.onclick = () => {
    const p = +el.dataset.p, s = +el.dataset.s, key = p + ':' + s;
    if (T.has(key)) {
      const sel = M.sel;
      if (sel.k === 'unit') return act({ t: 'attack', from: sel.s, tp: p, ts: s });
      const card = CARDS[st.players[me].hand[sel.h]];
      if (card.kind === 'troop' || card.tgt === 'slot') return act({ t: 'play', h: sel.h, slot: s });
      return act({ t: 'play', h: sel.h, tp: p, ts: s });
    }
    if (s < 0) return;
    const unit = st.players[p].board[s];
    if (!unit) { if (M.sel) { M.sel = null; renderMatch(); } return; }
    if (p === me) M.sel = M.sel && M.sel.k === 'unit' && M.sel.s === s ? null : { k: 'unit', s };
    else M.sel = { k: 'view', p, s };
    renderMatch();
  });
}

function animateEvents() {
  const evs = M.st.events.filter(e => e.id > M.lastEv);
  if (!evs.length) return;
  M.lastEv = evs[evs.length - 1].id;
  const snd = new Set();
  evs.forEach(e => {
    const c = e.cid && CARDS[e.cid];
    if (e.k === 'turn' && e.p === M.me && M.st.winner == null) snd.add('bugle');
    if (e.k === 'atk') snd.add(c.type === 'GUN' ? 'boom' : c.type === 'ARM' ? 'clank' : c.kw.includes('antiInf') ? 'mg' : 'shot');
    if (e.k === 'spawn') snd.add(CARDS[M.st.players[e.p].board[e.s]?.id]?.type === 'ARM' ? 'clank' : 'thud');
    if (e.k === 'play') snd.add(['x_bomber', 'x_ace', 'x_recon', 'x_para'].includes(e.cid) ? 'plane' : e.cid === 'x_barrage' ? 'boom' : 'card');
    if (e.k === 'die') snd.add('boom');
    if (e.k === 'heal') snd.add('heal');
    if (e.k === 'block') snd.add('block');
    if (e.k === 'dmg' && e.s < 0) navigator.vibrate && e.p === M.me && navigator.vibrate(60);
  });
  [...snd].slice(0, 3).forEach((n, i) => setTimeout(() => SFX.play(n), i * 120));
  const oppPlays = evs.filter(e => e.k === 'play' && e.p !== M.me);
  if (oppPlays.length) showPlayed(oppPlays[oppPlays.length - 1].cid);
  evs.forEach((e, i) => {
    if (e.k === 'play') return;
    if (e.k === 'turn') { if (e.p === M.me && M.st.winner == null && !document.querySelector('.modal')) { banner('دورك! ⚔️'); navigator.vibrate && navigator.vibrate(40); } return; }
    const el = document.querySelector(`[data-p="${e.p}"][data-s="${e.s}"]`); if (!el) return;
    if (e.k === 'atk') { const u = el.querySelector('.unit'); u && u.classList.add(e.p === M.me ? 'lunge-up' : 'lunge-down'); return; }
    if (e.k === 'spawn') { const u = el.querySelector('.unit'); u && u.classList.add('drop'); return; }
    const f = document.createElement('div');
    f.className = 'float ' + e.k; f.style.animationDelay = (i * 0.05) + 's';
    f.textContent = e.k === 'dmg' ? '-' + e.n : e.k === 'heal' ? '+' + e.n : e.k === 'block' ? '🛡️0' : '💥';
    el.appendChild(f); setTimeout(() => f.remove(), 1400);
    if (e.k === 'dmg' || e.k === 'die') { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }
  });
}
function showPlayed(id) {
  document.querySelectorAll('.played').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'played'; d.innerHTML = `<small>الخصم لعب</small>${cardHTML(CARDS[id])}`;
  d.onclick = () => d.remove(); document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
}
function banner(t) { const b = document.createElement('div'); b.className = 'banner'; b.textContent = t; document.body.appendChild(b); setTimeout(() => b.remove(), 1300); }

function tick() {
  if (!M) return;
  const el = $('#timer'); const online = M.mode !== 'ai';
  if (el) { if (online && M.st.winner == null) { const s = Math.max(0, Math.ceil((M.deadline - Date.now()) / 1000)); el.textContent = '⏱️ ' + s; el.className = s <= 10 ? 'warn' : ''; } else el.textContent = ''; }
  if (M.mode === 'host' && M.st.winner == null && Date.now() > M.deadline) {
    const r = apply(M.st, M.st.turn, { t: 'end' }); if (r.ok) { M.sel = null; afterChange(); }
  }
}
setInterval(tick, 500);

function matchMenu() {
  modal(`<h3>القائمة</h3><div class="col"><button data-m="tut">🎓 الشرح السريع</button><button data-m="rules">📖 طريقة اللعب</button>
    <button data-m="snd">${SFX.on() ? '🔊 الصوت شغّال' : '🔇 الصوت مقفول'}</button>
    <button data-m="quit" class="red">🏳️ استسلام والخروج</button><button data-m="x">رجوع للمعركة</button></div>`, (e, m) => {
    const b = e.target.closest('[data-m]'); if (!b) return; m.remove();
    const k = b.dataset.m;
    if (k === 'snd') { SFX.toggle(); matchMenu(); }
    if (k === 'tut') showTutorial();
    if (k === 'quit') {
      if (M && M.st.winner == null) act({ t: 'concede' });
      else return showMenu();
      if (M && M.mode === 'guest') setTimeout(() => { if (M && M.st.winner == null) { M.st.winner = 1 - M.me; renderMatch(); } }, 1500);
    }
    if (k === 'rules') { const keep = M; showRules(); $('.rules .hdr button').removeAttribute('data-go'); $('.rules .hdr button').onclick = () => { M = keep; renderMatch(); }; }
  });
}

function gameOver() {
  if (M.rewarded) return; M.rewarded = true;
  const win = M.st.winner === M.me;
  let prize = win ? (M.mode === 'ai' ? LEVELS[M.level].prize : 120) : 25, extra = '';
  if (M.camp != null && win) {
    const b = CAMPAIGN[M.camp];
    if (M.camp === (P.camp || 0)) {
      P.camp = M.camp + 1; prize = b.reward.coins;
      if (b.reward.card) {
        const id = b.reward.card, n = P.owned[id] || 0;
        if (n < maxCopies(id)) { P.owned[id] = n + 1; extra = `<p>🎁 كارت جديد:</p><div class="mcard">${cardHTML(CARDS[id])}</div>`; }
        else { prize += 50; }
      }
      if (P.camp >= CAMPAIGN.length) extra += '<p>🎖️ خلّصت الحملة كلها! الحرب انتهت في 11 نوفمبر 1918.</p>';
    } else prize = 40;
  }
  P.coins += prize; win ? P.wins++ : P.losses++; save();
  setTimeout(() => SFX.play(win ? 'win' : 'lose'), 700);
  const nextCamp = M.camp != null && win && M.camp + 1 < CAMPAIGN.length;
  const btns = M.mode === 'ai'
    ? (M.camp != null ? (nextCamp ? '<button data-m="next" class="gold">المعركة الجاية ⚔️</button>' : '') + `<button data-m="retry" class="${win ? '' : 'gold'}">🔁 العب تاني</button><button data-m="camp">🗺️ الحملة</button>`
      : '<button data-m="again" class="gold">معركة تانية</button>')
    : '<button data-m="rematch" class="gold">🔁 إعادة مع نفس الخصم</button>';
  setTimeout(() => { if (!M || M.st.winner == null) return; modal(`<div class="result ${win ? 'win' : 'lose'}"><div class="big-emo">${win ? '🏆' : '💀'}</div><h2>${win ? 'نصر!' : 'هزيمة'}</h2>
    <p>${win ? 'قيادة العدو سقطت.' : 'قيادتك سقطت.'}</p><p>+${prize} 🪙</p>${extra}
    <div class="col">${btns}<button data-m="menu">القائمة الرئيسية</button></div></div>`, (e, m) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const k = b.dataset.m;
      if (k === 'rematch') { b.disabled = true; b.textContent = '⏳ مستني الخصم يوافق...'; askRematch(); return; }
      m.remove();
      if (k === 'again') startAI(M.level);
      else if (k === 'retry') startAI(M.level, M.camp);
      else if (k === 'next') startAI(1, M.camp + 1);
      else if (k === 'camp') showCampaign();
      else showMenu();
    }); }, 900);
}

// ---------- الحملة ----------
function showCampaign() {
  leaveNet(); M = null;
  const done = P.camp || 0;
  app().innerHTML = `<div class="screen camp"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>الحملة 1914–1918</h2><span>${done}/${CAMPAIGN.length}</span></div>
    <div class="timeline">${CAMPAIGN.map((b, i) => {
      const st = i < done ? 'done' : i === done ? 'next' : 'lock';
      return `<div class="battle ${st}" data-b="${i}"><div class="yr">${b.year}</div><div class="bi"><b>${b.name}</b><small>ضد ${b.foe} · قيادته ${b.hq} · ${LEVELS[b.level].n}</small>
        <small>🎁 ${b.reward.coins} 🪙${b.reward.card ? ' + ' + CARDS[b.reward.card].name : ''}</small></div><div class="bs">${st === 'done' ? '✅' : st === 'next' ? '⚔️' : '🔒'}</div></div>`;
    }).join('')}</div></div>`;
  document.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
    const i = +el.dataset.b; if (i > done) return toast('🔒 كسّب المعركة اللي قبلها الأول');
    const b = CAMPAIGN[i];
    modal(`<div class="story"><div class="yr">${b.year}</div><h3>${b.name}</h3><p>${b.story}</p><p class="muted">الخصم: ${b.foe} · قيادته ${b.hq} صحة · مستوى ${LEVELS[b.level].n}</p>
      ${b.reward.card && i >= done ? `<p>🎁 الجايزة:</p><div class="mcard">${cardHTML(CARDS[b.reward.card])}</div>` : ''}
      <div class="row"><button data-m="go" class="gold">⚔️ ابدأ المعركة</button><button data-m="x">رجوع</button></div></div>`, (e, m) => {
      const k = e.target.closest('[data-m]'); if (!k) return; m.remove(); if (k.dataset.m === 'go') startAI(1, i);
    });
  });
}

// ---------- الأونلاين (PeerJS: اتصال مباشر بين التليفونين) ----------
const NET = { peer: null, conn: null, guest: null };
const PREFIX = 'ww1-front-cards-';
const QSLOTS = 6;
const EMOTES = ['👋 أهلًا يا قائد', '🫡 تحية عسكرية', '😮 ضربة حلوة!', '😂', '🤔 بفكّر...', '🔥 مش هتعدّي!'];
// للتجربة على سيرفر محلي: ?peerhost=127.0.0.1:9000 (العادي: سيرفر PeerJS المجاني)
function peerOpts() { const h = new URLSearchParams(location.search).get('peerhost'); if (!h) return { debug: 0 }; const [host, port] = h.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 0 }; }
function loadPeer() {
  return new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script'); s.src = 'peerjs.min.js';
    s.onload = res; s.onerror = () => rej(new Error('net')); document.head.appendChild(s);
  });
}
function leaveNet() { NET.searching = false; try { NET.conn && NET.conn.close(); } catch (e) {} try { NET.peer && NET.peer.destroy(); } catch (e) {} NET.peer = NET.conn = NET.guest = null; }
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function netStatus(t) { const e = $('#netst'); if (e) e.innerHTML = t; }
function netSend(o) { try { NET.conn && NET.conn.open && NET.conn.send(o); } catch (e) {} }

function showOnline() {
  leaveNet(); M = null;
  app().innerHTML = `<div class="screen online"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>أونلاين 1 ضد 1</h2></div>
    <p class="center">هتدخل بالكتيبة المحفوظة عندك (${DECK_TROOPS} جنود + ${DECK_TACTICS} تكتيكات).</p>
    <button class="big gold" id="quick">🔎 دوّر على خصم عشوائي</button>
    <div class="or">أو العب مع صاحبك</div>
    <button class="big" id="host">🏕️ اعمل أوضة بكود</button>
    <div class="join"><input id="code" maxlength="5" placeholder="كود الأوضة" autocapitalize="characters"><button class="big" id="join">🚪 ادخل</button></div>
    <div id="netst" class="netst"></div></div>`;
  $('#quick').onclick = quickMatch;
  $('#host').onclick = () => hostRoom();
  $('#join').onclick = () => { const c = $('#code').value.trim().toUpperCase(); if (c.length !== 5) return toast('الكود 5 حروف'); joinRoom(c); };
}

// صاحب الأوضة (هو اللي بيحسب المعركة)
async function hostRoom(fixedId, onFail) {
  if (!fixedId) leaveNet();
  netStatus(fixedId ? '⏳ مستني خصم يدخل...' : '⏳ بيجهّز الأوضة...');
  try { await loadPeer(); } catch (e) { return netStatus('❌ مفيش اتصال بالنت'); }
  const code = genCode(); const peer = new Peer(fixedId || PREFIX + code, peerOpts()); NET.peer = peer;
  peer.on('open', () => {
    if (fixedId) netStatus(`<div class="radar">📡</div>⏳ مستني خصم يدخل...<p class="muted">لو مفيش حد بيدوّر دلوقتي، ابعت للصحاب يدوسوا "دوّر على خصم".</p>`);
    else { netStatus(`ابعت الكود ده لصاحبك:<div class="code">${code}</div><button id="share">📤 مشاركة</button><p>⏳ مستني الخصم يدخل...</p>`); shareBtn(code); }
  });
  peer.on('error', e => {
    if (e.type === 'unavailable-id') { if (fixedId) { peer.destroy(); onFail && onFail(); } else hostRoom(); }
    else if (!M) netStatus('❌ مشكلة في الاتصال: ' + e.type);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('connection', conn => {
    if (NET.conn) { conn.on('open', () => { conn.send({ type: 'busy' }); setTimeout(() => conn.close(), 400); }); return; }
    NET.conn = conn;
    conn.on('data', d => hostData(d));
    conn.on('close', () => { if (NET.conn === conn) peerLeft(); });
  });
}
function shareBtn(code) {
  const b = $('#share'); if (!b) return; b.onclick = () => {
    const txt = `تعالى نلعب جبهة الكروت ⚔️ كود الأوضة: ${code}\n${location.origin + location.pathname}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(txt); toast('اتنسخ'); }
  };
}
function hostNewGame() {
  const g = NET.guest;
  const st = newGame({ name: P.name, deck: P.deck }, { name: g.name, deck: g.deck }, (Math.random() * 2 ** 31) | 0);
  beginMatch('host', st, 0);
}
function hostData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'hello' && !M) {
    if (!validDeck(d.deck)) { netSend({ type: 'err', msg: 'الكتيبة بتاعتك مش صالحة' }); return; }
    NET.guest = { name: String(d.name || 'جندي').slice(0, 16), deck: d.deck };
    SFX.play('bugle'); hostNewGame();
  } else if (d.type === 'act' && M && M.mode === 'host') {
    const r = apply(M.st, 1, d.a);
    if (!r.ok) netSend({ type: 'err', msg: r.err }); else afterChange();
  } else onCommonMsg(d);
}
function sendState() { netSend({ type: 'state', st: redact(M.st, 1), left: M.deadline - Date.now() }); }

// الضيف
function guestData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'state') {
    if (!M || M.st.gid !== d.st.gid) {
      document.querySelectorAll('.modal').forEach(m => m.remove());
      M = { st: d.st, me: 1, mode: 'guest', level: 1, camp: null, sel: null, lastEv: 0, deadline: 0, rewarded: false, rm: [false, false] };
    } else M.st = d.st;
    M.deadline = Date.now() + d.left;
    if (M.sel && M.sel.k === 'hand' && M.st.players[1].hand[M.sel.h] == null) M.sel = null;
    renderMatch();
  } else if (d.type === 'err') toast(d.msg);
  else if (d.type === 'busy') netStatus('❌ الأوضة دي فيها معركة شغّالة');
  else onCommonMsg(d);
}
function attachGuest(conn) {
  NET.conn = conn;
  conn.on('data', guestData);
  conn.on('close', () => { if (NET.conn === conn) peerLeft(); });
}
async function joinRoom(code) {
  leaveNet(); netStatus('⏳ بيتصل...');
  try { await loadPeer(); } catch (e) { return netStatus('❌ مفيش اتصال بالنت'); }
  const peer = new Peer(peerOpts()); NET.peer = peer;
  peer.on('error', e => { if (!M) netStatus(e.type === 'peer-unavailable' ? '❌ الكود غلط أو الأوضة اتقفلت' : '❌ مشكلة في الاتصال: ' + e.type); });
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + code, { reliable: true }); attachGuest(conn);
    conn.on('open', () => { netStatus('✅ اتصلت! المعركة بتبدأ...'); conn.send({ type: 'hello', name: P.name, deck: P.deck }); });
  });
}

// البحث العشوائي: بيجرّب يدخل أوض الانتظار العامة، ولو مفيش حد بيستنى بيعمل واحدة
async function quickMatch() {
  leaveNet(); NET.searching = true;
  netStatus('<div class="radar">📡</div>🔎 بيدوّر على خصم...');
  try { await loadPeer(); } catch (e) { return netStatus('❌ مفيش اتصال بالنت'); }
  const gp = new Peer(peerOpts()); NET.peer = gp;
  const opened = await new Promise(res => { gp.on('open', () => res(true)); gp.on('error', () => res(false)); setTimeout(() => res(false), 10000); });
  if (!opened) { if (NET.peer === gp) netStatus('❌ مش قادر يوصل لسيرفر الاتصال'); return; }
  const free = [];
  const order = [...Array(QSLOTS).keys()].map(i => i + 1);
  for (const n of order) {
    if (NET.peer !== gp || !NET.searching) return;
    const r = await tryJoin(gp, PREFIX + 'q' + n);
    if (r === 'ok') { NET.searching = false; return; }
    if (r === 'none') free.push(n);
  }
  if (NET.peer !== gp || !NET.searching) return;
  gp.destroy(); NET.peer = null;
  const tryHost = () => {
    if (!free.length) return netStatus('😕 كل أوض الانتظار مشغولة. جرّب تاني كمان شوية أو اعمل أوضة بكود.');
    const n = free.shift(); hostRoom(PREFIX + 'q' + n, tryHost);
  };
  tryHost();
}
function tryJoin(peer, id) {
  return new Promise(res => {
    let done = false;
    const fin = r => { if (done) return; done = true; peer.off('error', onErr); clearTimeout(to); res(r); };
    const onErr = e => { if (e.type === 'peer-unavailable' && String(e.message || '').includes(id)) { try { conn.close(); } catch (x) {} fin('none'); } };
    peer.on('error', onErr);
    const conn = peer.connect(id, { reliable: true });
    const to = setTimeout(() => { try { conn.close(); } catch (x) {} fin('busy'); }, 8000);
    conn.on('open', () => conn.send({ type: 'hello', name: P.name, deck: P.deck }));
    conn.on('data', d => {
      if (!d || done) return;
      if (d.type === 'busy') { conn.close(); fin('busy'); }
      else if (d.type === 'state') { fin('ok'); attachGuest(conn); guestData(d); }
    });
    conn.on('close', () => fin('busy'));
  });
}

// رسايل مشتركة: إيموجي وإعادة
function onCommonMsg(d) {
  if (d.type === 'emote' && M) showEmote(1 - M.me, EMOTES[d.i | 0] || '👋');
  if (d.type === 'rematch' && M && M.st.winner != null) {
    toast('🔁 الخصم عايز يلعب تاني');
    M.rm[1 - M.me] = true;
    if (M.mode === 'host' && M.rm[0] && M.rm[1]) hostNewGame();
  }
}
function askRematch() {
  if (!M) return; M.rm[M.me] = true; netSend({ type: 'rematch' });
  if (M.mode === 'host' && M.rm[1]) hostNewGame();
}
function emoteMenu() {
  modal(`<h3>رسالة سريعة</h3><div class="col">${EMOTES.map((t, i) => `<button data-e="${i}">${t}</button>`).join('')}</div>`, (e, m) => {
    const b = e.target.closest('[data-e]'); if (!b) return; m.remove();
    const now = Date.now(); if (now - (NET.lastEmote || 0) < 2500) return toast('استنى شوية'); NET.lastEmote = now;
    netSend({ type: 'emote', i: +b.dataset.e }); showEmote(M.me, EMOTES[+b.dataset.e]);
  });
}
function showEmote(p, t) {
  const el = document.querySelector(p === M.me ? '.hq.mine' : '.bar.top'); if (!el) return;
  const b = document.createElement('div'); b.className = 'emote ' + (p === M.me ? 'mine' : 'theirs'); b.textContent = t;
  document.body.appendChild(b); const r = el.getBoundingClientRect(); b.style.top = (p === M.me ? r.top - 40 : r.bottom + 6) + 'px';
  SFX.play('card'); setTimeout(() => b.remove(), 2800);
}
function peerLeft() {
  if (M && M.mode !== 'ai' && M.st.winner == null) { toast('📴 الخصم خرج من المعركة', 3000); M.st.winner = M.me; renderMatch(); }
  else if (M && M.mode !== 'ai') toast('📴 الخصم خرج', 2500);
  else if (!M) netStatus('📴 الاتصال اتقطع');
  NET.conn = null;
}

// مكافأة يومية
function dailyBonus() {
  const today = new Date().toDateString();
  if (P.lastDaily === today) return;
  const first = !P.lastDaily; P.lastDaily = today; P.coins += 50; save();
  if (!first) setTimeout(() => toast('🎁 مكافأة اليوم: +50 🪙', 3000), 400);
}
dailyBonus();
showMenu();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
