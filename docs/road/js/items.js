'use strict';
// ---------- equipment for the on-foot mode: 6 slots ----------
const RARITY = [
  { name: 'عادي', tone: 'steel', color: '#c9d3dc', mul: 1.0, bonus: 0 },
  { name: 'نادر', tone: 'blue', color: '#5ab8ff', mul: 1.3, bonus: 1 },
  { name: 'ملحمي', tone: 'purple', color: '#c77dff', mul: 1.7, bonus: 2 },
  { name: 'أسطوري', tone: 'orange', color: '#ff9a2a', mul: 2.2, bonus: 3 },
];

const SLOTS = [
  { id: 'weapon', name: 'السلاح', icon: 'pistol' },
  { id: 'helmet', name: 'الخوذة', icon: 'helmet' },
  { id: 'vest', name: 'الصديري', icon: 'vest' },
  { id: 'gloves', name: 'الجوانتي', icon: 'gloves' },
  { id: 'boots', name: 'البوت', icon: 'boots' },
  { id: 'charm', name: 'التعويذة', icon: 'charm' },
];

// weapon archetypes. dmg is per projectile
const WEAPONS = {
  pistol:   { name: 'مسدس', icon: 'pistol', dmg: 11, rate: 3.2, speed: 1100, spread: 0.03, pellets: 1, range: 900, pierce: 0, desc: 'متوازن وسريع' },
  uzi:      { name: 'رشاش صغير', icon: 'uzi', dmg: 5.5, rate: 10, speed: 1150, spread: 0.13, pellets: 1, range: 800, pierce: 0, desc: 'رش رصاص كتير' },
  shotgun:  { name: 'خرطوش', icon: 'shotgun', dmg: 7.5, rate: 1.25, speed: 1000, spread: 0.36, pellets: 6, range: 480, pierce: 0, desc: 'قاتل من قريب' },
  rifle:    { name: 'بندقية قناصة', icon: 'rifle', dmg: 34, rate: 1.4, speed: 1800, spread: 0.0, pellets: 1, range: 1400, pierce: 2, desc: 'بتعدّي في كذا زومبي' },
  flamer:   { name: 'قاذف لهب', icon: 'flamer', dmg: 3.2, rate: 22, speed: 520, spread: 0.18, pellets: 1, range: 300, pierce: 9, flame: true, desc: 'بيولّع في كل اللي قدامه' },
  launcher: { name: 'قاذف قنابل', icon: 'launcher', dmg: 38, rate: 0.85, speed: 750, spread: 0.02, pellets: 1, range: 1000, pierce: 0, aoe: 120, arc: true, desc: 'انفجار بيطيّر المجموعة' },
};

const STAT_INFO = {
  hp: { name: 'صحة', fmt: v => `+${Math.round(v)}` },
  armor: { name: 'تقليل ضرر', fmt: v => `+${Math.round(v)}%` },
  dmg: { name: 'ضرر', fmt: v => `+${Math.round(v)}%` },
  rate: { name: 'سرعة الضرب', fmt: v => `+${Math.round(v)}%` },
  crit: { name: 'فرصة ضربة قاضية', fmt: v => `+${Math.round(v)}%` },
  critDmg: { name: 'قوة الضربة القاضية', fmt: v => `+${Math.round(v)}%` },
  speed: { name: 'سرعة الجري', fmt: v => `+${Math.round(v)}%` },
  jump: { name: 'قوة النط', fmt: v => `+${Math.round(v)}%` },
  regen: { name: 'صحة كل ثانية', fmt: v => `+${v.toFixed(1)}` },
  lifesteal: { name: 'سحب حياة', fmt: v => `+${v.toFixed(1)}%` },
  scrap: { name: 'سكراب زيادة', fmt: v => `+${Math.round(v)}%` },
  dodge: { name: 'فرصة تفادي', fmt: v => `+${Math.round(v)}%` },
};

// main stat per slot and bonus pools
const SLOT_GEN = {
  weapon: { main: null, pool: ['dmg', 'rate', 'crit', 'critDmg', 'lifesteal'] },
  helmet: { main: ['hp', 30], pool: ['crit', 'critDmg', 'armor', 'regen', 'dodge'], names: ['خوذة عسكرية', 'خوذة موتوسيكل', 'كاب مدرّع', 'قناع غاز'] },
  vest: { main: ['armor', 7], pool: ['hp', 'regen', 'dodge', 'lifesteal'], names: ['صديري واقي', 'جاكت جلد', 'درع كيفلر', 'صديري شرطة'] },
  gloves: { main: ['rate', 9], pool: ['dmg', 'crit', 'critDmg', 'lifesteal'], names: ['جوانتي جلد', 'جوانتي تكتيكي', 'جوانتي ملاكمة', 'جوانتي حديد'] },
  boots: { main: ['speed', 8], pool: ['jump', 'dodge', 'hp', 'regen'], names: ['بوت عسكري', 'كوتشي جري', 'بوت حديد', 'بوت صحراوي'] },
  charm: { main: ['scrap', 12], pool: ['lifesteal', 'regen', 'crit', 'dodge', 'dmg'], names: ['سلسلة فضة', 'خرزة زرقا', 'مفتاح قديم', 'كف مريم'] },
};
const BONUS_ROLL = { hp: [12, 28], armor: [3, 7], dmg: [6, 14], rate: [5, 12], crit: [3, 8], critDmg: [15, 35], speed: [4, 9], jump: [5, 12], regen: [0.4, 1.2], lifesteal: [0.8, 2.2], scrap: [8, 20], dodge: [3, 7] };

let _uid = Date.now() % 100000;
function makeItem(slot, rarity, tier = 1, kind) {
  const R = RARITY[rarity];
  const it = { uid: ++_uid, slot, r: rarity, lv: 1, tier, stats: {} };
  const gen = SLOT_GEN[slot];
  if (slot === 'weapon') {
    it.kind = kind || pick(Object.keys(WEAPONS));
    it.name = WEAPONS[it.kind].name;
    it.power = Math.round(R.mul * (1 + (tier - 1) * 0.35) * 100) / 100;
  } else {
    it.name = pick(gen.names);
    const [k, base] = gen.main;
    it.stats[k] = Math.round(base * R.mul * (1 + (tier - 1) * 0.3) * 10) / 10;
  }
  const pool = gen.pool.slice();
  for (let i = 0; i < R.bonus && pool.length; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const [a, b] = BONUS_ROLL[k];
    it.stats[k] = (it.stats[k] || 0) + Math.round(rand(a, b) * (1 + (tier - 1) * 0.25) * 10) / 10;
  }
  return it;
}
function rollRarity(luck = 0) {
  const w = [60 - luck * 10, 28 + luck * 3, 10 + luck * 4, 2 + luck * 3];
  let v = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) { if ((v -= w[i]) <= 0) return i; }
  return 0;
}
function randomItem(tier, luck) { return makeItem(pick(SLOTS).id, rollRarity(luck), tier); }

function itemIcon(it) { return it.slot === 'weapon' ? WEAPONS[it.kind].icon : SLOTS.find(s => s.id === it.slot).icon; }
function levelMul(it) { return 1 + (it.lv - 1) * 0.12; }
function upgradeCost(it) { return Math.round((120 + it.r * 140) * Math.pow(1.6, it.lv - 1) * (1 + (it.tier - 1) * 0.4)); }
function salvageValue(it) { return Math.round((25 + it.r * 60) * (1 + (it.lv - 1) * 0.5) * it.tier); }
const MAX_ITEM_LV = 10;

// combine equipped items into player stats
function heroStats(equipped) {
  const s = { hp: 100, armor: 0, dmg: 0, rate: 0, crit: 5, critDmg: 100, speed: 0, jump: 0, regen: 0, lifesteal: 0, scrap: 0, dodge: 0 };
  let weapon = null;
  for (const slot of SLOTS) {
    const it = equipped[slot.id];
    if (!it) continue;
    const m = levelMul(it);
    for (const [k, v] of Object.entries(it.stats)) s[k] += v * m;
    if (slot.id === 'weapon') weapon = it;
  }
  if (!weapon) weapon = { kind: 'pistol', power: 0.8, lv: 1, r: 0 };
  const W = WEAPONS[weapon.kind];
  s.weapon = { ...W, kind: weapon.kind, dmg: W.dmg * weapon.power * (weapon.lv ? levelMul(weapon) : 1) };
  s.armor = Math.min(s.armor, 60); s.dodge = Math.min(s.dodge, 40);
  return s;
}

function itemStatLines(it) {
  const lines = [];
  if (it.slot === 'weapon') {
    const W = WEAPONS[it.kind];
    lines.push(['ضرر الطلقة', Math.round(W.dmg * it.power * levelMul(it)) + (W.pellets > 1 ? ` × ${W.pellets}` : '')]);
    lines.push(['طلقات/ثانية', W.rate.toFixed(1)]);
  }
  const m = levelMul(it);
  for (const [k, v] of Object.entries(it.stats)) lines.push([STAT_INFO[k].name, STAT_INFO[k].fmt(v * m)]);
  return lines;
}
