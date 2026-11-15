// ===== محاكاة المعركة الحية =====
// جانب 0 تحت، جانب 1 فوق. الهوست (أو الجهاز في التدريب) هو اللي بيشغّل المحاكاة.
const DMG_SCALE = 0.7; // بيبطّأ القتال شوية عشان المعارك تتشاف
const WW = 360, WH = 640, SIM_DT = 0.05, MAX_SUPPLY = 10, MATCH_TIME = 180, OT_TIME = 60, DEPLOY_DELAY = 0.9;
const STRUCT = {
  hq: { hp: 2600, r: 30, dmg: 55, cd: 1.6, range: 145, ar: 3, proj: 1, w: 'cannon', kw: ['antiTank'] },
  bunker: { hp: 1150, r: 22, dmg: 11, cd: 0.25, range: 135, ar: 3, w: 'mg', kw: [] },
  wall: { hp: 950, r: 16, dmg: 0, ar: 4, ttl: 40, taunt: 95 },
  fortgun: { hp: 650, r: 16, dmg: 50, cd: 1.3, range: 170, ar: 3, proj: 1, w: 'cannon', ttl: 40, kw: [] },
};
function srnd(sim) { sim.seed = (sim.seed + 0x6D2B79F5) | 0; let t = sim.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const mir = (side, x, y) => side === 0 ? [x, y] : [WW - x, WH - y];
const d2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const utype = e => e.t === 's' ? 'S' : CARDS[e.card].type;

function newSim(o) {
  // o: { map, players:[{name, deck, lv:{id:lvl}, hq}], seed }
  const sim = { gid: o.seed | 0, t: 0, left: MATCH_TIME, ot: false, map: MAPS[o.map], mapId: o.map, ents: [], nid: 1, fx: [], winner: null, crowns: [0, 0], seed: o.seed | 0, over: false };
  sim.pl = o.players.map((p, i) => {
    const deck = p.deck.slice(); for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(srnd(sim) * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
    return { name: String(p.name || 'جندي').slice(0, 16), sup: 5, hand: deck.splice(0, 4), queue: deck, lv: p.lv || {}, side: i, regen: p.regen || 1 };
  });
  [0, 1].forEach(side => {
    const hqMul = o.players[side].hq || 1;
    [[90, 505, 0], [270, 505, 1]].forEach(([x, y, lane]) => { const [mx, my] = mir(side, x, y); addStruct(sim, 'bunker', side, mx, my, side === 0 ? lane : 1 - lane); });
    const [hx, hy] = mir(side, 180, 588); const h = addStruct(sim, 'hq', side, hx, hy, -1); h.hp = h.max = Math.round(h.max * hqMul);
  });
  return sim;
}
function addStruct(sim, kind, side, x, y, lane) {
  const s = STRUCT[kind];
  const e = { id: sim.nid++, t: 's', kind, side, x, y, hp: s.hp, max: s.hp, r: s.r, cd: 1, lane, ttl: s.ttl || 0, face: side === 0 ? -Math.PI / 2 : Math.PI / 2 };
  sim.ents.push(e); return e;
}
function addUnit(sim, card, side, x, y, lvl, delay) {
  const s = RT[card], m = lvlMul(lvl);
  const e = { id: sim.nid++, t: 'u', card, side, x, y, hp: Math.round(s.hp * m), max: Math.round(s.hp * m), lvl: lvl || 1, cd: 0.3 + srnd(sim) * 0.4,
    face: side === 0 ? -Math.PI / 2 : Math.PI / 2, dep: delay ?? DEPLOY_DELAY, walk: 0, tgt: 0, rt: 0, moving: 0, para: card === 'tk_para' ? 1 : 0 };
  sim.ents.push(e); return e;
}
function laneOf(x) { return x < WW / 2 ? 0 : 1; }
function enemyStructs(sim, side) { return sim.ents.filter(e => e.t === 's' && e.side !== side && e.hp > 0); }

// منطقة النزول المسموحة لجانب معيّن (بإحداثيات العالم)
function canDeploy(sim, side, card, x, y) {
  if (x < 6 || x > WW - 6 || y < 6 || y > WH - 6) return false;
  const s = RT[card]; const c = CARDS[card];
  if (c.kind === 'tactic' && s.zone === 'any') return true;
  if (c.kind === 'tactic' && s.zone === 'none') return true;
  const [, my] = mir(side, x, y), [mx] = mir(side, x, y);
  if (my >= 352) return true;
  // لو دمّرت تحصين العدو في الطريق ده تقدر تنزل لقدّام أكتر
  if (c.kind === 'troop' && my >= 200) {
    const lane = laneOf(mx);
    const b = sim.ents.find(e => e.t === 's' && e.kind === 'bunker' && e.side !== side && e.lane === lane);
    if (!b) return true;
  }
  return false;
}

function playCard(sim, side, hi, x, y) {
  const p = sim.pl[side], id = p.hand[hi];
  if (!id || sim.winner != null) return 'مش متاح';
  const s = RT[id], c = CARDS[id];
  if (p.sup < s.c) return 'الإمداد مش كفاية ⛽';
  if (!canDeploy(sim, side, id, x, y)) return 'مش مسموح تنزل هنا';
  p.sup -= s.c;
  p.hand[hi] = p.queue.shift(); p.queue.push(id);
  const lvl = p.lv[id] || 1;
  sim.fx.push({ k: 'play', side, card: id, x, y });
  if (c.kind === 'troop') {
    for (let i = 0; i < s.n; i++) {
      const a = (i / s.n) * Math.PI * 2 + 0.3, rr = s.n > 1 ? 12 + (s.n > 3 ? 4 : 0) : 0;
      addUnit(sim, id, side, x + Math.cos(a) * rr, y + Math.sin(a) * rr, lvl);
    }
    return null;
  }
  castTactic(sim, side, id, x, y, lvl);
  return null;
}

function addZone(sim, z) { z.id = sim.nid++; z.t = 'z'; z.age = 0; sim.ents.push(z); return z; }
function castTactic(sim, side, id, x, y, lvl) {
  const m = lvlMul(lvl);
  switch (id) {
    case 'x_para': for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; addUnit(sim, 'tk_para', side, x + Math.cos(a) * 14, y + Math.sin(a) * 14, lvl, 1.8 + i * 0.15); } sim.fx.push({ k: 'plane', x, y, side, kind: 'transport' }); break;
    case 'x_barrage': addZone(sim, { kind: 'barrage', side, x, y, r: 55, ttl: 3.2, waves: [1.0, 1.8, 2.6], dmg: 56 * m }); break;
    case 'x_bomber': addZone(sim, { kind: 'bomber', side, x, y, r: 38, ttl: 1.6, at: 1.3, dmg: 230 * m }); sim.fx.push({ k: 'plane', x, y, side, kind: 'bomber' }); break;
    case 'x_mine': addZone(sim, { kind: 'mine', side, x, y, r: 30, ttl: 9999, dmg: 170 * m }); break;
    case 'x_trench': { const w = addStruct(sim, 'wall', side, x, y, -2); w.hp = w.max = Math.round(w.max * m); break; }
    case 'x_fort': { const w = addStruct(sim, 'fortgun', side, x, y, -2); w.hp = w.max = Math.round(w.max * m); w.lvl = lvl; break; }
    case 'x_gas': addZone(sim, { kind: 'gas', side, x, y, r: 60, ttl: 7, tick: 0.5, dmg: 15 * m }); break;
    case 'x_recon': addZone(sim, { kind: 'recon', side, x, y, r: 90, ttl: 1.2, at: 0.9 }); sim.fx.push({ k: 'plane', x, y, side, kind: 'recon' }); break;
    case 'x_ace': addZone(sim, { kind: 'ace', side, x, y, r: 18, ttl: 1.4, at: 1.0, dmg: 140 * m }); sim.fx.push({ k: 'plane', x, y, side, kind: 'fighter' }); break;
    case 'x_wire': addZone(sim, { kind: 'wire', side, x, y, r: 50, ttl: 12 }); break;
    case 'x_convoy': sim.pl[side].sup = Math.min(MAX_SUPPLY, sim.pl[side].sup + 3); break;
    case 'x_hospital': addZone(sim, { kind: 'heal', side, x, y, r: 65, ttl: 4, tick: 0.5, heal: 32 * m }); break;
  }
}

// الضرر بعد قواعد الأنواع
function dmgCalc(sim, kw, base, tgt, ign, shell) {
  let d = base; const tt = utype(tgt);
  if (tt === 'INF' && kw.includes('antiInf')) d *= 1.8;
  if (tt === 'ARM') { if (kw.includes('antiTank')) d *= 2.5; else if (!ign) d = Math.max(1, d - RT[tgt.card].ar); }
  if (tt === 'S') { if (kw.includes('siege')) d *= 2; if (shell) d *= 1.5; else if (!ign && !kw.includes('siege')) d = Math.max(1, d - STRUCT[tgt.kind].ar); }
  if (tt !== 'S' && CARDS[tgt.card].kw.includes('guard')) d *= 0.75;
  if (tgt.mark > sim.t) d *= 1.25;
  return d;
}
function hurt(sim, tgt, d, x, y) {
  if (tgt.hp <= 0 || d <= 0) return;
  d *= DMG_SCALE;
  tgt.hp -= d; tgt.hitT = sim.t;
  if (tgt.hp <= 0) {
    tgt.hp = 0;
    if (tgt.t === 's') {
      sim.fx.push({ k: 'boom', x: tgt.x, y: tgt.y, r: tgt.kind === 'hq' ? 60 : 40, big: 1 });
      if (tgt.kind === 'bunker') { sim.crowns[1 - tgt.side]++; sim.fx.push({ k: 'crown', side: 1 - tgt.side, x: tgt.x, y: tgt.y }); if (sim.ot) sim.winner = 1 - tgt.side; }
      if (tgt.kind === 'hq') { sim.crowns[1 - tgt.side] = 3; sim.winner = 1 - tgt.side; }
    } else sim.fx.push({ k: 'die', x: tgt.x, y: tgt.y, card: tgt.card, side: tgt.side, ty: utype(tgt) });
  }
}
function splash(sim, side, kw, base, x, y, r, ign, structMul = 1, shell) {
  sim.ents.forEach(e => {
    if ((e.t !== 'u' && e.t !== 's') || e.side === side || e.hp <= 0 || e.dep > 0) return;
    const rr = r + (e.r || 4);
    if (d2(e, { x, y }) <= rr * rr) hurt(sim, e, dmgCalc(sim, kw, base, e, ign, shell) * (e.t === 's' ? structMul : 1));
  });
}

function findTarget(sim, u) {
  const s = RT[u.card], kw = CARDS[u.card].kw;
  const aggro = s.r + (s.pref === 'INF' && s.r > 150 ? 20 : 70);
  let best = null, bs = 1e9;
  for (const e of sim.ents) {
    if ((e.t !== 'u' && e.t !== 's') || e.side === u.side || e.hp <= 0 || (e.t === 'u' && e.dep > 0)) continue;
    const dd = Math.sqrt(d2(u, e));
    let sc = dd;
    if (e.t === 'u') {
      if (dd > aggro) continue;
      if (s.min && dd < s.min) continue;
      const ty = utype(e);
      if (s.pref && ty === s.pref) sc -= 90;
      if (kw.includes('antiTank') && ty === 'ARM') sc -= 60;
    } else {
      const taunt = STRUCT[e.kind].taunt;
      if (taunt && dd < taunt) sc -= 40;
      else if (dd > s.r + e.r + 30 && !(taunt && dd < taunt)) continue;
      if (kw.includes('siege')) sc -= 40;
    }
    if (sc < bs) { bs = sc; best = e; }
  }
  if (best) return best;
  // مفيش حد قريب: روح على تحصين العدو في الطريق بتاعك، ولو اتدمّر روح على القيادة
  const ss = enemyStructs(sim, u.side).filter(e => e.kind === 'bunker' || e.kind === 'hq');
  const lane = laneOf(u.x);
  const b = ss.find(e => e.kind === 'bunker' && laneOf(e.x) === lane);
  return b || ss.find(e => e.kind === 'hq') || null;
}

// الخطوة الجاية في الطريق مع مراعاة الأنهار والكباري
function waypoint(sim, u, tx, ty) {
  for (const rv of sim.map.rivers || []) {
    const top = rv.y - rv.h / 2 - 4, bot = rv.y + rv.h / 2 + 4;
    const uAbove = u.y < top, uBelow = u.y > bot, tAbove = ty < top, tBelow = ty > bot;
    const inRiver = !uAbove && !uBelow;
    if ((uAbove && !tAbove) || (uBelow && !tBelow) || inRiver) {
      let bx = rv.bridges[0], bd = 1e9;
      rv.bridges.forEach(x => { const d = Math.abs(x - u.x) + Math.abs(x - tx) * 0.5; if (d < bd) { bd = d; bx = x; } });
      if (inRiver) return [bx, tAbove ? top - 8 : bot + 8];
      if (Math.abs(u.x - bx) > 7) return [bx, uAbove ? top - 2 : bot + 2];
      return [bx, tAbove ? top - 10 : bot + 10];
    }
  }
  return [tx, ty];
}

function stepUnit(sim, u, dt) {
  const s = RT[u.card], c = CARDS[u.card];
  if (u.dep > 0) { u.dep -= dt; return; }
  u.cd -= dt; u.rt -= dt; u.moving = 0;
  // المسعف
  if (s.heal) {
    if (u.cd <= 0) {
      let best = null, bh = 1;
      sim.ents.forEach(e => { if (e.t === 'u' && e.side === u.side && e !== u && e.hp > 0 && e.hp < e.max && d2(e, u) < s.r * s.r && e.hp / e.max < bh) { bh = e.hp / e.max; best = e; } });
      if (best) { best.hp = Math.min(best.max, best.hp + s.heal * lvlMul(u.lvl)); u.cd = s.cd; sim.fx.push({ k: 'heal', x: best.x, y: best.y }); u.face = Math.atan2(best.y - u.y, best.x - u.x); }
    }
    // بيمشي ورا أقرب صاحب
    let f = null, fd = 1e9; sim.ents.forEach(e => { if (e.t === 'u' && e.side === u.side && e !== u && e.hp > 0 && !RT[e.card].heal) { const d = d2(e, u); if (d < fd) { fd = d; f = e; } } });
    const tgt = f && fd > 30 * 30 ? f : null;
    if (tgt) moveTo(sim, u, tgt.x, tgt.y, dt); else if (!f) { const t = findTarget(sim, u); t && moveTo(sim, u, t.x, t.y, dt); }
    return;
  }
  let t = sim.ents.find(e => e.id === u.tgt);
  if (!t || t.hp <= 0 || u.rt <= 0) { t = findTarget(sim, u); u.tgt = t ? t.id : 0; u.rt = 0.4 + srnd(sim) * 0.2; }
  if (!t) return;
  const dist = Math.sqrt(d2(u, t)), reach = s.r + (t.r || 4);
  if (dist <= reach && !(s.min && dist < s.min && t.t === 'u')) {
    u.face = Math.atan2(t.y - u.y, t.x - u.x);
    if (u.cd <= 0) {
      u.cd = s.cd * (0.92 + srnd(sim) * 0.16);
      const kw = c.kw, base = s.dmg * lvlMul(u.lvl);
      sim.fx.push({ k: 'shot', x: u.x, y: u.y, tx: t.x, ty: t.y, w: s.w, side: u.side, id: u.id });
      if (s.proj) {
        const dur = Math.max(0.15, dist / (s.w === 'big' || s.w === 'mortar' ? 220 : 420));
        sim.ents.push({ id: sim.nid++, t: 'p', side: u.side, x0: u.x, y0: u.y, x: t.x, y: t.y, at: sim.t + dur, dur, base, kw, sp: s.sp || 0, tid: t.id, w: s.w, hp: 1 });
      } else if (s.sp) splash(sim, u.side, kw, base, t.x, t.y, s.sp, false);
      else hurt(sim, t, dmgCalc(sim, kw, base, t, false));
    }
  } else {
    // اتحرك ناحية الهدف، وقف على مسافة الضرب
    moveTo(sim, u, t.x, t.y, dt);
  }
}
function moveTo(sim, u, tx, ty, dt) {
  const s = RT[u.card];
  const [wx, wy] = waypoint(sim, u, tx, ty);
  const dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy);
  if (d < 1) return;
  let v = s.spd * mapSpeed(sim.map, u.x, u.y, CARDS[u.card].type);
  sim.ents.forEach(z => { if (z.t === 'z' && z.kind === 'wire' && z.side !== u.side && CARDS[u.card].type === 'INF' && d2(z, u) < z.r * z.r) v *= 0.35; });
  const step = Math.min(d, v * dt);
  u.x += dx / d * step; u.y += dy / d * step; u.walk += step; u.moving = 1;
  // اتجاه الوش بيلف بالراحة (مهم للدبابات)
  const want = Math.atan2(dy, dx); let da = want - u.face; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  u.face += Math.max(-dt * 6, Math.min(dt * 6, da));
}

function stepStruct(sim, e, dt) {
  const s = STRUCT[e.kind];
  if (s.ttl) { e.ttl -= dt; if (e.ttl <= 0) { e.hp = 0; sim.fx.push({ k: 'boom', x: e.x, y: e.y, r: 20 }); return; } }
  if (!s.dmg) return;
  e.cd -= dt; if (e.cd > 0) return;
  let best = null, bd = (s.range + 4) ** 2;
  sim.ents.forEach(u => { if (u.t === 'u' && u.side !== e.side && u.hp > 0 && u.dep <= 0) { const d = d2(u, e); if (d < bd) { bd = d; best = u; } } });
  if (!best) return;
  e.cd = s.cd; e.face = Math.atan2(best.y - e.y, best.x - e.x);
  const base = s.dmg * lvlMul(e.lvl);
  sim.fx.push({ k: 'shot', x: e.x, y: e.y, tx: best.x, ty: best.y, w: s.w, side: e.side, id: e.id });
  if (s.proj) { const dur = Math.max(0.15, Math.sqrt(bd) / 420); sim.ents.push({ id: sim.nid++, t: 'p', side: e.side, x0: e.x, y0: e.y, x: best.x, y: best.y, at: sim.t + dur, dur, base, kw: s.kw, sp: 10, tid: best.id, w: s.w, hp: 1 }); }
  else hurt(sim, best, dmgCalc(sim, s.kw, base, best, false));
}

function stepZone(sim, z, dt) {
  z.age += dt; z.ttl -= dt;
  const enemies = () => sim.ents.filter(e => e.t === 'u' && e.side !== z.side && e.hp > 0 && e.dep <= 0 && d2(e, z) < (z.r + 4) ** 2);
  switch (z.kind) {
    case 'barrage':
      while (z.waves.length && z.age >= z.waves[0]) {
        z.waves.shift();
        for (let i = 0; i < 5; i++) { const a = srnd(sim) * 6.28, rr = Math.sqrt(srnd(sim)) * z.r; const x = z.x + Math.cos(a) * rr, y = z.y + Math.sin(a) * rr;
          splash(sim, z.side, [], z.dmg, x, y, 20, false, 0.35); sim.fx.push({ k: 'boom', x, y, r: 18 }); }
      }
      break;
    case 'bomber':
      if (!z.done && z.age >= z.at) { z.done = 1; [-30, 0, 30].forEach(o => { splash(sim, z.side, [], z.dmg, z.x, z.y + o, z.r, true, 0.35); sim.fx.push({ k: 'boom', x: z.x, y: z.y + o, r: 34, big: 1 }); }); }
      break;
    case 'ace':
      if (!z.done && z.age >= z.at) { z.done = 1;
        sim.ents.forEach(e => { if (e.t === 'u' && e.side !== z.side && e.hp > 0 && Math.abs(e.x - z.x) < z.r && Math.abs(e.y - z.y) < 75) hurt(sim, e, dmgCalc(sim, ['antiInf'], z.dmg, e, false)); });
        sim.fx.push({ k: 'strafe', x: z.x, y: z.y }); }
      break;
    case 'mine': {
      const v = sim.ents.find(e => e.t === 'u' && e.side !== z.side && e.hp > 0 && e.dep <= 0 && d2(e, z) < 16 * 16);
      if (v) { z.ttl = 0; splash(sim, z.side, ['antiTank'], z.dmg, z.x, z.y, z.r, true); sim.fx.push({ k: 'boom', x: z.x, y: z.y, r: 32, big: 1 }); }
      break;
    }
    case 'gas': case 'heal':
      z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5;
        if (z.kind === 'gas') enemies().forEach(e => { if (utype(e) === 'INF') hurt(sim, e, z.dmg); });
        else sim.ents.forEach(e => { if (e.t === 'u' && e.side === z.side && e.hp > 0 && d2(e, z) < z.r * z.r) { e.hp = Math.min(e.max, e.hp + z.heal); } }); }
      break;
    case 'recon':
      if (!z.done && z.age >= z.at) { z.done = 1;
        sim.ents.forEach(e => { if (e.t === 'z' && e.kind === 'mine' && e.side !== z.side && d2(e, z) < z.r * z.r) { e.ttl = 0; sim.fx.push({ k: 'boom', x: e.x, y: e.y, r: 20 }); } });
        enemies().forEach(e => e.mark = sim.t + 8); }
      break;
  }
}

function stepSim(sim, dt = SIM_DT) {
  if (sim.winner != null) return;
  sim.t += dt;
  const fast = sim.ot || sim.left <= 60;
  sim.pl.forEach(p => { p.sup = Math.min(MAX_SUPPLY, p.sup + p.regen * dt / (fast ? 1.2 : 2.4)); });
  for (const e of sim.ents) {
    if (e.hp <= 0) continue;
    if (e.t === 'u') stepUnit(sim, e, dt);
    else if (e.t === 's') stepStruct(sim, e, dt);
    else if (e.t === 'z') stepZone(sim, e, dt);
    else if (e.t === 'p' && sim.t >= e.at) {
      e.hp = 0;
      if (e.sp) splash(sim, e.side, e.kw, e.base, e.x, e.y, e.sp, false, 1, true);
      else { const tg = sim.ents.find(x => x.id === e.tid); if (tg && tg.hp > 0 && d2(tg, e) < (16 + (tg.r || 0)) ** 2) hurt(sim, tg, dmgCalc(sim, e.kw, e.base, tg, false, true)); }
      sim.fx.push({ k: 'boom', x: e.x, y: e.y, r: e.sp ? e.sp : 9, small: !e.sp });
    }
  }
  // الفصل بين الوحدات عشان ماتركبش على بعض، وماتدخلش جوه المباني
  const us = sim.ents.filter(e => e.t === 'u' && e.hp > 0 && e.dep <= 0);
  for (let i = 0; i < us.length; i++) {
    const a = us[i], ra = CARDS[a.card].type === 'ARM' ? 14 : CARDS[a.card].type === 'GUN' ? 10 : 6;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j], rb = CARDS[b.card].type === 'ARM' ? 14 : CARDS[b.card].type === 'GUN' ? 10 : 6;
      const dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy, min = ra + rb;
      if (dd < min * min && dd > 0.01) { const d = Math.sqrt(dd), push = (min - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
    }
    sim.ents.forEach(s => { if (s.t === 's' && s.hp > 0) { const dx = a.x - s.x, dy = a.y - s.y, d = Math.hypot(dx, dy), min = s.r + ra - 2; if (d < min && d > 0.01) { a.x = s.x + dx / d * min; a.y = s.y + dy / d * min; } } });
    a.x = Math.max(4, Math.min(WW - 4, a.x)); a.y = Math.max(4, Math.min(WH - 4, a.y));
  }
  sim.ents = sim.ents.filter(e => e.hp > 0 && !(e.t === 'z' && e.ttl <= 0));
  // الوقت
  sim.left -= dt;
  if (sim.left <= 0 && sim.winner == null) {
    if (!sim.ot && sim.crowns[0] === sim.crowns[1]) { sim.ot = true; sim.left = OT_TIME; sim.fx.push({ k: 'ot' }); }
    else if (sim.crowns[0] !== sim.crowns[1]) sim.winner = sim.crowns[0] > sim.crowns[1] ? 0 : 1;
    else {
      // تعادل في الأبراج: اللي تحصيناته سليمة أكتر يكسب
      const frac = side => { let h = 0, m = 0; sim.ents.forEach(e => { if (e.t === 's' && e.side === side && (e.kind === 'hq' || e.kind === 'bunker')) { h += e.hp; m += e.max; } }); return h / (m || 1); };
      const a = frac(0), b = frac(1); sim.winner = Math.abs(a - b) < 0.001 ? -1 : a > b ? 0 : 1;
    }
  }
}
