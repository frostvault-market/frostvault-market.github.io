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

  // ===== generative music (Hijaz flavour), three moods =====
  mus: null,
  music(style) {
    if (!this.ctx) return;
    if (this.mus && this.mus.style === style) return;
    this.stopMusic();
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 0; out.connect(this.master);
    out.gain.setTargetAtTime(style === 'menu' ? 0.22 : 0.16, c.currentTime, 1.2);
    const bpm = { menu: 84, road: 124, foot: 96 }[style];
    const m = { style, out, step: 0, next: c.currentTime + 0.1, spb: 60 / bpm / 4, timer: null };
    // D Hijaz: D Eb F# G A Bb C
    const root = 146.83, scale = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
    const hz = (deg, oct = 0) => root * Math.pow(2, (scale[((deg % scale.length) + scale.length) % scale.length] + 12 * (oct + Math.floor(deg / scale.length))) / 12);
    const voice = (t, f, dur, vol, type = 'sawtooth', cut = 1200, q = 1) => {
      const o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.006;
      fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(out);
      o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    };
    const drum = (t, kind) => {
      if (kind === 'k') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); return; }
      const sN = c.createBufferSource(); sN.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(), g = c.createGain();
      f.type = kind === 'h' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'h' ? 7000 : kind === 'd' ? 900 : 1800;
      const v = kind === 'h' ? 0.12 : kind === 'd' ? 0.35 : 0.5, d = kind === 'h' ? 0.04 : kind === 'd' ? 0.12 : 0.18;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      sN.connect(f); f.connect(g); g.connect(out); sN.start(t, Math.random()); sN.stop(t + d + 0.02);
    };
    const prog = [0, 0, 5, 3]; // chord roots by bar (degrees)
    const mel = [7, 6, 5, 4, 5, 4, 2, 1, 0, 1, 2, 4, 5, 4, 2, 1];
    const tick = () => {
      while (m.next < c.currentTime + 0.15) {
        const t = m.next, st = m.step, beat = st % 16, bar = Math.floor(st / 16) % 4;
        const chord = prog[bar];
        if (style === 'menu') {
          if (beat === 0) { voice(t, hz(chord, -1), m.spb * 16, 0.08, 'sawtooth', 600); voice(t, hz(chord + 2, -1), m.spb * 16, 0.05, 'sawtooth', 700); voice(t, hz(chord - 7, -1) / 2, m.spb * 16, 0.12, 'triangle', 300); }
          if (beat % 4 === 2 && Math.random() < 0.65) voice(t, hz(mel[(st / 2 | 0) % 16] + (Math.random() < 0.3 ? 1 : 0), 0) * 2, m.spb * 3, 0.07, 'triangle', 3000);
          if (beat === 0 || beat === 10) drum(t, 'd');
          if (beat === 6) drum(t, 'k');
        } else if (style === 'road') {
          if (beat % 2 === 0) voice(t, hz(chord, -1) / 2 * (beat % 8 === 6 ? 1.5 : 1), m.spb * 1.6, 0.14, 'sawtooth', 500, 4);
          if (beat % 4 === 0) drum(t, 'k');
          if (beat === 4 || beat === 12) drum(t, 's');
          if (beat % 2 === 1) drum(t, 'h');
          if (beat === 0) voice(t, hz(chord + 4, 0), m.spb * 14, 0.035, 'square', 900);
          if ((bar === 3 || bar === 1) && beat % 2 === 0 && beat >= 8) voice(t, hz(mel[beat], 1), m.spb * 1.8, 0.05, 'square', 2200);
        } else {
          if (beat === 0) { voice(t, hz(chord, -2), m.spb * 16, 0.15, 'sawtooth', 220, 6); voice(t, hz(chord + 1, -1), m.spb * 16, 0.03, 'sawtooth', 500); }
          if (beat === 0 || beat === 3) drum(t, 'k');
          if (beat === 8) drum(t, 'd');
          if (beat % 4 === 2) drum(t, 'h');
          if (beat === 12 && Math.random() < 0.5) voice(t, hz(chord + 1, 0), m.spb * 4, 0.05, 'triangle', 1500);
        }
        m.step++; m.next += m.spb;
      }
    };
    m.timer = setInterval(tick, 40); tick();
    this.mus = m;
  },
  stopMusic() {
    if (!this.mus) return;
    const m = this.mus; clearInterval(m.timer);
    try { m.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); setTimeout(() => m.out.disconnect(), 1500); } catch (e) { }
    this.mus = null;
  },
};
