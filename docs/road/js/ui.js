'use strict';
// ---------- app shell: save, menus, HUD, input, loop ----------
const SAVE_KEY = 'sekka_save_v1';
const App = {
  save: null, game: null, renderer: null, screen: 'menu', vIdx: 0, stageIdx: 0, demoStage: 0,

  init() {
    this.loadSave();
    this.renderer = new Renderer(document.getElementById('cv'));
    this.ui = document.getElementById('ui');
    window.addEventListener('resize', () => { this.renderer.resize(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.game && !this.game.over) { if (this.screen === 'run') this.pause(); else if (this.screen === 'foot') this.pauseFoot(); } });
    this.bindKeys();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
    this.startDemo();
    this.showMenu();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.game) {
        this.game.update(dt);
        if (this.game.isPlat) this.game.render(this.renderer); else this.renderer.render(this.game);
        if (this.screen === 'run') this.updateHUD();
        if (this.screen === 'foot') this.updateFootHUD();
        if (this.screen === 'run' && this.game.car && !this.game.over) {
          const c = this.game.car;
          SFX.updateEngine(clamp(Math.abs(c.wheelSpin) / 40, 0, 1.4), this.game.input.gas ? 1 : 0, c.boosting);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // unlock audio on first gesture
    const unlock = () => { SFX.init(); this.syncMusic(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  },

  syncMusic() {
    if (!SFX.ctx) return;
    SFX.music(this.screen === 'run' ? 'road' : this.screen === 'foot' ? 'foot' : 'menu');
  },
  // ===== save =====
  loadSave() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
    if (!s) s = {};
    s.scrap ??= 0; s.owned ??= ['sedan']; s.sel ??= 'sedan'; s.levels ??= {}; s.unlocked ??= 1; s.best ??= {}; s.muted ??= false; s.runs ??= 0; s.wins ??= {};
    for (const v of VEHICLES) { s.levels[v.id] ??= {}; for (const u of UPGRADES) s.levels[v.id][u.id] ??= 0; }
    s.inv ??= null; s.eq ??= {}; s.bUnlocked ??= 1; s.bBest ??= {}; s.bWins ??= {};
    if (!s.inv) { // starter kit
      const gun = makeItem('weapon', 0, 1, 'pistol'), boots = makeItem('boots', 0, 1);
      s.inv = [gun, boots]; s.eq = { weapon: gun.uid, boots: boots.uid };
    }
    this.save = s;
    this.vIdx = Math.max(0, VEHICLES.findIndex(v => v.id === s.sel));
    SFX.setMuted(s.muted);
  },
  store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { } },

  // ===== demo backdrop =====
  startDemo() {
    const st = STAGES[this.demoStage % STAGES.length];
    const v = VEHICLES[this.demoStage % 2 === 0 ? 1 : 2];
    this.game = new Game({
      demo: true, stage: st, vehicle: v, levels: { engine: 2, fuel: 0, armor: 2, gun: 3, nitro: 0, ram: 2 },
      callbacks: { restartDemo: () => { this.demoStage++; if (this.screen !== 'run') this.startDemo(); } },
    });
  },

  html(h) { this.ui.innerHTML = h; },
  el(sel) { return this.ui.querySelector(sel); },
  scrapTag() { return `<div class="scrap-tag">${icon('scrap', 20)}<b>${fmt(this.save.scrap)}</b></div>`; },

  // ===== menu =====
  showMenu() {
    this.screen = 'menu';
    this.html(`
      <div class="menu fade-in">
        <div class="logo">
          <div class="logo-top">سكة</div>
          <div class="logo-main">النجاة</div>
          <div class="logo-sub">اهرب من الزومبي · ٤ مراحل · عربيات وتطويرات</div>
        </div>
        <div class="menu-btns">
          <button class="btn big primary" data-a="stages">العب</button>
          <button class="btn" data-a="garage">الجراج</button>
          <button class="btn ghost" data-a="how">إزاي تلعب</button>
        </div>
        ${this.scrapTag()}
        <button class="icon-btn snd" data-a="mute">${icon(this.save.muted ? 'mute' : 'sound', 22)}</button>
      </div>`);
    this.on('[data-a=stages]', () => this.showStages());
    this.on('[data-a=garage]', () => this.showGarage());
    this.on('[data-a=how]', () => this.showHow());
    this.on('[data-a=mute]', () => { this.save.muted = !this.save.muted; SFX.setMuted(this.save.muted); this.store(); this.showMenu(); });
  },

  on(sel, fn) { const e = this.el(sel); if (e) e.addEventListener('click', (ev) => { SFX.init(); SFX.click(); fn(ev); }); },
  onAll(sel, fn) { this.ui.querySelectorAll(sel).forEach(e => e.addEventListener('click', (ev) => { SFX.init(); SFX.click(); fn(e, ev); })); },

  showHow() {
    this.html(`
      <div class="panel-screen fade-in">
        <div class="panel how">
          <h2>إزاي تلعب</h2>
          <ul>
            <li><b>البنزين ▶</b> و<b>الفرامل ◀</b> (بترجّع لورا لو واقف). على الكيبورد: الأسهم أو D / A.</li>
            <li><b>الميلان ↺ ↻</b>: بتلف العربية في الهوا عشان تنزل على العجل. على الكيبورد: W / S.</li>
            <li><b>النيترو</b>: دفعة سرعة (Space). لازم تشتريه الأول من الجراج.</li>
            <li>افرم الزومبي وانت <b>مسرّع</b>. لو ماشي براحة هما اللي هياكلوا العربية.</li>
            <li><b>صناديق الإمداد</b> اللي عليها <b>؟</b>: كل صندوق بيديك تختار كارت من 3 يقوّيك في الرحلة دي بس.</li>
            <li><b>الناجين</b>: لو لقيت حد بيشاور، هدّي جنبه عشان يركب معاك. كل واحد ليه ميزة.</li>
            <li>في آخر كل مرحلة فيه <b>عملاق</b>. اخبطه وانت مسرّع، وارجع لورا وخد مسافة وكرر.</li>
            <li>السكراب اللي بتجمعه بيفضل معاك. طوّر العربية من الجراج، أو اشتري عربية أحسن.</li>
          </ul>
          <button class="btn primary" data-a="back">تمام</button>
        </div>
      </div>`);
    this.on('[data-a=back]', () => this.showMenu());
  },

  // ===== stages =====
  showStages() {
    this.screen = 'stages';
    this.syncMusic();
    const cards = STAGES.map((st, i) => {
      const locked = i >= this.save.unlocked;
      const best = this.save.best[st.id] || 0;
      const won = this.save.wins[st.id];
      return `<div class="stage-card ${locked ? 'locked' : ''}" data-i="${i}">
        <canvas class="thumb" data-thumb="${i}" width="320" height="150"></canvas>
        <div class="stage-info">
          <div class="stage-num">المرحلة ${arNum(i + 1)}</div>
          <div class="stage-name">${st.name}</div>
          <div class="stage-sub">${st.sub}</div>
          <div class="stage-meta">${arNum(fmt(st.length))} م · ${won ? '<span class="won">✔ خلصتها</span>' : best ? `أحسن مسافة: ${arNum(Math.round(best))} م` : 'لسه مالعبتهاش'}</div>
        </div>
        ${locked ? `<div class="lock">${icon('lock', 34)}<span>خلّص اللي قبلها</span></div>` : ''}
      </div>`;
    }).join('');
    this.html(`
      <div class="panel-screen fade-in">
        <div class="topbar"><button class="btn small ghost" data-a="back">رجوع</button><h2>اختار الطريق</h2>${this.scrapTag()}</div>
        <div class="stage-list">${cards}</div>
        <div class="sel-veh">العربية: <b>${VEHICLES[this.vIdx].name}</b> <button class="btn small" data-a="garage">غيّر / طوّر</button></div>
      </div>`);
    this.ui.querySelectorAll('[data-thumb]').forEach(c => this.drawThumb(c, STAGES[+c.dataset.thumb]));
    this.on('[data-a=back]', () => this.showMenu());
    this.on('[data-a=garage]', () => this.showGarage(true));
    this.onAll('.stage-card', (e) => { const i = +e.dataset.i; if (i < this.save.unlocked) this.startRun(i); });
  },

  drawThumb(c, st) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, st.sky[0]); gr.addColorStop(0.55, st.sky[1]); gr.addColorStop(1, st.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = st.sun.color; g.globalAlpha = 0.9; g.beginPath(); g.arc(st.sun.x * W, st.sun.y * H * 0.7, st.sun.r * 0.3, 0, TAU); g.fill(); g.globalAlpha = 1;
    const bg = BG.build(st);
    bg.layers.forEach((L, i) => {
      const s = 0.22 + i * 0.05;
      g.drawImage(L.c, -i * 80, H * (0.82 + i * 0.03) - L.c.height * s, L.c.width * s, L.c.height * s);
    });
    g.fillStyle = st.groundColor; g.fillRect(0, H * 0.86, W, H);
    g.fillStyle = st.topColor; g.fillRect(0, H * 0.86, W, 5);
    if (st.night) { g.fillStyle = 'rgba(0,0,20,0.35)'; g.fillRect(0, 0, W, H); }
  },

  // ===== garage =====
  showGarage(fromStages) {
    this.screen = 'garage';
    this.fromStages = fromStages;
    const v = VEHICLES[this.vIdx], lv = this.save.levels[v.id];
    const owned = this.save.owned.includes(v.id);
    const st = buildStats(v, lv);
    const stat = (name, val, max) => `<div class="stat"><span>${name}</span><div class="bar"><i style="width:${clamp(val / max * 100, 3, 100)}%"></i></div></div>`;
    const ups = UPGRADES.map(u => {
      const l = lv[u.id], maxed = l >= 5, cost = u.costs[l];
      const pips = Array.from({ length: 5 }, (_, k) => `<i class="${k < l ? 'on' : ''}"></i>`).join('');
      return `<button class="up ${!owned || maxed || this.save.scrap < cost ? 'dis' : ''}" data-u="${u.id}">
        ${badge(u.icon, 'gold', 46, 'up-ic')}
        <div class="up-txt"><b>${u.name}</b><small>${u.desc}</small><div class="pips">${pips}</div></div>
        <div class="up-cost">${maxed ? 'على الآخر' : `${icon('scrap', 14)} ${fmt(cost)}`}</div>
      </button>`;
    }).join('');
    this.html(`
      <div class="panel-screen garage fade-in">
        <div class="topbar"><button class="btn small ghost" data-a="back">رجوع</button><h2>الجراج</h2>${this.scrapTag()}</div>
        <div class="garage-body">
          <div class="veh-col">
            <div class="veh-nav">
              <button class="icon-btn" data-a="prev">›</button>
              <div class="veh-name">${v.name}<small>${arNum(this.vIdx + 1)} / ${arNum(VEHICLES.length)}</small></div>
              <button class="icon-btn" data-a="next">‹</button>
            </div>
            <canvas id="vprev" width="520" height="250"></canvas>
            <p class="veh-desc">${v.desc}</p>
            <div class="stats">
              ${stat('السرعة', v.topSpeed * (1 + 0.07 * lv.engine), 40)}
              ${stat('القوة', v.engine / v.mass * (1 + 0.12 * lv.engine), 3000)}
              ${stat('البنزين', st.fuelMax, 360)}
              ${stat('الصحة', st.armorMax, 850)}
              <div class="stat"><span>كراسي للناجين</span><b class="seats">${Array.from({ length: v.seats }, () => icon('person', 18)).join('')}</b></div>
            </div>
            ${owned ? (this.save.sel === v.id ? '<div class="chosen">✔ دي العربية اللي هتسوقها</div>' : '<button class="btn primary" data-a="select">اختارها</button>')
              : `<button class="btn primary ${this.save.scrap < v.price ? 'dis' : ''}" data-a="buy">اشتريها ${icon('scrap', 16)} ${fmt(v.price)}</button>`}
          </div>
          <div class="ups-col">${owned ? '' : '<div class="ups-lock">اشتري العربية الأول عشان تطوّرها</div>'}${ups}</div>
        </div>
        ${fromStages ? '<button class="btn primary go" data-a="go">يلا على الطريق</button>' : ''}
      </div>`);
    this.drawPreview(document.getElementById('vprev'), v, lv);
    this.on('[data-a=back]', () => fromStages ? this.showStages() : this.showMenu());
    this.on('[data-a=go]', () => this.showStages());
    this.on('[data-a=prev]', () => { this.vIdx = (this.vIdx + VEHICLES.length - 1) % VEHICLES.length; this.showGarage(fromStages); });
    this.on('[data-a=next]', () => { this.vIdx = (this.vIdx + 1) % VEHICLES.length; this.showGarage(fromStages); });
    this.on('[data-a=select]', () => { this.save.sel = v.id; this.store(); this.showGarage(fromStages); });
    this.on('[data-a=buy]', () => {
      if (this.save.scrap < v.price) return;
      this.save.scrap -= v.price; this.save.owned.push(v.id); this.save.sel = v.id; this.store(); SFX.buy(); this.showGarage(fromStages);
    });
    this.onAll('.up', (e) => {
      if (!owned) return;
      const u = UPGRADES.find(x => x.id === e.dataset.u), l = lv[u.id];
      if (l >= 5 || this.save.scrap < u.costs[l]) return;
      this.save.scrap -= u.costs[l]; lv[u.id]++; this.store(); SFX.buy(); this.showGarage(fromStages);
    });
  },

  drawPreview(c, v, lv) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    const fl = g.createRadialGradient(W / 2, H * 0.8, 10, W / 2, H * 0.8, W * 0.5);
    fl.addColorStop(0, 'rgba(255,200,120,0.25)'); fl.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = fl; g.fillRect(0, 0, W, H);
    const sc = Math.min(1.9, (W * 0.75) / (v.len + 60));
    const groundY = H * 0.84;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(W / 2, groundY, v.len * sc * 0.55, 10, 0, 0, TAU); g.fill();
    g.save(); g.translate(W / 2 - 10, groundY - (v.h * 0.32 + v.wheelR + 12 + v.wheelR) * sc); g.scale(sc, sc);
    const rest = v.wheelR + 12;
    ART.car(g, {
      def: v, lv, wheelRot: 0.3, wheelPos: [[-v.wheelBase / 2, v.h * 0.32 + rest], [v.wheelBase / 2, v.h * 0.32 + rest]],
      gunAngle: -0.15, splats: [], survivors: [], boosting: false, damage: 0, t: 0, muzzle: 0, rockets: 0, shock: 0, saw: false,
    });
    g.restore();
  },

  // ===== run =====
  startRun(i) {
    this.stageIdx = i;
    const v = VEHICLES[this.vIdx];
    if (!this.save.owned.includes(v.id)) this.vIdx = VEHICLES.findIndex(x => x.id === this.save.sel);
    const veh = VEHICLES[this.vIdx];
    SFX.init();
    this.game = new Game({
      stage: STAGES[i], vehicle: veh, levels: { ...this.save.levels[veh.id] },
      callbacks: {
        cards: (ch) => this.showCards(ch),
        end: (sum) => this.showResults(sum),
        boss: (on) => { const b = this.el('.boss-warn'); if (b) b.classList.toggle('show', on); },
      },
    });
    this.screen = 'run';
    this.syncMusic();
    this.buildHUD();
    SFX.startEngine();
    this.save.runs++;
    this.game.say(STAGES[i].sub, 3.5);
    if (!this.save.roadTut) this.tutorial('road');
  },

  buildHUD() {
    const g = this.game;
    const marks = g.world.events.filter(e => e.type === 'card').map(e => `<i class="mk card" style="left:${e.x / g.world.lengthPx * 100}%"></i>`).join('')
      + g.world.events.filter(e => e.type === 'survivor').map(e => `<i class="mk surv" style="left:${e.x / g.world.lengthPx * 100}%"></i>`).join('');
    this.html(`
      <div class="hud">
        <div class="hud-top">
          <div class="meters">
            <div class="meter hp">${icon('armor', 18)}<div class="mbar"><i></i></div></div>
            <div class="meter fuel">${icon('fuel', 18)}<div class="mbar"><i></i></div></div>
            ${g.lv.nitro > 0 ? `<div class="meter nitro">${icon('nitro', 18)}<div class="mbar"><i></i></div></div>` : ''}
            ${g.lv.gun > 0 ? `<div class="meter heat">${icon('gun', 18)}<div class="mbar"><i></i></div></div>` : ''}
          </div>
          <div class="progress"><div class="ptrack">${marks}<i class="mk boss">${icon('skull', 16)}</i><div class="pcar"></div></div><div class="pdist"></div></div>
          <div class="hud-right">
            <div class="scrap-tag small">${icon('scrap', 18)}<b class="hs">0</b></div>
            <button class="icon-btn" data-a="pause">${icon('pause', 20)}</button>
          </div>
        </div>
        <div class="hud-msg"></div>
        <div class="boss-warn">⚠ العملاق ⚠</div>
        <div class="speedo"><b>0</b><small>كم/س</small></div>
        <div class="combo"></div>
        <div class="ctrl left">
          <button class="pad" data-k="brake"><span>◀</span><small>فرامل</small></button>
          <div class="tilts">
            <button class="pad sm" data-k="tiltB"><span>↺</span></button>
            <button class="pad sm" data-k="tiltF"><span>↻</span></button>
          </div>
        </div>
        <div class="ctrl right">
          ${g.lv.nitro > 0 ? '<button class="pad boost" data-k="boost"><span>' + icon('nitro', 30) + '</span></button>' : ''}
          <button class="pad gas" data-k="gas"><span>▶</span><small>بنزين</small></button>
        </div>
      </div>`);
    this.hud = {
      hp: this.el('.meter.hp i'), fuel: this.el('.meter.fuel i'), nitro: this.el('.meter.nitro i'), heat: this.el('.meter.heat i'), heatM: this.el('.meter.heat'),
      pcar: this.el('.pcar'), pdist: this.el('.pdist'), scrap: this.el('.hs'), msg: this.el('.hud-msg'), speed: this.el('.speedo b'), combo: this.el('.combo'),
      fuelM: this.el('.meter.fuel'), hpM: this.el('.meter.hp'), last: {},
    };
    this.on('[data-a=pause]', () => this.pause());
    this.bindPads();
  },

  bindPads() {
    this.ui.querySelectorAll('.pad').forEach(b => {
      const k = b.dataset.k;
      const down = (e) => { e.preventDefault(); SFX.init(); b.setPointerCapture?.(e.pointerId); this.game.input[k] = true; b.classList.add('on'); };
      const up = (e) => { e.preventDefault(); this.game.input[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  },

  updateHUD() {
    const g = this.game, h = this.hud, c = g.car, s = g.s;
    if (!h) return;
    const set = (el, key, val) => { if (el && h.last[key] !== val) { h.last[key] = val; el.style.width = val + '%'; } };
    set(h.hp, 'hp', Math.round(clamp(c.hp / s.armorMax, 0, 1) * 100));
    set(h.fuel, 'fuel', Math.round(clamp(c.fuel / s.fuelMax, 0, 1) * 100));
    if (h.nitro) set(h.nitro, 'nitro', Math.round(clamp(c.nitro / Math.max(1, s.nitroMax), 0, 1) * 100));
    if (h.heat) { set(h.heat, 'heat', Math.round(c.heat * 100)); h.heatM.classList.toggle('hot', c.overheat); }
    h.fuelM.classList.toggle('low', c.fuel / s.fuelMax < 0.2);
    h.hpM.classList.toggle('low', c.hp / s.armorMax < 0.25);
    const prog = clamp((c.x - 300) / (g.world.lengthPx - 300), 0, 1);
    const pv = Math.round(prog * 1000) / 10;
    if (h.last.p !== pv) { h.last.p = pv; h.pcar.style.left = pv + '%'; h.pdist.textContent = `${arNum(Math.round(Math.max(0, c.x - 300) / PX))} م من ${arNum(g.stage.length)}`; }
    if (h.last.scrap !== g.scrap) { h.last.scrap = g.scrap; h.scrap.textContent = fmt(g.scrap); }
    const kmh = Math.round(Math.abs(c.speed) / PX * 3.6);
    if (h.last.kmh !== kmh) { h.last.kmh = kmh; h.speed.textContent = arNum(kmh); }
    const msg = g.hintT > 0 ? g.hint : '';
    if (h.last.msg !== msg) { h.last.msg = msg; if (msg) h.msg.textContent = msg; h.msg.classList.toggle('show', !!msg); }
    const cb = g.combo >= 3 ? `×${arNum(g.combo)}` : '';
    if (h.last.cb !== cb) { h.last.cb = cb; h.combo.innerHTML = cb ? `<small>كومبو</small>${cb}` : ''; h.combo.classList.remove('pop'); void h.combo.offsetWidth; if (cb) h.combo.classList.add('pop'); }
  },

  // ===== cards =====
  showCards(choices) {
    const rar = ['عادي', 'نادر', 'أسطوري'];
    const wrap = document.createElement('div');
    wrap.className = 'overlay cards-ov fade-in';
    wrap.innerHTML = `
      <h2>صندوق إمداد!</h2><p class="sub">اختار حاجة واحدة تقوّيك في الرحلة دي</p>
      <div class="card-row">${choices.map((c, i) => `
        <button class="pcard r${c.r}" data-i="${i}" style="animation-delay:${i * 0.08}s">
          <div class="rar">${rar[c.r]}</div>
          ${badge(c.icon, ['steel', 'blue', 'purple'][c.r], 84, 'pc-ic')}
          <b>${c.name}</b><p>${c.desc}</p>
          ${(this.game.cards[c.id] || 0) ? `<div class="have">عندك ${arNum(this.game.cards[c.id])}</div>` : ''}
        </button>`).join('')}
      </div>`;
    this.ui.appendChild(wrap);
    for (const k in this.game.input) this.game.input[k] = false;
    this.ui.querySelectorAll('.pad').forEach(b => b.classList.remove('on'));
    wrap.querySelectorAll('.pcard').forEach(b => b.addEventListener('click', () => {
      SFX.buy();
      this.game.takeCard(choices[+b.dataset.i]);
      wrap.remove();
    }));
  },

  pause() {
    if (!this.game || this.game.paused || this.game.over) return;
    this.game.paused = true;
    const taken = Object.entries(this.game.cards).map(([id, n]) => { const c = CARDS.find(x => x.id === id); return `<span class="chip r${c.r}">${icon(c.icon, 16)} ${c.name}${n > 1 ? ' ×' + arNum(n) : ''}</span>`; }).join('');
    const surv = this.game.car.survivors.map(s => `<span class="chip surv">${icon('person', 16)} ${s.name}</span>`).join('');
    const wrap = document.createElement('div');
    wrap.className = 'overlay fade-in';
    wrap.innerHTML = `<div class="panel"><h2>واقف</h2>
      <div class="chips">${taken || '<span class="muted">لسه مخدتش كروت في الرحلة دي</span>'}${surv}</div>
      <div class="row"><button class="btn primary" data-a="resume">كمّل</button><button class="btn" data-a="restart">من الأول</button><button class="btn ghost" data-a="quit">اخرج</button></div></div>`;
    this.ui.appendChild(wrap);
    wrap.querySelector('[data-a=resume]').onclick = () => { SFX.click(); wrap.remove(); this.game.paused = false; };
    wrap.querySelector('[data-a=restart]').onclick = () => { SFX.click(); SFX.stopEngine(); this.startRun(this.stageIdx); };
    wrap.querySelector('[data-a=quit]').onclick = () => { SFX.click(); SFX.stopEngine(); this.startDemo(); this.showStages(); };
  },

  // ===== results =====
  showResults(sum) {
    const st = STAGES[this.stageIdx];
    this.save.scrap += sum.total;
    this.save.best[st.id] = Math.max(this.save.best[st.id] || 0, sum.dist);
    let unlockedNew = false;
    if (sum.win) {
      this.save.wins[st.id] = true;
      if (this.save.unlocked < STAGES.length && this.stageIdx + 1 >= this.save.unlocked) { this.save.unlocked = this.stageIdx + 2; unlockedNew = true; }
    }
    this.store();
    const title = { win: 'نجيت!', destroyed: 'العربية اتدمرت', fuel: 'البنزين خلص', flipped: 'العربية اتقلبت' }[sum.reason];
    const tip = sum.win ? (unlockedNew ? `اتفتحت مرحلة جديدة: ${STAGES[this.stageIdx + 1]?.name || ''}` : 'الطريق خلص!')
      : { destroyed: 'التصفيح والكسّاحة بيقللوا الضرر.', fuel: 'كبّر التانك، أو خد كارت "بنزين أحمر".', flipped: 'استخدم أزرار الميلان وانت في الهوا.' }[sum.reason];
    const wrap = document.createElement('div');
    wrap.className = 'overlay results fade-in ' + (sum.win ? 'win' : 'lose');
    wrap.innerHTML = `<div class="panel">
      <h2>${title}</h2>
      <div class="prog-big"><div class="pb"><i style="width:${Math.round(sum.progress * 100)}%"></i></div><span>${arNum(Math.round(sum.progress * 100))}% من الطريق</span></div>
      <div class="res-grid">
        <div><small>المسافة</small><b>${arNum(Math.round(sum.dist))} م</b></div>
        <div><small>زومبي اتفرم</small><b>${arNum(sum.kills)}</b></div>
        <div><small>أكبر كومبو</small><b>×${arNum(sum.bestCombo)}</b></div>
      </div>
      <div class="loot">
        <div><span>سكراب اتجمع</span><b>${fmt(sum.scrap)}</b></div>
        <div><span>مكافأة المسافة</span><b>${fmt(sum.distScrap)}</b></div>
        ${sum.win ? `<div><span>مكافأة المرحلة</span><b>${fmt(sum.winBonus)}</b></div>` : ''}
        <div class="tot"><span>المجموع</span><b>${icon('scrap', 18)} ${fmt(sum.total)}</b></div>
      </div>
      <p class="tip">${tip}</p>
      <div class="row">
        <button class="btn primary" data-a="garage">الجراج</button>
        <button class="btn" data-a="again">${sum.win && STAGES[this.stageIdx + 1] ? 'المرحلة الجاية' : 'تاني'}</button>
        <button class="btn ghost" data-a="menu">الرئيسية</button>
      </div></div>`;
    this.ui.appendChild(wrap);
    const go = (fn) => () => { SFX.click(); fn(); };
    wrap.querySelector('[data-a=garage]').onclick = go(() => { this.startDemo(); this.showGarage(true); });
    wrap.querySelector('[data-a=again]').onclick = go(() => this.startRun(sum.win && STAGES[this.stageIdx + 1] ? this.stageIdx + 1 : this.stageIdx));
    wrap.querySelector('[data-a=menu]').onclick = go(() => { this.startDemo(); this.showMenu(); });
  },

  // ===== keyboard =====
  bindKeys() {
    const map = { ArrowRight: 'gas', KeyD: 'gas', ArrowLeft: 'brake', KeyA: 'brake', ArrowUp: 'tiltB', KeyW: 'tiltB', ArrowDown: 'tiltF', KeyS: 'tiltF', Space: 'boost', ShiftLeft: 'boost', ShiftRight: 'boost' };
    const fmap = { ArrowRight: 'right', KeyD: 'right', ArrowLeft: 'left', KeyA: 'left', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash', KeyJ: 'jump' };
    const h = (down) => (e) => {
      if (e.code === 'Escape' && down && this.screen === 'run') { this.pause(); return; }
      if (e.code === 'Escape' && down && this.screen === 'foot') { this.pauseFoot(); return; }
      if (this.screen === 'foot' && this.game && this.game.isPlat) {
        const fk = fmap[e.code]; if (!fk) return; e.preventDefault();
        if (e.repeat) return;
        this.game.input[fk] = down; return;
      }
      const k = map[e.code];
      if (!k || this.screen !== 'run' || !this.game) return;
      e.preventDefault();
      this.game.input[k] = down;
    };
    window.addEventListener('keydown', h(true));
    window.addEventListener('keyup', h(false));
  },
};

window.addEventListener('load', () => App.init());
