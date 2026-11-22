'use strict';
// ---------- vehicle physics: rigid body + raycast spring suspension ----------
const GRAV = 1150;

class Car {
  constructor(def, lv, stats, x, y) {
    this.def = def; this.lv = lv; this.s = stats;
    this.x = x; this.y = y; this.a = 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.M = def.mass;
    this.I = this.M * (def.len * def.len + def.h * def.h) / 12 * 0.55;
    this.hp = stats.armorMax; this.fuel = stats.fuelMax; this.nitro = stats.nitroMax;
    this.wheelRot = 0; this.wheelSpin = 0;
    this.wheels = [
      { ax: -def.wheelBase / 2, ay: def.h * 0.32, comp: 0, ground: false, cx: 0, cy: 0 },
      { ax: def.wheelBase / 2, ay: def.h * 0.32, comp: 0, ground: false, cx: 0, cy: 0 },
    ];
    this.rest = def.wheelR + 20;
    this.maxComp = 24;
    this.k = this.M * GRAV / 2 / 8;
    this.c = 2 * Math.sqrt(this.k * this.M / 2) * 0.55;
    this.grounded = false; this.airTime = 0; this.groundTime = 0;
    this.boosting = false; this.flipAccum = 0; this.flips = 0;
    this.impact = 0; this.roofHit = false;
    this.splats = []; this.survivors = [];
    this.gunAngle = 0; this.muzzle = 0; this.heat = 0; this.overheat = false;
    this.t = 0; this.damage = 0;
    this.lastImpactSpeed = 0;
    // body sample points for collision
    const S = SHAPES[def.style];
    this.hull = S.body.map(([u, v]) => [u * def.len, v * def.h]);
  }

  get speed() { return this.vx * Math.cos(this.a) + this.vy * Math.sin(this.a); }
  forward() { return [Math.cos(this.a), Math.sin(this.a)]; }
  toWorld(lx, ly) { const c = Math.cos(this.a), s = Math.sin(this.a); return [this.x + lx * c - ly * s, this.y + lx * s + ly * c]; }
  toLocal(wx, wy) { const c = Math.cos(this.a), s = Math.sin(this.a), dx = wx - this.x, dy = wy - this.y; return [dx * c + dy * s, -dx * s + dy * c]; }

  applyImpulse(px, py, jx, jy) {
    this.vx += jx / this.M; this.vy += jy / this.M;
    const rx = px - this.x, ry = py - this.y;
    this.w += (rx * jy - ry * jx) / this.I;
  }

  step(dt, input, world, game) {
    const def = this.def, s = this.s;
    this.t += dt;
    const ca = Math.cos(this.a), sa = Math.sin(this.a);
    const dX = -sa, dY = ca; // suspension direction (body down)
    let throttle = input.gas ? 1 : 0;
    const hasFuel = this.fuel > 0;
    if (!hasFuel) throttle = 0;
    const brake = input.brake ? 1 : 0;
    const topSpeed = def.topSpeed * PX * (1 + 0.06 * this.lv.engine) * Math.sqrt(s.engineMul);
    const engineF = def.engine / def.mass * 0.34 * (1 + 0.12 * this.lv.engine) * s.engineMul;
    const grip = def.grip * s.gripMul;

    this.vy += GRAV * dt;
    let groundedCount = 0;
    this.impact = 0;

    for (const wh of this.wheels) {
      const Ax = this.x + wh.ax * ca - wh.ay * sa;
      const Ay = this.y + wh.ax * sa + wh.ay * ca;
      wh.ground = false;
      let sLen = this.rest;
      if (dY > 0.25) {
        // solve for contact distance along suspension axis
        let sv = this.rest;
        for (let it = 0; it < 3; it++) {
          const cx = Ax + dX * sv;
          sv = (world.groundY(cx) - def.wheelR * 1.0 / Math.max(0.6, world.normal(cx)[1] * -1) - Ay) / dY;
        }
        if (sv < this.rest) {
          let comp = this.rest - sv;
          wh.ground = true;
          // velocity at attach point
          const rx = Ax - this.x, ry = Ay - this.y;
          const vAx = this.vx - this.w * ry, vAy = this.vy + this.w * rx;
          const vd = vAx * dX + vAy * dY;
          if (comp > this.maxComp) {
            // bottomed out: rigid push + impact
            const pen = comp - this.maxComp;
            this.x -= dX * pen * 0.6; this.y -= dY * pen * 0.6;
            if (vd > 0) {
              const j = -vd * this.M * 0.55;
              this.applyImpulse(Ax, Ay, dX * j, dY * j);
              this.impact = Math.max(this.impact, vd);
            }
            comp = this.maxComp;
          }
          sLen = this.rest - comp;
          let F = this.k * comp + this.c * vd;
          if (F < 0) F = 0;
          const J = F * dt;
          this.applyImpulse(Ax, Ay, -dX * J, -dY * J);
          // traction
          const sl = world.slope(Ax);
          const tl = Math.hypot(1, sl), tX = 1 / tl, tY = sl / tl;
          const vt = vAx * tX + vAy * tY;
          const N = Math.max(F, this.M * GRAV * 0.25);
          const maxT = N * 1.15 * grip;
          let Ft = 0;
          if (throttle) {
            const fall = clamp(1 - vt / topSpeed, 0, 1);
            if (fall > 0) Ft += Math.min(engineF * this.M * 0.5 * (0.35 + 0.65 * Math.sqrt(fall)), maxT);
          }
          if (brake) {
            if (vt > 30) Ft -= Math.min(maxT, this.M * 900 * 0.5);
            else Ft -= Math.min(maxT * 0.6, engineF * this.M * 0.5 * 0.45 * clamp(1 + vt / (topSpeed * 0.3), 0, 1));
          }
          // rolling resistance / static hold when idle
          if (!throttle && !brake) Ft -= vt * this.M * 0.5 * 0.35;
          // apply traction near the centre height to avoid violent wheelies
          this.applyImpulse(Ax, this.y + (Ay - this.y) * 0.25, tX * Ft * dt, tY * Ft * dt);
          groundedCount++;
          this.wheelSpin = vt / def.wheelR;
        }
      }
      wh.comp = this.rest - sLen;
      wh.lx = wh.ax; wh.ly = wh.ay + sLen;
    }
    this.grounded = groundedCount > 0;
    if (!this.grounded) {
      this.wheelSpin = lerp(this.wheelSpin, throttle ? 40 : this.wheelSpin * 0.98, 0.05);
      this.airTime += dt; this.groundTime = 0;
    } else { this.groundTime += dt; }
    this.wheelRot += this.wheelSpin * dt;

    // tilt / air control
    const tilt = (input.tiltB ? -1 : 0) + (input.tiltF ? 1 : 0);
    const both = groundedCount === 2;
    if (both) this.w += tilt * 2.2 * dt;
    else this.w += tilt * (this.grounded ? 6 : 9.5) * dt;
    // stability assist: gently pulls the car level in the air / on one wheel
    if (!both) {
      const err = Math.atan2(Math.sin(this.a), Math.cos(this.a));
      if (Math.abs(err) < 2.2) this.w -= err * (this.grounded ? 1.2 : 2.2) * dt * (tilt ? 0.3 : 1);
      this.w *= 1 - (this.grounded ? 1.6 : 0.7) * dt;
    }
    // throttle in the air rotates nose up slightly (wheel gyro)
    this.w *= this.grounded ? 0.992 : 0.997;
    this.w = clamp(this.w, -7, 7);

    // nitro
    this.boosting = false;
    if (input.boost && this.nitro > 0 && this.lv.nitro > 0) {
      const nf = (700 + this.lv.nitro * 160) * s.engineMul;
      this.vx += ca * nf * dt; this.vy += sa * nf * dt;
      this.nitro = Math.max(0, this.nitro - dt * 28);
      this.boosting = true;
    }

    // fuel
    if (hasFuel) this.fuel = Math.max(0, this.fuel - dt * (0.9 + throttle * 1.6 + (this.boosting ? 0.6 : 0)) * s.fuelUse);

    // integrate
    this.x += this.vx * dt; this.y += this.vy * dt;
    const da = this.w * dt;
    this.a += da;
    if (!this.grounded) { this.flipAccum += da; }
    else if (this.groundTime > 0.2) this.flipAccum = 0;
    if (Math.abs(this.flipAccum) > TAU * 0.92) {
      this.flipAccum = 0; this.flips++;
      game.onFlip();
    }

    // hull collision
    this.collideHull(world, dt, game);
    // air drag
    this.vx *= 1 - dt * 0.02;
  }

  collideHull(world, dt, game) {
    const ca = Math.cos(this.a), sa = Math.sin(this.a);
    this.roofHit = false;
    let maxPen = 0, hitVel = 0;
    for (let i = 0; i < this.hull.length; i++) {
      const [lx, ly] = this.hull[i];
      const px = this.x + lx * ca - ly * sa, py = this.y + lx * sa + ly * ca;
      const gy = world.groundY(px);
      if (py > gy) {
        const [nx, ny] = world.normal(px);
        const pen = (py - gy) * -ny;
        const rx = px - this.x, ry = py - this.y;
        const vpx = this.vx - this.w * ry, vpy = this.vy + this.w * rx;
        const vn = vpx * nx + vpy * ny; // negative = into ground (n points up)
        // position correction
        this.x += nx * pen * 0.8; this.y += ny * pen * 0.8;
        if (vn < 0) {
          // effective mass
          const rn = rx * ny - ry * nx;
          const em = 1 / (1 / this.M + rn * rn / this.I);
          const j = -vn * (1 + 0.05) * em;
          this.applyImpulse(px, py, nx * j, ny * j);
          // friction
          const tx = -ny, ty = nx;
          const vt = vpx * tx + vpy * ty;
          const jt = clamp(-vt * em * 0.2, -j * 0.12, j * 0.12);
          this.applyImpulse(px, py, tx * jt, ty * jt);
          hitVel = Math.max(hitVel, -vn);
        }
        if (ly < -this.def.h * 0.3) this.roofHit = true;
        maxPen = Math.max(maxPen, pen);
      }
    }
    this.lastImpactSpeed = Math.max(hitVel, this.impact * 0.8);
    if (this.lastImpactSpeed > 420) game.onHardLanding(this.lastImpactSpeed);
  }
}
