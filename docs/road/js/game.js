'use strict';
// ---------- the run: simulation of one drive ----------
function buildStats(def, lv) {
  return {
    engineMul: 1, gripMul: 1,
    fuelMax: def.fuel * (1 + 0.28 * lv.fuel),
    armorMax: def.armor * (1 + 0.3 * lv.armor),
    armorRes: lv.armor * 0.07,
    nitroMax: lv.nitro > 0 ? 40 + lv.nitro * 22 : 0,
    ramMul: 1 + 0.4 * lv.ram, hitSlow: 1 - 0.1 * lv.ram,
    fireRate: 4.5 * (1 + 0.22 * lv.gun), gunDmg: 5 + lv.gun * 2.6, heatMul: 1,
    magnet: 0, scrapMul: 1, pierce: 0, killFuel: 0, regen: 0, flipBonus: false, softLanding: false,
    explodeChance: 0, rockets: 0, saw: false, shock: 0, sniper: 0, fuelUse: 1, killHeal: 0,
  };
}

class Game {
  constructor(opts) {
    this.opts = opts;
    this.demo = !!opts.demo;
    this.stage = opts.stage;
    this.world = new World(this.stage, opts.seed ?? Math.floor(Math.random() * 1e6));
    this.def = opts.vehicle;
    this.lv = opts.levels;
    this.s = buildStats(this.def, this.lv);
    applyCarParts(this.s, opts.parts);
    const sy = this.world.groundY(300) - 90;
    this.car = new Car(this.def, this.lv, this.s, 300, sy);
    this.car.rockets = 0; this.car.shock = 0; this.car.saw = false;
    this.fx = new FX(this);
    this.zombies = []; this.spawnIdx = 0;
    this.world.spawns.sort((a, b) => a.x - b.x);
    this.projectiles = []; this.spits = [];
    this.input = { gas: false, brake: false, tiltB: false, tiltF: false, boost: false };
    this.cam = { x: this.car.x + 200, y: this.car.y, z: 1, shake: 0 };
    this.t = 0; this.timeScale = 1; this.paused = false;
    this.scrap = 0; this.kills = 0; this.combo = 0; this.comboT = 0; this.bestCombo = 0;
    this.maxX = 0; this.over = null; this.overT = 0; this.endReason = null;
    this.cards = {}; this.pendingCard = null;
    this.timers = { gun: 0, rocket: 1, sniper: 0.5, shock: 1 };
    this.stuckT = 0; this.flipT = 0; this.landCd = 0;
    this.boss = null; this.bossDead = false; this.bossAnnounced = false;
    this.hint = null; this.hintT = 0;
    this.survivorPool = SURVIVORS.slice().sort(() => Math.random() - 0.5);
    for (const ev of this.world.events) if (ev.type === 'survivor') ev.who = this.survivorPool.pop() || SURVIVORS[0];
    this.callbacks = opts.callbacks || {};
    this.acc = 0;
    if (opts.parts && opts.parts.apartment && !this.demo) setTimeout(() => { if (!this.over) this.openCards(); }, 1600);
  }

  shake(a) { this.cam.shake = Math.min(30, this.cam.shake + a); }
  decal(x, w, kind) {
    const d = this.world.decals;
    if (d.length > 260) d.shift();
    d.push({ x, w, kind, a: kind === 'scorch' ? 0.55 : rand(0.5, 0.85), seed: Math.random() });
  }
  say(text, t = 2.2) { this.hint = text; this.hintT = t; }

  // ===== main update =====
  update(dt) {
    if (this.paused) return;
    dt *= this.timeScale;
    this.t += dt;
    const car = this.car, w = this.world, s = this.s;
    if (this.demo) { const sl = Math.atan(w.slope(car.x)); this.input.gas = car.grounded || car.a > -0.2; this.input.brake = false; this.input.boost = false; this.input.tiltB = !car.grounded && car.a > 0.3; this.input.tiltF = !car.grounded && car.a < -0.35; }
    const input = this.over ? { gas: false, brake: false, tiltB: false, tiltF: false, boost: false } : this.input;

    // physics substeps
    this.acc += dt;
    const h = 1 / 120;
    let steps = 0;
    while (this.acc >= h && steps < 8) { car.step(h, input, w, this); this.acc -= h; steps++; }
    if (steps === 8) this.acc = 0;
    this.landCd -= dt;
    car.muzzle = Math.max(0, car.muzzle - dt);

    // wheel dust
    if (car.grounded && Math.abs(car.speed) > 150) {
      for (const wh of car.wheels) if (wh.ground && Math.random() < 0.5) {
        const [wx, wy] = car.toWorld(wh.lx, wh.ly + this.def.wheelR);
        this.fx.dust(wx, wy, -car.vx * 0.15, 0, this.stage.topColor, 1, 10 + Math.abs(car.speed) / 80);
      }
    }
    if (car.boosting) {
      const [ex, ey] = car.toWorld(-this.def.len * 0.5 - 30, this.def.h * 0.05);
      this.fx.fire(ex, ey, 1, 10);
      this.shake(0.6);
    }
    // smoke when damaged
    const hpFrac = car.hp / s.armorMax;
    car.damage = 1 - hpFrac;
    if (hpFrac < 0.4 && Math.random() < (0.5 - hpFrac)) {
      const [hx, hy] = car.toWorld(this.def.len * 0.35, -this.def.h * 0.2);
      this.fx.smoke(hx, hy, 1, 0.3 + (0.4 - hpFrac), 14);
      if (hpFrac < 0.15 && Math.random() < 0.4) this.fx.fire(hx, hy, 1, 10);
    }
    // regen
    if (s.regen > 0 && car.hp > 0 && !this.over) car.hp = Math.min(s.armorMax, car.hp + s.regen * dt);

    this.maxX = Math.max(this.maxX, car.x);
    this.updateSpawns();
    this.updateZombies(dt);
    this.updateObstacles(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateEvents(dt);
    this.fx.update(dt);
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 0;
    this.hintT -= dt;
    this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt * 2.5);
    this.checkEnd(dt);
    this.updateCamera(dt);
    // car blood splats fade a bit
    for (const sp of car.splats) sp.drip = Math.min(sp.drip + dt * 6, sp.r * 2.2);
  }

  updateCamera(dt) {
    const c = this.cam, car = this.car;
    const look = clamp(car.vx * 0.35, -250, 450);
    const tx = car.x + 230 + look;
    const ty = car.y - 70 + clamp(car.vy * 0.12, -80, 120);
    const k = 1 - Math.pow(0.002, dt);
    c.x = lerp(c.x, tx, k); c.y = lerp(c.y, ty, k * 0.8);
    const sp = Math.hypot(car.vx, car.vy);
    const tz = 1 - clamp(sp / (34 * PX), 0, 1) * 0.16 - (this.boss && !this.bossDead && Math.abs(this.boss.x - car.x) < 1200 ? 0.1 : 0);
    c.z = lerp(c.z, tz, 1 - Math.pow(0.2, dt));
    c.shake *= Math.pow(0.004, dt);
  }

  // ===== spawning =====
  updateSpawns() {
    const sp = this.world.spawns;
    const right = this.cam.x + 1900;
    while (this.spawnIdx < sp.length && sp[this.spawnIdx].x < right) {
      const s = sp[this.spawnIdx++];
      if (this.demo && s.boss) continue;
      this.zombies.push(this.makeZombie(s.type, s.x, s.boss));
    }
    // cull behind
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dead || (z.x < this.car.x - 2200 && z.state !== 'cling' && !z.boss)) this.zombies.splice(i, 1);
    }
  }

  makeZombie(type, x, boss) {
    const def = ZOMBIES[type];
    const shirts = ['#6a5a4a', '#4a5a6a', '#7a3a3a', '#5a6a4a', '#8a7a5a', '#3a3a4a', '#9a8a7a', '#5a4a6a', '#a05a2a'];
    const pants = ['#2a3040', '#3a3a3a', '#4a4030', '#30302a', '#2a2a3a'];
    const hair = [null, '#1a1410', '#3a2a1a', '#5a5a5a', null];
    const z = {
      type, x, y: this.world.groundY(x), vx: 0, vy: 0, hp: boss ? this.stage.bossHp : def.hp, maxHp: boss ? this.stage.bossHp : def.hp,
      dir: -1, phase: rand(0, TAU), t: rand(0, 10), seed: rand(0, 10), scale: boss ? 1 : rand(0.92, 1.1),
      skin: pick(def.color), shirt: type === 'brute' ? '#4a3a2a' : pick(shirts), pants: pick(pants), hair: pick(hair),
      state: 'walk', grounded: true, attack: 0, hitCd: 0, stun: 0, cd: rand(1, 3), boss: !!boss, lx: 0, ly: 0, aggro: false,
    };
    if (boss) this.boss = z;
    return z;
  }

  // ===== zombies =====
  updateZombies(dt) {
    const car = this.car, w = this.world, s = this.s;
    const L = this.def.len, H = this.def.h;
    for (const z of this.zombies) {
      if (z.dead) continue;
      const def = ZOMBIES[z.type];
      z.t += dt; z.hitCd -= dt; z.stun -= dt; z.attack -= dt; z.cd -= dt;
      if (z.state === 'cling') {
        const [wx, wy] = car.toWorld(z.lx, z.ly);
        z.x = wx; z.y = wy; z.dir = -1;
        z.phase += dt * 10;
        z.attack = 0.3;
        if (!this.demo) car.hp -= 3 * dt * (1 - s.armorRes);
        if (Math.random() < dt * 2) this.fx.sparks(wx, wy - 20, car.vx, car.vy, 2, '#ffaa66');
        if (Math.abs(car.w) > 3.2 || car.lastImpactSpeed > 380 || (car.roofHit)) {
          z.state = 'walk'; z.vx = car.vx * 0.6 + rand(-200, 200); z.vy = -350; z.grounded = false; z.hp -= 6;
          if (z.hp <= 0) this.killZombie(z, z.vx, z.vy);
        }
        continue;
      }
      // ground physics
      if (!z.grounded) {
        z.vy += GRAV * dt; z.x += z.vx * dt; z.y += z.vy * dt;
        const gy = w.groundY(z.x);
        if (z.y >= gy) {
          z.y = gy; z.grounded = true;
          if (z.vy > 700 && !z.boss) { z.hp -= 10; if (z.hp <= 0) { this.killZombie(z, z.vx, -200); continue; } }
          z.vy = 0;
        }
      } else {
        const dx = car.x - z.x;
        const near = Math.abs(dx) < (z.boss ? 1600 : 1100);
        if (near && !z.aggro) { z.aggro = true; if (Math.random() < 0.3) SFX.groan(); }
        let target = 0;
        if (z.stun <= 0 && z.aggro) {
          z.dir = dx < 0 ? -1 : 1;
          target = z.dir * def.speed * PX * (z.boss && Math.abs(dx) < 600 ? 1.6 : 1);
        } else if (!z.aggro) { target = Math.sin(z.t * 0.3 + z.seed) * 10; }
        z.vx = lerp(z.vx, target, 1 - Math.pow(0.02, dt));
        z.x += z.vx * dt;
        z.y = w.groundY(z.x);
        z.phase += dt * (2 + Math.abs(z.vx) / 18);
        // clinger leap
        if (z.type === 'clinger' && z.cd <= 0 && dx < 0 && -dx < 260 && -dx > 60 && Math.abs(car.speed) < 22 * PX) {
          z.cd = 2.5; z.grounded = false; z.vy = -560; z.vx = (car.x - z.x) * 1.6 + car.vx * 0.8;
        }
        // spitter
        if (z.type === 'spitter' && z.cd <= 0 && dx < -180 && dx > -900) {
          z.cd = rand(2.2, 3.2);
          const tt = 0.9, px = car.x + car.vx * tt, py = car.y + car.vy * tt * 0.4 - 30;
          const sx = z.x + 10 * z.dir, sy = z.y - def.h * 0.85;
          this.spits.push({ x: sx, y: sy, vx: (px - sx) / tt, vy: (py - sy - 0.5 * GRAV * 0.6 * tt * tt) / tt, life: 3 });
          z.attack = 0.4;
        }
        // boss attacks
        if (z.boss) this.bossAI(z, dt, dx);
      }
      // collision with car
      if (Math.abs(z.x - car.x) < L + 120) this.collideZombie(z, dt, L, H);
    }
  }

  bossAI(z, dt, dx) {
    const car = this.car;
    if (!this.bossAnnounced && Math.abs(dx) < 1500) {
      this.bossAnnounced = true; SFX.roar(); this.shake(14);
      this.say('⚠ العملاق جاي! دوس بنزين واخبطه، أو ارجع لورا وخد مسافة', 3.5);
      this.callbacks.boss && this.callbacks.boss(true);
    }
    // ground stomp: shockwave lifts car if near
    if (z.cd <= 0 && Math.abs(dx) < 420 && z.stun <= 0) {
      z.cd = rand(2.6, 3.6); z.attack = 0.7;
      setTimeout(() => {
        if (z.dead || this.over) return;
        this.fx.add({ type: 'ring', x: z.x, y: z.y, life: 0.5, size: 380 });
        this.fx.dust(z.x, z.y, 0, -50, this.stage.topColor, 18, 30);
        this.shake(18); SFX.thud();
        if (Math.abs(car.x - z.x) < 420 && car.grounded) {
          car.vy -= 520; car.w += (car.x < z.x ? -2.5 : 2.5); car.vx += (car.x < z.x ? -250 : 250);
          if (!this.demo) this.damageCar(12);
        }
      }, 450);
    }
  }

  collideZombie(z, dt, L, H) {
    const car = this.car, s = this.s, def = ZOMBIES[z.type];
    const zh = def.h * z.scale;
    const [lx, ly] = car.toLocal(z.x, z.y - zh / 2);
    const frontExt = (this.lv.ram > 0 ? 18 + this.lv.ram * 4 : 0) + (s.saw ? 26 : 0);
    const hx = L / 2 + def.w / 2 + (lx > 0 ? frontExt : 0), hy = H / 2 + zh / 2 + 4;
    if (Math.abs(lx) > hx || Math.abs(ly) > hy) return;
    const front = lx > L * 0.3;
    const relV = Math.hypot(car.vx - z.vx, (car.vy - z.vy) * 0.6);
    const sawing = s.saw && front;

    // clinger latch
    if (z.type === 'clinger' && !z.grounded && z.state !== 'cling' && ly < 0 && relV < 26 * PX) {
      const S = SHAPES[this.def.style];
      z.state = 'cling'; z.lx = clamp(lx, -L * 0.35, L * 0.25); z.ly = S.roof[1] * H + 4;
      this.say('زومبي نط على العربية! اتشقلب أو اخبط عشان توقعه', 2.4);
      return;
    }

    if (z.boss) { this.collideBoss(z, relV, lx); return; }

    if (z.hitCd > 0) return;
    const killV = 3.2 * PX;
    if (relV > killV || sawing) {
      const dmg = (relV / PX) * 4.2 * s.ramMul * (front ? 1 : 0.6) + (sawing ? 60 * dt * 10 : 0);
      z.hp -= dmg; z.hitCd = 0.2;
      // momentum loss
      const f = def.mass / (this.def.mass + def.mass) * s.hitSlow * (relV > killV ? 1 : 0.2);
      car.vx *= 1 - f; car.vy *= 1 - f * 0.4;
      if (!this.demo) this.damageCar(def.dmg * 0.16 * (front && this.lv.ram > 0 ? 0.45 : 1), true);
      if (z.hp <= 0) {
        this.killZombie(z, car.vx * 1.15 + 60, car.vy - 260 - relV * 0.2);
        this.shake(2 + def.mass * 10);
      } else {
        z.vx = car.vx * 1.1 + 120 * sign(car.vx); z.vy = -320; z.grounded = false; z.stun = 0.8;
        this.fx.blood(z.x, z.y - zh * 0.6, car.vx, -100, 8);
        SFX.thud();
      }
    } else {
      // slow contact: zombie claws at the car
      z.attack = 0.4;
      if (!this.demo) this.damageCar(def.dmg * dt * 0.9, true);
      car.vx *= 1 - dt * def.mass * 4;
      // keep it pressed against the car front/back
      z.x += (lx > 0 ? 1 : -1) * 40 * dt;
    }
  }

  collideBoss(z, relV, lx) {
    const car = this.car, s = this.s;
    if (z.hitCd > 0) return;
    z.hitCd = 0.5;
    const push = lx > 0 ? -1 : 1; // push car away from boss
    if (relV > 6 * PX) {
      const dmg = (relV / PX) * 7 * s.ramMul + (s.saw ? 40 : 0);
      z.hp -= dmg; z.stun = 0.9;
      this.fx.blood(z.x, z.y - 120, car.vx, -200, 30);
      this.fx.sparks(car.x + push * -this.def.len / 2, car.y, 0, -100, 14);
      this.fx.text(z.x, z.y - 220, '-' + Math.round(dmg), '#ff5a3a', 30);
      SFX.crash(); this.shake(22);
      car.vx = push * (Math.abs(car.vx) * 0.35 + 260); car.vy -= 260; car.w += push * 1.5;
      z.x -= push * 40;
      if (!this.demo) this.damageCar(16);
      if (z.hp <= 0) this.killBoss(z);
    } else {
      // punch!
      z.attack = 0.6;
      car.vx = push * 560; car.vy = -420; car.w += push * 3;
      SFX.crash(); this.shake(18);
      if (!this.demo) this.damageCar(26);
      this.fx.sparks(car.x, car.y - 20, push * 200, -200, 12);
    }
  }

  killBoss(z) {
    z.dead = true; this.bossDead = true;
    this.fx.explosion(z.x, z.y - 100, 200);
    for (let k = 0; k < 4; k++) this.fx.gibsFrom(z, rand(-400, 400), -500);
    this.fx.blood(z.x, z.y - 100, 0, -300, 60);
    this.addScrap(ZOMBIES.brute.scrap, z.x, z.y - 200);
    this.kills++;
    SFX.boom(); SFX.roar();
    this.timeScale = 0.3;
    setTimeout(() => { this.timeScale = 1; }, 900);
    this.say('🏆 العملاق وقع! المرحلة خلصت', 3);
    this.callbacks.boss && this.callbacks.boss(false);
  }

  killZombie(z, vx, vy) {
    if (z.dead) return;
    z.dead = true;
    const def = ZOMBIES[z.type], car = this.car, s = this.s;
    this.fx.gibsFrom(z, vx, vy);
    this.fx.blood(z.x, z.y - def.h * 0.5, vx, vy, 18);
    this.decal(z.x + rand(-20, 40), rand(20, 46), 'blood');
    SFX.splat();
    // splat on car
    if (Math.abs(z.x - car.x) < this.def.len) {
      const [lx, ly] = car.toLocal(z.x, z.y - def.h * 0.5);
      if (car.splats.length > 40) car.splats.shift();
      car.splats.push({ x: clamp(lx, -this.def.len / 2, this.def.len / 2), y: clamp(ly, -this.def.h / 2, this.def.h / 2), r: rand(5, 13), rot: rand(0, 3), a: rand(0.5, 0.85), drip: 0 });
    }
    this.kills++;
    this.combo++; this.comboT = 1.6; this.bestCombo = Math.max(this.bestCombo, this.combo);
    let val = def.scrap;
    if (this.combo >= 5) { val += Math.min(4, Math.floor(this.combo / 5)); }
    this.addScrap(val, z.x, z.y - def.h - 10);
    if (this.combo >= 5 && this.combo % 5 === 0) this.fx.text(car.x, car.y - 120, `كومبو ×${arNum(this.combo)}`, '#ff8a3a', 34);
    if (s.killFuel) car.fuel = Math.min(s.fuelMax, car.fuel + s.killFuel);
    if (s.killHeal) car.hp = Math.min(s.armorMax, car.hp + s.killHeal);
    if (z.type === 'boomer') this.explode(z.x, z.y - 40, 150, 70, 0.3);
    else if (s.explodeChance && Math.random() < s.explodeChance) this.explode(z.x, z.y - 40, 120, 50, false);
  }

  addScrap(v, x, y) {
    if (this.demo) return;
    const val = Math.max(1, Math.round(v * this.s.scrapMul));
    this.scrap += val;
    this.fx.text(x, y, '+' + val, '#ffd23a', 18 + Math.min(14, val));
  }

  damageCar(d, silent) {
    const car = this.car;
    if (this.over || this.demo) return;
    car.hp -= d * (1 - this.s.armorRes);
    if (!silent && d > 4) { this.hurtFlash = Math.min(1, (this.hurtFlash || 0) + d / 25); }
  }

  explode(x, y, r, dmg, hurtsCar) {
    this.fx.explosion(x, y, r);
    SFX.boom();
    for (const z of this.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - x, z.y - 40 - y);
      if (d < r) {
        const f = 1 - d / r;
        z.hp -= dmg * (0.4 + f);
        if (z.hp <= 0) { if (z.boss) this.killBoss(z); else this.killZombie(z, (z.x - x) * 4, -500 * f - 200); }
        else if (!z.boss) { z.grounded = false; z.vy = -300 * f; z.vx += (z.x - x) * 3; z.stun = 0.6; }
      }
    }
    for (const o of this.world.obstacles) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - x, o.y - y);
      if (d < r) { o.hit = true; o.vx += (o.x - x) * 6; o.vy -= 500 * (1 - d / r); o.va = rand(-10, 10); if (o.explosive && !o.fuse) o.fuse = 0.15; }
    }
    const car = this.car;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < r * 1.4) {
      const f = 1 - d / (r * 1.4);
      car.vx += (car.x - x) / (d + 1) * 500 * f; car.vy -= 500 * f; car.w += rand(-2, 2) * f;
      if (hurtsCar) this.damageCar(dmg * hurtsCar * f);
    }
  }

  // ===== obstacles =====
  updateObstacles(dt) {
    const car = this.car, w = this.world, L = this.def.len, H = this.def.h;
    for (const o of w.obstacles) {
      if (o.dead) continue;
      if (Math.abs(o.x - car.x) > 2200) continue;
      if (o.fuse !== undefined && o.fuse !== null) {
        o.fuse -= dt;
        if (o.fuse <= 0) { o.dead = true; this.explode(o.x, o.y, 160, 80, 0.05); continue; }
      }
      if (o.hit) {
        o.life += dt;
        o.vy += GRAV * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
        const gy = w.groundY(o.x) - o.h / 2;
        if (o.y > gy) { o.y = gy; o.vy *= -0.3; o.vx *= 0.75; o.va *= 0.6; }
        // flying debris kills zombies
        if (Math.hypot(o.vx, o.vy) > 300) {
          for (const z of this.zombies) {
            if (z.dead || z.boss || z.state === 'cling') continue;
            if (Math.abs(z.x - o.x) < 30 && Math.abs(z.y - ZOMBIES[z.type].h / 2 - o.y) < 50) { z.hp -= 30; if (z.hp <= 0) this.killZombie(z, o.vx, o.vy - 200); }
          }
        }
        if (o.life > 4) o.dead = true;
        continue;
      }
      // contact with car
      const [lx, ly] = car.toLocal(o.x, o.y);
      const hx = L / 2 + o.w / 2 + (lx > 0 && this.lv.ram > 0 ? 16 : 0), hy = H / 2 + o.h / 2;
      if (Math.abs(lx) < hx && Math.abs(ly) < hy) {
        const relV = Math.hypot(car.vx, car.vy);
        if (relV > 240) {
          o.hit = true;
          o.vx = car.vx * 1.25 + rand(-60, 60); o.vy = -260 - relV * 0.25 + rand(-80, 0); o.va = rand(-12, 12);
          const f = o.mass / (this.def.mass + o.mass) * this.s.hitSlow;
          car.vx *= 1 - f;
          this.damageCar(o.dmg * 0.5 * (this.lv.ram > 0 ? 0.5 : 1));
          SFX.crash(); this.shake(5);
          const col = { crate: '#9a7040', barrel: '#a02a1a', barricade: '#e8e0d0', tires: '#1a1a1a' }[o.type];
          this.fx.debris(o.x, o.y, car.vx, -200, col, o.type === 'crate' ? 10 : 5, o.type === 'crate' ? 16 : 10);
          this.fx.dust(o.x, o.y, car.vx * 0.2, -40, this.stage.topColor, 4, 16);
          if (o.type === 'crate') { o.dead = true; if (Math.random() < 0.6) this.addScrap(8, o.x, o.y - 30); }
          if (o.explosive) o.fuse = 0.18;
        } else {
          // push slowly
          o.x += (lx > 0 ? 1 : -1) * Math.max(0, hx - Math.abs(lx)) * 0.5;
          o.y = w.groundY(o.x) - o.h / 2;
          car.vx *= 1 - dt * 3 * o.mass / this.def.mass;
        }
      }
    }
  }

  // ===== weapons =====
  findTarget(range, filter, score) {
    const car = this.car;
    let best = null, bs = Infinity;
    for (const z of this.zombies) {
      if (z.dead || z.state === 'cling') continue;
      if (filter && !filter(z)) continue;
      const dx = z.x - car.x, dy = z.y - car.y;
      const d = Math.hypot(dx, dy);
      if (d > range) continue;
      const sc = score ? score(z, d) : d;
      if (sc < bs) { bs = sc; best = z; }
    }
    return best;
  }

  updateWeapons(dt) {
    const car = this.car, s = this.s, def = this.def, S = SHAPES[def.style];
    if (this.over) return;
    car.heat = Math.max(0, car.heat - dt * 0.32);
    if (car.overheat && car.heat < 0.3) car.overheat = false;
    // turret
    if (this.lv.gun > 0) {
      const [gx, gy] = car.toWorld(S.roof[0] * def.len, S.roof[1] * def.h - 14);
      const tgt = this.findTarget(1000, z => z.x > car.x - 80, (z, d) => d - (z.boss ? 300 : 0) - (z.type === 'spitter' || z.type === 'boomer' ? 150 : 0));
      let want = -0.05;
      if (tgt) {
        const tz = ZOMBIES[tgt.type];
        const aim = Math.atan2(tgt.y - tz.h * tgt.scale * 0.6 - gy, tgt.x - gx) - car.a;
        want = clamp(Math.atan2(Math.sin(aim), Math.cos(aim)), -1.7, 0.45);
      }
      car.gunAngle += clamp(want - car.gunAngle, -dt * 7, dt * 7);
      this.timers.gun -= dt;
      if (tgt && !car.overheat && this.timers.gun <= 0 && Math.abs(want - car.gunAngle) < 0.2) {
        this.timers.gun = 1 / s.fireRate;
        this.fireBullet(gx, gy, car.a + car.gunAngle + rand(-0.03, 0.03), s.gunDmg, 1 + s.pierce, 1050);
        car.muzzle = 0.05;
        car.heat += 0.03 * s.heatMul;
        if (car.heat >= 1) { car.overheat = true; car.heat = 1; this.fx.smoke(gx, gy, 3, 0.2, 10); }
        this.fx.add({ type: 'shell', x: gx, y: gy, vx: car.vx - 60, vy: car.vy - 200, life: 0.8, grav: GRAV, drag: 0.2 });
        SFX.gun();
      }
    }
    // rockets
    if (s.rockets > 0) {
      this.timers.rocket -= dt;
      if (this.timers.rocket <= 0) {
        const tgt = this.findTarget(1200, z => z.x > car.x, (z, d) => -z.hp * 10 + d);
        if (tgt) {
          this.timers.rocket = 3.5 / s.rockets;
          const [rx, ry] = car.toWorld(S.roof[0] * def.len - 30, S.roof[1] * def.h - 10);
          this.projectiles.push({ type: 'rocket', x: rx, y: ry, vx: car.vx + 100, vy: -500, target: tgt, life: 3 });
          SFX.rocket();
        } else this.timers.rocket = 0.3;
      }
    }
    // sniper survivor
    if (s.sniper > 0) {
      this.timers.sniper -= dt;
      if (this.timers.sniper <= 0) {
        const prio = { clinger: 0, boomer: 1, spitter: 2 };
        const tgt = this.zombies.find(z => !z.dead && z.state === 'cling') ||
          this.findTarget(1000, z => z.x > car.x - 200, (z, d) => (prio[z.type] ?? 4) * 1000 + d);
        if (tgt) {
          this.timers.sniper = 1.4 / s.sniper;
          const [sx, sy] = car.toWorld(0, -def.h * 0.25);
          const ty = tgt.y - ZOMBIES[tgt.type].h * 0.75;
          this.fx.tracer(sx, sy, tgt.x, ty, 'rgba(200,230,255,');
          this.hitZombie(tgt, 45, Math.cos(Math.atan2(ty - sy, tgt.x - sx)) * 400, -150);
          SFX.sniper();
        } else this.timers.sniper = 0.3;
      }
    }
    // shock coil
    if (s.shock > 0) {
      this.timers.shock -= dt;
      if (this.timers.shock <= 0) {
        this.timers.shock = 2 / s.shock;
        const near = this.zombies.filter(z => !z.dead && Math.hypot(z.x - car.x, z.y - car.y) < 300).sort((a, b) => Math.abs(a.x - car.x) - Math.abs(b.x - car.x)).slice(0, 3);
        if (near.length) {
          const [cx, cy] = car.toWorld(-def.len * 0.38, -def.h * 0.15 - 26);
          let px = cx, py = cy;
          for (const z of near) {
            const zy = z.y - ZOMBIES[z.type].h * 0.5;
            this.fx.bolt(px, py, z.x, zy); px = z.x; py = zy;
            this.fx.sparks(z.x, zy, 0, -50, 5, '#9fe0ff');
            if (z.state === 'cling') { z.state = 'walk'; z.grounded = false; z.vy = -200; }
            this.hitZombie(z, 35, 0, -100);
          }
          SFX.zap();
        }
      }
    }
  }

  hitZombie(z, dmg, vx, vy) {
    z.hp -= dmg;
    const h = ZOMBIES[z.type].h;
    this.fx.blood(z.x, z.y - h * 0.65, vx * 0.5, vy, 4);
    if (z.hp <= 0) { if (z.boss) this.killBoss(z); else this.killZombie(z, vx, vy); }
    else if (!z.boss && z.state !== 'cling') { z.stun = 0.15; z.x += sign(vx) * 4; }
  }

  fireBullet(x, y, ang, dmg, pierce, range) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const hits = [];
    for (const z of this.zombies) {
      if (z.dead || z.state === 'cling') continue;
      const h = ZOMBIES[z.type].h * z.scale;
      const cx = z.x, cy = z.y - h * 0.55;
      const t = (cx - x) * dx + (cy - y) * dy;
      if (t < 0 || t > range) continue;
      const px = x + dx * t, py = y + dy * t;
      const rad = z.boss ? 70 : Math.max(16, h * 0.4);
      if (Math.abs(px - cx) < ZOMBIES[z.type].w * 0.7 + 6 && Math.abs(py - cy) < rad) hits.push([t, z]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    let endT = range;
    for (let i = 0; i < hits.length && i < pierce; i++) {
      const [t, z] = hits[i];
      this.hitZombie(z, dmg, dx * 300, -80);
      endT = t;
      if (z.boss) break;
    }
    // ground hit
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const t = endT * i / steps, px = x + dx * t, py = y + dy * t;
      if (py > this.world.groundY(px)) { endT = t; this.fx.dust(px, py, 0, -30, this.stage.topColor, 1, 6); break; }
    }
    this.fx.tracer(x + dx * 30, y + dy * 30, x + dx * endT, y + dy * endT);
  }

  updateProjectiles(dt) {
    const car = this.car, w = this.world;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      const t = p.target;
      if (t && !t.dead) {
        const ty = t.y - ZOMBIES[t.type].h * 0.5;
        const a = Math.atan2(ty - p.y, t.x - p.x);
        const sp = Math.min(1400, Math.hypot(p.vx, p.vy) + 1600 * dt);
        const ca = Math.atan2(p.vy, p.vx);
        let da = Math.atan2(Math.sin(a - ca), Math.cos(a - ca));
        const na = ca + clamp(da, -6 * dt, 6 * dt);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      } else p.vy += GRAV * 0.3 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      this.fx.smoke(p.x, p.y, 1, 0.2, 8);
      this.fx.fire(p.x, p.y, 1, 6);
      let boom = p.life <= 0 || p.y > w.groundY(p.x);
      if (t && !t.dead && Math.hypot(t.x - p.x, t.y - ZOMBIES[t.type].h * 0.5 - p.y) < 40) boom = true;
      if (boom) { this.explode(p.x, p.y, 130, 80, false); this.projectiles.splice(i, 1); }
    }
    for (let i = this.spits.length - 1; i >= 0; i--) {
      const p = this.spits[i];
      p.life -= dt; p.vy += GRAV * 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (Math.random() < 0.6) this.fx.add({ type: 'mist', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, size: 8, drag: 1 });
      const [lx, ly] = car.toLocal(p.x, p.y);
      let gone = p.life <= 0 || p.y > w.groundY(p.x);
      if (Math.abs(lx) < this.def.len / 2 && Math.abs(ly) < this.def.h / 2 + 8) {
        gone = true; this.damageCar(8);
        this.fx.sparks(p.x, p.y, 0, -100, 10, '#9ad03a');
        if (car.splats.length > 40) car.splats.shift();
        car.splats.push({ x: lx, y: ly, r: 9, rot: 0, a: 0.6, drip: 0 });
      }
      if (gone) { this.fx.sparks(p.x, p.y, 0, -150, 8, '#9ad03a'); this.spits.splice(i, 1); }
    }
  }

  // ===== pickups / events =====
  updatePickups(dt) {
    const car = this.car, s = this.s;
    for (const p of this.world.pickups) {
      if (p.got) continue;
      if (p.y === null) p.y = this.world.groundY(p.x) - 40;
      const dx = car.x - p.x, dy = car.y - p.y;
      const d = Math.hypot(dx, dy);
      if (s.magnet && d < 120 + s.magnet && p.type === 'scrap') { p.x += dx * dt * 6; p.y += dy * dt * 6; }
      if (d < 90) {
        p.got = true;
        if (p.type === 'scrap') { this.addScrap(p.v, p.x, p.y - 20); SFX.coin(); this.fx.sparks(p.x, p.y, 0, -60, 5); }
        if (p.type === 'fuel') { car.fuel = Math.min(s.fuelMax, car.fuel + s.fuelMax * 0.35); this.fx.text(p.x, p.y - 30, '+ بنزين', '#ff9a3a', 26); SFX.fuel(); }
      }
    }
  }

  updateEvents(dt) {
    if (this.demo) return;
    const car = this.car;
    for (const ev of this.world.events) {
      if (ev.done) continue;
      if (ev.type === 'card' && car.x > ev.x - 20 && Math.abs(car.y - this.world.groundY(ev.x)) < 400) {
        ev.done = true; this.openCards();
      }
      if (ev.type === 'survivor') {
        const dx = Math.abs(car.x - ev.x);
        if (dx < 600 && dx > 160 && car.x < ev.x && !ev.warned) { ev.warned = true; this.say(`${ev.who.name} ${ev.who.f ? 'مستنية' : 'مستني'}! هدّي ${ev.who.f ? 'جنبها عشان تاخدها' : 'جنبه عشان تاخده'}`, 2.6); }
        if (dx < 150 && Math.abs(car.speed) < 7 * PX && car.grounded) {
          ev.wait += dt;
          if (ev.wait > 0.6) this.rescue(ev);
        } else ev.wait = Math.max(0, ev.wait - dt);
      }
    }
  }

  rescue(ev) {
    ev.done = true;
    const car = this.car;
    SFX.rescue();
    if (car.survivors.length < this.def.seats) {
      car.survivors.push(ev.who);
      ev.who.apply(this.s);
      this.say(`✔ ${ev.who.name} ${ev.who.f ? 'ركبت' : 'ركب'} معاك: ${ev.who.desc}`, 3.2);
      this.fx.text(ev.x, car.y - 140, 'اتنقذ!', '#7dff9a', 32);
      this.callbacks.update && this.callbacks.update();
    } else {
      this.addScrap(120, ev.x, car.y - 140);
      this.say(`مفيش كرسي فاضي، بس ${ev.who.name} ${ev.who.f ? 'ادتك سكراب وشكرتك' : 'اداك سكراب وشكرك'}`, 3);
    }
  }

  openCards() {
    const pool = CARDS.filter(c => (this.cards[c.id] || 0) < c.max);
    const choices = [];
    const weights = c => [10, 4.5, 1.6][c.r];
    for (let k = 0; k < 3 && pool.length; k++) {
      const tot = pool.reduce((a, c) => a + weights(c), 0);
      let v = Math.random() * tot, idx = 0;
      for (; idx < pool.length; idx++) { v -= weights(pool[idx]); if (v <= 0) break; }
      choices.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    this.paused = true;
    SFX.card();
    this.callbacks.cards && this.callbacks.cards(choices);
  }
  takeCard(c) {
    this.cards[c.id] = (this.cards[c.id] || 0) + 1;
    c.apply(this.s, this);
    this.car.rockets = this.s.rockets; this.car.shock = this.s.shock; this.car.saw = this.s.saw;
    if (c.id === 'plate') { /* hp already applied */ }
    this.paused = false;
    this.fx.text(this.car.x, this.car.y - 150, c.name, ['#ffffff', '#5ab8ff', '#d77dff'][c.r], 30);
  }

  onFlip() {
    if (this.demo) return;
    SFX.flip();
    this.fx.text(this.car.x, this.car.y - 130, 'شقلبة!', '#7df0ff', 34);
    this.addScrap(this.s.flipBonus ? 40 : 15, this.car.x, this.car.y - 100);
    if (this.s.flipBonus) this.car.nitro = this.s.nitroMax;
  }
  onHardLanding(v) {
    if (this.landCd > 0) return;
    this.landCd = 0.4;
    const car = this.car;
    this.shake(Math.min(14, v / 80));
    SFX.thud();
    const [bx, by] = car.toWorld(0, this.def.h / 2 + 10);
    this.fx.dust(bx, by, car.vx * 0.2, -40, this.stage.topColor, 8, 22);
    if (this.s.softLanding) { car.nitro = Math.min(this.s.nitroMax, car.nitro + 12); return; }
    if (v > 650) this.damageCar((v - 650) / 30);
    if (car.roofHit && v > 300) { this.damageCar(8); this.fx.sparks(car.x, car.y - 30, car.vx, -100, 10); }
  }

  checkEnd(dt) {
    if (this.over) { this.overT += dt; return; }
    const car = this.car;
    if (this.demo) {
      if (car.x > this.world.lengthPx - 1500 || (Math.abs(car.speed) < 20 && this.t > 4)) this.stuckT += dt; else this.stuckT = 0;
      if (car.hp < 1) car.hp = this.s.armorMax;
      car.fuel = this.s.fuelMax;
      if (this.stuckT > 1.5 || Math.cos(car.a) < -0.3 && car.grounded) this.callbacks.restartDemo && this.callbacks.restartDemo();
      return;
    }
    if (car.hp <= 0) {
      car.hp = 0;
      this.fx.explosion(car.x, car.y, 160); SFX.boom();
      car.vy -= 500; car.w += rand(-4, 4);
      return this.finish('destroyed');
    }
    const upside = Math.cos(car.a) < 0.1;
    if (upside && Math.hypot(car.vx, car.vy) < 160) this.flipT += dt; else this.flipT = 0;
    // flip-back: when stuck on the roof, a tilt press rolls the car back (costs health)
    if (this.flipT > 0.5) {
      if (!this.flipHinted) { this.flipHinted = true; this.say('العربية اتقلبت! دوس ↺ أو ↻ بسرعة عشان تعدلها', 2.5); }
      if (this.input.tiltB || this.input.tiltF) {
        const dir = this.input.tiltF ? 1 : -1;
        car.vy = -620; car.y -= 10; car.w = dir * 6.2; car.vx += dir * 60;
        this.flipT = 0; this.flipHinted = false; this.damageCar(this.s.armorMax * 0.08);
        this.fx.dust(car.x, car.y + 30, 0, -80, this.stage.topColor, 10, 24); SFX.thud();
      }
    }
    if (this.flipT > 4) return this.finish('flipped');
    if (car.fuel <= 0 && Math.hypot(car.vx, car.vy) < 25) this.stuckT += dt; else this.stuckT = 0;
    if (this.stuckT > 1.4) return this.finish('fuel');
    if (this.bossDead) { this.winT = (this.winT || 0) + dt; if (this.winT > 2.6) return this.finish('win'); }
  }

  finish(reason) {
    if (this.over) return;
    this.over = reason;
    this.overT = 0;
    SFX.stopEngine();
    setTimeout(() => this.callbacks.end && this.callbacks.end(this.summary()), reason === 'win' ? 300 : 1400);
  }

  summary() {
    const dist = clamp((this.maxX - 300) / PX, 0, this.stage.length);
    const distScrap = Math.round(dist * 0.6);
    const win = this.over === 'win';
    return {
      reason: this.over, dist, progress: clamp((this.maxX - 300) / (this.world.lengthPx - 300), 0, 1),
      kills: this.kills, bestCombo: this.bestCombo, scrap: this.scrap, distScrap,
      winBonus: win ? this.stage.reward : 0, total: this.scrap + distScrap + (win ? this.stage.reward : 0), win,
    };
  }
}
