// ===== أصوات مصنوعة بالكود (من غير ملفات) =====
const SFX = (() => {
  let ctx = null, noiseBuf = null;
  const on = () => { try { return localStorage.getItem('ww1_mute') !== '1'; } catch (e) { return true; } };
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  document.addEventListener('pointerdown', () => ac(), { once: true });
  function noise(dur, freq, type, vol, t0 = 0) {
    const c = ac(); if (!c) return; const t = c.currentTime + t0;
    const s = c.createBufferSource(); s.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur);
  }
  function tone(freq, dur, type = 'square', vol = 0.08, t0 = 0, slide) {
    const c = ac(); if (!c) return; const t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
  }
  const S = {
    shot() { noise(0.08, 1800, 'highpass', 0.22); noise(0.12, 500, 'lowpass', 0.18); },
    mg() { for (let i = 0; i < 5; i++) noise(0.06, 1500, 'bandpass', 0.45, i * 0.07); },
    boom() { noise(0.9, 160, 'lowpass', 1.0); tone(90, 0.5, 'sine', 0.35, 0, 35); },
    mg1() { for (let i = 0; i < 3; i++) noise(0.045, 1600, 'bandpass', 0.22, i * 0.06); },
    cannon() { noise(0.35, 300, 'lowpass', 0.55); tone(110, 0.25, 'sine', 0.2, 0, 50); },
    thump() { noise(0.4, 200, 'lowpass', 0.45); },
    thud() { tone(140, 0.18, 'sine', 0.3, 0, 60); noise(0.1, 600, 'lowpass', 0.2); },
    clank() { tone(220, 0.25, 'sawtooth', 0.06, 0, 110); noise(0.3, 300, 'lowpass', 0.3); },
    card() { noise(0.05, 3000, 'highpass', 0.15); },
    heal() { tone(660, 0.15, 'sine', 0.08); tone(880, 0.2, 'sine', 0.08, 0.1); },
    block() { tone(1200, 0.12, 'triangle', 0.08, 0, 900); },
    bugle() { [392, 523, 659, 784].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.14, 'triangle', 0.09, i * 0.13)); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, i * 0.18)); },
    lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.45, 'triangle', 0.09, i * 0.25)); },
    plane() { tone(120, 1.0, 'sawtooth', 0.05, 0, 300); },
    pack() { noise(0.3, 900, 'bandpass', 0.3); [523, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 0.25 + i * 0.1)); },
  };
  return { play(n) { if (!on()) return; try { S[n] && S[n](); } catch (e) {} }, on, toggle() { try { localStorage.setItem('ww1_mute', on() ? '1' : '0'); } catch (e) {} return on(); } };
})();
