// ===== الرسم: أرض واقعية مرسومة بالكود + جنود ودبابات ومدافع + انفجارات ودخان =====
const GFX = (() => {
  let hg = null, props = null, skipProps = false, featOnly = false;
  let cv, ctx, terr, S = 2, scale = 1, ox = 0, oy = 0, flip = false, me = 0, shake = 0, map = null;
  const parts = [], flashes = [], tracers = [], planes = [], banners = [];
  const COL = {
    mine: { uni: '#6f6a3e', uni2: '#5a5631', helm: '#5b5a3b', flag: '#2f5d9a', tank: ['#6b6a45', '#55543a'], mark: '#e9e2c0' },
    foe: { uni: '#5e6862', uni2: '#4b5450', helm: '#454d49', flag: '#9a2f2f', tank: ['#646b66', '#4d5450'], mark: '#111' },
  };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let rs = 1; const R = () => { rs = (rs + 0x6D2B79F5) | 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shade = (hex, a) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r + a)); g = Math.max(0, Math.min(255, g + a)); b = Math.max(0, Math.min(255, b + a)); return `rgb(${r},${g},${b})`; };

  // ---------------- الأرض ----------------
  function blob(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace(')', `,${a})`).replace('rgb', 'rgba')); gr.addColorStop(1, col.replace(')', ',0)').replace('rgb', 'rgba')); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function crater(g, x, y, r, water) {
    if (hg) { const h = hg.createRadialGradient(x, y, 0, x, y, r * 1.3); h.addColorStop(0, water ? 'rgb(70,70,70)' : 'rgb(60,60,60)'); h.addColorStop(0.75, 'rgba(128,128,128,0.6)'); h.addColorStop(0.9, 'rgba(150,150,150,0.5)'); h.addColorStop(1, 'rgba(128,128,128,0)'); hg.fillStyle = h; hg.beginPath(); hg.arc(x, y, r * 1.3, 0, 7); hg.fill(); }
    blob(g, x + r * 0.15, y + r * 0.15, r * 1.6, 'rgb(40,30,20)', 0.35);
    const rim = g.createRadialGradient(x, y, r * 0.55, x, y, r * 1.25);
    rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.6, 'rgba(150,130,95,0.45)'); rim.addColorStop(1, 'rgba(150,130,95,0)');
    g.fillStyle = rim; g.beginPath(); g.arc(x, y, r * 1.25, 0, 7); g.fill();
    const inner = g.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    inner.addColorStop(0, 'rgba(30,22,14,0.85)'); inner.addColorStop(0.7, 'rgba(55,42,28,0.7)'); inner.addColorStop(1, 'rgba(90,72,50,0.2)');
    g.fillStyle = inner; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (water) {
      const w = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r * 0.6);
      w.addColorStop(0, 'rgba(120,135,125,0.9)'); w.addColorStop(1, 'rgba(55,70,65,0.85)');
      g.fillStyle = w; g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.5, R() * 3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(220,230,220,0.25)'; g.lineWidth = 0.5; g.beginPath(); g.arc(x - r * 0.15, y - r * 0.15, r * 0.3, 3.6, 4.6); g.stroke();
    }
    // إضاءة الحافة من فوق شمال
    g.strokeStyle = 'rgba(200,185,150,0.25)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r * 0.95, 3.4, 5.2); g.stroke();
  }
  function tree(g, x, y, kind) {
    if (skipProps) { props.push({ t: 'tree', x, y, kind, s: R() }); return; }
    if (kind === 'dead') {
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x + 2, y + 2); const a = R() * 6.28, l = 6 + R() * 10; g.lineTo(x + 2 + Math.cos(a) * l, y + 2 + Math.sin(a) * l); g.stroke();
      g.strokeStyle = '#3a2e22'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      g.fillStyle = '#4a3b2b'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); g.fillStyle = '#6a5640'; g.beginPath(); g.arc(x - 0.5, y - 0.5, 1.2, 0, 7); g.fill();
      return;
    }
    const big = kind === 'scrub' ? 3 + R() * 3 : kind === 'poplar' ? 5 + R() * 2 : 7 + R() * 5;
    const base = kind === 'scrub' ? [72, 86, 48] : [52 + R() * 15 | 0, 78 + R() * 20 | 0, 38 + R() * 10 | 0];
    blob(g, x + big * 0.5, y + big * 0.6, big * 1.5, 'rgb(15,20,10)', 0.45);
    for (let i = 0; i < (kind === 'scrub' ? 3 : 7); i++) {
      const a = R() * 6.28, d = R() * big * 0.55, rr = big * (0.45 + R() * 0.35), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
      const gr = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.35, 0, cx, cy, rr);
      gr.addColorStop(0, `rgb(${base[0] + 40},${base[1] + 45},${base[2] + 25})`); gr.addColorStop(1, `rgb(${base[0] - 15},${base[1] - 15},${base[2] - 10})`);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    }
  }
  function sandbagLine(g, pts, w) {
    if (hg) { hg.lineCap = 'round'; hg.lineJoin = 'round'; hg.strokeStyle = 'rgb(165,165,165)'; hg.lineWidth = w + 4; path(hg, pts); hg.stroke(); hg.strokeStyle = 'rgb(70,70,70)'; hg.lineWidth = w; path(hg, pts); hg.stroke(); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = w + 5; path(g, pts, 1.5); g.stroke();
    g.strokeStyle = '#8f8160'; g.lineWidth = w + 3; path(g, pts); g.stroke();
    g.strokeStyle = '#2e2419'; g.lineWidth = w; path(g, pts); g.stroke();
    g.strokeStyle = 'rgba(80,60,40,0.9)'; g.lineWidth = w * 0.35; path(g, pts); g.stroke();
    // أكياس رمل على الحافة
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1), n = L / 3.2 | 0;
      for (let k = 0; k < n; k++) { const t = k / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t - (w / 2 + 1.3);
        g.fillStyle = k % 2 ? '#a89670' : '#9a8963'; g.beginPath(); g.ellipse(x, y, 1.9, 1.1, Math.atan2(y2 - y1, x2 - x1), 0, 7); g.fill(); }
    }
  }
  function path(g, pts, off = 0) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x + off, y + off) : g.moveTo(x + off, y + off)); }
  function zigzag(y, amp, seg) { const pts = []; for (let x = -10, i = 0; x <= WW + 10; x += seg, i++) pts.push([x, y + (i % 2 ? amp : -amp) + (R() - 0.5) * 3]); return pts; }
  function wireBelt(g, y, h) {
    for (let x = 4; x < WW; x += 7 + R() * 3) {
      const yy = y + (R() - 0.5) * h * 0.6;
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2, yy - 2); g.lineTo(x + 2, yy + 2); g.moveTo(x + 2, yy - 2); g.lineTo(x - 2, yy + 2); g.stroke();
    }
    g.strokeStyle = 'rgba(40,40,40,0.7)'; g.lineWidth = 0.5;
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 0; x <= WW; x += 2) { const yy = y + Math.sin(x * 0.9 + k * 2) * h * 0.25 + (k - 1) * h * 0.2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  }
  function buildTerrain(m, seed) {
    rs = seed | 0;
    const c = mk(WW * S, WH * S), g = c.getContext('2d'); g.scale(S, S);
    const grd = g.createLinearGradient(0, 0, WW, WH); grd.addColorStop(0, m.base[1]); grd.addColorStop(0.5, m.base[0]); grd.addColorStop(1, m.base[1]);
    if (!featOnly) { g.fillStyle = grd; g.fillRect(0, 0, WW, WH); }
    // تبقيع الأرض
    if (!featOnly) for (let i = 0; i < 1100; i++) { const dark = R() < 0.55; blob(g, R() * WW, R() * WH, 5 + R() * 28, dark ? 'rgb(30,24,14)' : 'rgb(170,155,115)', 0.04 + R() * 0.07); }
    // حبيبات
    if (!featOnly) for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,240,200,0.06)'; g.fillRect(R() * WW, R() * WH, 0.6, 0.6); }
    if (m.sand && !featOnly) for (let i = 0; i < 90; i++) { g.strokeStyle = 'rgba(255,245,210,0.18)'; g.lineWidth = 0.6; const x = R() * WW, y = R() * WH; g.beginPath(); g.arc(x, y, 10 + R() * 30, 0.3, 1.2); g.stroke(); }
    if (m.chalk) for (let i = 0; i < 160; i++) blob(g, R() * WW, R() * WH, 4 + R() * 12, 'rgb(225,220,200)', 0.18);
    if (m.ridges) for (let i = 0; i < 5; i++) { const y = 60 + i * 130 + R() * 30; g.strokeStyle = 'rgba(90,70,40,0.18)'; g.lineWidth = 8; g.beginPath(); for (let x = 0; x <= WW; x += 10) { const yy = y + Math.sin(x * 0.03 + i) * 14; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    // حقول
    for (let i = 0; i < (m.fields || 0); i++) {
      const x = R() * WW, y = R() * WH, w = 60 + R() * 70, h = 40 + R() * 60, a = (R() - 0.5) * 0.5;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = m.wheat ? 'rgba(200,170,80,0.35)' : 'rgba(110,125,60,0.3)'; g.fillRect(-w / 2, -h / 2, w, h);
      g.strokeStyle = m.wheat ? 'rgba(120,95,40,0.25)' : 'rgba(60,70,30,0.25)'; g.lineWidth = 0.6;
      for (let k = -h / 2; k < h / 2; k += 2.5) { g.beginPath(); g.moveTo(-w / 2, k); g.lineTo(w / 2, k); g.stroke(); }
      g.restore();
    }
    // عشب
    const gr = m.grass || 0;
    if (!featOnly) for (let i = 0; i < 2600 * gr; i++) { const x = R() * WW, y = R() * WH; g.strokeStyle = `rgba(${80 + R() * 50 | 0},${105 + R() * 50 | 0},${40 + R() * 25 | 0},0.5)`; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 2, y - 1.5 - R() * 2); g.stroke(); }
    // طرق
    for (let i = 0; i < (m.roads || 0); i++) {
      const x0 = 40 + R() * 280, x1 = 40 + R() * 280;
      g.lineCap = 'round'; g.strokeStyle = 'rgba(60,45,30,0.3)'; g.lineWidth = 15; g.beginPath(); g.moveTo(x0, -10); g.bezierCurveTo(x0 + 80, 220, x1 - 80, 420, x1, WH + 10); g.stroke();
      g.strokeStyle = 'rgba(175,155,115,0.55)'; g.lineWidth = 11; g.stroke();
      g.strokeStyle = 'rgba(90,70,45,0.35)'; g.lineWidth = 0.8; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x0 - 2.5, -10); g.bezierCurveTo(x0 + 78, 220, x1 - 82, 420, x1 - 2.5, WH + 10); g.stroke();
      g.beginPath(); g.moveTo(x0 + 2.5, -10); g.bezierCurveTo(x0 + 82, 220, x1 - 78, 420, x1 + 2.5, WH + 10); g.stroke(); g.setLineDash([]);
    }
    // طين
    const muds = [...(m.mud || [])]; (m.mud || []).forEach(z => { if (z.x !== WW - z.x || z.y !== WH - z.y) muds.push({ x: WW - z.x, y: WH - z.y, r: z.r }); });
    muds.forEach(z => {
      for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = R() * z.r * 0.8; blob(g, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, z.r * (0.3 + R() * 0.4), 'rgb(35,26,16)', 0.35); }
      for (let i = 0; i < 14; i++) { const a = R() * 6.28, d = R() * z.r * 0.7; g.fillStyle = 'rgba(150,150,130,0.25)'; g.beginPath(); g.ellipse(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, 2 + R() * 4, 1 + R() * 2, R() * 3, 0, 7); g.fill(); }
    });
    // حفر القذايف
    for (let i = 0; i < m.craters; i++) { const x = R() * WW, y = 30 + R() * (WH - 60); if (Math.abs(y - 320) < 20 && (m.rivers || []).length) continue; crater(g, x, y, 3 + R() * R() * 14, R() < (m.water || 0)); }
    // خنادق الخط الأمامي لكل ناحية
    const tr = m.bigTrench ? 7 : 4.5;
    [372, 268].forEach(y => sandbagLine(g, zigzag(y, 5, 18), tr));
    [[90, 545], [270, 545]].forEach(([x, y]) => { sandbagLine(g, [[x, y], [x + 8, 470], [x - 6, 420], [x + 4, 380]], 3); sandbagLine(g, [[WW - x, WH - y], [WW - x - 8, 170], [WW - x + 6, 220], [WW - x - 4, 260]], 3); });
    // أسلاك (شكل بس، والأحزمة اللي في الخريطة ليها تأثير)
    [388, 252].forEach(y => wireBelt(g, y, 6));
    (m.wire || []).forEach(w => { wireBelt(g, w.y, w.h); wireBelt(g, WH - w.y, w.h); });
    // أنهار وكباري
    (m.rivers || []).forEach(rv => {
      const top = rv.y - rv.h / 2, bot = rv.y + rv.h / 2;
      g.fillStyle = 'rgba(40,30,18,0.5)'; g.fillRect(0, top - 3, WW, rv.h + 6);
      if (hg) { hg.fillStyle = 'rgb(40,40,40)'; hg.fillRect(0, top, WW, rv.h); }
      const w = g.createLinearGradient(0, top, 0, bot); w.addColorStop(0, '#2f4a4c'); w.addColorStop(0.5, '#41605f'); w.addColorStop(1, '#2b4446');
      g.fillStyle = w; g.fillRect(0, top, WW, rv.h);
      for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(200,225,220,0.18)'; g.lineWidth = 0.6; const x = R() * WW, y = top + 2 + R() * (rv.h - 4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 + R() * 8, y); g.stroke(); }
      rv.bridges.forEach(bx => {
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(bx - 11 + 2, top - 5 + 2, 22, rv.h + 10);
        g.fillStyle = '#6e5233'; g.fillRect(bx - 11, top - 5, 22, rv.h + 10);
        for (let y = top - 5; y < bot + 5; y += 2.4) { g.fillStyle = R() < 0.5 ? '#7d5e3c' : '#5f4529'; g.fillRect(bx - 10, y, 20, 1.8); }
        g.fillStyle = '#3c2c1b'; g.fillRect(bx - 12, top - 5, 2, rv.h + 10); g.fillRect(bx + 10, top - 5, 2, rv.h + 10);
      });
    });
    // البحر ورا القواعد (جاليبولي)
    if (m.sand) [[0, 0, 14], [0, WH - 14, 14]].forEach(([x, y, h]) => { const w = g.createLinearGradient(0, y, 0, y + h); w.addColorStop(y ? 0 : 1, '#3d6c78'); w.addColorStop(y ? 1 : 0, '#244a56'); g.fillStyle = w; g.fillRect(x, y, WW, h); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); for (let xx = 0; xx <= WW; xx += 6) g.lineTo(xx, (y ? y : h) + Math.sin(xx) * 1.2); g.stroke(); });
    // أطلال
    for (let i = 0; i < (m.ruins || 0); i++) {
      const x = 20 + R() * 320, y = 40 + R() * 560; if (Math.abs(y - 320) < 30) continue;
      if (skipProps) { props.push({ t: 'ruin', x, y, s: R() }); continue; }
      g.save(); g.translate(x, y); g.rotate(R() * 3);
      for (let k = 0; k < 4; k++) { const w = 4 + R() * 14, h = 2 + R() * 2.5; const xx = (R() - 0.5) * 14, yy = (R() - 0.5) * 14;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(xx + 1.5, yy + 1.5, w, h); g.fillStyle = R() < 0.5 ? '#9c8f7a' : '#8a7c66'; g.fillRect(xx, yy, w, h); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(xx, yy, w, 0.6); }
      for (let k = 0; k < 18; k++) { g.fillStyle = R() < 0.5 ? '#7d705c' : '#a49680'; g.fillRect((R() - 0.5) * 22, (R() - 0.5) * 22, 1.2, 1.2); }
      g.restore();
    }
    // شجر
    for (let i = 0; i < (m.treesN || 0); i++) { const x = R() * WW, y = 20 + R() * 600; if (Math.abs(y - 320) < 22 && (m.rivers || []).length) continue; if (Math.abs(x - 90) < 26 || Math.abs(x - 270) < 26) continue; tree(g, x, y, m.trees); }
    // أماكن التحصينات (أرضية خرسانية)
    [[90, 505], [270, 505], [180, 588], [90, 135], [270, 135], [180, 52]].forEach(([x, y]) => { blob(g, x, y, 34, 'rgb(40,32,22)', 0.35); });
    if (m.tint && !featOnly) { g.fillStyle = m.tint; g.fillRect(0, 0, WW, WH); }
    if (featOnly) return c;
    const v = g.createRadialGradient(WW / 2, WH / 2, WH * 0.3, WW / 2, WH / 2, WH * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = v; g.fillRect(0, 0, WW, WH);
    return c;
  }
  function decal(fn) { const g = terr.getContext('2d'); g.save(); g.setTransform(S, 0, 0, S, 0, 0); fn(g); g.restore(); }
  function scorch(x, y, r) { decal(g => { blob(g, x, y, r * 1.3, 'rgb(20,15,10)', 0.5); for (let i = 0; i < 6; i++) { const a = R() * 6.28; g.strokeStyle = 'rgba(20,15,10,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6); g.stroke(); } }); }

  // ---------------- الوحدات ----------------
  function shadow(x, y, rx, ry, rot = 0) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(x + 1.6, y + 2, rx, ry, rot, 0, 7); ctx.fill(); }
  function soldier(u, C, opt = {}) {
    const mv = u.moving ? Math.sin(u.walk * 0.55) : 0;
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.face);
    if (opt.prone) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(-2, 1.5, 6, 2.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C.uni2; ctx.beginPath(); ctx.ellipse(-3, 0, 6, 2.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = C.uni; ctx.beginPath(); ctx.ellipse(-2, 0, 4.4, 2.2, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(1, 0.6); ctx.lineTo(opt.long ? 13 : 9, 0.6); ctx.stroke();
      ctx.fillStyle = C.helm; ctx.beginPath(); ctx.arc(2.2, 0, 2.2, 0, 7); ctx.fill();
      ctx.restore(); return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(1.4, 1.8, 3.8, 3.2, 0, 0, 7); ctx.fill();
    // رجلين
    ctx.fillStyle = '#3b3222'; ctx.beginPath(); ctx.ellipse(mv * 2.2, -1.6, 1.6, 1, 0, 0, 7); ctx.ellipse(-mv * 2.2, 1.6, 1.6, 1, 0, 0, 7); ctx.fill();
    // شنطة
    ctx.fillStyle = opt.flame ? '#4b4b44' : '#4f4630'; ctx.fillRect(-4.2, -2.2, 2.4, 4.4);
    if (opt.flame) { ctx.fillStyle = '#6a6a60'; ctx.beginPath(); ctx.arc(-3.4, -1.3, 1.3, 0, 7); ctx.arc(-3.4, 1.3, 1.3, 0, 7); ctx.fill(); }
    // جسم
    ctx.fillStyle = C.uni; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-0.4, -1, 1.6, 2, 0, 0, 7); ctx.fill();
    // سلاح
    if (opt.weapon !== 'none') {
      ctx.strokeStyle = '#2a1f14'; ctx.lineWidth = opt.weapon === 'at' ? 1.4 : 0.9;
      ctx.beginPath(); ctx.moveTo(-1, 2.2); ctx.lineTo(opt.weapon === 'at' ? 11 : opt.weapon === 'short' ? 4 : 7.5, 1.6); ctx.stroke();
    }
    ctx.fillStyle = C.uni2; ctx.beginPath(); ctx.arc(1.6, 2.4, 1, 0, 7); ctx.arc(1.6, -2.4, 1, 0, 7); ctx.fill();
    // رأس وخوذة
    if (C === COL.mine) { ctx.fillStyle = C.helm; ctx.beginPath(); ctx.arc(0.3, 0, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = shade(C.helm, 25); ctx.beginPath(); ctx.arc(0, -0.4, 1.9, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = C.helm; ctx.beginPath(); ctx.ellipse(-0.5, 0, 3, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = shade(C.helm, 22); ctx.beginPath(); ctx.arc(0.2, -0.3, 1.6, 0, 7); ctx.fill(); }
    if (opt.medic) { ctx.fillStyle = '#fff'; ctx.fillRect(-1.4, -0.4, 2.8, 0.9); ctx.fillRect(-0.45, -1.4, 0.9, 2.8); ctx.fillStyle = '#c22'; ctx.fillRect(-1, -0.25, 2, 0.5); ctx.fillRect(-0.25, -1, 0.5, 2); }
    ctx.restore();
  }
  function horse(u, C) {
    const mv = u.moving ? Math.sin(u.walk * 0.4) : 0;
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.face);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 2.5, 8, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1c'; [[4, 2.6], [4, -2.6], [-4, 2.6], [-4, -2.6]].forEach(([x, y], i) => { ctx.beginPath(); ctx.ellipse(x + (i % 3 ? mv : -mv) * 2, y, 1.6, 0.9, 0, 0, 7); ctx.fill(); });
    const gr = ctx.createLinearGradient(0, -3, 0, 3); gr.addColorStop(0, '#8a5d3a'); gr.addColorStop(1, '#5a3b22');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 0, 2.6, 1.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b1d12'; ctx.fillRect(-8.5, -0.5, 2.5, 1);
    ctx.restore();
    soldier({ x: u.x - Math.cos(u.face) * 0.5, y: u.y - Math.sin(u.face) * 0.5, face: u.face, moving: 0, walk: 0 }, C, { weapon: 'short' });
  }
  function treads(len, wid, off, col) {
    ctx.fillStyle = '#2b2a24'; ctx.fillRect(-len / 2, -wid / 2, len, 3.4); ctx.fillRect(-len / 2, wid / 2 - 3.4, len, 3.4);
    ctx.strokeStyle = col; ctx.lineWidth = 0.6;
    for (let x = -len / 2 + ((off % 2.5) + 2.5) % 2.5; x < len / 2; x += 2.5) { ctx.beginPath(); ctx.moveTo(x, -wid / 2); ctx.lineTo(x, -wid / 2 + 3.4); ctx.moveTo(x, wid / 2 - 3.4); ctx.lineTo(x, wid / 2); ctx.stroke(); }
  }
  function hullGrad(w, h, cols) { const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, shade(cols[0], 30)); g.addColorStop(0.5, cols[0]); g.addColorStop(1, cols[1]); return g; }
  function camo(w, h, C, seed) { if (C !== COL.mine) return; ctx.fillStyle = 'rgba(90,70,40,0.45)'; for (let i = 0; i < 4; i++) { const a = (seed * 7 + i * 13) % 10; ctx.beginPath(); ctx.ellipse(-w / 2 + (a / 10) * w, ((i % 2) - 0.5) * h * 0.4, 3, 1.6, a, 0, 7); ctx.fill(); } }
  function cross(x, y, C) { if (C === COL.mine) { ctx.fillStyle = '#e8e2c4'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#2f5d9a'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 7); ctx.fill(); ctx.fillStyle = '#b33'; ctx.beginPath(); ctx.arc(x, y, 0.5, 0, 7); ctx.fill(); } else { ctx.fillStyle = '#eee'; ctx.fillRect(x - 1.8, y - 0.6, 3.6, 1.2); ctx.fillRect(x - 0.6, y - 1.8, 1.2, 3.6); ctx.fillStyle = '#111'; ctx.fillRect(x - 1.4, y - 0.3, 2.8, 0.6); ctx.fillRect(x - 0.3, y - 1.4, 0.6, 2.8); } }
  function tank(u, C, look) {
    const off = u.walk || 0, aim = u.aim ?? u.face;
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.face);
    const dims = { rhomb: [30, 17], ft: [19, 11], whippet: [24, 13], box: [24, 14], long: [32, 13], a7v: [28, 18], car: [18, 10] }[look];
    const [L, W] = dims;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-L / 2 + 2, -W / 2 + 2.5, L, W, 3); ctx.fill();
    if (look === 'car') {
      ctx.fillStyle = '#1d1c18'; [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 2.4, 1.3, 0, 0, 7); ctx.fill(); });
      ctx.fillStyle = hullGrad(L, W, C.tank); ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2 + 1, L, W - 2, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();
    } else if (look === 'rhomb') {
      treads(L, W, off, '#55524a');
      ctx.fillStyle = hullGrad(L, W, C.tank); ctx.fillRect(-L / 2 + 3, -W / 2 + 3.4, L - 6, W - 6.8);
      // سبونسون على الجنبين
      ctx.fillStyle = shade(C.tank[1], -10); ctx.fillRect(-3, -W / 2 - 2, 8, 3); ctx.fillRect(-3, W / 2 - 1, 8, 3);
      ctx.strokeStyle = '#1b1a16'; ctx.lineWidth = u.card === 'mk4m' ? 1.6 : 0.8; ctx.beginPath(); ctx.moveTo(4, -W / 2 - 0.5); ctx.lineTo(9, -W / 2 - 3.5); ctx.moveTo(4, W / 2 + 0.5); ctx.lineTo(9, W / 2 + 3.5); ctx.stroke();
      ctx.fillStyle = shade(C.tank[0], 15); ctx.fillRect(6, -3.5, 6, 7); // كابينة السواق
      ctx.fillStyle = '#222'; ctx.fillRect(10.5, -2, 1, 4);
      camo(L - 8, W - 7, C, u.id || 1);
    } else {
      treads(L, W, off, '#55524a');
      ctx.fillStyle = hullGrad(L, W, C.tank);
      if (look === 'a7v' || look === 'box' || look === 'long') { ctx.beginPath(); ctx.roundRect(-L / 2 - 0.5, -W / 2 + 1, L + 1, W - 2, 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-L / 2, -W / 2 + 1, L, 2); }
      else { ctx.beginPath(); ctx.roundRect(-L / 2 + 1, -W / 2 + 3, L - 2, W - 6, 2); ctx.fill(); }
      if (look === 'whippet') { ctx.fillStyle = shade(C.tank[0], -12); ctx.fillRect(-L / 2 + 2, -4, 9, 8); }
      if (look === 'a7v') { ctx.fillStyle = shade(C.tank[0], 12); ctx.fillRect(-4, -4, 9, 8); ctx.fillStyle = '#222'; for (let i = -1; i <= 1; i++) { ctx.fillRect(-L / 2 + 6 + i * 6, -W / 2 + 0.5, 1.6, 1.2); ctx.fillRect(-L / 2 + 6 + i * 6, W / 2 - 1.7, 1.6, 1.2); } }
      camo(L - 6, W - 6, C, u.id || 1);
    }
    cross(-L / 4, 0, C);
    ctx.restore();
    // البرج والمدفع (بيلف ناحية الهدف)
    ctx.save(); ctx.translate(u.x + Math.cos(u.face) * (look === 'ft' ? 2 : 0), u.y + Math.sin(u.face) * (look === 'ft' ? 2 : 0));
    ctx.rotate(['ft', 'car', 'whippet'].includes(look) || look === 'a7v' ? aim : u.face);
    const gun = { rhomb: 0, ft: 9, whippet: 0, box: 14, long: 20, a7v: 16, car: 8 }[look];
    if (gun) { ctx.strokeStyle = '#1e1d18'; ctx.lineWidth = look === 'car' || look === 'ft' ? 1.4 : 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(gun, 0); ctx.stroke(); }
    if (look === 'ft' || look === 'car') { const g = ctx.createRadialGradient(-1, -1, 0, 0, 0, 4.5); g.addColorStop(0, shade(C.tank[0], 35)); g.addColorStop(1, C.tank[1]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, look === 'ft' ? 4.6 : 3.6, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.6; ctx.stroke(); }
    ctx.restore();
  }
  function artillery(u, C, look) {
    const big = look === 'bertha' ? 1.9 : look === 'howitzer' ? 1.3 : 1;
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.aim ?? u.face); ctx.scale(big, big);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 2, 9, 5, 0, 0, 7); ctx.fill();
    if (look === 'mortar') {
      ctx.fillStyle = '#3e3b33'; ctx.fillRect(-4, -4, 5, 8);
      ctx.fillStyle = '#26251f'; ctx.beginPath(); ctx.arc(1.5, 0, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(1.5, 0, 1.4, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = '#3b2c1c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-12, -1.5); ctx.moveTo(-1, 0); ctx.lineTo(-12, 1.5); ctx.stroke();
      ctx.fillStyle = '#1e1c17'; ctx.fillRect(-2.5, -6, 5, 2); ctx.fillRect(-2.5, 4, 5, 2);
      ctx.fillStyle = hullGrad(6, 10, C.tank); ctx.fillRect(1, -4.5, 2, 9);
      ctx.strokeStyle = '#22211c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(look === 'howitzer' ? 9 : 12, 0); ctx.stroke();
    }
    ctx.restore();
    const b = u.aim ?? u.face, cx = Math.cos(b + Math.PI) * 9 * big, cy = Math.sin(b + Math.PI) * 9 * big;
    soldier({ x: u.x + cx + Math.cos(b + 1.6) * 5, y: u.y + cy + Math.sin(b + 1.6) * 5, face: b, moving: 0, walk: 0 }, C, { weapon: 'none' });
    if (big > 1) soldier({ x: u.x + cx + Math.cos(b - 1.6) * 5, y: u.y + cy + Math.sin(b - 1.6) * 5, face: b, moving: 0, walk: 0 }, C, { weapon: 'none' });
  }
  function drawUnit(u) {
    const C = u.side === me ? COL.mine : COL.foe, s = RT[u.card], look = s.look;
    if (u.dep > 0) {
      if (u.para) { // مظلّة نازلة
        const h = Math.min(1, u.dep / 1.8); ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(u.x + 4 + h * 18, u.y + 4 + h * 18, 6 * (1 - h * 0.4), 0, 7); ctx.fill();
        ctx.save(); ctx.translate(u.x - h * 6, u.y - h * 10); ctx.scale(1 + h * 0.6, 1 + h * 0.6);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#e8e2d0' : '#c9c2ae'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 7, i * 0.785, (i + 1) * 0.785); ctx.fill(); }
        ctx.restore(); ctx.globalAlpha = 1; return;
      }
      ctx.globalAlpha = 0.45;
    }
    const type = CARDS[u.card].type;
    const k = type === 'ARM' ? 1.35 : type === 'GUN' ? 1.45 : look === 'cav' ? 1.5 : 1.75;
    ctx.save(); ctx.translate(u.x, u.y); ctx.scale(k, k); ctx.translate(-u.x, -u.y);
    drawUnitBody(u, C, look, type);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawUnitBody(u, C, look, type) {
    if (type === 'ARM') tank(u, C, look);
    else if (type === 'GUN') artillery(u, C, look);
    else if (look === 'cav') horse(u, C);
    else if (look === 'mg' || look === 'lewis') {
      soldier(u, C, { prone: 1 });
      if (look === 'mg') { const px = Math.cos(u.face + 1.57) * 4, py = Math.sin(u.face + 1.57) * 4; soldier({ ...u, x: u.x + px - Math.cos(u.face) * 3, y: u.y + py - Math.sin(u.face) * 3 }, C, { prone: 1 });
        ctx.save(); ctx.translate(u.x + Math.cos(u.face) * 6, u.y + Math.sin(u.face) * 6); ctx.rotate(u.face); ctx.fillStyle = '#2a2a24'; ctx.fillRect(-2, -1.6, 6, 3.2); ctx.fillStyle = '#1a1a16'; ctx.fillRect(3, -0.6, 5, 1.2); ctx.restore(); }
    }
    else if (look === 'sniper') soldier(u, C, { prone: 1, long: 1 });
    else if (look === 'atrifle') soldier(u, C, { weapon: 'at' });
    else if (look === 'flame') soldier(u, C, { flame: 1, weapon: 'short' });
    else if (look === 'medic') soldier(u, C, { medic: 1, weapon: 'none' });
    else if (look === 'assault') soldier(u, C, { weapon: 'short' });
    else soldier(u, C, {});
  }
  function hpBar(x, y, w, f, mine, always) {
    if (f >= 1 && !always) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 0.5, y - 0.5, w + 1, 2.6);
    ctx.fillStyle = mine ? (f > 0.35 ? '#5fc24a' : '#e0a030') : (f > 0.35 ? '#d9483a' : '#ff7a3a'); ctx.fillRect(x - w / 2, y, w * Math.max(0, f), 1.6);
  }
  function drawStruct(e, t) {
    const C = e.side === me ? COL.mine : COL.foe, f = e.hp / e.max;
    if (e.kind === 'wall') {
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(2, 2, 15, 0, 7); ctx.fill();
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; ctx.fillStyle = i % 2 ? '#a99770' : '#94845f'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 3.4, 2, a + 1.57, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#3a2d1f'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      ctx.restore(); hpBar(e.x, e.y - 19, 24, f, e.side === me, true); return;
    }
    const big = e.kind === 'hq';
    const r = e.kind === 'fortgun' ? 13 : big ? 26 : 19;
    const fl = flip ? Math.PI : 0; // للضيف: نعدل المبنى عشان العلم يبقى لفوق
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(fl);
    // أكياس رمل
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(2.5, 3, r + 6, 0, 7); ctx.fill();
    const n = big ? 34 : 24;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; ctx.fillStyle = i % 2 ? '#ab9a72' : '#978862'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * (r + 3.5), Math.sin(a) * (r + 3.5), 3.6, 2.1, a + 1.57, 0, 7); ctx.fill(); }
    if (big) {
      // مبنى القيادة: سقف قرميد
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-16 + 3, -14 + 3, 32, 28);
      const roofs = [['#8c4a32', [[-16, -14], [16, -14], [8, 0], [-8, 0]]], ['#6e3a27', [[16, -14], [16, 14], [8, 0]]], ['#7d4230', [[16, 14], [-16, 14], [-8, 0], [8, 0]]], ['#a35a3e', [[-16, 14], [-16, -14], [-8, 0]]]];
      roofs.forEach(([c, p]) => { ctx.fillStyle = c; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill(); });
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.4; for (let y = -12; y < 14; y += 2.5) { ctx.beginPath(); ctx.moveTo(-16, y); ctx.lineTo(16, y); ctx.stroke(); }
      ctx.strokeStyle = '#4a2618'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      if (f < 0.6) { ctx.fillStyle = '#2a1d14'; ctx.beginPath(); ctx.arc(-6, 5, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-9, 3, 2, 1); }
      // مدفع
      ctx.save(); ctx.rotate(e.face - fl); ctx.strokeStyle = '#1d1c18'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(28, 0); ctx.stroke(); ctx.restore();
      // علم
      const fx = 12, fy = -20; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(fx, fy + 10); ctx.lineTo(fx, fy - 6); ctx.stroke();
      ctx.fillStyle = C.flag; ctx.beginPath(); ctx.moveTo(fx, fy - 6); for (let i = 0; i <= 10; i++) ctx.lineTo(fx + i, fy - 6 + Math.sin(t * 6 + i * 0.6) * 1.2); for (let i = 10; i >= 0; i--) ctx.lineTo(fx + i, fy + Math.sin(t * 6 + i * 0.6) * 1.2); ctx.fill();
    } else {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      g.addColorStop(0, '#b7b2a4'); g.addColorStop(0.7, '#8f8a7c'); g.addColorStop(1, '#6a665b');
      ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.39; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(-2, -2, r * 0.55, 0, 7); ctx.fill();
      ctx.save(); ctx.rotate(e.face - fl); ctx.fillStyle = '#151410'; ctx.fillRect(r * 0.55, -4, 4, 8);
      if (e.kind === 'fortgun') { ctx.strokeStyle = '#1d1c18'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.stroke(); }
      ctx.restore();
      if (f < 0.5) { ctx.strokeStyle = 'rgba(30,25,20,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.moveTo(4, -9); ctx.lineTo(7, -2); ctx.stroke(); }
      ctx.fillStyle = C.flag; ctx.fillRect(-3, -r - 9, 6, 4); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-3, -r - 9); ctx.lineTo(-3, -r - 2); ctx.stroke();
    }
    ctx.restore();
    // دخان من التحصين المضروب
    if (f < 0.5 && R() < 0.25) smoke(e.x + (R() - 0.5) * r, e.y + (R() - 0.5) * r, 3, f < 0.25);
    hpBar(e.x, e.y + r + 7, big ? 46 : 32, f, e.side === me, true);
  }

  // ---------------- مؤثرات ----------------
  function smoke(x, y, s = 4, fire) {
    parts.push({ x, y, vx: (R() - 0.5) * 6 + 4, vy: -6 - R() * 6, life: 0, max: 2.2 + R() * 1.5, s, grow: 6, c: fire && R() < 0.4 ? 'fire' : 'smoke' });
  }
  function explosion(x, y, r, big) {
    flashes.push({ x, y, r: r * 1.4, life: 0, max: 0.22 });
    for (let i = 0; i < (big ? 18 : 7); i++) { const a = R() * 6.28, v = (20 + R() * 60) * (r / 25); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + R() * 0.3, s: r * 0.25, grow: 2, c: 'fire', drag: 3 }); }
    for (let i = 0; i < (big ? 14 : 5); i++) { const a = R() * 6.28, v = R() * 18; parts.push({ x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * v + 3, vy: Math.sin(a) * v - 4, life: 0, max: 2 + R() * 2, s: r * 0.3, grow: r * 0.35, c: 'smoke' }); }
    for (let i = 0; i < (big ? 14 : 5); i++) { const a = R() * 6.28, v = 40 + R() * 70; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + R() * 0.4, s: 0.9, grow: 0, c: 'debris', drag: 2 }); }
    scorch(x, y, r * 0.55);
    if (big) shake = Math.min(8, shake + r / 8);
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
      const dr = p.drag ? Math.exp(-p.drag * dt) : 1; p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (parts.length > 700) parts.splice(0, parts.length - 700);
  }
  function drawParts() {
    for (const p of parts) {
      const k = p.life / p.max, s = p.s + p.grow * k;
      if (p.c === 'smoke') { const a = 0.45 * (1 - k) * Math.min(1, p.life * 5); ctx.fillStyle = `rgba(${70 + k * 60 | 0},${66 + k * 58 | 0},${60 + k * 55 | 0},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 7); ctx.fill(); }
      else if (p.c === 'fire') { const a = 1 - k; ctx.fillStyle = `rgba(255,${180 - k * 140 | 0},${60 - k * 50 | 0},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, s * (1 - k * 0.5), 0, 7); ctx.fill(); }
      else if (p.c === 'debris') { ctx.fillStyle = `rgba(40,30,20,${1 - k})`; ctx.fillRect(p.x, p.y, 1.4, 1.4); }
      else if (p.c === 'heal') { ctx.fillStyle = `rgba(120,255,120,${1 - k})`; ctx.font = 'bold 6px sans-serif'; ctx.fillText('+', p.x, p.y); }
      else if (p.c === 'gas') { ctx.fillStyle = `rgba(190,200,80,${0.22 * Math.sin(k * 3.14)})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 7); ctx.fill(); }
      else if (p.c === 'dust') { ctx.fillStyle = `rgba(150,130,100,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 7); ctx.fill(); }
    }
  }
  function onFx(f, ents) {
    switch (f.k) {
      case 'shot': {
        const big = f.w === 'cannon' || f.w === 'big' || f.w === 'mortar';
        const a = Math.atan2(f.ty - f.y, f.tx - f.x), mx = f.x + Math.cos(a) * (big ? 12 : 6), my = f.y + Math.sin(a) * (big ? 12 : 6);
        flashes.push({ x: mx, y: my, r: big ? 7 : 3, life: 0, max: big ? 0.12 : 0.06 });
        if (f.w === 'mg' || f.w === 'rifle' || f.w === 'sniper') tracers.push({ x1: mx, y1: my, x2: f.tx + (R() - 0.5) * 4, y2: f.ty + (R() - 0.5) * 4, life: 0, max: f.w === 'sniper' ? 0.18 : 0.08, w: f.w === 'sniper' ? 0.9 : 0.5 });
        if (f.w === 'flame') for (let i = 0; i < 4; i++) { const t = R(); parts.push({ x: mx + (f.tx - mx) * t, y: my + (f.ty - my) * t, vx: (R() - 0.5) * 10, vy: (R() - 0.5) * 10, life: 0, max: 0.3 + R() * 0.2, s: 2 + t * 4, grow: 3, c: 'fire' }); }
        if (f.w === 'grenade') { parts.push({ x: f.tx, y: f.ty, vx: 0, vy: 0, life: 0, max: 0.3, s: 4, grow: 6, c: 'fire' }); smoke(f.tx, f.ty, 3); }
        if (big) { smoke(mx, my, 3); smoke(mx, my, 2); }
        else if (R() < 0.3) parts.push({ x: f.tx + (R() - 0.5) * 6, y: f.ty + (R() - 0.5) * 6, vx: 0, vy: -3, life: 0, max: 0.4, s: 1, grow: 2, c: 'dust' });
        const sh = ents && ents.get(f.id); if (sh) sh.aim = a;
        SND(big ? (f.w === 'big' ? 'boom' : 'cannon') : f.w === 'mg' ? 'mg1' : f.w === 'flame' ? '' : 'shot');
        break;
      }
      case 'boom': explosion(f.x, f.y, f.r, f.big); SND(f.big ? 'boom' : f.small ? '' : 'thump'); break;
      case 'die':
        if (f.ty === 'ARM') { explosion(f.x, f.y, 22, 1); decal(g => { g.fillStyle = 'rgba(25,22,18,0.85)'; g.save(); g.translate(f.x, f.y); g.rotate(R() * 3); g.fillRect(-11, -6, 22, 12); g.fillStyle = 'rgba(60,50,40,0.6)'; g.fillRect(-6, -4, 10, 8); g.restore(); }); for (let i = 0; i < 12; i++) smoke(f.x, f.y, 4, true); SND('boom'); }
        else if (f.ty === 'GUN') { explosion(f.x, f.y, 14, 0); SND('thump'); }
        else decal(g => { g.fillStyle = f.side === me ? 'rgba(70,62,38,0.7)' : 'rgba(60,68,64,0.7)'; g.beginPath(); g.ellipse(f.x, f.y, 3.6, 1.8, R() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(70,20,15,0.35)'; g.beginPath(); g.arc(f.x + 1, f.y + 1, 2, 0, 7); g.fill(); });
        break;
      case 'heal': parts.push({ x: f.x + (R() - 0.5) * 6, y: f.y, vx: 0, vy: -10, life: 0, max: 0.8, s: 1, grow: 0, c: 'heal' }); break;
      case 'plane': planes.push({ x: f.x, y: f.y, side: f.side, kind: f.kind, life: 0, max: f.kind === 'bomber' ? 2.6 : 2.2 }); SND('plane'); break;
      case 'strafe': for (let i = 0; i < 16; i++) parts.push({ x: f.x + (R() - 0.5) * 10, y: f.y - 75 + i * 10, vx: 0, vy: -4, life: 0, max: 0.6, s: 1.5, grow: 3, c: 'dust' }); SND('mg1'); break;
      case 'crown': banners.push({ t: f.side === me ? '🏴 دمّرت تحصين للعدو!' : '⚠️ العدو دمّر تحصين ليك', life: 0, good: f.side === me }); SND(f.side === me ? 'win' : 'lose'); break;
      case 'ot': banners.push({ t: '⏱️ وقت إضافي! الإمداد ×2 وأول تحصين يقع بيحسم', life: 0, good: true }); SND('bugle'); break;
    }
  }
  let sndBudget = 0, lastSnd = {};
  function SND(n) { if (!n || typeof SFX === 'undefined') return; const now = performance.now(); if ((lastSnd[n] || 0) > now - (n === 'mg1' ? 90 : n === 'shot' ? 70 : 60)) return; if (sndBudget > 6) return; sndBudget++; lastSnd[n] = now; SFX.play(n); }
  function drawPlane(p) {
    const k = p.life / p.max, dir = p.side === 0 ? -1 : 1;
    const x = p.x + (p.kind === 'fighter' ? 0 : -20 * dir), y = p.y + dir * (k - 0.55) * 520;
    const sc = p.kind === 'bomber' ? 1.7 : p.kind === 'transport' ? 1.5 : 1;
    ctx.save(); ctx.translate(x + 26, y + 26); ctx.rotate(dir > 0 ? Math.PI / 2 : -Math.PI / 2); ctx.scale(sc, sc); ctx.fillStyle = 'rgba(0,0,0,0.25)'; planeShape(); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir > 0 ? Math.PI / 2 : -Math.PI / 2); ctx.scale(sc, sc);
    ctx.fillStyle = p.side === me ? '#8a8058' : '#7a7f7a'; planeShape(true, p.side === me); ctx.restore();
  }
  function planeShape(detail, mine) {
    ctx.beginPath(); ctx.roundRect(-9, -1.6, 17, 3.2, 1.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-1, -11, 5, 22, 1.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-9, -4.5, 3, 9, 1); ctx.fill();
    if (detail) { ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-1, -11, 1.5, 22); cross(1.5, -7, mine ? COL.mine : COL.foe); cross(1.5, 7, mine ? COL.mine : COL.foe);
      ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(8.5, 0, 3, 0, 7); ctx.stroke(); }
  }
  function drawZone(z, t) {
    if (z.kind === 'mine') { if (z.side !== me) return; ctx.strokeStyle = 'rgba(255,220,120,0.35)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(z.x, z.y, 10, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(60,55,40,0.8)'; ctx.beginPath(); ctx.arc(z.x, z.y, 3, 0, 7); ctx.fill(); return; }
    if (z.kind === 'gas') { if (R() < 0.6) parts.push({ x: z.x + (R() - 0.5) * z.r * 1.6, y: z.y + (R() - 0.5) * z.r * 1.6, vx: 4, vy: -2, life: 0, max: 2, s: 10 + R() * 10, grow: 8, c: 'gas' }); return; }
    if (z.kind === 'heal') { ctx.strokeStyle = `rgba(120,255,120,${0.3 + 0.2 * Math.sin(t * 8)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); return; }
    if (z.kind === 'wire') { ctx.strokeStyle = 'rgba(40,40,40,0.8)'; ctx.lineWidth = 0.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let a = 0; a <= 6.3; a += 0.15) { const rr = z.r * (0.5 + k * 0.22) + Math.sin(a * 9 + k) * 2.5; ctx.lineTo(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr); } ctx.stroke(); } return; }
    if (z.kind === 'barrage' || z.kind === 'bomber' || z.kind === 'ace' || z.kind === 'recon') {
      const col = z.kind === 'recon' ? '120,200,255' : '255,80,60';
      ctx.strokeStyle = `rgba(${col},${0.5 + 0.3 * Math.sin(t * 14)})`; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); if (z.kind === 'ace') ctx.rect(z.x - z.r, z.y - 75, z.r * 2, 150); else ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // ---------------- الإطار ----------------
  function frame(view, dt) {
    const { ents, t, ghost } = view;
    sndBudget = 0;
    const W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1a1a12'; ctx.fillRect(0, 0, W, H);
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0; shake = Math.max(0, shake - dt * 20);
    ctx.setTransform(scale, 0, 0, scale, ox + sx, oy + sy);
    if (flip) { ctx.translate(WW, WH); ctx.rotate(Math.PI); }
    ctx.drawImage(terr, 0, 0, WW, WH);
    stepParts(dt);
    // مناطق التكتيكات
    ents.forEach(e => e.t === 'z' && drawZone(e, t));
    // ترتيب الرسم حسب العمق
    const list = ents.filter(e => e.t === 'u' || e.t === 's').sort((a, b) => (flip ? b.y - a.y : a.y - b.y));
    list.forEach(e => e.t === 's' ? drawStruct(e, t) : drawUnit(e));
    // القذايف في الهوا
    ents.forEach(p => {
      if (p.t !== 'p') return; const k = Math.max(0, Math.min(1, 1 - (p.at - t) / p.dur));
      const x = p.x0 + (p.x - p.x0) * k, y = p.y0 + (p.y - p.y0) * k, h = Math.sin(k * Math.PI) * (p.w === 'big' || p.w === 'mortar' ? 40 : 6);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x, y - h * (flip ? -1 : 1), p.w === 'big' ? 2.2 : 1.4, 0, 7); ctx.fill();
    });
    drawParts();
    for (let i = tracers.length - 1; i >= 0; i--) { const s = tracers[i]; s.life += dt; if (s.life > s.max) { tracers.splice(i, 1); continue; } const a = 1 - s.life / s.max;
      ctx.strokeStyle = `rgba(255,230,150,${a})`; ctx.lineWidth = s.w; const k0 = s.life / s.max, k1 = Math.min(1, k0 + 0.5);
      ctx.beginPath(); ctx.moveTo(s.x1 + (s.x2 - s.x1) * k0, s.y1 + (s.y2 - s.y1) * k0); ctx.lineTo(s.x1 + (s.x2 - s.x1) * k1, s.y1 + (s.y2 - s.y1) * k1); ctx.stroke(); }
    for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.life += dt; if (f.life > f.max) { flashes.splice(i, 1); continue; } const k = f.life / f.max;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (0.6 + k)); g.addColorStop(0, `rgba(255,255,220,${1 - k})`); g.addColorStop(0.4, `rgba(255,190,80,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k), 0, 7); ctx.fill(); }
    // أشرطة الصحة
    list.forEach(e => { if (e.t === 'u' && e.dep <= 0) { const big = CARDS[e.card].type !== 'INF'; hpBar(e.x, e.y + (flip ? 1 : -1) * (big ? 17 : 11) - 1, big ? 22 : 11, e.hp / e.max, e.side === me); } });
    for (let i = planes.length - 1; i >= 0; i--) { const p = planes[i]; p.life += dt; if (p.life > p.max) { planes.splice(i, 1); continue; } drawPlane(p); }
    if (map.fog) { for (let i = 0; i < 5; i++) { const x = ((t * 6 + i * 90) % 460) - 50, y = 230 + i * 40; const g = ctx.createRadialGradient(x, y, 0, x, y, 90); g.addColorStop(0, 'rgba(200,205,200,0.33)'); g.addColorStop(1, 'rgba(200,205,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 90, 180, 180); } }
    // منطقة النزول + شبح الكارت
    if (ghost) {
      ctx.fillStyle = 'rgba(200,40,30,0.18)';
      if (ghost.zone === 'own') {
        // الأحمر: ممنوع تنزل. الطريق اللي دمّرت تحصينه بيتفتح لحد نص أرض العدو
        const open = ghost.open || [];
        if (me === 0) { ctx.fillRect(0, 0, WW, 200); [0, 1].forEach(l => !open.includes(l) && ctx.fillRect(l === 0 ? 0 : 180, 200, 180, 152)); }
        else { ctx.fillRect(0, 440, WW, 200); [0, 1].forEach(l => !open.includes(l) && ctx.fillRect(l === 0 ? 180 : 0, 288, 180, 152)); }
      }
      if (ghost.x != null) {
        ctx.strokeStyle = ghost.ok ? 'rgba(255,255,255,0.9)' : 'rgba(255,60,40,0.9)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.arc(ghost.x, ghost.y, ghost.r || 12, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        if (ghost.range) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(ghost.x, ghost.y, ghost.range, 0, 7); ctx.stroke(); }
      }
    }
    // لافتات
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = banners.length - 1; i >= 0; i--) { const b = banners[i]; b.life += dt; if (b.life > 2.4) { banners.splice(i, 1); continue; }
      const a = Math.min(1, b.life * 4, (2.4 - b.life) * 3); ctx.globalAlpha = a; const fs = Math.round(16 * window.devicePixelRatio);
      ctx.font = `900 ${fs}px sans-serif`; ctx.textAlign = 'center'; ctx.direction = 'rtl';
      const y = H * 0.42 - i * fs * 1.6; ctx.fillStyle = 'rgba(0,0,0,0.6)'; const w = ctx.measureText(b.t).width + fs; ctx.fillRect(W / 2 - w / 2, y - fs, w, fs * 1.5);
      ctx.fillStyle = b.good ? '#f3d98a' : '#ff8a6a'; ctx.fillText(b.t, W / 2, y + fs * 0.1); ctx.globalAlpha = 1; }
  }

  return {
    init(c) { cv = c; ctx = c.getContext('2d'); },
    setup(mapId, seed, viewer) {
      map = MAPS[mapId]; me = viewer; flip = viewer === 1;
      S = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 2)));
      terr = buildTerrain(map, seed); parts.length = flashes.length = tracers.length = planes.length = banners.length = 0;
    },
    resize() {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      scale = Math.min(cv.width / WW, cv.height / WH); ox = (cv.width - WW * scale) / 2; oy = (cv.height - WH * scale) / 2;
    },
    // من مكان اللمسة على الشاشة لإحداثيات العالم
    toWorld(cx, cy) {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      let x = ((cx - r.left) * dpr - ox) / scale, y = ((cy - r.top) * dpr - oy) / scale;
      if (flip) { x = WW - x; y = WH - y; }
      return [x, y];
    },
    fx: onFx, frame, banner(t, good) { banners.push({ t, life: 0, good }); },
    // للرسم الـ3D: الأرض كصورة + خريطة ارتفاعات + أماكن الشجر والأطلال
    terrainFor(mapId, seed, scale, features) {
      const oldS = S; S = scale; props = []; skipProps = true; featOnly = !!features;
      const hc = mk(WW, WH); hg = hc.getContext('2d'); hg.fillStyle = 'rgb(128,128,128)'; hg.fillRect(0, 0, WW, WH);
      const c = buildTerrain(MAPS[mapId], seed);
      const out = { color: c, height: hc, props };
      hg = null; skipProps = false; featOnly = false; S = oldS; return out;
    },
    blob, scorchOn(c, scale, x, y, r) { const g = c.getContext('2d'); g.save(); g.setTransform(scale, 0, 0, scale, 0, 0); blob(g, x, y, r * 1.3, 'rgb(20,15,10)', 0.5); g.restore(); },
  };
})();
