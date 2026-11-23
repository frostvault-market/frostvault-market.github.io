'use strict';
// ---------- on-foot mode: 2D platformer through buildings of 15 doors ----------
const PG = 2000;          // gravity
const ROOM_H = 720, FLOOR_Y = 640;

class PlatGame {
  constructor(opts) {
    this.isPlat = true;
    this.B = opts.building; this.tier = this.B.tier;
    this.cb = opts.callbacks || {};
    this.equipped = opts.equipped;
    this.hs = heroStats(this.equipped);
    this.input = { left: false, right: false, jump: false, down: false, dash: false };
    this.fx = new FX(this);
    this.world = { groundY: () => FLOOR_Y, slope: () => 0, normal: () => [0, -1], decals: [] };
    this.t = 0; this.paused = false; this.over = null;
    this.kills = 0; this.scrap = 0; this.loot = []; this.skills = {};
    this.cam = { x: 0, y: ROOM_H / 2, shake: 0 };
    this.makePlayer();
    this.n = opts.startRoom || 1;
    this.enterRoom(this.n);
  }

  makePlayer() {
    const s = this.hs;
    const look = {};
    for (const sl of SLOTS) if (this.equipped[sl.id] && sl.id !== 'weapon') look[sl.id] = this.equipped[sl.id].r;
    this.p = {
      x: 0, y: FLOOR_Y, vx: 0, vy: 0, w: 28, h: 72, onGround: true, jumps: 0, jumpsMax: 1, coyote: 0, jumpBuf: 0, jumpHeld: false,
      face: 1, aim: 0, hp: s.hp, maxHp: s.hp, hurtT: 0, dashT: 0, dashCdT: 0, dashCd: 1.1, dashDmg: 0, anim: 0, recoil: 0,
      fireT: 0, look, weaponKind: s.weapon.kind, dropT: 0,
      mods: { dmg: 0, rate: 0, speed: 0 }, crit: s.crit, armor: s.armor, magnet: 0, scrapMul: 1 + s.scrap / 100,
      extraShots: 0, pierce: 0, ricochet: 0, burn: 0, frost: false, lifesteal: s.lifesteal, thorns: 0, contactRes: 0, regen: s.regen,
      explosive: 0, saws: 0, drones: 0, shock: 0, grenades: 0, revive: 0, timers: { shock: 1, grenade: 2, drone: 0.5 },
    };
  }

  // ===== room generation =====
  enterRoom(n) {
    this.n = n;
    const boss = roomKind(n);
    const r = RNG(this.B.id.length * 997 + n * 131 + Math.floor(Math.random() * 1e6));
    const W = boss ? 1500 : Math.round(r.range(1500, 2200) / 10) * 10;
    const room = { n, W, H: ROOM_H, floorY: FLOOR_Y, seed: r.int(1, 1e9), plats: [], lamps: [], windows: [], decor: [], posters: [], boss };
    // platforms on two levels
    const levels = [FLOOR_Y - 165, FLOOR_Y - 330];
    let x = 300;
    while (x < W - 360) {
      const w = r.range(200, 360);
      if (r.chance(boss ? 0.5 : 0.75)) room.plats.push({ x, y: levels[0], w });
      x += w + r.range(120, 260);
    }
    x = 420 + r.range(0, 200);
    while (x < W - 460) {
      const w = r.range(160, 300);
      // only place upper platform if reachable from a lower one
      const below = room.plats.find(p => p.y === levels[0] && Math.abs((p.x + p.w / 2) - (x + w / 2)) < p.w / 2 + w / 2 + 120);
      if (below && r.chance(boss ? 0.35 : 0.65)) room.plats.push({ x, y: levels[1], w });
      x += w + r.range(220, 420);
    }
    for (let lx = 200 + r.range(0, 120); lx < W - 150; lx += r.range(300, 460)) room.lamps.push({ x: lx, y: r.range(110, 150), flick: r.chance(0.3) ? r.range(0, 10) : -1 });
    const nWin = r.int(1, 3);
    for (let i = 0; i < nWin; i++) room.windows.push({ x: r.range(260, W - 420), y: r.range(120, 170), w: r.range(140, 200), h: r.range(150, 200), boarded: r.chance(0.4) });
    for (let dx = 240; dx < W - 200; dx += r.range(180, 340)) room.decor.push({ x: dx, kind: r.pick(this.B.decor) });
    const np = r.int(1, 2);
    const hits = (x, y, pad) => room.windows.some(w => x + 80 + pad > w.x && x - 80 - pad < w.x + w.w && y + 34 > w.y && y - 34 < w.y + w.h + 12)
      || room.plats.some(pl => x + 80 > pl.x && x - 80 < pl.x + pl.w && y + 34 > pl.y - 40 && y - 34 < pl.y + 30)
      || room.posters.some(po => Math.abs(po.x - x) < 200 && Math.abs(po.y - y) < 80);
    const texts = this.B.posters.slice().sort(() => r() - 0.5);
    for (let i = 0; i < np; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = r.range(300, W - 300), y = r.range(200, 420);
        if (!hits(x, y, 10)) { room.posters.push({ x, y, text: texts[i % texts.length] }); break; }
      }
    }
    this.room = room;
    const k = Math.min(2, (window.devicePixelRatio || 1) * clamp(window.innerHeight / ROOM_H, 0.5, 1.5));
    this.bg = PART.buildRoom(room, this.B, k);
    this.bgK = k;
    // reset dynamic state
    this.world.decals = [];
    this.foes = []; this.bullets = []; this.eproj = []; this.pickups = []; this.pools = []; this.markers = [];
    this.fx.clear();
    this.chest = null; this.cleared = false; this.boss = null; this.lastHitT = this.t;
    const p = this.p;
    p.x = 150; p.y = FLOOR_Y; p.vx = 0; p.vy = 0; p.face = 1; p.hurtT = 1.0;
    this.cam.x = p.x;
    // waves
    const tierK = 0.9 + 0.22 * this.tier;
    this.hpMul = (1 + 0.13 * (n - 1)) * (1 + 1.1 * (this.tier - 1));
    this.dmgMul = (1 + 0.055 * (n - 1)) * (1 + 0.55 * (this.tier - 1));
    const total = boss ? 0 : Math.round((5 + n * 1.15) * tierK);
    const waves = boss ? 0 : n < 4 ? 1 : n < 9 ? 2 : 3;
    this.waves = [];
    for (let i = 0; i < waves; i++) this.waves.push(Math.round(total / waves));
    this.spawnQ = 0; this.spawnT = 0.8; this.waveIdx = -1;
    this.pool = this.foePool(n);
    if (boss) {
      this.bossIntro = 1.6;
      setTimeout(() => SFX.roar(), 300);
    }
    this.introT = 1.4;
    this.cb.room && this.cb.room(n);
  }

  foePool(n) {
    const t = this.tier;
    const pool = [['walker', 6], ['runner', 2 + n * 0.25]];
    if (n >= 2 || t > 1) pool.push(['leaper', 1.5 + t * 0.4]);
    if (n >= 3 || t > 1) pool.push(['fat', 1 + t * 0.4]);
    if (n >= 4 || t > 1) pool.push(['spitter', 1.2 + t * 0.4]);
    if (n >= 6 || t > 1) pool.push(['boomer', 1 + t * 0.3]);
    return pool;
  }
  pickFoe() {
    const tot = this.pool.reduce((a, [, w]) => a + w, 0);
    let v = Math.random() * tot;
    for (const [k, w] of this.pool) if ((v -= w) <= 0) return k;
    return 'walker';
  }

  spawnFoe(type, x, y, boss) {
    const def = boss ? BOSSES[type] : FOES[type];
    const zdef = ZOMBIES[def.art];
    const shirts = ['#6a5a4a', '#4a5a6a', '#7a3a3a', '#5a6a4a', '#8a7a5a', '#3a3a4a', '#9a8a7a', '#5a4a6a'];
    const hp = def.hp * this.hpMul * (boss ? 1 / (1 + 0.13 * (this.n - 1)) * (1 + 0.04 * this.n) : 1);
    const z = {
      foe: type, type: def.art, boss: !!boss, x, y, vx: 0, vy: 0, w: def.w, h: def.h, hp, maxHp: hp,
      dir: x > this.p.x ? -1 : 1, phase: rand(0, TAU), t: rand(0, 5), seed: rand(0, 10),
      scale: boss ? def.h / 190 : def.h / zdef.h, skin: pick(zdef.color), shirt: boss ? def.color : pick(shirts), pants: pick(['#2a3040', '#3a3a3a', '#4a4030']),
      hair: pick([null, '#1a1410', '#3a2a1a']), attack: 0, onGround: false, cd: rand(1, 2.5), slowT: 0, burnT: 0, burnDps: 0, flash: 0,
      state: 'walk', stT: 0, fuse: -1, sawCd: 0, enraged: false,
    };
    const OUT = { apartment: [null, null, 'shopper', 'suit'], hospital: ['gown', 'gown', 'nurse', 'doctor'], mall: ['shopper', 'shopper', 'suit', null], factory: ['worker', 'worker', 'hazmat', null] };
    z.outfit = boss ? type : pick(OUT[this.B.id]);
    if (z.outfit === 'shopper' && Math.random() < 0.5) z.bag = pick(['#c8342a', '#2a6ab8', '#e8c84a', '#8a3ab8']);
    if (z.outfit === 'shopper') z.shirt = pick(['#c85a8a', '#4a8ac8', '#e8a84a', '#5ab88a', '#8a5ac8']);
    if (boss && type === 'acid') z.skin = '#8ab85a';
    if (boss && type === 'king') z.skin = '#7a7a5a';
    this.foes.push(z);
    if (boss) { this.boss = z; this.cb.boss && this.cb.boss(def.name); }
    return z;
  }

  // ===== update =====
  update(dt) {
    if (this.paused) return;
    this.t += dt;
    const p = this.p;
    if (this.introT > 0) this.introT -= dt;
    this.updatePlayer(dt);
    this.updateSpawning(dt);
    this.updateFoes(dt);
    this.updateBullets(dt);
    this.updateEProj(dt);
    this.updateSkills(dt);
    this.updatePickups(dt);
    this.fx.update(dt);
    this.checkClear();
    // stall guard: if nothing got hurt for a while, pull stragglers into view
    if (!this.cleared && this.t - (this.lastHitT || 0) > 18 && this.introT <= 0) {
      this.lastHitT = this.t;
      for (const zf of this.foes) if (!zf.dead && !zf.boss) { zf.x = clamp(p.x + rand(-500, 500), 120, this.room.W - 120); zf.y = FLOOR_Y; zf.vy = 0; }
    }
    // camera
    const view = this.viewW || 1280;
    const tx = p.x + p.face * 80;
    this.cam.x = lerp(this.cam.x, tx, 1 - Math.pow(0.001, dt));
    const mX = Math.min(170, view * 0.14); // let the hero sit clear of the side pads
    this.cam.x = this.room.W <= view ? this.room.W / 2 : clamp(this.cam.x, view / 2 - mX, this.room.W - view / 2 + mX);
    this.cam.shake *= Math.pow(0.003, dt);
    this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt * 2.5);
  }

  shake(a) { this.cam.shake = Math.min(24, this.cam.shake + a); }
  decal(x, w, kind) { const d = this.world.decals; if (d.length > 120) d.shift(); d.push({ x, w, kind, a: kind === 'scorch' ? 0.5 : rand(0.5, 0.85), seed: Math.random() }); }

  // platform collision helper for any body (feet at y)
  physBody(b, dt, dropping) {
    const prevY = b.y;
    b.vy += PG * dt;
    if (b.vy > 1400) b.vy = 1400;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.onGround = false;
    if (b.y >= FLOOR_Y) { b.y = FLOOR_Y; b.vy = 0; b.onGround = true; }
    else if (b.vy >= 0 && !dropping) {
      for (const pl of this.room.plats) {
        if (b.x + b.w * 0.3 < pl.x || b.x - b.w * 0.3 > pl.x + pl.w) continue;
        if (prevY <= pl.y + 1 && b.y >= pl.y) { b.y = pl.y; b.vy = 0; b.onGround = true; b.plat = pl; break; }
      }
    }
    const half = b.w / 2;
    if (b.x < half + 20) { b.x = half + 20; b.vx = Math.max(0, b.vx); b.hitWall = -1; }
    else if (b.x > this.room.W - half - 20) { b.x = this.room.W - half - 20; b.vx = Math.min(0, b.vx); b.hitWall = 1; }
    else b.hitWall = 0;
  }

  updatePlayer(dt) {
    const p = this.p, I = this.input, s = this.hs;
    if (this.over) { if (p.deadT) p.deadT += dt; p.vx *= 0.9; this.physBody(p, dt, false); return; }
    p.hurtT -= dt; p.dashCdT -= dt; p.recoil = Math.max(0, p.recoil - dt * 8); p.dropT -= dt;
    const maxSp = 300 * (1 + s.speed / 100 + p.mods.speed);
    let dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashDir * 950; p.vy = Math.min(p.vy, 0) * 0.5;
      if (Math.random() < 0.8) this.fx.add({ type: 'mist', x: p.x - p.dashDir * 20, y: p.y - 40, vx: 0, vy: 0, life: 0.25, size: 18, drag: 1 });
    } else {
      const acc = p.onGround ? 3200 : 2000;
      const target = dir * maxSp;
      if (dir) p.vx += clamp(target - p.vx, -acc * dt, acc * dt);
      else p.vx *= Math.pow(p.onGround ? 0.0005 : 0.2, dt);
    }
    if (dir && !this.targetFoe) p.face = dir;
    // dash
    if (I.dash && p.dashCdT <= 0) {
      I.dash = false;
      p.dashT = 0.17; p.dashCdT = p.dashCd; p.dashDir = dir || p.face; p.hurtT = Math.max(p.hurtT, 0.25);
      SFX.noise(0.15, 1200, 1, 0.2, 'bandpass', 300);
      this.dashHit = new Set();
    }
    // jump (buffered, coyote)
    if (I.jump && !p.jumpHeld) p.jumpBuf = 0.14;
    p.jumpHeld = I.jump;
    p.jumpBuf -= dt;
    if (p.onGround) { p.coyote = 0.1; p.jumps = 0; } else p.coyote -= dt;
    const jumpV = 920 * (1 + s.jump / 200);
    if (p.jumpBuf > 0) {
      if (p.coyote > 0 && p.jumps === 0) { p.vy = -jumpV; p.jumps = 1; p.jumpBuf = 0; p.coyote = 0; this.fx.dust(p.x, p.y, 0, -20, '#9a8a7a', 4, 10); SFX.tone(260, 0.08, 0.08, 'triangle', 420); }
      else if (!p.onGround && p.jumps < p.jumpsMax) { p.vy = -jumpV * 0.9; p.jumps = p.jumpsMax; p.jumpBuf = 0; this.fx.add({ type: 'ring', x: p.x, y: p.y, life: 0.3, size: 40 }); SFX.tone(380, 0.1, 0.08, 'triangle', 640); }
    }
    if (!I.jump && p.vy < -300) p.vy *= Math.pow(0.0004, dt); // variable height
    if (I.down && p.onGround && p.y < FLOOR_Y) { p.dropT = 0.22; p.onGround = false; }
    const wasAir = !p.onGround, vyBefore = p.vy;
    this.physBody(p, dt, p.dropT > 0);
    if (wasAir && p.onGround && vyBefore > 700) this.fx.dust(p.x, p.y, 0, -20, '#9a8a7a', 5, 12);
    p.anim += dt * (Math.abs(p.vx) / 28 + 1);
    // regen
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    // dash damage
    if (p.dashT > 0 && p.dashDmg > 0) {
      for (const z of this.foes) if (!z.dead && !this.dashHit.has(z) && Math.abs(z.x - p.x) < (z.w + p.w) / 2 + 10 && Math.abs((z.y - z.h / 2) - (p.y - 36)) < z.h / 2 + 30) {
        this.dashHit.add(z); this.damageFoe(z, p.dashDmg * this.dmgFactor(), p.dashDir * 300, false);
      }
    }
    this.updateGun(dt);
  }

  dmgFactor() { return 1 + this.hs.dmg / 100 + this.p.mods.dmg; }

  nearestFoe(x, y, range, exclude) {
    let best = null, bd = range;
    for (const z of this.foes) {
      if (z.dead || z === exclude || z.spawning) continue;
      const d = Math.hypot(z.x - x, (z.y - z.h * 0.55) - y);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }

  updateGun(dt) {
    const p = this.p, W = this.hs.weapon;
    const gx = p.x + p.face * 14, gy = p.y - 62;
    const tgt = this.nearestFoe(gx, gy, W.range);
    this.targetFoe = tgt;
    if (tgt) {
      const ty = tgt.y - tgt.h * (tgt.boss ? 0.5 : 0.6);
      p.aim = Math.atan2(ty - gy, tgt.x - gx);
      p.face = tgt.x >= p.x ? 1 : -1;
    } else p.aim = p.face > 0 ? 0 : Math.PI;
    p.fireT -= dt;
    if (!tgt || p.fireT > 0 || p.dashT > 0) return;
    const rate = W.rate * (1 + this.hs.rate / 100 + p.mods.rate);
    p.fireT = 1 / rate;
    p.recoil = 1;
    const shots = W.pellets + p.extraShots;
    const base = W.dmg * this.dmgFactor();
    for (let i = 0; i < shots; i++) {
      let a = p.aim + rand(-W.spread, W.spread) * (W.pellets > 1 ? 1 : 1);
      if (i >= W.pellets) a += ((i - W.pellets) % 2 ? -1 : 1) * 0.09 * Math.ceil((i - W.pellets + 1) / 2);
      const sp = W.speed * rand(0.92, 1.05);
      const crit = Math.random() * 100 < p.crit;
      let bvx = Math.cos(a) * sp, bvy = Math.sin(a) * sp;
      if (W.arc) { // ballistic aim: compensate for the drop
        const tx = tgt.x - gx, ty = (tgt.y - tgt.h * 0.5) - gy;
        const T = clamp(Math.hypot(tx, ty) / sp, 0.25, 1.4);
        bvx = tx / T + rand(-20, 20); bvy = ty / T - 0.5 * PG * 0.45 * T;
      }
      this.bullets.push({
        x: gx + Math.cos(a) * 30, y: gy + Math.sin(a) * 30, vx: bvx, vy: bvy,
        dmg: base * (crit ? 1 + this.hs.critDmg / 100 : 1), crit, pierce: W.pierce + p.pierce, ric: p.ricochet, life: W.range / sp,
        flame: W.flame, arc: W.arc, aoe: W.aoe, hit: new Set(),
      });
    }
    if (W.flame) { if (Math.random() < 0.3) SFX.noise(0.1, 700, 1, 0.12, 'lowpass'); }
    else if (W.arc) SFX.noise(0.2, 400, 1, 0.3, 'lowpass', 120);
    else if (W.kind === 'shotgun') { SFX.noise(0.25, 900, 0.7, 0.45, 'lowpass', 120); this.shake(2); }
    else if (W.kind === 'rifle') SFX.sniper();
    else SFX.gun();
    if (!W.flame) this.fx.add({ type: 'shell', x: gx, y: gy, vx: -p.face * rand(60, 140), vy: rand(-260, -160), life: 0.7, grav: PG, drag: 0.3 });
    this.muzzle = 0.05;
  }

  // ===== spawning & clear =====
  updateSpawning(dt) {
    if (this.introT > 0.6) return;
    const room = this.room;
    if (room.boss && !this.boss && !this.bossSpawned) {
      this.bossSpawned = true;
      this.addMarker(room.W - 380, FLOOR_Y, () => this.spawnFoe(room.boss, room.W - 380, FLOOR_Y - 10, true), 1.0);
      return;
    }
    // markers
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i]; m.t -= dt;
      if (m.t <= 0) { m.fn(); this.markers.splice(i, 1); }
    }
    if (room.boss) { // adds during boss fight
      if (this.boss && !this.boss.dead) {
        this.addT = (this.addT ?? 6) - dt;
        if (this.addT <= 0) { this.addT = this.boss.enraged ? 5 : 8; for (let i = 0; i < 2 + this.tier / 2; i++) this.queueSpawn(this.boss.foe === 'acid' ? 'leaper' : this.pickFoe()); }
      }
      return;
    }
    const alive = this.foes.filter(z => !z.dead).length + this.markers.length;
    if (this.spawnQ <= 0 && alive <= 2 && this.waveIdx < this.waves.length - 1) {
      this.waveIdx++; this.spawnQ = this.waves[this.waveIdx];
      if (this.waveIdx > 0) this.cb.msg && this.cb.msg(`موجة ${arNum(this.waveIdx + 1)} من ${arNum(this.waves.length)}`);
    }
    if (this.spawnQ > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = rand(0.25, 0.55); this.spawnQ--; this.queueSpawn(this.pickFoe()); }
    }
  }
  queueSpawn(type) {
    const p = this.p, W = this.room.W;
    let x, tries = 0;
    do { x = rand(200, W - 200); tries++; } while (Math.abs(x - p.x) < 380 && tries < 20);
    const fromCeil = Math.random() < 0.5;
    const y = fromCeil ? 60 : FLOOR_Y;
    this.addMarker(x, fromCeil ? FLOOR_Y : FLOOR_Y, () => {
      const z = this.spawnFoe(type, x, y);
      if (fromCeil) { this.fx.debris(x, 56, 0, 100, '#6a5a4a', 6, 10); this.fx.dust(x, 60, 0, 60, '#8a7a6a', 5, 18); z.vy = 100; }
      else { this.fx.dust(x, FLOOR_Y, 0, -60, '#5a4a3a', 8, 20); }
    }, 0.7, fromCeil);
  }
  addMarker(x, y, fn, t, ceil) { this.markers.push({ x, y, fn, t, max: t, ceil }); }

  checkClear() {
    if (this.cleared || this.over) return;
    const room = this.room;
    const doneSpawning = room.boss ? (this.boss && this.boss.dead) : (this.waveIdx >= this.waves.length - 1 && this.spawnQ <= 0 && this.markers.length === 0);
    if (!doneSpawning || this.introT > 0) return;
    if (this.foes.some(z => !z.dead)) {
      if (room.boss && this.boss.dead) for (const z of this.foes) if (!z.dead) this.killFoe(z, 0, -300);
      return;
    }
    this.cleared = true;
    SFX.card();
    if (room.boss) {
      const luck = this.tier + (this.n === 15 ? 2 : this.n === 10 ? 1 : 0);
      const item = randomItem(this.tier, luck);
      this.chest = { x: room.W / 2, y: FLOOR_Y, open: false, item };
      this.cb.msg && this.cb.msg('صندوق غنايم! روح افتحه');
    } else this.cb.msg && this.cb.msg('الأوضة نضفت! الباب اتفتح ←');
  }

  // ===== foes =====
  updateFoes(dt) {
    const p = this.p;
    for (const z of this.foes) {
      if (z.dead) continue;
      const def = z.boss ? BOSSES[z.foe] : FOES[z.foe];
      z.t += dt; z.cd -= dt; z.attack -= dt; z.flash -= dt; z.slowT -= dt; z.sawCd -= dt;
      if (z.burnT > 0) { z.burnT -= dt; z.hp -= z.burnDps * dt; if (Math.random() < 0.3) this.fx.fire(z.x + rand(-10, 10), z.y - z.h * rand(0.3, 0.8), 1, 8); if (z.hp <= 0) { this.killFoe(z, 0, -200); continue; } }
      const slow = z.slowT > 0 ? 0.6 : 1;
      const dx = p.x - z.x;
      if (z.boss) this.bossAI(z, def, dt, dx, slow);
      else {
        // basic chase
        if (z.onGround && z.state === 'walk') {
          let sp = def.speed * slow;
          if (def.ranged && Math.abs(dx) < 380) sp = -sp * 0.6; // spitters keep distance
          if (def.ranged && Math.abs(dx) < 520 && Math.abs(dx) > 380) sp = 0;
          const target = Math.sign(dx) * sp;
          z.vx = lerp(z.vx, target, 1 - Math.pow(0.01, dt));
          z.dir = dx < 0 ? -1 : 1;
          // jump up toward player on platforms
          if (p.y < z.y - 100 && Math.abs(dx) < 240 && z.cd <= 0) {
            const k = z.foe === 'runner' || z.foe === 'leaper' ? 0.9 : 0.35;
            z.cd = rand(1.2, 2.5);
            if (Math.random() < k) { z.vy = -rand(880, 980); z.vx = Math.sign(dx) * 160; }
          }
          // leaper pounce
          if (def.leaps && z.cd <= 0 && Math.abs(dx) < 340 && Math.abs(dx) > 80) {
            z.cd = rand(1.8, 2.8); z.vy = -650; z.vx = dx * 1.5 + rand(-40, 40); z.attack = 0.5; SFX.groan();
          }
          // spitter
          if (def.ranged && z.cd <= 0 && Math.abs(dx) < 800) {
            z.cd = rand(2.2, 3.2); z.attack = 0.5;
            const sx = z.x + z.dir * 12, sy = z.y - z.h * 0.85;
            const T = clamp(Math.abs(dx) / 500, 0.5, 1.1);
            this.eproj.push({ x: sx, y: sy, vx: (p.x - sx) / T, vy: ((p.y - 40) - sy - 0.5 * PG * 0.5 * T * T) / T, g: PG * 0.5, dmg: def.dmg * this.dmgMul, life: 3, kind: 'acid', r: 8 });
          }
          // boomer fuse
          if (def.explodes && z.fuse < 0 && Math.abs(dx) < 80 && Math.abs(p.y - z.y) < 90) { z.fuse = 0.55; SFX.tone(800, 0.4, 0.1, 'square', 1600); }
        }
        if (z.fuse >= 0) { z.fuse -= dt; z.vx *= 0.9; z.flash = 0.1; if (z.fuse <= 0) { this.killFoe(z, 0, -200); continue; } }
        z.phase += dt * (2 + Math.abs(z.vx) / 20);
      }
      this.physBody(z, dt, false);
      if (z.boss && z.landed) z.landed = false;
      // contact damage
      if (!z.spawning && p.hurtT <= 0 && Math.abs(z.x - p.x) < (z.w + p.w) / 2 - 4 && p.y > z.y - z.h && p.y - p.h < z.y) {
        let d = def.dmg * this.dmgMul * (z.charging ? 1.6 : 1);
        this.hurtPlayer(d, Math.sign(p.x - z.x) || 1, def.heavy || z.boss, true);
        if (p.thorns > 0) this.damageFoe(z, p.thorns * this.dmgFactor(), -Math.sign(dx) * 200, false);
        z.attack = 0.4;
      }
    }
    for (let i = this.foes.length - 1; i >= 0; i--) if (this.foes[i].dead && this.foes[i] !== this.boss) this.foes.splice(i, 1);
  }

  bossAI(z, def, dt, dx, slow) {
    const p = this.p;
    z.stT -= dt;
    if (!z.enraged && z.hp < z.maxHp * 0.5 && def.king) { z.enraged = true; this.shake(14); SFX.roar(); this.cb.msg && this.cb.msg('العملاق اتجنن!'); }
    const rage = z.enraged ? 1.4 : 1;
    z.phase += dt * (2 + Math.abs(z.vx) / 25);
    switch (z.state) {
      case 'walk': {
        z.dir = dx < 0 ? -1 : 1;
        const want = def.acid && Math.abs(dx) < 420 ? -z.dir * def.speed * 0.6 : z.dir * def.speed * rage * slow;
        z.vx = lerp(z.vx, want, 1 - Math.pow(0.02, dt));
        if (z.cd <= 0 && z.onGround) {
          const opts = def.acid ? ['volley', 'volley', 'stomp'] : def.king ? ['charge', 'stomp', 'volley', 'charge'] : ['charge', 'stomp'];
          const pickA = pick(opts);
          z.state = 'wind'; z.next = pickA; z.stT = 0.6 / rage; z.vx = 0; z.attack = 0.6;
          SFX.tone(90, 0.5, 0.25, 'sawtooth', 60);
        }
        break;
      }
      case 'wind':
        z.flash = 0.06; z.vx *= 0.8;
        if (z.stT <= 0) {
          if (z.next === 'charge') { z.state = 'charge'; z.stT = 1.0; z.charging = true; z.dir = dx < 0 ? -1 : 1; SFX.roar(); }
          else if (z.next === 'stomp') { z.state = 'air'; z.vy = -1000; z.vx = clamp(dx * 1.2, -600, 600); }
          else { z.state = 'volleyS'; z.stT = 0.2; z.shots = def.acid ? 5 : 3; }
        }
        break;
      case 'charge':
        z.vx = z.dir * 720 * rage;
        if (Math.random() < 0.5) this.fx.dust(z.x - z.dir * 40, z.y, -z.dir * 80, -30, '#7a6a5a', 1, 18);
        if (z.hitWall || z.stT <= 0) {
          z.charging = false;
          if (z.hitWall) { z.state = 'stun'; z.stT = 1.2; this.shake(16); SFX.crash(); this.fx.debris(z.x + z.dir * 50, z.y - 120, -z.dir * 200, -100, '#6a5a4a', 12, 14); this.cb.msg && this.cb.msg('خبط في الحيطة! اضربه دلوقتي'); }
          else { z.state = 'walk'; z.cd = rand(1.4, 2.4) / rage; }
        }
        break;
      case 'air':
        if (z.onGround && z.vy === 0 && z.stT < -0.1) {
          z.state = 'walk'; z.cd = rand(1.6, 2.6) / rage; z.vx = 0;
          this.shake(18); SFX.boom();
          this.fx.add({ type: 'ring', x: z.x, y: z.y, life: 0.5, size: 300 });
          this.fx.dust(z.x, z.y, 0, -60, '#8a7a6a', 16, 30);
          const R = z.enraged ? 380 : 300;
          if (p.onGround && Math.abs(p.x - z.x) < R && Math.abs(p.y - z.y) < 30) this.hurtPlayer(def.dmg * this.dmgMul * 0.9, Math.sign(p.x - z.x) || 1, true);
          // shock waves along the floor
          if (def.king) for (const d of [-1, 1]) this.eproj.push({ x: z.x, y: FLOOR_Y - 18, vx: d * 520, vy: 0, g: 0, dmg: def.dmg * this.dmgMul * 0.6, life: 2.2, kind: 'wave', r: 20 });
        }
        break;
      case 'volleyS':
        z.vx = 0;
        if (z.stT <= 0 && z.shots > 0) {
          z.shots--; z.stT = 0.16; z.attack = 0.3;
          const sx = z.x + z.dir * 30, sy = z.y - z.h * 0.8;
          const T = rand(0.7, 1.2), tx = p.x + rand(-160, 160);
          this.eproj.push({ x: sx, y: sy, vx: (tx - sx) / T, vy: ((FLOOR_Y - 40) - sy - 0.5 * PG * 0.5 * T * T) / T, g: PG * 0.5, dmg: def.dmg * this.dmgMul * 0.7, life: 3, kind: 'acid', r: 11, pool: !!def.acid });
          SFX.noise(0.15, 500, 2, 0.25, 'lowpass');
        }
        if (z.shots <= 0 && z.stT <= 0) { z.state = 'walk'; z.cd = rand(1.5, 2.5) / rage; }
        break;
      case 'stun':
        z.vx = 0;
        if (z.stT <= 0) { z.state = 'walk'; z.cd = 1; }
        break;
    }
    if (z.state === 'air') z.stT -= 0; // stT counts down in top
  }

  hurtPlayer(d, dir, heavy, contact) {
    const p = this.p;
    if (p.hurtT > 0 || this.over) return;
    if (Math.random() * 100 < this.hs.dodge) { this.fx.text(p.x, p.y - 100, 'تفادي!', '#9fdcff', 20); p.hurtT = 0.3; return; }
    d *= 1 - p.armor / 100;
    if (contact) d *= 1 - p.contactRes;
    p.hp -= d; p.hurtT = 0.75;
    p.vx = dir * (heavy ? 520 : 320); p.vy = heavy ? -520 : -300;
    this.hurtFlash = Math.min(1, (this.hurtFlash || 0) + 0.5);
    this.shake(heavy ? 10 : 5);
    this.fx.blood(p.x, p.y - 50, dir * 100, -100, 8);
    SFX.thud();
    this.fx.text(p.x, p.y - 96, '-' + Math.round(d), '#ff5a4a', 22);
    if (p.hp <= 0) {
      if (p.revive > 0) {
        p.revive = 0; p.hp = p.maxHp * 0.5; p.hurtT = 2;
        this.fx.add({ type: 'flash', x: p.x, y: p.y - 40, life: 0.4, size: 300, light: true });
        this.cb.msg && this.cb.msg('روح تانية! قمت من جديد');
        for (const z of this.foes) if (!z.dead && Math.abs(z.x - p.x) < 300) { z.vx = Math.sign(z.x - p.x) * 600; z.vy = -400; }
      } else { p.hp = 0; this.finish(false); }
    }
  }

  damageFoe(z, dmg, kx, crit, src) {
    if (z.dead || z.spawning) return;
    z.hp -= dmg; z.flash = 0.08; this.lastHitT = this.t;
    if (!z.boss && z.state === 'walk') { z.vx += kx * (FOES[z.foe].heavy ? 0.15 : 0.5); }
    const p = this.p;
    if (p.lifesteal > 0) p.hp = Math.min(p.maxHp, p.hp + dmg * p.lifesteal / 100);
    if (crit) this.fx.text(z.x + rand(-10, 10), z.y - z.h - 10, Math.round(dmg) + '!', '#ffd23a', 24);
    else if (dmg >= 20 && Math.random() < 0.6) this.fx.text(z.x + rand(-14, 14), z.y - z.h - 6, '' + Math.round(dmg), '#ffffff', 15);
    if (z.hp <= 0) this.killFoe(z, kx, -300);
  }

  killFoe(z, vx, vy) {
    if (z.dead) return;
    z.dead = true;
    const def = z.boss ? BOSSES[z.foe] : FOES[z.foe];
    this.kills++;
    this.fx.gibsFrom(z, vx, vy);
    this.fx.blood(z.x, z.y - z.h * 0.5, vx, vy, z.boss ? 50 : 14);
    this.decal(z.x + rand(-20, 20), rand(18, 40) * (z.boss ? 3 : 1), 'blood');
    SFX.splat();
    if (def.explodes) this.explode(z.x, z.y - 40, 120, def.dmg * this.dmgMul, true);
    if (z.boss) {
      this.fx.explosion(z.x, z.y - 100, 200); this.shake(24); SFX.boom(); SFX.roar();
      this.slowmo = 0.8;
      this.cb.boss && this.cb.boss(null);
    }
    // drops
    const n = z.boss ? 18 : Math.max(1, Math.round(def.scrap * (0.6 + Math.random() * 0.8)));
    const val = Math.max(1, Math.round((z.boss ? def.scrap / 18 : def.scrap / n) * (1 + 0.08 * this.n) * this.tier));
    for (let i = 0; i < Math.min(n, 18); i++) this.pickups.push({ x: z.x + rand(-10, 10), y: z.y - z.h * 0.5, vx: rand(-220, 220), vy: rand(-520, -220), type: 'scrap', v: val, t: 0 });
    if (Math.random() < (z.boss ? 1 : 0.06)) this.pickups.push({ x: z.x, y: z.y - z.h * 0.5, vx: rand(-100, 100), vy: -400, type: 'heart', v: z.boss ? 40 : 14, t: 0 });
  }

  explode(x, y, r, dmg, hurtsPlayer) {
    this.fx.explosion(x, y, r);
    SFX.boom();
    for (const z of this.foes) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - x, z.y - z.h / 2 - y);
      if (d < r + z.w / 2) this.damageFoe(z, dmg * (hurtsPlayer ? 1.5 : 1) * (1 - d / (r * 1.6)), Math.sign(z.x - x) * 300, false);
    }
    const p = this.p;
    if (hurtsPlayer && Math.hypot(p.x - x, p.y - 40 - y) < r) this.hurtPlayer(dmg, Math.sign(p.x - x) || 1, true);
  }

  // ===== projectiles =====
  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.arc) b.vy += PG * 0.45 * dt;
      const ox = b.x, oy = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      let gone = b.life <= 0 || b.x < 0 || b.x > this.room.W || b.y > FLOOR_Y || b.y < 40;
      if (b.flame) { if (Math.random() < 0.7) this.fx.fire(b.x, b.y, 1, 14 + (1 - b.life) * 10); }
      else if (b.arc) this.fx.smoke(b.x, b.y, 1, 0.2, 6);
      if (!gone) {
        for (const z of this.foes) {
          if (z.dead || z.spawning || b.hit.has(z)) continue;
          if (Math.abs(z.x - b.x) < z.w / 2 + 6 && b.y > z.y - z.h && b.y < z.y) {
            if (b.arc) { gone = true; break; }
            b.hit.add(z);
            this.onBulletHit(b, z);
            if (b.pierce-- <= 0) { gone = true; break; }
          }
        }
      }
      if (!b.flame && !b.arc) this.fx.add({ type: 'tracer', x: ox, y: oy, x2: b.x, y2: b.y, life: 0.05, col: b.crit ? 'rgba(255,120,60,' : 'rgba(255,230,140,' });
      if (gone) {
        if (b.arc) this.explode(b.x, Math.min(b.y, FLOOR_Y - 10), b.aoe, b.dmg, false);
        else if (!b.flame && b.y >= FLOOR_Y - 2) this.fx.dust(b.x, FLOOR_Y, 0, -40, '#8a7a6a', 1, 6);
        this.bullets.splice(i, 1);
      }
    }
  }
  onBulletHit(b, z) {
    const p = this.p;
    this.damageFoe(z, b.dmg, Math.sign(b.vx) * (b.flame ? 20 : 120), b.crit);
    this.fx.blood(b.x, b.y, b.vx * 0.2, -60, b.flame ? 1 : 4);
    if (b.flame || p.burn > 0) { z.burnT = 3; z.burnDps = Math.max(z.burnDps, (b.flame ? 6 : 0) + p.burn * 5 * this.dmgFactor()); }
    if (p.frost) z.slowT = 1.6;
    if (p.explosive && Math.random() < p.explosive && !b.flame) this.explode(b.x, b.y, 85, b.dmg * 0.7, false);
    if (b.ric > 0 && !b.flame) {
      const nz = this.nearestFoe(b.x, b.y, 450, z);
      if (nz) {
        const a = Math.atan2((nz.y - nz.h * 0.55) - b.y, nz.x - b.x), sp = Math.hypot(b.vx, b.vy);
        this.bullets.push({ ...b, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ric: b.ric - 1, pierce: 0, life: 0.6, hit: new Set([z]) });
      }
    }
  }
  updateEProj(dt) {
    const p = this.p;
    for (let i = this.eproj.length - 1; i >= 0; i--) {
      const e = this.eproj[i];
      e.life -= dt; e.vy += e.g * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.kind === 'acid' && Math.random() < 0.5) this.fx.add({ type: 'mist', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.25, size: 8, drag: 1 });
      if (e.kind === 'wave' && Math.random() < 0.6) this.fx.dust(e.x, FLOOR_Y, 0, -100, '#9a8a7a', 1, 22);
      let gone = e.life <= 0 || e.x < 20 || e.x > this.room.W - 20;
      if (Math.abs(e.x - p.x) < e.r + p.w / 2 && e.y > p.y - p.h - e.r && e.y < p.y + e.r) { this.hurtPlayer(e.dmg, Math.sign(e.vx) || 1, e.kind === 'wave'); gone = true; }
      if (e.y >= FLOOR_Y && e.kind === 'acid') {
        gone = true; this.fx.sparks(e.x, FLOOR_Y, 0, -120, 8, '#9ad03a');
        if (e.pool) this.pools.push({ x: e.x, w: 70, life: 4, dmg: e.dmg * 0.6 });
      }
      if (gone) this.eproj.splice(i, 1);
    }
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pl = this.pools[i]; pl.life -= dt;
      if (Math.random() < 0.2) this.fx.add({ type: 'mist', x: pl.x + rand(-pl.w / 2, pl.w / 2), y: FLOOR_Y - 4, vx: 0, vy: -30, life: 0.5, size: 10, drag: 1 });
      if (p.onGround && p.y >= FLOOR_Y - 1 && Math.abs(p.x - pl.x) < pl.w / 2) this.hurtPlayer(pl.dmg, Math.sign(p.x - pl.x) || 1, false);
      if (pl.life <= 0) this.pools.splice(i, 1);
    }
  }

  // ===== skills with timers =====
  updateSkills(dt) {
    const p = this.p, T = p.timers, df = this.dmgFactor();
    if (this.over) return;
    // saws
    if (p.saws > 0) {
      for (let k = 0; k < p.saws; k++) {
        const a = this.t * 4 + k * TAU / p.saws;
        const sx = p.x + Math.cos(a) * 90, sy = p.y - 40 + Math.sin(a) * 70;
        for (const z of this.foes) if (!z.dead && !z.spawning && z.sawCd <= 0 && Math.abs(z.x - sx) < z.w / 2 + 16 && sy > z.y - z.h - 10 && sy < z.y + 10) {
          z.sawCd = 0.35; this.damageFoe(z, 16 * df, Math.sign(z.x - p.x) * 120, false); this.fx.sparks(sx, sy, 0, -50, 3, '#ffcf8a');
        }
      }
    }
    // drones
    if (p.drones > 0) {
      T.drone -= dt;
      if (T.drone <= 0) {
        T.drone = 0.75 / p.drones;
        const dx = p.x - p.face * 40, dy = p.y - 130 + Math.sin(this.t * 3) * 6;
        const z = this.nearestFoe(dx, dy, 800);
        if (z) {
          const a = Math.atan2(z.y - z.h * 0.6 - dy, z.x - dx);
          this.bullets.push({ x: dx, y: dy, vx: Math.cos(a) * 1200, vy: Math.sin(a) * 1200, dmg: this.hs.weapon.dmg * 0.55 * df, pierce: 0, ric: 0, life: 0.8, hit: new Set() });
          SFX.tone(1400, 0.04, 0.05, 'square', 900);
        }
      }
    }
    if (p.shock > 0) {
      T.shock -= dt;
      if (T.shock <= 0) {
        T.shock = 2.5 / p.shock;
        let px = p.x, py = p.y - 60, used = new Set();
        for (let k = 0; k < 4; k++) {
          let best = null, bd = 420;
          for (const z of this.foes) { if (z.dead || used.has(z) || z.spawning) continue; const d = Math.hypot(z.x - px, z.y - z.h / 2 - py); if (d < bd) { bd = d; best = z; } }
          if (!best) break;
          used.add(best); const zy = best.y - best.h / 2;
          this.fx.bolt(px, py, best.x, zy); px = best.x; py = zy;
          this.damageFoe(best, 30 * df, 0, false);
        }
        if (used.size) SFX.zap();
      }
    }
    if (p.grenades > 0) {
      T.grenade -= dt;
      if (T.grenade <= 0) {
        const z = this.nearestFoe(p.x, p.y - 60, 700);
        if (z) {
          T.grenade = 4 / p.grenades;
          const sx = p.x, sy = p.y - 70, Tt = 0.8;
          this.bullets.push({ x: sx, y: sy, vx: (z.x - sx) / Tt, vy: ((z.y - 30) - sy - 0.5 * PG * 0.45 * Tt * Tt) / Tt, dmg: 50 * df, arc: true, aoe: 110, pierce: 0, ric: 0, life: 2, hit: new Set(), grenade: true });
        } else T.grenade = 0.5;
      }
    }
  }

  // ===== pickups, chest, exit door =====
  updatePickups(dt) {
    const p = this.p;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const o = this.pickups[i];
      o.t += dt;
      const dx = p.x - o.x, dy = (p.y - 40) - o.y, d = Math.hypot(dx, dy);
      const mag = (this.cleared ? 2000 : 70 + p.magnet);
      if (d < mag && o.t > 0.4) { const k = this.cleared ? 900 : 600; o.vx = dx / d * k; o.vy = dy / d * k; o.y += o.vy * dt; o.x += o.vx * dt; }
      else {
        o.vy += PG * 0.6 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.98;
        if (o.y > FLOOR_Y - 8) { o.y = FLOOR_Y - 8; o.vy *= -0.35; o.vx *= 0.7; }
      }
      if (d < 36 && o.t > 0.3) {
        if (o.type === 'scrap') { const v = Math.round(o.v * p.scrapMul); this.scrap += v; SFX.coin(); }
        else { p.hp = Math.min(p.maxHp, p.hp + o.v); this.fx.text(p.x, p.y - 100, '+' + o.v, '#5fe07a', 22); SFX.tone(700, 0.15, 0.12, 'sine', 1100); }
        this.pickups.splice(i, 1);
      }
    }
    if (this.chest && !this.chest.open && Math.abs(p.x - this.chest.x) < 50 && p.onGround && p.y > FLOOR_Y - 5) {
      this.chest.open = true; SFX.buy();
      this.loot.push(this.chest.item);
      this.fx.sparks(this.chest.x, FLOOR_Y - 30, 0, -200, 20, RARITY[this.chest.item.r].color);
      this.cb.loot && this.cb.loot(this.chest.item);
    }
    // exit
    if (this.cleared && !this.leaving && (!this.chest || this.chest.open) && p.x > this.room.W - 150 && p.onGround) {
      this.leaving = true;
      if (this.n >= 15) { this.finish(true); return; }
      this.openSkills();
    }
  }

  openSkills() {
    const pool = SKILLS.filter(s => (this.skills[s.id] || 0) < s.max);
    const w = s => [10, 4.5, 1.8][s.r];
    const ch = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const tot = pool.reduce((a, s) => a + w(s), 0);
      let v = Math.random() * tot, idx = 0;
      for (; idx < pool.length; idx++) { if ((v -= w(pool[idx])) <= 0) break; }
      ch.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    this.paused = true;
    SFX.card();
    this.cb.skills && this.cb.skills(ch);
  }
  takeSkill(s) {
    this.skills[s.id] = (this.skills[s.id] || 0) + 1;
    s.apply(this.p);
    this.paused = false; this.leaving = false; this.bossSpawned = false; this.addT = undefined;
    this.enterRoom(this.n + 1);
  }

  finish(win) {
    if (this.over) return;
    this.over = win ? 'win' : 'dead';
    if (!win) { this.p.deadT = 0.001; SFX.tone(200, 0.8, 0.2, 'sawtooth', 60); this.fx.blood(this.p.x, this.p.y - 50, 0, -200, 30); }
    this.roomsCleared = win ? 15 : this.n - 1;
    setTimeout(() => this.cb.end && this.cb.end(this.summary()), win ? 600 : 1500);
  }
  summary() {
    return { win: this.over === 'win', rooms: this.roomsCleared, kills: this.kills, scrap: this.scrap, loot: this.loot, bonus: this.over === 'win' ? this.B.reward : 0 };
  }

  // ===== render =====
  render(R) {
    const g = R.g, dpr = R.dpr, W = R.W, H = R.H;
    const viewH = H < 480 ? 540 : H < 640 ? 620 : 700;
    const z = H / viewH;
    this.viewW = W / z;
    const sh = this.cam.shake;
    // keep the floor above the touch pads; follow the hero up to the shelves
    const padH = Math.min(150, H * 0.26);
    const floorCam = FLOOR_Y - (H / 2 - padH) / z;
    const wantY = Math.min(floorCam, Math.max(this.p.y - 120, H / 2 / z - 20));
    this.cam.y = lerp(this.cam.y ?? wantY, wantY, 0.08);
    const camX = this.cam.x + (Math.random() - 0.5) * sh, camY = this.cam.y + (Math.random() - 0.5) * sh;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#050304'; g.fillRect(0, 0, R.cv.width, R.cv.height);
    const ox = W / 2 - camX * z, oy = H / 2 - camY * z;
    g.setTransform(dpr * z, 0, 0, dpr * z, ox * dpr, oy * dpr);
    g.fillStyle = shade(this.B.floor, -0.6); g.fillRect(-400, ROOM_H - 2, this.room.W + 800, 500);
    g.fillStyle = '#0a0607'; g.fillRect(-400, -200, 400, ROOM_H + 700); g.fillRect(this.room.W, -200, 400, ROOM_H + 700);
    g.drawImage(this.bg, 0, 0, this.room.W, ROOM_H);
    const room = this.room, t = this.t;
    // floor decals
    for (const d of this.world.decals) {
      g.fillStyle = d.kind === 'scorch' ? `rgba(10,8,6,${d.a})` : `rgba(95,8,8,${d.a})`;
      g.beginPath(); g.ellipse(d.x, FLOOR_Y + 3, d.w, 5, 0, 0, TAU); g.fill();
    }
    for (const pl of this.pools) {
      const a = clamp(pl.life, 0, 1);
      const gg = g.createRadialGradient(pl.x, FLOOR_Y, 0, pl.x, FLOOR_Y, pl.w * 0.6);
      gg.addColorStop(0, `rgba(150,230,60,${0.8 * a})`); gg.addColorStop(1, 'rgba(150,230,60,0)');
      g.fillStyle = gg; g.beginPath(); g.ellipse(pl.x, FLOOR_Y + 2, pl.w * 0.6, 8, 0, 0, TAU); g.fill();
    }
    // doors
    PART.door(g, 90, FLOOR_Y, false, Math.max(1, this.n - 1), false, t, false);
    const nextBoss = !!roomKind(this.n + 1);
    PART.door(g, room.W - 90, FLOOR_Y, this.cleared && (!this.chest || this.chest.open), this.n + 1 > 15 ? 15 : this.n + 1, true, t, nextBoss);
    if (this.chest) PART.chest(g, this.chest.x, FLOOR_Y, this.chest.open, t, this.chest.item.r);
    // spawn markers
    for (const m of this.markers) {
      const k = 1 - m.t / m.max;
      g.fillStyle = `rgba(255,40,20,${0.25 + k * 0.4})`;
      g.beginPath(); g.ellipse(m.x, FLOOR_Y + 2, 30 + k * 20, 6, 0, 0, TAU); g.fill();
      if (m.ceil) { g.fillStyle = `rgba(255,60,30,${0.2 + k * 0.4})`; g.fillRect(m.x - 30, 48, 60, 6); }
    }
    // pickups
    for (const o of this.pickups) {
      if (o.type === 'scrap') {
        g.save(); g.translate(o.x, o.y); g.rotate(o.t * 4);
        drawIcon(g, 'scrap', 0, 0, 18, '#ffcf4a', 'rgba(60,30,0,.9)');
        g.restore();
      } else drawIcon(g, 'heart', o.x, o.y, 26, '#ff5a6a', 'rgba(60,0,0,.9)');
    }
    // foes
    for (const zf of this.foes) {
      if (zf.dead && zf !== this.boss) continue;
      if (zf.dead) continue;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(zf.x, zf.onGround ? zf.y : FLOOR_Y, zf.w * 0.6, 5, 0, 0, TAU); g.fill();
      g.save(); g.translate(zf.x, zf.y);
      if (zf.state === 'wind') g.filter = `brightness(${1.2 + Math.sin(t * 30) * 0.3}) saturate(1.6)`;
      else if (zf.flash > 0.05) g.filter = 'brightness(1.5)';
      else if (zf.slowT > 0) g.filter = 'hue-rotate(160deg) brightness(1.1)';
      ART.zombie(g, zf, true);
      g.restore();
      if (!zf.boss && zf.hp < zf.maxHp) {
        const bw = 36; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(zf.x - bw / 2, zf.y - zf.h - 14, bw, 5);
        g.fillStyle = '#e8402a'; g.fillRect(zf.x - bw / 2, zf.y - zf.h - 14, bw * clamp(zf.hp / zf.maxHp, 0, 1), 5);
      }
      if (zf.fuse >= 0) { g.fillStyle = `rgba(255,120,40,${0.4 + Math.sin(t * 40) * 0.3})`; g.beginPath(); g.arc(zf.x, zf.y - 40, 40, 0, TAU); g.fill(); }
    }
    // enemy projectiles
    for (const e of this.eproj) {
      if (e.kind === 'wave') { const gg = g.createLinearGradient(0, e.y - 30, 0, e.y + 18); gg.addColorStop(0, 'rgba(255,200,120,0)'); gg.addColorStop(1, 'rgba(255,200,120,.8)'); g.fillStyle = gg; g.beginPath(); g.moveTo(e.x - 30, FLOOR_Y); g.quadraticCurveTo(e.x, FLOOR_Y - 60, e.x + 30, FLOOR_Y); g.fill(); }
      else { g.fillStyle = '#9ad03a'; g.beginPath(); g.arc(e.x, e.y, e.r, 0, TAU); g.fill(); g.fillStyle = '#e0ff9a'; g.beginPath(); g.arc(e.x - e.r * 0.3, e.y - e.r * 0.3, e.r * 0.4, 0, TAU); g.fill(); }
    }
    // player
    const p = this.p;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(p.x, p.onGround ? p.y : FLOOR_Y, 20, 5, 0, 0, TAU); g.fill();
    g.save(); g.translate(p.x, p.y); PART.hero(g, p, t); g.restore();
    // muzzle flash
    if (this.muzzle > 0 && !this.hs.weapon.flame) {
      this.muzzle -= 1 / 60;
      const mx = p.x + p.face * 14 + Math.cos(p.aim) * 50, my = p.y - 62 + Math.sin(p.aim) * 50;
      g.globalCompositeOperation = 'lighter';
      const mg = g.createRadialGradient(mx, my, 0, mx, my, 26);
      mg.addColorStop(0, 'rgba(255,250,210,1)'); mg.addColorStop(0.4, 'rgba(255,190,80,.7)'); mg.addColorStop(1, 'rgba(255,120,0,0)');
      g.fillStyle = mg; g.fillRect(mx - 26, my - 26, 52, 52);
      g.globalCompositeOperation = 'source-over';
    }
    // saws & drones
    for (let k = 0; k < p.saws; k++) {
      const a = t * 4 + k * TAU / p.saws;
      const sx = p.x + Math.cos(a) * 90, sy = p.y - 40 + Math.sin(a) * 70;
      g.save(); g.translate(sx, sy); g.rotate(t * 25); drawIcon(g, 'saw', 0, 0, 34, '#d8dde2', 'rgba(0,0,0,.8)'); g.restore();
    }
    for (let k = 0; k < p.drones; k++) {
      const dx = p.x - p.face * (40 + k * 34), dy = p.y - 130 - k * 18 + Math.sin(t * 3 + k) * 6;
      g.fillStyle = '#2a2e34'; g.beginPath(); g.roundRect(dx - 14, dy - 6, 28, 12, 4); g.fill();
      g.fillStyle = '#5ab8ff'; g.beginPath(); g.arc(dx, dy, 3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(200,220,240,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(dx - 20 + Math.sin(t * 60) * 6, dy - 9); g.lineTo(dx - 8, dy - 9); g.moveTo(dx + 8, dy - 9); g.lineTo(dx + 20 - Math.sin(t * 60) * 6, dy - 9); g.stroke();
    }
    // player bullets (arc grenades)
    for (const b of this.bullets) if (b.arc) { g.fillStyle = b.grenade ? '#3a4a2a' : '#555'; g.beginPath(); g.arc(b.x, b.y, 7, 0, TAU); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(b.x - 2, b.y - 9, 4, 4); }
    this.fx.drawFront(g);

    // ===== lighting =====
    this.lighting(R, z, ox, oy);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (R.vig) g.drawImage(R.vig, 0, 0);
    else { R.buildSky(STAGES[0]); g.drawImage(R.vig, 0, 0); }
    if (this.hurtFlash > 0) { g.fillStyle = `rgba(200,0,0,${this.hurtFlash * 0.3})`; g.fillRect(0, 0, R.cv.width, R.cv.height); }
    if (this.introT > 0) { g.fillStyle = `rgba(0,0,0,${clamp(this.introT - 0.6, 0, 1)})`; g.fillRect(0, 0, R.cv.width, R.cv.height); }
  }

  lighting(R, z, ox, oy) {
    const D = R.dark, d = R.dg, sc = R.dpr / 2;
    const toS = (x, y) => [(x * z + ox) * sc, (y * z + oy) * sc];
    d.globalCompositeOperation = 'source-over';
    const dk = d.createLinearGradient(0, 0, 0, D.height); dk.addColorStop(0, `rgba(6,4,10,${this.B.dark + 0.12})`); dk.addColorStop(0.6, `rgba(6,4,10,${this.B.dark})`); dk.addColorStop(1, `rgba(6,4,10,${this.B.dark * 0.7})`);
    d.fillStyle = dk; d.fillRect(0, 0, D.width, D.height);
    d.globalCompositeOperation = 'destination-out';
    const glow = (x, y, r, a = 1) => {
      const [px, py] = toS(x, y), rr = r * z * sc;
      const gr = d.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    };
    const t = this.t;
    for (const l of this.room.lamps) {
      let a = 0.95;
      if (l.flick >= 0) a *= (Math.sin(t * 13 + l.flick) > -0.7 && Math.random() > 0.04) ? 1 : 0.15;
      glow(l.x, l.y + 120, 380, a * 0.9);
    }
    for (const w of this.room.windows) glow(w.x + w.w / 2, w.y + w.h / 2, 220, 0.5);
    const p = this.p;
    glow(p.x, p.y - 50, 240, 0.85);
    if (this.muzzle > 0) glow(p.x + p.face * 40, p.y - 60, 260, 0.9);
    for (const o of this.fx.p) if (o.light) glow(o.x, o.y, o.type === 'flash' ? o.size : o.type === 'fire' ? o.size * 3 : 40, 0.7 * (o.life / o.max));
    glow(this.room.W - 90, FLOOR_Y - 230, 140, 0.8);
    if (this.cleared) glow(this.room.W - 90, FLOOR_Y - 85, 260, 1);
    if (this.chest && !this.chest.open) glow(this.chest.x, FLOOR_Y - 30, 200, 0.9);
    for (const zf of this.foes) if (!zf.dead && (zf.foe === 'boomer' || zf.burnT > 0)) glow(zf.x, zf.y - 40, 110, 0.6);
    for (const e of this.eproj) glow(e.x, e.y, 70, 0.6);
    R.g.setTransform(1, 0, 0, 1, 0, 0);
    R.g.drawImage(D, 0, 0, R.cv.width, R.cv.height);
    // warm additive lamp halos
    const g = R.g;
    g.globalCompositeOperation = 'lighter';
    for (const l of this.room.lamps) {
      const [px, py] = [(l.x * z + ox) * R.dpr, ((l.y + 10) * z + oy) * R.dpr], rr = 160 * z * R.dpr;
      const gr = g.createRadialGradient(px, py, 0, px, py, rr);
      gr.addColorStop(0, rgba(this.B.light, 0.22)); gr.addColorStop(1, rgba(this.B.light, 0));
      g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
}
