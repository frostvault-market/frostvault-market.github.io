'use strict';
// ---------- synthesized audio (no files needed) ----------
const SFX = {
  ctx: null, master: null, engine: null, muted: false, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.55; },

  startEngine() {
    if (!this.ctx || this.engine) return;
    const c = this.ctx;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.value = 40; o2.frequency.value = 20;
    f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 4;
    g.gain.value = 0.0;
    const g2 = c.createGain(); g2.gain.value = 0.4;
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.master);
    o1.start(); o2.start();
    this.engine = { o1, o2, f, g };
  },
  updateEngine(rpm, throttle, boost) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const fq = 32 + rpm * 90 + (boost ? 25 : 0);
    this.engine.o1.frequency.setTargetAtTime(fq, t, 0.05);
    this.engine.o2.frequency.setTargetAtTime(fq * 0.5, t, 0.05);
    this.engine.f.frequency.setTargetAtTime(250 + throttle * 900 + rpm * 400, t, 0.05);
    this.engine.g.gain.setTargetAtTime(0.06 + throttle * 0.08, t, 0.08);
  },
  stopEngine() {
    if (!this.engine) return;
    try { this.engine.o1.stop(); this.engine.o2.stop(); } catch (e) { }
    this.engine = null;
  },

  noise(dur, freq, q, vol, type = 'lowpass', sweep) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(freq, dur, vol, type = 'sine', to) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  _last: {},
  throttle(name, ms) {
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < ms) return false;
    this._last[name] = now; return true;
  },
  gun() { if (this.throttle('gun', 45)) { this.noise(0.08, 1800, 1, 0.35, 'bandpass', 400); this.tone(120, 0.06, 0.15, 'square', 50); } },
  sniper() { this.noise(0.25, 2500, 0.7, 0.4, 'bandpass', 300); },
  splat() { if (this.throttle('splat', 30)) { this.noise(0.18, 600, 2, 0.5, 'lowpass', 120); this.tone(90, 0.12, 0.3, 'sine', 40); } },
  thud() { if (this.throttle('thud', 60)) { this.tone(70, 0.2, 0.5, 'sine', 30); this.noise(0.12, 300, 1, 0.3); } },
  crash() { if (this.throttle('crash', 120)) { this.noise(0.4, 900, 0.8, 0.6, 'lowpass', 150); this.tone(55, 0.3, 0.4, 'triangle', 30); } },
  boom() { this.noise(0.9, 800, 0.5, 0.9, 'lowpass', 60); this.tone(60, 0.7, 0.6, 'sine', 25); },
  coin() { if (this.throttle('coin', 40)) { this.tone(1320, 0.08, 0.12, 'square'); setTimeout(() => this.tone(1760, 0.1, 0.1, 'square'), 50); } },
  fuel() { this.tone(500, 0.12, 0.2, 'triangle', 900); setTimeout(() => this.tone(900, 0.2, 0.2, 'triangle', 1300), 100); },
  card() { [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 0.13, 'triangle'), i * 70)); },
  click() { this.tone(900, 0.05, 0.12, 'square', 600); },
  buy() { [520, 780, 1040].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 0.15, 'square'), i * 60)); },
  zap() { this.noise(0.15, 3000, 4, 0.3, 'highpass'); this.tone(1800, 0.1, 0.1, 'sawtooth', 400); },
  rocket() { this.noise(0.5, 1200, 1, 0.35, 'bandpass', 200); },
  groan() { if (this.throttle('groan', 900)) this.tone(110 + Math.random() * 60, 0.5, 0.06, 'sawtooth', 70); },
  roar() { this.tone(80, 1.2, 0.5, 'sawtooth', 40); this.noise(1.0, 400, 1, 0.4, 'lowpass', 100); },
  rescue() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 0.14, 'sine'), i * 90)); },
  flip() { this.tone(400, 0.3, 0.15, 'triangle', 1600); },
};
