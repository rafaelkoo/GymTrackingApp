// FitTrack 3D movement viewer (v2.1).
// A sculpted mannequin driven by keyframes. Each keyframe says where the pelvis
// is, how far the torso leans, where the hands and feet go and which way the
// palms face; two-bone IK works out elbows and knees so bar paths stay real.
// A second, translucent red figure can replay a move with a common mistake.
import { MOVES } from './moves.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let T = null;
export async function loadThree() {
  if (!T) T = await import(THREE_URL);
  return T;
}

// Body measurements in metres. Pelvis origin = hip-joint height.
const B = { upper: 0.29, lower: 0.33, fore: 0.26, thigh: 0.44, shin: 0.44, shX: 0.19, shY: 0.44, hipX: 0.10, torso: 0.48 };
const DEG = Math.PI / 180;
const COL = {
  skin: 0xCBBEAD, skinDark: 0xB9B0A2, ghost: 0xFF4D4D,
  floor: 0x1E1B18, wall: 0x171513, rubber: 0x1F1D1B, metal: 0xC9C4BB, steel: 0x8F8A82, pad: 0x2B2622, frame: 0x34302C, accentDim: 0x7A3A16
};

// ---------- keyframe normalisation ----------
const SCALARS = ['trunk', 'lumbar', 'yaw', 'roll', 'head', 'sh', 'fpL', 'fpR', 'fyL', 'fyR', 'wrL', 'wrR'];
const VEC3 = ['pel', 'epL', 'epR', 'kpL', 'kpR', 'pnL', 'pnR'];
const mir = v => [-v[0], v[1], v[2]];
function normKey(k, prev) {
  const o = { t: k.t };
  if (k.pel) o.pel = k.pel.length === 2 ? [0, k.pel[0], k.pel[1]] : k.pel.slice();
  for (const s of ['trunk', 'lumbar', 'yaw', 'roll', 'head', 'sh']) if (k[s] !== undefined) o[s] = k[s];
  const sym = (key, L, R, f = mir) => { if (k[key] !== undefined) { o[L] = Array.isArray(k[key]) ? k[key].slice() : k[key]; o[R] = Array.isArray(k[key]) ? f(k[key]) : k[key]; } if (k[key + 'L'] !== undefined) o[L] = k[key + 'L']; if (k[key + 'R'] !== undefined) o[R] = k[key + 'R']; };
  sym('fp', 'fpL', 'fpR'); sym('fy', 'fyL', 'fyR'); sym('ep', 'epL', 'epR'); sym('kp', 'kpL', 'kpR'); sym('pn', 'pnL', 'pnR'); sym('wr', 'wrL', 'wrR');
  const tgt = (pairs, L, R) => {
    for (const [key, m] of pairs) {
      if (k[key]) { o[L] = { m, v: k[key].slice() }; o[R] = { m, v: mir(k[key]) }; }
      if (k[key + 'L']) o[L] = { m, v: k[key + 'L'].slice() };
      if (k[key + 'R']) o[R] = { m, v: k[key + 'R'].slice() };
    }
  };
  tgt([['h', 'w'], ['ht', 't'], ['hs', 's']], 'hL', 'hR');
  tgt([['f', 'w'], ['fo', 'p']], 'fL', 'fR');
  const DEF = {
    pel: [0, 0.96, 0], trunk: 0, lumbar: 0, yaw: 0, roll: 0, head: 0, sh: 0, wrL: 0, wrR: 0, fpL: 0, fpR: 0, fyL: 8, fyR: 8,
    epL: [0.3, -0.3, -1], epR: [-0.3, -0.3, -1], kpL: [0.15, 0, 1], kpR: [-0.15, 0, 1], pnL: [-1, 0, 0.15], pnR: [1, 0, 0.15],
    hL: { m: 's', v: [0.02, -0.6, 0.04] }, hR: { m: 's', v: [-0.02, -0.6, 0.04] },
    fL: { m: 'w', v: [0.12, 0.08, 0] }, fR: { m: 'w', v: [-0.12, 0.08, 0] }
  };
  for (const f of [...SCALARS, ...VEC3, 'hL', 'hR', 'fL', 'fR']) if (o[f] === undefined) o[f] = prev ? prev[f] : DEF[f];
  return o;
}
function compileKeys(raw) { const out = []; let prev = null; for (const k of raw) { prev = normKey(k, prev); out.push(prev); } return out; }
export function compileMove(m) {
  if (m._compiled) return m;
  if (m.keys) {
    m._keys = compileKeys(m.keys);
    // mistake variants: patch raw keys by index (index 0 also patches the closing key)
    (m.mistakes || []).forEach(mk => {
      if (!mk.patch) return;
      const n = m.keys.length;
      const raw = m.keys.map((k, i) => ({ ...k, ...(mk.patch['*'] || {}), ...(mk.patch[i] || (i === n - 1 ? mk.patch[0] : null) || {}) }));
      mk._keys = compileKeys(raw);
    });
  }
  // effort + slow-motion flags per phase, from the phase name when not given
  (m.phases || []).forEach(p => {
    if (p.e !== undefined) return;
    const n = p.zh;
    if (/^(準備|企直|屈髖|吊住|跪定|跪低|張開|撐起|伸展|夾住|前後腳企好|一腳上箱|蹲低擺手)$/.test(n)) { p.e = 0.3; }
    else if (/(頂部|谷底|最低點|停|鎖定|撐住|拉伸|最遠|觸胸|夾|外旋|底部|輕落)/.test(n)) { p.e = 0.85; p.slow = true; }
    else if (/(落|放|返|回位|收)/.test(n)) p.e = 0.55;
    else p.e = 1;
  });
  m._compiled = true;
  return m;
}

// monotone cubic Hermite (turning points get zero speed, pass-throughs keep it)
function slope(p0, p1, p2, t0, t1, t2) { if ((p1 - p0) * (p2 - p1) <= 0) return 0; return (p2 - p0) / (t2 - t0); }
function herm(p1, p2, m1, m2, dt, u) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * dt * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * dt * m2;
}
function ring(K, i) { // neighbour indices/times for a looping key list
  const n = K.length, ts = K.map(k => k.t);
  const idx = [i - 1 < 0 ? n - 2 : i - 1, i, i + 1, i + 2 >= n ? 1 : i + 2];
  const tt = [i - 1 < 0 ? ts[n - 2] - 1 : ts[i - 1], ts[i], ts[i + 1], i + 2 >= n ? ts[1] + 1 : ts[i + 2]];
  return { idx, tt };
}
function interp4(a, b, c, d, tt, u) { return herm(b, c, slope(a, b, c, tt[0], tt[1], tt[2]), slope(b, c, d, tt[1], tt[2], tt[3]), tt[2] - tt[1], u); }

// ---------- geometry helpers ----------
function lathe(profile, seg = 20, phiStart = 0, phiLen = Math.PI * 2) {
  const g = new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(Math.max(r, 0.0005), y)), seg, phiStart, phiLen);
  g.computeVertexNormals(); return g;
}
function rbox(w, h, d, r = 0.02) { // rounded box via extruded rounded rect
  const s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, W = w - 2 * r, H = h - 2 * r;
  s.moveTo(x, -h / 2); s.lineTo(x + W, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, y); s.lineTo(w / 2, y + H);
  s.quadraticCurveTo(w / 2, h / 2, x + W, h / 2); s.lineTo(x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y + H);
  s.lineTo(-w / 2, y); s.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(d - 2 * r, 0.001), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return g;
}
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = 4; return t;
}

// ---------- the figure ----------
function buildFigure(opts = {}) {
  const ghost = !!opts.ghost;
  const parts = {};
  const mats = [];
  const mk = (color = COL.skin) => {
    const m = ghost ? new T.MeshStandardMaterial({ color: COL.ghost, transparent: true, opacity: 0.26, depthWrite: false, roughness: 0.6, emissive: new T.Color(COL.ghost).multiplyScalar(0.25) })
      : new T.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.0 });
    mats.push(m); return m;
  };
  const mesh = (g, m, name) => { const o = new T.Mesh(g, m); o.castShadow = !ghost; o.receiveShadow = !ghost; if (name) (parts[name] = parts[name] || []).push(o); return o; };
  const ell = (sx, sy, sz, m, name) => { const o = mesh(new T.SphereGeometry(1, 24, 16), m, name); o.scale.set(sx, sy, sz); return o; };

  const root = new T.Group();
  const pelvis = new T.Group(); root.add(pelvis);
  const spine = new T.Group(); spine.rotation.order = 'XYZ'; pelvis.add(spine);
  const neck = new T.Group(); neck.position.set(0, B.torso, 0); spine.add(neck);

  // pelvis + glutes
  const mP = mk(); const hips = mesh(lathe([[0, -0.11], [0.1, -0.1], [0.15, -0.05], [0.162, 0.02], [0.148, 0.09], [0.138, 0.13]], 24), mP, 'pelvis');
  hips.scale.set(1, 1, 0.72); pelvis.add(hips);
  for (const s of [-1, 1]) { const g = ell(0.08, 0.085, 0.07, mP, 'pelvis'); g.position.set(s * 0.072, -0.03, -0.065); pelvis.add(g); }
  // abdomen (waist) with a hint of abs
  const mA = mk(); const abd = mesh(lathe([[0.136, 0.06], [0.128, 0.12], [0.13, 0.18], [0.142, 0.24], [0.15, 0.27]], 24), mA, 'abdomen');
  abd.scale.set(1, 1, 0.7); spine.add(abd);
  const absM = ell(0.08, 0.095, 0.024, mA, 'abdomen'); absM.position.set(0, 0.17, 0.08); spine.add(absM);
  // chest: front half (pecs) and back half (lats/traps) for highlighting
  const prof = [[0.15, 0.26], [0.168, 0.31], [0.18, 0.37], [0.182, 0.42], [0.168, 0.46], [0.12, 0.5], [0.06, 0.52]];
  const mC = mk(), mB = mk();
  const chF = mesh(lathe(prof, 24, -Math.PI / 2, Math.PI), mC, 'chest'); chF.scale.set(1.05, 1, 0.66); spine.add(chF);
  const chB = mesh(lathe(prof, 24, Math.PI / 2, Math.PI), mB, 'back'); chB.scale.set(1.05, 1, 0.66); spine.add(chB);
  for (const s of [-1, 1]) {
    const pec = ell(0.085, 0.058, 0.034, mC, 'chest'); pec.position.set(s * 0.078, 0.375, 0.084); pec.rotation.z = s * 0.25; spine.add(pec);
    const lat = ell(0.05, 0.13, 0.075, mB, 'back'); lat.position.set(s * 0.145, 0.32, -0.035); lat.rotation.z = s * -0.18; spine.add(lat);
  }
  const trap = ell(0.14, 0.055, 0.07, mB, 'back'); trap.position.set(0, 0.47, -0.025); spine.add(trap);
  // neck + head
  const mN = mk(); const nk = mesh(lathe([[0.052, 0.0], [0.048, 0.06], [0.05, 0.11]], 16), mN); neck.add(nk);
  const mH = mk(); const head = ell(0.094, 0.112, 0.104, mH, 'head'); head.position.set(0, 0.18, 0.005); neck.add(head);
  const jaw = ell(0.07, 0.05, 0.07, mH, 'head'); jaw.position.set(0, 0.12, 0.035); neck.add(jaw);
  const nose = mesh(new T.ConeGeometry(0.016, 0.04, 10), mH, 'head'); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.17, 0.112); neck.add(nose);
  for (const s of [-1, 1]) { const ear = ell(0.012, 0.028, 0.02, mH, 'head'); ear.position.set(s * 0.094, 0.175, 0.0); neck.add(ear); }

  function limb(side) {
    const s = side === 'L' ? 1 : -1, o = {};
    const mD = mk(), mU = mk(), mF = mk(), mHd = mk(), mT = mk(), mS = mk(), mFt = mk(ghost ? undefined : 0x3A3632);
    o.delt = new T.Group(); spine.add(o.delt);
    const dl = ell(0.06, 0.056, 0.064, mD, 'delt'); dl.position.set(s * 0.01, 0.0, 0); o.delt.add(dl);
    // upper arm: local -Y along the bone, +Z = biceps side
    o.upper = new T.Group(); spine.add(o.upper);
    const ua = mesh(lathe([[0, 0.03], [0.036, 0.022], [0.05, -0.02], [0.052, -0.09], [0.048, -0.16], [0.042, -0.22], [0.037, -0.27], [0.03, -0.3], [0, -0.31]]), mU, 'upper'); o.upper.add(ua);
    const bi = ell(0.028, 0.058, 0.02, mU, 'upper'); bi.position.set(0, -0.13, 0.022); o.upper.add(bi);
    const tri = ell(0.032, 0.07, 0.024, mU, 'upper'); tri.position.set(0, -0.12, -0.026); o.upper.add(tri);
    // forearm: +Z = palm side
    o.fore = new T.Group(); o.fore.position.y = -B.upper; o.upper.add(o.fore);
    const fa = mesh(lathe([[0, 0.032], [0.04, 0.016], [0.045, -0.04], [0.04, -0.1], [0.032, -0.18], [0.026, -0.245], [0.02, -0.265], [0, -0.27]]), mF, 'fore');
    fa.scale.set(1.12, 1, 0.86); o.fore.add(fa); const ej = ell(0.04, 0.04, 0.04, mF, 'fore'); o.fore.add(ej);
    // hand: palm + curled fingers around the grip axis (local X) + thumb
    const hand = new T.Group(); hand.position.y = -B.fore; o.fore.add(hand); o.hand = hand;
    const palm = mesh(rbox(0.08, 0.085, 0.034, 0.012), mHd, 'hand'); palm.position.set(0, -0.045, -0.004); hand.add(palm);
    const fing = mesh(new T.TorusGeometry(0.026, 0.017, 8, 14, Math.PI * 1.25), mHd, 'hand'); fing.rotation.set(0, Math.PI / 2, -Math.PI * 0.2); fing.scale.set(1, 1, 2.1);
    fing.position.set(0, -0.085, 0.022); hand.add(fing);
    const th = mesh(new T.CapsuleGeometry(0.012, 0.03, 4, 8), mHd, 'hand'); th.position.set(s * 0.04, -0.04, 0.03); th.rotation.set(0.6, 0, s * 0.5); hand.add(th);
    // thigh: +Z = front (quads)
    o.thigh = new T.Group(); o.thigh.position.set(s * B.hipX, 0, 0); pelvis.add(o.thigh);
    const th1 = mesh(lathe([[0, 0.05], [0.078, 0.035], [0.094, -0.03], [0.093, -0.12], [0.084, -0.24], [0.068, -0.35], [0.057, -0.42], [0.05, -0.45], [0, -0.47]]), mT, 'thigh'); th1.scale.set(1, 1, 1.06); o.thigh.add(th1);
    
    // shin: +Z = front, calf behind
    o.shin = new T.Group(); o.shin.position.y = -B.thigh; o.thigh.add(o.shin);
    const sh = mesh(lathe([[0, 0.03], [0.05, 0.01], [0.052, -0.05], [0.055, -0.12], [0.048, -0.22], [0.037, -0.32], [0.03, -0.41], [0.028, -0.44], [0, -0.455]]), mS, 'shin'); o.shin.add(sh);
    const calf = ell(0.042, 0.095, 0.04, mS, 'shin'); calf.position.set(0, -0.13, -0.024); o.shin.add(calf);
    const kj = ell(0.054, 0.054, 0.054, mS, 'shin'); o.shin.add(kj); const kc = ell(0.03, 0.032, 0.016, mS, 'shin'); kc.position.set(0, 0.0, 0.042); o.shin.add(kc);
    // foot (trainer shape)
    o.foot = new T.Group(); o.foot.position.y = -B.shin; o.shin.add(o.foot);
    const fs = new T.Shape(); fs.moveTo(-0.04, -0.075); fs.quadraticCurveTo(0, -0.1, 0.04, -0.075); fs.lineTo(0.05, 0.08); fs.quadraticCurveTo(0.048, 0.19, 0, 0.2); fs.quadraticCurveTo(-0.05, 0.19, -0.05, 0.08); fs.lineTo(-0.04, -0.075);
    const fg = new T.ExtrudeGeometry(fs, { depth: 0.04, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.014, bevelSegments: 3 });
    fg.rotateX(Math.PI / 2); fg.computeVertexNormals();
    const ft = mesh(fg, mFt, 'foot'); ft.position.set(0, -0.03, 0); ft.scale.x = s; o.foot.add(ft);
    const ank = ell(0.036, 0.04, 0.045, mS); ank.position.set(0, -0.01, 0.005); o.foot.add(ank);
    return o;
  }
  const L = limb('L'), R = limb('R');
  return { root, pelvis, spine, neck, L, R, parts, mats, ghost };
}

// ---------- the viewer ----------
export async function createViewer(container, opts = {}) {
  await loadThree();
  const accent = new T.Color(opts.accent || '#FF7A2F');
  const W = () => Math.max(container.clientWidth, 200), H = () => Math.max(container.clientHeight, 160);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: !!opts.capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none';

  const scene = new T.Scene();
  scene.background = new T.Color(COL.wall);
  scene.fog = new T.Fog(COL.wall, 7, 16);
  const camera = new T.PerspectiveCamera(32, W() / H(), 0.05, 60);

  // ----- gym: rubber tile floor, cyclorama wall, distant racks, lights -----
  const floorTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#1d1b19'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const g = 20 + Math.random() * 24 | 0; c.fillStyle = `rgba(${g + 8},${g + 4},${g},.55)`; c.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
  }, 8);
  const floor = new T.Mesh(new T.PlaneGeometry(16, 16), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.96, color: 0xffffff }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallTex = canvasTex(1024, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f0e0d'); g.addColorStop(0.7, '#1b1917'); g.addColorStop(1, '#22201d');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.025)'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 2, h);
    c.fillStyle = 'rgba(255,122,47,.18)'; c.fillRect(0, h * 0.62, w, 3);
  });
  wallTex.repeat.set(3, 1);
  const wall = new T.Mesh(new T.CylinderGeometry(7.5, 7.5, 6, 64, 1, true), new T.MeshStandardMaterial({ map: wallTex, side: T.BackSide, roughness: 1 }));
  wall.position.y = 3; const gym = new T.Group(); scene.add(gym); gym.add(wall);
  const decoMat = new T.MeshStandardMaterial({ color: 0x24211e, roughness: 0.8 });
  for (let i = 0; i < 7; i++) { // silhouettes of racks around the room
    const a = (i / 7) * Math.PI * 2 + 0.3, r = 6.3;
    const g = new T.Group(); g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); g.lookAt(0, 0, 0);
    for (const x of [-0.6, 0.6]) for (const z of [-0.35, 0.35]) { const p = new T.Mesh(new T.BoxGeometry(0.07, 2.3, 0.07), decoMat); p.position.set(x, 1.15, z); g.add(p); }
    const top = new T.Mesh(new T.BoxGeometry(1.3, 0.07, 0.8), decoMat); top.position.y = 2.3; g.add(top);
    for (const y of [0.5, 1.0]) { const sh = new T.Mesh(new T.BoxGeometry(1.25, 0.05, 0.6), decoMat); sh.position.y = y; g.add(sh); }
    gym.add(g);
  }
  const hemi = new T.HemisphereLight(0xFFF1E0, 0x1A1512, 1.25); scene.add(hemi);
  const key = new T.SpotLight(0xFFF6EA, 60, 16, 0.62, 0.55, 1.6);
  key.position.set(2.2, 5.2, 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target);
  const rim = new T.DirectionalLight(0xFF9A5A, 1.1); rim.position.set(-3, 3, -3.5); scene.add(rim);
  const fill = new T.DirectionalLight(0xCAD6FF, 0.35); fill.position.set(-3, 2, 3); scene.add(fill);
  // studio look: plain light backdrop like an anatomy illustration
  if (opts.studio) {
    gym.visible = false;
    scene.background = new T.Color(0xEFEBE5); scene.fog = new T.Fog(0xEFEBE5, 5, 11);
    floor.material.map = null; floor.material.color.set(0xE6E1D9); floor.material.needsUpdate = true;
    hemi.intensity = 2.1; hemi.groundColor.set(0x8F877C); key.intensity = 38; rim.color.set(0xFFFFFF); rim.intensity = 0.6;
    renderer.toneMappingExposure = 1.0;
  }

  // ----- figures -----
  const F = buildFigure(); scene.add(F.root);
  const G = buildFigure({ ghost: true }); G.root.visible = false; scene.add(G.root);

  // ----- equipment -----
  const equip = new T.Group(); scene.add(equip);
  const mat = (color, rough = 0.7, metal = 0) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const mPad = mat(COL.pad, 0.65), mFrame = mat(COL.frame, 0.5, 0.3), mMetal = mat(COL.metal, 0.28, 0.85), mSteel = mat(COL.steel, 0.35, 0.8);
  const mRubber = mat(0x181614, 0.85), mStripe = mat(COL.accentDim, 0.6), mWood = mat(0x3A2E24, 0.85);
  let dyn = [];
  const sh = o => { o.castShadow = true; o.receiveShadow = true; return o; };
  const add = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); equip.add(o); return o; };
  const box = (w, h, d, m, x, y, z, rx = 0) => { const o = sh(new T.Mesh(rbox(w, h, d, Math.min(0.02, w / 4, h / 4, d / 4)), m)); o.rotation.x = rx; return add(o, x, y, z); };
  const rod = (r, len, m, seg = 16) => sh(new T.Mesh(new T.CylinderGeometry(r, r, len, seg), m));
  const UP = new T.Vector3(0, 1, 0), XA = new T.Vector3(1, 0, 0);
  function placeRod(m, a, b) {
    const d = new T.Vector3().subVectors(b, a); const len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(len, 0.001), 1);
    if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  function makeLine(n, color = 0x8A8275) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    const l = new T.Line(g, new T.LineBasicMaterial({ color })); equip.add(l); return l;
  }
  function setLine(l, pts) { const a = l.geometry.attributes.position; pts.forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z)); a.needsUpdate = true; l.geometry.computeBoundingSphere(); }
  function plate(r, w) { // bumper plate: rubber disc, raised rim, steel hub
    const g = new T.Group();
    const prof = [[0.026, -w / 2], [r * 0.8, -w / 2], [r, -w / 2 + 0.008], [r, w / 2 - 0.008], [r * 0.8, w / 2], [0.026, w / 2]];
    const disc = sh(new T.Mesh(lathe(prof, 36), mRubber)); g.add(disc);
    const hub = rod(0.05, w + 0.004, mSteel); g.add(hub);
    const st = sh(new T.Mesh(new T.TorusGeometry(r * 0.88, 0.005, 6, 40), mStripe)); st.rotation.x = Math.PI / 2; st.position.y = w / 2; g.add(st);
    g.rotation.z = Math.PI / 2; return g;
  }
  function bench(y = 0.44, z0 = -0.95, z1 = 0.35, w = 0.3, x = 0) {
    box(w, 0.07, z1 - z0, mPad, x, y - 0.035, (z0 + z1) / 2);
    box(w * 0.55, 0.05, z1 - z0 - 0.1, mFrame, x, y - 0.095, (z0 + z1) / 2);
    for (const z of [z0 + 0.1, z1 - 0.1]) { box(0.06, y - 0.12, 0.06, mFrame, x, (y - 0.12) / 2, z); box(w * 1.2, 0.04, 0.07, mFrame, x, 0.02, z); }
  }

  function buildProps(list) {
    while (equip.children.length) equip.remove(equip.children[0]);
    dyn = [];
    for (const p of list || []) {
      const k = p.type;
      if (k === 'barbell' || k === 'ezbar' || k === 'bar') {
        const len = p.len || (k === 'barbell' ? 1.9 : k === 'ezbar' ? 1.2 : 1.25);
        const g = new T.Group(); equip.add(g);
        const shaft = rod(0.0125, len * 0.72, mMetal); shaft.rotation.z = Math.PI / 2; g.add(shaft);
        if (k !== 'bar') {
          for (const s of [-1, 1]) {
            const sl = rod(0.025, len * 0.16, mMetal); sl.rotation.z = Math.PI / 2; sl.position.x = s * len * 0.44; g.add(sl);
            const col = rod(0.034, 0.03, mSteel); col.rotation.z = Math.PI / 2; col.position.x = s * len * 0.37; g.add(col);
            const pr = p.plate || (k === 'barbell' ? 0.225 : 0.12), pw = k === 'barbell' ? 0.065 : 0.03;
            const pl = plate(pr, pw); pl.position.x = s * (len * 0.37 + 0.02 + pw / 2); g.add(pl);
            if (k === 'barbell') { const pl2 = plate(pr * 0.78, pw * 0.75); pl2.position.x = s * (len * 0.37 + 0.03 + pw + pw * 0.4); g.add(pl2); }
          }
        } else { for (const s of [-1, 1]) { const end = rod(0.02, 0.08, mFrame); end.rotation.z = Math.PI / 2; end.position.x = s * len / 2; g.add(end); } }
        dyn.push(c => { g.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); const d = new T.Vector3().subVectors(c.hand.L, c.hand.R); if (d.lengthSq() > 1e-6) g.quaternion.setFromUnitVectors(XA, d.normalize()); });
        if (k === 'barbell' && !p.noPlatform && !opts.studio) { box(2.4, 0.03, 1.6, mWood, 0, 0.015, 0); }
      } else if (k === 'dumbbells' || k === 'dumbbell1') {
        const mkd = () => {
          const g = new T.Group(); const h = rod(0.017, 0.14, mMetal); h.rotation.z = Math.PI / 2; g.add(h);
          for (const s of [-1, 1]) { const b = rod(0.058, 0.07, mRubber, 6); b.rotation.z = Math.PI / 2; b.position.x = s * 0.105; g.add(b); }
          equip.add(g); return g;
        };
        if (k === 'dumbbells' && p.hand) {
          const a = mkd(), hs = p.hand;
          dyn.push(c => { a.position.copy(c.hand[hs]); a.quaternion.setFromUnitVectors(XA, c.axis[hs]); });
        } else if (k === 'dumbbells') {
          const a = mkd(), b = mkd();
          dyn.push(c => { a.position.copy(c.hand.L); b.position.copy(c.hand.R); a.quaternion.setFromUnitVectors(XA, c.axis.L); b.quaternion.setFromUnitVectors(XA, c.axis.R); });
        } else {
          const a = mkd(); const ax = p.axis === 'y' ? UP : XA;
          dyn.push(c => { a.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); if (p.axis === 'y') a.position.y -= 0.06; a.quaternion.setFromUnitVectors(XA, ax); });
        }
      } else if (k === 'plate') {
        const g = plate(0.17, 0.04); equip.add(g);
        dyn.push(c => { g.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); });
      } else if (k === 'bench') {
        bench(p.y ?? 0.44, p.z0 ?? -0.95, p.z1 ?? 0.35, p.w ?? 0.3, p.x ?? 0);
      } else if (k === 'incline') {
        const y = p.y ?? 0.44, a = (p.angle ?? 55) * DEG, len = p.len ?? 0.8, z = p.z ?? 0.05;
        box(0.32, 0.07, 0.36, mPad, 0, y - 0.035, z + 0.12);
        const pad = box(0.3, 0.07, len, mPad, 0, 0, 0); pad.rotation.x = (Math.PI / 2 - a);
        pad.position.set(0, y + Math.cos(a) * len / 2 + 0.02, z - 0.08 - Math.sin(a) * len / 2);
        box(0.06, y - 0.08, 0.06, mFrame, 0, (y - 0.08) / 2, z + 0.1); box(0.06, 0.5, 0.06, mFrame, 0, 0.25, z - 0.45); box(0.5, 0.04, 0.07, mFrame, 0, 0.02, z + 0.1); box(0.5, 0.04, 0.07, mFrame, 0, 0.02, z - 0.45);
      } else if (k === 'seat') {
        const y = p.y ?? 0.45, z = p.z ?? 0, d = p.d ?? 0.4;
        box(0.38, 0.08, d, mPad, 0, y - 0.04, z); box(0.07, y - 0.08, 0.07, mFrame, 0, (y - 0.08) / 2, z); box(0.5, 0.04, 0.45, mFrame, 0, 0.02, z);
        if (p.back) { const bp = box(0.36, p.back, 0.08, mPad, 0, y + p.back / 2 + 0.03, z - d / 2 - 0.03); bp.rotation.x = -(p.backTilt || 0) * DEG; }
        if (p.pad) { const pd = rod(0.05, 0.42, mPad); pd.rotation.z = Math.PI / 2; add(pd, 0, p.pad[0], p.pad[1]); }
      } else if (k === 'box') {
        box(p.w ?? 0.6, p.h ?? 0.45, p.d ?? 0.45, p.mat === 'wood' ? mWood : mPad, p.x ?? 0, (p.h ?? 0.45) / 2 + (p.y ?? 0), p.z ?? 0, p.rx ?? 0);
      } else if (k === 'pullbar') {
        const y = p.y ?? 2.25, w = p.w ?? 1.5;
        const r = rod(0.016, w, mMetal); r.rotation.z = Math.PI / 2; add(r, 0, y, p.z ?? 0);
        for (const s of [-1, 1]) { const u = rod(0.035, y + 0.1, mFrame); add(u, s * w / 2, (y + 0.1) / 2, p.z ?? 0); box(0.08, 0.04, 0.9, mFrame, s * w / 2, 0.02, p.z ?? 0); }
      } else if (k === 'dipbars') {
        const y = p.y ?? 1.2, x = p.x ?? 0.27;
        for (const s of [-1, 1]) {
          const r = rod(0.022, 0.7, mMetal); r.rotation.x = Math.PI / 2; add(r, s * x, y, 0.05);
          for (const zz of [-0.25, 0.35]) { const u = rod(0.028, y, mFrame); add(u, s * x, y / 2, zz); }
        }
      } else if (k === 'cable') {
        const anchor = new T.Vector3(...p.anchor);
        const tx = anchor.x + (p.towerDx || 0), tz = anchor.z + (p.towerDz ?? 0.14), th = Math.max(anchor.y + 0.2, 2.1);
        box(0.2, th, 0.12, mFrame, tx, th / 2, tz + 0.12);
        for (let i = 0; i < 14; i++) box(0.16, 0.028, 0.09, i === 9 ? mStripe : mSteel, tx, 0.12 + i * 0.032, tz + 0.12);
        const pulley = sh(new T.Mesh(new T.TorusGeometry(0.04, 0.012, 8, 20), mSteel)); pulley.rotation.y = Math.PI / 2; add(pulley, anchor.x, anchor.y, anchor.z);
        const wire = rod(0.005, 1, mat(0x9A9287, 0.5, 0.5), 6); equip.add(wire);
        const hg = new T.Group(); equip.add(hg);
        if (p.handle === 'bar') { const b = rod(0.014, p.handleLen || 0.6, mMetal); b.rotation.z = Math.PI / 2; hg.add(b); }
        else if (p.handle === 'rope') { for (const s of [-1, 1]) { const r = rod(0.018, 0.22, mat(0x2a2a2a, 0.9)); r.position.x = s * 0.06; r.rotation.z = s * 0.4; hg.add(r); } }
        else if (p.handle !== 'none') { const d = rod(0.014, 0.13, mMetal); d.rotation.z = Math.PI / 2; hg.add(d); }
        const which = p.to || 'both';
        dyn.push(c => {
          const tp = which === 'L' ? c.hand.L.clone() : which === 'R' ? c.hand.R.clone() : c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5);
          placeRod(wire, anchor, tp); hg.position.copy(tp);
          if (which === 'both') { const d = new T.Vector3().subVectors(c.hand.L, c.hand.R); if (d.length() > 0.02) hg.quaternion.setFromUnitVectors(XA, d.normalize()); }
        });
      } else if (k === 'treadmill') {
        const z = p.z ?? -0.1;
        box(0.7, 0.1, 1.8, mFrame, 0, 0.05, z); box(0.52, 0.012, 1.62, mRubber, 0, 0.106, z);
        for (const s of [-1, 1]) { const u = rod(0.025, 1.05, mFrame); u.rotation.x = -0.15; add(u, s * 0.32, 0.52, 0.78); const hr = rod(0.018, 0.5, mMetal); hr.rotation.x = Math.PI / 2; add(hr, s * 0.32, 1.0, 0.6); }
        box(0.68, 0.08, 0.24, mPad, 0, 1.03, 0.86);
      } else if (k === 'bike') {
        const cz = p.cz ?? 0.42, cy = p.cy ?? 0.42;
        box(0.08, 0.08, 0.95, mFrame, 0, 0.3, 0.1); box(0.36, 0.05, 0.5, mFrame, 0, 0.03, 0.1);
        const post = rod(0.03, 0.62, mFrame); post.rotation.x = 0.3; add(post, 0, 0.6, -0.12);
        box(0.2, 0.06, 0.26, mPad, 0, p.seatY ?? 0.86, -0.17);
        const stem = rod(0.03, 0.75, mFrame); stem.rotation.x = -0.15; add(stem, 0, 0.72, 0.52);
        const hb = rod(0.018, 0.5, mMetal); hb.rotation.z = Math.PI / 2; add(hb, 0, 1.07, 0.58);
        const fly = rod(0.21, 0.06, mSteel, 32); fly.rotation.z = Math.PI / 2; add(fly, 0, 0.34, 0.66);
        const crank = rod(0.012, 1, mMetal); equip.add(crank); const crank2 = rod(0.012, 1, mMetal); equip.add(crank2);
        const hub = new T.Vector3(0, cy, cz);
        dyn.push(c => { placeRod(crank, hub.clone().setX(0.1), c.foot.L.clone().setX(0.1)); placeRod(crank2, hub.clone().setX(-0.1), c.foot.R.clone().setX(-0.1)); });
      } else if (k === 'rower') {
        box(0.16, 0.06, 2.1, mFrame, 0, 0.27, -0.05);
        const fw = rod(0.25, 0.14, mSteel, 32); fw.rotation.z = Math.PI / 2; add(fw, 0, 0.45, 1.15);
        box(0.38, 0.04, 0.26, mPad, 0, 0.3, 0.62, 0.7);
        const seatM = box(0.3, 0.06, 0.3, mPad, 0, 0.33, 0);
        const chain = rod(0.005, 1, mat(0x8A8275, 0.5, 0.5), 6); equip.add(chain);
        const hdl = rod(0.016, 0.42, mMetal); hdl.rotation.z = Math.PI / 2; const hg = new T.Group(); hg.add(hdl); equip.add(hg);
        const out = new T.Vector3(0, 0.62, 1.05);
        dyn.push(c => { seatM.position.z = c.pel.z; const tp = c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5); hg.position.copy(tp); placeRod(chain, out, tp); });
      } else if (k === 'platform') {
        const pl = sh(new T.Mesh(rbox(0.64, 0.52, 0.05, 0.015), mFrame)); equip.add(pl);
        for (const s of [-1, 1]) { const r = rod(0.03, 1.1, mMetal); r.rotation.x = Math.PI / 4; add(r, s * 0.42, 0.9, 0.62); }
        const n = new T.Vector3(0, 0.7071, 0.7071);
        dyn.push(c => { const mid = c.foot.L.clone().add(c.foot.R).multiplyScalar(0.5); pl.position.copy(mid).addScaledVector(n, 0.06); pl.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), n.clone().negate()); });
      } else if (k === 'roller') {
        const r = rod(0.06, 0.42, mPad); r.rotation.z = Math.PI / 2; equip.add(r);
        dyn.push(c => { r.position.copy(c.foot.L).add(c.foot.R).multiplyScalar(0.5); r.position.z -= 0.09; r.position.y += 0.03; });
      } else if (k === 'kneepad') {
        const r = rod(0.06, 0.42, mPad); r.rotation.z = Math.PI / 2; add(r, 0, p.y ?? 0.62, p.z ?? 0.1);
      } else if (k === 'mat') {
        box(0.66, 0.014, 1.9, mat(0x3B302A, 0.95), 0, 0.007, p.z ?? 0);
      } else if (k === 'wheel') {
        const w = rod(0.1, 0.06, mRubber, 28); w.rotation.z = Math.PI / 2; equip.add(w);
        const ax = rod(0.012, 0.32, mMetal); ax.rotation.z = Math.PI / 2; equip.add(ax);
        dyn.push(c => { const m = c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5); w.position.copy(m).setY(0.1); ax.position.copy(m).setY(0.1); w.rotation.x = -m.z * 10; });
      } else if (k === 'jumprope') {
        const l = makeLine(33, 0xD0C6B8);
        dyn.push(c => {
          const a = c.hand.L, b = c.hand.R, mid = a.clone().add(b).multiplyScalar(0.5); const ang = (c.t - 0.25) * Math.PI * 2 * (p.turns || 2);
          const pts = [];
          for (let i = 0; i <= 32; i++) { const s = i / 32, x = a.x + (b.x - a.x) * s, bow = Math.sin(s * Math.PI), rr = 1.05 * bow;
            pts.push(new T.Vector3(x, Math.max(0.01, mid.y + (a.y - mid.y) * (1 - bow) - Math.cos(ang) * rr), mid.z + Math.sin(ang) * rr)); }
          setLine(l, pts);
        });
      } else if (k === 'ropes') {
        const l1 = makeLine(25, 0xB8A27A), l2 = makeLine(25, 0xB8A27A); const anc = p.anchor || [0, 0.25, 2.6];
        box(0.3, 0.5, 0.3, mFrame, 0, 0.25, anc[2] + 0.1);
        dyn.push(c => {
          for (const [l, hpt, sx] of [[l1, c.hand.L, 0.12], [l2, c.hand.R, -0.12]]) {
            const pts = []; const end = new T.Vector3(sx, anc[1], anc[2]);
            for (let i = 0; i <= 24; i++) { const s = i / 24; const q = hpt.clone().lerp(end, s);
              q.y += Math.sin(s * Math.PI * 3 - c.t * Math.PI * 8 + (sx > 0 ? 0 : Math.PI)) * 0.12 * (1 - s) * Math.sin(s * Math.PI + 0.3); q.y = Math.max(q.y, 0.02); pts.push(q); }
            setLine(l, pts);
          }
        });
      } else if (k === 'sled') {
        const g = new T.Group(); equip.add(g);
        const base = sh(new T.Mesh(rbox(0.6, 0.1, 0.7, 0.02), mFrame)); base.position.y = 0.05; g.add(base);
        for (const s of [-1, 1]) { const post = rod(0.025, 1, mMetal); post.position.set(s * 0.24, 0.5, -0.25); post.rotation.x = -0.35; g.add(post); }
        const pl = plate(0.2, 0.06); pl.rotation.set(0, 0, 0); pl.position.set(0, 0.2, 0.1); g.add(pl);
        dyn.push(c => { g.position.set(0, 0, (c.hand.L.z + c.hand.R.z) / 2 + 0.55); });
      } else if (k === 'handles') {
        for (const s of [-1, 1]) box(0.04, 0.04, 0.2, mMetal, s * (p.x ?? 0.3), p.y ?? 0.45, p.z ?? 0.05);
      } else if (k === 'preacher') {
        const pad = box(0.42, 0.06, 0.32, mPad, 0, 0, 0); pad.rotation.x = -0.75; pad.position.set(0, p.y ?? 1.0, p.z ?? 0.2);
        box(0.06, (p.y ?? 1.0) - 0.05, 0.06, mFrame, 0, ((p.y ?? 1.0) - 0.05) / 2, (p.z ?? 0.2) - 0.05);
        box(0.36, 0.07, 0.34, mPad, 0, 0.56, -0.12); box(0.06, 0.52, 0.06, mFrame, 0, 0.26, -0.12); box(0.5, 0.04, 0.6, mFrame, 0, 0.02, 0.05);
      } else if (k === 'machine') { // generic chest / shoulder press machine frame with handles following the hands
        box(0.08, 1.6, 0.08, mFrame, 0.42, 0.8, -0.35); box(0.08, 1.6, 0.08, mFrame, -0.42, 0.8, -0.35); box(0.92, 0.07, 0.08, mFrame, 0, 1.6, -0.35);
        const arms = [rod(0.016, 1, mMetal), rod(0.016, 1, mMetal)]; arms.forEach(a => equip.add(a));
        dyn.push(c => { placeRod(arms[0], new T.Vector3(0.42, 1.5, -0.35), c.hand.L); placeRod(arms[1], new T.Vector3(-0.42, 1.5, -0.35), c.hand.R); });
      } else if (k === 'landmine') {
        const r = rod(0.015, 1, mMetal); equip.add(r); const pl = plate(0.2, 0.06); equip.add(pl);
        const base = new T.Vector3(p.x ?? 0, 0.05, p.z ?? 1.7); box(0.2, 0.1, 0.2, mFrame, base.x, 0.05, base.z);
        dyn.push(c => { const tip = p.hand ? c.hand[p.hand].clone() : c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5); const dv = new T.Vector3().subVectors(tip, base); const len = dv.length() + 0.12; const d = dv.normalize(); const end = base.clone().addScaledVector(d, len);
          placeRod(r, base, end); pl.position.copy(end).addScaledVector(d, -0.25); pl.quaternion.setFromUnitVectors(UP, d); pl.rotateX(0); });
      } else if (k === 'backpad') { // pad that follows the torso (hack squat, machines)
        const pd = sh(new T.Mesh(rbox(0.36, p.len ?? 0.7, 0.07, 0.02), mPad)); equip.add(pd);
        dyn.push(c => { pd.position.copy(c.fig.spine.localToWorld(new T.Vector3(0, p.y ?? 0.28, -0.17))); c.fig.spine.getWorldQuaternion(pd.quaternion); });
      } else if (k === 'post') {
        const r = rod(0.035, p.h ?? 1.6, mFrame); add(r, p.x ?? 0.5, (p.h ?? 1.6) / 2, p.z ?? 0); box(0.3, 0.04, 0.3, mFrame, p.x ?? 0.5, 0.02, p.z ?? 0);
      } else if (k === 'pad') { // static angled pad: centre, length, angle about X
        const pd = sh(new T.Mesh(rbox(p.w ?? 0.34, 0.07, p.len ?? 0.8, 0.02), mPad)); pd.position.set(...p.at); pd.rotation.x = (p.rx ?? 0); equip.add(pd);
        if (p.legs !== false) box(0.06, p.at[1] - 0.05, 0.06, mFrame, p.at[0], (p.at[1] - 0.05) / 2, p.at[2]);
      } else if (k === 'stairs') { // stepper: two pedals that follow the feet
        box(0.7, 0.08, 1.0, mFrame, 0, 0.04, 0.35);
        for (const s of [-1, 1]) { box(0.07, 1.35, 0.07, mFrame, s * 0.34, 0.68, 0.82); const hr = rod(0.018, 0.45, mMetal); hr.rotation.x = Math.PI / 2; add(hr, s * 0.34, 1.12, 0.6); }
        box(0.74, 0.08, 0.2, mPad, 0, 1.38, 0.82);
        const pd = [sh(new T.Mesh(rbox(0.16, 0.04, 0.3, 0.012), mRubber)), sh(new T.Mesh(rbox(0.16, 0.04, 0.3, 0.012), mRubber))]; pd.forEach(x => equip.add(x));
        dyn.push(c => { pd[0].position.copy(c.foot.L).add(new T.Vector3(0, -0.1, 0.05)); pd[1].position.copy(c.foot.R).add(new T.Vector3(0, -0.1, 0.05)); });
      }
    }
  }

  // ----- IK + bone helpers -----
  const V = () => new T.Vector3();
  const qP = new T.Quaternion(), qW = new T.Quaternion(), M4 = new T.Matrix4();
  function solve2(A, Tg, a, b, pole) {
    const d = V().subVectors(Tg, A); let dist = d.length();
    const dir = dist > 1e-6 ? d.clone().divideScalar(dist) : new T.Vector3(0, -1, 0);
    dist = Math.min(Math.max(dist, Math.abs(a - b) + 1e-3), a + b - 1e-4);
    const cosA = (a * a + dist * dist - b * b) / (2 * a * dist), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    let pp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (pp.lengthSq() < 1e-8) pp = new T.Vector3(0, 0, 1).addScaledVector(dir, -dir.z);
    pp.normalize();
    return { E: A.clone().addScaledVector(dir, a * cosA).addScaledVector(pp, a * sinA), End: A.clone().addScaledVector(dir, dist), pp };
  }
  // orient a bone: local -Y along `down`, local +Z toward `front`
  function setBasis(bone, down, front) {
    const y = down.clone().normalize().negate();
    let z = front.clone().addScaledVector(y, -front.dot(y));
    if (z.lengthSq() < 1e-6) z = new T.Vector3(0, 0, 1).addScaledVector(y, -y.z);
    if (z.lengthSq() < 1e-6) z = new T.Vector3(1, 0, 0);
    z.normalize(); const x = V().crossVectors(y, z).normalize(); z.crossVectors(x, y);
    M4.makeBasis(x, y, z); qW.setFromRotationMatrix(M4);
    bone.parent.getWorldQuaternion(qP); bone.quaternion.copy(qP.invert().multiply(qW)); bone.updateMatrixWorld(true);
  }

  // ----- pose -----
  let move = null, ghostKeys = null, tNow = 0, playing = true, speed = 1, slowmo = true, lastTs = null, raf = 0, phaseCb = null, lastPhase = -1, effort = 0.7;
  const cur = { hand: { L: V(), R: V() }, axis: { L: V(), R: V() }, foot: { L: V(), R: V() }, pel: V(), t: 0, fig: F };
  const scratch = { hand: { L: V(), R: V() }, axis: { L: V(), R: V() }, foot: { L: V(), R: V() }, pel: V(), t: 0 };

  function sample(K, t) {
    if (!K) return { ...normKey(move.fn(t), null), _fn: true };
    let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++;
    const span = K[i + 1].t - K[i].t; const u = span > 0 ? Math.min(1, Math.max(0, (t - K[i].t) / span)) : 0;
    const { idx, tt } = ring(K, i);
    const out = { _i: i, _u: u, _idx: idx, _tt: tt };
    for (const f of SCALARS) out[f] = interp4(K[idx[0]][f], K[idx[1]][f], K[idx[2]][f], K[idx[3]][f], tt, u);
    for (const f of VEC3) out[f] = [0, 1, 2].map(j => interp4(K[idx[0]][f][j], K[idx[1]][f][j], K[idx[2]][f][j], K[idx[3]][f][j], tt, u));
    return out;
  }
  function resolve(Fig, spec, side, sh) {
    const v = new T.Vector3(...spec.v);
    if (spec.m === 'w') return v;
    if (spec.m === 't') return Fig.spine.localToWorld(v);
    if (spec.m === 's') { const s = side === 'L' ? 1 : -1; return Fig.spine.localToWorld(new T.Vector3(s * B.shX, B.shY + sh, 0)).add(v); }
    if (spec.m === 'p') return Fig.pelvis.getWorldPosition(V()).add(v);
    return v;
  }
  function pose(Fig, K, t, out) {
    const P = sample(K, t);
    out.t = t;
    Fig.pelvis.position.set(...P.pel);
    Fig.pelvis.rotation.set(P.trunk * DEG, 0, -P.roll * DEG);
    Fig.spine.rotation.set(P.lumbar * DEG, P.yaw * DEG, 0);
    Fig.neck.rotation.set(P.head * DEG, 0, 0);
    Fig.root.updateMatrixWorld(true);
    out.pel.copy(Fig.pelvis.position);
    const tgt = (field, side) => {
      if (P._fn) return resolve(Fig, P[field], side, P.sh);
      const pts = P._idx.map(j => resolve(Fig, K[j][field], side, P.sh));
      const o = new T.Vector3();
      for (const ax of ['x', 'y', 'z']) o[ax] = interp4(pts[0][ax], pts[1][ax], pts[2][ax], pts[3][ax], P._tt, P._u);
      return o;
    };
    for (const [S, side, s] of [[Fig.L, 'L', 1], [Fig.R, 'R', -1]]) {
      const shL = new T.Vector3(s * B.shX, B.shY + P.sh, 0);
      S.delt.position.copy(shL); S.upper.position.copy(shL); S.upper.updateMatrixWorld(true);
      const shW = Fig.spine.localToWorld(shL.clone());
      const arm = solve2(shW, tgt('h' + side, side), B.upper, B.lower, new T.Vector3(...P['ep' + side]));
      const uDir = V().subVectors(arm.E, shW), fDir = V().subVectors(arm.End, arm.E);
      setBasis(S.upper, uDir, arm.pp.clone().negate());           // biceps away from the elbow point
      setBasis(S.fore, fDir, new T.Vector3(...P['pn' + side]));   // palm faces pn
      S.hand.rotation.x = -P['wr' + side] * DEG; S.hand.updateMatrixWorld(true);
      out.hand[side].copy(S.hand.localToWorld(new T.Vector3(0, -(B.lower - B.fore), 0)));
      out.axis[side].set(1, 0, 0).applyQuaternion(S.hand.getWorldQuaternion(qW));
      const hipW = Fig.pelvis.localToWorld(new T.Vector3(s * B.hipX, 0, 0));
      const leg = solve2(hipW, tgt('f' + side, side), B.thigh, B.shin, new T.Vector3(...P['kp' + side]));
      setBasis(S.thigh, V().subVectors(leg.E, hipW), leg.pp);
      setBasis(S.shin, V().subVectors(leg.End, leg.E), leg.pp);
      out.foot[side].copy(leg.End);
      const q = new T.Quaternion().setFromEuler(new T.Euler(P['fp' + side] * DEG, P['fy' + side] * DEG * s, 0, 'YXZ'));
      S.shin.getWorldQuaternion(qP); S.foot.quaternion.copy(qP.invert().multiply(q));
    }
    Fig.root.updateMatrixWorld(true);
  }
  function phaseAt(t) {
    const ph = move && move.phases; if (!ph) return -1;
    let i = ph.findIndex(p => t >= p.at[0] && t < p.at[1]); return i < 0 ? ph.length - 1 : i;
  }
  function apply(t) {
    if (!move) return;
    pose(F, move._keys || null, t, cur);
    for (const f of dyn) f(cur);
    if (G.root.visible && ghostKeys) pose(G, ghostKeys, t, scratch);
    const pi = phaseAt(t);
    if (pi >= 0) {
      effort += ((move.phases[pi].e ?? 0.7) - effort) * 0.08;
      if (phaseCb && pi !== lastPhase) { lastPhase = pi; phaseCb(pi, move.phases[pi]); }
    }
    glow();
  }

  // ----- highlight (glow follows effort) -----
  let hi = new Set();
  const base = new T.Color(COL.skin);
  function setHighlight(names) { hi = new Set(names || []); glow(true); }
  function glow() {
    for (const [n, list] of Object.entries(F.parts)) {
      const on = hi.has(n);
      for (const m of list) {
        if (on) { m.material.color.copy(base).lerp(accent, 0.55 + effort * 0.35); m.material.emissive.copy(accent).multiplyScalar(0.06 + effort * 0.32); }
        else if (n !== 'foot') { m.material.color.copy(base); m.material.emissive.setRGB(0, 0, 0); }
      }
    }
  }

  // ----- camera: orbit + follow -----
  const cam = { theta: 1.2, phi: 0.22, dist: 3.4, base: new T.Vector3(0, 0.9, 0), target: new T.Vector3(0, 0.9, 0), tTheta: 1.2, tPhi: 0.22, follow: 0.35 };
  const VIEWS = { front: 0.18, side: Math.PI / 2, q: 0.75, back: Math.PI - 0.3, sideR: -Math.PI / 2, qR: -0.75 };
  function setView(name) { if (VIEWS[name] !== undefined) { cam.tTheta = VIEWS[name]; cam.tPhi = move?.cam?.phi ?? 0.22; } }
  function placeCam(snap) {
    const k = snap ? 1 : 0.12;
    cam.theta += (cam.tTheta - cam.theta) * k; cam.phi += (cam.tPhi - cam.phi) * k;
    const want = cam.base.clone().lerp(cur.pel.clone().add(new T.Vector3(0, 0.15, 0)), cam.follow);
    cam.target.lerp(want, snap ? 1 : 0.06);
    const c = Math.cos(cam.phi);
    camera.position.set(cam.target.x + cam.dist * Math.sin(cam.theta) * c, cam.target.y + cam.dist * Math.sin(cam.phi), cam.target.z + cam.dist * Math.cos(cam.theta) * c);
    camera.lookAt(cam.target);
    key.target.position.copy(cam.base);
  }
  let drag = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    cam.tTheta -= dx * 0.01; cam.tPhi = Math.max(-0.05, Math.min(1.2, cam.tPhi + dy * 0.006));
  });
  const end = () => { drag = null; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(1.8, Math.min(6, cam.dist + e.deltaY * 0.002)); }, { passive: false });

  // ----- loop -----
  let visible = true;
  const io = new IntersectionObserver(es => { visible = es.some(x => x.isIntersecting); }, { threshold: 0.01 });
  io.observe(container);
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { lastTs = null; return; }
    if (lastTs != null && playing && move) {
      const pi = phaseAt(tNow), slow = slowmo && pi >= 0 && move.phases[pi].slow ? 0.4 : 1;
      tNow = (tNow + Math.min(0.05, (ts - lastTs) / 1000) * speed * slow / (move.period || 3.5)) % 1;
    }
    lastTs = ts;
    if (move) apply(tNow);
    placeCam();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); });
  ro.observe(container);

  return {
    setMove(id, highlight) {
      const m = MOVES[id] || MOVES.squat_bb; move = compileMove(m);
      buildProps(m.props); tNow = 0; lastPhase = -1; ghostKeys = null; G.root.visible = false;
      const c = m.cam || {};
      cam.base.set(...(c.target || [0, 0.9, 0])); cam.dist = c.dist || 3.4; cam.tPhi = cam.phi = c.phi ?? 0.22;
      cam.tTheta = cam.theta = VIEWS[c.view || 'q']; cam.follow = c.follow ?? 0.35;
      setHighlight(highlight); apply(0); placeCam(true);
    },
    mistakes: () => (move && move.mistakes ? move.mistakes.map((m, i) => ({ i, zh: m.zh, en: m.en, demo: !!m._keys })) : []),
    setMistake(i) {
      const mk = move && move.mistakes && move.mistakes[i];
      ghostKeys = mk && mk._keys ? mk._keys : null; G.root.visible = !!ghostKeys; if (ghostKeys) apply(tNow);
      return !!ghostKeys;
    },
    play() { playing = true; }, pause() { playing = false; }, toggle() { playing = !playing; return playing; },
    isPlaying: () => playing,
    setSpeed(s) { speed = s; }, setSlowmo(b) { slowmo = !!b; }, setView,
    setT(t) { tNow = ((t % 1) + 1) % 1; apply(tNow); placeCam(true); renderer.render(scene, camera); },
    getT: () => tNow,
    onPhase(cb) { phaseCb = cb; lastPhase = -1; },
    setHighlight,
    snap(t, view) { if (view) cam.theta = cam.tTheta = VIEWS[view]; cam.phi = cam.tPhi; tNow = t; effort = 0.8; apply(t); placeCam(true); renderer.render(scene, camera); },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); scene.traverse(o => { o.geometry && o.geometry.dispose(); }); el.remove(); }
  };
}
