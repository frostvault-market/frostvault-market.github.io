'use strict';
// ---------- on-foot mode art: rooms, hero, doors ----------
const PART = {
  // prerender a room's static background (walls, windows, decor, floor, platforms)
  buildRoom(room, B, k) {
    const W = room.W, H = room.H;
    const c = makeCanvas(W * k, H * k), g = c.getContext('2d');
    g.scale(k, k);
    const r = RNG(room.seed);
    const FY = room.floorY;
    // --- wall
    const wg = g.createLinearGradient(0, 0, 0, FY);
    wg.addColorStop(0, B.wall[1]); wg.addColorStop(0.35, B.wall[0]); wg.addColorStop(1, B.wall[1]);
    g.fillStyle = wg; g.fillRect(0, 0, W, H);
    this.wallPattern(g, B, W, FY, r);
    // windows
    for (const wdw of room.windows) this.window(g, wdw, B, r);
    // pillars / wall segments
    for (let x = 0; x < W; x += 420 + r.range(0, 120)) {
      const pg = g.createLinearGradient(x, 0, x + 34, 0);
      pg.addColorStop(0, rgba('#000000', 0.25)); pg.addColorStop(0.3, rgba('#ffffff', 0.05)); pg.addColorStop(1, rgba('#000000', 0.35));
      g.fillStyle = pg; g.fillRect(x, 0, 34, FY);
    }
    // grime and stains
    for (let i = 0; i < 26; i++) {
      const x = r.range(0, W), y = r.range(40, FY), rr = r.range(30, 140);
      const sg = g.createRadialGradient(x, y, 0, x, y, rr);
      sg.addColorStop(0, rgba('#120a06', r.range(0.08, 0.22))); sg.addColorStop(1, rgba('#120a06', 0));
      g.fillStyle = sg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // water stains dripping from ceiling
    for (let i = 0; i < 8; i++) {
      const x = r.range(0, W), len = r.range(60, 220);
      const dg = g.createLinearGradient(0, 40, 0, 40 + len);
      dg.addColorStop(0, rgba('#1a120a', 0.35)); dg.addColorStop(1, rgba('#1a120a', 0));
      g.fillStyle = dg; g.fillRect(x, 40, r.range(10, 40), len);
    }
    // decor (behind platforms)
    for (const d of room.decor) this.decor(g, d, B, FY, r);
    // posters
    for (const p of room.posters) this.poster(g, p, B, r);
    // blood smears & handprints
    for (let i = 0; i < 3 + Math.floor(room.n / 3); i++) {
      const x = r.range(80, W - 80), y = r.range(FY - 300, FY - 30);
      g.fillStyle = rgba('#5a0606', r.range(0.35, 0.7));
      if (r.chance(0.5)) {
        // splatter with uneven drips
        const a0 = r.range(0.4, 0.7);
        g.beginPath(); for (let j = 0; j < 9; j++) { const ang = j / 9 * TAU, rr = r.range(8, 20); g.lineTo(x + Math.cos(ang) * rr * 1.4, y + Math.sin(ang) * rr * 0.8); } g.closePath(); g.fill();
        for (let j = 0; j < 3; j++) {
          const dx = x + r.range(-16, 16), len = r.range(14, 60), wd = r.range(2, 4);
          const dg = g.createLinearGradient(0, y, 0, y + len); dg.addColorStop(0, rgba('#5a0606', a0)); dg.addColorStop(1, rgba('#5a0606', 0.05));
          g.fillStyle = dg; g.fillRect(dx, y, wd, len); g.beginPath(); g.arc(dx + wd / 2, y + len, wd * 0.8, 0, TAU); g.fill();
        }
        for (let j = 0; j < 6; j++) { g.fillStyle = rgba('#5a0606', a0); g.beginPath(); g.arc(x + r.range(-40, 40), y + r.range(-24, 24), r.range(1, 3), 0, TAU); g.fill(); }
      } else {
        g.beginPath(); g.ellipse(x, y, 10, 13, 0, 0, TAU); g.fill();
        for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x - 9 + j * 6, y - 17, 2.6, 6, 0, 0, TAU); g.fill(); }
        g.beginPath(); g.ellipse(x + 11, y - 3, 2.6, 6, -0.8, 0, TAU); g.fill();
      }
    }
    // ceiling
    const cg = g.createLinearGradient(0, 0, 0, 48);
    cg.addColorStop(0, '#0c0806'); cg.addColorStop(1, B.trim);
    g.fillStyle = cg; g.fillRect(0, 0, W, 48);
    g.fillStyle = rgba('#000000', 0.4); g.fillRect(0, 46, W, 4);
    for (let x = 60; x < W; x += 180) { g.fillStyle = rgba('#000000', 0.5); g.fillRect(x, 0, 14, 48); }
    // lamps (fixtures; light is added at runtime)
    for (const l of room.lamps) this.lampFixture(g, l, B);
    // skirting
    g.fillStyle = B.trim; g.fillRect(0, FY - 14, W, 14);
    g.fillStyle = rgba('#ffffff', 0.08); g.fillRect(0, FY - 14, W, 2);
    // floor
    this.floor(g, B, W, FY, H, r);
    // platforms
    for (const p of room.plats) this.platform(g, p, B, r);
    // vignette edges (walls end)
    for (const [x0, dir] of [[0, 1], [W, -1]]) {
      const eg = g.createLinearGradient(x0, 0, x0 + dir * 160, 0);
      eg.addColorStop(0, 'rgba(0,0,0,0.7)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = eg; g.fillRect(dir > 0 ? 0 : W - 160, 0, 160, H);
    }
    return c;
  },

  wallPattern(g, B, W, FY, r) {
    const id = B.id;
    g.save();
    if (id === 'apartment') {
      // faded striped wallpaper above, wood panels below
      for (let x = 0; x < W; x += 36) { g.fillStyle = rgba('#ffffff', 0.035); g.fillRect(x, 48, 14, FY - 220); }
      for (let x = 18; x < W; x += 36) for (let y = 70; y < FY - 220; y += 40) { g.fillStyle = rgba('#2a1e10', 0.12); g.beginPath(); g.ellipse(x, y, 4, 6, 0, 0, TAU); g.fill(); }
      // peeling patches
      for (let i = 0; i < 10; i++) { const x = r.range(0, W), y = r.range(60, FY - 260); g.fillStyle = rgba('#8a7a62', 0.5); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 7; j++) g.lineTo(x + r.range(-50, 50), y + r.range(-40, 40)); g.fill(); }
      const pg = g.createLinearGradient(0, FY - 200, 0, FY);
      pg.addColorStop(0, '#4a3422'); pg.addColorStop(1, '#2a1c12');
      g.fillStyle = pg; g.fillRect(0, FY - 200, W, 200);
      g.fillStyle = '#5e4430'; g.fillRect(0, FY - 206, W, 8);
      for (let x = 0; x < W; x += 90) { g.strokeStyle = rgba('#000000', 0.35); g.lineWidth = 2; g.strokeRect(x + 10, FY - 186, 70, 160); }
    } else if (id === 'hospital') {
      // tiles on the lower part
      const top = FY - 260;
      g.fillStyle = '#c6d6d2'; g.fillRect(0, top, W, 260);
      g.strokeStyle = rgba('#5a7a74', 0.45); g.lineWidth = 1.5;
      for (let y = top; y < FY; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let y = top, row = 0; y < FY; y += 26, row++) for (let x = (row % 2) * 13; x < W; x += 26) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); }
      g.fillStyle = '#3a8a84'; g.fillRect(0, top - 10, W, 10);
      g.fillStyle = rgba('#000000', 0.18); g.fillRect(0, top, W, 260);
      // corridor guide line
      g.fillStyle = '#2a7aa0'; g.fillRect(0, top + 120, W, 6);
    } else if (id === 'mall') {
      // dark panels with neon strip
      for (let x = 0; x < W; x += 140) {
        const pg = g.createLinearGradient(x, 0, x + 140, 0);
        pg.addColorStop(0, rgba('#ffffff', 0.04)); pg.addColorStop(1, rgba('#000000', 0.12));
        g.fillStyle = pg; g.fillRect(x + 4, 60, 132, FY - 80);
      }
      g.fillStyle = '#ff4fc0'; g.fillRect(0, 70, W, 3);
      g.fillStyle = rgba('#ff4fc0', 0.15); g.fillRect(0, 62, W, 18);
      g.fillStyle = '#4fd8ff'; g.fillRect(0, FY - 40, W, 2);
    } else {
      // concrete blocks, hazard stripes
      for (let y = 48; y < FY; y += 44) for (let x = ((y / 44) % 2) * 60; x < W; x += 120) {
        g.strokeStyle = rgba('#000000', 0.22); g.lineWidth = 2; g.strokeRect(x, y, 120, 44);
        g.fillStyle = rgba('#ffffff', r.range(0, 0.04)); g.fillRect(x + 2, y + 2, 116, 40);
      }
      g.save(); g.beginPath(); g.rect(0, FY - 50, W, 36); g.clip();
      for (let x = -40; x < W + 40; x += 40) { g.fillStyle = (x / 40) % 2 ? '#d8a81a' : '#1a1a1a'; g.beginPath(); g.moveTo(x, FY - 14); g.lineTo(x + 20, FY - 14); g.lineTo(x + 56, FY - 50); g.lineTo(x + 36, FY - 50); g.fill(); }
      g.restore();
    }
    g.restore();
  },

  window(g, w, B, r) {
    const { x, y, w: ww, h } = w;
    g.save();
    // outside view
    const og = g.createLinearGradient(0, y, 0, y + h);
    og.addColorStop(0, B.window[0]); og.addColorStop(1, B.window[1]);
    g.fillStyle = og; g.fillRect(x, y, ww, h);
    g.beginPath(); g.rect(x, y, ww, h); g.clip();
    // distant city silhouettes
    g.fillStyle = rgba('#05040a', 0.85);
    let bx = x - 20;
    while (bx < x + ww) { const bw = r.range(16, 40), bh = r.range(20, h * 0.6); g.fillRect(bx, y + h - bh, bw, bh); bx += bw + 2; }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,190,110,.7)'; g.fillRect(x + r.range(0, ww), y + h - r.range(5, h * 0.5), 3, 4); }
    // moon glow
    if (r.chance(0.4)) { const mg = g.createRadialGradient(x + ww * 0.7, y + h * 0.25, 0, x + ww * 0.7, y + h * 0.25, 40); mg.addColorStop(0, 'rgba(255,240,220,.8)'); mg.addColorStop(0.2, 'rgba(255,240,220,.4)'); mg.addColorStop(1, 'rgba(255,240,220,0)'); g.fillStyle = mg; g.fillRect(x, y, ww, h); }
    // glass reflection
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(x + ww * 0.1, y + h); g.lineTo(x + ww * 0.45, y); g.lineTo(x + ww * 0.6, y); g.lineTo(x + ww * 0.25, y + h); g.fill();
    g.restore();
    // frame
    g.strokeStyle = B.trim; g.lineWidth = 8; g.strokeRect(x, y, ww, h);
    g.lineWidth = 4; g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + ww, y + h / 2); g.stroke();
    g.fillStyle = B.trim; g.fillRect(x - 10, y + h, ww + 20, 10);
    // boards nailed / broken glass
    if (w.boarded) {
      for (let i = 0; i < 3; i++) {
        g.save(); g.translate(x + ww / 2, y + h * (0.25 + i * 0.27)); g.rotate(r.range(-0.25, 0.25));
        const bg = g.createLinearGradient(0, -9, 0, 9); bg.addColorStop(0, '#8a6a44'); bg.addColorStop(1, '#4a3420');
        g.fillStyle = bg; g.fillRect(-ww * 0.62, -9, ww * 1.24, 18);
        g.fillStyle = '#222'; g.beginPath(); g.arc(-ww * 0.5, 0, 2, 0, TAU); g.arc(ww * 0.5, 0, 2, 0, TAU); g.fill();
        g.restore();
      }
    } else {
      g.strokeStyle = 'rgba(220,230,255,.35)'; g.lineWidth = 1.2;
      const cx = x + r.range(ww * 0.2, ww * 0.8), cy = y + r.range(h * 0.2, h * 0.8);
      for (let i = 0; i < 7; i++) { const a = r.range(0, TAU), l = r.range(20, 60); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
    }
  },

  lampFixture(g, l, B) {
    g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(l.x, 44); g.lineTo(l.x, l.y - 14); g.stroke();
    const sg = g.createLinearGradient(l.x - 26, 0, l.x + 26, 0);
    sg.addColorStop(0, '#1e1a16'); sg.addColorStop(0.5, '#4a4038'); sg.addColorStop(1, '#14110e');
    g.fillStyle = sg; g.beginPath(); g.moveTo(l.x - 8, l.y - 16); g.lineTo(l.x + 8, l.y - 16); g.lineTo(l.x + 26, l.y); g.lineTo(l.x - 26, l.y); g.closePath(); g.fill();
    g.fillStyle = B.light; g.beginPath(); g.ellipse(l.x, l.y + 1, 14, 4, 0, 0, TAU); g.fill();
  },

  floor(g, B, W, FY, H, r) {
    const fg = g.createLinearGradient(0, FY, 0, H);
    fg.addColorStop(0, B.floorTop); fg.addColorStop(0.08, B.floor); fg.addColorStop(1, shade(B.floor, -0.55));
    g.fillStyle = fg; g.fillRect(0, FY, W, H - FY);
    g.strokeStyle = rgba('#000000', 0.3); g.lineWidth = 2;
    if (B.plat === 'wood') {
      for (let y = FY + 14; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      for (let y = FY + 14, row = 0; y < H; y += 16, row++) for (let x = (row % 3) * 70; x < W; x += 210) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    } else {
      for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, FY); g.lineTo(x - 30, H); g.stroke(); }
      g.beginPath(); g.moveTo(0, FY + 30); g.lineTo(W, FY + 30); g.stroke();
    }
    g.fillStyle = rgba('#ffffff', 0.18); g.fillRect(0, FY, W, 2);
    // debris on floor
    for (let i = 0; i < W / 60; i++) {
      g.fillStyle = rgba(r.chance(0.5) ? '#000000' : '#ffffff', r.range(0.06, 0.15));
      g.beginPath(); g.ellipse(r.range(0, W), FY + r.range(3, 14), r.range(3, 12), r.range(1, 3), 0, 0, TAU); g.fill();
    }
  },

  platform(g, p, B, r) {
    const { x, y, w } = p, th = 16;
    // shadow on wall
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 8, y + th, w, 14);
    if (B.plat === 'wood') {
      g.strokeStyle = '#3a2614'; g.lineWidth = 6;
      for (const sx of [x + 16, x + w - 16]) { g.beginPath(); g.moveTo(sx, y + th); g.lineTo(sx - 10, y + th + 40); g.stroke(); }
      const pg = g.createLinearGradient(0, y, 0, y + th);
      pg.addColorStop(0, '#a5784a'); pg.addColorStop(1, '#5a3a20');
      g.fillStyle = pg; g.fillRect(x, y, w, th);
      g.strokeStyle = rgba('#000000', 0.3); g.lineWidth = 1;
      for (let px = x + 60; px < x + w; px += 60) { g.beginPath(); g.moveTo(px, y); g.lineTo(px, y + th); g.stroke(); }
    } else if (B.plat === 'metal' || B.plat === 'grate') {
      g.strokeStyle = '#1e2224'; g.lineWidth = 4;
      for (let sx = x + 20; sx < x + w; sx += 80) { g.beginPath(); g.moveTo(sx, y + th); g.lineTo(sx, y + th + 30); g.lineTo(sx + 40, y + th); g.stroke(); }
      const pg = g.createLinearGradient(0, y, 0, y + th);
      pg.addColorStop(0, B.plat === 'grate' ? '#9a8a4a' : '#b8c4c8'); pg.addColorStop(1, '#3a4448');
      g.fillStyle = pg; g.fillRect(x, y, w, th);
      if (B.plat === 'grate') { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; for (let px = x + 4; px < x + w; px += 8) { g.beginPath(); g.moveTo(px, y + 3); g.lineTo(px, y + th - 2); g.stroke(); } }
      // railing
      g.strokeStyle = 'rgba(30,30,30,.9)'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x, y - 26); g.lineTo(x + w, y - 26); g.stroke();
      for (let px = x + 4; px < x + w; px += 36) { g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - 26); g.stroke(); }
    } else { // glass balcony
      const pg = g.createLinearGradient(0, y, 0, y + th);
      pg.addColorStop(0, '#d8d0e0'); pg.addColorStop(1, '#5a5068');
      g.fillStyle = pg; g.fillRect(x, y, w, th);
      g.fillStyle = 'rgba(160,220,255,.16)'; g.fillRect(x, y - 34, w, 34);
      g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 2; g.strokeRect(x, y - 34, w, 34);
      g.fillStyle = '#ff4fc0'; g.fillRect(x, y + th - 3, w, 3);
    }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, y, w, 2);
  },

  poster(g, p, B, r) {
    g.save(); g.translate(p.x, p.y); g.rotate(r.range(-0.06, 0.06));
    const w = 150, h = 58;
    const col = r.pick(['#e8dcc0', '#d0e4e0', '#f0d0d8', '#e8e0a0', '#c8342a']);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    g.fillStyle = col === '#c8342a' ? '#fff' : '#2a1a10';
    g.font = '900 20px Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText(p.text, 0, 1);
    // torn corner + grime
    g.fillStyle = 'rgba(40,20,10,.25)'; g.fillRect(-w / 2, h / 2 - 12, w, 12);
    g.restore();
  },

  decor(g, d, B, FY, r) {
    const x = d.x, k = d.kind;
    const dark = shade(B.wall[1], -0.45), mid = shade(B.wall[1], -0.25), hi = shade(B.wall[0], 0.08);
    g.save(); g.translate(x, FY - 14);
    const box = (bx, by, w, h, c = mid) => { const gg = g.createLinearGradient(0, by, 0, by + h); gg.addColorStop(0, shade(c, 0.12)); gg.addColorStop(1, shade(c, -0.25)); g.fillStyle = gg; g.fillRect(bx, by, w, h); };
    switch (k) {
      case 'sofa': box(-90, -70, 180, 50, '#5a2a24'); box(-100, -40, 200, 40, '#4a2018'); box(-100, -78, 26, 78, '#3e1a14'); box(74, -78, 26, 78, '#3e1a14'); break;
      case 'tv': box(-40, -60, 80, 60, dark); box(-50, -140, 100, 70, '#111'); g.fillStyle = 'rgba(120,160,200,.15)'; g.fillRect(-44, -134, 88, 58); break;
      case 'shelf': box(-60, -230, 120, 230, '#4a3220'); for (let i = 0; i < 4; i++) { g.fillStyle = '#2a1a0e'; g.fillRect(-54, -220 + i * 56, 108, 4); for (let j = 0; j < 5; j++) { g.fillStyle = r.pick(['#8a3a2a', '#2a5a7a', '#c8a24a', '#3a6a3a']); g.fillRect(-50 + j * 20, -250 + (i + 1) * 56 - r.range(26, 40), 14, r.range(26, 40)); } } break;
      case 'fridge': box(-40, -190, 80, 190, '#b8b8b0'); g.fillStyle = '#555'; g.fillRect(28, -170, 4, 40); g.fillRect(-40, -120, 80, 3); break;
      case 'lamp': g.fillStyle = '#222'; g.fillRect(-3, -160, 6, 160); g.fillStyle = '#c8a26a'; g.beginPath(); g.moveTo(-24, -150); g.lineTo(24, -150); g.lineTo(14, -186); g.lineTo(-14, -186); g.fill(); break;
      case 'frame': g.translate(0, -r.range(240, 320)); g.fillStyle = '#5a4020'; g.fillRect(-46, -34, 92, 68); g.fillStyle = r.pick(['#3a5a6a', '#6a4a3a', '#4a6a3a']); g.fillRect(-38, -26, 76, 52); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(10, -6, 14, 0, TAU); g.fill(); break;
      case 'plant': box(-20, -46, 40, 46, '#7a4a2a'); for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#3a5a2a' : '#2a4a1e'; g.beginPath(); g.ellipse(r.range(-30, 30), -60 - r.range(0, 60), 12, 30, r.range(-1, 1), 0, TAU); g.fill(); } break;
      case 'table': box(-70, -64, 140, 10, '#5a3a20'); g.fillStyle = '#3a2614'; g.fillRect(-62, -54, 8, 54); g.fillRect(54, -54, 8, 54); break;
      case 'bed': box(-110, -56, 220, 22, '#e0e8e8'); box(-110, -34, 220, 12, '#7a8a8a'); g.fillStyle = '#9ab0b0'; g.fillRect(-110, -84, 10, 84); g.fillRect(100, -70, 10, 70); g.fillStyle = '#c8d4d4'; g.fillRect(-96, -66, 46, 12); g.fillStyle = '#6a0a0a'; g.beginPath(); g.ellipse(20, -56, 40, 6, 0, 0, TAU); g.fill(); break;
      case 'curtain': for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7ab0a8' : '#5a908a'; g.fillRect(-80 + i * 20, -330, 20, 300); } g.fillStyle = '#333'; g.fillRect(-90, -336, 180, 6); break;
      case 'iv': g.fillStyle = '#9aa'; g.fillRect(-2, -190, 4, 190); g.fillRect(-20, -4, 40, 4); g.fillStyle = 'rgba(220,240,255,.6)'; g.fillRect(-12, -186, 24, 34); g.fillStyle = 'rgba(140,0,0,.5)'; g.fillRect(-12, -168, 24, 16); break;
      case 'cabinet': box(-50, -120, 100, 120, '#c8d0d0'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-46, -116, 44, 112); g.fillRect(2, -116, 44, 112); g.fillStyle = '#c8342a'; g.fillRect(-10, -100, 20, 6); g.fillRect(-3, -107, 6, 20); break;
      case 'wheelchair': g.strokeStyle = '#333'; g.lineWidth = 4; g.beginPath(); g.arc(0, -26, 26, 0, TAU); g.stroke(); g.fillStyle = '#444'; g.fillRect(-20, -76, 40, 8); g.fillRect(-24, -110, 6, 60); break;
      case 'cross': g.translate(0, -300); g.fillStyle = '#c8342a'; g.fillRect(-12, -36, 24, 72); g.fillRect(-36, -12, 72, 24); break;
      case 'shopfront': box(-130, -300, 260, 300, '#1a1620'); g.fillStyle = 'rgba(120,200,255,.12)'; g.fillRect(-120, -250, 240, 240); g.fillStyle = r.pick(['#ff4fc0', '#4fd8ff', '#ffd23a']); g.font = '900 26px Cairo'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText(r.pick(['أزياء', 'موبايلات', 'أحذية', 'هدايا', 'عطور']), 0, -268); break;
      case 'mannequin': g.fillStyle = '#d8d0c8'; g.beginPath(); g.arc(0, -168, 12, 0, TAU); g.fill(); g.fillRect(-14, -154, 28, 70); g.fillRect(-10, -84, 8, 84); g.fillRect(2, -84, 8, 84); g.fillStyle = r.pick(['#8a2a4a', '#2a4a8a', '#4a8a5a']); g.fillRect(-16, -150, 32, 50); break;
      case 'rack': g.fillStyle = '#555'; g.fillRect(-70, -150, 140, 4); g.fillRect(-70, -150, 4, 150); g.fillRect(66, -150, 4, 150); for (let i = 0; i < 7; i++) { g.fillStyle = r.pick(['#8a2a4a', '#2a4a8a', '#c8a24a', '#4a8a5a', '#eee']); g.fillRect(-62 + i * 18, -146, 15, r.range(60, 90)); } break;
      case 'bench': box(-70, -40, 140, 10, '#6a5a4a'); g.fillStyle = '#333'; g.fillRect(-60, -30, 6, 30); g.fillRect(54, -30, 6, 30); break;
      case 'neon': g.translate(0, -340); g.strokeStyle = r.pick(['#ff4fc0', '#4fd8ff']); g.lineWidth = 4; g.shadowColor = g.strokeStyle; g.shadowBlur = 16; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.shadowBlur = 0; break;
      case 'pipes': g.strokeStyle = '#4a4a3a'; g.lineWidth = 18; g.beginPath(); g.moveTo(-200, -420); g.lineTo(-200, -260); g.lineTo(120, -260); g.lineTo(120, 0); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-205, -420); g.lineTo(-205, -265); g.stroke(); g.fillStyle = '#2a2a22'; g.fillRect(-212, -300, 24, 10); g.fillRect(110, -150, 20, 10); break;
      case 'tank': box(-80, -240, 160, 240, '#5a6a5a'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-80, -180, 160, 8); g.fillRect(-80, -100, 160, 8); g.fillStyle = '#d8a81a'; g.fillRect(-40, -150, 80, 30); g.fillStyle = '#111'; g.font = '900 16px Cairo'; g.textAlign = 'center'; g.fillText('☣', 0, -129); break;
      case 'machine': box(-110, -160, 220, 160, '#3a4a5a'); g.fillStyle = '#1a1a1a'; g.fillRect(-90, -140, 80, 50); g.fillStyle = '#5fe07a'; g.fillRect(-84, -134, 20, 6); g.fillStyle = '#c8342a'; g.beginPath(); g.arc(40, -110, 10, 0, TAU); g.fill(); g.fillStyle = '#555'; g.beginPath(); g.arc(60, -60, 30, 0, TAU); g.fill(); break;
      case 'barrels': for (let i = 0; i < 3; i++) { box(-60 + i * 40, -64, 36, 64, i === 1 ? '#3a6a3a' : '#8a3a1a'); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-60 + i * 40, -48, 36, 3); } break;
      case 'hazard': g.translate(0, -260); g.fillStyle = '#d8a81a'; g.beginPath(); g.moveTo(0, -40); g.lineTo(40, 30); g.lineTo(-40, 30); g.closePath(); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 4; g.stroke(); g.fillStyle = '#111'; g.font = '900 34px sans-serif'; g.textAlign = 'center'; g.fillText('!', 0, 22); break;
      case 'chain': g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; for (let y = -560; y < -200; y += 14) { g.beginPath(); g.ellipse(0, y, 5, 8, 0, 0, TAU); g.stroke(); } g.fillStyle = '#3a3a3a'; g.beginPath(); g.moveTo(-6, -200); g.quadraticCurveTo(-10, -170, 10, -170); g.lineTo(6, -180); g.fill(); break;
      case 'crates': for (const [cx, cy] of [[-50, -50], [0, -50], [-25, -100]]) { box(cx - 25, cy, 50, 50, '#7a5a34'); g.strokeStyle = '#3a2614'; g.lineWidth = 2; g.strokeRect(cx - 25, cy, 50, 50); g.beginPath(); g.moveTo(cx - 25, cy); g.lineTo(cx + 25, cy + 50); g.stroke(); } break;
    }
    g.restore();
  },

  // ===== dynamic things =====
  door(g, x, FY, open, num, isExit, t, boss) {
    const w = 96, h = 170;
    g.save(); g.translate(x, FY);
    // frame
    g.fillStyle = '#1a1410'; g.fillRect(-w / 2 - 12, -h - 12, w + 24, h + 12);
    // inside darkness / glow
    if (open) {
      const ig = g.createLinearGradient(0, -h, 0, 0);
      ig.addColorStop(0, isExit ? 'rgba(255,240,200,.95)' : '#000'); ig.addColorStop(1, isExit ? 'rgba(255,180,90,.9)' : '#000');
      g.fillStyle = ig; g.fillRect(-w / 2, -h, w, h);
      // door leaf swung open
      g.fillStyle = '#3a2a1e'; g.beginPath(); g.moveTo(-w / 2, -h); g.lineTo(-w / 2 + 22, -h + 10); g.lineTo(-w / 2 + 22, -8); g.lineTo(-w / 2, 0); g.fill();
    } else {
      const dg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      dg.addColorStop(0, boss ? '#5a1a14' : '#4a3a2c'); dg.addColorStop(0.5, boss ? '#7a2a1e' : '#6a5440'); dg.addColorStop(1, boss ? '#3a0e0a' : '#2e241a');
      g.fillStyle = dg; g.fillRect(-w / 2, -h, w, h);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3;
      g.strokeRect(-w / 2 + 12, -h + 14, w - 24, 60); g.strokeRect(-w / 2 + 12, -h + 90, w - 24, 66);
      g.fillStyle = '#c8a24a'; g.beginPath(); g.arc(w / 2 - 16, -h / 2, 5, 0, TAU); g.fill();
      if (boss) { g.globalAlpha = 0.85; drawIcon(g, 'skull', 0, -h + 44, 40, '#e8d8c0', 'rgba(0,0,0,.7)'); g.globalAlpha = 1; }
      // blood scratches
      g.strokeStyle = 'rgba(90,6,6,.6)'; g.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-18 + i * 10, -100); g.lineTo(-24 + i * 10, -40); g.stroke(); }
    }
    // number plate
    g.fillStyle = '#d8d0b8'; g.fillRect(-20, -h - 44, 40, 26);
    g.fillStyle = '#2a1a10'; g.font = '900 18px Cairo'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText(arNum(num), 0, -h - 30);
    // exit sign
    if (isExit) {
      const on = open ? 1 : 0.5 + 0.5 * Math.sin(t * 6);
      g.fillStyle = open ? '#1aa84a' : '#a8241a'; g.globalAlpha = 0.4 + on * 0.6;
      g.fillRect(-46, -h - 82, 92, 30);
      g.fillStyle = '#fff'; g.font = '900 17px Cairo'; g.fillText(open ? 'خروج ←' : 'مقفول', 0, -h - 67);
      g.globalAlpha = 1;
    }
    g.restore();
  },

  chest(g, x, y, open, t, rarity) {
    g.save(); g.translate(x, y);
    const col = RARITY[rarity].color;
    if (!open) {
      const gl = g.createRadialGradient(0, -20, 0, 0, -20, 90);
      gl.addColorStop(0, rgba(col, 0.45)); gl.addColorStop(1, rgba(col, 0));
      g.fillStyle = gl; g.fillRect(-90, -110, 180, 180);
    }
    const bob = open ? 0 : Math.sin(t * 3) * 2;
    g.translate(0, bob);
    const bg = g.createLinearGradient(0, -40, 0, 0);
    bg.addColorStop(0, '#7a4a22'); bg.addColorStop(1, '#3a200e');
    g.fillStyle = bg; g.fillRect(-36, -36, 72, 36);
    g.fillStyle = col; g.fillRect(-36, -36, 72, 5); g.fillRect(-6, -36, 12, 36);
    g.save(); g.translate(0, -36); if (open) g.rotate(-0.9);
    g.fillStyle = '#8a5a2a'; g.beginPath(); g.moveTo(-36, 0); g.quadraticCurveTo(0, -30, 36, 0); g.fill();
    g.fillStyle = col; g.fillRect(-6, -16, 12, 16);
    g.restore();
    g.restore();
  },

  // ===== HERO =====
  hero(g, p, t) {
    const eq = p.look;
    const f = p.face;
    const run = p.onGround && Math.abs(p.vx) > 30;
    const ph = p.anim;
    g.save();
    if (p.hurtT > 0 && Math.floor(t * 20) % 2) g.globalAlpha = 0.45;
    g.scale(f, 1);
    if (p.dashT > 0) g.rotate(0.18);
    const legSw = run ? Math.sin(ph) * 0.75 : p.onGround ? 0 : 0.5;
    const bootCol = RARITY[eq.boots ?? 0].color;
    const pants = '#2e3440';
    const leg = (a, front) => {
      g.save(); g.translate(0, -36); g.rotate(a);
      g.strokeStyle = front ? pants : shade(pants, -0.3); g.lineWidth = 10; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 17); g.stroke();
      g.translate(0, 17); g.rotate(Math.max(0, -a) * 1.2 + (p.onGround ? 0 : 0.6));
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 15); g.stroke();
      g.fillStyle = eq.boots != null ? shade(bootCol, -0.45) : '#2a1e16';
      g.beginPath(); g.roundRect(-5, 12, 15, 8, 3); g.fill();
      g.restore();
    };
    leg(-legSw, false);
    // backpack
    g.fillStyle = '#4a3a22'; g.beginPath(); g.roundRect(-20, -66, 12, 26, 4); g.fill();
    g.fillStyle = '#3a2a16'; g.fillRect(-20, -52, 12, 3);
    // torso / jacket
    const vestCol = eq.vest != null ? RARITY[eq.vest].color : '#6a5a40';
    const jg = g.createLinearGradient(-12, 0, 12, 0);
    jg.addColorStop(0, shade('#3e4a3a', 0.1)); jg.addColorStop(1, shade('#3e4a3a', -0.35));
    g.fillStyle = jg; g.beginPath(); g.roundRect(-12, -70, 24, 38, 7); g.fill();
    if (eq.vest != null) { // armor vest
      const vg = g.createLinearGradient(-12, 0, 12, 0);
      vg.addColorStop(0, shade(vestCol, -0.2)); vg.addColorStop(1, shade(vestCol, -0.6));
      g.fillStyle = vg; g.beginPath(); g.roundRect(-11, -66, 22, 26, 5); g.fill();
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-9, -56, 18, 2); g.fillRect(-9, -48, 18, 2);
    }
    g.fillStyle = '#222'; g.fillRect(-12, -38, 24, 4); // belt
    leg(legSw, true);
    // head
    g.save(); g.translate(2, -80);
    g.fillStyle = '#c8956a'; g.beginPath(); g.ellipse(0, 0, 9, 10, 0, 0, TAU); g.fill();
    g.fillStyle = '#1a1210'; g.fillRect(4, -2, 3, 3);
    g.fillStyle = '#2a1a10'; g.fillRect(-2, 6, 10, 2); // stubble
    if (eq.helmet != null) {
      const hc = RARITY[eq.helmet].color;
      const hg = g.createLinearGradient(0, -14, 0, 0); hg.addColorStop(0, shade(hc, -0.1)); hg.addColorStop(1, shade(hc, -0.55));
      g.fillStyle = hg; g.beginPath(); g.ellipse(-1, -3, 12, 9, 0, Math.PI, 0); g.fill(); g.fillRect(-14, -4, 27, 3);
    } else { g.fillStyle = '#7a2a1a'; g.beginPath(); g.ellipse(-1, -4, 10, 7, 0, Math.PI, 0); g.fill(); g.fillRect(0, -6, 13, 3); }
    g.restore();
    // arms + weapon aimed
    g.save(); g.translate(2, -62);
    let aim = p.aim; // world angle
    let la = f > 0 ? aim : Math.PI - aim;
    la = Math.atan2(Math.sin(la), Math.cos(la));
    g.rotate(clamp(la, -1.3, 1.3));
    const glove = eq.gloves != null ? shade(RARITY[eq.gloves].color, -0.4) : '#c8956a';
    g.strokeStyle = '#3e4a3a'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 2); g.stroke();
    this.weapon(g, p.weaponKind, p.recoil);
    g.fillStyle = glove; g.beginPath(); g.arc(16, 3, 4, 0, TAU); g.fill();
    g.restore();
    g.restore();
  },

  weapon(g, kind, recoil = 0) {
    g.save(); g.translate(12 - recoil * 6, 0);
    const metal = (y0, y1) => { const mg = g.createLinearGradient(0, y0, 0, y1); mg.addColorStop(0, '#6a6e72'); mg.addColorStop(1, '#1e2022'); return mg; };
    switch (kind) {
      case 'pistol': g.fillStyle = metal(-5, 3); g.fillRect(0, -5, 20, 6); g.fillStyle = '#2a2a2a'; g.fillRect(2, 0, 6, 9); break;
      case 'uzi': g.fillStyle = metal(-6, 4); g.fillRect(-2, -6, 26, 9); g.fillStyle = '#222'; g.fillRect(6, 2, 5, 14); g.fillRect(22, -3, 8, 3); break;
      case 'shotgun': g.fillStyle = '#5a3a1e'; g.fillRect(-14, -4, 14, 8); g.fillStyle = metal(-5, 3); g.fillRect(0, -5, 38, 5); g.fillStyle = '#3a2a1a'; g.fillRect(10, 0, 16, 5); break;
      case 'rifle': g.fillStyle = '#4a3a24'; g.fillRect(-16, -3, 18, 8); g.fillStyle = metal(-4, 3); g.fillRect(0, -4, 46, 5); g.fillStyle = '#111'; g.fillRect(8, -11, 18, 5); g.fillRect(4, 1, 4, 8); break;
      case 'flamer': g.fillStyle = '#b8342a'; g.beginPath(); g.roundRect(-14, -2, 14, 14, 4); g.fill(); g.fillStyle = metal(-5, 4); g.fillRect(0, -4, 32, 7); g.fillStyle = '#ffb040'; g.beginPath(); g.arc(34, -1, 2.5, 0, TAU); g.fill(); break;
      case 'launcher': g.fillStyle = metal(-8, 6); g.fillRect(-8, -7, 40, 12); g.fillStyle = '#3a4a2a'; g.fillRect(-8, -7, 40, 4); g.fillStyle = '#111'; g.beginPath(); g.arc(32, -1, 5, 0, TAU); g.fill(); break;
    }
    g.restore();
  },

  // character preview for inventory (big)
  heroPreview(c, look, kind) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    const gl = g.createRadialGradient(W / 2, H * 0.85, 10, W / 2, H * 0.85, W * 0.6);
    gl.addColorStop(0, 'rgba(255,190,110,.28)'); gl.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(W / 2, H * 0.88, 50, 9, 0, 0, TAU); g.fill();
    g.save(); g.translate(W / 2 - 6, H * 0.88); g.scale(H / 120, H / 120);
    this.hero(g, { look, face: 1, onGround: true, vx: 0, anim: 0, aim: -0.12, weaponKind: kind, recoil: 0, hurtT: 0, dashT: 0 }, 0);
    g.restore();
  },
};
