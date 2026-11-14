// ===== خرايط مستوحاة من جبهات الحرب العالمية الأولى =====
// العالم 360×640. اللاعب تحت، العدو فوق. كل الخرايط متماثلة عشان تبقى عادلة.
// rivers: شريط مية ماينفعش يتعدّى غير من الكباري | mud: طين بيبطّأ | wire: أسلاك بتبطّأ المشاة
const MAPS = {
  mons: { name: 'قناة مونس', year: 1914, base: ['#5f6b3a', '#4d5a30'], grass: 0.9, craters: 14, trees: 'live', treesN: 16, fields: 0,
    rivers: [{ y: 320, h: 26, bridges: [90, 270] }], roads: 1, ruins: 2, desc: 'قناة مونس-كونديه: الكباري هي الطريق الوحيد للعبور.' },
  marne: { name: 'سهول المارن', year: 1914, base: ['#6c7240', '#566033'], grass: 1, craters: 10, trees: 'poplar', treesN: 18, fields: 4,
    rivers: [{ y: 320, h: 20, bridges: [60, 180, 300] }], roads: 2, ruins: 1, desc: 'حقول مفتوحة ونهر المارن بـ 3 كباري.' },
  ypres: { name: 'أطلال إيبر', year: 1915, base: ['#5a5236', '#463f29'], grass: 0.3, craters: 40, water: 0.4, trees: 'dead', treesN: 12, ruins: 14, tint: 'rgba(190,200,90,0.06)',
    mud: [{ x: 180, y: 320, r: 46 }], roads: 1, desc: 'مدينة مدمّرة وحفر مليانة مية وطين في النص.' },
  gallipoli: { name: 'شواطئ جاليبولي', year: 1915, base: ['#b8a576', '#a08c5c'], sand: 1, grass: 0.2, craters: 16, trees: 'scrub', treesN: 26, ruins: 0,
    ridges: 1, roads: 0, desc: 'رملة وتلال وشجيرات، والبحر ورا القواعد.' },
  verdun: { name: 'جحيم فردان', year: 1916, base: ['#5b4a35', '#3f3324'], grass: 0, craters: 80, water: 0.25, trees: 'dead', treesN: 22, ruins: 4,
    mud: [{ x: 90, y: 320, r: 40 }, { x: 270, y: 320, r: 40 }], desc: 'أرض اتقلبت بملايين القذايف. طين على الطريقين.' },
  somme: { name: 'خنادق السوم', year: 1916, base: ['#8a8466', '#6f6a50'], chalk: 1, grass: 0.4, craters: 45, trees: 'dead', treesN: 10, ruins: 3,
    wire: [{ y: 260, h: 18 }, { y: 380, h: 18 }], desc: 'تربة طباشير بيضا وأحزمة أسلاك شائكة بتعطّل المشاة.' },
  cambrai: { name: 'خط هيندنبورج', year: 1917, base: ['#66703f', '#525a33'], grass: 0.8, craters: 18, trees: 'live', treesN: 10, ruins: 4,
    bigTrench: 1, rivers: [{ y: 320, h: 18, bridges: [40, 180, 320] }], desc: 'خنادق عريضة وقناة دو نور. أرض مناسبة للدبابات.' },
  spring: { name: 'ضباب الربيع', year: 1918, base: ['#5d6040', '#494c31'], grass: 0.6, craters: 30, water: 0.2, trees: 'dead', treesN: 14, ruins: 6,
    fog: 1, mud: [{ x: 180, y: 320, r: 34 }], desc: 'هجوم مارس 1918 في الضباب. الرؤية ضعيفة في النص.' },
  amiens: { name: 'حقول أميان', year: 1918, base: ['#8f8a45', '#77723a'], grass: 0.7, craters: 12, trees: 'live', treesN: 12, fields: 8, wheat: 1, ruins: 2, roads: 2,
    desc: 'حقول قمح مفتوحة. "اليوم الأسود للجيش الألماني".' },
};
const MAP_IDS = Object.keys(MAPS);
const CAMP_MAPS = ['mons', 'marne', 'ypres', 'gallipoli', 'verdun', 'somme', 'cambrai', 'spring', 'amiens'];

// بيحسب المية والطين والأسلاك من الخريطة
function mapSpeed(map, x, y, type) {
  let m = 1;
  (map.mud || []).forEach(z => { const dx = x - z.x, dy = y - z.y; if (dx * dx + dy * dy < z.r * z.r) m *= type === 'ARM' ? 0.7 : 0.55; });
  // الطين متماثل للناحيتين
  (map.mud || []).forEach(z => { const dx = x - (360 - z.x), dy = y - (640 - z.y); if ((z.x !== 360 - z.x || z.y !== 640 - z.y) && dx * dx + dy * dy < z.r * z.r) m *= type === 'ARM' ? 0.7 : 0.55; });
  if (type === 'INF') (map.wire || []).forEach(w => { if (Math.abs(y - w.y) < w.h / 2 || Math.abs(y - (640 - w.y)) < w.h / 2) m *= 0.6; });
  return m;
}
