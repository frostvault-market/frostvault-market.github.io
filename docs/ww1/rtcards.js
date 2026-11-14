// ===== إحصائيات المعركة الحية (Real-time) =====
// c: التكلفة بالإمداد | n: عدد الأفراد | hp: صحة الفرد | dmg: ضرر الطلقة | cd: ثواني بين الطلقات | r: المدى
// spd: السرعة | sp: نصف قطر الانفجار | proj: قذيفة بتطير | ar: الدرع (بيتطرح من كل طلقة مش مضادة للدروع)
// look: شكل الرسم | w: صوت/شكل السلاح
const RT = {
  rifle:    { c: 2, n: 4, hp: 68, dmg: 11, cd: 1.0, r: 80, spd: 26, look: 'rifle', w: 'rifle' },
  poilu:    { c: 3, n: 4, hp: 90, dmg: 12, cd: 1.1, r: 80, spd: 25, look: 'rifle', w: 'rifle' },
  arditi:   { c: 2, n: 3, hp: 68, dmg: 19, cd: 0.8, r: 14, spd: 44, look: 'assault', w: 'melee' },
  storm:    { c: 3, n: 4, hp: 76, dmg: 15, cd: 1.0, r: 34, spd: 38, sp: 14, look: 'assault', w: 'grenade' },
  sniper:   { c: 3, n: 1, hp: 80, dmg: 72, cd: 2.4, r: 175, spd: 22, look: 'sniper', w: 'sniper', pref: 'INF' },
  vickers:  { c: 3, n: 1, hp: 235, dmg: 6, cd: 0.14, r: 112, spd: 16, look: 'mg', w: 'mg', pref: 'INF' },
  mg08:     { c: 4, n: 1, hp: 280, dmg: 7, cd: 0.13, r: 118, spd: 14, look: 'mg', w: 'mg', pref: 'INF' },
  lewis:    { c: 2, n: 1, hp: 120, dmg: 5, cd: 0.17, r: 92, spd: 24, look: 'lewis', w: 'mg', pref: 'INF' },
  atrifle:  { c: 2, n: 2, hp: 70, dmg: 30, cd: 1.7, r: 110, spd: 24, look: 'atrifle', w: 'sniper', pref: 'ARM' },
  bundle:   { c: 3, n: 3, hp: 95, dmg: 80, cd: 2.0, r: 24, spd: 32, sp: 12, look: 'assault', w: 'grenade', pref: 'ARM' },
  flame:    { c: 4, n: 1, hp: 235, dmg: 14, cd: 0.22, r: 50, spd: 24, sp: 24, look: 'flame', w: 'flame', pref: 'INF' },
  cav:      { c: 3, n: 3, hp: 118, dmg: 18, cd: 0.9, r: 14, spd: 58, look: 'cav', w: 'melee' },
  dough:    { c: 4, n: 5, hp: 92, dmg: 11, cd: 1.0, r: 80, spd: 26, look: 'rifle', w: 'rifle' },
  medic:    { c: 2, n: 2, hp: 70, dmg: 0, cd: 0.5, r: 55, spd: 26, heal: 9, look: 'medic', w: '' },
  ottoman:  { c: 3, n: 4, hp: 108, dmg: 9, cd: 1.1, r: 78, spd: 22, look: 'rifle', w: 'rifle' },
  tk_para:  { c: 0, n: 1, hp: 60, dmg: 10, cd: 0.9, r: 75, spd: 30, look: 'rifle', w: 'rifle' },

  car:      { c: 3, n: 1, hp: 400, ar: 3, dmg: 7, cd: 0.2, r: 92, spd: 52, look: 'car', w: 'mg' },
  ft:       { c: 4, n: 1, hp: 590, ar: 5, dmg: 24, cd: 1.2, r: 112, spd: 19, proj: 1, look: 'ft', w: 'cannon' },
  whippet:  { c: 4, n: 1, hp: 530, ar: 4, dmg: 6, cd: 0.17, r: 96, spd: 34, look: 'whippet', w: 'mg' },
  mk4f:     { c: 5, n: 1, hp: 760, ar: 6, dmg: 6, cd: 0.14, r: 104, spd: 14, look: 'rhomb', w: 'mg', pref: 'INF' },
  mk4m:     { c: 6, n: 1, hp: 740, ar: 6, dmg: 48, cd: 1.6, r: 132, spd: 14, proj: 1, look: 'rhomb', w: 'cannon', pref: 'ARM' },
  ca1:      { c: 5, n: 1, hp: 700, ar: 5, dmg: 38, cd: 1.8, r: 122, spd: 15, sp: 18, proj: 1, look: 'box', w: 'cannon' },
  stchamond:{ c: 6, n: 1, hp: 720, ar: 5, dmg: 64, cd: 2.0, r: 150, spd: 13, proj: 1, look: 'long', w: 'cannon', pref: 'ARM' },
  a7v:      { c: 8, n: 1, hp: 1300, ar: 6, dmg: 30, cd: 0.8, r: 130, spd: 11, sp: 14, proj: 1, look: 'a7v', w: 'cannon' },

  stokes:   { c: 3, n: 1, hp: 140, dmg: 44, cd: 2.4, r: 200, min: 50, spd: 16, sp: 24, proj: 1, look: 'mortar', w: 'mortar' },
  fk77:     { c: 4, n: 1, hp: 230, dmg: 54, cd: 2.1, r: 170, spd: 10, proj: 1, look: 'gun', w: 'cannon', pref: 'ARM' },
  f75:      { c: 4, n: 1, hp: 210, dmg: 36, cd: 1.0, r: 190, spd: 10, sp: 18, proj: 1, look: 'gun', w: 'cannon' },
  howitzer: { c: 5, n: 1, hp: 250, dmg: 78, cd: 3.4, r: 240, min: 60, spd: 8, sp: 30, proj: 1, look: 'howitzer', w: 'big' },
  bertha:   { c: 9, n: 1, hp: 450, dmg: 140, cd: 6.5, r: 280, min: 70, spd: 5, sp: 38, proj: 1, look: 'bertha', w: 'big' },

  // تكتيكات: zone: أي مكان | own: في نصّك بس
  x_para:    { c: 4, zone: 'any', r: 22, text: '4 مظلّيين بينزلوا في أي حتة في الخريطة، حتى ورا خطوط العدو.' },
  x_barrage: { c: 4, zone: 'any', r: 55, text: '3 موجات قصف على منطقة. كويس ضد المشاة المتجمّعين (الدرع بيقلّله).' },
  x_bomber:  { c: 4, zone: 'any', r: 38, text: 'قاذفة بترمي 3 قنابل تقيلة. بتتجاهل الدرع. ضررها أقل على المباني.' },
  x_mine:    { c: 2, zone: 'own', r: 30, text: 'لغم مخفي عن العدو. أول وحدة أرضية تدوس عليه بتاخد ضرر كبير.' },
  x_trench:  { c: 2, zone: 'own', r: 20, text: 'خندق بأكياس رمل بيشد هجوم العدو ليه لمدة 40 ثانية.' },
  x_fort:    { c: 4, zone: 'own', r: 20, text: 'مدفع محصّن بيضرب أي عدو يقرّب لمدة 40 ثانية.' },
  x_gas:     { c: 3, zone: 'any', r: 60, text: 'سحابة غاز 7 ثواني بتأذي مشاة العدو بس.' },
  x_recon:   { c: 2, zone: 'any', r: 90, text: 'بيكشف ويفجّر ألغام العدو، والعدو في المنطقة بياخد +25% ضرر لمدة 8 ثواني.' },
  x_ace:     { c: 3, zone: 'any', r: 18, text: 'طيارة بتضرب خط طولي بالرشاش. ممتازة ضد المشاة اللي ماشيين ورا بعض.' },
  x_wire:    { c: 2, zone: 'any', r: 50, text: 'أسلاك شائكة 12 ثانية بتبطّأ مشاة العدو جدًا.' },
  x_convoy:  { c: 1, zone: 'none', text: '+3 إمداد على طول.' },
  x_hospital:{ c: 3, zone: 'own', r: 65, text: 'بيعالج وحداتك في المنطقة لمدة 4 ثواني.' },
};

// ابني إحصائيات الكارت المعروضة وكلامه على المعركة الحية
(function () {
  for (const id in RT) {
    const c = CARDS[id], s = RT[id]; if (!c) continue;
    c.cost = s.c;
    if (c.kind === 'tactic') c.text = s.text;
  }
  // صامد = بياخد ضرر أقل
  KW_TEXT.guard = ['🧱', 'صامد', 'بياخد ضرر أقل 25%.'];
  KW_TEXT.charge = ['⚡', 'سريع', 'بيتحرك أسرع من الوحدات العادية.'];
  KW_TEXT.ranged = ['🎯', 'بعيد المدى', 'بيضرب من بعيد.'];
  KW_TEXT.precision = ['🔍', 'قنّاص', 'بيختار المشاة ومداه طويل جدًا.'];
  KW_TEXT.antiTank[2] = 'ضرره ×2.5 على الدبابات وبيتجاهل الدرع.';
  KW_TEXT.antiInf[2] = 'ضرره ×1.8 على المشاة.';
  KW_TEXT.siege[2] = 'ضرره ×2 على التحصينات والقيادة.';
  DEPLOY_TEXT.heal = 'بيعالج الوحدات الصاحبة اللي جنبه.';
  DEPLOY_TEXT.burn = 'اللهب بيصيب كذا عدو مع بعض.';
})();
const RT_DECK_TROOPS = 8, RT_DECK_TACTICS = 4;
const RT_STARTER = ['rifle', 'poilu', 'lewis', 'atrifle', 'cav', 'ft', 'car', 'stokes', 'x_bomber', 'x_mine', 'x_trench', 'x_hospital'];
function validRtDeck(d) {
  if (!Array.isArray(d) || new Set(d).size !== d.length) return false;
  let t = 0, k = 0;
  for (const id of d) { const c = CARDS[id]; if (!c || c.token || !RT[id]) return false; c.kind === 'troop' ? t++ : k++; }
  return t === RT_DECK_TROOPS && k === RT_DECK_TACTICS;
}
// مستوى الكارت من عدد النسخ: 1، 2، 4، 8، 16
function cardLevel(n) { return n >= 16 ? 5 : n >= 8 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0; }
const LEVEL_NEED = [0, 1, 2, 4, 8, 16];
function lvlMul(l) { return 1 + 0.07 * ((l || 1) - 1); }
function cardStatsLine(id, lvl = 1) {
  const s = RT[id], c = CARDS[id]; if (!s || c.kind !== 'troop') return '';
  const m = lvlMul(lvl), dps = s.dmg ? Math.round(s.dmg * m / s.cd * (s.n || 1)) : 0;
  return `❤️ ${Math.round(s.hp * m)}${s.n > 1 ? '×' + s.n : ''} · ${s.heal ? '➕ علاج' : '💥 ' + dps + '/ث'} · 📏 ${s.r} · 🏃 ${s.spd}${s.ar ? ' · 🛡️ ' + s.ar : ''}`;
}
