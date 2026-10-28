// FitTrack 3D movement viewer.
// A jointed mannequin driven by keyframes. Each keyframe says where the
// pelvis is, how far the torso leans, and where the hands and feet go;
// two-bone IK works out elbows and knees, so bar paths stay realistic.
import { MOVES } from './moves.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let T = null;
export async function loadThree() {
  if (!T) T = await import(THREE_URL);
  return T;
}

// Body measurements in metres. Pelvis origin = hip-joint height.
const B = {
  upper: 0.29, lower: 0.33, fore: 0.26, thigh: 0.44, shin: 0.44,
  shX: 0.19, shY: 0.44, hipX: 0.10, torso: 0.48
};
const DEG = Math.PI / 180;
const COLORS = { body: 0xCFC7BA, joint: 0x9A9184, dark: 0x2A2724, equip: 0x3A3631, equip2: 0x56504A, metal: 0xB8B2A8, floor: 0x1A1816, grid: 0x262320 };

// ---------- keyframe normalisation ----------
const SCALARS = ['trunk', 'lumbar', 'yaw', 'head', 'sh', 'fpL', 'fpR', 'fyL', 'fyR'];
const VEC3 = ['pel', 'epL', 'epR', 'kpL', 'kpR'];
const mir = v => [-v[0], v[1], v[2]];
function normKey(k, prev) {
  const o = { t: k.t };
  // pelvis may be [y,z] or [x,y,z]
  if (k.pel) o.pel = k.pel.length === 2 ? [0, k.pel[0], k.pel[1]] : k.pel.slice();
  for (const s of ['trunk', 'lumbar', 'yaw', 'head', 'sh']) if (k[s] !== undefined) o[s] = k[s];
  if (k.fp !== undefined) { o.fpL = k.fp; o.fpR = k.fp; }
  if (k.fpL !== undefined) o.fpL = k.fpL; if (k.fpR !== undefined) o.fpR = k.fpR;
  if (k.fy !== undefined) { o.fyL = k.fy; o.fyR = k.fy; }
  if (k.fyL !== undefined) o.fyL = k.fyL; if (k.fyR !== undefined) o.fyR = k.fyR;
  if (k.ep) { o.epL = k.ep.slice(); o.epR = mir(k.ep); }
  if (k.epL) o.epL = k.epL.slice(); if (k.epR) o.epR = k.epR.slice();
  if (k.kp) { o.kpL = k.kp.slice(); o.kpR = mir(k.kp); }
  if (k.kpL) o.kpL = k.kpL.slice(); if (k.kpR) o.kpR = k.kpR.slice();
  // hand / foot targets: {m: w=world | t=torso-local | s=shoulder offset | p=pelvis offset, v}
  const tgt = (sym, symMode, L, R) => {
    for (const [key, m] of sym) if (k[key]) { o[L] = { m, v: k[key].slice() }; o[R] = { m, v: mir(k[key]) }; }
    for (const [key, m] of symMode) {
      if (k[key + 'L']) o[L] = { m, v: k[key + 'L'].slice() };
      if (k[key + 'R']) o[R] = { m, v: k[key + 'R'].slice() };
    }
  };
  tgt([['h', 'w'], ['ht', 't'], ['hs', 's']], [['h', 'w'], ['ht', 't'], ['hs', 's']], 'hL', 'hR');
  tgt([['f', 'w'], ['fo', 'p']], [['f', 'w'], ['fo', 'p']], 'fL', 'fR');
  const DEF = {
    pel: [0, 0.96, 0], trunk: 0, lumbar: 0, yaw: 0, head: 0, sh: 0, fpL: 0, fpR: 0, fyL: 8, fyR: 8,
    epL: [0.3, -0.3, -1], epR: [-0.3, -0.3, -1], kpL: [0.15, 0, 1], kpR: [-0.15, 0, 1],
    hL: { m: 's', v: [0.02, -0.6, 0.04] }, hR: { m: 's', v: [-0.02, -0.6, 0.04] },
    fL: { m: 'w', v: [0.12, 0.08, 0] }, fR: { m: 'w', v: [-0.12, 0.08, 0] }
  };
  for (const f of [...SCALARS, ...VEC3, 'hL', 'hR', 'fL', 'fR']) if (o[f] === undefined) o[f] = prev ? prev[f] : DEF[f];
  return o;
}
export function compileMove(m) {
  if (m._compiled) return m;
  if (m.keys) {
    const out = []; let prev = null;
    for (const k of m.keys) { prev = normKey(k, prev); out.push(prev); }
    m._keys = out;
  }
  m._compiled = true;
  return m;
}

// monotone cubic Hermite through keys (turning points get zero speed)
function slope(p0, p1, p2, t0, t1, t2) {
  if ((p1 - p0) * (p2 - p1) <= 0) return 0;
  return (p2 - p0) / (t2 - t0);
}
function herm(p1, p2, m1, m2, dt, u) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * dt * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * dt * m2;
}
function interpScalar(vals, ts, i, u) {
  const n = vals.length;
  const a = i - 1 < 0 ? vals[n - 2] : vals[i - 1], ta = i - 1 < 0 ? ts[n - 2] - 1 : ts[i - 1];
  const b = vals[i], tb = ts[i], c = vals[i + 1], tc = ts[i + 1];
  const d = i + 2 >= n ? vals[1] : vals[i + 2], td = i + 2 >= n ? ts[1] + 1 : ts[i + 2];
  const m1 = slope(a, b, c, ta, tb, tc), m2 = slope(b, c, d, tb, tc, td);
  return herm(b, c, m1, m2, tc - tb, u);
}

// ---------- the viewer ----------
export async function createViewer(container, opts = {}) {
  await loadThree();
  const accent = new T.Color(opts.accent || '#FF7A2F');
  const W = () => Math.max(container.clientWidth, 200), H = () => Math.max(container.clientHeight, 160);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: !!opts.capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  const scene = new T.Scene();
  scene.background = new T.Color(0x1C1A17);
  scene.fog = new T.Fog(0x1C1A17, 6, 14);
  const camera = new T.PerspectiveCamera(34, W() / H(), 0.05, 50);

  scene.add(new T.HemisphereLight(0xFFF4E6, 0x2A2420, 1.6));
  const sun = new T.DirectionalLight(0xFFFFFF, 2.2);
  sun.position.set(2.5, 5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -2, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const rim = new T.DirectionalLight(0xFFB088, 0.8);
  rim.position.set(-3, 2.5, -3);
  scene.add(rim);

  const floor = new T.Mesh(new T.CircleGeometry(6, 48), new T.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new T.GridHelper(8, 16, COLORS.grid, COLORS.grid);
  grid.position.y = 0.002; scene.add(grid);

  // ----- mannequin -----
  const matBody = () => new T.MeshStandardMaterial({ color: COLORS.body, roughness: 0.62, metalness: 0.02 });
  const matJoint = new T.MeshStandardMaterial({ color: COLORS.joint, roughness: 0.7 });
  const parts = {}; // name -> mesh (highlightable)
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const cap = (r, len, mat) => shadow(new T.Mesh(new T.CapsuleGeometry(r, Math.max(len, 0.001), 6, 14), mat));
  const ell = (sx, sy, sz, mat, phiStart = 0, phiLen = Math.PI * 2) => {
    const m = shadow(new T.Mesh(new T.SphereGeometry(1, 28, 18, phiStart, phiLen), mat)); m.scale.set(sx, sy, sz); return m;
  };
  const sph = (r, mat) => shadow(new T.Mesh(new T.SphereGeometry(r, 18, 12), mat));

  const fig = new T.Group(); scene.add(fig);
  const pelvis = new T.Group(); fig.add(pelvis);
  const spine = new T.Group(); spine.rotation.order = 'XYZ'; pelvis.add(spine);
  parts.pelvis = ell(0.165, 0.11, 0.115, matBody()); parts.pelvis.position.set(0, 0.02, -0.01); pelvis.add(parts.pelvis);
  parts.abdomen = ell(0.145, 0.14, 0.105, matBody()); parts.abdomen.position.set(0, 0.16, 0.0); spine.add(parts.abdomen);
  // chest split into front (pecs) and back (lats/traps) halves
  parts.chest = ell(0.19, 0.165, 0.115, matBody(), 0, Math.PI); parts.chest.position.set(0, 0.34, 0); spine.add(parts.chest);
  parts.back = ell(0.19, 0.165, 0.115, matBody(), Math.PI, Math.PI); parts.back.position.set(0, 0.34, 0); spine.add(parts.back);
  const neck = new T.Group(); neck.position.set(0, B.torso, 0); spine.add(neck);
  const neckM = cap(0.045, 0.06, matJoint); neckM.position.y = 0.05; neck.add(neckM);
  parts.head = sph(0.105, matBody()); parts.head.scale.set(0.95, 1.08, 1); parts.head.position.y = 0.17; neck.add(parts.head);
  const visor = new T.Mesh(new T.BoxGeometry(0.13, 0.035, 0.04), new T.MeshStandardMaterial({ color: COLORS.dark, roughness: 0.4 }));
  visor.position.set(0, 0.19, 0.088); neck.add(visor);

  function limb(side) {
    const s = side === 'L' ? 1 : -1;
    const o = {};
    o.delt = sph(0.068, matBody()); spine.add(o.delt);
    o.upper = new T.Group(); spine.add(o.upper);
    const um = cap(0.047, B.upper - 0.07, matBody()); um.position.y = -B.upper / 2; o.upper.add(um);
    o.fore = new T.Group(); o.fore.position.y = -B.upper; o.upper.add(o.fore);
    const el = sph(0.042, matJoint); o.fore.add(el);
    const fm = cap(0.039, B.fore - 0.06, matBody()); fm.position.y = -B.fore / 2; o.fore.add(fm);
    const hand = sph(0.047, matBody()); hand.position.y = -B.lower; hand.scale.set(1, 1.15, 0.8); o.fore.add(hand);
    o.thigh = new T.Group(); o.thigh.position.set(s * B.hipX, 0, 0); pelvis.add(o.thigh);
    const tm = cap(0.072, B.thigh - 0.1, matBody()); tm.position.y = -B.thigh / 2; o.thigh.add(tm);
    o.shin = new T.Group(); o.shin.position.y = -B.thigh; o.thigh.add(o.shin);
    const kn = sph(0.057, matJoint); o.shin.add(kn);
    const sm = cap(0.052, B.shin - 0.09, matBody()); sm.position.y = -B.shin / 2; o.shin.add(sm);
    o.foot = new T.Group(); o.shin.add(o.foot); o.foot.position.y = -B.shin;
    const ft = shadow(new T.Mesh(new T.BoxGeometry(0.095, 0.065, 0.245), matBody()));
    ft.position.set(0, -0.045, 0.065); o.foot.add(ft);
    parts['delt' + side] = o.delt; parts['upper' + side] = um; parts['fore' + side] = fm; parts['hand' + side] = hand;
    parts['thigh' + side] = tm; parts['shin' + side] = sm; parts['foot' + side] = ft;
    return o;
  }
  const LL = limb('L'), RR = limb('R');

  // ----- equipment -----
  const equip = new T.Group(); scene.add(equip);
  const mEq = new T.MeshStandardMaterial({ color: COLORS.equip, roughness: 0.8 });
  const mEq2 = new T.MeshStandardMaterial({ color: COLORS.equip2, roughness: 0.7 });
  const mMetal = new T.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.35, metalness: 0.7 });
  const mPlate = new T.MeshStandardMaterial({ color: 0x24211E, roughness: 0.6, metalness: 0.2 });
  const mAccent = new T.MeshStandardMaterial({ color: accent, roughness: 0.55 });
  let dyn = []; // per-frame updaters

  const box = (w, h, d, mat, x, y, z, rx = 0) => {
    const m = shadow(new T.Mesh(new T.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); m.rotation.x = rx; equip.add(m); return m;
  };
  const rod = (r, len, mat) => shadow(new T.Mesh(new T.CylinderGeometry(r, r, len, 14), mat));
  const UP = new T.Vector3(0, 1, 0);
  function placeRod(m, a, b) { // stretch a unit-height cylinder between points
    const d = new T.Vector3().subVectors(b, a); const len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, Math.max(len, 0.001), 1);
    if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  function makeLine(n, color = 0x8A8275) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    const l = new T.Line(g, new T.LineBasicMaterial({ color })); equip.add(l); return l;
  }
  function setLine(l, pts) {
    const a = l.geometry.attributes.position; pts.forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z)); a.needsUpdate = true; l.geometry.computeBoundingSphere();
  }

  function buildProps(list) {
    while (equip.children.length) { const c = equip.children.pop(); c.geometry && c.geometry.dispose(); }
    dyn = [];
    for (const p of list || []) {
      const k = p.type;
      if (k === 'barbell' || k === 'ezbar' || k === 'bar') {
        const len = p.len || (k === 'barbell' ? 1.9 : k === 'ezbar' ? 1.2 : 1.25);
        const g = new T.Group(); equip.add(g);
        const r = rod(0.014, len, mMetal); r.rotation.z = Math.PI / 2; g.add(r);
        if (k !== 'bar') {
          const pr = p.plate || (k === 'barbell' ? 0.225 : 0.13), pw = k === 'barbell' ? 0.07 : 0.035;
          for (const s of [-1, 1]) {
            const pl = rod(pr, pw, mPlate); pl.rotation.z = Math.PI / 2; pl.position.x = s * (len / 2 - 0.2); g.add(pl);
            const pl2 = rod(pr * 0.8, pw * 0.8, mPlate); pl2.rotation.z = Math.PI / 2; pl2.position.x = s * (len / 2 - 0.29); if (k === 'barbell') g.add(pl2);
          }
        }
        dyn.push(c => { g.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); const d = new T.Vector3().subVectors(c.hand.L, c.hand.R); g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()); });
      } else if (k === 'dumbbells' || k === 'dumbbell1') {
        const mk = () => { const g = new T.Group(); const h = rod(0.016, 0.16, mMetal); h.rotation.z = Math.PI / 2; g.add(h);
          for (const s of [-1, 1]) { const b = rod(0.055, 0.06, mPlate); b.rotation.z = Math.PI / 2; b.position.x = s * 0.105; g.add(b); } equip.add(g); return g; };
        const axis = p.axis || 'x';
        const dir = axis === 'x' ? new T.Vector3(1, 0, 0) : axis === 'y' ? new T.Vector3(0, 1, 0) : new T.Vector3(0, 0, 1);
        if (k === 'dumbbells') {
          const a = mk(), b = mk();
          dyn.push(c => { a.position.copy(c.hand.L); b.position.copy(c.hand.R);
            for (const g of [a, b]) g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), dir); });
        } else {
          const a = mk();
          dyn.push(c => { a.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); a.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), dir); });
        }
      } else if (k === 'plate') {
        const g = rod(0.17, 0.04, mPlate); equip.add(g);
        dyn.push(c => { g.position.copy(c.hand.L).add(c.hand.R).multiplyScalar(0.5); g.rotation.set(0, 0, Math.PI / 2); });
      } else if (k === 'bench') { // flat bench along Z
        const y = p.y ?? 0.42, z0 = p.z0 ?? -0.95, z1 = p.z1 ?? 0.35, w = p.w ?? 0.3;
        box(w, 0.08, z1 - z0, mEq2, 0, y - 0.04, (z0 + z1) / 2);
        box(0.06, y - 0.08, 0.06, mEq, 0, (y - 0.08) / 2, z0 + 0.12); box(0.06, y - 0.08, 0.06, mEq, 0, (y - 0.08) / 2, z1 - 0.12);
        box(w * 0.9, 0.03, 0.06, mEq, 0, 0.015, z0 + 0.12); box(w * 0.9, 0.03, 0.06, mEq, 0, 0.015, z1 - 0.12);
      } else if (k === 'incline') { // seat + angled back pad; angle = degrees back from vertical
        const y = p.y ?? 0.42, a = (p.angle ?? 55) * DEG, len = p.len ?? 0.8, z = p.z ?? 0.05;
        box(0.32, 0.08, 0.36, mEq2, 0, y - 0.04, z + 0.12);
        const pad = box(0.3, 0.07, len, mEq2, 0, 0, 0);
        pad.rotation.x = (Math.PI / 2 - a);
        pad.position.set(0, y + Math.cos(a) * len / 2 + 0.02, z - 0.08 - Math.sin(a) * len / 2);
        box(0.06, y - 0.08, 0.06, mEq, 0, (y - 0.08) / 2, z + 0.1); box(0.06, 0.5, 0.06, mEq, 0, 0.25, z - 0.45);
      } else if (k === 'seat') {
        const y = p.y ?? 0.45, z = p.z ?? 0, d = p.d ?? 0.4;
        box(0.36, 0.08, d, mEq2, 0, y - 0.04, z); box(0.07, y - 0.08, 0.07, mEq, 0, (y - 0.08) / 2, z);
        box(0.36, 0.03, 0.4, mEq, 0, 0.015, z);
        if (p.back) { const bp = box(0.34, p.back, 0.07, mEq2, 0, y + p.back / 2 + 0.03, z - d / 2 - 0.02); bp.rotation.x = -(p.backTilt || 0) * DEG; }
        if (p.pad) box(0.42, 0.08, 0.12, mEq2, 0, p.pad[0], p.pad[1]);
      } else if (k === 'box') {
        box(p.w ?? 0.6, p.h ?? 0.45, p.d ?? 0.45, mEq2, p.x ?? 0, (p.h ?? 0.45) / 2 + (p.y ?? 0), p.z ?? 0, p.rx ?? 0);
      } else if (k === 'pullbar') {
        const y = p.y ?? 2.25, w = p.w ?? 1.5;
        const r = rod(0.016, w, mMetal); r.rotation.z = Math.PI / 2; r.position.set(0, y, p.z ?? 0); equip.add(r);
        for (const s of [-1, 1]) { const u = rod(0.03, y + 0.05, mEq); u.position.set(s * w / 2, (y + 0.05) / 2, p.z ?? 0); equip.add(u); }
      } else if (k === 'dipbars') {
        const y = p.y ?? 1.2, x = p.x ?? 0.27;
        for (const s of [-1, 1]) {
          const r = rod(0.02, 0.7, mMetal); r.rotation.x = Math.PI / 2; r.position.set(s * x, y, 0.05); equip.add(r);
          for (const zz of [-0.25, 0.35]) { const u = rod(0.025, y, mEq); u.position.set(s * x, y / 2, zz); equip.add(u); }
        }
      } else if (k === 'cable') {
        const anchor = new T.Vector3(...p.anchor);
        const tower = box(0.18, anchor.y + 0.15, 0.18, mEq, anchor.x + (p.towerDx || 0), (anchor.y + 0.15) / 2, anchor.z + (p.towerDz ?? 0.12));
        tower.castShadow = true;
        const pulley = rod(0.04, 0.03, mMetal); pulley.rotation.z = Math.PI / 2; pulley.position.copy(anchor); equip.add(pulley);
        const wire = rod(0.006, 1, new T.MeshStandardMaterial({ color: 0x8A8275 })); equip.add(wire);
        const handle = p.handle === 'bar' ? rod(0.014, p.handleLen || 0.6, mMetal) : p.handle === 'rope' ? rod(0.02, 0.22, mEq2) : rod(0.015, 0.14, mMetal);
        handle.rotation.z = Math.PI / 2; const hg = new T.Group(); hg.add(handle); equip.add(hg);
        const which = p.to || 'both';
        dyn.push(c => {
          const tp = which === 'L' ? c.hand.L.clone() : which === 'R' ? c.hand.R.clone() : c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5);
          placeRod(wire, anchor, tp); hg.position.copy(tp);
          if (which === 'both') { const d = new T.Vector3().subVectors(c.hand.L, c.hand.R); if (d.length() > 0.02) hg.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()); }
        });
      } else if (k === 'treadmill') {
        box(0.62, 0.1, 1.7, mEq, 0, 0.05, p.z ?? -0.1);
        const belt = box(0.5, 0.012, 1.6, mEq2, 0, 0.106, p.z ?? -0.1);
        for (const s of [-1, 1]) { const u = rod(0.025, 1.0, mEq); u.position.set(s * 0.3, 0.5, 0.75); u.rotation.x = -0.15; equip.add(u); }
        box(0.66, 0.06, 0.2, mEq2, 0, 1.0, 0.82);
        if (p.incline) { belt.rotation.x = 0; }
      } else if (k === 'bike') {
        const cz = p.cz ?? 0.42, cy = p.cy ?? 0.42;
        box(0.08, 0.08, 0.95, mEq, 0, 0.3, 0.1); box(0.3, 0.05, 0.5, mEq, 0, 0.03, 0.1);
        const post = rod(0.03, 0.62, mEq); post.position.set(0, 0.6, -0.12); post.rotation.x = 0.3; equip.add(post);
        box(0.2, 0.06, 0.26, mEq2, 0, p.seatY ?? 0.86, -0.17);
        const stem = rod(0.03, 0.75, mEq); stem.position.set(0, 0.72, 0.52); stem.rotation.x = -0.15; equip.add(stem);
        const hb = rod(0.018, 0.5, mMetal); hb.rotation.z = Math.PI / 2; hb.position.set(0, 1.07, 0.58); equip.add(hb);
        const fly = rod(0.2, 0.06, mPlate); fly.rotation.z = Math.PI / 2; fly.position.set(0, 0.32, 0.62); equip.add(fly);
        const crank = rod(0.012, 1, mMetal); equip.add(crank); const crank2 = rod(0.012, 1, mMetal); equip.add(crank2);
        const hub = new T.Vector3(0, cy, cz);
        dyn.push(c => { placeRod(crank, hub.clone().setX(0.1), c.foot.L.clone().setX(0.1)); placeRod(crank2, hub.clone().setX(-0.1), c.foot.R.clone().setX(-0.1)); });
      } else if (k === 'rower') {
        box(0.16, 0.06, 2.1, mEq, 0, 0.27, -0.05);
        const fw = rod(0.24, 0.12, mPlate); fw.rotation.z = Math.PI / 2; fw.position.set(0, 0.45, 1.15); equip.add(fw);
        const st = box(0.36, 0.04, 0.26, mEq2, 0, 0.3, 0.62); st.rotation.x = 0.7;
        const seatM = box(0.3, 0.06, 0.3, mEq2, 0, 0.33, 0);
        const chain = rod(0.005, 1, new T.MeshStandardMaterial({ color: 0x8A8275 })); equip.add(chain);
        const hdl = rod(0.016, 0.42, mMetal); hdl.rotation.z = Math.PI / 2; const hg = new T.Group(); hg.add(hdl); equip.add(hg);
        const out = new T.Vector3(0, 0.62, 1.05);
        dyn.push(c => { seatM.position.z = c.pel.z; const tp = c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5); hg.position.copy(tp); placeRod(chain, out, tp); });
      } else if (k === 'platform') { // leg press sled
        const pl = shadow(new T.Mesh(new T.BoxGeometry(0.62, 0.5, 0.05), mEq2)); equip.add(pl);
        const railA = rod(0.03, 1.1, mEq); railA.position.set(0.42, 0.9, 0.62); railA.rotation.x = Math.PI / 4; equip.add(railA);
        const railB = railA.clone(); railB.position.x = -0.42; equip.add(railB);
        const n = new T.Vector3(0, 0.7071, 0.7071);
        dyn.push(c => { const mid = c.foot.L.clone().add(c.foot.R).multiplyScalar(0.5); pl.position.copy(mid).addScaledVector(n, 0.05); pl.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), n.clone().negate()); });
      } else if (k === 'roller') {
        const r = rod(0.06, 0.4, mEq2); r.rotation.z = Math.PI / 2; equip.add(r);
        dyn.push(c => { r.position.copy(c.foot.L).add(c.foot.R).multiplyScalar(0.5); r.position.z -= 0.08; r.position.y += 0.02; });
      } else if (k === 'kneepads') {
        for (const s of [-1, 1]) box(0.12, 0.25, 0.1, mEq2, s * 0.22, p.y ?? 0.62, p.z ?? 0.45);
      } else if (k === 'mat') {
        box(0.65, 0.012, 1.85, new T.MeshStandardMaterial({ color: 0x3B302A, roughness: 0.95 }), 0, 0.006, p.z ?? 0);
      } else if (k === 'wheel') {
        const w = rod(0.1, 0.06, mPlate); w.rotation.z = Math.PI / 2; equip.add(w);
        const ax = rod(0.012, 0.32, mMetal); ax.rotation.z = Math.PI / 2; equip.add(ax);
        dyn.push(c => { const m = c.hand.L.clone().add(c.hand.R).multiplyScalar(0.5); w.position.copy(m).setY(0.1); ax.position.copy(m).setY(0.1); });
      } else if (k === 'jumprope') {
        const l = makeLine(33);
        dyn.push(c => {
          const a = c.hand.L, b = c.hand.R, mid = a.clone().add(b).multiplyScalar(0.5); const ang = (c.t - 0.25) * Math.PI * 2 * (p.turns || 2);
          const pts = [];
          for (let i = 0; i <= 32; i++) {
            const s = i / 32, x = a.x + (b.x - a.x) * s; const bow = Math.sin(s * Math.PI);
            const rr = 1.05 * bow; pts.push(new T.Vector3(x, mid.y + (a.y - mid.y) * (1 - bow) - Math.cos(ang) * rr + rr * 0.0, mid.z + Math.sin(ang) * rr));
          }
          // keep the rope off the floor
          pts.forEach(q => { q.y = Math.max(q.y, 0.01); }); setLine(l, pts);
        });
      } else if (k === 'ropes') {
        const l1 = makeLine(25, 0xB8A27A), l2 = makeLine(25, 0xB8A27A); const anc = p.anchor || [0, 0.25, 2.6];
        box(0.3, 0.5, 0.3, mEq, 0, 0.25, anc[2] + 0.1);
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
        const base = shadow(new T.Mesh(new T.BoxGeometry(0.6, 0.1, 0.7), mEq)); base.position.y = 0.05; g.add(base);
        for (const s of [-1, 1]) { const post = rod(0.025, 1, mMetal); post.position.set(s * 0.24, 0.5, -0.25); post.rotation.x = -0.35; g.add(post); }
        dyn.push(c => { g.position.set(0, 0, (c.hand.L.z + c.hand.R.z) / 2 + 0.55); });
      } else if (k === 'handles') { // leg press / machine side handles
        for (const s of [-1, 1]) box(0.04, 0.04, 0.2, mMetal, s * (p.x ?? 0.3), p.y ?? 0.45, p.z ?? 0.05);
      }
    }
  }

  // ----- IK helpers -----
  const V = () => new T.Vector3();
  const DOWN = new T.Vector3(0, -1, 0);
  const qTmp = new T.Quaternion(), qParent = new T.Quaternion();
  function solve2(A, Tg, a, b, pole) {
    const d = V().subVectors(Tg, A); let dist = d.length();
    const dir = dist > 1e-6 ? d.clone().divideScalar(dist) : new T.Vector3(0, -1, 0);
    dist = Math.min(Math.max(dist, Math.abs(a - b) + 1e-3), a + b - 1e-4);
    const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    let pp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (pp.lengthSq() < 1e-8) pp = new T.Vector3(0, 0, 1).addScaledVector(dir, -dir.z);
    pp.normalize();
    const E = A.clone().addScaledVector(dir, a * cosA).addScaledVector(pp, a * sinA);
    const End = A.clone().addScaledVector(dir, dist);
    return { E, End };
  }
  function setBoneWorldDir(bone, dirWorld) {
    bone.parent.getWorldQuaternion(qParent);
    qTmp.setFromUnitVectors(DOWN, dirWorld.clone().normalize());
    bone.quaternion.copy(qParent.invert().multiply(qTmp));
    bone.updateMatrixWorld(true);
  }

  // ----- pose application -----
  let move = null, tNow = 0, playing = true, speed = 1, lastTs = null, raf = 0, phaseCb = null, lastPhase = -1;
  const cur = { hand: { L: V(), R: V() }, foot: { L: V(), R: V() }, pel: V(), t: 0 };

  function resolveTarget(spec, side) {
    const v = new T.Vector3(...spec.v);
    if (spec.m === 'w') return v;
    if (spec.m === 't') return spine.localToWorld(v);
    if (spec.m === 's') { const s = side === 'L' ? 1 : -1; return spine.localToWorld(new T.Vector3(s * B.shX, B.shY + cur.sh, 0)).add(v); }
    if (spec.m === 'p') return pelvis.getWorldPosition(V()).add(v);
    return v;
  }

  function sample(t) {
    if (move.fn) return normKey(move.fn(t), null);
    const K = move._keys, ts = K.map(k => k.t);
    let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++;
    const span = K[i + 1].t - K[i].t; const u = span > 0 ? Math.min(1, Math.max(0, (t - K[i].t) / span)) : 0;
    const out = { _i: i, _u: u };
    for (const f of SCALARS) out[f] = interpScalar(K.map(k => k[f]), ts, i, u);
    for (const f of VEC3) out[f] = [0, 1, 2].map(j => interpScalar(K.map(k => k[f][j]), ts, i, u));
    return out;
  }

  function applyPose(t) {
    if (!move) return;
    const P = sample(t);
    cur.t = t; cur.sh = P.sh || 0;
    pelvis.position.set(...P.pel);
    pelvis.rotation.set((P.trunk || 0) * DEG, 0, 0);
    spine.rotation.set((P.lumbar || 0) * DEG, (P.yaw || 0) * DEG, 0);
    neck.rotation.set((P.head || 0) * DEG, 0, 0);
    fig.updateMatrixWorld(true);
    cur.pel.copy(pelvis.position);

    // targets: keyframed moves interpolate resolved world points
    const tgt = (field, side) => {
      if (move.fn) return resolveTarget(P[field], side);
      const K = move._keys, ts = K.map(k => k.t), i = P._i, u = P._u, n = K.length;
      const idx = [i - 1 < 0 ? n - 2 : i - 1, i, i + 1, i + 2 >= n ? 1 : i + 2];
      const pts = idx.map(j => resolveTarget(K[j][field], side));
      const tt = [i - 1 < 0 ? ts[n - 2] - 1 : ts[i - 1], ts[i], ts[i + 1], i + 2 >= n ? ts[1] + 1 : ts[i + 2]];
      const o = new T.Vector3();
      for (const ax of ['x', 'y', 'z']) {
        const a = pts[0][ax], b = pts[1][ax], c = pts[2][ax], d = pts[3][ax];
        o[ax] = herm(b, c, slope(a, b, c, tt[0], tt[1], tt[2]), slope(b, c, d, tt[1], tt[2], tt[3]), tt[2] - tt[1], u);
      }
      return o;
    };

    for (const [S, side, s] of [[LL, 'L', 1], [RR, 'R', -1]]) {
      // shoulder
      const shLocal = new T.Vector3(s * B.shX, B.shY + cur.sh, 0);
      S.delt.position.copy(shLocal); S.upper.position.copy(shLocal);
      S.upper.updateMatrixWorld(true);
      const shW = spine.localToWorld(shLocal.clone());
      const hT = tgt('h' + side, side);
      const pole = new T.Vector3(...P['ep' + side]);
      const arm = solve2(shW, hT, B.upper, B.lower, pole);
      setBoneWorldDir(S.upper, V().subVectors(arm.E, shW));
      setBoneWorldDir(S.fore, V().subVectors(arm.End, arm.E));
      cur.hand[side].copy(arm.End);
      // hip/leg
      const hipW = pelvis.localToWorld(new T.Vector3(s * B.hipX, 0, 0));
      const fT = tgt('f' + side, side);
      const kpole = new T.Vector3(...P['kp' + side]);
      const leg = solve2(hipW, fT, B.thigh, B.shin, kpole);
      setBoneWorldDir(S.thigh, V().subVectors(leg.E, hipW));
      setBoneWorldDir(S.shin, V().subVectors(leg.End, leg.E));
      cur.foot[side].copy(leg.End);
      // foot: world yaw (toes out) + pitch (toes down)
      const fy = (P['fy' + side] || 0) * DEG * s, fp = (P['fp' + side] || 0) * DEG;
      const qW = new T.Quaternion().setFromEuler(new T.Euler(fp, fy, 0, 'YXZ'));
      S.shin.getWorldQuaternion(qParent);
      S.foot.quaternion.copy(qParent.invert().multiply(qW));
    }
    fig.updateMatrixWorld(true);
    for (const f of dyn) f(cur);

    if (phaseCb && move.phases) {
      let pi = move.phases.findIndex(p => t >= p.at[0] && t < p.at[1]);
      if (pi < 0) pi = move.phases.length - 1;
      if (pi !== lastPhase) { lastPhase = pi; phaseCb(pi, move.phases[pi]); }
    }
  }

  // ----- highlight -----
  const baseCol = new T.Color(COLORS.body);
  function setHighlight(names) {
    const set = new Set(names || []);
    for (const [n, m] of Object.entries(parts)) {
      const on = set.has(n) || set.has(n.replace(/[LR]$/, ''));
      m.material.color.copy(on ? accent : baseCol);
      m.material.emissive = on ? accent.clone().multiplyScalar(0.18) : new T.Color(0);
    }
  }

  // ----- camera orbit -----
  const cam = { theta: 1.2, phi: 0.22, dist: 3.4, target: new T.Vector3(0, 0.9, 0), tTheta: 1.2, tPhi: 0.22 };
  const VIEWS = { front: 0.18, side: Math.PI / 2, q: 0.75, back: Math.PI - 0.3, sideR: -Math.PI / 2 };
  function setView(name) { if (VIEWS[name] !== undefined) { cam.tTheta = VIEWS[name]; cam.tPhi = move?.cam?.phi ?? 0.22; } }
  function placeCam() {
    cam.theta += (cam.tTheta - cam.theta) * 0.12; cam.phi += (cam.tPhi - cam.phi) * 0.12;
    const c = Math.cos(cam.phi);
    camera.position.set(cam.target.x + cam.dist * Math.sin(cam.theta) * c, cam.target.y + cam.dist * Math.sin(cam.phi), cam.target.z + cam.dist * Math.cos(cam.theta) * c);
    camera.lookAt(cam.target);
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
    if (lastTs != null && playing && move) tNow = (tNow + ((ts - lastTs) / 1000) * speed / (move.period || 3.5)) % 1;
    lastTs = ts;
    if (move) applyPose(tNow);
    placeCam();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); });
  ro.observe(container);

  const api = {
    setMove(id, highlight) {
      const m = MOVES[id] || MOVES.squat_bb; move = compileMove(m);
      buildProps(m.props); tNow = 0; lastPhase = -1;
      const c = m.cam || {};
      cam.target.set(...(c.target || [0, 0.9, 0])); cam.dist = c.dist || 3.4; cam.tPhi = cam.phi = c.phi ?? 0.22;
      cam.tTheta = cam.theta = VIEWS[c.view || 'q'];
      setHighlight(highlight);
      applyPose(0);
    },
    play() { playing = true; }, pause() { playing = false; }, toggle() { playing = !playing; return playing; },
    isPlaying: () => playing,
    setSpeed(s) { speed = s; }, setView,
    setT(t) { tNow = ((t % 1) + 1) % 1; applyPose(tNow); placeCam(); renderer.render(scene, camera); },
    getT: () => tNow,
    onPhase(cb) { phaseCb = cb; lastPhase = -1; },
    setHighlight,
    snap(t, view) { if (view) { cam.theta = cam.tTheta = VIEWS[view]; } tNow = t; applyPose(t); cam.phi = cam.tPhi; camera.position.set(0, 0, 0); placeCam(); placeCam(); renderer.render(scene, camera); },
    dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); scene.traverse(o => { o.geometry && o.geometry.dispose(); }); el.remove(); }
  };
  return api;
}
