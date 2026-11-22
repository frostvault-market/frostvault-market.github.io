'use strict';
// ---------- on-foot mode data ----------
const BUILDINGS = [
  {
    id: 'apartment', name: 'العمارة المهجورة', sub: 'عمارة في وسط البلد. السكان اتحولوا، والجزار مستني في الدور الخامس.',
    icon: 'house', tier: 1, reward: 900,
    wall: ['#6e6250', '#4c4236'], wall2: '#3a3128', trim: '#2a221c', floor: '#5a3e28', floorTop: '#8a6440', plat: 'wood',
    light: '#ffcf8a', window: ['#2a1d3a', '#c46a4a'], decor: ['sofa', 'tv', 'shelf', 'fridge', 'lamp', 'frame', 'plant', 'table'],
    posters: ['ممنوع ركن العربيات', 'شقة للإيجار', 'مطلوب سباك'], dark: 0.42,
  },
  {
    id: 'hospital', name: 'المستشفى العام', sub: 'هنا بدأ الوباء. الممرات ريحتها دم ومطهّر.',
    icon: 'hospital', tier: 2, reward: 1800,
    wall: ['#a9c4c0', '#6f8f8a'], wall2: '#4a6662', trim: '#2c3e3b', floor: '#5d6b6a', floorTop: '#9fb1ae', plat: 'metal',
    light: '#d8f4ff', window: ['#0c1424', '#2a3a5a'], decor: ['bed', 'curtain', 'iv', 'cabinet', 'wheelchair', 'cross', 'frame'],
    posters: ['طوارئ', 'ممنوع التدخين', 'الهدوء من فضلك', 'معمل التحاليل'], dark: 0.5,
  },
  {
    id: 'mall', name: 'المول التجاري', sub: 'كان مليان ناس يوم الخميس. لسه مليان... بس مش ناس.',
    icon: 'shop', tier: 3, reward: 3200,
    wall: ['#4a4058', '#2e2838'], wall2: '#221d2a', trim: '#141018', floor: '#3a3440', floorTop: '#8e8698', plat: 'glass',
    light: '#ffd6f0', window: ['#100a1a', '#3a1d4a'], decor: ['shopfront', 'mannequin', 'rack', 'shelf', 'plant', 'bench', 'neon'],
    posters: ['تخفيضات ٥٠٪', 'الدور التاني', 'كافيه', 'خروج'], dark: 0.5,
  },
  {
    id: 'factory', name: 'مصنع الكيماويات', sub: 'مصدر الفيروس. العملاق الملك محبوس في آخر عنبر.',
    icon: 'factory', tier: 4, reward: 5500,
    wall: ['#4a4a44', '#2c2c28'], wall2: '#1e1e1a', trim: '#121210', floor: '#3a3a36', floorTop: '#6e6e66', plat: 'grate',
    light: '#ffe08a', window: ['#1a0a06', '#5a2010'], decor: ['pipes', 'tank', 'machine', 'barrels', 'hazard', 'chain', 'crates'],
    posters: ['خطر: مواد سامة', 'البس الخوذة', 'ممنوع الدخول'], dark: 0.55,
  },
];

// foot enemies reuse zombie art types
const FOES = {
  walker:  { art: 'walker', hp: 24, speed: 75, dmg: 10, w: 30, h: 78, scrap: 2, xp: 1 },
  runner:  { art: 'runner', hp: 16, speed: 215, dmg: 8, w: 28, h: 74, scrap: 3, xp: 1 },
  fat:     { art: 'fat', hp: 95, speed: 55, dmg: 18, w: 50, h: 86, scrap: 6, xp: 2, heavy: true },
  spitter: { art: 'spitter', hp: 30, speed: 45, dmg: 12, w: 30, h: 80, scrap: 4, xp: 2, ranged: true },
  boomer:  { art: 'boomer', hp: 26, speed: 95, dmg: 30, w: 36, h: 82, scrap: 4, xp: 2, explodes: true },
  leaper:  { art: 'clinger', hp: 18, speed: 130, dmg: 9, w: 26, h: 62, scrap: 3, xp: 1, leaps: true },
};
const BOSSES = {
  butcher: { name: 'الجزار', art: 'brute', hp: 650, speed: 95, dmg: 22, w: 90, h: 180, scrap: 120, color: '#7a5a3a' },
  acid:    { name: 'أم الحمض', art: 'brute', hp: 950, speed: 60, dmg: 18, w: 110, h: 170, scrap: 200, color: '#5a8a3a', acid: true },
  king:    { name: 'العملاق الملك', art: 'brute', hp: 1600, speed: 110, dmg: 28, w: 110, h: 210, scrap: 400, color: '#6a3a5a', king: true },
};

// room plan: 15 doors, bosses at 5, 10, 15
function roomKind(n) { return n === 15 ? 'king' : n === 10 ? 'acid' : n === 5 ? 'butcher' : null; }

// ---------- in-run skills ----------
// r: rarity 0 common, 1 rare, 2 epic
const SKILLS = [
  { id: 'dmg', name: 'رصاص تقيل', desc: 'الضرر +22%', icon: 'dmg', r: 0, max: 6, apply: p => p.mods.dmg += 0.22 },
  { id: 'rate', name: 'إيد سريعة', desc: 'سرعة الضرب +20%', icon: 'gun', r: 0, max: 6, apply: p => p.mods.rate += 0.2 },
  { id: 'hp', name: 'جسم حديد', desc: 'أقصى صحة +30، وبتتملي 30', icon: 'health', r: 0, max: 6, apply: p => { p.maxHp += 30; p.hp += 30; } },
  { id: 'heal', name: 'شنطة إسعاف', desc: 'بتستعيد 50% من صحتك', icon: 'firstaid', r: 0, max: 99, apply: p => p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5) },
  { id: 'crit', name: 'عين الصقر', desc: 'فرصة الضربة القاضية +12%', icon: 'crit', r: 0, max: 4, apply: p => p.crit += 12 },
  { id: 'speed', name: 'رجلين خفاف', desc: 'سرعة الجري +15%', icon: 'speed', r: 0, max: 3, apply: p => p.mods.speed += 0.15 },
  { id: 'armor', name: 'جلد تخين', desc: 'الضرر اللي بييجي عليك −12%', icon: 'armor', r: 0, max: 4, apply: p => p.armor = Math.min(70, p.armor + 12) },
  { id: 'magnet', name: 'جيوب واسعة', desc: 'بتلم من بعيد، والسكراب +30%', icon: 'magnet', r: 0, max: 3, apply: p => { p.magnet += 150; p.scrapMul += 0.3; } },
  { id: 'djump', name: 'نطّة مزدوجة', desc: 'تقدر تنط تاني في الهوا', icon: 'jump', r: 1, max: 1, apply: p => p.jumpsMax = 2 },
  { id: 'dash', name: 'زحلقة قاتلة', desc: 'الزحلقة أسرع 40% وبتأذي اللي في طريقها', icon: 'dash', r: 1, max: 2, apply: p => { p.dashCd *= 0.6; p.dashDmg += 30; } },
  { id: 'multi', name: 'طلقة زيادة', desc: '+1 طلقة في كل ضربة', icon: 'multishot', r: 1, max: 3, apply: p => p.extraShots += 1 },
  { id: 'pierce', name: 'رصاص خارق', desc: 'الطلقة بتعدّي في زومبي زيادة', icon: 'pierce', r: 1, max: 3, apply: p => p.pierce += 1 },
  { id: 'ricochet', name: 'ارتداد', desc: 'الطلقة بترتد على أقرب زومبي', icon: 'ricochet', r: 1, max: 2, apply: p => p.ricochet += 1 },
  { id: 'fire', name: 'رصاص حارق', desc: 'بيولّع في الزومبي (ضرر مع الوقت)', icon: 'fire', r: 1, max: 3, apply: p => p.burn += 1 },
  { id: 'frost', name: 'رصاص تلج', desc: 'بيبطّأ الزومبي 40%', icon: 'freeze', r: 1, max: 1, apply: p => p.frost = true },
  { id: 'vamp', name: 'مصّاص', desc: 'بتسحب 4% من الضرر صحة', icon: 'lifesteal', r: 1, max: 3, apply: p => p.lifesteal += 4 },
  { id: 'thorns', name: 'شوك', desc: 'اللي يلمسك بياخد ضرر، وضرر اللمس عليك −25%', icon: 'thorns', r: 1, max: 2, apply: p => { p.thorns += 25; p.contactRes += 0.25; } },
  { id: 'regen', name: 'نَفَس طويل', desc: 'بتتعالج 2 صحة كل ثانية', icon: 'regen', r: 1, max: 3, apply: p => p.regen += 2 },
  { id: 'boom', name: 'رصاص متفجر', desc: '20% من الطلقات بتنفجر', icon: 'explosive', r: 2, max: 2, apply: p => p.explosive += 0.2 },
  { id: 'saws', name: 'مناشير دوّارة', desc: 'منشار بيلف حواليك ويقطّع', icon: 'orbit', r: 2, max: 3, apply: p => p.saws += 1 },
  { id: 'drone', name: 'درون مساعد', desc: 'درون بيطير جنبك ويضرب', icon: 'drone', r: 2, max: 2, apply: p => p.drones += 1 },
  { id: 'shock', name: 'صاعق', desc: 'كهربا بتنط على 4 زومبي كل 2.5 ثانية', icon: 'shock', r: 2, max: 2, apply: p => p.shock += 1 },
  { id: 'grenade', name: 'قنابل', desc: 'بترمي قنبلة كل 4 ثواني', icon: 'grenade', r: 2, max: 2, apply: p => p.grenades += 1 },
  { id: 'revive', name: 'روح تانية', desc: 'لو مت هتقوم تاني بنص صحتك (مرة واحدة)', icon: 'revive', r: 2, max: 1, apply: p => p.revive = 1 },
];
