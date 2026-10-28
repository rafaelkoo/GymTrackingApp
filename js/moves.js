// Movement library for the 3D viewer.
// Coordinates in metres: x = figure's left, y = up, z = the way the figure faces.
// pel = pelvis [y,z]; trunk = torso lean in degrees (forward +, lying on back -90, face down +90).
// h/hL/hR = hand target (world), ht = torso-local, hs = offset from the shoulder.
// f/fL/fR = ankle target (world), fo = offset from the pelvis. ep/kp = elbow/knee pointing direction.
// Every move loops: the last key equals the first.

const P = (at, zh, en, czh, cen) => ({ at, zh, en, czh, cen });
const M = (zh, en) => ({ zh, en });

// straight body from shoulders to ankles (push-up / plank family)
function line(shY, shZ, ankY = 0.13) {
  const L = 0.48 + 0.875;
  const a = Math.asin(Math.max(-1, Math.min(1, (shY - ankY) / L)));
  const trunk = 90 - a * 180 / Math.PI, r = trunk * Math.PI / 180;
  const pz = shZ - 0.48 * Math.sin(r), py = shY - 0.48 * Math.cos(r);
  return { pel: [py, pz], trunk, f: [0.12, py - 0.875 * Math.cos(r), pz - 0.875 * Math.sin(r)] };
}
const loop = keys => [...keys, { ...keys[0], t: 1 }];
const STAND = { pel: [0.96, 0], trunk: 0, f: [0.13, 0.08, 0], fy: 8 };

export const MOVES = {
  // ───────────── LEGS ─────────────
  squat_bb: {
    period: 3.8, cam: { view: 'q', target: [0, 0.85, 0], dist: 3.3 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.95, 0], trunk: 6, ht: [0.42, 0.45, -0.12], ep: [0.6, -1, -0.7], f: [0.17, 0.08, 0], fy: 18, kp: [0.45, 0, 1] },
      { t: 0.12, pel: [0.95, 0], trunk: 6 },
      { t: 0.47, pel: [0.50, -0.22], trunk: 42 },
      { t: 0.57, pel: [0.50, -0.22], trunk: 42 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '槓放喺上斜方肌，深吸一啖氣收緊核心', 'Bar on your upper traps, big breath, brace your core'),
      P([0.12, 0.47], '下蹲', 'Descent', '臀部向後向下坐，膝蓋跟住腳尖方向', 'Sit hips back and down, knees track over your toes'),
      P([0.47, 0.57], '谷底', 'Bottom', '大腿最少平行地面，背部保持平直', 'Thighs at least parallel, back stays flat'),
      P([0.57, 1], '發力', 'Drive up', '成隻腳掌發力，臀同膝一齊伸直', 'Drive through the whole foot, hips and knees together')
    ],
    mistakes: [M('膝蓋向內夾', 'Knees caving inward'), M('腳踭離地', 'Heels lifting off the floor'), M('落到底時下背圓咗', 'Lower back rounding at the bottom')]
  },
  squat_goblet: {
    period: 3.6, cam: { view: 'q', target: [0, 0.8, 0], dist: 3.2 },
    props: [{ type: 'dumbbell1', axis: 'y' }],
    keys: loop([
      { t: 0, pel: [0.95, 0], trunk: 4, ht: [0.06, 0.30, 0.21], ep: [0.25, -1, 0.3], f: [0.18, 0.08, 0], fy: 20, kp: [0.5, 0, 1] },
      { t: 0.12, pel: [0.95, 0], trunk: 4 },
      { t: 0.47, pel: [0.43, -0.12], trunk: 26 },
      { t: 0.57, pel: [0.43, -0.12], trunk: 26 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '啞鈴貼住心口，手肘向下', 'Hold the dumbbell against your chest, elbows down'),
      P([0.12, 0.47], '下蹲', 'Descent', '上身保持挺直，坐落兩腿之間', 'Keep your chest up and sit between your legs'),
      P([0.47, 0.57], '谷底', 'Bottom', '手肘喺膝蓋內側，膝蓋向外推', 'Elbows inside the knees, push the knees out'),
      P([0.57, 1], '發力', 'Drive up', '腳踭發力企返直', 'Drive through your heels to stand')
    ],
    mistakes: [M('上身向前跌', 'Chest falling forward'), M('膝蓋內夾', 'Knees caving in')]
  },
  deadlift: {
    period: 4.2, cam: { view: 'q', target: [0, 0.75, 0], dist: 3.2 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.60, -0.33], trunk: 60, h: [0.24, 0.235, 0.06], ep: [0.2, 0, -1], f: [0.13, 0.08, 0], fy: 6, kp: [0.2, 0, 1] },
      { t: 0.12, pel: [0.60, -0.33], trunk: 60 },
      { t: 0.36, pel: [0.80, -0.21], trunk: 38, h: [0.24, 0.55, 0.08] },
      { t: 0.55, pel: [0.96, 0], trunk: -1, h: [0.24, 0.81, 0.11] },
      { t: 0.66, pel: [0.96, 0], trunk: -1, h: [0.24, 0.81, 0.11] },
      { t: 0.84, pel: [0.80, -0.21], trunk: 38, h: [0.24, 0.55, 0.08] }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '槓喺腳掌中間、貼住脛骨，背打平', 'Bar over mid-foot against your shins, flat back'),
      P([0.12, 0.55], '拉起', 'Pull', '用腳推地，槓貼住腿向上', 'Push the floor away, keep the bar against your legs'),
      P([0.55, 0.66], '鎖定', 'Lockout', '夾臀企直，唔好向後彎', 'Squeeze glutes to stand tall, no leaning back'),
      P([0.66, 1], '放落', 'Lower', '臀部先向後，槓沿住腿落返去', 'Hips back first, slide the bar down your legs')
    ],
    mistakes: [M('圓背拉', 'Rounding the back'), M('槓離開身體', 'Bar drifting away from the legs'), M('臀部比槓升得快', 'Hips shooting up before the bar moves')]
  },
  rdl: {
    period: 4, cam: { view: 'q', target: [0, 0.8, 0], dist: 3.2 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.22, 0.82, 0.10], ep: [0.2, 0, -1], kp: [0.1, 0, 1] },
      { t: 0.1, pel: [0.96, 0], trunk: 0 },
      { t: 0.5, pel: [0.88, -0.30], trunk: 72, h: [0.22, 0.42, 0.10] },
      { t: 0.6, pel: [0.88, -0.30], trunk: 72, h: [0.22, 0.42, 0.10] }
    ]),
    phases: [
      P([0, 0.1], '企直', 'Start tall', '膝蓋微曲，肩胛向後收', 'Soft knees, shoulders pulled back'),
      P([0.1, 0.5], '屈髖', 'Hinge', '臀部向後推，槓貼住大腿落', 'Push your hips back, bar slides down the thighs'),
      P([0.5, 0.6], '拉伸', 'Stretch', '感到大腿後側拉緊就停', 'Stop when you feel the hamstrings stretch'),
      P([0.6, 1], '夾臀企返', 'Stand up', '臀部向前推，夾緊臀肌', 'Drive hips forward and squeeze your glutes')
    ],
    mistakes: [M('彎膝變咗深蹲', 'Bending the knees into a squat'), M('落太低圓背', 'Going too low and rounding the back')]
  },
  good_morning: {
    period: 4, cam: { view: 'q', target: [0, 0.85, 0], dist: 3.2 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { ...STAND, t: 0, ht: [0.42, 0.45, -0.12], ep: [0.6, -1, -0.7], kp: [0.1, 0, 1] },
      { t: 0.1, pel: [0.96, 0], trunk: 0 },
      { t: 0.5, pel: [0.89, -0.26], trunk: 75 },
      { t: 0.6, pel: [0.89, -0.26], trunk: 75 }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '槓放上背，膝蓋微曲', 'Bar on the upper back, soft knees'),
      P([0.1, 0.5], '屈髖', 'Hinge', '背打直，臀部向後', 'Flat back, hips travel back'),
      P([0.5, 0.6], '最低點', 'Bottom', '上身接近平行地面', 'Torso close to parallel'),
      P([0.6, 1], '企返', 'Stand up', '臀部發力帶上身返嚟', 'Glutes bring the torso back up')
    ],
    mistakes: [M('圓背', 'Rounding the back'), M('膝蓋鎖死', 'Locked knees')]
  },
  sumo_dl: {
    period: 4.2, cam: { view: 'q', target: [0, 0.75, 0], dist: 3.4 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.52, -0.20], trunk: 44, h: [0.15, 0.235, 0.06], f: [0.36, 0.08, 0], fy: 38, kp: [1, 0, 0.9], ep: [0, 0, -1] },
      { t: 0.12, pel: [0.52, -0.20], trunk: 44 },
      { t: 0.55, pel: [0.90, 0], trunk: -1, h: [0.15, 0.80, 0.11] },
      { t: 0.66, pel: [0.90, 0], trunk: -1, h: [0.15, 0.80, 0.11] }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '企闊、腳尖向外，手握喺兩腳之間', 'Wide stance, toes out, hands inside your legs'),
      P([0.12, 0.55], '拉起', 'Pull', '膝蓋向外推，胸口挺起', 'Push your knees out, chest up'),
      P([0.55, 0.66], '鎖定', 'Lockout', '夾臀企直', 'Squeeze glutes to finish'),
      P([0.66, 1], '放落', 'Lower', '控制住落返地', 'Lower with control')
    ],
    mistakes: [M('膝蓋向內塌', 'Knees collapsing in'), M('臀部先升', 'Hips rising first')]
  },
  lunge: {
    period: 3.6, cam: { view: 'side', target: [0, 0.75, 0], dist: 3.3 },
    props: [{ type: 'dumbbells', axis: 'z' }],
    keys: loop([
      { t: 0, pel: [0.84, -0.03], trunk: 3, fL: [0.12, 0.08, 0.40], fR: [-0.12, 0.14, -0.45], fpL: 0, fpR: 50, fy: 4, kpL: [0.1, 0, 1], kpR: [0, -0.4, 1], hs: [0.02, -0.6, 0.0] },
      { t: 0.12, pel: [0.84, -0.03] },
      { t: 0.47, pel: [0.50, -0.03], trunk: 6 },
      { t: 0.57, pel: [0.50, -0.03], trunk: 6 }
    ]),
    phases: [
      P([0, 0.12], '前後腳企好', 'Split stance', '前後腳距離約一步半', 'Feet about a stride and a half apart'),
      P([0.12, 0.47], '落', 'Lower', '垂直向下沉，唔好向前衝', 'Drop straight down, don\'t lunge forward'),
      P([0.47, 0.57], '最低點', 'Bottom', '後膝接近地面，前膝喺腳踝上', 'Back knee near the floor, front knee over the ankle'),
      P([0.57, 1], '推起', 'Drive up', '前腳腳踭發力', 'Push through the front heel')
    ],
    mistakes: [M('前膝衝過腳尖太多', 'Front knee shooting far past the toes'), M('上身向前傾', 'Leaning the torso forward')]
  },
  bulgarian: {
    period: 3.8, cam: { view: 'side', target: [0, 0.75, -0.1], dist: 3.4 },
    props: [{ type: 'bench', y: 0.45, z0: -0.95, z1: -0.45 }, { type: 'dumbbells', axis: 'z' }],
    keys: loop([
      { t: 0, pel: [0.85, -0.08], trunk: 6, fL: [0.12, 0.08, 0.32], fR: [-0.12, 0.55, -0.64], fpR: 75, fy: 4, kpL: [0.1, 0, 1], kpR: [0, -0.6, 1], hs: [0.02, -0.6, 0.0] },
      { t: 0.12, pel: [0.85, -0.08] },
      { t: 0.47, pel: [0.52, -0.10], trunk: 12 },
      { t: 0.57, pel: [0.52, -0.10], trunk: 12 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '後腳腳背放喺凳上', 'Rest the top of your back foot on the bench'),
      P([0.12, 0.47], '落', 'Lower', '前腳承重，垂直向下', 'Weight on the front leg, sink straight down'),
      P([0.47, 0.57], '最低點', 'Bottom', '前大腿接近平行', 'Front thigh near parallel'),
      P([0.57, 1], '推起', 'Drive up', '前腳腳踭推地', 'Drive through the front heel')
    ],
    mistakes: [M('用後腳出力', 'Pushing with the back leg'), M('前腳企得太近凳', 'Front foot too close to the bench')]
  },
  step_up: {
    period: 4, cam: { view: 'side', target: [0, 1.15, 0.2], dist: 4.1 },
    props: [{ type: 'box', w: 0.6, h: 0.42, d: 0.42, z: 0.4 }, { type: 'dumbbells', axis: 'z' }],
    keys: loop([
      { t: 0, pel: [0.84, 0.0], trunk: 14, fL: [0.12, 0.50, 0.38], fR: [-0.12, 0.08, -0.06], fpR: 10, fy: 4, kp: [0.1, 0, 1], hs: [0.02, -0.6, 0.02] },
      { t: 0.1, pel: [0.84, 0.0], trunk: 14 },
      { t: 0.3, pel: [1.16, 0.25], trunk: 10, fR: [-0.12, 0.30, 0.12], fpR: 30 },
      { t: 0.45, pel: [1.38, 0.36], trunk: 2, fR: [-0.12, 0.50, 0.38], fpR: 0 },
      { t: 0.55, pel: [1.38, 0.36], trunk: 2, fR: [-0.12, 0.50, 0.38], fpR: 0 },
      { t: 0.75, pel: [1.10, 0.20], trunk: 10, fR: [-0.12, 0.22, 0.05], fpR: 25 },
      { t: 0.9, pel: [0.84, 0.0], trunk: 14, fR: [-0.12, 0.08, -0.06], fpR: 10 }
    ]),
    phases: [
      P([0, 0.1], '一腳上箱', 'Foot on box', '成隻腳放晒上箱', 'Whole foot on the box'),
      P([0.1, 0.45], '踏上', 'Step up', '用上面隻腳發力，唔好用後腳彈', 'Drive with the top leg, don\'t bounce off the back foot'),
      P([0.45, 0.55], '企直', 'Stand tall', '喺箱上企直', 'Stand tall on the box'),
      P([0.55, 1], '慢慢落', 'Step down', '控制住落返去', 'Lower with control')
    ],
    mistakes: [M('後腳蹬地借力', 'Pushing off the back foot'), M('膝蓋向內', 'Knee caving in')]
  },
  leg_press: {
    period: 3.6, cam: { view: 'side', target: [0, 0.7, 0.25], dist: 3.2 },
    props: [{ type: 'incline', y: 0.42, angle: 50, z: 0.05, len: 0.75 }, { type: 'platform' }, { type: 'handles', x: 0.3, y: 0.45, z: 0.05 }],
    keys: loop([
      { t: 0, pel: [0.50, 0.02], trunk: -50, head: 18, f: [0.15, 1.00, 0.64], fp: -50, kp: [0.5, 1, 0.3], ht: [0.30, 0.04, 0.06], ep: [1, -0.2, 0] },
      { t: 0.12, pel: [0.50, 0.02], trunk: -50 },
      { t: 0.47, pel: [0.50, 0.02], trunk: -50, f: [0.15, 0.80, 0.40] },
      { t: 0.57, pel: [0.50, 0.02], trunk: -50, f: [0.15, 0.80, 0.40] }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '腳與肩同寬，背貼實靠墊', 'Feet shoulder-width, back flat on the pad'),
      P([0.12, 0.47], '落', 'Lower', '慢慢屈膝到約 90 度', 'Bend the knees slowly to about 90°'),
      P([0.47, 0.57], '最低點', 'Bottom', '臀部唔好離開座位', 'Keep your hips on the seat'),
      P([0.57, 1], '推', 'Press', '腳踭推，膝蓋唔好鎖死', 'Press through heels, don\'t lock the knees')
    ],
    mistakes: [M('膝蓋鎖死', 'Locking the knees out'), M('落太深臀部離座', 'Going so deep the hips lift off')]
  },
  leg_curl: {
    period: 3.4, cam: { view: 'side', target: [0, 0.7, -0.1], dist: 3.2 },
    props: [{ type: 'bench', y: 0.55, z0: -0.62, z1: 0.75, w: 0.34 }, { type: 'roller' }],
    keys: loop([
      { t: 0, pel: [0.66, -0.02], trunk: 90, head: -25, h: [0.24, 0.55, 0.62], ep: [0.3, -1, 0], f: [0.1, 0.64, -0.85], fp: 60, kp: [0, -1, 0] },
      { t: 0.1, f: [0.1, 0.64, -0.85] },
      { t: 0.42, f: [0.1, 1.04, -0.50] },
      { t: 0.52, f: [0.1, 1.04, -0.50] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '膝蓋啱啱喺凳邊外，墊壓喺腳踝上', 'Knees just off the pad edge, roller above the ankles'),
      P([0.1, 0.42], '彎', 'Curl', '用大腿後側將腳拉向臀部', 'Pull your heels toward your glutes with the hamstrings'),
      P([0.42, 0.52], '頂部', 'Top', '停一停，夾緊', 'Pause and squeeze'),
      P([0.52, 1], '放', 'Lower', '慢慢放，唔好跌落', 'Lower slowly, don\'t let it drop')
    ],
    mistakes: [M('臀部抬起', 'Hips lifting off the pad'), M('放得太快', 'Dropping the weight')]
  },
  calf: {
    period: 2.8, cam: { view: 'side', target: [0, 0.7, 0], dist: 3 },
    props: [],
    keys: loop([
      { ...STAND, t: 0, f: [0.12, 0.08, 0], fp: 0, hs: [0.02, -0.6, 0.04] },
      { t: 0.12, pel: [0.96, 0], f: [0.12, 0.08, 0], fp: 0 },
      { t: 0.42, pel: [1.05, 0.01], f: [0.12, 0.17, 0.0], fp: 38 },
      { t: 0.55, pel: [1.05, 0.01], f: [0.12, 0.17, 0.0], fp: 38 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '腳掌前半著地，腳踭放到最低', 'Balls of the feet planted, heels all the way down'),
      P([0.12, 0.42], '踮', 'Rise', '用小腿將腳踭推到最高', 'Push the heels as high as you can'),
      P([0.42, 0.55], '頂部', 'Top', '停一秒夾緊小腿', 'Hold one second and squeeze'),
      P([0.55, 1], '放', 'Lower', '慢慢放到最低，拉伸小腿', 'Lower slowly into a full stretch')
    ],
    mistakes: [M('彈上彈落', 'Bouncing'), M('幅度太細', 'Half reps')]
  },
  hip_thrust: {
    period: 3.4, cam: { view: 'q', target: [0, 0.45, 0], dist: 3 },
    props: [{ type: 'bench', y: 0.42, z0: -0.95, z1: -0.40 }, { type: 'barbell', len: 1.7, plate: 0.2 }],
    keys: loop([
      { t: 0, pel: [0.30, 0.03], trunk: -58, head: 25, f: [0.18, 0.08, 0.46], kp: [0.35, 0.4, 1], ht: [0.34, 0.0, 0.15], ep: [0.6, 1, 0.2] },
      { t: 0.12, pel: [0.30, 0.03], trunk: -58 },
      { t: 0.42, pel: [0.61, 0.0], trunk: -88, head: 45 },
      { t: 0.54, pel: [0.61, 0.0], trunk: -88, head: 45 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '上背靠凳邊，槓放喺盆骨上', 'Upper back on the bench edge, bar over your hips'),
      P([0.12, 0.42], '推', 'Thrust', '腳踭發力，臀部向上推', 'Drive through the heels, push the hips up'),
      P([0.42, 0.54], '頂部', 'Top', '膝蓋 90 度，夾緊臀肌，下巴微收', 'Knees at 90°, squeeze glutes, chin tucked'),
      P([0.54, 1], '放', 'Lower', '控制住落返去', 'Lower with control')
    ],
    mistakes: [M('用下背頂起', 'Arching the lower back to finish'), M('腳放得太遠', 'Feet too far forward')]
  },
  adductor: {
    period: 3.2, cam: { view: 'front', target: [0, 0.65, 0], dist: 3 },
    props: [{ type: 'seat', y: 0.45, z: 0, back: 0.65, backTilt: 8 }],
    keys: loop([
      { t: 0, pel: [0.55, 0], trunk: -8, f: [0.46, 0.22, 0.40], fy: 10, kp: [1, 0.8, 0.5], ht: [0.30, 0.04, 0.06], ep: [1, -0.2, 0] },
      { t: 0.12, f: [0.46, 0.22, 0.40] },
      { t: 0.45, f: [0.13, 0.22, 0.42], kp: [0.25, 0.5, 1] },
      { t: 0.56, f: [0.13, 0.22, 0.42], kp: [0.25, 0.5, 1] }
    ]),
    phases: [
      P([0, 0.12], '張開', 'Open', '背貼靠墊，雙腳張開', 'Back on the pad, legs open'),
      P([0.12, 0.45], '夾', 'Squeeze', '用大腿內側夾埋', 'Bring the legs together with your inner thighs'),
      P([0.45, 0.56], '停', 'Hold', '停一秒', 'Hold one second'),
      P([0.56, 1], '慢放', 'Release', '控制住張返開', 'Open back up with control')
    ],
    mistakes: [M('用衝力彈', 'Using momentum'), M('上身向前傾', 'Leaning forward')]
  },

  // ───────────── CHEST ─────────────
  bench: {
    period: 3.8, cam: { view: 'q', target: [0, 0.7, -0.15], dist: 3.1, phi: 0.3 },
    props: [{ type: 'bench' }, { type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.55, 0.12], trunk: -90, f: [0.28, 0.08, 0.52], kp: [0.5, 1, 0.4], h: [0.30, 1.15, -0.30], ep: [1, -0.6, 0.3] },
      { t: 0.1, h: [0.30, 1.15, -0.30] },
      { t: 0.45, h: [0.30, 0.71, -0.21] },
      { t: 0.53, h: [0.30, 0.71, -0.21] },
      { t: 0.8, h: [0.30, 1.15, -0.30] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '肩胛向後向下收，腳踩實地', 'Pull shoulder blades back and down, feet planted'),
      P([0.1, 0.45], '落槓', 'Lower', '控制住落到下胸', 'Lower under control to your lower chest'),
      P([0.45, 0.53], '觸胸', 'Touch', '輕輕掂胸，手肘約 45–70 度', 'Light touch, elbows about 45–70° from the body'),
      P([0.53, 1], '推起', 'Press', '向上同少少向後推', 'Press up and slightly back')
    ],
    mistakes: [M('手肘打到 90 度', 'Elbows flared to 90°'), M('槓喺胸口彈', 'Bouncing the bar off the chest'), M('臀部離凳', 'Hips lifting off the bench')]
  },
  bench_close: {
    period: 3.8, cam: { view: 'q', target: [0, 0.7, -0.15], dist: 3.1, phi: 0.3 },
    props: [{ type: 'bench' }, { type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.55, 0.12], trunk: -90, f: [0.28, 0.08, 0.52], kp: [0.5, 1, 0.4], h: [0.15, 1.15, -0.28], ep: [0.4, -1, 0.5] },
      { t: 0.1, h: [0.15, 1.15, -0.28] },
      { t: 0.45, h: [0.15, 0.71, -0.16] },
      { t: 0.53, h: [0.15, 0.71, -0.16] },
      { t: 0.8, h: [0.15, 1.15, -0.28] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '握距與肩同寬', 'Grip about shoulder-width'),
      P([0.1, 0.45], '落槓', 'Lower', '手肘貼近身體落到下胸', 'Elbows close to your sides, lower to the lower chest'),
      P([0.45, 0.53], '觸胸', 'Touch', '輕觸', 'Light touch'),
      P([0.53, 1], '推起', 'Press', '用三頭肌推直', 'Lock out with your triceps')
    ],
    mistakes: [M('握得太窄傷手腕', 'Grip so narrow it hurts the wrists'), M('手肘向外張', 'Elbows flaring out')]
  },
  incline_press: {
    period: 3.8, cam: { view: 'side', target: [0, 0.95, -0.1], dist: 3.2, phi: 0.25 },
    props: [{ type: 'incline', y: 0.45, angle: 55, z: 0.12 }, { type: 'dumbbells', axis: 'x' }],
    keys: loop([
      { t: 0, pel: [0.55, 0.15], trunk: -55, f: [0.26, 0.08, 0.58], kp: [0.5, 0.6, 1], h: [0.17, 1.42, -0.17], ep: [1, -0.5, 0.2] },
      { t: 0.1, h: [0.17, 1.42, -0.17] },
      { t: 0.45, ht: [0.38, 0.40, 0.10] },
      { t: 0.53, ht: [0.38, 0.40, 0.10] },
      { t: 0.8, h: [0.17, 1.42, -0.17] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '斜板 30–45 度，肩胛收緊', 'Bench at 30–45°, shoulder blades pinned'),
      P([0.1, 0.45], '落', 'Lower', '啞鈴落到上胸兩側', 'Lower the dumbbells beside your upper chest'),
      P([0.45, 0.53], '最低點', 'Bottom', '感到上胸拉伸', 'Feel the stretch across the upper chest'),
      P([0.53, 1], '推', 'Press', '向上推，頂部啞鈴靠近', 'Press up, dumbbells come together at the top')
    ],
    mistakes: [M('斜板角度太高變咗推肩', 'Bench so steep it becomes a shoulder press'), M('落得太淺', 'Partial range')]
  },
  pushup: {
    period: 3.2, cam: { view: 'side', target: [0, 0.4, 0], dist: 3.1, phi: 0.2 },
    props: [],
    keys: loop([
      { t: 0, ...line(0.66, 0.40), fp: 72, kp: [0, -1, 0], h: [0.24, 0.04, 0.42], ep: [0.5, 0.5, -0.8], head: -5 },
      { t: 0.1, ...line(0.66, 0.40) },
      { t: 0.45, ...line(0.25, 0.46) },
      { t: 0.53, ...line(0.25, 0.46) }
    ]),
    phases: [
      P([0, 0.1], '撐起', 'Top', '手喺肩膊下面，身體一直線', 'Hands under shoulders, body in one straight line'),
      P([0.1, 0.45], '落', 'Lower', '手肘向後約 45 度', 'Elbows back at about 45°'),
      P([0.45, 0.53], '最低點', 'Bottom', '心口接近地面', 'Chest close to the floor'),
      P([0.53, 1], '推起', 'Push', '成個身一齊上，唔好塌腰', 'Rise as one piece, don\'t let the hips sag')
    ],
    mistakes: [M('腰向下塌', 'Hips sagging'), M('手肘向兩邊張開', 'Elbows flared straight out'), M('只係頭落', 'Only the head goes down')]
  },
  fly_cable: {
    period: 3.6, cam: { view: 'q', target: [0, 1.05, 0], dist: 3.4, phi: 0.18 },
    props: [{ type: 'cable', anchor: [1.25, 1.85, -0.1], to: 'L', handle: 'd', towerDz: 0 }, { type: 'cable', anchor: [-1.25, 1.85, -0.1], to: 'R', handle: 'd', towerDz: 0 }],
    keys: loop([
      { t: 0, pel: [0.95, -0.04], trunk: 12, fL: [0.14, 0.08, 0.08], fR: [-0.14, 0.08, -0.12], h: [0.80, 1.40, 0.04], ep: [0, 0.5, -1] },
      { t: 0.1, h: [0.80, 1.40, 0.04] },
      { t: 0.45, h: [0.07, 1.26, 0.52], ep: [0.4, 0.4, -1] },
      { t: 0.55, h: [0.07, 1.26, 0.52], ep: [0.4, 0.4, -1] }
    ]),
    phases: [
      P([0, 0.1], '張開', 'Open', '手肘微曲固定，胸口挺起', 'Slight fixed bend in the elbows, chest up'),
      P([0.1, 0.45], '合', 'Hug', '似攬住一棵大樹咁向前合', 'Bring the hands together like hugging a big tree'),
      P([0.45, 0.55], '夾', 'Squeeze', '夾緊胸肌', 'Squeeze the chest'),
      P([0.55, 1], '慢放', 'Open slowly', '感到胸口拉伸就停', 'Open until you feel the chest stretch')
    ],
    mistakes: [M('彎手變咗推', 'Bending the arms into a press'), M('聳膊頭', 'Shrugging the shoulders')]
  },
  fly_low: {
    period: 3.6, cam: { view: 'q', target: [0, 1.0, 0], dist: 3.4, phi: 0.18 },
    props: [{ type: 'cable', anchor: [1.2, 0.25, -0.1], to: 'L', handle: 'd', towerDz: 0 }, { type: 'cable', anchor: [-1.2, 0.25, -0.1], to: 'R', handle: 'd', towerDz: 0 }],
    keys: loop([
      { t: 0, pel: [0.95, -0.02], trunk: 4, fL: [0.14, 0.08, 0.08], fR: [-0.14, 0.08, -0.12], h: [0.66, 0.86, 0.10], ep: [0, -0.2, -1] },
      { t: 0.1, h: [0.66, 0.86, 0.10] },
      { t: 0.45, h: [0.07, 1.34, 0.45] },
      { t: 0.55, h: [0.07, 1.34, 0.45] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '滑輪喺低位，手喺身兩側', 'Pulleys low, hands at your sides'),
      P([0.1, 0.45], '向上合', 'Scoop up', '弧形向上向內合埋', 'Arc up and in'),
      P([0.45, 0.55], '夾', 'Squeeze', '喺胸前夾緊下胸', 'Squeeze the lower chest in front of you'),
      P([0.55, 1], '慢放', 'Lower', '控制住放返落去', 'Lower under control')
    ],
    mistakes: [M('用手臂拉', 'Pulling with the arms'), M('身體搖', 'Swinging the body')]
  },
  pec_deck: {
    period: 3.6, cam: { view: 'q', target: [0, 0.95, 0], dist: 3.2, phi: 0.25 },
    props: [{ type: 'seat', y: 0.45, z: 0, back: 0.75 }],
    keys: loop([
      { t: 0, pel: [0.55, -0.02], trunk: 0, f: [0.2, 0.08, 0.42], kp: [0.3, 0.4, 1], h: [0.50, 1.31, -0.05], ep: [1, -0.4, -0.3] },
      { t: 0.1, h: [0.50, 1.31, -0.05] },
      { t: 0.45, h: [0.11, 1.31, 0.27], ep: [0.4, -0.5, 1] },
      { t: 0.55, h: [0.11, 1.31, 0.27], ep: [0.4, -0.5, 1] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手肘 90 度，同膊頭一樣高', 'Elbows at 90°, level with your shoulders'),
      P([0.1, 0.45], '合', 'Close', '用胸肌將把手夾埋', 'Bring the pads together with your chest'),
      P([0.45, 0.55], '夾', 'Squeeze', '停一秒', 'Hold one second'),
      P([0.55, 1], '慢放', 'Open', '慢慢張開，感受拉伸', 'Open slowly into the stretch')
    ],
    mistakes: [M('座位太高或太低', 'Seat set too high or low'), M('背部離開靠墊', 'Back coming off the pad')]
  },
  dip: {
    period: 3.4, cam: { view: 'side', target: [0, 1.2, 0], dist: 3.4, phi: 0.12 },
    props: [{ type: 'dipbars', y: 1.2, x: 0.27 }],
    keys: loop([
      { t: 0, pel: [1.36, -0.04], trunk: 5, h: [0.27, 1.22, 0.03], ep: [0.15, 0, -1], fo: [0.07, -0.80, -0.22], fp: 35, kp: [0, 0, 1] },
      { t: 0.1, pel: [1.36, -0.04], trunk: 5 },
      { t: 0.45, pel: [1.05, -0.12], trunk: 16 },
      { t: 0.53, pel: [1.05, -0.12], trunk: 16 }
    ]),
    phases: [
      P([0, 0.1], '撐起', 'Top', '手臂伸直，膊頭向下壓', 'Arms straight, shoulders pressed down'),
      P([0.1, 0.45], '落', 'Lower', '手肘向後屈', 'Bend the elbows straight back'),
      P([0.45, 0.53], '最低點', 'Bottom', '上臂大約平行地面', 'Upper arms about parallel to the floor'),
      P([0.53, 1], '推起', 'Press', '推返直', 'Press back up')
    ],
    mistakes: [M('落太深傷膊頭', 'Going too deep and straining the shoulders'), M('聳膊頭', 'Shrugging up')]
  },
  dip_chest: {
    period: 3.4, cam: { view: 'side', target: [0, 1.2, 0], dist: 3.4, phi: 0.12 },
    props: [{ type: 'dipbars', y: 1.2, x: 0.29 }],
    keys: loop([
      { t: 0, pel: [1.34, -0.10], trunk: 18, h: [0.29, 1.22, 0.04], ep: [0.6, 0, -1], fo: [0.07, -0.78, -0.30], fp: 35, kp: [0, 0, 1] },
      { t: 0.1, pel: [1.34, -0.10], trunk: 18 },
      { t: 0.45, pel: [1.04, -0.20], trunk: 34 },
      { t: 0.53, pel: [1.04, -0.20], trunk: 34 }
    ]),
    phases: [
      P([0, 0.1], '撐起', 'Top', '上身向前傾', 'Lean the torso forward'),
      P([0.1, 0.45], '落', 'Lower', '手肘略向外，感受胸肌拉伸', 'Elbows slightly out, feel the chest stretch'),
      P([0.45, 0.53], '最低點', 'Bottom', '上臂平行地面', 'Upper arms parallel to the floor'),
      P([0.53, 1], '推起', 'Press', '保持前傾推返上', 'Stay leaned forward as you press up')
    ],
    mistakes: [M('身體太直變咗三頭肌', 'Staying upright turns it into a triceps dip'), M('落太深', 'Going too deep')]
  },
  svend: {
    period: 3, cam: { view: 'q', target: [0, 1.1, 0], dist: 3 },
    props: [{ type: 'plate' }],
    keys: loop([
      { ...STAND, t: 0, ht: [0.035, 0.34, 0.20], ep: [0.6, -0.6, -0.2] },
      { t: 0.1, ht: [0.035, 0.34, 0.20] },
      { t: 0.45, h: [0.035, 1.30, 0.58] },
      { t: 0.55, h: [0.035, 1.30, 0.58] }
    ]),
    phases: [
      P([0, 0.1], '夾住', 'Squeeze', '兩手用力夾住槓片', 'Press the plates together hard'),
      P([0.1, 0.45], '推出', 'Press out', '一路夾一路向前推', 'Keep squeezing as you press forward'),
      P([0.45, 0.55], '停', 'Hold', '手伸直停一停', 'Hold at full extension'),
      P([0.55, 1], '收返', 'Return', '慢慢收返心口', 'Bring it back to the chest')
    ],
    mistakes: [M('冇夾實槓片', 'Not squeezing the plates')]
  },

  // ───────────── BACK ─────────────
  row_bb: {
    period: 3.2, cam: { view: 'q', target: [0, 0.8, 0], dist: 3.2 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { t: 0, pel: [0.86, -0.28], trunk: 65, f: [0.14, 0.08, 0], kp: [0.15, 0, 1], hs: [0.05, -0.6, 0.03], ep: [0.4, 1, -0.3] },
      { t: 0.1, hs: [0.05, -0.6, 0.03] },
      { t: 0.42, ht: [0.24, 0.18, 0.21] },
      { t: 0.52, ht: [0.24, 0.18, 0.21] }
    ]),
    phases: [
      P([0, 0.1], '屈髖', 'Hinge', '上身前傾約 45 度以上，背打平', 'Lean over 45° or more with a flat back'),
      P([0.1, 0.42], '拉', 'Row', '手肘向後拉，槓拉向肚', 'Drive the elbows back, bar to your belly'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊肩胛骨', 'Squeeze your shoulder blades'),
      P([0.52, 1], '放', 'Lower', '控制住伸直手', 'Lower until the arms are straight')
    ],
    mistakes: [M('用上身起伏借力', 'Heaving with the torso'), M('圓背', 'Rounding the back')]
  },
  seated_row: {
    period: 3.4, cam: { view: 'side', target: [0, 0.6, 0.2], dist: 3.2 },
    props: [{ type: 'box', w: 0.34, h: 0.4, d: 1.0, z: -0.15 }, { type: 'box', w: 0.5, h: 0.32, d: 0.06, z: 0.70, rx: -0.5 }, { type: 'cable', anchor: [0, 0.78, 1.35], handle: 'd' }],
    keys: loop([
      { t: 0, pel: [0.50, -0.05], trunk: 18, f: [0.15, 0.30, 0.64], fp: -45, kp: [0.3, 1, 0.5], h: [0.06, 0.80, 0.66], ep: [0.3, -0.3, -1] },
      { t: 0.1, pel: [0.50, -0.05], trunk: 18 },
      { t: 0.42, trunk: -4, ht: [0.11, 0.20, 0.17] },
      { t: 0.52, trunk: -4, ht: [0.11, 0.20, 0.17] }
    ]),
    phases: [
      P([0, 0.1], '伸展', 'Reach', '手伸直，背打直', 'Arms long, back straight'),
      P([0.1, 0.42], '拉', 'Row', '手肘貼身向後拉到肚', 'Elbows back along your sides to the belly'),
      P([0.42, 0.52], '夾', 'Squeeze', '心口挺起夾緊背', 'Chest up, squeeze the back'),
      P([0.52, 1], '放', 'Release', '慢慢伸返直', 'Let the arms extend slowly')
    ],
    mistakes: [M('上身前後大搖', 'Rocking the torso a lot'), M('聳膊頭', 'Shrugging')]
  },
  pulldown: {
    period: 3.4, cam: { view: 'q', target: [0, 1.15, 0], dist: 3.4, phi: 0.12 },
    props: [{ type: 'seat', y: 0.45, z: 0, pad: [0.66, 0.2] }, { type: 'bar', len: 1.2 }, { type: 'cable', anchor: [0, 2.5, 0.08], handle: 'none', towerDz: -0.25 }],
    keys: loop([
      { t: 0, pel: [0.55, 0], trunk: -8, f: [0.18, 0.08, 0.42], kp: [0.3, 0.4, 1], h: [0.45, 1.62, 0.06], ep: [1, -0.6, -0.2] },
      { t: 0.1, h: [0.45, 1.62, 0.06] },
      { t: 0.42, trunk: -14, h: [0.38, 1.16, 0.13] },
      { t: 0.52, trunk: -14, h: [0.38, 1.16, 0.13] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '大腿頂實墊，闊握', 'Thighs locked under the pad, wide grip'),
      P([0.1, 0.42], '拉', 'Pull', '手肘向下向後，拉到上胸', 'Elbows down and back, bar to the upper chest'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊背闊肌', 'Squeeze the lats'),
      P([0.52, 1], '放', 'Release', '慢慢放返上，手伸直', 'Let the bar rise until the arms are straight')
    ],
    mistakes: [M('身體向後瞓到太盡', 'Leaning back too far'), M('拉到頸後', 'Pulling behind the neck')]
  },
  pulldown_close: {
    period: 3.4, cam: { view: 'q', target: [0, 1.15, 0], dist: 3.4, phi: 0.12 },
    props: [{ type: 'seat', y: 0.45, z: 0, pad: [0.66, 0.2] }, { type: 'cable', anchor: [0, 2.5, 0.08], handle: 'd', towerDz: -0.25 }],
    keys: loop([
      { t: 0, pel: [0.55, 0], trunk: -8, f: [0.18, 0.08, 0.42], kp: [0.3, 0.4, 1], h: [0.06, 1.63, 0.10], ep: [0.4, -0.6, -0.3] },
      { t: 0.1, h: [0.06, 1.63, 0.10] },
      { t: 0.42, trunk: -15, h: [0.06, 1.14, 0.20] },
      { t: 0.52, trunk: -15, h: [0.06, 1.14, 0.20] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '窄握 V 柄', 'Close grip on the V-handle'),
      P([0.1, 0.42], '拉', 'Pull', '手肘貼身向下拉到胸口', 'Elbows close, pull down to the chest'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊背', 'Squeeze the back'),
      P([0.52, 1], '放', 'Release', '慢慢伸直', 'Extend slowly')
    ],
    mistakes: [M('用手臂拉', 'Pulling with the arms only'), M('身體搖晃', 'Swinging')]
  },
  pullup: {
    period: 3.6, cam: { view: 'q', target: [0, 1.6, 0], dist: 4.2, phi: 0.1 },
    props: [{ type: 'pullbar', y: 2.45, w: 1.4 }],
    keys: loop([
      { t: 0, pel: [1.32, -0.03], trunk: -5, h: [0.32, 2.42, 0.0], ep: [1, -0.5, -0.3], fo: [0.08, -0.78, -0.16], fp: 30, kp: [0, 0, 1] },
      { t: 0.1, pel: [1.32, -0.03], trunk: -5 },
      { t: 0.42, pel: [1.75, -0.06], trunk: -12 },
      { t: 0.52, pel: [1.75, -0.06], trunk: -12 }
    ]),
    phases: [
      P([0, 0.1], '吊住', 'Dead hang', '手比肩略闊，膊頭向下收', 'Hands a little wider than shoulders, shoulders set down'),
      P([0.1, 0.42], '拉', 'Pull', '手肘向下拉向肋骨', 'Drive the elbows down toward your ribs'),
      P([0.42, 0.52], '頂部', 'Top', '下巴過槓', 'Chin over the bar'),
      P([0.52, 1], '放', 'Lower', '慢慢放到手伸直', 'Lower slowly to straight arms')
    ],
    mistakes: [M('擺腳借力', 'Kipping or swinging'), M('只做半程', 'Half reps')]
  },
  pullover: {
    period: 3.4, cam: { view: 'side', target: [0, 1.15, 0.2], dist: 3.6, phi: 0.12 },
    props: [{ type: 'cable', anchor: [0, 2.3, 1.15], handle: 'bar', handleLen: 0.5 }],
    keys: loop([
      { t: 0, pel: [0.94, -0.12], trunk: 25, f: [0.13, 0.08, 0], kp: [0.15, 0, 1], h: [0.14, 1.86, 0.52], ep: [0.2, 0.3, -1] },
      { t: 0.1, h: [0.14, 1.86, 0.52] },
      { t: 0.45, h: [0.14, 0.97, 0.28] },
      { t: 0.55, h: [0.14, 0.97, 0.28] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手臂伸直，身體微微前傾', 'Arms straight, slight forward lean'),
      P([0.1, 0.45], '下壓', 'Sweep down', '手臂保持直，弧形壓到大腿', 'Keep arms straight, sweep down to your thighs'),
      P([0.45, 0.55], '夾', 'Squeeze', '夾緊背闊肌', 'Squeeze the lats'),
      P([0.55, 1], '返上', 'Return', '慢慢返上去', 'Return slowly')
    ],
    mistakes: [M('彎手變咗下壓', 'Bending the elbows into a pushdown')]
  },
  shrug: {
    period: 2.8, cam: { view: 'front', target: [0, 1.1, 0], dist: 3 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { ...STAND, t: 0, sh: 0, hs: [0.04, -0.61, 0.09] },
      { t: 0.15, sh: 0 },
      { t: 0.45, sh: 0.065 },
      { t: 0.58, sh: 0.065 }
    ]),
    phases: [
      P([0, 0.15], '準備', 'Set up', '手伸直揸住槓', 'Hold the bar with straight arms'),
      P([0.15, 0.45], '聳', 'Shrug', '膊頭垂直向耳仔方向升', 'Lift your shoulders straight up toward your ears'),
      P([0.45, 0.58], '停', 'Hold', '停一秒', 'Hold one second'),
      P([0.58, 1], '放', 'Lower', '慢慢放低', 'Lower slowly')
    ],
    mistakes: [M('轉膊頭', 'Rolling the shoulders'), M('用手臂拉', 'Bending the arms')]
  },

  // ───────────── SHOULDERS ─────────────
  ohp: {
    period: 3.8, cam: { view: 'q', target: [0, 1.25, 0], dist: 3.6, phi: 0.12 },
    props: [{ type: 'barbell' }],
    keys: loop([
      { ...STAND, t: 0, f: [0.14, 0.08, 0], h: [0.24, 1.40, 0.17], ep: [0.3, -1, 0.8] },
      { t: 0.1, h: [0.24, 1.40, 0.17] },
      { t: 0.3, head: -10, trunk: -3, h: [0.24, 1.70, 0.08], ep: [0.5, -0.6, 0.6] },
      { t: 0.48, head: 0, trunk: 0, h: [0.24, 2.03, 0.0], ep: [0.7, 0, 0.2] },
      { t: 0.58, h: [0.24, 2.03, 0.0], ep: [0.7, 0, 0.2] },
      { t: 0.8, head: -10, trunk: -3, h: [0.24, 1.70, 0.08], ep: [0.5, -0.6, 0.6] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Rack', '槓喺鎖骨前，手肘微微向前', 'Bar at the collarbone, elbows slightly forward'),
      P([0.1, 0.48], '推', 'Press', '頭稍向後讓位，槓直線向上', 'Tip the head back, press the bar straight up'),
      P([0.48, 0.58], '鎖定', 'Lockout', '槓喺頭頂正上方，頭向前穿過', 'Bar over the middle of your head, head through'),
      P([0.58, 1], '放', 'Lower', '控制住返到鎖骨', 'Lower back to the collarbone')
    ],
    mistakes: [M('腰向後彎', 'Arching the lower back'), M('槓向前推出', 'Pressing the bar forward')]
  },
  db_press: {
    period: 3.6, cam: { view: 'q', target: [0, 1.1, 0], dist: 3.3, phi: 0.15 },
    props: [{ type: 'seat', y: 0.45, z: -0.05, back: 0.7 }, { type: 'dumbbells', axis: 'x' }],
    keys: loop([
      { t: 0, pel: [0.55, -0.05], trunk: -4, f: [0.2, 0.08, 0.45], kp: [0.3, 0.4, 1], h: [0.37, 1.07, 0.03], ep: [1, -0.4, 0] },
      { t: 0.1, h: [0.37, 1.07, 0.03] },
      { t: 0.45, h: [0.16, 1.61, 0.0] },
      { t: 0.55, h: [0.16, 1.61, 0.0] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '啞鈴喺耳仔高度，背貼靠墊', 'Dumbbells at ear height, back on the pad'),
      P([0.1, 0.45], '推', 'Press', '向上推，頂部微微靠埋', 'Press up, bring them slightly together at the top'),
      P([0.45, 0.55], '頂部', 'Top', '手臂接近伸直', 'Arms nearly straight'),
      P([0.55, 1], '放', 'Lower', '控制住返到耳仔位', 'Lower back to ear height')
    ],
    mistakes: [M('腰離開靠墊', 'Arching off the pad'), M('落得太淺', 'Partial range')]
  },
  lateral: {
    period: 3.2, cam: { view: 'front', target: [0, 1.1, 0], dist: 3.3 },
    props: [{ type: 'dumbbells', axis: 'z' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.24, 0.84, 0.08], ep: [0.3, 0.3, -1] },
      { t: 0.1, h: [0.24, 0.84, 0.08] },
      { t: 0.45, h: [0.74, 1.40, 0.10], ep: [0, 1, -0.6] },
      { t: 0.55, h: [0.74, 1.40, 0.10], ep: [0, 1, -0.6] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '身體微微前傾，手肘微曲', 'Slight forward lean, soft elbows'),
      P([0.1, 0.45], '舉', 'Raise', '手肘帶頭向兩邊舉', 'Lead with the elbows out to the sides'),
      P([0.45, 0.55], '頂部', 'Top', '舉到膊頭高度就夠', 'Stop at shoulder height'),
      P([0.55, 1], '放', 'Lower', '慢慢放，唔好跌', 'Lower slowly')
    ],
    mistakes: [M('聳膊頭', 'Shrugging'), M('甩身借力', 'Swinging the body'), M('舉過膊頭太高', 'Lifting far above shoulder height')]
  },
  front_raise: {
    period: 3.2, cam: { view: 'side', target: [0, 1.1, 0], dist: 3.3 },
    props: [{ type: 'dumbbells', axis: 'x' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.22, 0.84, 0.10], ep: [0.4, 0.2, -1] },
      { t: 0.1, h: [0.22, 0.84, 0.10] },
      { t: 0.45, h: [0.22, 1.42, 0.60], ep: [0.5, 1, 0] },
      { t: 0.55, h: [0.22, 1.42, 0.60], ep: [0.5, 1, 0] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手肘微曲', 'Soft elbows'),
      P([0.1, 0.45], '舉', 'Raise', '向前舉到膊頭高度', 'Raise in front to shoulder height'),
      P([0.45, 0.55], '頂部', 'Top', '停一停', 'Pause'),
      P([0.55, 1], '放', 'Lower', '慢慢放', 'Lower slowly')
    ],
    mistakes: [M('身體向後瞓借力', 'Leaning back to swing it up')]
  },
  rear_fly: {
    period: 3.2, cam: { view: 'q', target: [0, 0.9, 0], dist: 3.2, phi: 0.35 },
    props: [{ type: 'dumbbells', axis: 'z' }],
    keys: loop([
      { t: 0, pel: [0.88, -0.30], trunk: 70, f: [0.14, 0.08, 0], kp: [0.15, 0, 1], hs: [0.04, -0.58, 0.06], ep: [0.4, 1, 0.2] },
      { t: 0.1, hs: [0.04, -0.58, 0.06] },
      { t: 0.45, ht: [0.74, 0.40, 0.02] },
      { t: 0.55, ht: [0.74, 0.40, 0.02] }
    ]),
    phases: [
      P([0, 0.1], '屈髖', 'Hinge', '上身前傾接近平行，背打平', 'Hinge until nearly parallel, flat back'),
      P([0.1, 0.45], '張開', 'Open', '手肘微曲向兩邊張開', 'Open the arms out wide with soft elbows'),
      P([0.45, 0.55], '夾', 'Squeeze', '夾緊後三角', 'Squeeze the rear delts'),
      P([0.55, 1], '放', 'Lower', '慢慢放返', 'Lower slowly')
    ],
    mistakes: [M('上身彈起', 'Torso bouncing up'), M('夾肩胛變咗划船', 'Turning it into a row')]
  },
  face_pull: {
    period: 3.2, cam: { view: 'q', target: [0, 1.3, 0.3], dist: 3.4, phi: 0.15 },
    props: [{ type: 'cable', anchor: [0, 1.65, 1.4], handle: 'rope' }],
    keys: loop([
      { ...STAND, t: 0, trunk: -3, f: [0.15, 0.08, 0], h: [0.08, 1.55, 0.62], ep: [1, 0.2, -0.4] },
      { t: 0.1, h: [0.08, 1.55, 0.62] },
      { t: 0.45, h: [0.30, 1.62, 0.10], ep: [1, 0.6, -0.4] },
      { t: 0.55, h: [0.30, 1.62, 0.10], ep: [1, 0.6, -0.4] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '滑輪喺眼睛高度，揸繩', 'Pulley at eye level, grab the rope'),
      P([0.1, 0.45], '拉', 'Pull', '拉向額頭，手肘高過手腕', 'Pull toward your forehead, elbows high'),
      P([0.45, 0.55], '外旋', 'Rotate', '拳頭向後轉，夾緊後肩', 'Rotate fists back, squeeze the rear shoulders'),
      P([0.55, 1], '放', 'Release', '慢慢伸返直', 'Extend slowly')
    ],
    mistakes: [M('手肘太低', 'Elbows too low'), M('身體向後瞓', 'Leaning back')]
  },
  upright_row: {
    period: 3.2, cam: { view: 'front', target: [0, 1.1, 0], dist: 3.2 },
    props: [{ type: 'barbell', len: 1.5, plate: 0.15 }],
    keys: loop([
      { ...STAND, t: 0, h: [0.12, 0.84, 0.12], ep: [1, 0.4, -0.3] },
      { t: 0.1, h: [0.12, 0.84, 0.12] },
      { t: 0.45, h: [0.14, 1.32, 0.16], ep: [1, 1, -0.2] },
      { t: 0.55, h: [0.14, 1.32, 0.16], ep: [1, 1, -0.2] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '窄握，槓貼身', 'Narrow grip, bar close to the body'),
      P([0.1, 0.45], '拉', 'Pull', '手肘向上向外帶', 'Lead with the elbows up and out'),
      P([0.45, 0.55], '頂部', 'Top', '手肘去到膊頭高度', 'Elbows reach shoulder height'),
      P([0.55, 1], '放', 'Lower', '慢慢放', 'Lower slowly')
    ],
    mistakes: [M('拉得太高夾到膊頭', 'Pulling so high it pinches the shoulders')]
  },

  // ───────────── ARMS ─────────────
  curl_bb: {
    period: 3, cam: { view: 'q', target: [0, 1.1, 0], dist: 3 },
    props: [{ type: 'barbell', len: 1.5, plate: 0.15 }],
    keys: loop([
      { ...STAND, t: 0, h: [0.21, 0.82, 0.05], ep: [0.1, -0.6, -1] },
      { t: 0.1, h: [0.21, 0.82, 0.05] },
      { t: 0.27, h: [0.21, 1.14, 0.33] },
      { t: 0.42, h: [0.21, 1.40, 0.19] },
      { t: 0.52, h: [0.21, 1.40, 0.19] },
      { t: 0.75, h: [0.21, 1.14, 0.33] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手肘貼住身兩側', 'Elbows pinned to your sides'),
      P([0.1, 0.42], '捲', 'Curl', '只係前臂郁，捲到胸前', 'Only the forearms move, curl to the chest'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊二頭肌', 'Squeeze the biceps'),
      P([0.52, 1], '放', 'Lower', '慢慢放到手伸直', 'Lower slowly to straight arms')
    ],
    mistakes: [M('甩身借力', 'Swinging the body'), M('手肘向前郁', 'Elbows drifting forward')]
  },
  curl_db: {
    period: 3, cam: { view: 'q', target: [0, 1.1, 0], dist: 3 },
    props: [{ type: 'dumbbells', axis: 'x' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.22, 0.82, 0.05], ep: [0.15, -0.6, -1] },
      { t: 0.1, h: [0.22, 0.82, 0.05] },
      { t: 0.27, h: [0.22, 1.14, 0.33] },
      { t: 0.42, h: [0.22, 1.40, 0.19] },
      { t: 0.52, h: [0.22, 1.40, 0.19] },
      { t: 0.75, h: [0.22, 1.14, 0.33] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '掌心向前，手肘貼身', 'Palms forward, elbows at your sides'),
      P([0.1, 0.42], '捲', 'Curl', '捲起時手腕微微向外轉', 'Turn the wrists out slightly as you curl'),
      P([0.42, 0.52], '夾', 'Squeeze', '頂部夾緊', 'Squeeze at the top'),
      P([0.52, 1], '放', 'Lower', '慢慢放', 'Lower slowly')
    ],
    mistakes: [M('甩身', 'Swinging'), M('落一半就再捲', 'Not straightening the arms')]
  },
  hammer: {
    period: 3, cam: { view: 'q', target: [0, 1.1, 0], dist: 3 },
    props: [{ type: 'dumbbells', axis: 'y' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.22, 0.82, 0.05], ep: [0.15, -0.6, -1] },
      { t: 0.1, h: [0.22, 0.82, 0.05] },
      { t: 0.27, h: [0.22, 1.14, 0.33] },
      { t: 0.42, h: [0.22, 1.40, 0.19] },
      { t: 0.52, h: [0.22, 1.40, 0.19] },
      { t: 0.75, h: [0.22, 1.14, 0.33] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '拇指向上（中立握）', 'Thumbs up (neutral grip)'),
      P([0.1, 0.42], '捲', 'Curl', '手肘固定，捲到膊頭前', 'Elbows fixed, curl to the front of your shoulder'),
      P([0.42, 0.52], '夾', 'Squeeze', '頂部夾緊', 'Squeeze at the top'),
      P([0.52, 1], '放', 'Lower', '慢慢放', 'Lower slowly')
    ],
    mistakes: [M('手肘向前', 'Elbows moving forward')]
  },
  pushdown: {
    period: 3, cam: { view: 'side', target: [0, 1.15, 0.1], dist: 3.2 },
    props: [{ type: 'cable', anchor: [0, 2.3, 0.45], handle: 'bar', handleLen: 0.4 }],
    keys: loop([
      { t: 0, pel: [0.95, -0.04], trunk: 10, f: [0.14, 0.08, 0], kp: [0.15, 0, 1], h: [0.12, 1.24, 0.29], ep: [0.15, -0.5, -1] },
      { t: 0.1, h: [0.12, 1.24, 0.29] },
      { t: 0.42, h: [0.12, 0.86, 0.17] },
      { t: 0.52, h: [0.12, 0.86, 0.17] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手肘貼身，身體微微前傾', 'Elbows tucked, slight forward lean'),
      P([0.1, 0.42], '壓', 'Push down', '只係前臂郁，壓到手伸直', 'Only the forearms move, press to straight arms'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊三頭肌', 'Squeeze the triceps'),
      P([0.52, 1], '返', 'Return', '慢慢返到 90 度', 'Return slowly to 90°')
    ],
    mistakes: [M('手肘離開身體', 'Elbows flaring away from the body'), M('用身體重量壓', 'Leaning your body weight into it')]
  },
  skull: {
    period: 3.4, cam: { view: 'side', target: [0, 0.75, -0.25], dist: 3, phi: 0.3 },
    props: [{ type: 'bench' }, { type: 'ezbar' }],
    keys: loop([
      { t: 0, pel: [0.55, 0.12], trunk: -90, f: [0.28, 0.08, 0.52], kp: [0.5, 1, 0.4], h: [0.13, 1.14, -0.30], ep: [0.15, 1, 0.4] },
      { t: 0.1, h: [0.13, 1.14, -0.30] },
      { t: 0.45, h: [0.13, 0.76, -0.55] },
      { t: 0.53, h: [0.13, 0.76, -0.55] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手臂垂直，或者微微向頭方向斜', 'Arms vertical or tilted slightly back'),
      P([0.1, 0.45], '落', 'Lower', '只屈手肘，槓落向額頭', 'Bend only the elbows, bar toward your forehead'),
      P([0.45, 0.53], '最低點', 'Bottom', '上臂唔郁', 'Upper arms stay still'),
      P([0.53, 1], '伸直', 'Extend', '用三頭肌推返直', 'Extend with the triceps')
    ],
    mistakes: [M('手肘向外張', 'Elbows flaring out'), M('上臂跟住郁', 'Upper arms moving too')]
  },
  overhead_tri: {
    period: 3.2, cam: { view: 'side', target: [0, 1.4, 0], dist: 3.6, phi: 0.12 },
    props: [{ type: 'dumbbell1', axis: 'y' }],
    keys: loop([
      { ...STAND, t: 0, h: [0.04, 2.02, 0.02], ep: [0.3, 1, 0.5] },
      { t: 0.1, h: [0.04, 2.02, 0.02] },
      { t: 0.45, h: [0.04, 1.58, -0.20] },
      { t: 0.53, h: [0.04, 1.58, -0.20] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '雙手揸啞鈴舉過頭', 'Hold the dumbbell overhead with both hands'),
      P([0.1, 0.45], '落', 'Lower', '手肘指天，啞鈴落到頭後', 'Elbows point up, lower behind your head'),
      P([0.45, 0.53], '拉伸', 'Stretch', '感受三頭肌拉伸', 'Feel the triceps stretch'),
      P([0.53, 1], '伸直', 'Extend', '推返上去', 'Press back up')
    ],
    mistakes: [M('手肘向外張開', 'Elbows flaring wide'), M('腰向後彎', 'Arching the back')]
  },
  kickback: {
    period: 3, cam: { view: 'side', target: [0, 0.85, -0.1], dist: 3 },
    props: [{ type: 'dumbbells', axis: 'y' }],
    keys: loop([
      { t: 0, pel: [0.88, -0.30], trunk: 70, f: [0.14, 0.08, 0], kp: [0.15, 0, 1], h: [0.20, 0.66, -0.12], ep: [0.1, 1, 0.2] },
      { t: 0.1, h: [0.20, 0.66, -0.12] },
      { t: 0.42, h: [0.20, 0.92, -0.43], ep: [0.1, 1, 0] },
      { t: 0.52, h: [0.20, 0.92, -0.43], ep: [0.1, 1, 0] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '上身前傾，上臂貼身平行地面', 'Lean over, upper arm along your side'),
      P([0.1, 0.42], '伸', 'Kick back', '只係前臂向後伸直', 'Only the forearm moves back'),
      P([0.42, 0.52], '夾', 'Squeeze', '夾緊三頭肌', 'Squeeze the triceps'),
      P([0.52, 1], '返', 'Return', '慢慢返到 90 度', 'Return slowly to 90°')
    ],
    mistakes: [M('上臂跌落嚟', 'Upper arm dropping'), M('甩手借力', 'Swinging the weight')]
  },

  // ───────────── CORE ─────────────
  plank: {
    period: 4, cam: { view: 'side', target: [0, 0.3, 0], dist: 3, phi: 0.18 },
    props: [{ type: 'mat' }],
    keys: loop([
      { t: 0, ...line(0.36, 0.30), fp: 72, kp: [0, -1, 0], h: [0.10, 0.06, 0.62], ep: [0.2, -1, 0], head: -5 },
      { t: 0.5, ...line(0.375, 0.30) }
    ]),
    phases: [
      P([0, 0.5], '撐住', 'Hold', '手肘喺膊頭正下面，頭到腳一直線', 'Elbows under shoulders, straight line head to heels'),
      P([0.5, 1], '收緊', 'Brace', '夾臀、收腹，正常呼吸', 'Squeeze glutes, brace abs, keep breathing')
    ],
    mistakes: [M('腰向下塌', 'Hips sagging'), M('屁股翹太高', 'Hips piked up'), M('閉氣', 'Holding your breath')]
  },
  crunch: {
    period: 3, cam: { view: 'side', target: [0, 0.3, 0], dist: 2.9, phi: 0.25 },
    props: [{ type: 'mat' }],
    keys: loop([
      { t: 0, pel: [0.12, 0.05], trunk: -90, lumbar: 0, f: [0.14, 0.08, 0.48], kp: [0.2, 1, 0.3], ht: [0.10, 0.64, -0.08], ep: [1, 0, 0] },
      { t: 0.12, lumbar: 0 },
      { t: 0.45, lumbar: 34 },
      { t: 0.55, lumbar: 34 }
    ]),
    phases: [
      P([0, 0.12], '準備', 'Set up', '屈膝，手輕輕扶頭', 'Knees bent, hands lightly behind the head'),
      P([0.12, 0.45], '捲', 'Crunch', '用腹肌將膊頭捲離地面', 'Curl your shoulders off the floor with your abs'),
      P([0.45, 0.55], '頂部', 'Top', '呼氣夾緊腹肌', 'Exhale and squeeze'),
      P([0.55, 1], '放', 'Lower', '慢慢放返落去', 'Lower slowly')
    ],
    mistakes: [M('用手拉頸', 'Pulling on your neck'), M('坐成個起身', 'Sitting all the way up')]
  },
  leg_raise: {
    period: 3.4, cam: { view: 'side', target: [0, 0.35, 0.1], dist: 3, phi: 0.25 },
    props: [{ type: 'mat' }],
    keys: loop([
      { t: 0, pel: [0.12, 0], trunk: -90, f: [0.1, 0.14, 0.86], fp: 25, kp: [0, 1, 0.1], h: [0.25, 0.05, 0.05], ep: [0, 1, 0] },
      { t: 0.1, f: [0.1, 0.14, 0.86] },
      { t: 0.45, f: [0.1, 0.94, 0.12] },
      { t: 0.55, f: [0.1, 0.94, 0.12] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '下背壓實地面，腳離地少少', 'Lower back pressed down, feet just off the floor'),
      P([0.1, 0.45], '舉', 'Raise', '直腳舉到 90 度', 'Lift straight legs to 90°'),
      P([0.45, 0.55], '頂部', 'Top', '停一停', 'Pause'),
      P([0.55, 1], '放', 'Lower', '慢慢放，下背唔好拱起', 'Lower slowly without arching the lower back')
    ],
    mistakes: [M('下背拱起', 'Lower back arching off the floor'), M('用衝力甩腳', 'Swinging the legs')]
  },
  cable_crunch: {
    period: 3.2, cam: { view: 'side', target: [0, 0.75, 0.1], dist: 3.2 },
    props: [{ type: 'cable', anchor: [0, 2.3, 0.35], handle: 'rope' }],
    keys: loop([
      { t: 0, pel: [0.52, 0], trunk: 12, lumbar: 0, f: [0.12, 0.08, -0.42], fp: 80, kp: [0, -1, 0.3], ht: [0.09, 0.56, 0.12], ep: [0.4, -1, 0.3] },
      { t: 0.1, lumbar: 0 },
      { t: 0.45, trunk: 28, lumbar: 55 },
      { t: 0.55, trunk: 28, lumbar: 55 }
    ]),
    phases: [
      P([0, 0.1], '跪低', 'Kneel', '繩放喺頭兩側', 'Rope beside your head'),
      P([0.1, 0.45], '捲', 'Crunch', '用腹肌將手肘捲向膝蓋', 'Curl elbows toward your knees with the abs'),
      P([0.45, 0.55], '夾', 'Squeeze', '呼氣夾緊', 'Exhale and squeeze'),
      P([0.55, 1], '返', 'Return', '慢慢伸返', 'Uncurl slowly')
    ],
    mistakes: [M('用臀部坐落', 'Sitting back with the hips'), M('用手拉', 'Pulling with the arms')]
  },
  russian_twist: {
    period: 3, cam: { view: 'front', target: [0, 0.4, 0.1], dist: 2.9, phi: 0.3 },
    props: [{ type: 'mat' }, { type: 'plate' }],
    keys: loop([
      { t: 0, pel: [0.13, 0], trunk: -40, yaw: -35, f: [0.13, 0.26, 0.48], kp: [0, 1, 0.3], ht: [0.04, 0.30, 0.32], ep: [0.6, -0.6, 0.2] },
      { t: 0.5, yaw: 35 }
    ]),
    phases: [
      P([0, 0.5], '轉左', 'Twist left', '上身後傾，用腹斜肌轉', 'Lean back, rotate with your obliques'),
      P([0.5, 1], '轉右', 'Twist right', '眼跟住手，腳唔好郁', 'Eyes follow the hands, legs stay still')
    ],
    mistakes: [M('只係郁手', 'Only moving the arms'), M('圓背', 'Rounding the back')]
  },
  dead_bug: {
    period: 4.4, cam: { view: 'q', target: [0, 0.35, 0], dist: 3, phi: 0.45 },
    props: [{ type: 'mat' }],
    keys: loop([
      { t: 0, pel: [0.12, 0], trunk: -90, h: [0.19, 0.72, -0.46], ep: [0.4, 0, 1], f: [0.11, 0.56, 0.44], kp: [0, 1, 0] },
      { t: 0.25, hL: [0.19, 0.16, -1.08], fR: [-0.11, 0.18, 0.86] },
      { t: 0.5, hL: [0.19, 0.72, -0.46], fR: [-0.11, 0.56, 0.44] },
      { t: 0.75, hR: [-0.19, 0.16, -1.08], fL: [0.11, 0.18, 0.86] }
    ]),
    phases: [
      P([0, 0.25], '左手右腳', 'Left arm, right leg', '對側手腳一齊伸，下背壓實地', 'Extend the opposite arm and leg, lower back stays down'),
      P([0.25, 0.5], '收返', 'Return', '慢慢收返中間', 'Bring them back to centre'),
      P([0.5, 0.75], '右手左腳', 'Right arm, left leg', '換邊', 'Switch sides'),
      P([0.75, 1], '收返', 'Return', '保持呼吸', 'Keep breathing')
    ],
    mistakes: [M('下背拱起', 'Lower back arching'), M('郁得太快', 'Moving too fast')]
  },
  hollow: {
    period: 4, cam: { view: 'side', target: [0, 0.3, 0], dist: 3, phi: 0.2 },
    props: [{ type: 'mat' }],
    keys: loop([
      { t: 0, pel: [0.12, 0], trunk: -72, h: [0.12, 0.46, -1.04], ep: [0.3, 1, 0], f: [0.1, 0.30, 0.86], fp: 20, kp: [0, 1, 0] },
      { t: 0.5, trunk: -74, f: [0.1, 0.27, 0.86] }
    ]),
    phases: [
      P([0, 0.5], '撐住', 'Hold', '下背壓實地，手腳伸直離地', 'Lower back glued down, arms and legs off the floor'),
      P([0.5, 1], '呼吸', 'Breathe', '似香蕉咁，保持呼吸', 'Make a banana shape and keep breathing')
    ],
    mistakes: [M('下背離地', 'Lower back lifting'), M('閉氣', 'Holding your breath')]
  },
  pallof: {
    period: 3.2, cam: { view: 'q', target: [0, 1.0, 0], dist: 3.4 },
    props: [{ type: 'cable', anchor: [-1.3, 1.2, 0.15], handle: 'd', towerDz: 0, towerDx: -0.1 }],
    keys: loop([
      { t: 0, pel: [0.94, 0], trunk: 0, f: [0.18, 0.08, 0], kp: [0.3, 0, 1], ht: [0.03, 0.34, 0.20], ep: [0.4, -1, 0] },
      { t: 0.1, ht: [0.03, 0.34, 0.20] },
      { t: 0.45, h: [0.03, 1.22, 0.62] },
      { t: 0.6, h: [0.03, 1.22, 0.62] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '側身對住滑輪，手揸把手喺胸前', 'Side-on to the pulley, handle at your chest'),
      P([0.1, 0.45], '推出', 'Press out', '推出去時身體唔好俾條繩拉轉', 'Press out without letting the cable twist you'),
      P([0.45, 0.6], '撐住', 'Hold', '收緊腹部對抗旋轉', 'Brace your core against the rotation'),
      P([0.6, 1], '收返', 'Return', '慢慢收返心口', 'Bring it back to the chest')
    ],
    mistakes: [M('身體被拉轉', 'Torso twisting toward the pulley')]
  },
  woodchop: {
    period: 3.2, cam: { view: 'front', target: [0, 1.05, 0], dist: 3.6 },
    props: [{ type: 'cable', anchor: [-1.1, 2.1, 0.2], handle: 'd', towerDz: 0, towerDx: -0.1 }],
    keys: loop([
      { t: 0, pel: [0.92, 0], trunk: 4, yaw: -42, f: [0.22, 0.08, 0], kp: [0.4, 0, 1], hL: [-0.48, 1.74, 0.30], hR: [-0.56, 1.72, 0.26], ep: [0.5, -0.5, 0] },
      { t: 0.1, yaw: -42 },
      { t: 0.45, pel: [0.88, 0], trunk: 14, yaw: 38, hL: [0.48, 0.76, 0.32], hR: [0.40, 0.78, 0.36] },
      { t: 0.55, pel: [0.88, 0], trunk: 14, yaw: 38, hL: [0.48, 0.76, 0.32], hR: [0.40, 0.78, 0.36] }
    ]),
    phases: [
      P([0, 0.1], '準備', 'Set up', '手揸高位把手，雙手伸直', 'Hands on the high handle, arms straight'),
      P([0.1, 0.45], '斬落', 'Chop', '用上身轉動，斜斜拉到對側膝蓋', 'Rotate the torso, pull across to the opposite knee'),
      P([0.45, 0.55], '底部', 'Bottom', '後腳跟住轉', 'Let the back foot pivot'),
      P([0.55, 1], '返', 'Return', '控制住返上去', 'Return with control')
    ],
    mistakes: [M('只用手拉', 'Pulling with the arms only'), M('圓背', 'Rounding the back')]
  },
  ab_wheel: {
    period: 4, cam: { view: 'side', target: [0, 0.35, 0.4], dist: 3.2, phi: 0.2 },
    props: [{ type: 'mat' }, { type: 'wheel' }],
    keys: loop([
      { t: 0, pel: [0.48, 0.02], trunk: 50, f: [0.12, 0.08, -0.40], fp: 80, kp: [0, -1, 0.3], h: [0.12, 0.17, 0.42], ep: [0.2, -0.5, -1] },
      { t: 0.12, pel: [0.48, 0.02], trunk: 50, h: [0.12, 0.17, 0.42] },
      { t: 0.5, pel: [0.30, 0.32], trunk: 82, h: [0.12, 0.17, 1.30] },
      { t: 0.6, pel: [0.30, 0.32], trunk: 82, h: [0.12, 0.17, 1.30] }
    ]),
    phases: [
      P([0, 0.12], '跪定', 'Kneel', '手喺膊頭下，收腹', 'Hands under shoulders, abs braced'),
      P([0.12, 0.5], '推出', 'Roll out', '慢慢向前碌，腰唔好塌', 'Roll forward slowly without letting the hips sag'),
      P([0.5, 0.6], '最遠', 'Extended', '去到控制到嘅最遠位', 'Go only as far as you can control'),
      P([0.6, 1], '拉返', 'Pull back', '用腹肌拉返嚟', 'Pull back with your abs')
    ],
    mistakes: [M('腰向下塌', 'Hips sagging'), M('碌得太遠失控', 'Rolling out further than you can control')]
  },

  // ───────────── CARDIO (procedural) ─────────────
  walk: {
    period: 1.3, cam: { view: 'side', target: [0, 0.9, 0], dist: 3.6 },
    props: [{ type: 'treadmill', z: -0.05 }],
    fn(t) {
      const a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      const lift = q => Math.max(0, q) * 0.07;
      return {
        pel: [1.055 + 0.012 * Math.cos(2 * a), 0], trunk: 3,
        fL: [0.11, 0.19 + lift(c), 0.24 * s], fR: [-0.11, 0.19 + lift(-c), -0.24 * s], fp: 0,
        hsL: [0.02, -0.6, -0.16 * s], hsR: [-0.02, -0.6, 0.16 * s], ep: [0.2, -0.3, -1], kp: [0.1, 0, 1]
      };
    },
    phases: [P([0, 1], '行', 'Walk', '企直，腳跟先著地，手自然擺', 'Stand tall, land heel first, swing the arms naturally')],
    mistakes: [M('揸住扶手', 'Holding on to the handrails'), M('彎腰', 'Hunching over')]
  },
  run: {
    period: 0.75, cam: { view: 'side', target: [0, 0.95, 0], dist: 3.6 },
    props: [{ type: 'treadmill', z: -0.05 }],
    fn(t) {
      const a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      const leg = (ph) => { const ss = Math.sin(ph), cc = Math.cos(ph); return [0.40 * ss, 0.19 + Math.max(0, cc) * 0.30 * (0.5 - 0.5 * ss) + Math.max(0, cc) * 0.06]; };
      const L = leg(a), R = leg(a + Math.PI);
      return {
        pel: [1.02 + 0.035 * Math.abs(Math.cos(a)), 0], trunk: 9,
        fL: [0.10, L[1], L[0]], fR: [-0.10, R[1], R[0]], fpL: -10 + 25 * Math.max(0, c), fpR: -10 + 25 * Math.max(0, -c),
        hsL: [0.03, -0.30, 0.10 - 0.2 * s], hsR: [-0.03, -0.30, 0.10 + 0.2 * s], ep: [0.15, -0.6, -1], kp: [0.1, 0, 1]
      };
    },
    phases: [P([0, 1], '跑', 'Run', '細步快頻，腳掌中段著地，手肘 90 度', 'Short quick steps, land mid-foot, elbows at 90°')],
    mistakes: [M('腳踭重重踩落', 'Heavy heel strike'), M('步幅太大', 'Overstriding')]
  },
  bike: {
    period: 1.1, cam: { view: 'side', target: [0, 0.8, 0.2], dist: 3.4 },
    props: [{ type: 'bike', cy: 0.42, cz: 0.42, seatY: 0.86 }],
    fn(t) {
      const a = -t * Math.PI * 2;
      return {
        pel: [0.93, -0.14], trunk: 30, h: [0.22, 1.07, 0.56], ep: [0.4, -1, -0.2],
        fL: [0.12, 0.42 + 0.17 * Math.sin(a), 0.42 + 0.17 * Math.cos(a)], fR: [-0.12, 0.42 - 0.17 * Math.sin(a), 0.42 - 0.17 * Math.cos(a)],
        fp: 10, kp: [0.12, 0.2, 1]
      };
    },
    phases: [P([0, 1], '踩', 'Pedal', '座位高度令腳喺最低點仲有少少屈', 'Seat high enough that the knee is slightly bent at the bottom')],
    mistakes: [M('座位太低', 'Seat too low'), M('上身左右搖', 'Rocking side to side')]
  },
  rower: {
    period: 3, cam: { view: 'side', target: [0, 0.55, 0.15], dist: 3.6 },
    props: [{ type: 'rower' }],
    keys: loop([
      { t: 0, pel: [0.40, 0.13], trunk: 28, f: [0.12, 0.27, 0.58], fp: -38, kp: [0.15, 0.4, 1], h: [0.14, 0.70, 0.92], ep: [0.3, -0.5, -1] },
      { t: 0.22, pel: [0.40, -0.18], trunk: 20, h: [0.14, 0.72, 0.62] },
      { t: 0.32, pel: [0.40, -0.29], trunk: -18, h: [0.14, 0.76, 0.30] },
      { t: 0.42, pel: [0.40, -0.29], trunk: -20, ht: [0.18, 0.30, 0.17] },
      { t: 0.55, pel: [0.40, -0.29], trunk: -18, h: [0.14, 0.76, 0.30] },
      { t: 0.68, pel: [0.40, -0.26], trunk: 22, h: [0.14, 0.72, 0.60] }
    ]),
    phases: [
      P([0, 0.22], '腳推', 'Legs', '先用腳推，手保持直', 'Push with the legs first, arms stay straight'),
      P([0.22, 0.32], '後擺', 'Swing', '上身向後擺', 'Swing the torso back'),
      P([0.32, 0.42], '手拉', 'Arms', '最後先用手拉到肋骨下', 'Finish by pulling the handle to your lower ribs'),
      P([0.42, 1], '回位', 'Recover', '手→身→腳，順序返去', 'Arms, then body, then legs on the way back')
    ],
    mistakes: [M('一開始就用手拉', 'Pulling with the arms first'), M('圓背', 'Rounding the back')]
  },
  jump_rope: {
    period: 0.5, cam: { view: 'q', target: [0, 0.95, 0], dist: 3.6 },
    props: [{ type: 'jumprope', turns: 1 }],
    fn(t) {
      const hop = Math.max(0, Math.sin(t * Math.PI * 2)) * 0.07;
      const a = t * Math.PI * 2;
      return {
        pel: [0.95 + hop, 0], trunk: 3, f: [0.11, 0.09 + hop, 0], fp: hop > 0.02 ? 18 : 6,
        hsL: [0.14 + 0.03 * Math.cos(a), -0.44, 0.08 + 0.03 * Math.sin(a)], hsR: [-0.14 - 0.03 * Math.cos(a), -0.44, 0.08 + 0.03 * Math.sin(a)], ep: [0.2, -0.6, -1], kp: [0.1, 0, 1]
      };
    },
    phases: [P([0, 1], '跳', 'Skip', '手肘貼身，用手腕轉繩，前腳掌輕輕落地', 'Elbows close, turn the rope with the wrists, land softly on the balls of your feet')],
    mistakes: [M('跳得太高', 'Jumping too high'), M('用成隻手臂轉', 'Turning with the whole arm')]
  },
  box_jump: {
    period: 3.2, cam: { view: 'side', target: [0, 0.9, 0.35], dist: 4 },
    props: [{ type: 'box', w: 0.6, h: 0.5, d: 0.5, z: 0.8 }],
    keys: loop([
      { ...STAND, t: 0, f: [0.13, 0.08, 0], hs: [0.02, -0.6, 0.04], ep: [0.2, -0.3, -1] },
      { t: 0.12, pel: [0.70, -0.12], trunk: 34, hs: [0.04, -0.52, -0.32] },
      { t: 0.24, pel: [1.32, 0.30], trunk: 10, f: [0.13, 0.62, 0.42], hs: [0.04, 0.2, 0.42] },
      { t: 0.34, pel: [1.10, 0.66], trunk: 30, f: [0.13, 0.58, 0.82], hs: [0.04, -0.45, 0.30] },
      { t: 0.5, pel: [1.46, 0.80], trunk: 2, f: [0.13, 0.58, 0.82], hs: [0.02, -0.6, 0.04] },
      { t: 0.62, pel: [1.46, 0.80], trunk: 2, f: [0.13, 0.58, 0.82] },
      { t: 0.75, pel: [1.18, 0.40], trunk: 8, fL: [0.13, 0.58, 0.82], fR: [-0.13, 0.22, 0.25] },
      { t: 0.88, pel: [0.96, 0.02], trunk: 2, f: [0.13, 0.08, 0] }
    ]),
    phases: [
      P([0, 0.12], '蹲低擺手', 'Load', '手向後擺，臀部向後', 'Swing the arms back, hips back'),
      P([0.12, 0.34], '跳', 'Jump', '手向上擺，爆發跳上', 'Swing the arms up and explode'),
      P([0.34, 0.62], '輕落', 'Land softly', '半蹲落地，膝蓋向外', 'Land softly in a half squat, knees out'),
      P([0.62, 1], '行落', 'Step down', '一隻腳一隻腳行落，唔好跳落', 'Step down one foot at a time')
    ],
    mistakes: [M('落地膝蓋內夾', 'Knees caving on landing'), M('跳落嚟', 'Jumping back down')]
  },
  battle_ropes: {
    period: 0.8, cam: { view: 'q', target: [0, 0.8, 0.6], dist: 4 },
    props: [{ type: 'ropes', anchor: [0, 0.25, 2.6] }],
    fn(t) {
      const a = t * Math.PI * 2;
      return {
        pel: [0.72, -0.12], trunk: 22, f: [0.22, 0.08, 0], fy: 15, kp: [0.4, 0, 1],
        hL: [0.16, 0.92 + 0.17 * Math.sin(a), 0.48], hR: [-0.16, 0.92 - 0.17 * Math.sin(a), 0.48], ep: [0.3, -1, -0.3]
      };
    },
    phases: [P([0, 1], '甩', 'Waves', '半蹲，核心收緊，左右手交替快速上下', 'Half squat, brace, alternate the arms fast')],
    mistakes: [M('企得太直', 'Standing too upright'), M('用腰出力', 'Swinging from the lower back')]
  },
  sled: {
    period: 0.9, cam: { view: 'side', target: [0, 0.7, 0.3], dist: 3.8 },
    props: [{ type: 'sled' }],
    fn(t) {
      const a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      return {
        pel: [0.72, -0.05], trunk: 55, h: [0.22, 1.0, 0.95], ep: [0.4, -1, -0.3],
        fL: [0.12, 0.10 + Math.max(0, c) * 0.14, -0.30 + 0.32 * s], fR: [-0.12, 0.10 + Math.max(0, -c) * 0.14, -0.30 - 0.32 * s], fp: 20, kp: [0.1, 0, 1]
      };
    },
    phases: [P([0, 1], '推', 'Drive', '身體前傾一直線，用前腳掌細步推', 'Lean in with a straight line, drive with short steps on the balls of your feet')],
    mistakes: [M('臀部翹太高', 'Hips too high'), M('步幅太大', 'Overstriding')]
  }
};

export const MOVE_IDS = Object.keys(MOVES);
