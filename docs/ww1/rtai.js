// ===== خصم الكمبيوتر في المعركة الحية =====
// level: 0 سهل، 1 متوسط، 2 صعب
function rtAiThink(sim, side, level) {
  const p = sim.pl[side], oi = 1 - side;
  const R = () => srnd(sim);
  const toW = (x, y) => mir(side, x, y);             // من إحداثيات "أنا تحت" للعالم
  const toMe = (x, y) => mir(side, x, y);            // نفس التحويل (متماثل)
  const foes = sim.ents.filter(e => e.t === 'u' && e.side === oi && e.hp > 0);
  const mine = sim.ents.filter(e => e.t === 'u' && e.side === side && e.hp > 0);
  // التهديدات: وحدات العدو اللي دخلت نصّي
  let threats = foes.filter(e => toMe(e.x, e.y)[1] > 250);
  // الضعيف بيسيب التحصين يتعامل معاه، والتهديد الحقيقي بس هو اللي بيستاهل رد
  const tval = threats.reduce((v, e) => v + RT[e.card].c / RT[e.card].n, 0), deep = threats.some(e => toMe(e.x, e.y)[1] > 430);
  if (level > 0 && tval < (level === 2 ? 3 : 2.5) && !deep) threats = [];
  const minSup = [5, 8, 9][level];
  // السهل: بيلعب كروت عشوائية في أماكن عشوائية
  if (level === 0) {
    if (R() < 0.4 || p.sup < 3 + R() * 5) return null;
    const ok = p.hand.map((id, hi) => ({ id, hi })).filter(o => RT[o.id].c <= p.sup);
    if (!ok.length) return null;
    const o = ok[Math.floor(R() * ok.length)], c = CARDS[o.id];
    let x = 30 + R() * 300, y = 380 + R() * 220;
    if (c.kind === 'tactic' && RT[o.id].zone === 'any') { const f = foes[Math.floor(R() * foes.length)]; if (!f) return null; const [fx, fy] = toMe(f.x, f.y); x = fx; y = fy; }
    const [wx, wy] = toW(x, y); return { hi: o.hi, x: wx, y: wy };
  }

  const options = [];
  p.hand.forEach((id, hi) => {
    const s = RT[id], c = CARDS[id]; if (s.c > p.sup) return;
    // ---- دفاع ----
    if (threats.length) {
      // مركز أقرب تجمّع
      const t0 = threats.reduce((a, b) => (toMe(a.x, a.y)[1] > toMe(b.x, b.y)[1] ? a : b));
      const near = threats.filter(e => d2(e, t0) < 70 * 70);
      const val = near.reduce((v, e) => v + RT[e.card].c / RT[e.card].n, 0);
      const armor = near.filter(e => CARDS[e.card].type === 'ARM').length, inf = near.filter(e => CARDS[e.card].type === 'INF').length;
      const cx = near.reduce((a, e) => a + e.x, 0) / near.length, cy = near.reduce((a, e) => a + e.y, 0) / near.length;
      if (c.kind === 'troop') {
        let sc = 2 + val;
        if (c.kw.includes('antiTank') && armor) sc += 6;
        if (c.kw.includes('antiInf') && inf >= 2) sc += 5;
        if (CARDS[id].type === 'ARM' && inf >= 3) sc += 3;
        if (s.heal) sc -= 6;
        // ينزل بين التهديد وتحصيني، في نصّي
        const [mx, my] = toMe(cx, cy);
        const dy = Math.max(380, Math.min(560, my + (s.r > 100 ? 120 : 50)));
        const [wx, wy] = toW(Math.max(20, Math.min(340, mx + (R() - 0.5) * 30)), dy);
        options.push({ sc, hi, x: wx, y: wy });
      } else {
        let sc = -1;
        if (id === 'x_barrage' || id === 'x_gas' || id === 'x_ace') sc = inf * 2.2 - 3;
        if (id === 'x_bomber') sc = val * 1.6 + armor * 3 - 4;
        if (id === 'x_wire') sc = inf * 1.2 - 2;
        if (id === 'x_trench' || id === 'x_fort') { sc = val * 0.8; const [mx, my] = toMe(cx, cy); const [wx, wy] = toW(mx, Math.max(380, Math.min(560, my + 60))); options.push({ sc, hi, x: wx, y: wy }); return; }
        if (sc > 0) options.push({ sc, hi, x: cx + (R() - 0.5) * 8, y: cy + (side === 0 ? -1 : 1) * 10 });
      }
      return;
    }
    // ---- هجوم ----
    if (p.sup < minSup + (level === 0 ? 0 : s.c > 5 ? 0 : 1)) return;
    // اختار الطريق اللي تحصين العدو فيه أضعف
    const eb = sim.ents.filter(e => e.t === 's' && e.side === oi && e.kind === 'bunker');
    let lane = R() < 0.5 ? 0 : 1;
    if (eb.length === 1) lane = laneOf(toMe(eb[0].x, eb[0].y)[0]) === 0 ? 1 : 0, lane = 1 - lane;
    if (eb.length === 2 && level > 0) lane = toMe(eb[0].x, eb[0].y)[0] < 180 ? (eb[0].hp < eb[1].hp ? 0 : 1) : (eb[1].hp < eb[0].hp ? 0 : 1);
    // لو فيه وحدات ماشية، ادعمها في نفس الطريق
    const pushing = mine.filter(e => toMe(e.x, e.y)[1] < 420);
    if (pushing.length && level > 0) lane = laneOf(toMe(pushing[0].x, pushing[0].y)[0]);
    const lx = lane === 0 ? 90 : 270;
    if (c.kind === 'troop') {
      let sc = 1 + s.c * 0.5 + R();
      if (CARDS[id].type === 'ARM') sc += 2;
      if (s.heal && !pushing.length) sc -= 5;
      if (s.proj && CARDS[id].type === 'GUN') sc += pushing.length ? 2 : -1;
      // الدبابات ورا، والمشاة قدّام الدبابات
      const y = CARDS[id].type === 'ARM' || CARDS[id].type === 'GUN' ? 600 : pushing.length ? 470 : 560;
      const [wx, wy] = toW(lx + (R() - 0.5) * 30, y);
      options.push({ sc, hi, x: wx, y: wy });
    } else {
      // تكتيكات هجومية: على تجمّعات العدو أو التحصين
      const groups = foes.filter(e => foes.filter(f => d2(f, e) < 55 * 55).length >= 3);
      if ((id === 'x_barrage' || id === 'x_gas' || id === 'x_ace') && groups.length) options.push({ sc: 4, hi, x: groups[0].x, y: groups[0].y });
      if (id === 'x_bomber' && pushing.length && eb.length) { const b = eb.find(e => laneOf(toMe(e.x, e.y)[0]) === lane) || eb[0]; options.push({ sc: 3, hi, x: b.x, y: b.y }); }
      if (id === 'x_para' && level > 0 && pushing.length) { const b = eb[0] || sim.ents.find(e => e.t === 's' && e.side === oi); if (b) { const [bx, by] = toMe(b.x, b.y); const [wx, wy] = toW(bx, by + 40); options.push({ sc: 3.5, hi, x: wx, y: wy }); } }
      if (id === 'x_mine' && p.sup >= 8) { const [wx, wy] = toW(lx + (R() - 0.5) * 40, 420 + R() * 40); options.push({ sc: 2, hi, x: wx, y: wy }); }
      if (id === 'x_convoy' && p.sup <= 6) options.push({ sc: 2.5, hi, x: 180, y: 320 });
      if (id === 'x_hospital' && pushing.length >= 3) { const u = pushing[0]; options.push({ sc: 2.5, hi, x: u.x, y: u.y }); }
      if (id === 'x_recon' && pushing.length) options.push({ sc: 1.5, hi, x: pushing[0].x, y: pushing[0].y + (side === 0 ? -60 : 60) });
    }
  });
  if (!options.length) return null;
  options.forEach(o => o.sc += (level === 0 ? 4 : level === 1 ? 1.5 : 0.3) * (R() - 0.5));
  options.sort((a, b) => b.sc - a.sc);
  for (const o of options) if (o.sc > 0 && canDeploy(sim, side, p.hand[o.hi], o.x, o.y)) return o;
  return null;
}
