// ===== شاشة المعركة الحية + الأونلاين =====
let B = null;
const SNAP_MS = 100;

let RENDER = GFX;
function startBattle(o) {
  RENDER = window.GFX3 && GFX3.supported() ? GFX3 : GFX;
  leaveBattle(true);
  document.querySelectorAll('.modal').forEach(m => m.remove());
  B = { mode: o.mode, sim: o.sim || null, me: o.me, level: o.level ?? 1, camp: o.camp ?? null, sel: null, ghost: null, acc: 0, aiNext: 2, done: false,
    rm: [false, false], view: null, lastSnap: 0, outFx: [], handKey: '', paused: false, raf: 0, last: 0 };
  app().innerHTML = `<div class="battle">
    <div class="bhud"><button id="bmenu">☰</button>${B.mode !== 'ai' ? '<button id="emote">💬</button>' : ''}
      <span class="bname" id="foename"></span><span class="crw foe" id="crfoe">🏴 0</span><span class="btimer" id="btimer">3:00</span><span class="crw me" id="crme">0 🏴</span></div>
    <div class="bfield"><canvas id="cv"></canvas><div class="mapname" id="mapname"></div><div class="loading" id="loading">⏳ بيجهّز ساحة المعركة...</div></div>
    <div class="dock"><div class="bhand" id="bhand"></div>
      <div class="supbar"><div class="supfill" id="supfill"></div><div class="supcells">${'<i></i>'.repeat(MAX_SUPPLY)}</div><span id="supnum">⛽ 5</span></div></div>
  </div>`;
  RENDER.init($('#cv'));
  if (B.sim) setupMap(B.sim.mapId, B.sim.gid);
  $('#bmenu').onclick = battleMenu;
  const em = $('#emote'); if (em) em.onclick = emoteMenu;
  bindInput();
  window.addEventListener('resize', onResize);
  B.raf = requestAnimationFrame(loop);
  if (B.mode === 'ai' && !P.tut) { B.paused = true; showTutorial(0, () => { B.paused = false; }); }
  else SFX.play('bugle');
}
function setupMap(mapId, seed) {
  RENDER.setup(mapId, seed, B.me); onResize();
  const m = MAPS[mapId]; $('#mapname').textContent = `🗺️ ${m.name} ${m.year}`; $('#mapname').classList.add('show');
  setTimeout(() => { const e = $('#mapname'); e && e.classList.remove('show'); }, 3500);
  B.mapId = mapId;
}
function onResize() { if (B && $('#cv')) RENDER.resize(); }
function leaveBattle(keepNet) {
  if (B) { cancelAnimationFrame(B.raf); B.offInput && B.offInput(); RENDER.dispose && RENDER.dispose(); B = null; }
  window.removeEventListener('resize', onResize);
  if (!keepNet) leaveNet();
}

// ---------- قراءة الحالة (سواء محاكاة محلية أو لقطة من الهوست) ----------
const st = {
  hand: () => B.view ? B.view.hand : B.sim.pl[B.me].hand,
  next: () => B.view ? B.view.next : B.sim.pl[B.me].queue[0],
  sup: () => B.view ? B.view.sup + (performance.now() - B.view.recv) / 1000 / (B.view.fast ? 1.2 : 2.4) : B.sim.pl[B.me].sup,
  left: () => B.view ? B.view.left - (B.view.winner == null ? (performance.now() - B.view.recv) / 1000 : 0) : B.sim.left,
  ot: () => B.view ? B.view.ot : B.sim.ot,
  crowns: () => B.view ? B.view.crowns : B.sim.crowns,
  winner: () => B.view ? B.view.winner : B.sim.winner,
  names: () => B.view ? B.view.names : B.sim.pl.map(p => p.name),
  ents: () => B.view ? B.view.list : B.sim.ents,
};

function loop(ts) {
  if (!B) return;
  B.raf = requestAnimationFrame(loop);
  const dt = Math.min(0.1, B.last ? (ts - B.last) / 1000 : 0.016); B.last = ts;
  let ents, t;
  const loading = RENDER.ready && !RENDER.ready();
  const ld = $('#loading'); if (ld) ld.style.display = loading ? 'flex' : 'none';
  if (loading) { RENDER.frame({ ents: [], t: 0, ghost: null }, dt); return; }
  if (B.sim) {
    if (!B.paused) {
      B.acc += dt;
      let n = 0;
      while (B.acc >= SIM_DT && n++ < 6) {
        B.acc -= SIM_DT; stepSim(B.sim);
        if (B.mode === 'ai' && B.sim.t >= B.aiNext && B.sim.winner == null) {
          B.aiNext = B.sim.t + [1.5, 0.85, 0.5][B.level] + Math.random() * 0.4;
          const o = rtAiThink(B.sim, 1 - B.me, B.level); if (o) playCard(B.sim, 1 - B.me, o.hi, o.x, o.y);
        }
      }
    }
    const map = new Map(); B.sim.ents.forEach(e => map.set(e.id, e));
    B.sim.fx.forEach(f => { if (f.k === 'play' && f.card === 'x_mine' && f.side !== B.me) return; RENDER.fx(f, map); });
    if (B.mode === 'host') B.outFx.push(...B.sim.fx.filter(f => f.k !== 'play' || f.card !== 'x_mine' || f.side === 1));
    B.sim.fx.length = 0;
    ents = B.sim.ents; t = B.sim.t;
    if (B.mode === 'host' && ts - B.lastSnap > SNAP_MS) { B.lastSnap = ts; sendSnap(); }
  } else if (B.view) { interp(); ents = B.view.list; t = B.view.t0 + (performance.now() - B.view.recv) / 1000; }
  else { drawWaiting(); return; }
  RENDER.frame({ ents, t, ghost: B.ghost }, dt);
  if (!B.hudT || ts - B.hudT > 90) { B.hudT = ts; hud(); }
  if (st.winner() != null && !B.done) { B.done = true; setTimeout(finishBattle, 1400); }
}
function drawWaiting() { }

function hud() {
  const names = st.names(), me = B.me, cr = st.crowns();
  $('#foename').textContent = names[1 - me];
  $('#crfoe').textContent = '🏴 ' + cr[1 - me]; $('#crme').textContent = cr[me] + ' 🏴';
  const left = Math.max(0, st.left()), ot = st.ot();
  $('#btimer').textContent = (ot ? '⏱️ ' : '') + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  $('#btimer').classList.toggle('warn', left < 30 || ot);
  const sup = Math.min(MAX_SUPPLY, st.sup());
  $('#supfill').style.width = (sup / MAX_SUPPLY * 100) + '%';
  $('#supnum').textContent = '⛽ ' + Math.floor(sup);
  $('.supbar').classList.toggle('fast', ot || left <= 60);
  const hand = st.hand(), key = hand.join() + '|' + B.sel + '|' + st.next();
  if (key !== B.handKey) {
    B.handKey = key;
    $('#bhand').innerHTML = hand.map((id, i) => { const c = CARDS[id]; const ph = photo(id); return `<div class="hc ${c.kind} r-${c.rarity} ${ph ? 'hasph' : ''} ${B.sel === i ? 'sel' : ''}" data-i="${i}" ${ph ? `style="background-image:url('${ph.f}')"` : ''}><b class="hcost">${c.cost}</b>${ph ? '' : icon(c)}<span>${esc(c.name)}</span></div>`; }).join('')
      + `<div class="hnext ${st.next() && photo(st.next()) ? 'hasph' : ''}" ${st.next() && photo(st.next()) ? `style="background-image:url('${photo(st.next()).f}')"` : ''}><small>الجاي</small>${st.next() && !photo(st.next()) ? icon(CARDS[st.next()]) : ''}</div>`;
  }
  document.querySelectorAll('.hc').forEach(el => { const c = CARDS[hand[+el.dataset.i]]; el.classList.toggle('dim', !c || c.cost > sup); });
  if (B.sel != null && B.ghost) B.ghost.ok = B.ghost.x != null && ghostOk(B.ghost.x, B.ghost.y);
}

// ---------- اللمس والسحب ----------
function selCard() { return B && B.sel != null ? st.hand()[B.sel] : null; }
function openLanes() {
  const ents = st.ents();
  return [0, 1].filter(l => !ents.some(e => e.t === 's' && e.kind === 'bunker' && e.side !== B.me && e.hp > 0 && laneOf(mir(B.me, e.x, e.y)[0]) === l));
}
function makeGhost() {
  const id = selCard(); if (!id) { B.ghost = null; return; }
  const s = RT[id], c = CARDS[id];
  B.ghost = { zone: c.kind === 'troop' || s.zone === 'own' ? 'own' : 'any', r: c.kind === 'tactic' ? s.r : 10, range: c.kind === 'troop' ? s.r : 0, open: openLanes(), x: null, y: null, ok: false };
}
function ghostOk(x, y) {
  const id = selCard(); if (!id) return false;
  if (CARDS[id].cost > st.sup()) return false;
  return canDeploy({ ents: st.ents() }, B.me, id, x, y);
}
function bindInput() {
  const cv = $('#cv');
  let fromCard = false, downOnCv = false;
  $('#bhand').addEventListener('pointerdown', e => {
    const el = e.target.closest('.hc'); if (!el || st.winner() != null) return;
    const i = +el.dataset.i;
    B.sel = B.sel === i ? null : i; fromCard = B.sel != null; makeGhost(); B.handKey = ''; hud();
    if (B.sel != null) SFX.play('card');
  });
  cv.addEventListener('pointerdown', e => { if (B.sel == null) return; downOnCv = true; moveGhost(e); });
  const over = e => { const r = cv.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  function moveGhost(e) { if (!B || !B.ghost) return; const [x, y] = RENDER.toWorld(e.clientX, e.clientY); B.ghost.x = x; B.ghost.y = y; B.ghost.ok = ghostOk(x, y); }
  B.onMove = e => { if (!B || B.sel == null) return; if ((fromCard || downOnCv) && over(e)) moveGhost(e); };
  B.onUp = e => {
    if (!B) return;
    const wasCard = fromCard, wasCv = downOnCv; fromCard = downOnCv = false;
    if (B.sel == null) return;
    if ((wasCv || wasCard) && over(e)) { const [x, y] = RENDER.toWorld(e.clientX, e.clientY); deploy(x, y); }
  };
  document.addEventListener('pointermove', B.onMove); document.addEventListener('pointerup', B.onUp);
  const off = () => { document.removeEventListener('pointermove', B && B.onMove); document.removeEventListener('pointerup', B && B.onUp); };
  B.offInput = off;
}
function deploy(x, y) {
  const id = selCard(); if (!id) return;
  if (CARDS[id].cost > st.sup()) { toast('⛽ الإمداد مش كفاية'); return; }
  if (!canDeploy({ ents: st.ents() }, B.me, id, x, y)) { toast('🚫 مش مسموح تنزل هنا'); B.ghost && (B.ghost.x = null); return; }
  const hi = B.sel;
  if (B.mode === 'guest') { netSend({ type: 'deploy', hi, card: id, x, y }); B.view.sup -= CARDS[id].cost; }
  else { const err = playCard(B.sim, B.me, hi, x, y); if (err) { toast(err); return; } }
  SFX.play(CARDS[id].type === 'ARM' ? 'clank' : 'thud');
  navigator.vibrate && navigator.vibrate(15);
  B.sel = null; B.ghost = null; B.handKey = '';
}

// ---------- القائمة والنهاية ----------
function battleMenu() {
  if (B.mode === 'ai') B.paused = true;
  modal(`<h3>القائمة</h3><div class="col"><button data-m="tut">🎓 الشرح السريع</button>
    <button data-m="snd">${SFX.on() ? '🔊 الصوت شغّال' : '🔇 الصوت مقفول'}</button>
    <button data-m="quit" class="red">🏳️ استسلام والخروج</button><button data-m="x">رجوع للمعركة</button></div>`, (e, m) => {
    const b = e.target.closest('[data-m]'); if (!b) return; m.remove();
    const k = b.dataset.m;
    if (k === 'snd') { SFX.toggle(); return battleMenu(); }
    if (k === 'tut') return showTutorial(0, () => { if (B) B.paused = false; });
    if (k === 'quit') {
      if (st.winner() != null) return showMenu();
      if (B.mode === 'guest') { netSend({ type: 'concede' }); B.view.winner = 1 - B.me; }
      else { B.sim.winner = 1 - B.me; }
    }
    if (B) B.paused = false;
  });
  // لو قفل القائمة بالضغط برّه
  setTimeout(() => { const m = document.querySelector('.modal'); m && m.addEventListener('click', e => { if (e.target === m && B) B.paused = false; }); }, 0);
}

function finishBattle() {
  if (!B) return;
  const w = st.winner(), win = w === B.me, draw = w === -1, cr = st.crowns();
  let prize = draw ? 40 : win ? (B.mode === 'ai' ? LEVELS[B.level].prize : 120) : 25, extra = '';
  if (B.camp != null && win) {
    const b = CAMPAIGN[B.camp];
    if (B.camp === (P.camp || 0)) {
      P.camp = B.camp + 1; prize = b.reward.coins;
      if (b.reward.card) { const id = b.reward.card; P.owned[id] = (P.owned[id] || 0) + 1; extra = `<p>🎁 كارت ${P.owned[id] > 1 ? '(نسخة زيادة)' : 'جديد'}:</p><div class="mcard">${cardHTML(CARDS[id], '', '', lvlOf(id))}</div>`; }
      if (P.camp >= CAMPAIGN.length) extra += '<p>🎖️ خلّصت الحملة كلها! الحرب انتهت في 11 نوفمبر 1918.</p>';
    } else prize = 40;
  }
  P.coins += prize; if (win) P.wins++; else if (!draw) P.losses++; save();
  SFX.play(win ? 'win' : 'lose');
  const nextCamp = B.camp != null && win && B.camp + 1 < CAMPAIGN.length;
  const btns = B.mode === 'ai'
    ? (B.camp != null ? (nextCamp ? '<button data-m="next" class="gold">المعركة الجاية ⚔️</button>' : '') + `<button data-m="retry" class="${win ? '' : 'gold'}">🔁 العب تاني</button><button data-m="camp">🗺️ الحملة</button>`
      : '<button data-m="again" class="gold">معركة تانية</button>')
    : '<button data-m="rematch" class="gold">🔁 إعادة مع نفس الخصم</button>';
  modal(`<div class="result ${win ? 'win' : 'lose'}"><div class="big-emo">${draw ? '🤝' : win ? '🏆' : '💀'}</div><h2>${draw ? 'تعادل' : win ? 'نصر!' : 'هزيمة'}</h2>
    <p class="crline">🏴 ${cr[B.me]} - ${cr[1 - B.me]} 🏴</p><p>+${prize} 🪙</p>${extra}
    <div class="col">${btns}<button data-m="menu">القائمة الرئيسية</button></div></div>`, (e, m) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const k = b.dataset.m;
    if (k === 'rematch') { b.disabled = true; b.textContent = '⏳ مستني الخصم يوافق...'; askRematch(); return; }
    m.remove();
    const lv = B.level, camp = B.camp;
    if (k === 'again') startAI(lv);
    else if (k === 'retry') startAI(lv, camp);
    else if (k === 'next') startAI(1, camp + 1);
    else if (k === 'camp') showCampaign();
    else showMenu();
  });
}

const TUT = [
  ['🏰', 'الهدف', 'دمّر <b>قيادة العدو</b> فوق قبل ما يدمّر <b>قيادتك</b> تحت. قدّام كل قيادة <b>تحصينين</b>، واحد على كل طريق.'],
  ['🃏', 'نزّل جنودك', 'دوس على كارت من تحت، وبعدين دوس على الخريطة في نصّك. (أو اسحب الكارت للخريطة). اللون الأحمر = ممنوع.'],
  ['🚶', 'هما بيتحركوا لوحدهم', 'الجنود والدبابات بيمشوا لوحدهم ناحية التحصين اللي في طريقهم، وبيضربوا أي عدو يقابلهم.'],
  ['⛽', 'الإمداد', 'الشريط اللي تحت بيتملي مع الوقت. كل كارت ليه تمن (الرقم الأزرق). في آخر دقيقة بيتملي أسرع.'],
  ['🧨', 'حجر-ورقة-مقص', 'الدبابات ضد التحصينات والمشاة، <b>مضاد الدروع 🧨</b> ضد الدبابات، و<b>الرشاشات 💢</b> ضد المشاة. التكتيكات (قصف، طيارات، غاز) ترميها في أي حتة.'],
];
function showTutorial(i = 0, done) {
  const [e, t, s] = TUT[i];
  modal(`<div class="tut"><div class="big-emo">${e}</div><h3>${t}</h3><p>${s}</p><div class="dots">${TUT.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row"><button data-m="skip">تخطّي</button><button data-m="next" class="gold">${i < TUT.length - 1 ? 'التالي ←' : 'يلا بينا ⚔️'}</button></div></div>`, (ev, m) => {
    const b = ev.target.closest('[data-m]'); if (!b) return; m.remove();
    if (b.dataset.m === 'next' && i < TUT.length - 1) showTutorial(i + 1, done); else { P.tut = 1; save(); done && done(); }
  });
}

// ---------- الأونلاين ----------
const NET = { peer: null, conn: null, guest: null };
const PREFIX = 'ww1-front-rt-';
const QSLOTS = 6;
const EMOTES = ['👋 أهلًا يا قائد', '🫡 تحية عسكرية', '😮 ضربة حلوة!', '😂', '🤔 بفكّر...', '🔥 مش هتعدّي!'];
function peerOpts() { const h = new URLSearchParams(location.search).get('peerhost'); if (!h) return { debug: 0 }; const [host, port] = h.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 0 }; }
function loadPeer() { return new Promise((res, rej) => { if (window.Peer) return res(); const s = document.createElement('script'); s.src = 'peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('net')); document.head.appendChild(s); }); }
function leaveNet() { NET.searching = false; try { NET.conn && NET.conn.close(); } catch (e) {} try { NET.peer && NET.peer.destroy(); } catch (e) {} NET.peer = NET.conn = NET.guest = null; }
function genCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function netStatus(t) { const e = $('#netst'); if (e) e.innerHTML = t; }
function netSend(o) { try { NET.conn && NET.conn.open && NET.conn.send(o); } catch (e) {} }
function myLevels() { const lv = {}; P.rtDeck.forEach(id => lv[id] = lvlOf(id)); return lv; }

function showOnline() {
  leaveBattle();
  app().innerHTML = `<div class="screen online"><div class="hdr"><button data-go="menu">→ رجوع</button><h2>أونلاين 1 ضد 1</h2></div>
    <p class="center">هتدخل بكتيبتك المحفوظة (${RT_DECK_TROOPS} وحدات + ${RT_DECK_TACTICS} تكتيكات).</p>
    <button class="big gold" id="quick">🔎 دوّر على خصم عشوائي</button>
    <div class="or">أو العب مع صاحبك</div>
    <button class="big" id="host">🏕️ اعمل أوضة بكود</button>
    <div class="join"><input id="code" maxlength="5" placeholder="كود الأوضة" autocapitalize="characters"><button class="big" id="join">🚪 ادخل</button></div>
    <div id="netst" class="netst"></div></div>`;
  $('#quick').onclick = quickMatch;
  $('#host').onclick = () => hostRoom();
  $('#join').onclick = () => { const c = $('#code').value.trim().toUpperCase(); if (c.length !== 5) return toast('الكود 5 حروف'); joinRoom(c); };
}
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
    else if (!B) netStatus('❌ مشكلة في الاتصال: ' + e.type);
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
  const sim = newSim({ map: MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)], seed: (Math.random() * 2 ** 31) | 0,
    players: [{ name: P.name, deck: P.rtDeck, lv: myLevels() }, { name: g.name, deck: g.deck, lv: g.lv }] });
  startBattle({ mode: 'host', sim, me: 0 });
}
function hostData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'hello' && !B) {
    if (!validRtDeck(d.deck)) { netSend({ type: 'err', msg: 'الكتيبة بتاعتك مش صالحة' }); return; }
    const lv = {}; d.deck.forEach(id => lv[id] = Math.max(1, Math.min(5, (d.lv && d.lv[id]) | 0 || 1)));
    NET.guest = { name: String(d.name || 'جندي').slice(0, 16), deck: d.deck, lv };
    hostNewGame();
  } else if (d.type === 'deploy' && B && B.mode === 'host') {
    const p = B.sim.pl[1];
    if (p.hand[d.hi] !== d.card) return netSend({ type: 'err', msg: 'الكارت اتغيّر' });
    const err = playCard(B.sim, 1, d.hi | 0, +d.x, +d.y); if (err) netSend({ type: 'err', msg: err });
  } else if (d.type === 'concede' && B && B.mode === 'host' && B.sim.winner == null) B.sim.winner = 0;
  else onCommonMsg(d);
}
// لقطة مضغوطة للضيف كل 100 مللي ثانية
function sendSnap() {
  const s = B.sim, r = v => Math.round(v * 10) / 10;
  const e = [];
  s.ents.forEach(x => {
    if (x.t === 'u') e.push(['u', x.id, x.card, x.side, r(x.x), r(x.y), Math.ceil(x.hp), x.max, r(x.face), r(Math.max(0, x.dep)), x.para, x.moving]);
    else if (x.t === 's') e.push(['s', x.id, x.kind, x.side, x.x, x.y, Math.ceil(x.hp), x.max, r(x.face), x.r]);
    else if (x.t === 'z') { if (x.kind === 'mine' && x.side !== 1) return; e.push(['z', x.id, x.kind, x.side, r(x.x), r(x.y), x.r]); }
    else if (x.t === 'p') e.push(['p', x.id, x.side, r(x.x0), r(x.y0), r(x.x), r(x.y), Math.round((x.at - s.t) * 1000), Math.round(x.dur * 1000), x.w]);
  });
  const p = s.pl[1];
  netSend({ type: 'snap', g: s.gid, m: s.mapId, t: s.t, left: s.left, ot: s.ot, cr: s.crowns, w: s.winner, sup: p.sup, hand: p.hand, next: p.queue[0],
    names: s.pl.map(x => x.name), fast: s.ot || s.left <= 60, e, fx: B.outFx.slice(-80) });
  B.outFx = [];
}
function guestData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'snap') {
    if (!B || B.mode !== 'guest' || !B.view || B.view.g !== d.g) {
      startBattle({ mode: 'guest', me: 1 });
      B.view = { g: d.g, ents: new Map(), list: [] };
      setupMap(d.m, d.g);
    }
    const v = B.view, now = performance.now();
    Object.assign(v, { t0: d.t, left: d.left, ot: d.ot, crowns: d.cr, winner: d.w, sup: d.sup, hand: d.hand, next: d.next, names: d.names, fast: d.fast, recv: now });
    const seen = new Set();
    d.e.forEach(a => {
      const id = a[1]; seen.add(id); let o = v.ents.get(id);
      if (a[0] === 'u') {
        if (!o) { o = { t: 'u', id, card: a[2], side: a[3], x: a[4], y: a[5], walk: 0 }; v.ents.set(id, o); }
        o.px = o.x; o.py = o.y; o.nx = a[4]; o.ny = a[5]; o.hp = a[6]; o.max = a[7]; o.face = a[8]; o.dep = a[9]; o.para = a[10]; o.moving = a[11];
      } else if (a[0] === 's') {
        if (!o) { o = { t: 's', id, kind: a[2], side: a[3] }; v.ents.set(id, o); }
        Object.assign(o, { x: a[4], y: a[5], hp: a[6], max: a[7], face: a[8], r: a[9] });
      } else if (a[0] === 'z') { if (!o) { o = { t: 'z', id }; v.ents.set(id, o); } Object.assign(o, { kind: a[2], side: a[3], x: a[4], y: a[5], r: a[6] }); }
      else if (a[0] === 'p') { if (!o) { o = { t: 'p', id, side: a[2], x0: a[3], y0: a[4], x: a[5], y: a[6], at: d.t + a[7] / 1000, dur: a[8] / 1000, w: a[9] }; v.ents.set(id, o); } }
    });
    for (const id of v.ents.keys()) if (!seen.has(id)) v.ents.delete(id);
    v.list = [...v.ents.values()];
    (d.fx || []).forEach(f => RENDER.fx(f, v.ents));
    if (B.sel != null && !v.hand[B.sel]) B.sel = null;
  } else if (d.type === 'err') toast(d.msg);
  else if (d.type === 'busy') netStatus('❌ الأوضة دي فيها معركة شغّالة');
  else onCommonMsg(d);
}
function interp() {
  const v = B.view, k = Math.min(1, (performance.now() - v.recv) / SNAP_MS);
  v.list.forEach(o => { if (o.t !== 'u' || o.nx == null) return; const ox = o.x, oy = o.y; o.x = o.px + (o.nx - o.px) * k; o.y = o.py + (o.ny - o.py) * k; o.walk += Math.hypot(o.x - ox, o.y - oy); });
}
function attachGuest(conn) {
  NET.conn = conn;
  conn.on('data', guestData);
  conn.on('close', () => { if (NET.conn === conn) peerLeft(); });
}
function hello() { return { type: 'hello', name: P.name, deck: P.rtDeck, lv: myLevels() }; }
async function joinRoom(code) {
  leaveNet(); netStatus('⏳ بيتصل...');
  try { await loadPeer(); } catch (e) { return netStatus('❌ مفيش اتصال بالنت'); }
  const peer = new Peer(peerOpts()); NET.peer = peer;
  peer.on('error', e => { if (!B) netStatus(e.type === 'peer-unavailable' ? '❌ الكود غلط أو الأوضة اتقفلت' : '❌ مشكلة في الاتصال: ' + e.type); });
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + code, { reliable: true }); attachGuest(conn);
    conn.on('open', () => { netStatus('✅ اتصلت! المعركة بتبدأ...'); conn.send(hello()); });
  });
}
async function quickMatch() {
  leaveNet(); NET.searching = true;
  netStatus('<div class="radar">📡</div>🔎 بيدوّر على خصم...');
  try { await loadPeer(); } catch (e) { return netStatus('❌ مفيش اتصال بالنت'); }
  const gp = new Peer(peerOpts()); NET.peer = gp;
  const opened = await new Promise(res => { gp.on('open', () => res(true)); gp.on('error', () => res(false)); setTimeout(() => res(false), 10000); });
  if (!opened) { if (NET.peer === gp) netStatus('❌ مش قادر يوصل لسيرفر الاتصال'); return; }
  const free = [];
  for (let n = 1; n <= QSLOTS; n++) {
    if (NET.peer !== gp || !NET.searching) return;
    const r = await tryJoin(gp, PREFIX + 'q' + n);
    if (r === 'ok') { NET.searching = false; return; }
    if (r === 'none') free.push(n);
  }
  if (NET.peer !== gp || !NET.searching) return;
  gp.destroy(); NET.peer = null;
  const tryHost = () => { if (!free.length) return netStatus('😕 كل أوض الانتظار مشغولة. جرّب تاني كمان شوية أو اعمل أوضة بكود.'); hostRoom(PREFIX + 'q' + free.shift(), tryHost); };
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
    conn.on('open', () => conn.send(hello()));
    conn.on('data', d => {
      if (!d || done) return;
      if (d.type === 'busy') { conn.close(); fin('busy'); }
      else if (d.type === 'snap') { fin('ok'); attachGuest(conn); guestData(d); }
    });
    conn.on('close', () => fin('busy'));
  });
}
function onCommonMsg(d) {
  if (d.type === 'emote' && B) showEmote(false, EMOTES[d.i | 0] || '👋');
  if (d.type === 'rematch' && B && st.winner() != null) {
    toast('🔁 الخصم عايز يلعب تاني');
    B.rm[1 - B.me] = true;
    if (B.mode === 'host' && B.rm[0] && B.rm[1]) hostNewGame();
  }
}
function askRematch() { if (!B) return; B.rm[B.me] = true; netSend({ type: 'rematch' }); if (B.mode === 'host' && B.rm[1]) hostNewGame(); }
function emoteMenu() {
  modal(`<h3>رسالة سريعة</h3><div class="col">${EMOTES.map((t, i) => `<button data-e="${i}">${t}</button>`).join('')}</div>`, (e, m) => {
    const b = e.target.closest('[data-e]'); if (!b) return; m.remove();
    const now = Date.now(); if (now - (NET.lastEmote || 0) < 2500) return toast('استنى شوية'); NET.lastEmote = now;
    netSend({ type: 'emote', i: +b.dataset.e }); showEmote(true, EMOTES[+b.dataset.e]);
  });
}
function showEmote(mine, t) {
  const b = document.createElement('div'); b.className = 'emote ' + (mine ? 'mine' : 'theirs'); b.textContent = t;
  document.body.appendChild(b); b.style.top = mine ? 'auto' : '56px'; if (mine) b.style.bottom = '160px';
  SFX.play('card'); setTimeout(() => b.remove(), 2800);
}
function peerLeft() {
  NET.conn = null;
  if (B && B.mode !== 'ai' && st.winner() == null) { toast('📴 الخصم خرج من المعركة', 3000); if (B.sim) B.sim.winner = B.me; else if (B.view) B.view.winner = B.me; }
  else if (B && B.mode !== 'ai') toast('📴 الخصم خرج', 2500);
  else if (!B) netStatus('📴 الاتصال اتقطع');
}

dailyBonus();
showMenu();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
