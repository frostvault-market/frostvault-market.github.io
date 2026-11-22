'use strict';
// ---------- renderer ----------
class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.dark = makeCanvas(4, 4); this.dg = this.dark.getContext('2d');
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w; this.H = h; this.dpr = dpr;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.dark.width = Math.round(w * dpr / 2); this.dark.height = Math.round(h * dpr / 2);
    this.skyKey = null; this.vig = null;
  }
  baseZoom() { return clamp(this.H / 600, 0.62, 1.7) * (this.W < this.H * 1.3 ? 0.85 : 1); }

  buildSky(st) {
    const key = st.id + this.W + 'x' + this.H;
    if (this.skyKey === key) return;
    this.skyKey = key;
    const c = makeCanvas(this.cv.width, this.cv.height), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, c.height * 0.75);
    gr.addColorStop(0, st.sky[0]); gr.addColorStop(0.55, st.sky[1]); gr.addColorStop(1, st.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    // sun / moon
    const sx = st.sun.x * c.width, sy = st.sun.y * c.height * 0.75, sr = st.sun.r * this.dpr * this.baseZoom();
    const halo = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 7);
    halo.addColorStop(0, rgba(st.sun.color, 0.55)); halo.addColorStop(0.3, rgba(st.sun.color, 0.15)); halo.addColorStop(1, rgba(st.sun.color, 0));
    g.fillStyle = halo; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = st.sun.color; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    if (st.sun.moon) {
      g.fillStyle = 'rgba(150,160,190,0.35)';
      for (const [ox, oy, r] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.22], [-0.05, 0.35, 0.12]]) { g.beginPath(); g.arc(sx + ox * sr, sy + oy * sr, r * sr, 0, TAU); g.fill(); }
    }
    this.sky = c;
    // vignette
    const v = makeCanvas(this.cv.width, this.cv.height), vg = v.getContext('2d');
    const rg = vg.createRadialGradient(v.width / 2, v.height * 0.55, Math.min(v.width, v.height) * 0.35, v.width / 2, v.height * 0.55, Math.max(v.width, v.height) * 0.75);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.55)');
    vg.fillStyle = rg; vg.fillRect(0, 0, v.width, v.height);
    this.vig = v;
  }

  render(game) {
    const g = this.g, st = game.stage, dpr = this.dpr;
    const bg = BG.build(st);
    this.buildSky(st);
    const cam = game.cam;
    const z = this.baseZoom() * cam.z;
    const sh = cam.shake;
    const shx = (Math.random() - 0.5) * sh, shy = (Math.random() - 0.5) * sh;
    const camX = cam.x + shx, camY = cam.y + shy;
    const W = this.W, H = this.H;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.sky, 0, 0);
    // stars
    if (st.night) {
      for (const s of bg.stars) {
        const a = s.a * (0.6 + Math.sin(game.t * 2 + s.tw) * 0.4);
        g.fillStyle = `rgba(230,235,255,${a})`;
        g.fillRect(s.x * this.cv.width, s.y * this.cv.height * 0.6, s.s * dpr, s.s * dpr);
      }
    }
    // clouds
    const cw = bg.clouds.width;
    const cs = dpr * this.baseZoom() * 1.2;
    let cox = (-(camX * 0.02 + game.t * 8) * cs) % (cw * cs); if (cox > 0) cox -= cw * cs;
    for (let x = cox; x < this.cv.width; x += cw * cs) g.drawImage(bg.clouds, x, this.cv.height * 0.02, cw * cs, bg.clouds.height * cs);

    // parallax layers; horizon anchored at world y=0 projected with parallax
    for (const L of bg.layers) {
      const s = dpr * z * (0.75 + L.p * 0.8);
      const lw = L.c.width * s, lh = L.c.height * s;
      const horizon = (H * 0.66 + (0 - camY) * z * L.py + L.yOff * z) * dpr;
      let ox = (-camX * L.p * z * dpr) % lw; if (ox > 0) ox -= lw;
      for (let x = ox; x < this.cv.width; x += lw) g.drawImage(L.c, x, horizon - lh, lw + 1, lh);
      // fill below layer so no gaps
      g.fillStyle = this.layerBottomColor(L);
      g.fillRect(0, horizon - 1, this.cv.width, this.cv.height - horizon + 1);
    }
    // atmospheric haze band
    const hz = g.createLinearGradient(0, this.cv.height * 0.35, 0, this.cv.height);
    hz.addColorStop(0, rgba(st.fog, 0)); hz.addColorStop(1, rgba(st.fog, 0.22));
    g.fillStyle = hz; g.fillRect(0, 0, this.cv.width, this.cv.height);

    // ===== world space =====
    const tx = (x) => (x - camX) * z + W * 0.5;
    g.setTransform(dpr * z, 0, 0, dpr * z, (W * 0.5 - camX * z) * dpr, (H * 0.5 - camY * z) * dpr);
    const viewL = camX - W * 0.5 / z - 200, viewR = camX + W * 0.5 / z + 200;
    const viewB = camY + H * 0.5 / z + 50;
    const w = game.world;

    // decor behind
    for (const d of w.deco) { if (d.x < viewL - 300 || d.x > viewR + 300) continue; ART.decor(g, d, w, st); }
    // survivors platform (behind terrain edge looks odd) -> draw before terrain foreground
    for (const ev of w.events) {
      if (ev.x < viewL || ev.x > viewR) continue;
      if (ev.type === 'survivor' && !ev.done) ART.survivor(g, ev.x, w.groundY(ev.x) + 4, game.t, ev.who, true);
    }

    this.drawTerrain(g, game, bg, viewL, viewR, viewB);

    // ramps structures
    for (const rp of w.ramps) { if (rp.lipX < viewL || rp.x > viewR) continue; ART.ramp(g, rp, w); }
    // decals
    this.drawDecals(g, w, viewL, viewR);

    game.fx.drawBack(g);

    // events (card crates)
    for (const ev of w.events) {
      if (ev.x < viewL || ev.x > viewR || ev.done) continue;
      if (ev.type === 'card') ART.cardCrate(g, ev.x, w.groundY(ev.x) - 14, game.t);
    }
    // pickups
    for (const p of w.pickups) { if (p.got || p.y === null || p.x < viewL || p.x > viewR) continue; ART.pickup(g, p, game.t); }
    // obstacles
    for (const o of w.obstacles) { if (o.dead || o.x < viewL || o.x > viewR) continue; this.shadow(g, o.x, w.groundY(o.x), o.w * 0.6); ART.obstacle(g, o); }
    // zombies
    const night = st.night;
    for (const zb of game.zombies) {
      if (zb.dead || zb.x < viewL || zb.x > viewR) continue;
      if (zb.state !== 'cling') this.shadow(g, zb.x, w.groundY(zb.x), ZOMBIES[zb.type].w * 0.8 * zb.scale);
      g.save(); g.translate(zb.x, zb.y);
      if (zb.hitCd > 0.12) g.filter = 'brightness(1.8)';
      ART.zombie(g, zb, night);
      g.restore();
      if (zb.boss && !zb.dead) this.bossBar(g, zb);
    }
    // projectiles
    for (const p of game.projectiles) {
      g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.vy, p.vx));
      g.fillStyle = '#ddd'; g.fillRect(-12, -3, 20, 6); g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(8, -3); g.lineTo(14, 0); g.lineTo(8, 3); g.fill();
      g.restore();
    }
    for (const p of game.spits) { g.fillStyle = '#9ad03a'; g.beginPath(); g.arc(p.x, p.y, 7, 0, TAU); g.fill(); g.fillStyle = '#d8ff8a'; g.beginPath(); g.arc(p.x - 2, p.y - 2, 3, 0, TAU); g.fill(); }

    // car
    const car = game.car;
    this.shadow(g, car.x, w.groundY(car.x), this.def(game).len * 0.55, clamp(1 - (w.groundY(car.x) - car.y - 60) / 500, 0.15, 1));
    g.save(); g.translate(car.x, car.y); g.rotate(car.a);
    ART.car(g, {
      def: game.def, lv: game.lv, wheelRot: car.wheelRot, wheelPos: car.wheels.map(wh => [wh.lx ?? wh.ax, wh.ly ?? wh.ay + car.rest]),
      gunAngle: car.gunAngle, splats: car.splats, survivors: car.survivors, boosting: car.boosting, damage: car.damage, t: game.t,
      muzzle: car.muzzle, rockets: game.s.rockets, shock: game.s.shock, saw: game.s.saw,
    });
    // clingers drawn on top of car
    g.restore();
    for (const zb of game.zombies) {
      if (zb.dead || zb.state !== 'cling') continue;
      g.save(); g.translate(zb.x, zb.y); g.rotate(car.a); ART.zombie(g, zb, night); g.restore();
    }

    game.fx.drawFront(g);

    // foreground tufts
    this.drawForeground(g, game, viewL, viewR);

    // ===== lighting =====
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (st.night) this.nightLighting(game, z, camX, camY);
    else this.dayGlow(game, z, camX, camY);
    if (st.storm) this.storm(game);
    // color grade + vignette
    g.drawImage(this.vig, 0, 0);
    // damage flash
    if (game.hurtFlash > 0) { g.fillStyle = `rgba(200,0,0,${game.hurtFlash * 0.35})`; g.fillRect(0, 0, this.cv.width, this.cv.height); }
    // speed lines when boosting
    if (car.boosting) {
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2 * dpr;
      for (let i = 0; i < 14; i++) { const y = Math.random() * this.cv.height, x = Math.random() * this.cv.width; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 160 * dpr, y); g.stroke(); }
    }
  }
  def(game) { return game.def; }

  layerBottomColor(L) {
    if (!L._bc) { const d = L.g.getImageData(L.c.width / 2, L.c.height - 2, 1, 1).data; L._bc = `rgb(${d[0]},${d[1]},${d[2]})`; }
    return L._bc;
  }

  shadow(g, x, y, w, a = 1) {
    const gr = g.createRadialGradient(x, y, 0, x, y, w);
    gr.addColorStop(0, `rgba(0,0,0,${0.45 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, 0.18); g.translate(-x, -y);
    g.beginPath(); g.arc(x, y, w, 0, TAU); g.fill(); g.restore();
  }

  drawTerrain(g, game, bg, x0, x1, bottom) {
    const w = game.world, st = game.stage;
    if (!this.pat || this.patStage !== st.id) { this.pat = g.createPattern(bg.ground, 'repeat'); this.patStage = st.id; }
    const s0 = Math.max(0, Math.floor(x0 / SEG)), s1 = Math.min(w.n - 1, Math.ceil(x1 / SEG));
    const path = () => { g.beginPath(); g.moveTo(s0 * SEG, w.h[s0]); for (let i = s0 + 1; i <= s1; i++) g.lineTo(i * SEG, w.h[i]); };
    let minY = Infinity; for (let i = s0; i <= s1; i++) minY = Math.min(minY, w.h[i]);
    const bot = Math.max(bottom, minY + 400) + 400;
    path(); g.lineTo(s1 * SEG, bot); g.lineTo(s0 * SEG, bot); g.closePath();
    g.fillStyle = this.pat; g.fill();
    // depth darkening
    const dg = g.createLinearGradient(0, minY, 0, minY + 520);
    dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(0.25, 'rgba(0,0,0,0.12)'); dg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = dg; g.fill();
    // subsurface strata line
    g.save(); g.translate(0, 26); path(); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 16; g.stroke(); g.restore();
    // road band
    g.lineJoin = 'round';
    g.save(); g.translate(0, 9); path(); g.strokeStyle = st.topColor; g.lineWidth = 20; g.stroke(); g.restore();
    g.save(); g.translate(0, 19); path(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.stroke(); g.restore();
    if (st.ground === 'asphalt' || st.ground === 'concrete') {
      g.save(); g.translate(0, 8); path(); g.setLineDash([46, 54]); g.strokeStyle = st.ground === 'asphalt' ? 'rgba(230,190,70,0.85)' : 'rgba(240,240,240,0.5)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]); g.restore();
    }
    // surface highlight
    path(); g.strokeStyle = shade(st.topColor, 0.3); g.lineWidth = 3; g.stroke();
    if (st.ground === 'sand') { g.save(); g.translate(0, -2); path(); g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 4; g.stroke(); g.restore(); }
  }

  drawDecals(g, w, x0, x1) {
    for (const d of w.decals) {
      if (d.x < x0 || d.x > x1) continue;
      const y = w.groundY(d.x) + 3;
      const sl = Math.atan(w.slope(d.x));
      g.save(); g.translate(d.x, y); g.rotate(sl);
      if (d.kind === 'scorch') {
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, d.w * 1.5);
        gr.addColorStop(0, `rgba(10,8,6,${d.a})`); gr.addColorStop(1, 'rgba(10,8,6,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 4, d.w * 1.5, 12, 0, 0, TAU); g.fill();
      } else {
        g.fillStyle = `rgba(95,8,8,${d.a})`;
        g.beginPath(); g.ellipse(0, 2, d.w, 4.5, 0, 0, TAU); g.fill();
        g.fillStyle = `rgba(60,4,4,${d.a})`;
        g.beginPath(); g.ellipse(d.w * 0.3 * (d.seed - 0.5), 2, d.w * 0.4, 2.5, 0, 0, TAU); g.fill();
      }
      g.restore();
    }
  }

  drawForeground(g, game, x0, x1) {
    const w = game.world, st = game.stage;
    const col = { asphalt: '#3a3a2a', sand: '#b8925a', rock: '#2a2620', concrete: '#4a443a' }[st.ground];
    const grass = st.ground === 'asphalt' ? '#4a5a2a' : st.ground === 'rock' ? '#1e2416' : st.ground === 'sand' ? '#8a7a3a' : '#5a4a30';
    for (const f of w.fore) {
      if (f.x < x0 || f.x > x1) continue;
      const y = w.groundY(f.x) + 20;
      const r = RNG(f.seed);
      g.fillStyle = col;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(f.x + r.range(-14, 14), y + 4, r.range(4, 9) * f.s, r.range(3, 5) * f.s, 0, 0, TAU); g.fill(); }
      g.strokeStyle = grass; g.lineWidth = 2; g.lineCap = 'round';
      const n = r.int(3, 7);
      for (let k = 0; k < n; k++) {
        const bx = f.x + r.range(-16, 16), h = r.range(8, 22) * f.s, lean = r.range(-6, 6) + Math.sin(game.t * 2 + f.seed) * 2;
        g.beginPath(); g.moveTo(bx, y + 4); g.quadraticCurveTo(bx + lean * 0.5, y - h * 0.5, bx + lean, y - h); g.stroke();
      }
    }
  }

  bossBar(g, z) {
    const w = 160, frac = clamp(z.hp / z.maxHp, 0, 1);
    const x = z.x - w / 2, y = z.y - 240;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 3, y - 3, w + 6, 16);
    g.fillStyle = '#5a0a0a'; g.fillRect(x, y, w, 10);
    g.fillStyle = '#e8402a'; g.fillRect(x, y, w * frac, 10);
  }

  // headlights & local light in darkness
  nightLighting(game, z, camX, camY) {
    const d = this.dg, D = this.dark, sc = this.dpr / 2;
    const W = this.W, H = this.H;
    const toS = (x, y) => [((x - camX) * z + W / 2) * sc, ((y - camY) * z + H / 2) * sc];
    d.globalCompositeOperation = 'source-over';
    const dk = d.createLinearGradient(0, 0, 0, D.height); dk.addColorStop(0, 'rgba(4,6,16,0.45)'); dk.addColorStop(0.45, 'rgba(4,6,16,0.8)'); dk.addColorStop(1, 'rgba(4,6,16,0.9)');
    d.fillStyle = dk; d.fillRect(0, 0, D.width, D.height);
    d.globalCompositeOperation = 'destination-out';
    const car = game.car, def = game.def, S = SHAPES[def.style];
    const [lx, ly] = car.toWorld(S.lamp[0] * def.len, S.lamp[1] * def.h);
    const [sx, sy] = toS(lx, ly);
    const len = 1100 * z * sc;
    // headlight cone
    d.save(); d.translate(sx, sy); d.rotate(car.a);
    const cg = d.createRadialGradient(0, 0, 0, 0, 0, len);
    cg.addColorStop(0, 'rgba(0,0,0,1)'); cg.addColorStop(0.6, 'rgba(0,0,0,0.75)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = cg; d.beginPath(); d.moveTo(0, -4); d.lineTo(len, -len * 0.36); d.lineTo(len, len * 0.42); d.lineTo(0, 6); d.closePath(); d.fill();
    d.restore();
    const glow = (x, y, r, a = 1) => {
      const [px, py] = toS(x, y); const rr = r * z * sc;
      const gr = d.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    };
    glow(car.x, car.y, 330, 0.8);
    const [tlx, tly] = car.toWorld(S.tail[0] * def.len, S.tail[1] * def.h); glow(tlx, tly, 90, 0.6);
    if (car.muzzle > 0) { const [gx, gy] = car.toWorld(S.roof[0] * def.len, S.roof[1] * def.h - 14); glow(gx, gy, 300, 0.9); }
    for (const p of game.fx.p) if (p.light) glow(p.x, p.y, p.type === 'flash' ? p.size : p.type === 'fire' ? p.size * 3 : 40, p.type === 'spark' ? 0.4 : 0.8 * (p.life / p.max));
    for (const ev of game.world.events) if (!ev.done && Math.abs(ev.x - camX) < 1500) glow(ev.x, game.world.groundY(ev.x) - 60, ev.type === 'card' ? 260 : 220, 0.85);
    for (const pk of game.world.pickups) if (!pk.got && pk.type === 'fuel' && pk.y !== null && Math.abs(pk.x - camX) < 1500) glow(pk.x, pk.y, 120, 0.8);
    for (const zb of game.zombies) if (zb.type === 'boomer' && !zb.dead) glow(zb.x, zb.y - 50, 90, 0.5);
    this.g.drawImage(D, 0, 0, this.cv.width, this.cv.height);
    // additive beam haze
    const g = this.g;
    g.globalCompositeOperation = 'lighter';
    g.save(); g.translate(sx / sc, sy / sc); g.scale(1, 1); g.translate(0, 0);
    g.setTransform(1, 0, 0, 1, sx / sc * 1, sy / sc * 1); g.rotate(car.a);
    const L2 = len / sc;
    const bg = g.createLinearGradient(0, 0, L2, 0);
    bg.addColorStop(0, 'rgba(255,240,200,0.22)'); bg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, -4); g.lineTo(L2, -L2 * 0.36); g.lineTo(L2, L2 * 0.42); g.lineTo(0, 6); g.fill();
    const lg = g.createRadialGradient(0, 0, 0, 0, 0, 30 * this.dpr);
    lg.addColorStop(0, 'rgba(255,250,220,0.9)'); lg.addColorStop(1, 'rgba(255,250,220,0)');
    g.fillStyle = lg; g.fillRect(-30 * this.dpr, -30 * this.dpr, 60 * this.dpr, 60 * this.dpr);
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  dayGlow(game, z, camX, camY) {
    // warm light wash from the sun side
    const g = this.g, st = game.stage;
    g.globalCompositeOperation = 'soft-light';
    const gr = g.createLinearGradient(st.sun.x * this.cv.width, 0, (1 - st.sun.x) * this.cv.width, this.cv.height);
    gr.addColorStop(0, rgba(st.sun.color, 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = gr; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.globalCompositeOperation = 'source-over';
  }

  storm(game) {
    const g = this.g, W = this.cv.width, H = this.cv.height;
    g.fillStyle = 'rgba(160,70,40,0.12)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,190,140,0.25)'; g.lineWidth = 1.5 * this.dpr;
    const t = game.t;
    for (let i = 0; i < 70; i++) {
      const x = ((i * 137.5 + t * 1400 * (0.6 + (i % 5) * 0.12)) % (W + 300)) - 150;
      const y = (i * 71.3) % H;
      g.beginPath(); g.moveTo(W - x, y); g.lineTo(W - x - 40 * this.dpr, y + 6 * this.dpr); g.stroke();
    }
  }
}
