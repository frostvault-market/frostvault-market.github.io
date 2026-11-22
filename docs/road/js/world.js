'use strict';
// ---------- terrain & level generation ----------
const SEG = 16;

class World {
  constructor(stage, runSeed) {
    this.stage = stage;
    this.rng = RNG(stage.seed * 7919 + runSeed);
    this.lengthPx = stage.length * PX;
    this.endX = this.lengthPx;
    const n = Math.ceil((this.lengthPx + 3000) / SEG) + 2;
    this.n = n;
    this.h = new Float32Array(n);
    this.deco = [];      // decorative props drawn behind
    this.fore = [];      // foreground props drawn in front
    this.obstacles = []; // dynamic: crates, barrels, barricades
    this.pickups = [];   // scrap / fuel
    this.spawns = [];    // zombies to spawn when near
    this.events = [];    // card crates, survivors
    this.ramps = [];
    this.decals = [];    // blood on ground
    this.generate();
  }

  generate() {
    const r = this.rng, st = this.stage, H = this.h, n = this.n;
    const nz1 = Noise1D(r.int(1, 1e6)), nz2 = Noise1D(r.int(1, 1e6)), nz3 = Noise1D(r.int(1, 1e6));
    const hill = st.hill;
    for (let i = 0; i < n; i++) {
      const x = i * SEG;
      const ramp = clamp((x - 900) / 2500, 0, 1);
      let y = nz1(x / 2600) * 260 * hill + nz2(x / 900) * 70 * hill + nz3(x / 260) * 10;
      y *= ramp;
      H[i] = y;
    }
    // features: ramps (jumps) and pits
    let x = 2600;
    while (x < this.lengthPx - 1500) {
      const kind = r();
      if (kind < 0.45) this.addRamp(x, r.range(260, 400), r.range(60, 120) * (0.85 + hill * 0.15));
      else if (kind < 0.62) this.addBump(x, r.range(200, 420), r.range(40, 90));
      else if (kind < 0.75) this.addPit(x, r.range(300, 520), r.range(60, 130));
      x += r.range(900, 1900) / Math.sqrt(st.density);
    }
    // flatten end arena for boss
    const bx = this.lengthPx - 600;
    const by = this.groundY(bx);
    for (let i = Math.floor((bx - 400) / SEG); i < n; i++) {
      const t = clamp((i * SEG - (bx - 400)) / 400, 0, 1);
      H[i] = lerp(H[i], by, smooth(t));
    }
    // smoothing pass (keeps the ride readable)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n - 1; i++) {
        if (this.isRampSeg(i)) continue;
        H[i] = (H[i - 1] + H[i] * 2 + H[i + 1]) / 4;
      }
    }
    this.populate();
  }

  isRampSeg(i) {
    const x = i * SEG;
    for (const rp of this.ramps) if (x > rp.x - 10 && x < rp.x + rp.w + SEG * 2) return true;
    return false;
  }

  addRamp(x, w, hgt) {
    const H = this.h, i0 = Math.floor(x / SEG), i1 = Math.floor((x + w) / SEG);
    const base = H[i0];
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0);
      H[i] = Math.min(H[i], base - hgt * Math.pow(t, 1.6));
    }
    // steep drop after the lip back to the original ground
    const top = H[i1];
    for (let i = i1 + 1; i <= i1 + 4 && i < this.n; i++) H[i] = lerp(top, H[i], smooth((i - i1) / 4));
    this.ramps.push({ x, w, h: hgt, lipX: x + w, lipY: base - hgt, kind: this.rng.pick(['wreck', 'planks', 'container', 'sand']) });
  }
  addBump(x, w, hgt) {
    const H = this.h, i0 = Math.floor(x / SEG), i1 = Math.floor((x + w) / SEG);
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0);
      H[i] -= Math.sin(t * Math.PI) * hgt;
    }
  }
  addPit(x, w, d) {
    const H = this.h, i0 = Math.floor(x / SEG), i1 = Math.floor((x + w) / SEG);
    for (let i = i0; i <= i1; i++) {
      const t = (i - i0) / (i1 - i0);
      H[i] += Math.pow(Math.sin(t * Math.PI), 0.7) * d;
    }
  }

  groundY(x) {
    const f = x / SEG;
    let i = Math.floor(f);
    if (i < 0) return this.h[0];
    if (i >= this.n - 1) return this.h[this.n - 1];
    const t = f - i;
    return this.h[i] + (this.h[i + 1] - this.h[i]) * t;
  }
  slope(x) { return (this.groundY(x + 6) - this.groundY(x - 6)) / 12; }
  normal(x) {
    const s = this.slope(x), l = Math.hypot(1, s);
    return [s / l, -1 / l]; // pointing up (negative y)
  }

  populate() {
    const r = this.rng, st = this.stage, L = this.lengthPx;
    // zombies
    const mixEntries = Object.entries(st.mix);
    const total = mixEntries.reduce((a, [, w]) => a + w, 0);
    const pickType = () => {
      let v = r() * total;
      for (const [k, w] of mixEntries) { if ((v -= w) <= 0) return k; }
      return 'walker';
    };
    let x = 1400;
    while (x < L - 900) {
      const prog = x / L;
      const groupSize = Math.max(1, Math.round(r.range(1, 2.5 + prog * 3) * st.density * 0.8));
      // hordes sometimes
      const horde = r.chance(0.12 + prog * 0.1);
      const count = horde ? groupSize * 2 + 3 : groupSize;
      for (let k = 0; k < count; k++) {
        let t = pickType();
        // early: easier mix
        if (prog < 0.15 && (t === 'fat' || t === 'boomer' || t === 'spitter')) t = 'walker';
        this.spawns.push({ x: x + k * r.range(28, 60), type: t });
      }
      x += r.range(380, 820) / Math.sqrt(st.density) * (horde ? 2 : 1);
    }
    // boss
    this.spawns.push({ x: L - 450, type: 'brute', boss: true });

    // obstacles
    x = 1200;
    while (x < L - 1200) {
      const k = r();
      const type = k < 0.4 ? 'crate' : k < 0.62 ? 'barrel' : k < 0.85 ? 'barricade' : 'tires';
      if (!this.nearRamp(x, 120)) {
        if (type === 'crate' && r.chance(0.5)) {
          // stacked crates
          this.obstacles.push(this.makeObstacle('crate', x, 0));
          this.obstacles.push(this.makeObstacle('crate', x + 46, 0));
          this.obstacles.push(this.makeObstacle('crate', x + 23, 1));
        } else this.obstacles.push(this.makeObstacle(type, x, 0));
      }
      x += r.range(500, 1300);
    }

    // pickups: scrap trails + fuel cans
    for (const rp of this.ramps) {
      // arc of scrap over the jump
      for (let k = 0; k < 7; k++) {
        const px = rp.lipX + 80 + k * 70;
        const py = rp.lipY - 90 - Math.sin(k / 6 * Math.PI) * 120;
        this.pickups.push({ x: px, y: py, type: 'scrap', v: 5, t: r() * 10 });
      }
    }
    x = 2500;
    while (x < L - 800) {
      if (r.chance(0.55)) {
        for (let k = 0; k < 5; k++) this.pickups.push({ x: x + k * 50, y: null, type: 'scrap', v: 3, t: r() * 10 });
      }
      x += r.range(700, 1200);
    }
    // fuel: more on long stages
    const fuelEvery = 2200 + st.length * 0.35;
    for (x = 3200; x < L - 900; x += r.range(fuelEvery * 0.8, fuelEvery * 1.2)) {
      this.pickups.push({ x, y: null, type: 'fuel', v: 30, t: 0 });
    }

    // card crates (roguelite choices) every ~22% of the way
    const cardCount = 4;
    for (let k = 1; k <= cardCount; k++) {
      let cx = L * (k / (cardCount + 1)) + r.range(-300, 300);
      while (this.nearRamp(cx, 220)) cx += 150;
      this.events.push({ type: 'card', x: cx, done: false });
    }
    // survivors
    const surv = 2 + (r.chance(0.5) ? 1 : 0);
    for (let k = 0; k < surv; k++) {
      let sx = L * (0.15 + k * 0.28 + r.range(0, 0.08));
      while (this.nearRamp(sx, 260)) sx += 180;
      this.events.push({ type: 'survivor', x: sx, done: false, who: null, wait: 0 });
    }

    // decorative props
    this.makeDecor();
  }

  nearRamp(x, d) {
    for (const rp of this.ramps) if (x > rp.x - d && x < rp.lipX + d + 200) return true;
    return false;
  }

  makeObstacle(type, x, stack) {
    const dims = { crate: [44, 44, 0.08, 6], barrel: [34, 48, 0.07, 4], barricade: [22, 70, 0.12, 8], tires: [60, 34, 0.15, 5] }[type];
    const gy = this.groundY(x);
    return {
      type, x, y: gy - dims[1] / 2 - stack * dims[1], w: dims[0], h: dims[1], mass: dims[2], dmg: dims[3],
      vx: 0, vy: 0, a: stack ? 0 : -Math.atan(this.slope(x)) * -1, va: 0, hit: false, dead: false, life: 0,
      explosive: type === 'barrel',
    };
  }

  makeDecor() {
    const r = this.rng, st = this.stage, L = this.lengthPx;
    const kinds = {
      city: ['pole', 'pole', 'wreck', 'sign', 'lamp', 'kiosk', 'tree', 'bin', 'cone'],
      desert: ['palm', 'palm', 'pole', 'wreck', 'sign', 'cactus', 'bones', 'rock', 'skull'],
      valley: ['deadtree', 'rock', 'rock', 'pole', 'wreck', 'sign', 'fence', 'bones'],
      base: ['fence', 'fence', 'sandbag', 'tower', 'wreck', 'sign', 'tank', 'pole', 'cone'],
    }[st.layers];
    let x = 300;
    while (x < L + 1500) {
      const k = r.pick(kinds);
      this.deco.push({ x, kind: k, s: r.range(0.85, 1.2), flip: r.chance(0.5), seed: r.int(0, 9999) });
      x += r.range(160, 480);
    }
    // km signs with Arabic text
    const dest = { city: 'طريق السويس', desert: 'الواحات', valley: 'الوادي', base: 'القاعدة' }[st.layers];
    for (let km = 500; km < st.length; km += 500) {
      this.deco.push({ x: km * PX, kind: 'kmsign', text: `${dest} ${arNum(Math.round((st.length - km) / 100) / 10)} كم`, s: 1, seed: km });
    }
    this.deco.sort((a, b) => a.x - b.x);
    // foreground grass/rubble tufts
    x = 0;
    while (x < L + 1500) {
      this.fore.push({ x, s: r.range(0.6, 1.3), seed: r.int(0, 9999) });
      x += r.range(90, 260);
    }
  }
}
