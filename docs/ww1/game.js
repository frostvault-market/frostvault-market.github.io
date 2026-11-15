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
function kwBadges(c) { return c.kw.map(k => `<b title="${KW_TEXT[k][1]}">${KW_TEXT[k][0]}</b>`).join(''); }
function cardText(c) {
  if (c.kind === 'tactic') return esc(c.text);
  const t = c.kw.map(k => `<b>${KW_TEXT[k][1]}</b>`);
  const s = RT[c.id]; if (s && s.n > 1) t.unshift(`<b>×${s.n}</b>`);
  if (s && s.ar) t.unshift(`<b>درع ${s.ar}</b>`);
  if (c.deploy) t.push(DEPLOY_TEXT[c.deploy]);
  return t.join(' · ') || 'وحدة أساسية';
}
function photo(id) { return typeof PHOTOS !== 'undefined' && PHOTOS[id] ? PHOTOS[id] : null; }
function cardArt(c) { const p = photo(c.id); return p ? `<div class="art ph" style="background-image:url('${p.f}')"></div>` : `<div class="art">${icon(c)}</div>`; }
function lvlOf(id) { return Math.max(1, cardLevel(P.owned[id] || 0)); }
function cardHTML(c, extra = '', cls = '', lvl) {
  const nat = NATIONS[c.nat], ph = photo(c.id);
  if (ph) return `<div class="card ${c.kind} r-${c.rarity} hasart ${cls}" ${extra}>
    <div class="cart${ph.r ? ' render' : ''}" style="background-image:url('${ph.f}')"></div>
    <div class="cost">${c.cost}</div>
    <div class="ctag" style="background:${nat.c}">${c.kind === 'tactic' ? 'تكتيك' : TYPE_TEXT[c.type]}</div>
    ${lvl ? `<div class="lvl">⭐${lvl}</div>` : ''}
    <div class="cplate"><div class="cname">${esc(c.name)}</div><div class="ctext">${cardText(c)}</div></div>
  </div>`;
  return `<div class="card ${c.kind} r-${c.rarity} ${cls}" ${extra}>
    <div class="cost">${c.cost}</div>
    <div class="nat" style="background:${nat.c}">${c.kind === 'tactic' ? 'تكتيك' : TYPE_TEXT[c.type] + ' · ' + nat.n}</div>
    <div class="art">${icon(c)}</div>
    <div class="cname">${esc(c.name)}</div>
    <div class="ctext">${cardText(c)}</div>
    ${lvl ? `<div class="lvl">مستوى ${lvl}</div>` : ''}
  </div>`;
}
function fullInfo(c) {
  let kw = '';
  const s = RT[c.id];
  if (c.kind === 'troop') {
    if (s.ar) kw += `<li><b>🛡️ درع ${s.ar}:</b> بيتطرح من كل طلقة مش مضادة للدروع، فالرشاشات والبنادق تقريبًا مش بتأثّر فيه.</li>`;
    c.kw.forEach(k => kw += `<li><b>${KW_TEXT[k][0]} ${KW_TEXT[k][1]}:</b> ${KW_TEXT[k][2]}</li>`);
    if (s.heal) kw += `<li>➕ بيعالج الوحدات الصاحبة اللي جنبه.</li>`;
    if (s.min) kw += `<li>مايقدرش يضرب أي حد أقرب من ${s.min}.</li>`;
  }
  const own = P.owned[c.id] || 0, l = cardLevel(own);
  const prog = own && l < 5 ? `<p class="muted">مستوى ${l} · عندك ${own} نسخة، المستوى ${l + 1} محتاج ${LEVEL_NEED[l + 1]}. كل مستوى = +7% صحة وضرر.</p>` : own ? '<p class="muted">مستوى 5 (الأقصى)</p>' : '';
  const ph = photo(c.id);
  return `${ph ? `<div class="bigphoto${ph.r ? ' render' : ''}" style="background-image:url('${ph.f}')"></div>${ph.r ? '' : `<div class="credit">📷 ${esc(ph.a || 'غير معروف')} · ${esc(ph.l)} · Wikimedia Commons</div>`}` : ''}<div class="info-name">${esc(c.name)} <small>${esc(c.en)} · ${RARITY_TEXT[c.rarity]}</small></div>
    ${c.kind === 'tactic' ? `<p>${esc(c.text)}</p>` : `<p class="stl">${TYPE_TEXT[c.type]} · ${NATIONS[c.nat].n}<br>${cardStatsLine(c.id, l || 1)}</p>`}
    ${kw ? `<ul>${kw}</ul>` : ''}${prog}${c.fact ? `<p class="fact">📜 ${esc(c.fact)}</p>` : ''}`;
}

// ---------- الملف الشخصي ----------
let P = loadProfile();
function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem('ww1_profile')); } catch (e) {}
  if (!p || !p.owned) {
    const owned = {}; Object.values(CARDS).forEach(c => { if (!c.token && c.rarity === 'common') owned[c.id] = 2; });
    p = { name: 'جندي ' + Math.floor(Math.random() * 900 + 100), coins: 300, owned, wins: 0, losses: 0 };
  }
  if (!validRtDeck(p.rtDeck) || p.rtDeck.some(id => !p.owned[id])) p.rtDeck = RT_STARTER.filter(id => p.owned[id]).length === 12 ? RT_STARTER.slice() : autoDeck(p);
  if (p.v !== 2) { p.v = 2; p.tut = 0; p.camp = 0; } // نسخة اللعبة الحية: الشرح والحملة من الأول
  return p;
}
function autoDeck(p) {
  const rank = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const pick = (kind, n) => Object.keys(p.owned).filter(id => CARDS[id] && RT[id] && !CARDS[id].token && CARDS[id].kind === kind)
    .sort((a, b) => rank[CARDS[b].rarity] - rank[CARDS[a].rarity] || (cardLevel(p.owned[b]) - cardLevel(p.owned[a])) || Math.random() - 0.5).slice(0, n);
  return pick('troop', RT_DECK_TROOPS).concat(pick('tactic', RT_DECK_TACTICS));
}
function save() { try { localStorage.setItem('ww1_profile', JSON.stringify(P)); } catch (e) {} }
save();

function toast(m, ms = 2200) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function modal(html, onClick) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); else onClick && onClick(e, m); });
  document.body.appendChild(m); return m;
}

// ---------- القائمة ----------
function showMenu() {
  leaveBattle();
  app().innerHTML = `<div class="screen menu">
    <button class="mute" id="mute">${SFX.on() ? '🔊' : '🔇'}</button>
    <div class="logo"><div class="emblem">✠</div><h1>جبهة الكروت</h1><small>الحرب العالمية الأولى · 1914–1918</small></div>
    <div class="stats-row"><span>🪙 ${P.coins}</span><span>🏆 ${P.wins}</span><span>💀 ${P.losses}</span></div>
    <label class="namebox">اسم القائد <input id="pname" maxlength="16" value="${esc(P.name)}"></label>
    <button class="big gold" data-go="online">🌐 معركة أونلاين 1 ضد 1</button>
    <button class="big" data-go="camp">🗺️ الحملة: ${CAMPAIGN[Math.min(P.camp || 0, CAMPAIGN.length - 1)].name} <small>(${P.camp || 0}/${CAMPAIGN.length})</small></button>
    <button class="big" data-go="ai">⚔️ معركة تدريب ضد الكمبيوتر</button>
    <button class="big" data-go="deck">🎖️ تجهيز الكتيبة</button>
    <button class="big" data-go="shop">📦 صناديق الإمداد</button>
    <button class="big" data-go="rules">📖 طريقة اللعب</button>
    <button class="gfxbtn" id="gfx">🎨 الجرافيك: ${P.gfx === '2d' ? 'بسيط (أسرع)' : '3D'}</button>
  </div>`;
  $('#pname').onchange = e => { P.name = e.target.value.trim().slice(0, 16) || P.name; save(); };
  $('#mute').onclick = () => { $('#mute').textContent = SFX.toggle() ? '🔊' : '🔇'; };
  $('#gfx').onclick = () => { P.gfx = P.gfx === '2d' ? '3d' : '2d'; save(); showMenu(); toast(P.gfx === '2d' ? 'الجرافيك البسيط أسرع على التليفونات الضعيفة' : 'جرافيك 3D'); };
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g) return;
  const n = $('#pname'); if (n) { P.name = n.value.trim().slice(0, 16) || P.name; save(); }
  ({ ai: showPractice, camp: showCampaign, online: showOnline, deck: showDeck, shop: showShop, rules: showRules, menu: showMenu })[g.dataset.go]();
});

function showRules() {
  app().innerHTML = `<div class="screen rules"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>طريقة اللعب</h2></div><div class="txt">
  <h3>الهدف</h3><p>كل ناحية ليها <b>قيادة 🏰</b> في الآخر و<b>تحصينين</b> قدّامها، واحد على كل طريق (يمين وشمال). جنودك بيمشوا لوحدهم على الأرض ناحية العدو، وبيدمّروا التحصين اللي في طريقهم وبعدين القيادة. <b>اللي يدمّر القيادة يكسب على طول.</b></p>
  <h3>الإمداد ⛽</h3><p>الإمداد بيتملي لوحده مع الوقت (أقصاه 10). كل كارت ليه تمن. في آخر دقيقة الإمداد بيتملي أسرع ×2.</p>
  <h3>تنزيل الكروت</h3><p>دوس على كارت من تحت، وبعدين دوس على الخريطة في نصّك (أو اسحب الكارت للخريطة). اللون الأحمر مكان ممنوع. لو دمّرت تحصين للعدو، الطريق ده بيتفتح وتقدر تنزل لحد نص أرضه. التكتيكات زي القصف والطيارات تقدر ترميها في أي حتة.</p>
  <h3>الوقت</h3><p>المعركة 3 دقايق. لو محدش دمّر القيادة، اللي دمّر تحصينات أكتر يكسب. لو متعادلين فيه وقت إضافي دقيقة، وأول تحصين يقع بيحسم.</p>
  <h3>مين يغلب مين</h3><ul>
   <li><b>🛡️ الدبابات</b> عندها درع، فالرشاشات والبنادق تقريبًا مش بتأثّر فيها، وهي ممتازة ضد التحصينات.</li>
   <li><b>🧨 مضاد الدروع</b> (بندقية T-Gewehr، الشحنة المجمّعة، مدفع 77، مارك 4 ذكر، سان شاموند) هو اللي بيكسّر الدبابات.</li>
   <li><b>💢 مضاد الأفراد</b> (الرشاشات، قاذف اللهب، مارك 4 أنثى) بيحصد المشاة.</li>
   <li><b>المدفعية</b> بتضرب من بعيد بقذايف بتطير، وبتنفجر في منطقة. ضعيفة لو العدو وصلها.</li>
   <li><b>المسعف</b> مش بيضرب، بس بيعالج اللي جنبه.</li></ul>
  <h3>الخرايط</h3><p>9 خرايط من جبهات حقيقية. فيها أنهار مش بتتعدّي غير من الكباري، وطين بيبطّأ، وأسلاك شائكة بتعطّل المشاة.</p>
  <h3>الكتيبة والمستويات</h3><p>بتدخل المعركة بـ ${RT_DECK_TROOPS} كروت وحدات و ${RT_DECK_TACTICS} تكتيكات، كل كارت مرة واحدة. في إيدك 4 كروت، ولما تلعب واحد بييجي اللي بعده. النسخ المكررة من الصناديق بتعلّي <b>مستوى</b> الكارت (+7% صحة وضرر لكل مستوى).</p>
  <h3>صور الكروت</h3><p>صور الكروت صور حقيقية من الحرب العالمية الأولى من <b>Wikimedia Commons</b>، وأغلبها ملكية عامة لأنها أقدم من 100 سنة.</p>
  <div class="credits">${typeof PHOTOS !== 'undefined' ? Object.entries(PHOTOS).filter(([id, p]) => !p.r).map(([id, p]) => `<div><b>${esc(CARDS[id].name)}</b>: ${esc(p.t)} · ${esc(p.a || 'غير معروف')} · ${esc(p.l)}</div>`).join('') : ''}</div>
  <h3>ملاحظة تاريخية</h3><p>الـRPG ماكانش موجود في الحرب العالمية الأولى، فبدله فيه الأسلحة الحقيقية اللي استخدموها ضد الدبابات وقتها. والمظلّيين كانوا خطة أمريكية لسنة 1918 الحرب خلصت قبل تنفيذها.</p>
  </div></div>`;
}

// ---------- المتجر ----------
const PACK_PRICE = 100, PACK_SIZE = 4;
function showShop() {
  const pool = Object.values(CARDS).filter(c => !c.token && RT[c.id]);
  const owned = pool.filter(c => P.owned[c.id]).length;
  app().innerHTML = `<div class="screen shop"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>صناديق الإمداد</h2><span class="coins">🪙 ${P.coins}</span></div>
    <div class="crate" id="crate">📦</div>
    <p class="center">كل صندوق فيه ${PACK_SIZE} كروت. النسخ المكررة بتعلّي مستوى الكارت.</p>
    <button class="big gold" id="buy" ${P.coins < PACK_PRICE ? 'disabled' : ''}>افتح صندوق (${PACK_PRICE} 🪙)</button>
    <p class="center muted">مجموعتك: ${owned} من ${pool.length} كارت · المكسب: فوز تدريب 40-90 🪙، فوز أونلاين 120 🪙، خسارة 25 🪙</p>
    <div id="reveal" class="grid"></div></div>`;
  $('#buy').onclick = openPack;
}
function openPack() {
  if (P.coins < PACK_PRICE) return;
  P.coins -= PACK_PRICE;
  const pool = Object.values(CARDS).filter(c => !c.token && RT[c.id]);
  const W = { common: 58, rare: 29, epic: 10, legendary: 3 };
  const got = []; let refund = 0;
  for (let i = 0; i < PACK_SIZE; i++) {
    let r = Math.random() * 100, rar = 'common';
    for (const k of ['legendary', 'epic', 'rare', 'common']) { if (r < W[k]) { rar = k; break; } r -= W[k]; }
    // كروت جديدة الأول، وبعدين اللي محتاجة نسخ للمستوى الجاي
    const list = pool.filter(c => c.rarity === rar);
    const fresh = list.filter(c => !P.owned[c.id]);
    const arr = fresh.length && Math.random() < 0.6 ? fresh : list; const c = arr[Math.floor(Math.random() * arr.length)];
    const n = P.owned[c.id] || 0, before = cardLevel(n);
    let maxed = false;
    if (n >= 16) { refund += 20; maxed = true; } else P.owned[c.id] = n + 1;
    got.push({ c, isNew: n === 0, up: !maxed && cardLevel(n + 1) > before && n > 0, maxed });
  }
  P.coins += refund; save();
  SFX.play('pack');
  showShop();
  $('#crate').classList.add('open');
  $('#reveal').innerHTML = got.map((g, i) => `<div class="flip" style="animation-delay:${i * 0.25}s">${cardHTML(g.c, '', '', lvlOf(g.c.id))}${g.isNew ? '<i class="new">جديد!</i>' : g.up ? '<i class="new">⬆️ مستوى!</i>' : g.maxed ? '<i class="dup">+20 🪙</i>' : '<i class="dup">+1 نسخة</i>'}</div>`).join('');
}

// ---------- الكتيبة ----------
let draft = null, deckTab = 'troop';
function showDeck() { draft = P.rtDeck.slice(); renderDeck(); }
function renderDeck() {
  const tr = draft.filter(id => CARDS[id].kind === 'troop').length, tc = draft.length - tr;
  const list = Object.values(CARDS).filter(c => !c.token && RT[c.id] && c.kind === deckTab).sort((a, b) => a.cost - b.cost);
  const avg = draft.length ? (draft.reduce((a, id) => a + CARDS[id].cost, 0) / draft.length).toFixed(1) : 0;
  app().innerHTML = `<div class="screen deck"><div class="hdr"><button id="dback">→ رجوع</button><h2>الكتيبة</h2>
      <button id="dsave" class="gold" ${validRtDeck(draft) ? '' : 'disabled'}>حفظ</button></div>
    <div class="deckbar"><span class="${tr === RT_DECK_TROOPS ? 'ok' : ''}">🪖 وحدات ${tr}/${RT_DECK_TROOPS}</span><span class="${tc === RT_DECK_TACTICS ? 'ok' : ''}">🎴 تكتيكات ${tc}/${RT_DECK_TACTICS}</span><span>⛽ متوسط ${avg}</span></div>
    <div class="indeck">${draft.map(id => `<div class="chip" data-card="${id}">${icon(CARDS[id])}<b>${CARDS[id].cost}</b></div>`).join('')}</div>
    <div class="row2"><button id="dauto">⚡ رتّب لي</button><button id="dclear">🗑️ فضّي</button></div>
    <div class="tabs"><button data-tab="troop" class="${deckTab === 'troop' ? 'on' : ''}">جنود ودبابات ومدفعية</button><button data-tab="tactic" class="${deckTab === 'tactic' ? 'on' : ''}">تكتيكات</button></div>
    <div class="grid">${list.map(c => {
      const own = P.owned[c.id] || 0, inD = draft.includes(c.id);
      return `<div class="cell ${own ? '' : 'locked'} ${inD ? 'picked' : ''}" data-card="${c.id}">${cardHTML(c, '', '', own ? cardLevel(own) : 0)}<div class="cnt">${own ? (inD ? '✅ في الكتيبة' : `عندك ${own}`) : '🔒 مش عندك'}</div></div>`;
    }).join('')}</div></div>`;
  $('#dback').onclick = () => { if (draft.join() !== P.rtDeck.join() && validRtDeck(draft)) { P.rtDeck = draft.slice(); save(); toast('✅ اتحفظت'); } showMenu(); };
  $('#dsave').onclick = () => { P.rtDeck = draft.slice(); save(); toast('✅ الكتيبة اتحفظت'); };
  $('#dauto').onclick = () => { const keep = draft.slice(); const auto = autoDeck(P); draft = keep.concat(auto.filter(id => !keep.includes(id)));
    const t = draft.filter(id => CARDS[id].kind === 'troop').slice(0, RT_DECK_TROOPS), k = draft.filter(id => CARDS[id].kind === 'tactic').slice(0, RT_DECK_TACTICS); draft = t.concat(k); renderDeck(); };
  $('#dclear').onclick = () => { draft = []; renderDeck(); };
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { deckTab = b.dataset.tab; renderDeck(); });
  document.querySelectorAll('[data-card]').forEach(el => el.onclick = () => deckCardModal(el.dataset.card));
}
function deckCardModal(id) {
  const c = CARDS[id], own = P.owned[id] || 0, inD = draft.includes(id);
  const full = draft.filter(x => CARDS[x].kind === c.kind).length >= (c.kind === 'troop' ? RT_DECK_TROOPS : RT_DECK_TACTICS);
  modal(`<div class="mcard">${cardHTML(c, '', '', own ? cardLevel(own) : 0)}</div>${fullInfo(c)}
    <div class="row">${inD ? '<button data-m="rem">➖ شيل من الكتيبة</button>' : `<button data-m="add" class="gold" ${own && !full ? '' : 'disabled'}>➕ ضيف للكتيبة</button>`}<button data-m="x">قفل</button></div>
    ${!own ? '<p class="muted">الكارت ده بيطلع من صناديق الإمداد أو الحملة.</p>' : full && !inD ? '<p class="muted">القسم ده مليان، شيل كارت الأول (دوس عليه فوق).</p>' : ''}`,
    (e, m) => {
      const b = e.target.closest('[data-m]'); if (!b || b.disabled) return;
      if (b.dataset.m === 'add') draft.push(id);
      if (b.dataset.m === 'rem') draft.splice(draft.indexOf(id), 1);
      m.remove(); renderDeck();
    });
}

// ---------- التدريب والحملة ----------
const LEVELS = [{ n: 'سهل', d: 'مجنّد جديد بيغلط كتير', prize: 40 }, { n: 'متوسط', d: 'ضابط عارف شغله', prize: 60 }, { n: 'صعب', d: 'جنرال بيرد على كل حركة', prize: 90 }];
const FOES = ['الجنرال فون كلوك', 'المارشال فوش', 'الجنرال هيج', 'الجنرال لودندورف', 'الجنرال بيرشينج', 'المارشال جوفر', 'الجنرال بروسيلوف', 'الجنرال كادورنا'];
function randomRtDeck() {
  const pool = Object.values(CARDS).filter(c => !c.token && RT[c.id]);
  const sh = a => a.sort(() => Math.random() - 0.5);
  const tr = sh(pool.filter(c => c.kind === 'troop')), tc = sh(pool.filter(c => c.kind === 'tactic'));
  // لازم يبقى فيه مضاد دروع ودبابة واحدة على الأقل
  const deck = [tr.find(c => c.kw.includes('antiTank')), tr.find(c => c.type === 'ARM')];
  tr.forEach(c => deck.length < RT_DECK_TROOPS && !deck.includes(c) && deck.push(c));
  return deck.map(c => c.id).concat(tc.slice(0, RT_DECK_TACTICS).map(c => c.id));
}
function showPractice() {
  modal(`<h3>معركة تدريب</h3><p class="muted">اختار مستوى الخصم:</p><div class="col">${LEVELS.map((l, i) =>
    `<button data-lv="${i}" class="${i === (P.lastLevel ?? 1) ? 'gold' : ''}">${['🟢', '🟡', '🔴'][i]} ${l.n}<br><small>${l.d} · المكسب ${l.prize} 🪙</small></button>`).join('')}</div>
    <p class="muted">الخريطة</p><select id="mapsel"><option value="">🎲 عشوائي</option>${MAP_IDS.map(id => `<option value="${id}">${MAPS[id].name} (${MAPS[id].year})</option>`).join('')}</select>`, (e, m) => {
    const b = e.target.closest('[data-lv]'); if (!b) return; const mp = $('#mapsel').value; m.remove(); P.lastLevel = +b.dataset.lv; save(); startAI(+b.dataset.lv, null, mp);
  });
}
function startAI(level = 1, camp = null, mapId) {
  let foe = FOES[Math.floor(Math.random() * FOES.length)], deck = randomRtDeck(), hq = 1, lv = {}, map = mapId || MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)];
  if (camp != null) {
    const b = CAMPAIGN[camp]; foe = b.foe; level = b.level; hq = b.hq / 25; map = CAMP_MAPS[camp];
    const t = b.deck.filter((id, i, a) => CARDS[id].kind === 'troop' && a.indexOf(id) === i), k = b.deck.filter((id, i, a) => CARDS[id].kind === 'tactic' && a.indexOf(id) === i);
    deck = t.slice(0, RT_DECK_TROOPS).concat(k.slice(0, RT_DECK_TACTICS));
    deck.forEach(id => lv[id] = 1 + Math.floor(camp / 3));
  } else deck.forEach(id => lv[id] = Math.max(1, Math.round(avgLevel())));
  const myLv = {}; P.rtDeck.forEach(id => myLv[id] = lvlOf(id));
  const sim = newSim({ map, seed: (Math.random() * 2 ** 31) | 0, players: [{ name: P.name, deck: P.rtDeck, lv: myLv }, { name: foe, deck, lv, hq, regen: level === 2 ? 1.15 : 1 }] });
  startBattle({ mode: 'ai', sim, me: 0, level, camp });
}
function avgLevel() { return P.rtDeck.reduce((a, id) => a + lvlOf(id), 0) / P.rtDeck.length; }

function showCampaign() {
  leaveBattle();
  const done = P.camp || 0;
  app().innerHTML = `<div class="screen camp"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>الحملة 1914–1918</h2><span>${done}/${CAMPAIGN.length}</span></div>
    <div class="timeline">${CAMPAIGN.map((b, i) => {
      const st = i < done ? 'done' : i === done ? 'next' : 'lock';
      return `<div class="cbattle ${st}" data-b="${i}"><div class="yr">${b.year}</div><div class="bi"><b>${b.name}</b><small>🗺️ ${MAPS[CAMP_MAPS[i]].name} · ضد ${b.foe} · ${LEVELS[b.level].n}</small>
        <small>🎁 ${b.reward.coins} 🪙${b.reward.card ? ' + ' + CARDS[b.reward.card].name : ''}</small></div><div class="bs">${st === 'done' ? '✅' : st === 'next' ? '⚔️' : '🔒'}</div></div>`;
    }).join('')}</div></div>`;
  document.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
    const i = +el.dataset.b; if (i > done) return toast('🔒 كسّب المعركة اللي قبلها الأول');
    const b = CAMPAIGN[i], mp = MAPS[CAMP_MAPS[i]];
    modal(`<div class="story"><div class="yr">${b.year}</div><h3>${b.name}</h3><p>${b.story}</p><p class="muted">🗺️ ${mp.name}: ${mp.desc}<br>الخصم: ${b.foe} · قيادته ${Math.round(b.hq / 25 * 100)}% · مستوى ${LEVELS[b.level].n}</p>
      ${b.reward.card && i >= done ? `<p>🎁 الجايزة:</p><div class="mcard">${cardHTML(CARDS[b.reward.card])}</div>` : ''}
      <div class="row"><button data-m="go" class="gold">⚔️ ابدأ المعركة</button><button data-m="x">رجوع</button></div></div>`, (e, m) => {
      const k = e.target.closest('[data-m]'); if (!k) return; m.remove(); if (k.dataset.m === 'go') startAI(1, i);
    });
  });
}

// مكافأة يومية
function dailyBonus() {
  const today = new Date().toDateString();
  if (P.lastDaily === today) return;
  const first = !P.lastDaily; P.lastDaily = today; P.coins += 50; save();
  if (!first) setTimeout(() => toast('🎁 مكافأة اليوم: +50 🪙', 3000), 400);
}
