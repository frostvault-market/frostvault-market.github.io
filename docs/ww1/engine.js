// ===== محرك اللعبة: نفس الكود بيشتغل عند الهوست وضد الكمبيوتر =====
const HQ_HP = 25, SLOTS = 5, MAX_HAND = 8, MAX_SUP = 10, MAX_TRAPS = 2;

function rnd(st) {
  st.seed = (st.seed + 0x6D2B79F5) | 0; let t = st.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(st, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function has(u, k) { return CARDS[u.id].kw.includes(k); }

function validDeck(deck) {
  if (!Array.isArray(deck)) return false;
  let tr = 0, tc = 0; const cnt = {};
  for (const id of deck) {
    const c = CARDS[id]; if (!c || c.token) return false;
    cnt[id] = (cnt[id] || 0) + 1; if (cnt[id] > maxCopies(id)) return false;
    c.kind === 'troop' ? tr++ : tc++;
  }
  return tr === DECK_TROOPS && tc === DECK_TACTICS;
}

function newGame(a, b, seed) {
  const st = { seed: seed | 0, players: [], turn: 0, turnNo: 0, winner: null, log: [], events: [], ev: 0, uid: 1 };
  [a, b].forEach(p => {
    const troops = shuffle(st, p.deck.filter(id => CARDS[id].kind === 'troop'));
    const tacs = shuffle(st, p.deck.filter(id => CARDS[id].kind === 'tactic'));
    const hand = troops.splice(0, 3).concat(tacs.splice(0, 1));   // اليد الأولى: 3 جنود + تكتيك
    st.players.push({ name: String(p.name || 'جندي').slice(0, 16), hq: HQ_HP, supply: 0, maxSupply: 0,
      deck: shuffle(st, troops.concat(tacs)), hand, board: Array(SLOTS).fill(null), traps: 0, fatigue: 0 });
  });
  st.turn = rnd(st) < 0.5 ? 0 : 1;
  draw(st, 1 - st.turn); // اللاعب التاني بياخد كارت زيادة
  log(st, `🎖️ ${st.players[st.turn].name} بيبدأ الهجوم`);
  startTurn(st);
  return st;
}

function log(st, s) { st.log.push(s); if (st.log.length > 40) st.log.shift(); }
function evt(st, e) { e.id = ++st.ev; st.events.push(e); }

function draw(st, pi, n = 1) {
  const p = st.players[pi];
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) { p.fatigue++; p.hq -= p.fatigue; evt(st, { k: 'dmg', p: pi, s: -1, n: p.fatigue }); log(st, `📭 ${p.name} خلصت كروته وخد ${p.fatigue} ضرر`); continue; }
    const id = p.deck.shift();
    if (p.hand.length >= MAX_HAND) log(st, `🔥 إيد ${p.name} مليانة، اتحرق كارت ${CARDS[id].name}`);
    else p.hand.push(id);
  }
}

function startTurn(st) {
  st.turnNo++;
  const pi = st.turn, p = st.players[pi];
  p.maxSupply = Math.min(MAX_SUP, p.maxSupply + 1); p.supply = p.maxSupply;
  p.board.forEach(u => { if (!u) return; if (u.stun > 0) { u.canAtk = false; u.stun--; } else u.canAtk = true; });
  draw(st, pi);
  evt(st, { k: 'turn', p: pi });
  checkWin(st);
}
function endTurn(st) { st.turn = 1 - st.turn; startTurn(st); }

function summon(st, pi, slot, id) {
  const c = CARDS[id];
  const u = { uid: st.uid++, id, atk: c.atk, hp: c.hp, maxHp: c.hp, armor: c.armor, guard: c.kw.includes('guard'), canAtk: c.kw.includes('charge'), stun: 0 };
  st.players[pi].board[slot] = u;
  evt(st, { k: 'spawn', p: pi, s: slot });
  const op = st.players[1 - pi];
  if (op.traps > 0) { op.traps--; log(st, `💥 ${c.name} داس على لغم!`); damage(st, pi, slot, 4); }
  return u;
}

function damage(st, pi, s, n) {
  if (n <= 0) { evt(st, { k: 'block', p: pi, s }); return; }
  if (s < 0) st.players[pi].hq -= n; else { const u = st.players[pi].board[s]; if (!u) return; u.hp -= n; }
  evt(st, { k: 'dmg', p: pi, s, n });
}
function heal(st, pi, s, n) {
  const p = st.players[pi];
  if (s < 0) { const h = Math.min(n, HQ_HP - p.hq); if (h > 0) { p.hq += h; evt(st, { k: 'heal', p: pi, s, n: h }); } return; }
  const u = p.board[s]; if (!u) return; const h = Math.min(n, u.maxHp - u.hp); if (h > 0) { u.hp += h; evt(st, { k: 'heal', p: pi, s, n: h }); }
}

function cleanup(st) {
  st.players.forEach((p, pi) => p.board.forEach((u, s) => {
    if (u && u.hp <= 0) { p.board[s] = null; evt(st, { k: 'die', p: pi, s }); log(st, `✝ ${CARDS[u.id].name} (${p.name}) اتدمّر`); }
  }));
  checkWin(st);
}
function checkWin(st) {
  if (st.winner != null) return;
  const d0 = st.players[0].hq <= 0, d1 = st.players[1].hq <= 0;
  if (d0 && d1) st.winner = st.turn; else if (d0) st.winner = 1; else if (d1) st.winner = 0;
  if (st.winner != null) log(st, `🏆 ${st.players[st.winner].name} كسب المعركة!`);
}

// ضرر الهجوم بعد قواعد الأنواع
function combatDmg(att, tgt) {
  let d = att.atk;
  if (!tgt) return has(att, 'siege') ? d * 2 : d;
  const T = CARDS[tgt.id];
  if (T.type === 'INF' && has(att, 'antiInf')) d *= 2;
  if (T.type === 'ARM') { if (has(att, 'antiTank')) d *= 2; else d = Math.max(0, d - tgt.armor); }
  return d;
}
function guardsOf(p) { return p.board.map((u, s) => (u && u.guard ? s : -2)).filter(s => s >= 0); }
// الأهداف المسموحة لوحدة بتهاجم: [-1 = القيادة, 0..4 = خانات]
function attackTargets(st, pi, slot) {
  const u = st.players[pi].board[slot], op = st.players[1 - pi];
  if (!u || !u.canAtk || u.atk <= 0 || st.turn !== pi) return [];
  const g = guardsOf(op);
  if (g.length && !has(u, 'precision')) return g;
  const t = [-1]; op.board.forEach((x, s) => x && t.push(s)); return t;
}

function apply(st, pi, a) {
  st.events = [];
  const E = m => ({ ok: false, err: m });
  if (st.winner != null) return E('المعركة خلصت');
  if (!a || typeof a !== 'object') return E('أمر غلط');
  if (a.t === 'concede') { st.winner = 1 - pi; log(st, `🏳️ ${st.players[pi].name} استسلم`); log(st, `🏆 ${st.players[1 - pi].name} كسب المعركة!`); return { ok: true }; }
  if (st.turn !== pi) return E('استنى، مش دورك');
  const me = st.players[pi], op = st.players[1 - pi], oi = 1 - pi;

  if (a.t === 'end') { log(st, `⏭️ ${me.name} خلّص دوره`); endTurn(st); return { ok: true }; }

  if (a.t === 'attack') {
    const s = a.from | 0, u = me.board[s];
    if (!u) return E('مفيش وحدة هنا');
    if (!u.canAtk) return E(u.stun ? 'الوحدة دي متعطّلة' : 'الوحدة دي هاجمت أو لسه نازلة');
    const ts = a.ts | 0;
    if (!attackTargets(st, pi, s).includes(ts)) return E(guardsOf(op).length ? 'لازم تهاجم الوحدة المتحصّنة الأول 🧱' : 'هدف مش مسموح');
    const tgt = ts >= 0 ? op.board[ts] : null;
    const d = combatDmg(u, tgt);
    u.canAtk = false;
    evt(st, { k: 'atk', p: pi, s, tp: oi, ts });
    log(st, `⚔️ ${CARDS[u.id].name} هاجم ${tgt ? CARDS[tgt.id].name : 'قيادة ' + op.name} (${d})`);
    damage(st, oi, ts, d);
    if (tgt && !has(u, 'ranged')) damage(st, pi, s, combatDmg(tgt, u));
    cleanup(st); return { ok: true };
  }

  if (a.t === 'play') {
    const h = a.h | 0, id = me.hand[h], c = CARDS[id];
    if (!c) return E('الكارت مش موجود');
    if (c.cost > me.supply) return E('الإمداد مش كفاية ⛽');
    const emptySlots = me.board.map((u, s) => (u ? -1 : s)).filter(s => s >= 0);
    const slotOk = s => Number.isInteger(s) && s >= 0 && s < SLOTS && !me.board[s];
    const pay = () => { me.hand.splice(h, 1); me.supply -= c.cost; log(st, `🃏 ${me.name} لعب ${c.name}`); };

    if (c.kind === 'troop') {
      if (!slotOk(a.slot)) return E('اختار خانة فاضية');
      pay(); summon(st, pi, a.slot, id);
      if (c.deploy === 'heal') { me.board.forEach((u, s) => u && s !== a.slot && heal(st, pi, s, 2)); heal(st, pi, -1, 2); }
      if (c.deploy === 'burn') op.board.forEach((u, s) => u && CARDS[u.id].type === 'INF' && damage(st, oi, s, 1));
      cleanup(st); return { ok: true };
    }

    // تكتيكات
    const tgtUnit = () => (Number.isInteger(a.ts) && a.ts >= 0 && a.ts < SLOTS ? st.players[a.tp]?.board[a.ts] : null);
    switch (id) {
      case 'x_para':
        if (!emptySlots.length) return E('مفيش خانات فاضية');
        pay(); emptySlots.slice(0, 2).forEach(s => summon(st, pi, s, 'tk_para')); break;
      case 'x_barrage':
        pay(); op.board.forEach((u, s) => u && damage(st, oi, s, Math.max(0, 2 - u.armor))); break;
      case 'x_bomber':
        if (a.tp !== oi) return E('اختار هدف عند العدو');
        if (a.ts === -1) { pay(); damage(st, oi, -1, 3); }
        else { if (!tgtUnit()) return E('اختار هدف عند العدو'); pay(); damage(st, oi, a.ts, 4); }
        break;
      case 'x_mine':
        if (me.traps >= MAX_TRAPS) return E('عندك أقصى عدد ألغام');
        pay(); me.traps++; break;
      case 'x_trench': {
        if (a.tp !== pi || !tgtUnit()) return E('اختار وحدة من وحداتك');
        pay(); const u = tgtUnit(); u.maxHp += 2; u.hp += 2; u.guard = true; evt(st, { k: 'heal', p: pi, s: a.ts, n: 2 }); break;
      }
      case 'x_fort':
        if (!slotOk(a.slot)) return E('اختار خانة فاضية');
        pay(); summon(st, pi, a.slot, 'tk_fort'); break;
      case 'x_gas':
        pay(); op.board.forEach((u, s) => u && CARDS[u.id].type === 'INF' && damage(st, oi, s, 2)); break;
      case 'x_recon': pay(); draw(st, pi, 2); break;
      case 'x_ace':
        if (a.tp !== oi || !tgtUnit()) return E('اختار وحدة عند العدو');
        pay(); damage(st, oi, a.ts, 3); draw(st, pi, 1); break;
      case 'x_wire':
        pay(); op.board.forEach(u => { if (u && CARDS[u.id].type === 'INF') u.stun = 1; }); break;
      case 'x_convoy': pay(); me.supply += 2; break;
      case 'x_hospital':
        pay(); heal(st, pi, -1, 5); me.board.forEach((u, s) => u && heal(st, pi, s, 2)); break;
      default: return E('تكتيك مش معروف');
    }
    cleanup(st); return { ok: true };
  }
  return E('أمر مش معروف');
}

// نسخة للضيف: من غير كروت الخصم ولا ترتيب الديك
function redact(st, forP) {
  const c = JSON.parse(JSON.stringify(st)); c.seed = 0;
  c.players.forEach((p, i) => { p.deck = p.deck.map(() => 0); if (i !== forP) p.hand = p.hand.map(() => 0); });
  return c;
}
