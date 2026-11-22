'use strict';
// ---------- menus for both modes + on-foot UI (inventory, buildings, HUD) ----------
Object.assign(App, {
  // ===== main menu =====
  showMenu() {
    this.screen = 'menu';
    if (!this.game || this.game.isPlat || !this.game.demo) this.startDemo();
    const s = this.save;
    const roadDone = STAGES.filter(st => s.wins[st.id]).length;
    const footDone = BUILDINGS.filter(b => s.bWins[b.id]).length;
    this.html(`
      <div class="menu fade-in">
        <div class="menu-top">
          ${this.scrapTag()}
          <button class="icon-btn snd" data-a="mute">${icon(s.muted ? 'mute' : 'sound', 22)}</button>
        </div>
        <div class="logo">
          <div class="logo-top">سكة</div>
          <div class="logo-main">النجاة</div>
        </div>
        <div class="modes">
          <button class="mode-card" data-a="road">
            <canvas class="mode-art" data-art="road" width="420" height="200"></canvas>
            <div class="mode-body">
              <div class="mode-title">${badge('car', 'gold', 40)}<div><b>الطريق</b><small>سوق وافرم واهرب</small></div></div>
              <div class="mode-prog"><div class="mp"><i style="width:${roadDone / STAGES.length * 100}%"></i></div><span>${arNum(roadDone)}/${arNum(STAGES.length)} مراحل</span></div>
            </div>
          </button>
          <button class="mode-card" data-a="foot">
            <canvas class="mode-art" data-art="foot" width="420" height="200"></canvas>
            <div class="mode-body">
              <div class="mode-title">${badge('door', 'red', 40)}<div><b>المباني</b><small>١٥ باب في كل مبنى</small></div></div>
              <div class="mode-prog"><div class="mp red"><i style="width:${footDone / BUILDINGS.length * 100}%"></i></div><span>${arNum(footDone)}/${arNum(BUILDINGS.length)} مباني</span></div>
            </div>
          </button>
        </div>
        <div class="menu-nav">
          <button class="nav-btn" data-a="garage">${badge('garage', 'steel', 38)}<span>الجراج</span></button>
          <button class="nav-btn" data-a="inv">${badge('bag', 'steel', 38)}<span>الشنطة</span></button>
          <button class="nav-btn" data-a="how">${badge('info', 'steel', 38)}<span>إزاي تلعب</span></button>
        </div>
      </div>`);
    this.drawModeArt(this.el('[data-art=road]'), 'road');
    this.drawModeArt(this.el('[data-art=foot]'), 'foot');
    this.on('[data-a=road]', () => this.showStages());
    this.on('[data-a=foot]', () => this.showBuildings());
    this.on('[data-a=garage]', () => this.showGarage());
    this.on('[data-a=inv]', () => this.showInventory());
    this.on('[data-a=how]', () => this.showHow());
    this.on('[data-a=mute]', () => { s.muted = !s.muted; SFX.setMuted(s.muted); this.store(); this.showMenu(); });
  },

  drawModeArt(c, kind) {
    const g = c.getContext('2d'), W = c.width, H = c.height;
    if (kind === 'road') {
      const st = STAGES[1];
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2b1d3a'); gr.addColorStop(0.55, '#c45a4a'); gr.addColorStop(1, '#f0a35e');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const sg = g.createRadialGradient(W * 0.72, H * 0.5, 4, W * 0.72, H * 0.5, 120);
      sg.addColorStop(0, 'rgba(255,220,160,.9)'); sg.addColorStop(0.2, 'rgba(255,200,140,.4)'); sg.addColorStop(1, 'rgba(255,200,140,0)');
      g.fillStyle = sg; g.fillRect(0, 0, W, H);
      const bg = BG.build(STAGES[0]);
      bg.layers.forEach((L, i) => { const s = 0.3 + i * 0.05; g.drawImage(L.c, -i * 120, H * (0.8 + i * 0.02) - L.c.height * s, L.c.width * s, L.c.height * s); });
      g.fillStyle = '#2a2624'; g.beginPath(); g.moveTo(0, H * 0.82); g.quadraticCurveTo(W * 0.5, H * 0.74, W, H * 0.84); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      g.strokeStyle = 'rgba(230,190,70,.8)'; g.setLineDash([22, 26]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, H * 0.86); g.quadraticCurveTo(W * 0.5, H * 0.78, W, H * 0.88); g.stroke(); g.setLineDash([]);
      const v = VEHICLES[1];
      g.save(); g.translate(W * 0.42, H * 0.6); g.rotate(-0.06); g.scale(0.82, 0.82);
      ART.car(g, { def: v, lv: { engine: 2, fuel: 0, armor: 3, gun: 3, nitro: 2, ram: 3 }, wheelRot: 0, wheelPos: [[-v.wheelBase / 2, v.h * 0.32 + v.wheelR + 12], [v.wheelBase / 2, v.h * 0.32 + v.wheelR + 12]], gunAngle: -0.2, splats: [{ x: 70, y: 0, r: 10, rot: 0, a: 0.7, drip: 10 }, { x: 50, y: 10, r: 7, rot: 1, a: 0.6, drip: 6 }], survivors: [], boosting: true, damage: 0.2, t: 0, muzzle: 1, rockets: 0, shock: 0, saw: false });
      g.restore();
      for (const [x, s] of [[W * 0.85, 1], [W * 0.95, 0.9]]) { g.save(); g.translate(x, H * 0.84); g.scale(s * 0.85, s * 0.85); ART.zombie(g, { type: 'walker', scale: 1, dir: -1, phase: x, t: x, seed: 1, skin: '#7d8f63', shirt: '#6a5a4a', pants: '#2a3040', hair: null, attack: 1 }, false); g.restore(); }
    } else {
      const B = BUILDINGS[0];
      const room = { n: 3, W: 900, H: 720, floorY: 640, seed: 77, plats: [{ x: 420, y: 475, w: 300 }], lamps: [{ x: 300, y: 130, flick: -1 }, { x: 720, y: 140, flick: -1 }], windows: [{ x: 520, y: 140, w: 170, h: 170, boarded: true }], decor: [{ x: 160, kind: 'sofa' }, { x: 820, kind: 'shelf' }], posters: [{ x: 330, y: 300, text: 'شقة للإيجار' }] };
      const bgc = PART.buildRoom(room, B, 0.5);
      const sc = H / 720;
      g.drawImage(bgc, -60, 0, 900 * sc * 1.0 * (W / (900 * sc)) + 60, H);
      g.fillStyle = 'rgba(10,5,8,.35)'; g.fillRect(0, 0, W, H);
      const lg = g.createRadialGradient(W * 0.33, H * 0.25, 4, W * 0.33, H * 0.25, 160);
      lg.addColorStop(0, 'rgba(255,207,138,.35)'); lg.addColorStop(1, 'rgba(255,207,138,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const fy = H * 0.89;
      g.save(); g.translate(W * 0.3, fy); g.scale(1.25, 1.25);
      PART.hero(g, { look: { helmet: 1, vest: 2, gloves: 0, boots: 1 }, face: 1, onGround: true, vx: 0, anim: 0, aim: -0.05, weaponKind: 'shotgun', recoil: 0, hurtT: 0, dashT: 0 }, 0);
      g.restore();
      g.globalCompositeOperation = 'lighter';
      const mg = g.createRadialGradient(W * 0.3 + 92, fy - 80, 0, W * 0.3 + 92, fy - 80, 40);
      mg.addColorStop(0, 'rgba(255,240,200,1)'); mg.addColorStop(0.4, 'rgba(255,170,60,.6)'); mg.addColorStop(1, 'rgba(255,120,0,0)');
      g.fillStyle = mg; g.fillRect(W * 0.3 + 52, fy - 120, 80, 80);
      g.globalCompositeOperation = 'source-over';
      for (const [x, tp, s] of [[W * 0.66, 'runner', 1.15], [W * 0.8, 'fat', 1.1], [W * 0.92, 'walker', 1.05]]) { g.save(); g.translate(x, fy); g.scale(s, s); ART.zombie(g, { type: tp, scale: 1, dir: -1, phase: x, t: x, seed: 2, skin: '#7d8f63', shirt: '#5a4a6a', pants: '#2a3040', hair: '#1a1410', attack: 1 }, true); g.restore(); }
    }
  },

  showHow() {
    this.html(`
      <div class="panel-screen fade-in">
        <div class="topbar"><button class="btn small ghost" data-a="back">رجوع</button><h2>إزاي تلعب</h2><span></span></div>
        <div class="how-grid">
          <div class="panel how">
            <h3>${badge('car', 'gold', 34)} الطريق</h3>
            <ul>
              <li><b>بنزين ▶ / فرامل ◀</b>: الفرامل بترجّعك لورا لو واقف.</li>
              <li><b>الميلان ↺ ↻</b> عشان تعدّل العربية في الهوا. ولو العربية اتقلبت، دوس عليه بسرعة وهي تتعدل.</li>
              <li>افرم الزومبي وانت مسرّع. صناديق <b>؟</b> فيها كروت للرحلة، والناجين بيركبوا معاك لو هدّيت جنبهم.</li>
              <li>في آخر كل مرحلة فيه عملاق. اخبطه، وارجع، وخبطه تاني.</li>
            </ul>
          </div>
          <div class="panel how">
            <h3>${badge('door', 'red', 34)} المباني</h3>
            <ul>
              <li>كل مبنى فيه <b>١٥ باب</b>. موّت كل الزومبي في الأوضة عشان باب الخروج يتفتح.</li>
              <li>في الباب <b>٥ و١٠ و١٥</b> فيه زعيم، ولما تموّته بيوقّع صندوق غنايم فيه عدّة.</li>
              <li>بعد كل باب بتختار <b>مهارة من ٣</b> تفضل معاك لحد آخر المبنى.</li>
              <li>بطلك بيضرب <b>لوحده</b> على أقرب زومبي. انت عليك الجري والنط (▲) والزحلقة (»). و▼ بتنزّلك من على الرفوف.</li>
              <li>من <b>الشنطة</b> بتلبس ٦ حاجات: سلاح، وخوذة، وصديري، وجوانتي، وبوت، وتعويذة. وتقدر تطوّرهم أو تفكّكهم وتاخد سكراب.</li>
            </ul>
          </div>
        </div>
        <p class="credits">الأيقونات من game-icons.net (رخصة CC BY 3.0)، رسم Lorc وDelapouite وغيرهم.</p>
      </div>`);
    this.on('[data-a=back]', () => this.showMenu());
  },

  // ===== buildings =====
  showBuildings() {
    this.screen = 'buildings';
    const s = this.save;
    const cards = BUILDINGS.map((b, i) => {
      const locked = i >= s.bUnlocked;
      const best = s.bBest[b.id] || 0, won = s.bWins[b.id];
      return `<div class="stage-card ${locked ? 'locked' : ''}" data-i="${i}">
        <canvas class="thumb" data-thumb="${i}" width="320" height="150"></canvas>
        ${badge(b.icon, won ? 'green' : 'red', 42, 'thumb-badge')}
        <div class="stage-info">
          <div class="stage-num">المبنى ${arNum(i + 1)}</div>
          <div class="stage-name">${b.name}</div>
          <div class="stage-sub">${b.sub}</div>
          <div class="doors">${Array.from({ length: 15 }, (_, k) => `<i class="${k < best ? 'on' : ''} ${(k + 1) % 5 === 0 ? 'boss' : ''}"></i>`).join('')}</div>
          <div class="stage-meta">${won ? '<span class="won">✔ نضّفته</span>' : best ? `أبعد باب: ${arNum(best)}` : 'لسه مادخلتوش'}</div>
        </div>
        ${locked ? `<div class="lock">${badge('lock', 'steel', 48)}<span>نضّف المبنى اللي قبله</span></div>` : ''}
      </div>`;
    }).join('');
    const eq = this.eqItems();
    this.html(`
      <div class="panel-screen fade-in">
        <div class="topbar"><button class="btn small ghost" data-a="back">رجوع</button><h2>اختار المبنى</h2>${this.scrapTag()}</div>
        <div class="stage-list">${cards}</div>
        <div class="sel-veh">${SLOTS.map(sl => eq[sl.id] ? badge(itemIcon(eq[sl.id]), RARITY[eq[sl.id].r].tone, 34) : `<span class="badge empty" style="--s:34px">${icon(sl.icon, 20)}</span>`).join('')}<button class="btn small" data-a="inv">الشنطة</button></div>
      </div>`);
    this.ui.querySelectorAll('[data-thumb]').forEach(c => this.drawRoomThumb(c, BUILDINGS[+c.dataset.thumb]));
    this.on('[data-a=back]', () => this.showMenu());
    this.on('[data-a=inv]', () => this.showInventory(true));
    this.onAll('.stage-card', (e) => { const i = +e.dataset.i; if (i < s.bUnlocked) this.startFoot(i); });
  },

  drawRoomThumb(c, B) {
    const room = { n: 2, W: 1100, H: 720, floorY: 640, seed: B.id.length * 31, plats: [{ x: 300, y: 475, w: 260 }, { x: 700, y: 475, w: 220 }, { x: 480, y: 310, w: 200 }], lamps: [{ x: 250, y: 130 }, { x: 800, y: 130 }], windows: [{ x: 560, y: 140, w: 160, h: 170, boarded: false }], decor: B.decor.slice(0, 4).map((k, i) => ({ x: 150 + i * 260, kind: k })), posters: [{ x: 380, y: 250, text: B.posters[0] }] };
    const bgc = PART.buildRoom(room, B, 0.3);
    const g = c.getContext('2d');
    g.drawImage(bgc, 0, 0, c.width, c.height);
    const lg = g.createRadialGradient(c.width / 2, c.height * 0.3, 10, c.width / 2, c.height * 0.4, c.width * 0.7);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = lg; g.fillRect(0, 0, c.width, c.height);
  },

  eqItems() {
    const out = {};
    for (const [slot, uid] of Object.entries(this.save.eq)) { const it = this.save.inv.find(x => x.uid === uid); if (it) out[slot] = it; }
    return out;
  },

  // ===== inventory =====
  showInventory(fromBuildings, selUid) {
    this.screen = 'inv';
    const s = this.save, eq = this.eqItems();
    const hs = heroStats(eq);
    const eqUids = new Set(Object.values(s.eq));
    const slotTile = (sl) => {
      const it = eq[sl.id];
      return `<button class="slot ${it ? 'r' + it.r : 'empty'}" data-uid="${it ? it.uid : ''}" data-slot="${sl.id}">
        ${it ? badge(itemIcon(it), RARITY[it.r].tone, 52) : `<span class="slot-ghost">${icon(sl.icon, 30)}</span>`}
        <small>${it ? (it.lv > 1 ? `+${arNum(it.lv - 1)} ` : '') + it.name : sl.name}</small></button>`;
    };
    const items = s.inv.slice().sort((a, b) => (eqUids.has(b.uid) - eqUids.has(a.uid)) || b.r - a.r || b.lv - a.lv);
    const W = hs.weapon;
    const statRow = (ic, name, val) => `<div class="hstat">${icon(ic, 16)}<span>${name}</span><b>${val}</b></div>`;
    this.html(`
      <div class="panel-screen inv fade-in">
        <div class="topbar"><button class="btn small ghost" data-a="back">رجوع</button><h2>الشنطة</h2>${this.scrapTag()}</div>
        <div class="inv-body">
          <div class="hero-col panel">
            <div class="paperdoll">
              <div class="slots-col">${SLOTS.slice(0, 3).map(slotTile).join('')}</div>
              <canvas id="heroc" width="220" height="300"></canvas>
              <div class="slots-col">${SLOTS.slice(3).map(slotTile).join('')}</div>
            </div>
            <div class="hstats">
              ${statRow('health', 'الصحة', arNum(Math.round(hs.hp)))}
              ${statRow('dmg', 'ضرر الطلقة', arNum(Math.round(W.dmg * (1 + hs.dmg / 100))) + (W.pellets > 1 ? '×' + arNum(W.pellets) : ''))}
              ${statRow('gun', 'طلقات/ث', arNum((W.rate * (1 + hs.rate / 100)).toFixed(1)))}
              ${statRow('crit', 'قاضية', arNum(Math.round(hs.crit)) + '%')}
              ${statRow('armor', 'تقليل ضرر', arNum(Math.round(hs.armor)) + '%')}
              ${statRow('speed', 'سرعة', '+' + arNum(Math.round(hs.speed)) + '%')}
            </div>
          </div>
          <div class="items-col panel">
            <div class="items-head"><b>العدّة (${arNum(s.inv.length)})</b><small>دوس على أي حاجة عشان تشوفها</small></div>
            <div class="item-grid">${items.map(it => `
              <button class="item r${it.r} ${eqUids.has(it.uid) ? 'eq' : ''} ${selUid === it.uid ? 'sel' : ''}" data-uid="${it.uid}">
                ${badge(itemIcon(it), RARITY[it.r].tone, 50)}
                ${it.lv > 1 ? `<span class="lvl">+${arNum(it.lv - 1)}</span>` : ''}
                ${eqUids.has(it.uid) ? `<span class="eqmark">${icon('check', 12)}</span>` : ''}
              </button>`).join('')}
            </div>
          </div>
        </div>
        ${fromBuildings ? '<button class="btn primary go" data-a="go">يلا على المباني</button>' : ''}
      </div>`);
    PART.heroPreview(document.getElementById('heroc'), this.lookOf(eq), W.kind);
    this.on('[data-a=back]', () => fromBuildings ? this.showBuildings() : this.showMenu());
    this.on('[data-a=go]', () => this.showBuildings());
    this.onAll('[data-uid]', (e) => { const uid = +e.dataset.uid; if (uid) this.itemDetail(uid, fromBuildings); });
    if (selUid) this.itemDetail(selUid, fromBuildings);
  },
  lookOf(eq) { const l = {}; for (const sl of SLOTS) if (eq[sl.id] && sl.id !== 'weapon') l[sl.id] = eq[sl.id].r; return l; },

  itemDetail(uid, fromB) {
    const s = this.save, it = s.inv.find(x => x.uid === uid);
    if (!it) return;
    this.ui.querySelector('.item-pop')?.remove();
    const R = RARITY[it.r];
    const isEq = s.eq[it.slot] === it.uid;
    const cur = this.eqItems()[it.slot];
    const cost = upgradeCost(it), maxed = it.lv >= MAX_ITEM_LV;
    const lines = itemStatLines(it).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    const cmp = !isEq && cur ? `<div class="cmp"><small>اللي لابسه دلوقتي: ${cur.name} (${RARITY[cur.r].name})</small>${itemStatLines(cur).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` : '';
    const wrap = document.createElement('div');
    wrap.className = 'item-pop fade-in';
    wrap.innerHTML = `<div class="ip-card r${it.r}">
      <button class="ip-x" data-a="x">${icon('cross', 16)}</button>
      <div class="ip-head">${badge(itemIcon(it), R.tone, 72)}<div><div class="ip-rar" style="color:${R.color}">${R.name} · ${SLOTS.find(x => x.id === it.slot).name}</div><div class="ip-name">${it.name}${it.lv > 1 ? ` <span class="lvl-t">+${arNum(it.lv - 1)}</span>` : ''}</div>${it.slot === 'weapon' ? `<small class="muted">${WEAPONS[it.kind].desc}</small>` : ''}</div></div>
      <div class="ip-stats">${lines}</div>${cmp}
      <div class="row">
        ${isEq ? '<button class="btn small dis">لابسه</button>' : '<button class="btn small primary" data-a="eq">البس</button>'}
        <button class="btn small ${maxed || s.scrap < cost ? 'dis' : ''}" data-a="up">${maxed ? 'على الآخر' : `طوّر ${icon('scrap', 14)} ${fmt(cost)}`}</button>
        <button class="btn small ghost ${isEq ? 'dis' : ''}" data-a="salv">فكّك +${fmt(salvageValue(it))}</button>
      </div></div>`;
    this.ui.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('[data-a=x]').onclick = () => { SFX.click(); close(); };
    wrap.querySelector('[data-a=eq]')?.addEventListener('click', () => { SFX.buy(); s.eq[it.slot] = it.uid; this.store(); this.showInventory(fromB); });
    wrap.querySelector('[data-a=up]').onclick = () => {
      if (maxed || s.scrap < cost) return;
      s.scrap -= cost; it.lv++; this.store(); SFX.buy(); this.showInventory(fromB, it.uid);
    };
    wrap.querySelector('[data-a=salv]').onclick = () => {
      if (isEq) return;
      s.scrap += salvageValue(it); s.inv = s.inv.filter(x => x !== it); this.store(); SFX.coin(); this.showInventory(fromB);
    };
  },

  // ===== on-foot run =====
  startFoot(i) {
    this.bIdx = i;
    SFX.init(); SFX.stopEngine();
    const B = BUILDINGS[i];
    this.game = new PlatGame({
      building: B, equipped: this.eqItems(),
      callbacks: {
        skills: ch => this.showSkills(ch),
        end: sum => this.showFootResults(sum),
        boss: name => this.footBoss(name),
        msg: m => this.toast(m),
        loot: it => this.lootPop(it),
        room: n => this.onRoom(n),
      },
    });
    this.screen = 'foot';
    this.buildFootHUD();
    this.toast(B.sub, 3.5);
  },

  buildFootHUD() {
    const g = this.game;
    this.html(`
      <div class="hud foot">
        <div class="fh-top">
          <div class="fh-left">
            <div class="hpbox">${badge('heart', 'red', 34)}<div class="hpbar"><i></i><span></span></div></div>
            <div class="skill-row"></div>
          </div>
          <div class="fh-mid">
            <div class="bname">${g.B.name}</div>
            <div class="door-pips">${Array.from({ length: 15 }, (_, k) => `<i data-k="${k + 1}" class="${(k + 1) % 5 === 0 ? 'boss' : ''}">${(k + 1) % 5 === 0 ? icon('skull', 12) : ''}</i>`).join('')}</div>
            <div class="bossbar"><div class="bb-name"></div><div class="bb"><i></i></div></div>
          </div>
          <div class="hud-right">
            <div class="scrap-tag small">${icon('scrap', 18)}<b class="hs">0</b></div>
            <button class="icon-btn" data-a="pause">${icon('pause', 20)}</button>
          </div>
        </div>
        <div class="hud-msg"></div>
        <div class="ctrl left">
          <button class="pad" data-k="left"><span>◀</span></button>
          <button class="pad" data-k="right"><span>▶</span></button>
          <button class="pad xs" data-k="down"><span>▼</span></button>
        </div>
        <div class="ctrl right">
          <button class="pad dashb" data-k="dash">${icon('dash', 32)}<i class="cd"></i></button>
          <button class="pad gas" data-k="jump">${icon('jump', 40)}<small>نط</small></button>
        </div>
      </div>`);
    this.fh = { hp: this.el('.hpbar i'), hpt: this.el('.hpbar span'), scrap: this.el('.hs'), skills: this.el('.skill-row'), pips: this.ui.querySelectorAll('.door-pips i'), bb: this.el('.bossbar'), bbi: this.el('.bb i'), bbn: this.el('.bb-name'), cd: this.el('.dashb .cd'), msg: this.el('.hud-msg'), last: {} };
    this.on('[data-a=pause]', () => this.pauseFoot());
    this.bindPads();
    this.onRoom(g.n);
  },

  onRoom(n) {
    if (!this.fh) return;
    this.fh.pips.forEach(p => { const k = +p.dataset.k; p.classList.toggle('done', k < n); p.classList.toggle('cur', k === n); });
    const g = this.game;
    this.fh.skills.innerHTML = Object.entries(g.skills).map(([id, c]) => { const sk = SKILLS.find(x => x.id === id); return `<span class="sk">${badge(sk.icon, ['steel', 'blue', 'purple'][sk.r], 26)}${c > 1 ? `<b>${arNum(c)}</b>` : ''}</span>`; }).join('');
    if (n > 1) this.toast(roomKind(n) ? `الباب ${arNum(n)}: زعيم!` : `الباب ${arNum(n)} من ١٥`, 1.6);
  },

  footBoss(name) {
    if (!this.fh) return;
    this.fh.bb.classList.toggle('show', !!name);
    if (name) this.fh.bbn.textContent = name;
  },

  toast(m, t = 2.2) {
    const el = this.ui.querySelector('.hud-msg'); if (!el) return;
    el.textContent = m; el.classList.add('show');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.remove('show'), t * 1000);
  },

  updateFootHUD() {
    const g = this.game, h = this.fh, p = g.p;
    if (!h) return;
    const hpP = Math.round(clamp(p.hp / p.maxHp, 0, 1) * 100);
    if (h.last.hp !== hpP) { h.last.hp = hpP; h.hp.style.width = hpP + '%'; h.hp.parentElement.classList.toggle('low', hpP < 30); }
    const hpT = `${arNum(Math.ceil(p.hp))} / ${arNum(Math.round(p.maxHp))}`;
    if (h.last.hpT !== hpT) { h.last.hpT = hpT; h.hpt.textContent = hpT; }
    if (h.last.scrap !== g.scrap) { h.last.scrap = g.scrap; h.scrap.textContent = fmt(g.scrap); }
    if (g.boss && !g.boss.dead) { const b = Math.round(clamp(g.boss.hp / g.boss.maxHp, 0, 1) * 1000) / 10; if (h.last.bb !== b) { h.last.bb = b; h.bbi.style.width = b + '%'; } }
    const cd = Math.round(clamp(p.dashCdT / p.dashCd, 0, 1) * 100);
    if (h.last.cd !== cd) { h.last.cd = cd; h.cd.style.height = cd + '%'; }
  },

  showSkills(choices) {
    const g = this.game;
    for (const k in g.input) g.input[k] = false;
    this.ui.querySelectorAll('.pad').forEach(b => b.classList.remove('on'));
    const rar = ['عادي', 'نادر', 'ملحمي'];
    const wrap = document.createElement('div');
    wrap.className = 'overlay cards-ov fade-in';
    wrap.innerHTML = `
      <h2>الباب ${arNum(g.n)} خلص!</h2><p class="sub">اختار مهارة واحدة تكمّل بيها (${arNum(15 - g.n)} باب فاضلين)</p>
      <div class="card-row">${choices.map((c, i) => `
        <button class="pcard r${c.r}" data-i="${i}" style="animation-delay:${i * 0.08}s">
          <div class="rar">${rar[c.r]}</div>
          ${badge(c.icon, ['steel', 'blue', 'purple'][c.r], 84, 'pc-ic')}
          <b>${c.name}</b><p>${c.desc}</p>
          ${(g.skills[c.id] || 0) ? `<div class="have">عندك ${arNum(g.skills[c.id])}</div>` : ''}
        </button>`).join('')}
      </div>`;
    this.ui.appendChild(wrap);
    wrap.querySelectorAll('.pcard').forEach(b => b.addEventListener('click', () => { SFX.buy(); wrap.remove(); g.takeSkill(choices[+b.dataset.i]); }));
  },

  lootPop(it) {
    const R = RARITY[it.r];
    const el = document.createElement('div');
    el.className = 'loot-pop r' + it.r;
    el.innerHTML = `${badge(itemIcon(it), R.tone, 56)}<div><small style="color:${R.color}">لقيت ${R.name}!</small><b>${it.name}</b></div>`;
    this.ui.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
  },

  pauseFoot() {
    const g = this.game;
    if (!g || g.paused || g.over) return;
    g.paused = true;
    const chips = Object.entries(g.skills).map(([id, n]) => { const c = SKILLS.find(x => x.id === id); return `<span class="chip r${c.r}">${icon(c.icon, 16)} ${c.name}${n > 1 ? ' ×' + arNum(n) : ''}</span>`; }).join('');
    const wrap = document.createElement('div');
    wrap.className = 'overlay fade-in';
    wrap.innerHTML = `<div class="panel"><h2>واقف</h2><p class="center muted">${g.B.name} · الباب ${arNum(g.n)} من ١٥</p>
      <div class="chips">${chips || '<span class="muted">لسه مخدتش مهارات</span>'}</div>
      <div class="row"><button class="btn primary" data-a="resume">كمّل</button><button class="btn ghost" data-a="quit">اخرج (هتاخد اللي جمعته)</button></div></div>`;
    this.ui.appendChild(wrap);
    wrap.querySelector('[data-a=resume]').onclick = () => { SFX.click(); wrap.remove(); g.paused = false; };
    wrap.querySelector('[data-a=quit]').onclick = () => { SFX.click(); wrap.remove(); g.paused = false; g.finish(false); };
  },

  showFootResults(sum) {
    const s = this.save, B = BUILDINGS[this.bIdx];
    const total = sum.scrap + sum.bonus;
    s.scrap += total;
    for (const it of sum.loot) s.inv.push(it);
    const reached = sum.win ? 15 : Math.max(0, sum.rooms);
    s.bBest[B.id] = Math.max(s.bBest[B.id] || 0, reached);
    let unlocked = false;
    if (sum.win) { s.bWins[B.id] = true; if (this.bIdx + 1 >= s.bUnlocked && s.bUnlocked < BUILDINGS.length) { s.bUnlocked = this.bIdx + 2; unlocked = true; } }
    this.store();
    const wrap = document.createElement('div');
    wrap.className = 'overlay results foot-res fade-in ' + (sum.win ? 'win' : 'lose');
    wrap.innerHTML = `<div class="panel">
      <h2>${sum.win ? 'المبنى نضف!' : 'الزومبي غلبوك'}</h2>
      <div class="doors big">${Array.from({ length: 15 }, (_, k) => `<i class="${k < reached ? 'on' : ''} ${(k + 1) % 5 === 0 ? 'boss' : ''}"></i>`).join('')}</div>
      <div class="res-grid">
        <div><small>أبواب خلصتها</small><b>${arNum(reached)}/١٥</b></div>
        <div><small>زومبي اتقتل</small><b>${arNum(sum.kills)}</b></div>
        <div><small>سكراب</small><b>${fmt(total)}</b></div>
      </div>
      ${sum.loot.length ? `<div class="loot-row"><small>الغنايم اللي لقيتها (اتحطت في الشنطة)</small><div>${sum.loot.map(it => `<span class="lr r${it.r}">${badge(itemIcon(it), RARITY[it.r].tone, 44)}<b>${it.name}</b></span>`).join('')}</div></div>` : ''}
      <p class="tip">${sum.win ? (unlocked ? `اتفتح مبنى جديد: ${BUILDINGS[this.bIdx + 1].name}` : `مكافأة المبنى +${fmt(sum.bonus)}`) : 'طوّر عدّتك من الشنطة، أو جرّب سلاح تاني.'}</p>
      <div class="row">
        <button class="btn primary" data-a="inv">الشنطة</button>
        <button class="btn" data-a="again">${sum.win && BUILDINGS[this.bIdx + 1] ? 'المبنى الجاي' : 'تاني'}</button>
        <button class="btn ghost" data-a="menu">الرئيسية</button>
      </div></div>`;
    this.ui.appendChild(wrap);
    const go = fn => () => { SFX.click(); fn(); };
    wrap.querySelector('[data-a=inv]').onclick = go(() => { this.startDemo(); this.showInventory(true); });
    wrap.querySelector('[data-a=again]').onclick = go(() => this.startFoot(sum.win && BUILDINGS[this.bIdx + 1] ? this.bIdx + 1 : this.bIdx));
    wrap.querySelector('[data-a=menu]').onclick = go(() => { this.startDemo(); this.showMenu(); });
  },
});
