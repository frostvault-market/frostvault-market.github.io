// ===== الرسم الـ3D (three.js): كاميرا مايلة، شمس وضل، بيوت وشجر، جنود ودبابات بتتحرك =====
import * as THREE from 'three';
import { mergeGeometries } from './lib/BufferGeometryUtils.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { RGBELoader } from './lib/RGBELoader.js';

const WWd = 360, WHd = 640;
const TEAM = {
  mine: { uni: 0x6f6a3e, uni2: 0x55512f, helm: 0x5b5a3b, tank: [0x6e6c45, 0x58563a], flag: 0x2f5d9a },
  foe: { uni: 0x5e6862, uni2: 0x4a534f, helm: 0x434b47, tank: [0x666d68, 0x4f5652], flag: 0x9a2f2f },
};
const SKIN = 0xd2a882, DARK = 0x23221c, WOOD = 0x5b4129, METAL = 0x2d2d29, SAND = 0xa8976d;

let renderer, scene, camera, world, sun, hemi, cv, me = 0, map = null, mapId = null;
let terrainTex = null, terrainCanvas = null, texScale = 2, texDirty = 0;
const vis = new Map();            // id -> visual
const geoCache = {};
const matCache = {};
let partsPool = [], tracers = [], shells = new Map(), planes = [], lights = [], zoneVis = new Map();
let ghostGroup, ghostRing, ghostRange, redA, redB;
let rs = 1; const R = () => { rs = (rs + 0x6D2B79F5) | 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const W3 = (x, y) => [x - WWd / 2, y - WHd / 2]; // من إحداثيات اللعبة لإحداثيات الأرض
let shakeAmt = 0, camBase = null, bannerHost = null;
const perf = { n: 0, sum: 0, level: 0 }; // جودة تلقائية: لو التليفون بطيء نقلّل

// ---------- الصور الحقيقية (Poly Haven, CC0) ----------
const A = { tex: {}, gray: {}, models: {}, env: null, loading: null, ready: false };
const GROUND = {
  mons: ['aerial_grass_rock', 'forest_leaves_02'], marne: ['aerial_grass_rock', 'forest_leaves_02'], cambrai: ['aerial_grass_rock', 'forest_leaves_02'],
  amiens: ['aerial_grass_rock', 'farm_soil'], ypres: ['aerial_ground_rock', 'burned_ground_01'], gallipoli: ['aerial_beach_01', 'dirt_aerial_02'],
  verdun: ['burned_ground_01', 'dirt_aerial_02'], somme: ['dry_ground_01', 'burned_ground_01'], spring: ['aerial_grass_rock', 'burned_ground_01'],
};
const TINT = { mons: [0.62, 0.78, 0.5], marne: [0.66, 0.8, 0.52], cambrai: [0.64, 0.76, 0.52], amiens: [0.8, 0.8, 0.6], spring: [0.62, 0.7, 0.52], ypres: [0.72, 0.7, 0.6], gallipoli: [0.95, 0.9, 0.8], verdun: [0.7, 0.62, 0.55], somme: [0.85, 0.83, 0.78] };
const NORMALS = new Set(['aerial_grass_rock', 'aerial_mud_1', 'aerial_ground_rock', 'aerial_beach_01', 'dirt_aerial_02', 'burned_ground_01', 'farm_soil', 'forest_leaves_02', 'clay_roof_tiles', 'roof_slates_02', 'plastered_stone_wall', 'rustic_stone_wall', 'weathered_planks', 'concrete_wall_008', 'green_metal_rust', 'dry_ground_01']);
const MODEL_IDS = ['shrub_03', 'rock_07', 'wooden_military_crate', 'ammo_box', 'barrel_03', 'old_tyre', 'tree_stump_01'];
const imgLoader = new THREE.ImageLoader();
function loadImg(url) { return new Promise(res => imgLoader.load(url, res, undefined, () => res(null))); }
async function loadTex(name) {
  if (A.tex[name]) return A.tex[name];
  const [img, nimg] = await Promise.all([loadImg(`assets/tex/${name}.jpg`), NORMALS.has(name) ? loadImg(`assets/tex/${name}_n.jpg`) : null]);
  const mk = (im, srgb) => { if (!im) return null; const t = new THREE.Texture(im); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
  // نسخة رمادي فاتحة عشان تتلوّن بلون الوحدة/المبنى
  let gray = null;
  if (img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data; let sum = 0; for (let i = 0; i < p.length; i += 4) sum += (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11);
    const k = 225 / (sum / (p.length / 4)); for (let i = 0; i < p.length; i += 4) { const v = Math.min(255, (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * k); p[i] = p[i + 1] = p[i + 2] = v; }
    g.putImageData(d, 0, 0); gray = new THREE.CanvasTexture(c); gray.wrapS = gray.wrapT = THREE.RepeatWrapping; gray.colorSpace = THREE.SRGBColorSpace; gray.anisotropy = 4; }
  return (A.tex[name] = { map: mk(img, true), normal: mk(nimg, false), gray });
}
function preload(mid) {
  const need = new Set([...(GROUND[mid] || GROUND.mons), 'clay_roof_tiles', 'roof_slates_02', 'plastered_stone_wall', 'rustic_stone_wall', 'weathered_planks', 'concrete_wall_008', 'green_metal_rust', 'rough_wood', 'dry_ground_01', 'forest_leaves_02', 'gravel_road']);
  const jobs = [...need].map(loadTex);
  if (!Object.keys(A.models).length) { const gl = new GLTFLoader(); MODEL_IDS.forEach(id => jobs.push(new Promise(res => gl.load(`assets/models/${id}/${id}.gltf`, g => { A.models[id] = g.scene; g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (id === 'shrub_03') o.material.color.setRGB(0.62, 0.68, 0.5); } }); res(); }, undefined, () => res())))); }
  if (!A.env) jobs.push(new Promise(res => new RGBELoader().load('assets/sky.hdr', t => { A.envRaw = t; res(); }, undefined, () => res())));
  return Promise.all(jobs);
}
function tmat(key, texName, opts = {}) {
  const k = 't_' + key; if (matCache[k]) return matCache[k];
  const t = A.tex[texName] || {};
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: opts.color ? t.map : t.gray, normalMap: t.normal || null, roughness: opts.rough ?? 0.9, metalness: opts.metal ?? 0.05 });
  if (m.normalMap) m.normalScale = new THREE.Vector2(opts.ns ?? 1, opts.ns ?? 1);
  return (matCache[k] = m);
}

// ---------- مساعدات بناء الموديلات ----------
function tint(geo, color) {
  const c = new THREE.Color(color), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return geo;
}
function prep(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (geo.attributes.uv1) geo.deleteAttribute('uv1');
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  geo.applyMatrix4(m); return tint(geo, color);
}
const box = (w, h, d, c, x, y, z, rx, ry, rz) => prep(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz);
const cyl = (rt, rb, h, seg, c, x, y, z, rx, ry, rz) => prep(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz);
const sph = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, seg = 8) => prep(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), c, x, y, z, 0, 0, 0, sx, sy, sz);
const merge = parts => mergeGeometries(parts.filter(Boolean), false);
function mat(key, opts = {}) {
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05, flatShading: !!opts.flat, ...opts.extra });
  return matCache[key];
}
function mesh(geo, m = mat('v'), cast = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; return o; }

// ---------- الجنود ----------
const cap = (r, l, c, x, y, z, rx = 0, ry = 0, rz = 0) => prep(new THREE.CapsuleGeometry(r, l, 3, 8), c, x, y, z, rx, ry, rz);
function soldierGeo(team, kind) {
  const k = `sold_${team}_${kind}`; if (geoCache[k]) return geoCache[k];
  const T = TEAM[team], parts = [];
  const helmet = (x, y, z) => team === 'mine'
    ? [prep(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), T.helm, x, y, z, 0, 0, 0, 1, 0.75, 1), cyl(2.5, 2.4, 0.25, 16, T.helm, x, y, z)]
    : [prep(new THREE.SphereGeometry(1.7, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), T.helm, x, y - 0.3, z, 0, 0, 0, 1.05, 0.95, 1), cyl(1.95, 2.1, 0.5, 14, T.helm, x - 0.3, y - 0.9, z)];
  if (kind === 'prone') {
    parts.push(cap(1.5, 4.5, T.uni, -1, 1.4, 0, 0, 0, Math.PI / 2), cap(0.75, 4, T.uni2, -5.5, 0.9, 0.9, 0, 0, Math.PI / 2), cap(0.75, 4, T.uni2, -5.5, 0.9, -0.9, 0, 0, Math.PI / 2));
    parts.push(sph(1.15, SKIN, 3.3, 2.1, 0, 1, 1, 1, 10), ...helmet(3.4, 2.7, 0));
    parts.push(box(7, 0.5, 0.5, WOOD, 5.5, 1.7, 0.9), cap(0.5, 2.5, T.uni2, 2.3, 1.6, 1.6, 0, 0, Math.PI / 2), cap(0.5, 2.5, T.uni2, 2.3, 1.6, -1.4, 0, 0, Math.PI / 2));
  } else {
    parts.push(cap(1.65, 2.6, T.uni, 0, 6.6, 0, 0, 0, 0));                       // جسم
    parts.push(prep(new THREE.CylinderGeometry(1.75, 1.7, 0.55, 12), 0x3d3220, 0, 5.2, 0));   // حزام
    parts.push(prep(new THREE.BoxGeometry(1.5, 2.6, 2.8), kind === 'flame' ? 0x55554d : 0x5a4f36, -1.7, 7, 0)); // شنطة
    if (kind === 'flame') parts.push(cyl(0.8, 0.8, 4, 10, 0x6a6a60, -2.6, 7, 0.9), cyl(0.8, 0.8, 4, 10, 0x6a6a60, -2.6, 7, -0.9));
    parts.push(cap(0.55, 2.6, T.uni2, 1.0, 6.9, 2.0, 0, 0, -0.9), cap(0.55, 2.6, T.uni2, 1.0, 6.9, -2.0, 0, 0, -0.9));  // دراعات
    parts.push(sph(0.5, SKIN, 2.2, 6.2, 1.9, 1, 1, 1, 6), sph(0.5, SKIN, 2.2, 6.2, -1.7, 1, 1, 1, 6));                  // إيدين
    parts.push(cyl(0.55, 0.6, 0.8, 8, SKIN, 0, 8.9, 0), sph(1.2, SKIN, 0.15, 9.8, 0, 1, 1.05, 1, 12), ...helmet(0.1, 10.5, 0));
    if (kind === 'medic') parts.push(box(0.2, 0.9, 2.4, 0xffffff, 1.6, 7.2, 0), box(0.25, 0.5, 1.4, 0xcc2222, 1.7, 7.2, 0), box(0.25, 1.4, 0.5, 0xcc2222, 1.7, 7.2, 0));
    const wl = kind === 'at' ? 11 : kind === 'short' || kind === 'flame' ? 4.5 : kind === 'none' ? 0 : 8;
    if (wl) { parts.push(box(wl, kind === 'at' ? 0.75 : 0.45, kind === 'at' ? 0.75 : 0.45, kind === 'flame' ? 0x333333 : WOOD, 1.8 + wl / 2 - 2, 6.4, 0.2, 0, 0, 0.12)); parts.push(box(wl * 0.55, 0.3, 0.3, METAL, 2 + wl * 0.55, 6.75, 0.2, 0, 0, 0.12)); }
  }
  return (geoCache[k] = merge(parts));
}
function legGeo(team) {
  const k = 'leg_' + team; if (geoCache[k]) return geoCache[k];
  const g = merge([cap(0.72, 2.9, TEAM[team].uni2, 0, -2.1, 0), prep(new THREE.BoxGeometry(1.9, 0.9, 1.4), 0x2b2318, 0.35, -4.1, 0), cyl(0.75, 0.75, 1.4, 8, 0x6b6550, 0, -3.2, 0)]);
  return (geoCache[k] = g);
}
function makeSoldier(team, kind, scale = 1) {
  const g = new THREE.Group();
  const body = mesh(soldierGeo(team, kind), tmat('cloth', 'dry_ground_01', { ns: 0.4, rough: 0.95 })); g.add(body);
  let legs = null;
  if (kind !== 'prone') {
    legs = [mesh(legGeo(team), tmat('cloth', 'dry_ground_01', { ns: 0.4, rough: 0.95 })), mesh(legGeo(team), tmat('cloth', 'dry_ground_01', { ns: 0.4, rough: 0.95 }))];
    legs[0].position.set(0, 4.3, 0.95); legs[1].position.set(0, 4.3, -0.95); legs.forEach(l => g.add(l));
  }
  g.scale.setScalar(scale);
  return { g, legs, body };
}

// ---------- الحصان ----------
function horseGeo() {
  if (geoCache.horse) return geoCache.horse;
  const c = 0x6e4a2c, d = 0x3a281a;
  geoCache.horse = merge([
    sph(4, c, 0, 7.5, 0, 1.9, 0.95, 0.85, 10), box(2.2, 4.5, 2.2, c, 6.2, 9.8, 0, 0, 0, -0.6), sph(1.8, c, 8.4, 11.8, 0, 1.6, 0.8, 0.8),
    box(1, 4, 0.8, d, -8.2, 7, 0, 0, 0, 0.6), box(3, 1.2, 4.6, 0x4a3520, 0, 11.1, 0),
  ]);
  return geoCache.horse;
}
function horseLegGeo() { return geoCache.hleg || (geoCache.hleg = merge([box(1.2, 5.5, 1.2, 0x5e3e24, 0, -2.75, 0), box(1.4, 0.8, 1.4, 0x1e1a14, 0, -5.4, 0)])); }

// ---------- الدبابات والعربيات ----------
function camoParts(T, team, L, W, H, y0) {
  if (team !== 'mine') return [];
  const p = []; for (let i = 0; i < 5; i++) p.push(box(3 + (i % 2) * 2, 0.15, 2 + (i % 3), 0x7a6236, -L / 2 + 3 + i * (L - 6) / 5, y0 + H + 0.08, ((i * 7) % 5 - 2) * W / 7));
  return p;
}
function trackParts(L, W, H, profile) {
  const p = [];
  [-1, 1].forEach(s => {
    if (profile) {
      const sh = new THREE.Shape(); profile.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 3.6, bevelEnabled: false });
      p.push(prep(g, 0x2e2c25, 0, 0, s * W / 2 - (s > 0 ? 3.6 : 0)));
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
      p.push(prep(g2, 0x4e4a3e, 0, 0, s > 0 ? W / 2 + 0.05 : -W / 2 - 0.45, 0, 0, 0, 0.85, 0.75, 1));
    } else {
      p.push(box(L, H, 3.6, 0x2b2a24, 0, H / 2 + 0.3, s * (W / 2 - 1.8)));
      for (let i = 0; i < 5; i++) p.push(cyl(1.6, 1.6, 3.8, 10, 0x45423a, -L / 2 + 2.5 + i * (L - 5) / 4, 1.8, s * (W / 2 - 1.8), Math.PI / 2, 0, 0));
    }
  });
  return p;
}
function tankGeo(look, team) {
  const k = `tank_${look}_${team}`; if (geoCache[k]) return geoCache[k];
  const T = TEAM[team], c0 = T.tank[0], c1 = T.tank[1];
  let hull = [], tur = [];
  if (look === 'rhomb') {
    const prof = [[-17, 0.5], [13, 0.5], [18, 6], [16, 11.5], [-13, 12], [-18, 5]];
    hull = trackParts(34, 20, 0, prof);
    hull.push(box(22, 8, 11.5, c0, -0.5, 7, 0), box(7, 4, 9, c1, 7.5, 12.6, 0), box(5, 1.5, 6, 0x1c1b17, 10.5, 12, 0));
    hull.push(box(7, 5, 3.5, c1, 1, 6.5, 11.6), box(7, 5, 3.5, c1, 1, 6.5, -11.6));
    hull.push(...camoParts(T, team, 22, 11, 8, 3));
  } else if (look === 'ft') {
    hull = trackParts(20, 11, 3.2); hull.push(box(16, 5, 7.5, c0, 0, 5.6, 0), box(5, 3, 7, c1, 7, 4.6, 0, 0, 0, -0.5), box(4, 2, 2, c1, -8, 4.2, 0));
    tur = [cyl(3.6, 4.2, 4.5, 8, c1, 0, 2.2, 0), sph(3.6, c1, 0, 4.4, 0, 1, 0.45, 1), cyl(0.55, 0.55, 8, 8, METAL, 4.5, 1.8, 0, 0, 0, Math.PI / 2)];
  } else if (look === 'whippet') {
    hull = trackParts(26, 13, 3.4); hull.push(box(22, 4.5, 9, c0, 1, 5, 0), box(10, 7, 10, c1, -6, 8, 0), box(1, 1.2, 6, 0x111111, -0.8, 9.6, 0));
  } else if (look === 'car') {
    hull = [box(18, 5, 9, c0, 0, 5, 0), box(6, 3, 8.5, c1, 7, 4.2, 0, 0, 0, -0.3)];
    [[-5.5, 5], [5.5, 5], [-5.5, -5], [5.5, -5]].forEach(([x, z]) => hull.push(cyl(2.4, 2.4, 1.6, 12, 0x1a1a16, x, 2.4, z, Math.PI / 2, 0, 0)));
    tur = [cyl(3.2, 3.6, 3.6, 10, c1, 0, 1.8, 0), cyl(0.45, 0.45, 7, 8, METAL, 4, 2, 0, 0, 0, Math.PI / 2)];
  } else if (look === 'a7v') {
    hull = trackParts(28, 18, 3); hull.push(box(30, 9, 19, c0, 0, 8.4, 0), box(26, 2, 15, c1, 0, 13.6, 0), box(8, 4, 8, c1, -2, 16, 0));
    for (let i = -1; i <= 1; i++) { hull.push(box(1.6, 1.4, 0.4, 0x111111, i * 8, 10, 9.6), box(1.6, 1.4, 0.4, 0x111111, i * 8, 10, -9.6)); }
    hull.push(cyl(0.9, 0.9, 7, 8, METAL, 18, 9.5, 0, 0, 0, Math.PI / 2));
  } else { // box (CA1) و long (سان شاموند)
    const L = look === 'long' ? 34 : 26;
    hull = trackParts(L - 4, 14, 3); hull.push(box(L, 8, 14, c0, 0, 7, 0), box(L - 8, 3, 11, c1, -2, 12.5, 0), box(L * 0.25, 4, 13, c1, L / 2 - 4, 8, 0, 0, 0, -0.35));
    hull.push(cyl(1.1, 1.1, look === 'long' ? 12 : 7, 10, METAL, L / 2 + (look === 'long' ? 3 : 1), 8, look === 'long' ? 0 : 3, 0, 0, Math.PI / 2));
    hull.push(...camoParts(T, team, L - 6, 12, 8, 3.5));
  }
  if (look === 'rhomb') {
    // مدافع أو رشاشات على الجناب
    hull.push(cyl(0.8, 0.8, 7, 8, METAL, 6, 6.8, 13.4, 0, 0, Math.PI / 2), cyl(0.8, 0.8, 7, 8, METAL, 6, 6.8, -13.4, 0, 0, Math.PI / 2));
  }
  return (geoCache[k] = { hull: merge(hull), tur: tur.length ? merge(tur) : null });
}
function makeTank(look, team, card) {
  const g = new THREE.Group(), gg = tankGeo(look, team);
  g.add(mesh(gg.hull, tmat('metal', 'green_metal_rust', { metal: 0.3, rough: 0.75 })));
  let tur = null;
  if (gg.tur) { tur = mesh(gg.tur, tmat('metal', 'green_metal_rust', { metal: 0.3, rough: 0.75 })); tur.position.y = look === 'car' ? 7.5 : 8; tur.position.x = look === 'ft' ? 2 : 0; g.add(tur); }
  // علامة الجنسية
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.8, 16), new THREE.MeshBasicMaterial({ color: team === 'mine' ? 0x2f5d9a : 0xeeeeee }));
  m.rotation.x = -Math.PI / 2; m.position.set(-6, look === 'rhomb' ? 11.1 : look === 'a7v' ? 14.7 : 7.7, 0); g.add(m);
  return { g, tur };
}

// ---------- المدفعية ----------
function gunGeo(look, team) {
  const k = `gun_${look}_${team}`; if (geoCache[k]) return geoCache[k];
  const T = TEAM[team], p = [];
  if (look === 'mortar') { p.push(box(6, 1, 6, 0x3e3b33, -1, 0.5, 0), cyl(1.4, 1.6, 9, 10, METAL, 1.5, 5, 0, 0, 0, -0.8), box(0.5, 6, 0.5, METAL, 4, 3, 1.5, 0, 0, 0.3)); }
  else {
    const big = look === 'bertha' ? 2 : look === 'howitzer' ? 1.35 : 1;
    p.push(box(14 * big, 1.2, 1.2, WOOD, -7 * big, 1.6, 1.2, 0, 0.12, 0), box(14 * big, 1.2, 1.2, WOOD, -7 * big, 1.6, -1.2, 0, -0.12, 0));
    [-1, 1].forEach(s => p.push(cyl(4.2 * big, 4.2 * big, 1, 14, 0x3b2c1c, 0, 4.2 * big, s * 4.5 * big, Math.PI / 2, 0, 0), cyl(1 * big, 1 * big, 1.3, 8, METAL, 0, 4.2 * big, s * 4.5 * big, Math.PI / 2, 0, 0)));
    p.push(box(4 * big, 2.5 * big, 7.5 * big, T.tank[1], 0, 4.5 * big, 0));
    p.push(box(0.5, 6 * big, 8 * big, T.tank[0], 2 * big, 6 * big, 0));
    const bl = look === 'howitzer' ? 10 : look === 'bertha' ? 16 : 14;
    p.push(cyl(0.9 * big, 1.1 * big, bl * big, 12, METAL, bl * big / 2, 6 * big, 0, 0, 0, Math.PI / 2 - (look === 'howitzer' || look === 'bertha' ? 0.35 : 0.08)));
  }
  return (geoCache[k] = merge(p));
}
function makeGun(look, team) {
  const g = new THREE.Group();
  g.add(mesh(gunGeo(look, team), tmat('metal', 'green_metal_rust', { metal: 0.3, rough: 0.75 })));
  const big = look === 'bertha' ? 2 : look === 'howitzer' ? 1.35 : 1;
  const crew = look === 'mortar' ? [[-5, 4]] : [[-9 * big, 5 * big], [-9 * big, -5 * big]];
  crew.forEach(([x, z]) => { const s = makeSoldier(team, 'none'); s.g.position.set(x, 0, z); g.add(s.g); });
  return { g };
}

// ---------- التحصينات والقيادة ----------
function sandbagRing(r, n, layers = 2) {
  const p = [];
  for (let L = 0; L < layers; L++) for (let i = 0; i < n; i++) {
    const a = (i + L * 0.5) / n * Math.PI * 2;
    p.push(prep(new THREE.CapsuleGeometry(1.15, 2.2, 3, 6).rotateZ(Math.PI / 2), i % 3 ? 0xc9b98e : 0xb5a57c, Math.cos(a) * r, 1.2 + L * 2, Math.sin(a) * r, 0, -a + Math.PI / 2, 0, 1, 0.85, 1.15));
  }
  return p;
}
const BAGS = () => tmat('bags', 'dry_ground_01', { ns: 0.6 });
function structGeo(kind) {
  if (geoCache['st_' + kind]) return geoCache['st_' + kind];
  let out;
  if (kind === 'bunker') {
    out = {
      bags: merge(sandbagRing(22, 32, 2)),
      main: merge([cyl(15, 17, 9, 8, 0x9c968a, 0, 4.5, 0, 0, Math.PI / 8, 0), cyl(13.5, 15, 2.5, 8, 0xaaa498, 0, 10, 0, 0, Math.PI / 8, 0)]),
      dark: merge([box(3, 2, 9, 0x141310, 15.5, 6.5, 0)]),
    };
  } else if (kind === 'hq') {
    const roof = new THREE.CylinderGeometry(15, 15, 32, 3, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 6);
    const dark = [];
    for (let i = -1; i <= 1; i += 2) { dark.push(box(0.5, 4, 3.5, 0x2a2622, 15.1, 8, i * 6), box(0.5, 4, 3.5, 0x2a2622, -15.1, 8, i * 6), box(4, 4, 0.5, 0x2a2622, i * 7, 8, 12.1), box(4, 4, 0.5, 0x2a2622, i * 7, 8, -12.1)); }
    dark.push(box(0.5, 8, 5, 0x4a3020, 15.2, 4, 0));
    out = { bags: merge(sandbagRing(33, 46, 2)), walls: merge([box(30, 15, 24, 0xffffff, 0, 7.5, 0), box(3, 7, 3, 0xd8d0c0, -8, 27, 6)]), roof: merge([prep(roof, 0xffffff, 0, 21.5, 0, 0, 0, 0, 1, 0.55, 0.9)]), dark: merge(dark) };
  } else if (kind === 'wall') out = { bags: merge(sandbagRing(13, 18, 2)), dark: merge([cyl(10, 10, 0.4, 16, 0x2f2519, 0, 0.3, 0)]) };
  else out = { bags: merge(sandbagRing(15, 20, 2)) };
  return (geoCache['st_' + kind] = out);
}
function flag(team, h) {
  const g = new THREE.Group();
  const pole = mesh(cyl(0.35, 0.35, h, 6, 0xdddddd, 0, h / 2, 0)); g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.5, 6, 1), new THREE.MeshStandardMaterial({ color: TEAM[team].flag, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.geometry.translate(4.5, 0, 0); cloth.position.y = h - 3; cloth.castShadow = true; g.add(cloth); g.userData.cloth = cloth;
  return g;
}
function makeStruct(e, team) {
  const g = new THREE.Group(); let gun = null, fl = null;
  const G = structGeo(e.kind === 'fortgun' ? 'fort' : e.kind);
  g.add(mesh(G.bags, BAGS()));
  if (G.dark) g.add(mesh(G.dark, mat('v')));
  if (e.kind === 'hq') {
    g.add(mesh(G.walls, tmat('wall', 'rustic_stone_wall', { color: 1 }))); g.add(mesh(G.roof, tmat('roof', 'clay_roof_tiles', { color: 1 })));
    const cannon = makeGun('gun', team); cannon.g.scale.setScalar(1.1); cannon.g.position.set(24, 0, 0); g.add(cannon.g); gun = cannon.g;
    fl = flag(team, 30); fl.position.set(-12, 0, -10); g.add(fl);
  } else if (e.kind === 'bunker') {
    g.add(mesh(G.main, tmat('concrete', 'concrete_wall_008', { color: 1 })));
    fl = flag(team, 18); fl.position.set(-6, 11, -6); g.add(fl);
  } else if (e.kind === 'fortgun') { const c = makeGun('gun', team); g.add(c.g); gun = c.g; }
  // صناديق ذخيرة جنب التحصين
  if ((e.kind === 'hq' || e.kind === 'bunker') && A.models.wooden_military_crate) {
    const n = e.kind === 'hq' ? 3 : 1;
    for (let i = 0; i < n; i++) { const m = A.models[['wooden_military_crate', 'ammo_box', 'barrel_03'][i % 3]]; if (!m) continue; const c = m.clone(); c.scale.setScalar(7); c.position.set(-20 - i * 6, 0, 18 + i * 4); c.rotation.y = i * 1.3; g.add(c); }
  }
  return { g, gun, fl };
}

// ---------- الأرض والديكور ----------
function treeGeo(kind, s) {
  const trunk = [], crown = [];
  if (kind === 'dead') {
    trunk.push(cyl(0.9, 1.4, 12 + s * 8, 6, 0x6a5a48, 0, 6 + s * 4, 0, 0.1, 0, 0.12));
    trunk.push(cyl(0.4, 0.6, 7, 5, 0x6a5a48, 2, 10, 1, 0.5, 0, -0.8), cyl(0.4, 0.6, 6, 5, 0x6a5a48, -2, 12, -1, -0.6, 0, 0.9));
    return { trunk: merge(trunk) };
  }
  if (kind === 'scrub') { crown.push(prep(new THREE.IcosahedronGeometry(3 + s * 2, 1), 0x7a8a50, 0, 2.5, 0, 0, s * 3, 0, 1, 0.7, 1)); return { crown: merge(crown) }; }
  const h = kind === 'poplar' ? 22 : 10 + s * 6;
  trunk.push(cyl(0.9, 1.3, h * 0.6, 6, 0x7a6450, 0, h * 0.3, 0));
  const cols = [0x6d9a40, 0x7aa84a, 0x5f8a38];
  if (kind === 'poplar') crown.push(prep(new THREE.IcosahedronGeometry(4.5, 2), cols[0], 0, h * 0.7, 0, 0, 0, 0, 1, 2.6, 1));
  else for (let i = 0; i < 4; i++) crown.push(prep(new THREE.IcosahedronGeometry(4 + s * 3, 2), cols[i % 3], Math.cos(i * 1.7) * 3, h * 0.75 + (i % 2) * 2, Math.sin(i * 1.7) * 3));
  return { trunk: merge(trunk), crown: merge(crown) };
}
function houseGeo(s, ruined) {
  const w = 18 + s * 10, d = 13 + s * 6, h = 10 + s * 3;
  const wall = s < 0.5 ? 0xf0e8d8 : 0xd8ccb8;
  if (ruined) {
    const p = [box(w, h * 0.8, 1.5, wall, 0, h * 0.4, d / 2), box(1.5, h * 0.5, d, wall, w / 2, h * 0.25, 0), box(w * 0.4, h * 0.3, 1.5, wall, -w * 0.3, h * 0.15, -d / 2)];
    for (let i = 0; i < 9; i++) p.push(box(2 + (i % 3), 1.2, 1.5 + (i % 2), i % 2 ? wall : 0xb8ab96, (i * 7 % 11 - 5) * w / 12, 0.6, (i * 5 % 7 - 3) * d / 8, 0, i, 0));
    return { walls: merge(p) };
  }
  const roof = new THREE.CylinderGeometry(d * 0.62, d * 0.62, w + 2, 3, 1); roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 6);
  const dark = []; for (let i = -1; i <= 1; i += 2) dark.push(box(3, 3, 0.4, 0x2a2622, i * w / 4, h * 0.6, d / 2 + 0.1), box(3, 3, 0.4, 0x2a2622, i * w / 4, h * 0.6, -d / 2 - 0.1));
  return { walls: merge([box(w, h, d, wall, 0, h / 2, 0), box(2.5, 6, 2.5, 0xd0c4b0, w * 0.3, h + d * 0.4, d * 0.15)]), roof: merge([prep(roof, 0xffffff, 0, h + d * 0.28, 0, 0, 0, 0, 1, 0.75, 1)]), dark: merge(dark), slate: s >= 0.4 };
}
function buildProps(props) {
  const groups = {};
  const place = (geo, x, y, rot = 0, sc = 1) => { const g = geo.clone(); const [wx, wz] = W3(x, y); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(wx, 0, wz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(sc, sc, sc))); return g; };
  const add = (key, geo, x, y, rot, sc) => { if (geo) (groups[key] = groups[key] || []).push(place(geo, x, y, rot, sc)); };
  const addHouse = (hg, x, y, rot, sc) => { add('houseWall', hg.walls, x, y, rot, sc); add(hg.slate ? 'roofSlate' : 'roofTile', hg.roof, x, y, rot, sc); add('dark', hg.dark, x, y, rot, sc); };
  props.forEach(p => {
    if (p.t === 'tree') { const t = treeGeo(p.kind, p.s); add('trunk', t.trunk, p.x, p.y, p.s * 6, 1.35); add('crown', t.crown, p.x, p.y, p.s * 6, 1.35); }
    if (p.t === 'ruin') add('ruin', houseGeo(p.s, true).walls, p.x, p.y, p.s * 6, 1.1);
  });
  rs = 9917;
  const nh = map.sand ? 1 : 4;
  for (let i = 0; i < nh; i++) {
    const side = i % 2 ? 1 : -1, x = side > 0 ? 330 + R() * 6 : 24 + R() * 6, y = 70 + R() * 500;
    if (Math.abs(y - 320) < 40) continue;
    if (R() < (map.ruins > 5 ? 0.7 : 0.25)) add('ruin', houseGeo(R(), true).walls, x, y, Math.PI / 2, 1.3);
    else addHouse(houseGeo(R(), false), x, y, Math.PI / 2 + (R() - 0.5) * 0.4, 1.3);
  }
  const wy = [388, 252, ...(map.wire || []).flatMap(w => [w.y, WHd - w.y])];
  const post = merge([cyl(0.3, 0.3, 4, 4, 0x6b5a46, 0, 2, 0, 0.5, 0, 0), cyl(0.3, 0.3, 4, 4, 0x6b5a46, 0, 2, 0, -0.5, 0, 0)]);
  wy.forEach(y => { for (let x = 6; x < WWd; x += 9) add('post', post, x, y + (R() - 0.5) * 3, R() * 3); });
  (map.rivers || []).forEach(rv => rv.bridges.forEach(bx => add('bridge', merge([box(22, 1.2, rv.h + 12, 0xc8b8a0, 0, 1.2, 0), box(1, 2.5, rv.h + 12, 0x8a7a64, 11, 2.6, 0), box(1, 2.5, rv.h + 12, 0x8a7a64, -11, 2.6, 0)]), bx, rv.y)));
  const MATS = {
    houseWall: () => tmat('hwall', 'plastered_stone_wall', { color: 1 }), roofTile: () => tmat('roof', 'clay_roof_tiles', { color: 1 }), roofSlate: () => tmat('slate', 'roof_slates_02', { color: 1 }),
    ruin: () => tmat('ruin', 'rustic_stone_wall', { color: 1 }), dark: () => mat('v'), trunk: () => tmat('bark', 'rough_wood', { color: 1 }), crown: () => tmat('leaves', 'forest_leaves_02', { ns: 1.5 }),
    post: () => mat('v'), bridge: () => tmat('planks', 'weathered_planks', { color: 1 }),
  };
  for (const k in groups) { const m = mesh(merge(groups[k]), MATS[k](), k !== 'post'); world.add(m); }
  // موديلات حقيقية: شجيرات وصخور وجذوع وكاوتش
  const scatter = (id, n, sc, zone) => { const m = A.models[id]; if (!m) return; for (let i = 0; i < n; i++) {
    let x, y, k = 0; do { x = 8 + R() * 344; y = 20 + R() * 600; k++; } while (k < 20 && (Math.abs(x - 90) < 30 || Math.abs(x - 270) < 30 || Math.abs(y - 320) < 30 || (zone && !zone(x, y))));
    const c = m.clone(); const [wx, wz] = W3(x, y); c.position.set(wx, 0, wz); c.rotation.y = R() * 6.28; c.scale.setScalar(sc * (0.7 + R() * 0.6)); world.add(c); } };
  const green = !map.sand && map.grass > 0.3;
  if (green) scatter('shrub_03', 26, 4);
  if (map.sand) scatter('shrub_03', 14, 3.5);
  scatter('rock_07', map.sand || map.ridges ? 14 : 5, 4);
  if (map.trees === 'dead' || map.ruins > 3) { scatter('tree_stump_01', 8, 5); scatter('old_tyre', 3, 5); }
}
function noiseCanvas(seed) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 112; const g = c.getContext('2d'); rs = seed;
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 112);
  for (let i = 0; i < 60; i++) { const x = R() * 64, y = R() * 112, r = 6 + R() * 16, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${0.35 + R() * 0.4})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 112); }
  const t = new THREE.CanvasTexture(c); return t;
}
function buildGround(seed) {
  texScale = /Android|iPhone|iPad/i.test(navigator.userAgent) ? 2 : 3;
  const t = GFX.terrainFor(mapId, seed, texScale, true);
  terrainCanvas = t.color;
  terrainTex = new THREE.CanvasTexture(t.color); terrainTex.colorSpace = THREE.SRGBColorSpace; terrainTex.anisotropy = 4;
  const htex = new THREE.CanvasTexture(t.height);
  const geo = new THREE.PlaneGeometry(WWd, WHd, 180, 320); geo.rotateX(-Math.PI / 2);
  const [ga, gb] = GROUND[mapId] || GROUND.mons, TA = A.tex[ga] || {}, TB = A.tex[gb] || {};
  const m = new THREE.MeshStandardMaterial({ map: terrainTex, displacementMap: htex, displacementScale: 9, displacementBias: -4.5, normalMap: TA.normal || null, roughness: 0.95 });
  if (m.normalMap) { m.normalMap = TA.normal.clone(); m.normalMap.repeat.set(5, 8.9); m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping; m.normalMap.needsUpdate = true; m.normalScale = new THREE.Vector2(1.3, 1.3); }
  const mask = noiseCanvas(seed);
  m.onBeforeCompile = sh => {
    sh.uniforms.texA = { value: TA.map }; sh.uniforms.texB = { value: TB.map || TA.map }; sh.uniforms.maskT = { value: mask }; sh.uniforms.groundTint = { value: new THREE.Vector3(...(TINT[mapId] || [0.8, 0.8, 0.8])) };
    sh.fragmentShader = 'uniform sampler2D texA; uniform sampler2D texB; uniform sampler2D maskT; uniform vec3 groundTint;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 feat = texture2D(map, vMapUv);
      vec2 tuv = vMapUv * vec2(5.0, 8.9);
      vec3 ca = mix(texture2D(texA, tuv).rgb, texture2D(texA, tuv * 0.41 + vec2(0.17, 0.53)).rgb, 0.5);
      vec3 cb = mix(texture2D(texB, tuv * 1.37 + 0.31).rgb, texture2D(texB, tuv * 0.53 + vec2(0.71, 0.29)).rgb, 0.5);
      float mk = smoothstep(0.25, 0.75, texture2D(maskT, vMapUv).r);
      vec3 base = mix(ca, cb, mk) * groundTint;
      diffuseColor.rgb = mix(base, feat.rgb, feat.a);`);
  };
  const ground = new THREE.Mesh(geo, m); ground.receiveShadow = true; world.add(ground);
  const out = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0xffffff, map: TA.map ? (() => { const x = TA.map.clone(); x.repeat.set(33, 33); x.needsUpdate = true; return x; })() : null, roughness: 1 }));
  out.material.color.multiplyScalar(0.75); out.rotation.x = -Math.PI / 2; out.position.y = -4.6; out.receiveShadow = true; world.add(out);
  (map.rivers || []).forEach(rv => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(WWd + 400, rv.h), new THREE.MeshStandardMaterial({ color: 0x31504f, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.9 }));
    w.rotation.x = -Math.PI / 2; w.position.set(0, -1.5, rv.y - WHd / 2); world.add(w);
  });
  if (map.sand) [-WHd / 2 - 40, WHd / 2 + 40].forEach(z => { const s = new THREE.Mesh(new THREE.PlaneGeometry(2400, 120), new THREE.MeshStandardMaterial({ color: 0x2f5866, roughness: 0.08, metalness: 0.1 })); s.rotation.x = -Math.PI / 2; s.position.set(0, -3, z); world.add(s); });
  buildProps(t.props);
}

// ---------- المؤثرات ----------
function radialTex(stops, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function smokeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const x = 18 + Math.random() * 28, y = 18 + Math.random() * 28, r = 10 + Math.random() * 12; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const t = new THREE.CanvasTexture(c); return t;
}
let TEX = null;
const PART_MAX = 420;
function initFx() {
  TEX = {
    fire: radialTex([[0, 'rgba(255,250,220,1)'], [0.3, 'rgba(255,190,80,0.95)'], [0.7, 'rgba(230,90,20,0.5)'], [1, 'rgba(200,50,10,0)']]),
    smoke: smokeTex(),
    flash: radialTex([[0, 'rgba(255,255,240,1)'], [0.4, 'rgba(255,220,120,0.8)'], [1, 'rgba(255,150,50,0)']]),
    dust: radialTex([[0, 'rgba(180,160,120,0.8)'], [1, 'rgba(180,160,120,0)']]),
    heal: radialTex([[0, 'rgba(150,255,150,1)'], [1, 'rgba(80,255,80,0)']]),
    gas: smokeTex(),
  };
  partsPool = [];
  for (let i = 0; i < PART_MAX; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.smoke, transparent: true, depthWrite: false }));
    s.visible = false; s.userData = { life: 0, max: 0 }; world.add(s); partsPool.push(s);
  }
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffaa55, 0, 90, 2); l.userData = { t: 0 }; world.add(l); lights.push(l); }
}
let partIdx = 0;
function spawn(type, x, y, z, o = {}) {
  const s = partsPool[partIdx = (partIdx + 1) % PART_MAX];
  const add = type === 'fire' || type === 'flash' || type === 'heal';
  s.material.map = TEX[type]; s.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
  s.material.color.set(type === 'smoke' ? (o.dark ? 0x3a3630 : 0x8a857a) : type === 'gas' ? 0xb8c050 : 0xffffff);
  s.material.needsUpdate = true;
  s.position.set(x, z, y); s.visible = true;
  Object.assign(s.userData, { type, life: 0, max: o.max || 1, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, s0: o.s || 4, s1: o.s1 ?? (o.s || 4) * 2, a0: o.a ?? 1, g: o.g || 0 });
  s.scale.setScalar(s.userData.s0); s.material.opacity = s.userData.a0;
}
function stepParts(dt) {
  for (const s of partsPool) {
    if (!s.visible) continue; const u = s.userData; u.life += dt;
    if (u.life >= u.max) { s.visible = false; continue; }
    const k = u.life / u.max;
    s.position.x += u.vx * dt; s.position.z += u.vy * dt; s.position.y += u.vz * dt; u.vz -= u.g * dt;
    if (s.position.y < 0.3 && u.g) { s.position.y = 0.3; u.vz = 0; u.vx *= 0.6; u.vy *= 0.6; }
    s.scale.setScalar(u.s0 + (u.s1 - u.s0) * k);
    s.material.opacity = u.a0 * (u.type === 'smoke' || u.type === 'gas' ? Math.min(1, u.life * 4) * (1 - k) : 1 - k);
  }
}
function explosion(x, y, r, big) {
  const [wx, wz] = W3(x, y);
  spawn('flash', wx, wz, 3, { s: r * 1.4, s1: r * 2.6, max: 0.2 });
  for (let i = 0; i < (big ? 14 : 6); i++) { const a = Math.random() * 6.28, v = (15 + Math.random() * 40) * r / 25; spawn('fire', wx, wz, 2 + Math.random() * 4, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 10 + Math.random() * 20, s: r * 0.5, s1: r * 0.2, max: 0.35 + Math.random() * 0.35 }); }
  for (let i = 0; i < (big ? 12 : 5); i++) spawn('smoke', wx + (Math.random() - 0.5) * r * 0.6, wz + (Math.random() - 0.5) * r * 0.6, 3 + Math.random() * 5, { vx: 3 + Math.random() * 4, vy: (Math.random() - 0.5) * 4, vz: 6 + Math.random() * 8, s: r * 0.6, s1: r * 1.9, max: 2 + Math.random() * 2.5, dark: big, a: 0.75 });
  for (let i = 0; i < (big ? 10 : 4); i++) { const a = Math.random() * 6.28, v = 30 + Math.random() * 50; spawn('dust', wx, wz, 2, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 25 + Math.random() * 30, g: 90, s: 1.5, s1: 1, max: 0.9 }); }
  const l = lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b)); l.position.set(wx, 12, wz); l.intensity = big ? 9000 : 3500; l.userData.t = 0.25; l.userData.max = 0.25; l.userData.i0 = l.intensity;
  GFX.scorchOn(terrainCanvas, texScale, x, y, r * 0.55); texDirty = 1;
  if (big) shakeAmt = Math.min(5, shakeAmt + r / 10);
}
function tracer(x1, y1, x2, y2, h, color = 0xffe6a0) {
  let t = tracers.find(t => !t.visible);
  if (!t) { if (tracers.length > 60) return; t = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)), new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending })); world.add(t); tracers.push(t); }
  const [ax, az] = W3(x1, y1), [bx, bz] = W3(x2, y2), p = t.geometry.attributes.position.array;
  p.set([ax, h, az, ax + (bx - ax) * 0.5, h * 0.6, az + (bz - az) * 0.5]); t.userData = { ax, az, bx, bz, h, life: 0, max: 0.1 };
  t.geometry.attributes.position.needsUpdate = true; t.visible = true; t.material.opacity = 1;
}
function stepTracers(dt) {
  tracers.forEach(t => { if (!t.visible) return; const u = t.userData; u.life += dt; if (u.life > u.max) { t.visible = false; return; }
    const k = u.life / u.max, p = t.geometry.attributes.position.array, k1 = Math.min(1, k + 0.5);
    p[0] = u.ax + (u.bx - u.ax) * k; p[1] = u.h * (1 - k * 0.5); p[2] = u.az + (u.bz - u.az) * k; p[3] = u.ax + (u.bx - u.ax) * k1; p[4] = u.h * (1 - k1 * 0.5); p[5] = u.az + (u.bz - u.az) * k1;
    t.geometry.attributes.position.needsUpdate = true; t.material.opacity = 1 - k; });
}
function planeGeo(team, big) {
  const k = `plane_${team}_${big}`; if (geoCache[k]) return geoCache[k];
  const c = team === 'mine' ? 0x8a8058 : 0x7a807a, s = big ? 1.8 : 1;
  geoCache[k] = merge([box(18 * s, 2.6 * s, 2.6 * s, c, 0, 0, 0), box(4 * s, 0.4, 26 * s, c, 2 * s, 2 * s, 0), box(4 * s, 0.4, 24 * s, c, 2 * s, -1 * s, 0), box(3 * s, 0.3, 9 * s, c, -8 * s, 0.5, 0), box(3 * s, 4 * s, 0.3, c, -8.5 * s, 2 * s, 0), cyl(1.4 * s, 1.4 * s, 0.4, 8, 0x333333, 9.3 * s, 0, 0, 0, 0, Math.PI / 2)]);
  return geoCache[k];
}
function onFx(f, ents) {
  switch (f.k) {
    case 'shot': {
      const big = f.w === 'cannon' || f.w === 'big' || f.w === 'mortar';
      const a = Math.atan2(f.ty - f.y, f.tx - f.x), mx = f.x + Math.cos(a) * (big ? 14 : 6), my = f.y + Math.sin(a) * (big ? 14 : 6), [wx, wz] = W3(mx, my);
      spawn('flash', wx, wz, big ? 7 : 6, { s: big ? 10 : 4, s1: big ? 14 : 6, max: big ? 0.12 : 0.06 });
      if (f.w === 'mg' || f.w === 'rifle' || f.w === 'sniper') tracer(mx, my, f.tx + (Math.random() - 0.5) * 4, f.ty + (Math.random() - 0.5) * 4, 6);
      if (f.w === 'flame') for (let i = 0; i < 4; i++) { const t = Math.random(), [fx, fz] = W3(mx + (f.tx - mx) * t, my + (f.ty - my) * t); spawn('fire', fx, fz, 4, { vz: 6, s: 3 + t * 6, s1: 6 + t * 8, max: 0.35 }); }
      if (f.w === 'grenade') { const [gx, gz] = W3(f.tx, f.ty); spawn('fire', gx, gz, 2, { s: 5, s1: 10, max: 0.3 }); spawn('smoke', gx, gz, 3, { vz: 6, s: 5, s1: 12, max: 1.4, a: 0.6 }); }
      if (big) spawn('smoke', wx, wz, 6, { vz: 5, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, s: 6, s1: 16, max: 1.6, a: 0.6 });
      else if (Math.random() < 0.3) { const [dx, dz] = W3(f.tx, f.ty); spawn('dust', dx, dz, 1, { vz: 6, s: 2, s1: 4, max: 0.4 }); }
      const sh = vis.get(f.id); if (sh) sh.aim = a;
      SND(big ? (f.w === 'big' ? 'boom' : 'cannon') : f.w === 'mg' ? 'mg1' : f.w === 'flame' ? '' : 'shot');
      break;
    }
    case 'boom': explosion(f.x, f.y, f.r, f.big); SND(f.big ? 'boom' : f.small ? '' : 'thump'); break;
    case 'die': {
      const v = vis.get(f.id);
      if (f.ty === 'ARM') { explosion(f.x, f.y, 22, 1); SND('boom'); }
      else if (f.ty === 'GUN') { explosion(f.x, f.y, 14, 0); SND('thump'); }
      else { const t = terrainCanvas.getContext('2d'); t.save(); t.setTransform(texScale, 0, 0, texScale, 0, 0); t.fillStyle = f.side === me ? 'rgba(80,72,44,0.75)' : 'rgba(70,78,74,0.75)'; t.beginPath(); t.ellipse(f.x, f.y, 3.6, 1.6, Math.random() * 3, 0, 7); t.fill(); t.restore(); texDirty = 1; }
      break;
    }
    case 'heal': { const [hx, hz] = W3(f.x, f.y); spawn('heal', hx, hz, 10, { vz: 10, s: 3, s1: 1, max: 0.8 }); break; }
    case 'plane': {
      const team = f.side === me ? 'mine' : 'foe', big = f.kind === 'bomber' || f.kind === 'transport';
      const p = mesh(planeGeo(team, big)); p.userData = { x: f.x, y: f.y, side: f.side, life: 0, max: big ? 2.6 : 2.2, kind: f.kind };
      world.add(p); planes.push(p); SND('plane'); break;
    }
    case 'strafe': for (let i = 0; i < 16; i++) { const [sx, sz] = W3(f.x + (Math.random() - 0.5) * 10, f.y - 75 + i * 10); spawn('dust', sx, sz, 1, { vz: 10, s: 3, s1: 7, max: 0.7 }); } SND('mg1'); break;
    case 'crown': banner(f.side === me ? '🏴 دمّرت تحصين للعدو!' : '⚠️ العدو دمّر تحصين ليك', f.side === me); SND(f.side === me ? 'win' : 'lose'); break;
    case 'ot': banner('⏱️ وقت إضافي! الإمداد ×2 وأول تحصين يقع بيحسم', true); SND('bugle'); break;
  }
}
let sndBudget = 0; const lastSnd = {};
function SND(n) { if (!n || typeof SFX === 'undefined') return; const now = performance.now(); if ((lastSnd[n] || 0) > now - (n === 'mg1' ? 90 : n === 'shot' ? 70 : 60)) return; if (sndBudget > 6) return; sndBudget++; lastSnd[n] = now; SFX.play(n); }
function banner(t, good) {
  if (!bannerHost) return;
  const b = document.createElement('div'); b.className = 'fbanner ' + (good ? 'good' : 'bad'); b.textContent = t; bannerHost.appendChild(b); setTimeout(() => b.remove(), 2500);
}

// ---------- مزامنة الكيانات مع الرسم ----------
function hpSprite() {
  const g = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }));
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x5fc24a, depthTest: false }));
  bg.center.set(0, 0.5); fg.center.set(0, 0.5); bg.renderOrder = 10; fg.renderOrder = 11; g.add(bg, fg); g.userData = { bg, fg }; return g;
}
function setHp(h, f, w, mine) {
  const { bg, fg } = h.userData; bg.scale.set(w + 0.8, 2.2, 1); bg.position.x = -w / 2 - 0.4; fg.scale.set(Math.max(0.01, w * f), 1.4, 1); fg.position.x = -w / 2;
  fg.material.color.set(mine ? (f > 0.35 ? 0x5fc24a : 0xe0a030) : (f > 0.35 ? 0xd9483a : 0xff7a3a));
}
function makeVisual(e) {
  const team = e.side === me ? 'mine' : 'foe';
  const v = { id: e.id, t: e.t, g: new THREE.Group(), legs: [], walk: 0 };
  if (e.t === 's') {
    const s = makeStruct(e, team); v.g.add(s.g); v.gun = s.gun; v.fl = s.fl; v.kind = e.kind;
    v.hp = hpSprite(); v.hp.position.y = e.kind === 'hq' ? 40 : e.kind === 'bunker' ? 24 : 14; v.g.add(v.hp);
  } else if (e.t === 'u') {
    const c = CARDS[e.card], st = RT[e.card], look = st.look; v.type = c.type; v.look = look;
    const sc = c.type === 'INF' ? 1.55 : c.type === 'ARM' ? 1.25 : 1.3;
    if (c.type === 'ARM') { const t = makeTank(look, team, e.card); v.g.add(t.g); v.tur = t.tur; }
    else if (c.type === 'GUN') { v.g.add(makeGun(look, team).g); v.isGun = 1; }
    else if (look === 'cav') {
      const h = mesh(horseGeo()); v.g.add(h);
      [[4.5, 2], [4.5, -2], [-4.5, 2], [-4.5, -2]].forEach(([x, z]) => { const l = mesh(horseLegGeo()); l.position.set(x, 5.6, z); v.g.add(l); v.legs.push(l); });
      const r = makeSoldier(team, 'short'); r.g.position.set(-0.5, 6.3, 0); v.g.add(r.g);
    } else if (look === 'mg' || look === 'lewis' || look === 'sniper') {
      v.g.add(makeSoldier(team, 'prone').g);
      if (look === 'mg') { const s2 = makeSoldier(team, 'prone'); s2.g.position.set(-2, 0, 4.5); v.g.add(s2.g); v.g.add(mesh(merge([box(7, 2, 2, METAL, 7, 2.6, 0), cyl(0.5, 0.5, 6, 6, METAL, 12, 2.8, 0, 0, 0, Math.PI / 2), box(0.5, 3, 0.5, METAL, 7, 1.2, 1.5, 0.4, 0, 0), box(0.5, 3, 0.5, METAL, 7, 1.2, -1.5, -0.4, 0, 0)]))); }
    } else {
      const kind = look === 'atrifle' ? 'at' : look === 'flame' ? 'flame' : look === 'medic' ? 'medic' : look === 'assault' ? 'short' : 'rifle';
      const s = makeSoldier(team, kind); v.g.add(s.g); v.legs = s.legs; v.body = s.g;
    }
    v.g.scale.setScalar(sc);
    v.hp = hpSprite(); v.hp.position.y = c.type === 'INF' ? 15 : 20; v.hp.scale.setScalar(1 / sc); v.g.add(v.hp);
    if (e.para) { v.chute = mesh(prep(new THREE.SphereGeometry(9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xe8e2d0), mat('v'), true); v.chute.position.y = 22; v.g.add(v.chute); }
  } else if (e.t === 'p') {
    v.g.add(mesh(sph(e.w === 'big' ? 1.8 : 1.1, 0x222222, 0, 0, 0)));
  } else if (e.t === 'z') {
    v.kind = e.kind;
    if (e.kind === 'mine') {
      if (e.side !== me) { v.hidden = 1; }
      else v.g.add(mesh(merge([cyl(2.5, 2.8, 1, 10, 0x4a4535, 0, 0.5, 0), cyl(0.6, 0.6, 1.4, 6, 0x777060, 0, 1.2, 0)])));
    } else if (e.kind === 'wire') {
      const p = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28, r = e.r * (0.55 + (i % 3) * 0.18); p.push(prep(new THREE.TorusGeometry(2.2, 0.15, 3, 8), 0x3a3a36, Math.cos(a) * r, 2, Math.sin(a) * r, 0, -a, 0)); }
      v.g.add(mesh(merge(p), mat('v'), false));
    } else {
      const col = e.kind === 'heal' ? 0x66ff66 : e.kind === 'recon' ? 0x66bbff : e.kind === 'gas' ? 0xc8d050 : 0xff4a3a;
      const ring = new THREE.Mesh(e.kind === 'ace' ? new THREE.PlaneGeometry(e.r * 2, 150) : new THREE.RingGeometry(e.r - 1.5, e.r, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 1.5; v.g.add(ring); v.ring = ring;
    }
  }
  world.add(v.g); return v;
}
function syncEnts(ents, t, dt) {
  const seen = new Set();
  for (const e of ents) {
    seen.add(e.id);
    let v = vis.get(e.id); if (!v) { v = makeVisual(e); vis.set(e.id, v); }
    if (v.hidden) continue;
    const [x, z] = W3(e.x, e.y);
    if (e.t === 'p') {
      const k = Math.max(0, Math.min(1, 1 - (e.at - t) / e.dur));
      const [x0, z0] = W3(e.x0, e.y0);
      v.g.position.set(x0 + (x - x0) * k, 6 + Math.sin(k * Math.PI) * (e.w === 'big' || e.w === 'mortar' ? 70 : 8), z0 + (z - z0) * k); continue;
    }
    if (e.t === 'z') {
      v.g.position.set(x, 0, z);
      if (v.ring) v.ring.material.opacity = 0.35 + 0.3 * Math.sin(t * 10);
      if (e.kind === 'gas' && Math.random() < 0.5) spawn('gas', x + (Math.random() - 0.5) * e.r * 1.6, z + (Math.random() - 0.5) * e.r * 1.6, 4, { vx: 3, vz: 1, s: 16, s1: 32, max: 2.2, a: 0.45 });
      continue;
    }
    v.g.position.set(x, 0, z);
    if (e.t === 's') {
      v.g.rotation.y = 0;
      if (v.gun) v.gun.rotation.y = -(e.face) ;
      if (v.fl) { const c = v.fl.userData.cloth; c.rotation.y = Math.sin(t * 3 + e.id) * 0.25; }
      setHp(v.hp, e.hp / e.max, e.kind === 'hq' ? 36 : 26, e.side === me);
      if (e.hp / e.max < 0.5 && Math.random() < 0.15) spawn('smoke', x + (Math.random() - 0.5) * 10, z + (Math.random() - 0.5) * 10, 10, { vx: 4, vz: 10, s: 6, s1: 18, max: 3, dark: true, a: 0.6 });
      if (e.hp / e.max < 0.25 && Math.random() < 0.15) spawn('fire', x + (Math.random() - 0.5) * 8, z + (Math.random() - 0.5) * 8, 6, { vz: 8, s: 5, s1: 2, max: 0.6 });
      continue;
    }
    // وحدات
    const want = -e.face;
    if (v.rot == null) v.rot = want;
    let da = want - v.rot; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    v.rot += da * Math.min(1, dt * 10); v.g.rotation.y = v.rot;
    if (v.tur && v.aim != null) v.tur.rotation.y = -v.aim - v.rot;
    if (v.isGun && v.aim != null) v.g.rotation.y = -v.aim;
    const moving = e.moving; if (moving) v.walk += dt * (v.look === 'cav' ? 14 : 9);
    if (v.legs.length === 2) { const a = moving ? Math.sin(v.walk) * 0.6 : 0; v.legs[0].rotation.z = a; v.legs[1].rotation.z = -a; if (v.body) v.body.position.y = moving ? Math.abs(Math.sin(v.walk)) * 0.5 : 0; }
    if (v.legs.length === 4) v.legs.forEach((l, i) => l.rotation.z = moving ? Math.sin(v.walk + (i % 3 ? 0 : Math.PI)) * 0.5 : 0);
    if (e.dep > 0) {
      if (v.chute) { const h = Math.min(1, e.dep / 1.8); v.g.position.y = h * 70; }
      else { v.g.position.y = Math.min(1, e.dep / 0.9) * 8; }
      v.hp.visible = false;
    } else { if (v.chute) { v.g.remove(v.chute); v.chute = null; } v.hp.visible = e.hp < e.max; setHp(v.hp, e.hp / e.max, v.type === 'INF' ? 9 : 16, e.side === me); }
    // غبار ورا الدبابات
    if (v.type === 'ARM' && moving && Math.random() < 0.25) spawn('dust', x - Math.cos(e.face) * 12, z - Math.sin(e.face) * 12, 1.5, { vz: 4, s: 4, s1: 10, max: 1.2, a: 0.5 });
  }
  for (const [id, v] of vis) if (!seen.has(id)) {
    world.remove(v.g);
    if (v.t === 's' && v.kind !== 'wall' && v.kind !== 'fortgun') { // أنقاض
      const r = mesh(merge(Array.from({ length: 14 }, (_, i) => box(3 + (i % 3) * 2, 1.5 + (i % 2), 3, i % 2 ? 0x8a867a : 0x6a665b, (Math.random() - 0.5) * 26, 0.8, (Math.random() - 0.5) * 26, 0, Math.random() * 3, 0))));
      r.position.copy(v.g.position); world.add(r);
      for (let i = 0; i < 20; i++) spawn('smoke', r.position.x, r.position.z, 6, { vx: 4, vz: 10, s: 8, s1: 26, max: 4, dark: true, a: 0.7 });
    }
    vis.delete(id);
  }
}

// ---------- الكاميرا ----------
function fitCamera() {
  const r = cv.getBoundingClientRect(); camera.aspect = r.width / Math.max(1, r.height); camera.fov = 20;
  const pitch = 70 * Math.PI / 180; // ميل الكاميرا
  const corners = [[-WWd / 2, -WHd / 2], [WWd / 2, -WHd / 2], [-WWd / 2, WHd / 2], [WWd / 2, WHd / 2]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const place = (d, tz) => { camera.position.set(0, Math.sin(pitch) * d, tz + Math.cos(pitch) * d); camera.lookAt(0, 0, tz); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); };
  const measure = () => { let xm = 0, y0 = 9, y1 = -9, bad = false; corners.forEach(c => { const p = c.clone().project(camera); if (p.z > 1 || p.z < -1) bad = true; xm = Math.max(xm, Math.abs(p.x)); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }); return { xm, y0, y1, bad }; };
  let lo = 100, hi = 6000, tz = 0;
  for (let it = 0; it < 30; it++) {
    const d = (lo + hi) / 2;
    for (let k = 0; k < 8; k++) { place(d, tz); const m = measure(); if (m.bad) break; tz = Math.max(-160, Math.min(160, tz - Math.max(-25, Math.min(25, (m.y1 + m.y0) * 60)))); }
    place(d, tz); const m = measure();
    if (!m.bad && m.xm <= 1.16 && m.y1 - m.y0 <= 1.99) hi = d; else lo = d;
  }
  place(hi, tz);
  camBase = camera.position.clone(); camera.userData.target = new THREE.Vector3(0, 0, tz);
  // الضباب يبدأ بعد الخريطة، إلا في خريطة الضباب
  if (scene.fog) { scene.fog.near = hi * (map.fog ? 0.75 : 1.05); scene.fog.far = hi * (map.fog ? 1.35 : 2.2); }
}

// ---------- الواجهة اللي بتستخدمها شاشة المعركة ----------
const GFX3 = {
  supported() {
    try { if (window.__no3d || (typeof P !== 'undefined' && P.gfx === '2d')) return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  },
  init(c) {
    cv = c;
    renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(/Android|iPhone|iPad/i.test(navigator.userAgent) ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    bannerHost = c.parentElement;
  },
  setup(mid, seed, viewer) {
    mapId = mid; map = MAPS[mid]; me = viewer;
    perf.n = perf.sum = perf.level = 0;
    vis.clear(); tracers = []; planes = []; lights = []; zoneVis.clear();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1d2016);
    scene.fog = new THREE.Fog(new THREE.Color(map.fog ? 0xa8aca4 : 0x2a2c22), map.fog ? 500 : 900, map.fog ? 1500 : 2600);
    camera = new THREE.PerspectiveCamera(32, 0.5, 10, 5000);
    world = new THREE.Group(); world.rotation.y = viewer === 1 ? Math.PI : 0; scene.add(world);
    hemi = new THREE.HemisphereLight(0xe8eef4, 0x6a5a40, 1.5); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d6, map.fog ? 1.6 : 2.6);
    sun.position.set(-160, 320, viewer === 1 ? -120 : 120); sun.castShadow = true;
    sun.shadow.mapSize.set(/Android|iPhone|iPad/i.test(navigator.userAgent) ? 1024 : 2048, /Android|iPhone|iPad/i.test(navigator.userAgent) ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 380; sc.bottom = -380; sc.near = 50; sc.far = 900; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    A.ready = false;
    const myScene = scene;
    preload(mid).then(() => {
      if (scene !== myScene || !renderer) return;
      if (A.envRaw && !A.env) { const pm = new THREE.PMREMGenerator(renderer); A.env = pm.fromEquirectangular(A.envRaw).texture; pm.dispose(); }
      if (A.env) { scene.environment = A.env; scene.environmentIntensity = 0.4; hemi.intensity = 0.55; }
    buildGround(seed);
      initFx();
      // شبح النزول
      ghostGroup = new THREE.Group(); scene.add(ghostGroup);
      const redMat = new THREE.MeshBasicMaterial({ color: 0xc82818, transparent: true, opacity: 0.22, depthWrite: false });
      redA = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), redMat); redB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), redMat.clone()); const redC = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), redMat.clone());
      [redA, redB, redC].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = 6; world.add(m); m.visible = false; }); redA.userData.c = redC;
      ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
      ghostRing.rotation.x = -Math.PI / 2; ghostRing.renderOrder = 20; world.add(ghostRing); ghostRing.visible = false;
      ghostRange = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthTest: false, side: THREE.DoubleSide }));
      ghostRange.rotation.x = -Math.PI / 2; ghostRange.renderOrder = 19; world.add(ghostRange); ghostRange.visible = false;
      A.ready = true; GFX3.resize();
    });
    GFX3.resize();
  },
  resize() {
    if (!renderer) return; const r = cv.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); if (camera) fitCamera();
  },
  toWorld(cx, cy) {
    const r = cv.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
    const p = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    world.worldToLocal(p); return [p.x + WWd / 2, p.z + WHd / 2];
  },
  fx: onFx,
  banner,
  dispose() { try { scene && scene.traverse(o => { if (o.geometry && !Object.values(geoCache).includes(o.geometry)) o.geometry.dispose(); }); terrainTex && terrainTex.dispose(); renderer && renderer.dispose(); renderer && renderer.forceContextLoss(); } catch (e) {} renderer = null; },
  ready() { return A.ready; },
  frame(view, dt) {
    sndBudget = 0;
    if (!A.ready) { renderer.render(scene, camera); return; }
    // قياس السرعة: بعد أول ثانيتين، لو الإطار أبطأ من 40 مللي نقلّل الدقة ثم الضل
    if (dt > 0 && dt < 0.5) { perf.n++; perf.sum += dt; }
    if (perf.n >= 60) {
      const avg = perf.sum / perf.n; perf.n = perf.sum = 0;
      if (avg > 0.04 && perf.level < 2) {
        perf.level++;
        if (perf.level === 1) { renderer.setPixelRatio(1); GFX3.resize(); }
        if (perf.level === 2) { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
      }
    }
    const { ents, t, ghost } = view;
    syncEnts(ents, t, dt);
    stepParts(dt); stepTracers(dt);
    lights.forEach(l => { if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.i0 * (l.userData.t / l.userData.max)); } else l.intensity = 0; });
    for (let i = planes.length - 1; i >= 0; i--) {
      const p = planes[i], u = p.userData; u.life += dt; if (u.life > u.max) { world.remove(p); planes.splice(i, 1); continue; }
      const k = u.life / u.max, dir = u.side === 0 ? -1 : 1, [x, z] = W3(u.x, u.y + dir * (k - 0.55) * 640);
      p.position.set(x, 70, z); p.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    // شبح النزول
    const show = !!ghost;
    ghostRing.visible = show && ghost.x != null; ghostRange.visible = show && ghost.x != null && !!ghost.range;
    redA.visible = redB.visible = redA.userData.c.visible = false;
    if (show) {
      if (ghost.x != null) {
        const [gx, gz] = W3(ghost.x, ghost.y); ghostRing.position.set(gx, 7, gz); ghostRing.scale.setScalar(ghost.r || 10); ghostRing.material.color.set(ghost.ok ? 0xffffff : 0xff3a2a);
        if (ghost.range) { ghostRange.position.set(gx, 6.5, gz); ghostRange.scale.setScalar(ghost.range); }
      }
      if (ghost.zone === 'own') {
        const open = ghost.open || [];
        const put = (m, x0, y0, w, h) => { m.visible = true; m.scale.set(w, h, 1); const [cx, cz] = W3(x0 + w / 2, y0 + h / 2); m.position.x = cx; m.position.z = cz; };
        if (me === 0) { put(redA, 0, 0, WWd, 200); [0, 1].forEach((l, i) => !open.includes(l) && put(i ? redB : redA.userData.c, l === 0 ? 0 : 180, 200, 180, 152)); }
        else { put(redA, 0, 440, WWd, 200); [0, 1].forEach((l, i) => !open.includes(l) && put(i ? redB : redA.userData.c, l === 0 ? 180 : 0, 288, 180, 152)); }
      }
    }
    // اهتزاز الكاميرا
    if (camBase) { shakeAmt = Math.max(0, shakeAmt - dt * 12); camera.position.set(camBase.x + (Math.random() - 0.5) * shakeAmt, camBase.y, camBase.z + (Math.random() - 0.5) * shakeAmt); camera.lookAt(camera.userData.target); }
    if (texDirty && (texDirty += dt) > 0.6) { terrainTex.needsUpdate = true; texDirty = 0; }
    renderer.render(scene, camera);
  },
  // صورة للكارت: نرسم الموديل في مشهد صغير
  portrait(id, size = 160) {
    try {
      const c = CARDS[id], st = RT[id]; if (!c || !st || c.kind !== 'troop') return null;
      const r = GFX3._pr || (GFX3._pr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }));
      r.setSize(size, size, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
      const sc = new THREE.Scene(); const oldMe = me; me = 0;
      sc.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.4)); const d = new THREE.DirectionalLight(0xfff0d8, 2.4); d.position.set(-40, 80, 60); sc.add(d);
      const old = world; world = sc;
      const v = makeVisual({ id: -1, t: 'u', card: id, side: 0, x: WWd / 2, y: WHd / 2, hp: 1, max: 1 }); v.hp.visible = false;
      world = old; me = oldMe;
      if (st.n > 1 && c.type === 'INF') { for (let i = 1; i < Math.min(3, st.n); i++) { const v2 = makeVisual({ id: -1, t: 'u', card: id, side: 0, x: 0, y: 0, hp: 1, max: 1 }); v2.hp.visible = false; v2.g.position.set(-8 * i, 0, (i % 2 ? 1 : -1) * 7); sc.add(v2.g); sc.remove(v2.g); v.g.add(v2.g); } }
      v.g.position.set(0, 0, 0); v.g.rotation.y = -0.6;
      const bb = new THREE.Box3().setFromObject(v.g), ctr = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()).length();
      const cam = new THREE.PerspectiveCamera(30, 1, 1, 2000); cam.position.set(ctr.x + sz * 0.9, ctr.y + sz * 0.8, ctr.z + sz * 1.3); cam.lookAt(ctr);
      r.setClearColor(0x000000, 0); r.render(sc, cam);
      return r.domElement.toDataURL('image/png');
    } catch (e) { return null; }
  },
};
window.GFX3 = GFX3;
GFX3._dbg = () => ({ cam: camera && camera.position.toArray().map(v => Math.round(v)), tgt: camera && camera.userData.target && camera.userData.target.toArray(), asp: camera && camera.aspect, kids: scene && scene.children.length, w: world && world.children.length });
window.dispatchEvent(new Event('gfx3ready'));
