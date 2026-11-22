'use strict';
// ---------- art: vehicles, zombies, props ----------
const SHAPES = {
  sedan: {
    body: [[-0.5, 0.36], [-0.5, 0.0], [-0.47, -0.13], [-0.3, -0.16], [-0.17, -0.5], [0.12, -0.5], [0.28, -0.15], [0.47, -0.09], [0.5, 0.06], [0.5, 0.36], [0.46, 0.5], [-0.46, 0.5]],
    wins: [[[-0.27, -0.16], [-0.155, -0.43], [-0.025, -0.43], [-0.025, -0.16]], [[0.0, -0.43], [0.105, -0.43], [0.245, -0.16], [0.0, -0.16]]],
    seats: [[-0.09, -0.24]], driver: [0.07, -0.24], roof: [-0.02, -0.5], lamp: [0.49, -0.02], tail: [-0.495, -0.05], exhaust: [-0.5, 0.4],
  },
  pickup: {
    body: [[-0.5, 0.4], [-0.5, -0.14], [-0.47, -0.16], [-0.1, -0.16], [-0.07, -0.56], [0.17, -0.56], [0.31, -0.15], [0.48, -0.09], [0.5, 0.08], [0.5, 0.4], [0.45, 0.5], [-0.45, 0.5]],
    wins: [[[-0.035, -0.48], [0.15, -0.48], [0.265, -0.17], [-0.035, -0.17]]],
    seats: [[-0.32, -0.3], [-0.2, -0.3]], driver: [0.08, -0.25], roof: [0.05, -0.56], lamp: [0.49, -0.02], tail: [-0.495, -0.1], exhaust: [-0.5, 0.42], bed: true,
  },
  jeep: {
    body: [[-0.5, 0.4], [-0.5, -0.2], [-0.42, -0.25], [-0.29, -0.25], [-0.27, -0.6], [0.09, -0.6], [0.2, -0.21], [0.48, -0.15], [0.5, 0.0], [0.5, 0.4], [0.44, 0.5], [-0.44, 0.5]],
    wins: [[[-0.235, -0.53], [-0.07, -0.53], [-0.07, -0.27], [-0.235, -0.27]], [[-0.04, -0.53], [0.07, -0.53], [0.16, -0.25], [-0.04, -0.25]]],
    seats: [[-0.16, -0.33], [-0.3, -0.45]], driver: [0.04, -0.33], roof: [-0.09, -0.6], lamp: [0.49, -0.06], tail: [-0.495, -0.12], exhaust: [-0.5, 0.42], spare: true,
  },
  bus: {
    body: [[-0.5, 0.42], [-0.5, -0.43], [-0.46, -0.5], [0.34, -0.5], [0.46, -0.18], [0.5, 0.02], [0.5, 0.42], [0.45, 0.5], [-0.45, 0.5]],
    wins: [[[-0.44, -0.4], [-0.29, -0.4], [-0.29, -0.12], [-0.44, -0.12]], [[-0.25, -0.4], [-0.1, -0.4], [-0.1, -0.12], [-0.25, -0.12]], [[-0.06, -0.4], [0.09, -0.4], [0.09, -0.12], [-0.06, -0.12]], [[0.13, -0.4], [0.33, -0.4], [0.42, -0.14], [0.13, -0.14]]],
    seats: [[-0.36, -0.2], [-0.17, -0.2], [0.02, -0.2]], driver: [0.24, -0.2], roof: [-0.05, -0.5], lamp: [0.49, -0.01], tail: [-0.495, -0.2], exhaust: [-0.5, 0.44],
  },
};

const ART = {
  pathPoly(g, pts, L, H) {
    g.beginPath();
    pts.forEach(([u, v], i) => i ? g.lineTo(u * L, v * H) : g.moveTo(u * L, v * H));
    g.closePath();
  },

  // ===== WHEEL =====
  wheel(g, r, rot, jeep) {
    g.save();
    g.rotate(rot);
    // tire
    g.fillStyle = '#151515'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    // tread
    g.strokeStyle = '#2a2a2a'; g.lineWidth = r * 0.14;
    const n = jeep ? 12 : 16;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU;
      g.beginPath(); g.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); g.lineTo(Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99); g.stroke();
    }
    // sidewall highlight
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.75, -2.6, -1.2); g.stroke();
    // rim
    const rr = r * 0.56;
    const rg = g.createRadialGradient(-rr * 0.3, -rr * 0.3, 1, 0, 0, rr);
    rg.addColorStop(0, '#e6e6e6'); rg.addColorStop(0.6, '#8d8d8d'); rg.addColorStop(1, '#4d4d4d');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill();
    g.fillStyle = '#3a3a3a';
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU;
      g.beginPath(); g.ellipse(Math.cos(a) * rr * 0.55, Math.sin(a) * rr * 0.55, rr * 0.22, rr * 0.14, a, 0, TAU); g.fill();
    }
    g.fillStyle = '#bdbdbd'; g.beginPath(); g.arc(0, 0, rr * 0.25, 0, TAU); g.fill();
    g.fillStyle = '#555'; g.beginPath(); g.arc(0, 0, rr * 0.1, 0, TAU); g.fill();
    g.restore();
  },

  // ===== CAR =====
  // car: {def, lv (upgrade levels), wheelRot, wheelPos (local), gunAngle, splats, survivors, boosting, damage(0..1), t}
  car(g, c) {
    const d = c.def, S = SHAPES[d.style], L = d.len, H = d.h;
    // wheel wells & suspension struts
    g.fillStyle = '#0c0c0c';
    for (const wp of c.wheelPos) { g.beginPath(); g.arc(wp[0], wp[1] - 2, d.wheelR + 5, Math.PI, 0); g.fill(); }
    g.strokeStyle = '#3d3d3d'; g.lineWidth = 6;
    for (const wp of c.wheelPos) { g.beginPath(); g.moveTo(wp[0], H * 0.3); g.lineTo(wp[0], wp[1]); g.stroke(); }
    g.strokeStyle = '#777'; g.lineWidth = 2;
    for (const wp of c.wheelPos) {
      g.beginPath();
      const top = H * 0.32, bot = wp[1] - 6, coils = 5;
      for (let k = 0; k <= coils * 2; k++) g.lineTo(wp[0] + (k % 2 ? 5 : -5), lerp(top, bot, k / (coils * 2)));
      g.stroke();
    }

    // ram (behind body front so plate overlaps nicely)
    if (c.lv.ram > 0 || c.saw) this.ram(g, c, L, H);
    // nitro tanks
    if (c.lv.nitro > 0) this.nitroTanks(g, c, L, H);
    if (S.spare) {
      g.save(); g.translate(-L * 0.53, -H * 0.05); this.wheel(g, d.wheelR * 0.9, 0, true); g.restore();
    }

    // ---- body ----
    g.save();
    this.pathPoly(g, S.body, L, H);
    const pg = g.createLinearGradient(0, -H * 0.6, 0, H * 0.5);
    pg.addColorStop(0, shade(d.color, 0.35)); pg.addColorStop(0.35, d.color); pg.addColorStop(0.62, shade(d.color, -0.12)); pg.addColorStop(1, shade(d.color, -0.5));
    g.fillStyle = pg; g.fill();
    g.clip();
    // bus stripe / accents
    if (d.style === 'bus') { g.fillStyle = d.accent; g.fillRect(-L / 2, H * 0.02, L, H * 0.1); g.fillStyle = shade(d.accent, -0.3); g.fillRect(-L / 2, H * 0.12, L, H * 0.03); }
    if (d.style === 'jeep') { // camo blotches
      const r = RNG(7);
      for (let k = 0; k < 18; k++) { g.fillStyle = rgba(k % 2 ? '#3e4626' : '#7a7448', 0.55); g.beginPath(); g.ellipse(r.range(-L / 2, L / 2), r.range(-H / 2, H / 2), r.range(8, 22), r.range(5, 12), r.range(0, 3), 0, TAU); g.fill(); }
    }
    if (d.style === 'sedan') { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-L / 2, H * 0.04, L, 2); }
    // dirt/rust gradient at bottom
    const dg = g.createLinearGradient(0, H * 0.1, 0, H * 0.5);
    dg.addColorStop(0, 'rgba(70,50,30,0)'); dg.addColorStop(1, 'rgba(70,50,30,0.55)');
    g.fillStyle = dg; g.fillRect(-L / 2, 0, L, H);
    // rust spots
    const rr = RNG(d.len);
    for (let k = 0; k < 9; k++) { g.fillStyle = rgba('#5a2e14', rr.range(0.15, 0.4)); g.beginPath(); g.ellipse(rr.range(-L / 2, L / 2), rr.range(-H * 0.1, H * 0.45), rr.range(3, 9), rr.range(2, 5), 0, 0, TAU); g.fill(); }
    // damage scratches
    if (c.damage > 0.1) {
      const dr = RNG(99);
      g.strokeStyle = 'rgba(30,25,20,0.6)'; g.lineWidth = 1.5;
      const n = Math.floor(c.damage * 14);
      for (let k = 0; k < n; k++) { const x = dr.range(-L / 2, L / 2), y = dr.range(-H / 2, H / 2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + dr.range(-14, 14), y + dr.range(-6, 6)); g.stroke(); }
      g.fillStyle = `rgba(20,15,10,${c.damage * 0.25})`; g.fillRect(-L / 2, -H / 2, L, H);
    }
    // blood splats on car
    for (const s of c.splats) {
      g.fillStyle = rgba('#6e0a0a', s.a);
      g.beginPath(); g.ellipse(s.x, s.y, s.r, s.r * 0.7, s.rot, 0, TAU); g.fill();
      g.fillStyle = rgba('#4a0606', s.a * 0.8);
      g.fillRect(s.x - 1.5, s.y, 3, s.drip);
    }
    // top highlight line
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; this.pathPoly(g, S.body, L, H); g.stroke();

    // pickup bed
    if (S.bed) {
      g.fillStyle = shade(d.color, -0.45); g.fillRect(-L * 0.48, -H * 0.16, L * 0.36, 5);
    }
    // door lines
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-0.03 * L, -H * 0.15); g.lineTo(-0.03 * L, H * 0.38); g.stroke();
    if (d.style !== 'pickup') { g.beginPath(); g.moveTo(-0.28 * L, -H * 0.14); g.lineTo(-0.28 * L, H * 0.3); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-0.0 * L, -H * 0.04, 9, 3); g.fillRect(-0.24 * L, -H * 0.04, 9, 3);

    // windows with occupants
    for (let wi = 0; wi < S.wins.length; wi++) {
      g.save();
      this.pathPoly(g, S.wins[wi], L, H); g.clip();
      const wg = g.createLinearGradient(0, -H * 0.5, 0, -H * 0.1);
      wg.addColorStop(0, '#2a3540'); wg.addColorStop(1, '#10161c');
      g.fillStyle = wg; g.fillRect(-L / 2, -H, L, H * 1.2);
      // driver + survivors
      this.head(g, S.driver[0] * L, S.driver[1] * H, H * 0.17, '#c89870', 'driver', c.t);
      c.survivors.forEach((sv, i) => {
        const p = S.seats[i]; if (!p) return;
        this.head(g, p[0] * L, p[1] * H, H * 0.16, '#d0a37a', sv.hat, c.t + i, sv.color);
      });
      // reflection
      g.fillStyle = 'rgba(255,255,255,0.13)';
      g.beginPath(); g.moveTo(-L / 2, -H * 0.1); g.lineTo(-L / 2 + 30, -H); g.lineTo(-L / 2 + 50, -H); g.lineTo(-L / 2 + 20, -H * 0.1); g.fill();
      g.beginPath(); g.moveTo(-L * 0.1, -H * 0.1); g.lineTo(L * 0.05, -H); g.lineTo(L * 0.1, -H); g.lineTo(-L * 0.05, -H * 0.1); g.fill();
      g.restore();
      // armor grate over windows
      if (c.lv.armor >= 2) {
        g.save(); this.pathPoly(g, S.wins[wi], L, H); g.clip();
        g.strokeStyle = '#2b2b2b'; g.lineWidth = 2.2;
        for (let x = -L / 2; x < L / 2; x += 8) { g.beginPath(); g.moveTo(x, -H); g.lineTo(x, 0); g.stroke(); }
        g.restore();
      }
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5; this.pathPoly(g, S.wins[wi], L, H); g.stroke();
    }

    // armor plates
    if (c.lv.armor >= 1) this.armorPlates(g, c, L, H);

    // lights
    g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(S.lamp[0] * L - 3, S.lamp[1] * H, 4, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#c21b1b'; g.fillRect(S.tail[0] * L, S.tail[1] * H - 4, 4, 10);
    // bumpers
    g.fillStyle = '#2b2b2b';
    g.fillRect(L * 0.46, H * 0.28, L * 0.06, H * 0.14);
    g.fillRect(-L * 0.52, H * 0.28, L * 0.06, H * 0.14);

    // roof gun
    if (c.lv.gun > 0) this.turret(g, c, S.roof[0] * L, S.roof[1] * H);
    // rockets pod
    if (c.rockets > 0) {
      g.fillStyle = '#3c4030'; g.fillRect(S.roof[0] * L - 44, S.roof[1] * H - 12, 26, 12);
      g.fillStyle = '#c0392b'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(S.roof[0] * L - 18, S.roof[1] * H - 9 + k * 3.5, 1.6, 0, TAU); g.fill(); }
    }
    // shock coil
    if (c.shock > 0) {
      g.strokeStyle = '#7fd6ff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-L * 0.38, -H * 0.15); g.lineTo(-L * 0.38, -H * 0.15 - 24); g.stroke();
      g.fillStyle = '#bff0ff'; g.beginPath(); g.arc(-L * 0.38, -H * 0.15 - 26, 4 + Math.sin(c.t * 20) * 1, 0, TAU); g.fill();
    }

    // wheels (on top)
    for (const wp of c.wheelPos) { g.save(); g.translate(wp[0], wp[1]); this.wheel(g, d.wheelR, c.wheelRot, d.style === 'jeep'); g.restore(); }
  },

  head(g, x, y, r, skin, hat, t, color) {
    g.save(); g.translate(x, y + Math.sin(t * 9) * 0.6);
    g.fillStyle = color || '#3d3d3d'; g.fillRect(-r * 1.1, r * 0.8, r * 2.2, r * 2); // shoulders
    g.fillStyle = skin; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.fillRect(r * 0.35, -r * 0.2, r * 0.25, r * 0.25);
    if (hat === 'cap' || hat === 'driver') { g.fillStyle = hat === 'cap' ? '#2d4f86' : '#3a3a3a'; g.fillRect(-r, -r * 1.05, r * 2, r * 0.6); g.fillRect(0, -r * 0.6, r * 1.4, r * 0.22); }
    if (hat === 'hair' || hat === 'hair2') { g.fillStyle = hat === 'hair' ? '#1e1410' : '#5a2d1a'; g.beginPath(); g.arc(-r * 0.2, -r * 0.2, r * 1.05, Math.PI * 0.8, Math.PI * 2.05); g.fill(); g.fillRect(-r * 1.2, -r * 0.2, r * 0.7, r * 1.6); }
    if (hat === 'beanie') { g.fillStyle = '#b83a2a'; g.beginPath(); g.arc(0, -r * 0.2, r * 1.02, Math.PI, 0); g.fill(); }
    if (hat === 'mustache') { g.fillStyle = '#ddd'; g.fillRect(-r, -r * 0.9, r * 2, r * 0.4); g.fillStyle = '#222'; g.fillRect(r * 0.1, r * 0.3, r * 0.8, r * 0.18); }
    g.restore();
  },

  armorPlates(g, c, L, H) {
    const lv = c.lv.armor;
    const pg = g.createLinearGradient(0, 0, 0, H * 0.4);
    pg.addColorStop(0, '#8c8f92'); pg.addColorStop(1, '#4a4d50');
    g.fillStyle = pg; g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.5;
    const plates = Math.min(lv + 1, 5);
    for (let k = 0; k < plates; k++) {
      const x = -L * 0.44 + k * L * 0.18, y = H * 0.06, w = L * 0.16, h = H * 0.26;
      g.beginPath(); g.rect(x, y, w, h); g.fill(); g.stroke();
      g.fillStyle = '#c9c9c9';
      for (const [rx, ry] of [[4, 4], [w - 4, 4], [4, h - 4], [w - 4, h - 4]]) { g.beginPath(); g.arc(x + rx, y + ry, 1.6, 0, TAU); g.fill(); }
      g.fillStyle = pg;
    }
    if (lv >= 4) { // roof cage
      g.strokeStyle = '#333'; g.lineWidth = 3;
      const S = SHAPES[c.def.style];
      g.beginPath(); g.moveTo(-L * 0.3, S.roof[1] * H); g.lineTo(-L * 0.25, S.roof[1] * H - 8); g.lineTo(L * 0.15, S.roof[1] * H - 8); g.lineTo(L * 0.2, S.roof[1] * H); g.stroke();
    }
  },

  ram(g, c, L, H) {
    const lv = Math.max(1, c.lv.ram);
    g.save(); g.translate(L * 0.5, H * 0.15);
    // plow frame
    const fg = g.createLinearGradient(0, -H * 0.4, 0, H * 0.4);
    fg.addColorStop(0, '#a5a8aa'); fg.addColorStop(1, '#505355');
    g.fillStyle = fg; g.strokeStyle = '#222'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-6, -H * 0.42); g.lineTo(10 + lv * 2, -H * 0.3); g.lineTo(16 + lv * 3, H * 0.32); g.lineTo(-6, H * 0.36); g.closePath(); g.fill(); g.stroke();
    // spikes
    g.fillStyle = '#d8dadc';
    const n = 2 + lv;
    for (let k = 0; k < n; k++) {
      const y = lerp(-H * 0.32, H * 0.28, k / (n - 1));
      const bx = lerp(10 + lv * 2, 16 + lv * 3, (k / (n - 1)));
      g.beginPath(); g.moveTo(bx, y - 5); g.lineTo(bx + 12 + lv * 3, y); g.lineTo(bx, y + 5); g.fill();
    }
    if (c.saw) {
      g.save(); g.translate(26 + lv * 3, H * 0.15); g.rotate(c.t * 30);
      g.fillStyle = '#c8c8c8'; g.beginPath();
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; g.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); g.lineTo(Math.cos(a + 0.2) * 20, Math.sin(a + 0.2) * 20); }
      g.fill(); g.fillStyle = '#666'; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  },

  nitroTanks(g, c, L, H) {
    g.save(); g.translate(-L * 0.5, H * 0.05);
    g.fillStyle = '#2a5ea8'; g.strokeStyle = '#122'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(-18, -10, 22, 18, 5); g.fill(); g.stroke();
    g.fillStyle = '#cfd8e6'; g.fillRect(-14, -6, 14, 3);
    g.fillStyle = '#444'; g.fillRect(-26, -2, 10, 6);
    if (c.boosting) {
      const fl = 30 + Math.random() * 30;
      const gr = g.createLinearGradient(-26, 0, -26 - fl, 0);
      gr.addColorStop(0, 'rgba(220,240,255,1)'); gr.addColorStop(0.3, 'rgba(90,160,255,0.9)'); gr.addColorStop(1, 'rgba(60,80,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-26, -6); g.lineTo(-26 - fl, 1); g.lineTo(-26, 8); g.fill();
    }
    g.restore();
  },

  turret(g, c, x, y) {
    const lv = c.lv.gun;
    g.save(); g.translate(x, y);
    g.fillStyle = '#2f2f2f'; g.fillRect(-12, -6, 24, 6);
    g.fillStyle = '#444'; g.fillRect(-3, -14, 6, 9);
    g.translate(0, -14);
    g.rotate(c.gunAngle);
    // body
    const bg = g.createLinearGradient(0, -8, 0, 8);
    bg.addColorStop(0, '#6a6a6a'); bg.addColorStop(1, '#2a2a2a');
    g.fillStyle = bg; g.beginPath(); g.roundRect(-14, -7, 28, 13, 3); g.fill();
    // barrel(s)
    g.fillStyle = '#1e1e1e';
    const barrels = lv >= 4 ? 2 : 1;
    for (let b = 0; b < barrels; b++) g.fillRect(12, -4 + b * 5 - (barrels - 1) * 2.5, 22 + lv * 4, 3.5);
    g.fillStyle = '#555'; g.fillRect(12, -6, 6, 10);
    // shield
    if (lv >= 3) { g.fillStyle = '#5a5e52'; g.fillRect(8, -14, 4, 18); }
    // ammo belt
    g.fillStyle = '#b8902a'; g.fillRect(-10, 5, 10, 3);
    if (c.muzzle > 0) {
      const ml = 22 + Math.random() * 14;
      g.translate(36 + lv * 4, 0);
      const mg = g.createRadialGradient(0, 0, 0, 0, 0, ml);
      mg.addColorStop(0, 'rgba(255,255,220,1)'); mg.addColorStop(0.3, 'rgba(255,200,80,0.8)'); mg.addColorStop(1, 'rgba(255,120,0,0)');
      g.fillStyle = mg; g.beginPath(); g.moveTo(0, -8); g.lineTo(ml, 0); g.lineTo(0, 8); g.lineTo(ml * 0.3, 0); g.fill();
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
    }
    g.restore();
  },

  // ===== ZOMBIES =====
  zombie(g, z, night) {
    const def = ZOMBIES[z.type], s = z.scale;
    const ph = z.phase;
    const step = Math.sin(ph), step2 = Math.sin(ph + Math.PI);
    g.save();
    const K = z.type === 'brute' ? 2.25 : 1;
    g.scale(z.dir * s * K, s * K);
    const skin = z.skin, shirt = z.shirt, pants = z.pants;
    const big = z.type === 'fat' ? 1.5 : z.type === 'brute' ? 1.45 : 1;
    const lean = z.type === 'runner' ? 0.35 : z.type === 'clinger' ? 0.6 : z.type === 'brute' ? 0.22 : 0.12;
    const H = def.h / K;
    const legL = H * 0.42, torsoL = H * 0.34;
    const hipY = -legL;
    // back leg
    this.limb(g, 0, hipY, step2 * 0.5, legL, 8 * big, shade(pants, -0.25), 0.2);
    // back arm
    g.save(); g.translate(0, hipY); g.rotate(-lean);
    const shY = -torsoL * 0.9;
    const reach = z.type === 'clinger' ? -1.9 : z.attack > 0 ? -1.9 - Math.sin(z.t * 20) * 0.4 : -1.4 + Math.sin(ph * 0.5) * 0.15;
    this.limb(g, 0, shY, reach + 0.15, H * 0.3, 6 * big, shade(skin, -0.25), 0.4);
    // torso
    const tw = z.type === 'fat' ? 24 : z.type === 'brute' ? 21 : 12;
    const tg = g.createLinearGradient(-tw, 0, tw, 0);
    tg.addColorStop(0, shade(shirt, 0.15)); tg.addColorStop(1, shade(shirt, -0.3));
    g.fillStyle = tg;
    g.beginPath(); g.roundRect(-tw, -torsoL, tw * 2, torsoL + 6, tw * 0.6); g.fill();
    // torn shirt / ribs
    g.fillStyle = rgba(skin, 0.9); g.beginPath(); g.ellipse(-tw * 0.2, -torsoL * 0.35, tw * 0.45, torsoL * 0.16, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(110,10,10,0.7)'; g.beginPath(); g.ellipse(tw * 0.3, -torsoL * 0.6, tw * 0.25, 5, 0, 0, TAU); g.fill();
    if (z.type === 'boomer') {
      const pulse = 0.6 + Math.sin(z.t * 8) * 0.3;
      g.fillStyle = `rgba(255,${120 + pulse * 60},40,${0.5 + pulse * 0.3})`;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(-tw * 0.4 + k * 6, -torsoL * 0.4 + (k % 2) * 8, 4 + pulse * 2, 0, TAU); g.fill(); }
    }
    if (z.type === 'spitter') { g.fillStyle = '#9ad03a'; g.beginPath(); g.ellipse(tw * 0.4, -torsoL * 0.95, 9, 7, 0, 0, TAU); g.fill(); }
    if (z.type === 'brute') { // armor scrap plates & belly
      g.fillStyle = '#5a5248'; g.fillRect(-tw, -torsoL * 0.9, tw * 2, 10);
      g.strokeStyle = '#2a2622'; g.lineWidth = 2; g.strokeRect(-tw * 0.8, -torsoL * 0.6, tw * 1.2, torsoL * 0.35);
    }
    // head
    const hr = (z.type === 'brute' ? 8.5 : 10) * (z.type === 'fat' ? 1.1 : 1);
    const hx = tw * 0.25 + 2, hy = -torsoL - hr * 0.7;
    g.save(); g.translate(hx, hy); g.rotate(Math.sin(z.t * 2.3 + z.seed) * 0.15 + 0.15);
    const hg = g.createRadialGradient(-3, -4, 1, 0, 0, hr * 1.2);
    hg.addColorStop(0, shade(skin, 0.15)); hg.addColorStop(1, shade(skin, -0.25));
    g.fillStyle = hg; g.beginPath(); g.ellipse(0, 0, hr, hr * 1.12, 0, 0, TAU); g.fill();
    // hair tufts
    if (z.hair) { g.fillStyle = z.hair; g.beginPath(); g.arc(-2, -hr * 0.3, hr * 0.95, Math.PI * 1.05, Math.PI * 1.9); g.fill(); }
    // eye & jaw
    const glow = night || z.type === 'brute';
    g.fillStyle = '#1a0a0a'; g.beginPath(); g.ellipse(hr * 0.45, -hr * 0.15, hr * 0.28, hr * 0.22, 0, 0, TAU); g.fill();
    g.fillStyle = glow ? '#ffdf5a' : '#d8d0a0'; g.beginPath(); g.arc(hr * 0.5, -hr * 0.15, hr * 0.11, 0, TAU); g.fill();
    g.fillStyle = '#3a0a0a'; g.beginPath(); g.ellipse(hr * 0.55, hr * 0.5, hr * 0.32, hr * (0.15 + (z.attack > 0 ? 0.15 : 0.05) + Math.max(0, Math.sin(z.t * 5)) * 0.08), 0, 0, TAU); g.fill();
    g.fillStyle = '#d8d0b0'; g.fillRect(hr * 0.35, hr * 0.38, 3, 3); g.fillRect(hr * 0.6, hr * 0.38, 3, 3);
    g.restore();
    // front arm
    this.limb(g, 0, shY, reach - 0.1 + Math.sin(ph * 0.5 + 1) * 0.1, H * 0.31, 6.5 * big, skin, 0.5, true);
    g.restore();
    // front leg
    this.limb(g, 0, hipY, step * 0.5, legL, 8.5 * big, pants, 0.2);
    // hit flash
    g.restore();
  },

  // limb: two segments
  limb(g, x, y, a, len, w, col, bend, hand) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = w;
    const l1 = len * 0.5;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, l1);
    g.translate(0, l1); g.rotate(bend * (hand ? -1 : 1) * (a < 0 ? -0.5 : 0.6));
    g.lineTo(0, 0); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len * 0.5); g.stroke();
    if (hand) { g.fillStyle = col; g.beginPath(); g.arc(0, len * 0.5 + 2, w * 0.6, 0, TAU); g.fill(); }
    g.restore();
  },

  gib(g, p) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.a);
    if (p.part === 'head') {
      g.fillStyle = p.col; g.beginPath(); g.ellipse(0, 0, p.size, p.size * 1.1, 0, 0, TAU); g.fill();
      g.fillStyle = '#1a0a0a'; g.beginPath(); g.arc(p.size * 0.45, -p.size * 0.1, p.size * 0.25, 0, TAU); g.fill();
      g.fillStyle = '#7a0d0d'; g.beginPath(); g.arc(0, p.size, p.size * 0.5, 0, Math.PI); g.fill();
    } else if (p.part === 'torso') {
      g.fillStyle = p.col; g.beginPath(); g.roundRect(-p.size, -p.size * 1.3, p.size * 2, p.size * 2.6, p.size * 0.5); g.fill();
      g.fillStyle = '#7a0d0d'; g.fillRect(-p.size, -p.size * 1.4, p.size * 2, 4);
    } else if (p.part === 'chunk') {
      g.fillStyle = p.col; g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.7, 0, 0, TAU); g.fill();
    } else { // limb
      g.strokeStyle = p.col; g.lineWidth = p.size * 0.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -p.size); g.lineTo(0, p.size); g.stroke();
      g.fillStyle = '#7a0d0d'; g.beginPath(); g.arc(0, -p.size, p.size * 0.28, 0, TAU); g.fill();
    }
    g.restore();
  },

  // ===== OBSTACLES =====
  obstacle(g, o) {
    g.save(); g.translate(o.x, o.y); g.rotate(o.a);
    const w = o.w, h = o.h;
    if (o.type === 'crate') {
      const cg = g.createLinearGradient(0, -h / 2, 0, h / 2);
      cg.addColorStop(0, '#b78a52'); cg.addColorStop(1, '#7a5530');
      g.fillStyle = cg; g.fillRect(-w / 2, -h / 2, w, h);
      g.strokeStyle = '#4a321a'; g.lineWidth = 3; g.strokeRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3);
      g.beginPath(); g.moveTo(-w / 2 + 3, -h / 2 + 3); g.lineTo(w / 2 - 3, h / 2 - 3); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
      for (let y = -h / 2 + 11; y < h / 2; y += 11) { g.beginPath(); g.moveTo(-w / 2, y); g.lineTo(w / 2, y); g.stroke(); }
    } else if (o.type === 'barrel') {
      const bg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      bg.addColorStop(0, '#7a1a12'); bg.addColorStop(0.35, '#d23a22'); bg.addColorStop(1, '#5a120c');
      g.fillStyle = bg; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 4); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-w / 2, -h / 2 + 10, w, 3); g.fillRect(-w / 2, h / 2 - 13, w, 3);
      g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(0, -8); g.lineTo(8, 6); g.lineTo(-8, 6); g.closePath(); g.fill();
      g.fillStyle = '#222'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('!', 0, 5);
    } else if (o.type === 'barricade') {
      g.fillStyle = '#5a4a3a'; g.fillRect(-w / 2, -h / 2, w, h);
      for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#e8e0d0' : '#c8362a'; g.fillRect(-w / 2, -h / 2 + k * h / 4, w, h / 4); }
      g.strokeStyle = '#222'; g.lineWidth = 1.5; g.strokeRect(-w / 2, -h / 2, w, h);
    } else if (o.type === 'tires') {
      for (let k = 0; k < 2; k++) {
        g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(0, -h / 4 + k * h / 2, w / 2, h / 4, 0, 0, TAU); g.fill();
        g.fillStyle = '#333'; g.beginPath(); g.ellipse(0, -h / 4 + k * h / 2, w / 4, h / 10, 0, 0, TAU); g.fill();
      }
    }
    g.restore();
  },

  // ===== RAMPS (drawn over terrain) =====
  ramp(g, rp, world) {
    const x0 = rp.x, x1 = rp.lipX;
    const baseY = world.groundY(x0);
    if (rp.kind === 'planks' || rp.kind === 'sand') {
      // wooden planks resting on crates
      g.fillStyle = '#6a4a2a';
      for (let x = x0 + 40; x < x1; x += 60) {
        const top = world.groundY(x);
        g.fillRect(x - 3, top, 6, baseY - top + 20);
      }
      g.strokeStyle = '#a5794a'; g.lineWidth = 9; g.lineCap = 'butt';
      g.beginPath(); for (let x = x0; x <= x1; x += 16) g.lineTo(x, world.groundY(x) + 3); g.stroke();
      g.strokeStyle = '#4a321a'; g.lineWidth = 2;
      for (let x = x0 + 30; x < x1; x += 30) { const y = world.groundY(x) + 3; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke(); }
      // crate under lip
      const ly = world.groundY(x1);
      g.fillStyle = '#8a6238'; g.fillRect(x1 - 50, ly + 8, 48, baseY - ly + 30);
      g.strokeStyle = '#4a321a'; g.lineWidth = 3; g.strokeRect(x1 - 50, ly + 8, 48, baseY - ly + 30);
    } else if (rp.kind === 'wreck' || rp.kind === 'container') {
      const ly = world.groundY(x1);
      if (rp.kind === 'container') {
        g.fillStyle = '#7a3a26'; g.fillRect(x1 - 160, ly + 6, 160, baseY - ly + 40);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3;
        for (let x = x1 - 150; x < x1; x += 12) { g.beginPath(); g.moveTo(x, ly + 8); g.lineTo(x, baseY + 40); g.stroke(); }
      } else {
        // crushed car under the ramp
        g.save(); g.translate(x1 - 90, ly + 22); g.rotate(0.15);
        g.fillStyle = '#556070'; g.beginPath(); g.roundRect(-80, -18, 160, 40, 10); g.fill();
        g.fillStyle = '#222b33'; g.fillRect(-40, -14, 70, 14);
        g.fillStyle = '#111'; g.beginPath(); g.arc(-50, 24, 16, 0, TAU); g.arc(50, 24, 16, 0, TAU); g.fill();
        g.restore();
      }
      // metal sheet ramp
      g.strokeStyle = '#8f969c'; g.lineWidth = 7;
      g.beginPath(); for (let x = x0; x <= x1; x += 16) g.lineTo(x, world.groundY(x) + 2); g.stroke();
      g.strokeStyle = '#4a4f54'; g.lineWidth = 2;
      g.beginPath(); for (let x = x0; x <= x1; x += 16) g.lineTo(x, world.groundY(x) + 6); g.stroke();
    }
  },

  // ===== DECOR =====
  decor(g, d, world, st) {
    const gy = world.groundY(d.x) + 6;
    g.save(); g.translate(d.x, gy); g.scale(d.s * (d.flip ? -1 : 1), d.s);
    const dark = '#1d1a19';
    switch (d.kind) {
      case 'pole': {
        g.fillStyle = '#4a3a2c'; g.fillRect(-4, -260, 8, 260);
        g.fillRect(-30, -240, 60, 5);
        g.strokeStyle = 'rgba(20,20,20,0.6)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-28, -238); g.quadraticCurveTo(-200, -190, -400, -238); g.stroke();
        g.beginPath(); g.moveTo(28, -238); g.quadraticCurveTo(200, -190, 400, -238); g.stroke();
        break;
      }
      case 'lamp': {
        g.fillStyle = '#3a3a3a'; g.fillRect(-3, -230, 6, 230);
        g.beginPath(); g.moveTo(0, -230); g.quadraticCurveTo(10, -250, 50, -246); g.lineTo(50, -240); g.quadraticCurveTo(10, -244, 3, -224); g.fill();
        g.fillStyle = '#ffe1a0'; g.fillRect(40, -240, 18, 4);
        break;
      }
      case 'palm': this.palm(g, d.seed); break;
      case 'deadtree': BG.deadTreeSil(g, 0, -80, 1.2, '#2a221c', RNG(d.seed)); break;
      case 'tree': {
        g.fillStyle = '#3a2a1a'; g.fillRect(-6, -110, 12, 110);
        const r = RNG(d.seed);
        for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#3d4a2a' : '#4d5a32'; g.beginPath(); g.arc(r.range(-40, 40), -120 + r.range(-30, 20), r.range(24, 40), 0, TAU); g.fill(); }
        break;
      }
      case 'cactus': {
        g.fillStyle = '#4d6a3a'; g.beginPath(); g.roundRect(-8, -90, 16, 90, 8); g.fill();
        g.beginPath(); g.roundRect(-30, -60, 12, 34, 6); g.fill(); g.fillRect(-24, -34, 18, 10);
        g.beginPath(); g.roundRect(18, -74, 12, 36, 6); g.fill(); g.fillRect(6, -44, 18, 10);
        break;
      }
      case 'rock': {
        const r = RNG(d.seed);
        g.fillStyle = shade(st.groundColor, -0.25);
        g.beginPath(); g.moveTo(-50, 0);
        for (let k = 0; k <= 6; k++) g.lineTo(-50 + k * 100 / 6, -r.range(20, 60) * Math.sin(k / 6 * Math.PI) - 4);
        g.lineTo(50, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(-40, -10); g.lineTo(-10, -45); g.lineTo(5, -30); g.fill();
        break;
      }
      case 'bones': case 'skull': {
        g.fillStyle = '#d8ccb0';
        g.beginPath(); g.ellipse(0, -10, 12, 10, 0, 0, TAU); g.fill();
        g.fillStyle = '#222'; g.beginPath(); g.arc(4, -11, 3, 0, TAU); g.arc(-4, -11, 3, 0, TAU); g.fill();
        g.fillStyle = '#d8ccb0'; g.fillRect(14, -4, 30, 4); g.fillRect(-40, -3, 26, 4);
        break;
      }
      case 'wreck': {
        g.rotate(0.06);
        const r = RNG(d.seed), col = r.pick(['#6a3a2a', '#3a4a5a', '#5a5a4a', '#7a6a3a']);
        g.fillStyle = col; g.beginPath(); g.moveTo(-80, -10); g.lineTo(-74, -38); g.lineTo(-40, -42); g.lineTo(-20, -70); g.lineTo(30, -70); g.lineTo(50, -42); g.lineTo(82, -36); g.lineTo(84, -10); g.fill();
        g.fillStyle = '#151a1f'; g.beginPath(); g.moveTo(-15, -64); g.lineTo(26, -64); g.lineTo(40, -44); g.lineTo(-30, -44); g.fill();
        g.fillStyle = 'rgba(60,30,10,0.4)'; g.fillRect(-80, -26, 164, 16);
        g.fillStyle = '#0f0f0f'; g.beginPath(); g.ellipse(-48, -8, 16, 9, 0, 0, TAU); g.ellipse(50, -8, 16, 9, 0, 0, TAU); g.fill();
        if (r.chance(0.4)) { // smoke
          for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(40,40,40,${0.18 - k * 0.02})`; g.beginPath(); g.arc(20 + k * 8, -80 - k * 22, 14 + k * 5, 0, TAU); g.fill(); }
        }
        break;
      }
      case 'sign': {
        g.fillStyle = '#555'; g.fillRect(-3, -120, 6, 120);
        g.fillStyle = '#c9a227'; g.beginPath(); g.moveTo(0, -170); g.lineTo(32, -138); g.lineTo(0, -106); g.lineTo(-32, -138); g.closePath(); g.fill();
        g.strokeStyle = '#222'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#222'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('☣', 0, -130);
        break;
      }
      case 'kmsign': {
        g.scale(d.flip ? -1 : 1, 1);
        g.fillStyle = '#5a5a5a'; g.fillRect(-60, -150, 6, 150); g.fillRect(54, -150, 6, 150);
        g.fillStyle = '#1f6b3a'; g.beginPath(); g.roundRect(-80, -200, 160, 62, 6); g.fill();
        g.strokeStyle = '#f2f2f2'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-75, -195, 150, 52, 4); g.stroke();
        g.fillStyle = '#fff'; g.font = 'bold 20px Cairo, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText(d.text, 0, -162);
        g.fillStyle = 'rgba(90,0,0,0.7)'; g.beginPath(); g.ellipse(40, -175, 10, 6, 0.4, 0, TAU); g.fill();
        break;
      }
      case 'kiosk': {
        g.fillStyle = '#7a5a3a'; g.fillRect(-50, -90, 100, 90);
        g.fillStyle = '#b8362a'; g.beginPath(); g.moveTo(-60, -90); g.lineTo(60, -90); g.lineTo(50, -110); g.lineTo(-50, -110); g.fill();
        for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#e8e0d0' : '#b8362a'; g.fillRect(-60 + k * 24, -90, 24, 8); }
        g.fillStyle = '#1a1410'; g.fillRect(-40, -78, 80, 34);
        g.fillStyle = '#c9a227'; g.font = 'bold 13px Cairo, sans-serif'; g.textAlign = 'center'; g.fillText('كشك', 0, -96);
        break;
      }
      case 'bin': { g.fillStyle = '#2a4a3a'; g.fillRect(-16, -44, 32, 44); g.fillStyle = '#1a3a2a'; g.fillRect(-18, -48, 36, 6); break; }
      case 'cone': { g.fillStyle = '#e06a1a'; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -34); g.lineTo(12, 0); g.fill(); g.fillStyle = '#fff'; g.fillRect(-7, -20, 14, 4); break; }
      case 'fence': {
        g.fillStyle = dark;
        for (let x = -80; x <= 80; x += 40) g.fillRect(x - 2, -80, 4, 80);
        g.strokeStyle = 'rgba(40,40,40,0.8)'; g.lineWidth = 1;
        for (let x = -80; x < 80; x += 8) { g.beginPath(); g.moveTo(x, -76); g.lineTo(x + 8, -4); g.moveTo(x + 8, -76); g.lineTo(x, -4); g.stroke(); }
        g.lineWidth = 1.5; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-80 + k * 40, -84, 5, 0, TAU); g.stroke(); }
        break;
      }
      case 'sandbag': {
        for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
          g.fillStyle = (row + k) % 2 ? '#8a7a5a' : '#9a8a6a';
          g.beginPath(); g.ellipse(-36 + k * 24 + row * 12, -8 - row * 14, 13, 8, 0, 0, TAU); g.fill();
        }
        break;
      }
      case 'tower': {
        g.strokeStyle = '#2a2a2a'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(-30, 0); g.lineTo(-20, -160); g.moveTo(30, 0); g.lineTo(20, -160);
        g.moveTo(-28, -40); g.lineTo(26, -100); g.moveTo(28, -40); g.lineTo(-26, -100); g.stroke();
        g.fillStyle = '#4a4436'; g.fillRect(-36, -196, 72, 40);
        g.fillStyle = '#2a2620'; g.beginPath(); g.moveTo(-44, -196); g.lineTo(0, -222); g.lineTo(44, -196); g.fill();
        g.fillStyle = '#111'; g.fillRect(-26, -186, 52, 14);
        break;
      }
      case 'tank': {
        g.fillStyle = '#4a5030';
        g.beginPath(); g.roundRect(-90, -40, 180, 34, 12); g.fill();
        g.fillStyle = '#3a4024'; g.beginPath(); g.roundRect(-50, -66, 90, 28, 8); g.fill();
        g.fillRect(36, -58, 90, 8);
        g.fillStyle = '#1a1a14'; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-72 + k * 24, -10, 10, 0, TAU); g.fill(); }
        break;
      }
    }
    g.restore();
  },

  palm(g, seed) {
    const r = RNG(seed);
    const lean = r.range(-30, 30);
    g.strokeStyle = '#6a4a2a'; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * 0.2, -120, lean, -230); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let k = 1; k < 14; k++) { const t = k / 14; const x = lerp(0, lean, t * t), y = -230 * t; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y - 3); g.stroke(); }
    const tx = lean, ty = -230;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.42 + r.range(-0.1, 0.1);
      const len = r.range(80, 110);
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.6 + 40;
      g.fillStyle = k % 2 ? '#3a5a22' : '#4a6a2a';
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - 30, ex, ey);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - 14, tx, ty + 6);
      g.fill();
    }
    g.fillStyle = '#5a3a1a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(tx - 6 + k * 4, ty + 6, 5, 0, TAU); g.fill(); }
  },

  pickup(g, p, t) {
    g.save(); g.translate(p.x, p.y + Math.sin(t * 3 + p.t) * 4);
    if (p.type === 'scrap') {
      g.rotate(Math.sin(t * 2 + p.t) * 0.4);
      // gear
      const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 13);
      gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(0.6, '#d9a22a'); gr.addColorStop(1, '#8a5a10');
      g.fillStyle = gr; g.beginPath();
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr = k % 2 ? 9 : 12; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.fillStyle = '#6a4208'; g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill();
    } else if (p.type === 'fuel') {
      g.fillStyle = '#c0261a'; g.beginPath(); g.roundRect(-14, -18, 28, 36, 4); g.fill();
      g.fillStyle = '#8a160e'; g.fillRect(-14, -4, 28, 4);
      g.fillStyle = '#333'; g.fillRect(4, -26, 8, 9);
      g.strokeStyle = '#ffd23a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-8, -12); g.lineTo(8, 12); g.moveTo(8, -12); g.lineTo(-8, 12); g.stroke();
      // glow halo
      const hg = g.createRadialGradient(0, 0, 10, 0, 0, 40);
      hg.addColorStop(0, 'rgba(255,200,80,0.25)'); hg.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = hg; g.fillRect(-40, -40, 80, 80);
    }
    g.restore();
  },

  cardCrate(g, x, y, t) {
    g.save(); g.translate(x, y);
    // beacon light beam
    const bg = g.createLinearGradient(0, -500, 0, 0);
    bg.addColorStop(0, 'rgba(255,210,80,0)'); bg.addColorStop(1, 'rgba(255,210,80,0.28)');
    g.fillStyle = bg; g.beginPath(); g.moveTo(-14, -40); g.lineTo(-40, -520); g.lineTo(40, -520); g.lineTo(14, -40); g.fill();
    // parachute crate
    const bob = Math.sin(t * 2) * 3;
    g.translate(0, bob);
    g.fillStyle = '#3a4a2a'; g.beginPath(); g.roundRect(-30, -56, 60, 52, 5); g.fill();
    g.strokeStyle = '#ffd23a'; g.lineWidth = 3; g.strokeRect(-24, -50, 48, 40);
    g.fillStyle = '#ffd23a'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('?', 0, -20);
    // flare
    const fl = 0.7 + Math.sin(t * 15) * 0.3;
    const fg = g.createRadialGradient(36, -6, 0, 36, -6, 26 * fl);
    fg.addColorStop(0, 'rgba(255,255,220,1)'); fg.addColorStop(0.3, 'rgba(255,80,40,0.8)'); fg.addColorStop(1, 'rgba(255,40,20,0)');
    g.fillStyle = fg; g.fillRect(10, -32, 52, 52);
    g.restore();
  },

  survivor(g, x, y, t, sv, waiting) {
    g.save(); g.translate(x, y);
    // roof/platform: a tiny makeshift barricade they stand on
    g.fillStyle = '#5a4a3a'; g.fillRect(-36, -30, 72, 30);
    g.fillStyle = '#7a6a52'; g.fillRect(-40, -34, 80, 6);
    g.translate(0, -34);
    // body
    g.strokeStyle = '#2a2a3a'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(-6, -30); g.moveTo(5, 0); g.lineTo(6, -30); g.stroke();
    g.fillStyle = sv.color; g.beginPath(); g.roundRect(-11, -62, 22, 34, 6); g.fill();
    // waving arm
    const wave = waiting ? Math.sin(t * 10) * 0.6 : 0;
    g.strokeStyle = sv.color; g.lineWidth = 6;
    g.save(); g.translate(8, -56); g.rotate(-2.4 + wave); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 24); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(-8, -56); g.lineTo(-12, -32); g.stroke();
    this.head(g, 0, -72, 10, '#d0a37a', sv.hat, t, 'transparent');
    // help bubble
    if (waiting) {
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(-46, -128, 92, 30, 10); g.fill();
      g.beginPath(); g.moveTo(-6, -99); g.lineTo(0, -88); g.lineTo(6, -99); g.fill();
      g.fillStyle = '#b8362a'; g.font = 'bold 17px Cairo, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('خدني معاك!', 0, -107);
    }
    g.restore();
  },
};
