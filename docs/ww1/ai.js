// ===== الكمبيوتر (خصم التدريب) =====
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function unitValue(u) { return CARDS[u.id].cost * 2 + u.atk + 2; }
function hitScore(u, d) { return d >= u.hp ? unitValue(u) + 3 : d * 0.8; }

function aiPick(st, pi) {
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
      case 'x_convoy': if (me.hand.some((x, i) => i !== h && CARDS[x].cost > me.supply && CARDS[x].cost <= me.supply + 2)) opts.push({ sc: 9, a: { t: 'play', h } }); break;
      case 'x_hospital': if (me.hq <= 17) opts.push({ sc: (HQ_HP - me.hq) / 2, a: { t: 'play', h } }); break;
    }
  });
  opts.sort((x, y) => y.sc - x.sc);
  for (const o of opts) { if (o.sc <= 0) break; if (apply(clone(st), pi, o.a).ok) return o.a; }

  // الهجوم
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
      if (!bestA || sc > bestA.sc) bestA = { sc, a: { t: 'attack', from: s, tp: oi, ts } };
    });
  });
  if (bestA && bestA.sc > -1) return bestA.a;
  return { t: 'end' };
}
