'use strict';
// ---------- particles & effects ----------
class FX {
  constructor(game) { this.game = game; this.p = []; this.gibs = []; this.texts = []; this.bolts = []; this.lights = []; }
  clear() { this.p.length = 0; this.gibs.length = 0; this.texts.length = 0; this.bolts.length = 0; }

  add(o) {
    if (this.p.length > 900) this.p.shift();
    o.life = o.max = o.life ?? 1; o.grav ??= 0; o.drag ??= 0; o.rot ??= 0; o.vr ??= 0;
    this.p.push(o); return o;
  }
  dust(x, y, vx, vy, col, n = 1, size = 14) {
    for (let i = 0; i < n; i++) this.add({ type: 'dust', x: x + rand(-6, 6), y: y + rand(-4, 2), vx: vx + rand(-40, 40), vy: vy + rand(-60, -10), life: rand(0.5, 1.1), size: rand(size * 0.6, size * 1.3), col, drag: 1.5, grav: -20 });
  }
  blood(x, y, vx, vy, n = 12) {
    for (let i = 0; i < n; i++) this.add({ type: 'blood', x, y, vx: vx * rand(0.2, 0.9) + rand(-160, 160), vy: vy * 0.5 + rand(-380, -40), life: rand(0.6, 1.4), size: rand(2, 5.5), grav: GRAV * 0.9, drag: 0.3 });
    for (let i = 0; i < 3; i++) this.add({ type: 'mist', x, y, vx: vx * 0.3 + rand(-40, 40), vy: rand(-60, 0), life: rand(0.3, 0.6), size: rand(16, 30), drag: 2 });
  }
  sparks(x, y, vx, vy, n = 8, col = '#ffd27a') {
    for (let i = 0; i < n; i++) this.add({ type: 'spark', x, y, vx: vx + rand(-300, 300), vy: vy + rand(-320, 80), life: rand(0.2, 0.5), size: rand(1.5, 3), col, grav: GRAV * 0.6, light: true });
  }
  debris(x, y, vx, vy, col, n = 8, w = 10) {
    for (let i = 0; i < n; i++) this.add({ type: 'debris', x, y, vx: vx * rand(0.3, 1.1) + rand(-200, 200), vy: vy * 0.3 + rand(-450, -100), life: rand(1.5, 3), w: rand(w * 0.4, w), h: rand(3, 7), col, grav: GRAV, rot: rand(0, TAU), vr: rand(-15, 15), bounce: true });
  }
  smoke(x, y, n = 1, dark = 0.45, size = 24) {
    for (let i = 0; i < n; i++) this.add({ type: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-90, -30), life: rand(1, 2.2), size: rand(size * 0.6, size * 1.2), dark, drag: 0.8, grav: -30 });
  }
  fire(x, y, n = 1, size = 16) {
    for (let i = 0; i < n; i++) this.add({ type: 'fire', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-160, -60), life: rand(0.25, 0.6), size: rand(size * 0.6, size * 1.3), drag: 1, grav: -60, light: true });
  }
  explosion(x, y, r = 120) {
    this.add({ type: 'flash', x, y, life: 0.18, size: r * 2.2, light: true });
    this.add({ type: 'ring', x, y, life: 0.45, size: r * 1.3 });
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), sp = rand(80, 520) * (r / 120);
      this.add({ type: 'fire', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: rand(0.3, 0.8), size: rand(18, 40) * (r / 120), drag: 3, grav: -40, light: true });
    }
    this.smoke(x, y - 10, 14, 0.6, 40 * (r / 120));
    this.sparks(x, y, 0, -100, 18);
    this.game.shake(16 * (r / 120));
    this.game.decal(x, 40 + r * 0.3, 'scorch');
  }
  tracer(x1, y1, x2, y2, col = 'rgba(255,230,140,') {
    this.add({ type: 'tracer', x: x1, y: y1, x2, y2, life: 0.07, col });
  }
  text(x, y, str, col = '#ffd23a', size = 22) {
    if (this.game.demo) return;
    this.texts.push({ x, y, str, col, size, life: 1.1, max: 1.1, vy: -70 });
  }
  bolt(x1, y1, x2, y2) {
    const pts = [[x1, y1]];
    const n = 7;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x1, x2, t) + rand(-20, 20), lerp(y1, y2, t) + rand(-20, 20)]); }
    pts.push([x2, y2]);
    this.bolts.push({ pts, life: 0.18, max: 0.18 });
  }
  gibsFrom(z, vx, vy) {
    const def = ZOMBIES[z.type], s = z.scale, big = def.h / 80;
    const parts = [['head', z.skin, 10 * big], ['torso', z.shirt, 12 * big * (z.type === 'fat' ? 1.6 : 1)], ['limb', z.skin, 14 * big], ['limb', z.skin, 14 * big], ['limb', z.pants, 18 * big], ['limb', z.pants, 18 * big]];
    for (let i = 0; i < 3; i++) parts.push(['chunk', i % 2 ? '#7a0d0d' : z.skin, rand(3, 6) * big]);
    for (const [part, col, size] of parts) {
      if (this.gibs.length > 160) this.gibs.shift();
      this.gibs.push({
        part, col, size, x: z.x + rand(-8, 8), y: z.y - def.h * rand(0.3, 0.8),
        vx: vx * rand(0.5, 1.2) + rand(-150, 150), vy: Math.min(vy, 0) * 0.5 + rand(-650, -200),
        a: rand(0, TAU), va: rand(-18, 18), life: rand(3.5, 5.5), ground: false,
      });
    }
  }

  update(dt) {
    const w = this.game.world;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const o = this.p[i];
      o.life -= dt;
      if (o.life <= 0) { this.p.splice(i, 1); continue; }
      if (o.vx !== undefined) {
        o.vy += o.grav * dt;
        const dr = 1 - o.drag * dt;
        o.vx *= dr; o.vy *= dr;
        o.x += o.vx * dt; o.y += o.vy * dt;
        o.rot += o.vr * dt;
        if (o.type === 'blood' || o.bounce) {
          const gy = w.groundY(o.x);
          if (o.y > gy) {
            if (o.type === 'blood') { if (Math.random() < 0.25) this.game.decal(o.x, rand(6, 16), 'blood'); this.p.splice(i, 1); continue; }
            o.y = gy; o.vy *= -0.3; o.vx *= 0.6; o.vr *= 0.5;
          }
        }
      }
    }
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const o = this.gibs[i];
      o.life -= dt;
      if (o.life <= 0) { this.gibs.splice(i, 1); continue; }
      o.vy += GRAV * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
      const gy = w.groundY(o.x) - o.size * 0.4;
      if (o.y > gy) {
        if (Math.abs(o.vy) > 150 && Math.random() < 0.5) this.game.decal(o.x, rand(8, 20), 'blood');
        o.y = gy; o.vy *= -0.35; o.vx *= 0.7; o.va *= 0.6;
      }
      if (Math.random() < 0.15 && o.life > 3) this.add({ type: 'blood', x: o.x, y: o.y, vx: o.vx * 0.2, vy: o.vy * 0.1, life: 0.6, size: 2, grav: GRAV, drag: 0.2 });
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.96; if (t.life <= 0) this.texts.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.life -= dt; if (b.life <= 0) this.bolts.splice(i, 1); }
  }

  drawBack(g) { // smoke & dust behind entities
    for (const o of this.p) {
      const t = o.life / o.max;
      if (o.type === 'dust') {
        g.fillStyle = rgba(o.col, 0.35 * t); g.beginPath(); g.arc(o.x, o.y, o.size * (1.6 - t * 0.6), 0, TAU); g.fill();
      } else if (o.type === 'smoke') {
        const c = Math.round(60 - o.dark * 50);
        g.fillStyle = `rgba(${c},${c},${c},${0.35 * t})`; g.beginPath(); g.arc(o.x, o.y, o.size * (2 - t), 0, TAU); g.fill();
      }
    }
  }
  drawFront(g) {
    for (const o of this.gibs) { g.globalAlpha = clamp(o.life, 0, 1); ART.gib(g, o); }
    g.globalAlpha = 1;
    for (const o of this.p) {
      const t = o.life / o.max;
      switch (o.type) {
        case 'blood': g.fillStyle = '#7a0a0a'; g.beginPath(); g.arc(o.x, o.y, o.size, 0, TAU); g.fill(); break;
        case 'mist': g.fillStyle = `rgba(120,10,10,${0.4 * t})`; g.beginPath(); g.arc(o.x, o.y, o.size * (1.5 - t * 0.5), 0, TAU); g.fill(); break;
        case 'debris': g.save(); g.translate(o.x, o.y); g.rotate(o.rot); g.globalAlpha = clamp(o.life, 0, 1); g.fillStyle = o.col; g.fillRect(-o.w / 2, -o.h / 2, o.w, o.h); g.restore(); g.globalAlpha = 1; break;
        case 'shell': g.fillStyle = '#d4a237'; g.fillRect(o.x, o.y, 4, 2); break;
      }
    }
    // additive
    g.globalCompositeOperation = 'lighter';
    for (const o of this.p) {
      const t = o.life / o.max;
      switch (o.type) {
        case 'spark':
          g.strokeStyle = rgba(o.col, t); g.lineWidth = o.size; g.lineCap = 'round';
          g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x - o.vx * 0.03, o.y - o.vy * 0.03); g.stroke(); break;
        case 'fire': {
          const r = o.size * (0.6 + t * 0.6);
          const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
          gr.addColorStop(0, `rgba(255,${180 + t * 60},${80 + t * 100},${0.9 * t})`); gr.addColorStop(0.5, `rgba(255,${90 + t * 60},20,${0.5 * t})`); gr.addColorStop(1, 'rgba(255,60,0,0)');
          g.fillStyle = gr; g.fillRect(o.x - r, o.y - r, r * 2, r * 2); break;
        }
        case 'flash': {
          const r = o.size;
          const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
          gr.addColorStop(0, `rgba(255,240,200,${t})`); gr.addColorStop(1, 'rgba(255,160,60,0)');
          g.fillStyle = gr; g.fillRect(o.x - r, o.y - r, r * 2, r * 2); break;
        }
        case 'ring':
          g.strokeStyle = `rgba(255,220,170,${t * 0.7})`; g.lineWidth = 6 * t + 1;
          g.beginPath(); g.arc(o.x, o.y, o.size * (1 - t * 0.85), 0, TAU); g.stroke(); break;
        case 'tracer':
          g.strokeStyle = o.col + (t * 0.9) + ')'; g.lineWidth = 2.5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(lerp(o.x, o.x2, 0.3 * (1 - t)), lerp(o.y, o.y2, 0.3 * (1 - t))); g.lineTo(o.x2, o.y2); g.stroke(); break;
      }
    }
    for (const b of this.bolts) {
      const t = b.life / b.max;
      for (const [lw, col] of [[8, `rgba(80,160,255,${0.35 * t})`], [3, `rgba(200,240,255,${t})`]]) {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        b.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
    // floating texts
    g.textAlign = 'center'; g.direction = 'ltr';
    for (const t of this.texts) {
      g.direction = /[\u0600-\u06FF]/.test(t.str) ? 'rtl' : 'ltr';
      const a = clamp(t.life / t.max * 1.6, 0, 1);
      g.font = `900 ${t.size}px Cairo, sans-serif`;
      g.lineWidth = 4; g.strokeStyle = `rgba(0,0,0,${a * 0.7})`; g.strokeText(t.str, t.x, t.y);
      g.fillStyle = t.col; g.globalAlpha = a; g.fillText(t.str, t.x, t.y); g.globalAlpha = 1;
    }
  }
}
