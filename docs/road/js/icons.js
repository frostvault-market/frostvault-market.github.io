'use strict';
// ---------- icons: game-icons.net silhouettes (CC BY 3.0) with gradient "metal" fills ----------
const ICON_TONES = {
  gold: ['#fff6c4', '#ffcf4a', '#c46a12'],
  steel: ['#ffffff', '#c9d3dc', '#6c7a88'],
  red: ['#ffd0c4', '#ff5a3a', '#8a1608'],
  blue: ['#e0f4ff', '#5ab8ff', '#1b4f9a'],
  purple: ['#f6e0ff', '#c77dff', '#5a1f8a'],
  orange: ['#ffe8c4', '#ff9a2a', '#a33c06'],
  green: ['#e4ffe8', '#5fe07a', '#14682a'],
  dark: ['#5a4a40', '#2a201c', '#120c0a'],
};
(function injectDefs() {
  const add = () => {
    if (document.getElementById('gi-defs')) return;
    const stops = Object.entries(ICON_TONES).map(([k, [a, b, c]]) =>
      `<linearGradient id="gi-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`).join('');
    const div = document.createElement('div');
    div.innerHTML = `<svg id="gi-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${stops}
      <filter id="gi-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity=".55"/></filter></defs></svg>`;
    document.body.prepend(div.firstChild);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();

// icon(name, size, extraClass, tone)
//  - no tone: flat fill using currentColor (for inline text)
//  - tone: gradient fill, dark outline, drop shadow (for badges / buttons)
function icon(name, size = 24, extra = '', tone = '') {
  const d = GI_PATHS[name] || GI_PATHS.info;
  if (!tone) return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="currentColor" d="${d}"/></svg>`;
  return `<svg class="ic toned ${extra}" width="${size}" height="${size}" viewBox="-16 -16 544 544"><path d="${d}" fill="url(#gi-${tone})" stroke="rgba(10,5,3,.85)" stroke-width="18" paint-order="stroke" stroke-linejoin="round" filter="url(#gi-sh)"/></svg>`;
}
// badge: icon inside a framed tile
function badge(name, tone = 'gold', size = 44, extra = '') {
  return `<span class="badge t-${tone} ${extra}" style="--s:${size}px">${icon(name, Math.round(size * 0.72), '', tone)}</span>`;
}

// canvas drawing of an icon
const _giCache = {};
function drawIcon(g, name, x, y, size, fill = '#fff', stroke = 'rgba(0,0,0,.8)') {
  let p = _giCache[name];
  if (!p) p = _giCache[name] = new Path2D(GI_PATHS[name] || GI_PATHS.info);
  g.save(); g.translate(x - size / 2, y - size / 2); g.scale(size / 512, size / 512);
  if (stroke) { g.lineWidth = 36; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(p); }
  g.fillStyle = fill; g.fill(p);
  g.restore();
}
