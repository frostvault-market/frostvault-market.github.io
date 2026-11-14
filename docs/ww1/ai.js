// ===== الكمبيوتر (خصم التدريب) =====
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function unitValue(u) { return CARDS[u.id].cost * 2 + u.atk + 2; }
function hitScore(u, d) { return d >= u.hp ? unitValue(u) + 3 : d * 0.8; }

// level: 0 سهل، 1 متوسط، 2 صعب
function aiPick(st, pi, level = 1) {
  if (level >= 2) return aiPickHard(st, pi);
  const noise = () => (level === 0 ? (Math.random() - 0.5) * 12 : level === 1 ? (Math.random() - 0.5) * 2 : 0);
  const me = st.players[pi], op = st.players[1 - pi], oi = 1 - pi;
  const empty = me.board.map((u, s) => (u ? -1 : s)).filter(s => s >= 0);
  const opUnits = op.board.map((u, s) => (u ? s : -1)).filter(s => s >= 0);
  const enemyTanks = opUnits.filter(s => CARDS[op.board[s].id].type === 'ARM').length;
  const opts = [];
  me.hand.forEach((id, h) => {
    const c = CARDS[id]; if (c.cost > me.supply) return;
    if (c.kind === 'troop') {
      if (!empty.length) return;
      let sc = c.cost * 2 + 4;
      if (c.kw.includes('antiTank') && enemyTanks) sc += 5;
      if (c.kw.includes('guard') && me.hq < 14) sc += 4;
      opts.push({ sc, a: { t: 'play', h, slot: empty[Math.floor(empty.length / 2)] } });
      return;
    }
    const best = (dmgFn) => { let b = null; opUnits.forEach(s => { const v = hitScore(op.board[s], dmgFn(op.board[s])); if (!b || v > b.v) b = { s, v }; }); return b; };
    switch (id) {
      case 'x_para': if (empty.length) opts.push({ sc: 7 + Math.min(2, empty.length), a: { t: 'play', h } }); break;
      case 'x_barrage': { let v = -3; opUnits.forEach(s => v += hitScore(op.board[s], Math.max(0, 2 - op.board[s].armor))); opts.push({ sc: v, a: { t: 'play', h } }); break; }
      case 'x_gas': { let v = -3; opUnits.forEach(s => { const u = op.board[s]; if (CARDS[u.id].type === 'INF') v += hitScore(u, 2); }); opts.push({ sc: v, a: { t: 'play', h } }); break; }
      case 'x_bomber': {
        if (op.hq <= 3) { opts.push({ sc: 999, a: { t: 'play', h, tp: oi, ts: -1 } }); break; }
        const b = best(() => 4);
        if (b) opts.push({ sc: b.v, a: { t: 'play', h, tp: oi, ts: b.s } }); else opts.push({ sc: 3, a: { t: 'play', h, tp: oi, ts: -1 } });
        break;
      }
      case 'x_ace': { const b = best(() => 3); if (b) opts.push({ sc: b.v + 2, a: { t: 'play', h, tp: oi, ts: b.s } }); break; }
      case 'x_mine': if (me.traps < 1) opts.push({ sc: 5, a: { t: 'play', h } }); break;
      case 'x_trench': {
        let b = -1, bh = 0; me.board.forEach((u, s) => { if (u && !u.guard && u.hp > bh) { bh = u.hp; b = s; } });
        if (b >= 0) opts.push({ sc: me.hq < 16 ? 6 : 3, a: { t: 'play', h, tp: pi, ts: b } }); break;
      }
      case 'x_fort': if (empty.length) opts.push({ sc: 6, a: { t: 'play', h, slot: empty[0] } }); break;
      case 'x_recon': opts.push({ sc: me.hand.length <= 3 ? 7 : 1, a: { t: 'play', h } }); break;
      case 'x_wire': { let v = -2; opUnits.forEach(s => { const u = op.board[s]; if (CARDS[u.id].type === 'INF') v += u.atk; }); opts.push({ sc: v, a: { t: 'play', h } }); break; }
      case 'tk_coin': if (me.hand.some((x, i) => i !== h && CARDS[x].cost === me.supply + 1) && empty.length) opts.push({ sc: 9, a: { t: 'play', h } }); break;
      case 'x_convoy': if (me.hand.some((x, i) => i !== h && CARDS[x].cost > me.supply && CARDS[x].cost <= me.supply + 2) && me.supply >= 1) opts.push({ sc: 9, a: { t: 'play', h } }); break;
      case 'x_hospital': if (me.hq <= 17) opts.push({ sc: (HQ_HP - me.hq) / 2, a: { t: 'play', h } }); break;
    }
  });
  opts.forEach(o => { if (o.sc < 500) o.sc += noise(); });
  opts.sort((x, y) => y.sc - x.sc);
  for (const o of opts) { if (o.sc <= 0) break; if (apply(clone(st), pi, o.a).ok) return o.a; }

  // الهجوم
  if (level === 0 && Math.random() < 0.25) return { t: 'end' };
  // الصعب: لو يقدر يقتل القيادة بكل الوحدات يروح عليها على طول
  if (level === 2) {
    let face = 0; const g = guardsOf(op).length;
    me.board.forEach((u, s) => { if (u && attackTargets(st, pi, s).includes(-1)) face += combatDmg(u, null); });
    if (!g && face >= op.hq) { const s = me.board.findIndex((u, s) => u && attackTargets(st, pi, s).includes(-1)); if (s >= 0) return { t: 'attack', from: s, tp: oi, ts: -1 }; }
  }
  let bestA = null;
  me.board.forEach((u, s) => {
    attackTargets(st, pi, s).forEach(ts => {
      let sc;
      if (ts < 0) { const d = combatDmg(u, null); sc = d + 1.5 + (op.hq <= d ? 1000 : 0); }
      else {
        const t = op.board[ts], d = combatDmg(u, t), r = has(u, 'ranged') ? 0 : combatDmg(t, u);
        sc = hitScore(t, d) - (r >= u.hp ? unitValue(u) : r * 0.3);
        if (t.guard) sc += 1;
      }
      sc += noise() / 2;
      if (!bestA || sc > bestA.sc) bestA = { sc, a: { t: 'attack', from: s, tp: oi, ts } };
    });
  });
  if (bestA && bestA.sc > -1) return bestA.a;
  return { t: 'end' };
}

// ===== الصعب: بيجرّب كل حركة ممكنة ويختار اللي بتحسّن الموقف أكتر =====
function unitWorth(u) {
  const c = CARDS[u.id]; let v = u.atk * 1.5 + u.hp + u.armor * 1.5 + (u.guard ? 1 : 0);
  ['ranged', 'precision', 'antiTank', 'antiInf', 'siege'].forEach(k => { if (c.kw.includes(k)) v += 1; });
  return v;
}
function evalState(st, pi) {
  const me = st.players[pi], op = st.players[1 - pi];
  if (op.hq <= 0 || st.winner === pi) return 1e6;
  if (me.hq <= 0 || st.winner === 1 - pi) return -1e6;
  const W = (typeof AIW !== "undefined" && AIW) || { hq: 0.5, low: 0.3, opb: 1.3, hand: 0.6 };
  let v = me.hq * W.hq - op.hq * W.hq * (W.agg || 1) + (op.hq <= 10 ? (10 - op.hq) * W.low : 0);
  me.board.forEach(u => u && (v += unitWorth(u)));
  op.board.forEach(u => u && (v -= unitWorth(u) * W.opb));
  v += me.hand.length * W.hand + me.traps * 2.5;
  // خطر على القيادة في دور العدو الجاي
  let threat = 0; op.board.forEach(u => u && (threat += combatDmg(u, null)));
  if (!guardsOf(me).length && threat >= me.hq) v -= 60;
  return v;
}
function legalActions(st, pi) {
  const me = st.players[pi], oi = 1 - pi, out = [];
  const empty = me.board.findIndex(u => !u);
  me.hand.forEach((id, h) => {
    const c = CARDS[id]; if (c.cost > me.supply) return;
    if (c.kind === 'troop' || c.tgt === 'slot') { if (empty >= 0) out.push({ t: 'play', h, slot: empty }); return; }
    if (c.tgt === 'none') out.push({ t: 'play', h });
    if (c.tgt === 'enemy') out.push({ t: 'play', h, tp: oi, ts: -1 });
    if (c.tgt === 'enemy' || c.tgt === 'enemyUnit') st.players[oi].board.forEach((u, s) => u && out.push({ t: 'play', h, tp: oi, ts: s }));
    if (c.tgt === 'friendUnit') me.board.forEach((u, s) => u && out.push({ t: 'play', h, tp: pi, ts: s }));
  });
  me.board.forEach((u, s) => attackTargets(st, pi, s).forEach(ts => out.push({ t: 'attack', from: s, tp: oi, ts })));
  return out;
}
function aiPickHard(st, pi) {
  const base = evalState(st, pi); let best = null;
  for (const a of legalActions(st, pi)) {
    const c = clone(st); if (!apply(c, pi, a).ok) continue;
    let v = evalState(c, pi);
    // الألغام والإمداد بيبانوا أحسن من التقييم البسيط
    if (a.t === 'play' && ['x_convoy', 'tk_coin'].includes(st.players[pi].hand[a.h])) {
      const sup = c.players[pi].supply; v = c.players[pi].hand.some(id => CARDS[id].cost <= sup && CARDS[id].cost > st.players[pi].supply) ? v + 1.5 : v - 3;
    }
    if (!best || v > best.v) best = { a, v };
  }
  if (best && best.v > base + 0.3) return best.a;
  return { t: 'end' };
}
