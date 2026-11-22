'use strict';
// World scale: 1 meter = 40 world units
const PX = 40;

// ---------- vehicles ----------
// base stats are multiplied by upgrade levels (0..5)
const VEHICLES = [
  {
    id: 'sedan', name: 'الملاكي العجوز', desc: 'عربية قديمة من أيام زمان. خفيفة وسريعة، بس الصاج بتاعها خفيف.',
    price: 0, color: '#c8a24a', accent: '#6b4b1d',
    len: 170, h: 46, wheelR: 21, wheelBase: 108, mass: 1.0,
    engine: 1500, topSpeed: 24, fuel: 100, armor: 120, grip: 1.0, seats: 1, style: 'sedan',
  },
  {
    id: 'pickup', name: 'النص نقل', desc: 'بيك أب شغّال. صحته أعلى، وعنده كرسي زيادة لناجي كمان.',
    price: 2500, color: '#3f6f8f', accent: '#1d3346',
    len: 196, h: 54, wheelR: 25, wheelBase: 124, mass: 1.3,
    engine: 2050, topSpeed: 26, fuel: 120, armor: 150, grip: 1.08, seats: 2, style: 'pickup',
  },
  {
    id: 'jeep', name: 'الجيب العسكري', desc: 'جيب جيش بعجل جبلي. بيطلع أي طلعة وماسك في الأرض.',
    price: 9000, color: '#5d6b3a', accent: '#2c331b',
    len: 186, h: 60, wheelR: 29, wheelBase: 118, mass: 1.5,
    engine: 2700, topSpeed: 28, fuel: 140, armor: 220, grip: 1.22, seats: 2, style: 'jeep',
  },
  {
    id: 'bus', name: 'المايكروباص المدرّع', desc: 'وحش الطريق. تقيل جدًا، بيفرم أي حاجة قدامه، وفيه 3 كراسي للناجين.',
    price: 24000, color: '#e9e2d0', accent: '#a63a2a',
    len: 236, h: 78, wheelR: 27, wheelBase: 150, mass: 2.1,
    engine: 3900, topSpeed: 27, fuel: 170, armor: 340, grip: 1.12, seats: 3, style: 'bus',
  },
];

const UPGRADES = [
  { id: 'engine', name: 'الموتور', desc: 'قوة وسرعة أعلى', icon: 'engine', costs: [300, 700, 1500, 3000, 6000] },
  { id: 'fuel', name: 'تانك البنزين', desc: 'مسافة أطول', icon: 'fuel', costs: [250, 600, 1300, 2600, 5000] },
  { id: 'armor', name: 'التصفيح', desc: 'صحة أعلى وصدمات أقل', icon: 'armor', costs: [300, 750, 1600, 3200, 6200] },
  { id: 'gun', name: 'الرشاش', desc: 'رشاش فوق السقف', icon: 'gun', costs: [400, 900, 1900, 3800, 7000] },
  { id: 'nitro', name: 'النيترو', desc: 'دفعة سرعة جامدة', icon: 'nitro', costs: [350, 800, 1700, 3400, 6500] },
  { id: 'ram', name: 'الكسّاحة', desc: 'سنون حديد قدّام', icon: 'ram', costs: [300, 700, 1500, 3000, 5800] },
];

// ---------- zombies ----------
const ZOMBIES = {
  walker:  { hp: 20, mass: 0.12, w: 26, h: 78, speed: 0.6, dmg: 4, scrap: 3, color: ['#6f8a5a', '#7d8f63', '#8a9466'] },
  runner:  { hp: 14, mass: 0.10, w: 24, h: 74, speed: 3.2, dmg: 3, scrap: 4, color: ['#8a6f5a', '#937a63'] },
  fat:     { hp: 70, mass: 0.45, w: 46, h: 86, speed: 0.4, dmg: 10, scrap: 10, color: ['#7c8a5d', '#8d9a68'] },
  clinger: { hp: 12, mass: 0.06, w: 22, h: 60, speed: 2.0, dmg: 2, scrap: 6, color: ['#9a7c8d', '#8d6f9a'] },
  spitter: { hp: 26, mass: 0.14, w: 28, h: 80, speed: 0.3, dmg: 0, scrap: 8, color: ['#6f9a6a', '#5f8f75'] },
  boomer:  { hp: 30, mass: 0.2, w: 34, h: 82, speed: 0.5, dmg: 0, scrap: 9, color: ['#a8885a'] },
  brute:   { hp: 600, mass: 3.0, w: 96, h: 190, speed: 1.2, dmg: 40, scrap: 300, color: ['#6a7a52'] },
};

// ---------- stages ----------
const STAGES = [
  {
    id: 'city', name: 'شوارع المدينة', sub: 'القاهرة وقعت. اطلع من المدينة قبل ما الليل يدخل.',
    length: 2200, reward: 600, seed: 101,
    sky: ['#2b1d3a', '#9c4a4a', '#f0a35e'], sun: { x: 0.72, y: 0.62, r: 70, color: '#ffd59a' },
    fog: '#d0866a', ground: 'asphalt', groundColor: '#3b3634', topColor: '#55504b', layers: 'city', night: false,
    density: 1.0, mix: { walker: 6, runner: 2, fat: 1, clinger: 1 },
    hill: 1.0, boss: 'brute', bossHp: 500,
  },
  {
    id: 'desert', name: 'الطريق الصحراوي', sub: 'شمس نار ورمل. البنزين بيخلص بسرعة، ركّز في البراميل.',
    length: 2800, reward: 1200, seed: 202,
    sky: ['#3d7cc0', '#8fbfe0', '#f2dcae'], sun: { x: 0.25, y: 0.22, r: 46, color: '#fff7dc' },
    fog: '#e9d3a5', ground: 'sand', groundColor: '#c99a5b', topColor: '#e6bf80', layers: 'desert', night: false,
    density: 1.25, mix: { walker: 5, runner: 3, fat: 2, clinger: 2, spitter: 1, boomer: 1 },
    hill: 1.5, boss: 'brute', bossHp: 800,
  },
  {
    id: 'valley', name: 'الوادي بالليل', sub: 'ضلمة كحل. النور بتاعك هو بس اللي هيبيّنلك الطريق.',
    length: 3200, reward: 2200, seed: 303,
    sky: ['#05070f', '#141c33', '#2c3553'], sun: { x: 0.8, y: 0.2, r: 34, color: '#e8eefc', moon: true },
    fog: '#1b2238', ground: 'rock', groundColor: '#3a3430', topColor: '#5a5048', layers: 'valley', night: true,
    density: 1.45, mix: { walker: 5, runner: 4, fat: 2, clinger: 3, spitter: 2, boomer: 2 },
    hill: 1.9, boss: 'brute', bossHp: 1200,
  },
  {
    id: 'base', name: 'القاعدة العسكرية', sub: 'آخر طيارة إنقاذ مستنية هناك. عاصفة حمرا وجيش من الزومبي.',
    length: 3600, reward: 4000, seed: 404,
    sky: ['#2a0d0b', '#7a2a18', '#d36a35'], sun: { x: 0.5, y: 0.5, r: 90, color: '#ffb070' },
    fog: '#a2482a', ground: 'concrete', groundColor: '#575049', topColor: '#77706a', layers: 'base', night: false, storm: true,
    density: 1.75, mix: { walker: 5, runner: 5, fat: 3, clinger: 3, spitter: 3, boomer: 3 },
    hill: 2.1, boss: 'brute', bossHp: 1800,
  },
];

// ---------- in-run cards (roguelite) ----------
// rarity: 0 common, 1 rare, 2 epic
const CARDS = [
  { id: 'eng', name: 'موتور متعدّل', desc: 'قوة الموتور +18%', r: 0, icon: 'engine', max: 4, apply: s => s.engineMul *= 1.18 },
  { id: 'tank', name: 'جركن احتياطي', desc: 'البنزين يتملي +40%، وأقصى سعة +25%', r: 0, icon: 'fuel', max: 5, apply: (s, g) => { s.fuelMax *= 1.25; g.car.fuel = Math.min(s.fuelMax, g.car.fuel + s.fuelMax * 0.4); } },
  { id: 'plate', name: 'صاج زيادة', desc: 'أقصى صحة +30، والعربية تتصلح 40', r: 0, icon: 'armor', max: 5, apply: (s, g) => { s.armorMax += 30; g.car.hp = Math.min(s.armorMax, g.car.hp + 40); } },
  { id: 'spikes', name: 'سنون مسنونة', desc: 'الخبطة بتأذي +60%، وبتهدّي أقل', r: 0, icon: 'ram', max: 4, apply: s => { s.ramMul *= 1.6; s.hitSlow *= 0.8; } },
  { id: 'rof', name: 'زناد خفيف', desc: 'سرعة ضرب النار +30%', r: 0, icon: 'gun', max: 4, apply: s => s.fireRate *= 1.3 },
  { id: 'cool', name: 'مبرّد مية', desc: 'الرشاش بيسخن أبطأ 40%', r: 0, icon: 'cool', max: 3, apply: s => s.heatMul *= 0.6 },
  { id: 'magnet', name: 'مغناطيس سكراب', desc: 'بتلم السكراب من بعيد، والسكراب +20%', r: 0, icon: 'magnet', max: 3, apply: s => { s.magnet += 120; s.scrapMul *= 1.2; } },
  { id: 'nos', name: 'أنبوبة نيترو', desc: 'سعة النيترو +50%، وتتملي على الآخر', r: 0, icon: 'nitro', max: 4, apply: (s, g) => { s.nitroMax *= 1.5; g.car.nitro = s.nitroMax; } },
  { id: 'pierce', name: 'رصاص خارق', desc: 'الرصاصة بتعدّي في زومبي زيادة', r: 1, icon: 'pierce', max: 3, apply: s => s.pierce += 1 },
  { id: 'bloodfuel', name: 'بنزين أحمر', desc: 'كل زومبي بتفرمه بيرجّعلك شوية بنزين', r: 1, icon: 'blood', max: 3, apply: s => s.killFuel += 0.45 },
  { id: 'regen', name: 'ميكانيكي آلي', desc: 'العربية بتتصلح لوحدها 1.5 كل ثانية', r: 1, icon: 'wrench', max: 3, apply: s => s.regen += 1.5 },
  { id: 'stunt', name: 'شقلباظ', desc: 'كل شقلبة كاملة: نيترو على الآخر و+40 سكراب', r: 1, icon: 'flip', max: 1, apply: s => s.flipBonus = true },
  { id: 'soft', name: 'مساعدين هوا', desc: 'مفيش ضرر من النطّ، والهبوط بيملا نيترو', r: 1, icon: 'spring', max: 1, apply: s => s.softLanding = true },
  { id: 'grip', name: 'عجل جبلي', desc: 'ماسك في الأرض +25%', r: 0, icon: 'wheel', max: 3, apply: s => s.gripMul *= 1.25 },
  { id: 'boom', name: 'زومبي ملغّم', desc: '25% من الزومبي بينفجروا لما يموتوا وياخدوا اللي جنبهم', r: 2, icon: 'boom', max: 2, apply: s => s.explodeChance += 0.25 },
  { id: 'rocket', name: 'قاذف صواريخ', desc: 'صاروخ كل 3.5 ثانية على أتقل هدف', r: 2, icon: 'rocket', max: 3, apply: s => s.rockets += 1 },
  { id: 'saw', name: 'منشار قدّامي', desc: 'منشار بيفرم الزومبي حتى وانت ماشي براحة', r: 2, icon: 'saw', max: 1, apply: s => s.saw = true },
  { id: 'shock', name: 'صاعق كهربا', desc: 'كل 2 ثانية الكهربا بتنط على 3 زومبي جنب العربية', r: 2, icon: 'shock', max: 2, apply: s => s.shock += 1 },
];

// ---------- survivors (our twist) ----------
const SURVIVORS = [
  { id: 'mech', name: 'عم صبحي الميكانيكي', desc: 'بيصلّح العربية وهي ماشية (+2 صحة/ث)', color: '#4a6fa5', hat: 'cap', apply: s => s.regen += 2 },
  { id: 'sniper', f: true, name: 'نادية القناصة', desc: 'بتضرب بالبندقية من الشباك', color: '#6a4a8a', hat: 'hair', apply: s => s.sniper += 1 },
  { id: 'scav', name: 'حمو البلية', desc: 'بيلقّط السكراب (+40% سكراب)', color: '#8a6a3a', hat: 'beanie', apply: s => s.scrapMul *= 1.4 },
  { id: 'driver', name: 'الأسطى رجب', desc: 'سواق تاكسي قديم: البنزين بيخلص أبطأ 30%', color: '#3a7a5a', hat: 'mustache', apply: s => s.fuelUse *= 0.7 },
  { id: 'doc', f: true, name: 'دكتورة منى', desc: 'كل زومبي بتموّته بيصلّح 1 صحة', color: '#c85a5a', hat: 'hair2', apply: s => s.killHeal += 1 },
];
