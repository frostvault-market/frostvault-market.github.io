'use strict';
// ---------- backgrounds: sky, parallax layers, ground textures ----------
const BG = {
  cache: {},
  layerW: 2400,

  build(stage) {
    const key = stage.id;
    if (this.cache[key]) return this.cache[key];
    const r = RNG(stage.seed * 31);
    const L = [];
    const builders = { city: this.cityLayers, desert: this.desertLayers, valley: this.valleyLayers, base: this.baseLayers };
    builders[stage.layers].call(this, stage, r, L);
    const out = { layers: L, clouds: this.clouds(stage, r), ground: this.groundTex(stage, r), stars: this.stars(r) };
    this.cache[key] = out;
    return out;
  },

  // color for a layer at depth d (0 far .. 1 near)
  depthColor(stage, d, base) {
    return mixColor(base, stage.fog, (1 - d) * 0.78);
  },

  newLayer(h, p, py, yOff) {
    const c = makeCanvas(this.layerW, h);
    return { c, g: c.getContext('2d'), p, py, yOff, h };
  },

  // ----- city -----
  cityLayers(st, r, L) {
    const W = this.layerW;
    // far skyline with domes & minarets
    for (let li = 0; li < 3; li++) {
      const d = li / 2;
      const h = 420;
      const lay = this.newLayer(h, 0.08 + li * 0.12, 0.05 + li * 0.07, -40 + li * 30);
      const g = lay.g;
      const col = this.depthColor(st, d * 0.75, '#1a1418');
      g.fillStyle = col;
      let x = 0;
      while (x < W) {
        const bw = r.range(40, 120) * (1 + d * 0.4);
        const bh = r.range(80, 260) * (1 - li * 0.15);
        const t = r();
        if (t < 0.1 && li < 2) { // minaret
          const mx = x + bw / 2;
          g.fillRect(mx - 7, h - bh - 120, 14, bh + 120);
          g.fillRect(mx - 11, h - bh - 60, 22, 8);
          g.fillRect(mx - 10, h - bh - 100, 20, 6);
          g.beginPath(); g.moveTo(mx - 7, h - bh - 120); g.lineTo(mx, h - bh - 150); g.lineTo(mx + 7, h - bh - 120); g.fill();
        } else if (t < 0.18 && li < 2) { // dome
          g.fillRect(x, h - bh * 0.6, bw * 1.4, bh * 0.6);
          g.beginPath(); g.ellipse(x + bw * 0.7, h - bh * 0.6, bw * 0.5, bw * 0.45, 0, Math.PI, 0); g.fill();
          x += bw * 0.4;
        } else {
          g.fillRect(x, h - bh, bw, bh);
          // broken top
          if (r.chance(0.45)) {
            g.beginPath(); g.moveTo(x, h - bh);
            for (let k = 0; k <= 5; k++) g.lineTo(x + bw * k / 5, h - bh - r.range(0, 28));
            g.lineTo(x + bw, h - bh); g.fill();
          }
          if (r.chance(0.3)) g.fillRect(x + bw * r.range(0.2, 0.8), h - bh - r.range(20, 50), 3, 50); // antenna
          // windows
          if (li >= 1) {
            for (let wy = h - bh + 14; wy < h - 12; wy += 18) for (let wx = x + 8; wx < x + bw - 10; wx += 15) {
              const k = r();
              if (k < 0.07) { g.fillStyle = li === 2 ? 'rgba(255,190,110,0.85)' : 'rgba(255,190,120,0.5)'; g.fillRect(wx, wy, 7, 9); }
              else if (k < 0.5) { g.fillStyle = rgba('#000000', 0.18); g.fillRect(wx, wy, 7, 9); }
              g.fillStyle = col;
            }
          }
        }
        x += bw + r.range(0, 14);
      }
      // smoke columns (fires in the city)
      if (li === 1) {
        for (let k = 0; k < 4; k++) {
          const sx = r.range(0, W), sy = h - r.range(150, 250);
          for (let j = 0; j < 22; j++) {
            const grd = g.createRadialGradient(sx + j * 9, sy - j * 16, 0, sx + j * 9, sy - j * 16, 20 + j * 4);
            grd.addColorStop(0, 'rgba(40,30,35,0.22)'); grd.addColorStop(1, 'rgba(40,30,35,0)');
            g.fillStyle = grd; g.fillRect(sx + j * 9 - 120, sy - j * 16 - 120, 240, 240);
          }
          const fg = g.createRadialGradient(sx, sy + 10, 0, sx, sy + 10, 40);
          fg.addColorStop(0, 'rgba(255,140,60,0.7)'); fg.addColorStop(1, 'rgba(255,100,40,0)');
          g.fillStyle = fg; g.fillRect(sx - 40, sy - 30, 80, 80);
        }
      }
      this.fadeBottom(g, W, h, st.fog, 0.35 - li * 0.08);
      L.push(lay);
    }
  },

  // ----- desert -----
  desertLayers(st, r, L) {
    const W = this.layerW;
    // far dunes
    let lay = this.newLayer(300, 0.05, 0.04, -10);
    this.dunes(lay.g, W, 300, r, this.depthColor(st, 0.1, '#c08850'), 140, 3);
    L.push(lay);
    // pyramids
    lay = this.newLayer(360, 0.1, 0.07, 10);
    {
      const g = lay.g, h = 360;
      const base = this.depthColor(st, 0.3, '#b9864e');
      const lit = this.depthColor(st, 0.3, '#e4b97a');
      const pyr = (cx, s) => {
        g.fillStyle = base; g.beginPath(); g.moveTo(cx - s, h); g.lineTo(cx, h - s * 0.95); g.lineTo(cx + s, h); g.fill();
        g.fillStyle = lit; g.beginPath(); g.moveTo(cx - s, h); g.lineTo(cx, h - s * 0.95); g.lineTo(cx - s * 0.15, h); g.fill();
        g.strokeStyle = rgba('#000000', 0.06); g.lineWidth = 1;
        for (let k = 1; k < 14; k++) { const yy = h - s * 0.95 * k / 14; const hw = s * (1 - k / 14); g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke(); }
      };
      pyr(500, 230); pyr(820, 290); pyr(1060, 150);
      pyr(1900, 200); pyr(2120, 120);
      this.dunes(g, W, h, r, this.depthColor(st, 0.35, '#c69455'), 60, 4);
    }
    L.push(lay);
    // mid dunes w/ palms
    lay = this.newLayer(320, 0.22, 0.12, 40);
    this.dunes(lay.g, W, 320, r, this.depthColor(st, 0.6, '#b47c42'), 110, 6);
    for (let k = 0; k < 16; k++) this.palmSil(lay.g, r.range(0, W), 320 - r.range(40, 80), r.range(0.6, 1.0), this.depthColor(st, 0.6, '#5a4a2a'), r);
    L.push(lay);
    lay = this.newLayer(260, 0.38, 0.2, 70);
    this.dunes(lay.g, W, 260, r, this.depthColor(st, 0.85, '#a8703a'), 90, 8);
    L.push(lay);
  },

  // ----- valley (night) -----
  valleyLayers(st, r, L) {
    const W = this.layerW;
    const cols = ['#1f2742', '#182036', '#11172a', '#0b0f1c'];
    for (let li = 0; li < 4; li++) {
      const h = 460 - li * 50;
      const lay = this.newLayer(h, 0.05 + li * 0.1, 0.04 + li * 0.06, -20 + li * 40);
      const g = lay.g;
      g.fillStyle = cols[li];
      g.beginPath(); g.moveTo(0, h);
      let y = h * 0.4;
      const peaks = 10 + li * 6;
      for (let k = 0; k <= peaks; k++) {
        const x = W * k / peaks;
        y = k === peaks ? h * 0.4 : clamp(y + r.range(-1, 1) * h * 0.35, h * 0.1, h * 0.8);
        // jagged edge
        g.lineTo(x - W / peaks / 2, clamp(y + r.range(-30, 30), 0, h));
        g.lineTo(x, y);
      }
      g.lineTo(W, h); g.closePath(); g.fill();
      // moonlit rim
      g.globalCompositeOperation = 'source-atop';
      const rim = g.createLinearGradient(0, 0, 0, h);
      rim.addColorStop(0, 'rgba(160,180,230,0.18)'); rim.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.fillStyle = rim; g.fillRect(0, 0, W, h);
      g.globalCompositeOperation = 'source-over';
      if (li === 3) for (let k = 0; k < 14; k++) this.deadTreeSil(g, r.range(0, W), h * r.range(0.6, 0.9), r.range(0.6, 1), '#06080f', r);
      L.push(lay);
    }
  },

  // ----- military base -----
  baseLayers(st, r, L) {
    const W = this.layerW;
    let lay = this.newLayer(300, 0.05, 0.04, 0);
    this.dunes(lay.g, W, 300, r, this.depthColor(st, 0.1, '#5a2418'), 120, 3);
    L.push(lay);
    lay = this.newLayer(380, 0.14, 0.08, 20);
    {
      const g = lay.g, h = 380, col = this.depthColor(st, 0.4, '#2a1410');
      g.fillStyle = col;
      let x = 0;
      while (x < W) {
        const t = r();
        if (t < 0.25) { // hangar
          const w = r.range(180, 280), hh = r.range(90, 140);
          g.beginPath(); g.moveTo(x, h); g.lineTo(x, h - hh * 0.6); g.quadraticCurveTo(x + w / 2, h - hh * 1.25, x + w, h - hh * 0.6); g.lineTo(x + w, h); g.fill();
          x += w;
        } else if (t < 0.4) { // radar
          g.fillRect(x + 20, h - 150, 6, 150);
          g.beginPath(); g.ellipse(x + 23, h - 160, 36, 16, -0.4, 0, Math.PI); g.fill();
          x += 60;
        } else if (t < 0.55) { // tower
          g.fillRect(x, h - 200, 8, 200); g.fillRect(x + 40, h - 200, 8, 200);
          g.fillRect(x - 10, h - 230, 70, 34);
          g.lineWidth = 3; g.strokeStyle = col; g.beginPath(); for (let k = 0; k < 5; k++) { g.moveTo(x, h - k * 40); g.lineTo(x + 48, h - k * 40 - 40); } g.stroke();
          x += 70;
        } else if (t < 0.65) { // helicopter silhouette (the evac)
          const hy = h - r.range(220, 300);
          g.beginPath(); g.ellipse(x + 40, hy, 40, 14, 0, 0, TAU); g.fill();
          g.fillRect(x + 70, hy - 4, 60, 6); g.fillRect(x - 20, hy - 22, 120, 3); g.fillRect(x + 38, hy - 22, 4, 10);
          x += 120;
        } else {
          const w = r.range(60, 140), hh = r.range(40, 90);
          g.fillRect(x, h - hh, w, hh); x += w;
        }
        x += r.range(20, 80);
      }
      this.fadeBottom(g, W, h, st.fog, 0.4);
    }
    L.push(lay);
    lay = this.newLayer(260, 0.3, 0.16, 60);
    {
      const g = lay.g, h = 260, col = this.depthColor(st, 0.75, '#1a0c09');
      g.fillStyle = col;
      for (let x = 0; x < W; x += 40) { g.fillRect(x, h - 110, 4, 110); }
      g.fillRect(0, h - 108, W, 3); g.fillRect(0, h - 70, W, 2); g.fillRect(0, h - 35, W, 2);
      g.strokeStyle = col; g.lineWidth = 1.5;
      for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, h - 112, 7, 0, TAU); g.stroke(); }
      this.dunes(g, W, h, r, col, 30, 10);
    }
    L.push(lay);
  },

  // ----- helpers -----
  dunes(g, W, h, r, col, amp, waves) {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, h);
    const ph = r.range(0, TAU), ph2 = r.range(0, TAU);
    for (let x = 0; x <= W; x += 8) {
      const t = x / W * TAU;
      const y = h - amp * 0.6 - Math.sin(t * waves / 2 + ph) * amp * 0.3 - Math.sin(t * waves + ph2) * amp * 0.15;
      g.lineTo(x, y);
    }
    g.lineTo(W, h); g.fill();
    // light side
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, h - amp, 0, h);
    gr.addColorStop(0, 'rgba(255,240,210,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = gr; g.fillRect(0, 0, W, h);
    g.globalCompositeOperation = 'source-over';
  },
  fadeBottom(g, W, h, fog, a) {
    const gr = g.createLinearGradient(0, h * 0.5, 0, h);
    gr.addColorStop(0, rgba(fog, 0)); gr.addColorStop(1, rgba(fog, a));
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = gr; g.fillRect(0, 0, W, h);
    g.globalCompositeOperation = 'source-over';
  },
  palmSil(g, x, y, s, col, r) {
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
    g.lineWidth = 6 * s;
    const lean = r.range(-20, 20) * s;
    g.beginPath(); g.moveTo(x, y + 60 * s); g.quadraticCurveTo(x + lean * 0.3, y, x + lean, y - 90 * s); g.stroke();
    const tx = x + lean, ty = y - 90 * s;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.5 + r.range(-0.1, 0.1);
      const len = 55 * s;
      g.lineWidth = 4 * s;
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 10 * s, tx + Math.cos(a) * len, ty + Math.sin(a) * len + 20 * s);
      g.stroke();
    }
  },
  deadTreeSil(g, x, y, s, col, r) {
    g.strokeStyle = col; g.lineCap = 'round';
    const branch = (x0, y0, a, len, w, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (depth > 0) {
        branch(x1, y1, a - r.range(0.3, 0.7), len * 0.7, w * 0.65, depth - 1);
        branch(x1, y1, a + r.range(0.3, 0.7), len * 0.7, w * 0.65, depth - 1);
      }
    };
    branch(x, y + 80 * s, -Math.PI / 2, 60 * s, 8 * s, 4);
  },

  clouds(st, r) {
    const W = this.layerW, h = 300;
    const c = makeCanvas(W, h), g = c.getContext('2d');
    const n = st.id === 'desert' ? 6 : 14;
    const col = st.night ? [60, 70, 100] : st.id === 'base' ? [120, 40, 25] : st.id === 'city' ? [140, 70, 80] : [255, 255, 255];
    for (let k = 0; k < n; k++) {
      const cx = r.range(0, W), cy = r.range(30, h - 60), sc = r.range(0.6, 1.4);
      for (let j = 0; j < 9; j++) {
        const px = cx + r.range(-110, 110) * sc, py = cy + r.range(-18, 18) * sc, pr = r.range(30, 60) * sc;
        const gr = g.createRadialGradient(px, py, 0, px, py, pr);
        const a = st.id === 'desert' ? 0.25 : 0.22;
        gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
    }
    return c;
  },

  stars(r) {
    const s = [];
    for (let k = 0; k < 220; k++) s.push({ x: r(), y: r() * 0.7, a: r.range(0.2, 1), s: r.range(0.5, 1.8), tw: r.range(0, TAU) });
    return s;
  },

  groundTex(st, r) {
    const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = st.groundColor; g.fillRect(0, 0, S, S);
    const dark = shade(st.groundColor, -0.35), light = shade(st.groundColor, 0.18);
    // speckle noise
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = r() < 0.5 ? rgba(dark, r.range(0.1, 0.35)) : rgba(light, r.range(0.08, 0.25));
      const sz = r.range(1, 3.5);
      g.fillRect(r() * S, r() * S, sz, sz);
    }
    // stones / blobs
    const stones = st.ground === 'sand' ? 14 : 40;
    for (let k = 0; k < stones; k++) {
      const x = r() * S, y = r() * S, rr = r.range(2, st.ground === 'rock' ? 12 : 6);
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        g.fillStyle = rgba(dark, 0.45); g.beginPath(); g.ellipse(x + ox + 1, y + oy + 1.5, rr, rr * 0.7, 0, 0, TAU); g.fill();
        g.fillStyle = rgba(light, 0.35); g.beginPath(); g.ellipse(x + ox, y + oy, rr, rr * 0.7, 0, 0, TAU); g.fill();
      }
    }
    if (st.ground === 'sand') { // ripples
      g.strokeStyle = rgba(dark, 0.18); g.lineWidth = 2;
      for (let y = 0; y < S; y += 14) { g.beginPath(); for (let x = 0; x <= S; x += 8) g.lineTo(x, y + Math.sin(x / S * TAU * 2 + y) * 3); g.stroke(); }
    }
    if (st.ground === 'concrete' || st.ground === 'asphalt') { // cracks
      g.strokeStyle = rgba(dark, 0.5); g.lineWidth = 1;
      for (let k = 0; k < 8; k++) { let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += r.range(-14, 14); y += r.range(-14, 14); g.lineTo(x, y); } g.stroke(); }
    }
    return c;
  },
};
