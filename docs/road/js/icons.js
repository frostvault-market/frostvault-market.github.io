'use strict';
// simple line icons (stroke = currentColor)
const ICONS = {
  engine: '<path d="M6 10h4V7h6v3h3l2 2h2v8h-2l-2 2H10l-2-2H6z"/><path d="M3 13v5M3 15.5h3"/>',
  fuel: '<path d="M5 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15z"/><path d="M5 11h11M16 8l3 3v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  armor: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  gun: '<path d="M2 10h16l2-2h2v5h-4l-1 2h-4l-1 5H7l1-5H5l-1-2H2z"/>',
  nitro: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  ram: '<path d="M4 4v16M4 6l12 2-12 2M4 11l14 1-14 1M4 15l12 2-12 2"/>',
  cool: '<path d="M12 2v20M4.9 6l14.2 12M19.1 6L4.9 18M9 3l3 3 3-3M9 21l3-3 3 3"/>',
  magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/>',
  pierce: '<path d="M2 12h14M12 8l4 4-4 4M18 6v12M21 8v8"/>',
  blood: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  flip: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M17 2v4h4"/>',
  spring: '<path d="M6 4h12M6 20h12M8 4l8 3-8 3 8 3-8 3 8 3"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
  boom: '<path d="M12 2l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z"/>',
  rocket: '<path d="M4 20l3-3M14 4c3 0 6 0 6 0s0 3 0 6l-8 8-6-6z"/><path d="M8 12l-4 1 2 4M12 16l-1 4-4-2"/><circle cx="15" cy="9" r="1.5"/>',
  saw: '<circle cx="12" cy="12" r="3"/><path d="M12 2l2 4 4-2-1 4 4 1-3 3 3 3-4 1 1 4-4-2-2 4-2-4-4 2 1-4-4-1 3-3-3-3 4-1-1-4 4 2z"/>',
  shock: '<path d="M11 2L5 13h5l-2 9 8-12h-5l3-8z"/>',
  scrap: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.8"/><circle cx="15" cy="11" r="1.8"/><path d="M10 20v-2M14 20v-2"/>',
  person: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
};
function icon(name, size = 24, extra = '') {
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}
