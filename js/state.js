// App state, persistence and game logic.
// Every key keeps the first version's name and shape (ft_ prefix in
// localStorage). New keys are additive only, so the old app can still
// read a backup made by this one.
import { DEFAULT_PLAN, EX, WD, SCORE_CFG, LEVEL_XP, STD, CATS } from './data.js';

const PFX = 'ft_';
export const DB = {
  get(k, d) { try { const v = localStorage.getItem(PFX + k); return v != null ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch { } }
};
const clone = o => JSON.parse(JSON.stringify(o));

export const S = {
  lang: DB.get('lang', 'zh'),
  profile: DB.get('profile', { weight: 75, height: 170, age: 28, goalWeight: 70 }),
  goalId: DB.get('goalId', null),
  goalAnswers: DB.get('goalAnswers', {}),
  weekTasks: DB.get('weekTasks', null),
  customPlan: DB.get('customPlan', clone(DEFAULT_PLAN)),
  logs: DB.get('logs', null),
  history: DB.get('history', []),
  completedTasks: DB.get('completedTasks', {}),
  scores: DB.get('scores', { total: 0, weekly: 0, weekStart: '', breakdown: {}, history: [] }),
  collapsedEx: DB.get('collapsedEx', {}),
  savedWorkouts: DB.get('savedWorkouts', {}),
  // new in v2 (additive)
  bodyLog: DB.get('bodyLog', []),
  restSec: DB.get('restSec', 90),
  lastBackup: DB.get('lastBackup', null),
  logsWeek: DB.get('logsWeek', null),
  lastDay: DB.get('lastDay', null),
  targets: DB.get('targets', {}),
  logDates: DB.get('logDates', {})
};
export function save(...keys) { for (const k of keys) DB.set(k, S[k]); }
export const t = (zh, en) => (S.lang === 'zh' ? zh : en);

// ---------- dates ----------
export function todayKey() { return WD[(new Date().getDay() + 6) % 7]; }
export function todayIdx() { return (new Date().getDay() + 6) % 7; }
export function isoToday() { return new Date().toISOString().slice(0, 10); }
// identical to v1 so stored weekStart values keep matching
export function weekStart(d = new Date()) {
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
}

// ---------- logs ----------
function blankSets(entry) {
  const n = Math.max(1, entry.sets || 3);
  return Array.from({ length: n }, () => ({ weight: 0, reps: typeof entry.reps === 'number' ? entry.reps : 12, done: false }));
}
export function ensLogs() {
  if (!S.logs || typeof S.logs !== 'object') S.logs = {};
  for (const d of WD) {
    if (!S.logs[d]) S.logs[d] = {};
    for (const e of S.customPlan[d] || []) {
      const ex = EX[e.id]; if (!ex || ex.isCardio) continue;
      if (!Array.isArray(S.logs[d][e.id])) S.logs[d][e.id] = blankSets(e);
    }
  }
}
// match the logged set count to the plan's set count
export function syncSets(day, id) {
  const e = (S.customPlan[day] || []).find(x => x.id === id); if (!e) return;
  const arr = S.logs[day][id] || (S.logs[day][id] = []);
  const last = arr[arr.length - 1] || { weight: 0, reps: typeof e.reps === 'number' ? e.reps : 12 };
  while (arr.length < e.sets) arr.push({ weight: last.weight, reps: last.reps, done: false });
  while (arr.length > e.sets && arr.length > 1) arr.pop();
}
// Record the ticked sets of a plan day into history, live (one entry per date + plan day).
export function upsertSession(day, date = isoToday()) {
  const L = S.logs[day] || {}, sets = {};
  Object.entries(L).forEach(([n, arr]) => { if (Array.isArray(arr) && arr.some(x => x.done)) sets[n] = arr.map(x => ({ weight: x.weight, reps: x.reps, done: !!x.done })); });
  const cardio = Object.keys(L).filter(k => k.startsWith('__cardio__') && L[k]).map(k => k.slice(10));
  const old = S.history.find(h => h.date === date && h.day === day);
  S.history = S.history.filter(h => h !== old);
  if (Object.keys(sets).length || cardio.length) S.history.push({ ...(old || {}), date, day, sets, ...(cardio.length ? { cardio } : {}) });
  S.history.sort((a, b) => a.date.localeCompare(b.date));
  S.logDates = { ...(S.logDates || {}), [day]: date };
  save('history', 'logDates');
}
// the most recent date (today or earlier) that fell on this plan day
function lastDateFor(day) { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7 - WD.indexOf(day) + 7) % 7); return d.toISOString().slice(0, 10); }
// A new day clears the ticks (weights you typed stay). Anything ticked is already in history;
// ticks from before this version (never recorded) are saved under the day they belong to first.
export function rolloverDay() {
  const today = isoToday();
  if (S.lastDay === today) return false;
  for (const d of WD) {
    const L = S.logs[d] || {};
    const any = Object.keys(L).some(k => (k.startsWith('__cardio__') && L[k]) || (Array.isArray(L[k]) && L[k].some(x => x.done)));
    if (!any) continue;
    const date = (S.logDates && S.logDates[d]) || lastDateFor(d);
    if (!S.history.some(h => h.date === date && h.day === d)) upsertSession(d, date);
    for (const k of Object.keys(L)) {
      if (k.startsWith('__cardio__')) L[k] = false;
      else if (k.startsWith('__cardioAw__')) delete L[k];
      else if (Array.isArray(L[k])) L[k].forEach(x => { x.done = false; delete x.awarded; });
    }
  }
  S.completedTasks = {};   // habits are daily
  S.lastDay = today; save('logs', 'lastDay', 'completedTasks');
  return true;
}

// ---------- scoring ----------
export function chkWeek() {
  const wk = weekStart();
  if (S.scores.weekStart !== wk) {
    const h = S.scores.history || [];
    if (S.scores.weekly > 0) h.unshift({ week: S.scores.weekStart || wk, score: S.scores.weekly, breakdown: { ...S.scores.breakdown } });
    S.scores = { total: S.scores.total || 0, weekly: 0, weekStart: wk, breakdown: {}, history: h.slice(0, 12) };
    save('scores');
  }
}
export function addPts(type, muscle) {
  chkWeek();
  const pts = SCORE_CFG[type] || 0; if (!pts) return 0;
  S.scores.total = (S.scores.total || 0) + pts;
  S.scores.weekly = (S.scores.weekly || 0) + pts;
  const b = S.scores.breakdown = S.scores.breakdown || {};
  if (muscle) b[muscle] = (b[muscle] || 0) + pts;
  const d = todayKey(); b[d] = (b[d] || 0) + pts; // daily points (v1 read these but never wrote them)
  save('scores');
  return pts;
}
export function grade(pct) {
  if (pct >= 90) return 'S'; if (pct >= 70) return 'A'; if (pct >= 50) return 'B'; if (pct >= 30) return 'C'; return 'D';
}
export function levelXP() {
  const tot = S.scores.total || 0;
  return { level: Math.floor(tot / LEVEL_XP) + 1, xp: tot % LEVEL_XP, pct: Math.round((tot % LEVEL_XP) / LEVEL_XP * 100) };
}

// ---------- body ----------
export const calcBMI = (w, h) => +(w / ((h / 100) ** 2)).toFixed(1);
export function bmiLabel(b) {
  if (b < 18.5) return { zh: '過輕', en: 'Underweight', k: 'low' };
  if (b < 23) return { zh: '正常', en: 'Healthy', k: 'ok' };
  if (b < 27.5) return { zh: '過重', en: 'Overweight', k: 'warn' };
  return { zh: '肥胖', en: 'Obese', k: 'high' };
}
export const tdee = (w, h, a) => Math.round((10 * w + 6.25 * h - 5 * a + 5) * 1.55);
export function logWeight(kg) {
  const d = isoToday();
  S.bodyLog = (S.bodyLog || []).filter(x => x.date !== d);
  S.bodyLog.push({ date: d, kg });
  S.bodyLog.sort((a, b) => a.date.localeCompare(b.date));
  save('bodyLog');
}
export function strLvl(id, w, bw) {
  const s = STD[id]; if (!s || !w || !bw) return null; const r = w / bw;
  const L = [['新手', 'Beginner'], ['初級', 'Novice'], ['中級', 'Intermediate'], ['高級', 'Advanced']];
  if (r < s[0]) return { l: L[0], next: s[0], p: Math.round(r / s[0] * 100) };
  if (r < s[1]) return { l: L[1], next: s[1], p: Math.round((r - s[0]) / (s[1] - s[0]) * 100) };
  if (r < s[2]) return { l: L[2], next: s[2], p: Math.round((r - s[1]) / (s[2] - s[1]) * 100) };
  return { l: L[3], next: null, p: 100 };
}

// ---------- history ----------
export function dSets(day) {
  let done = 0, total = 0;
  Object.values(S.logs[day] || {}).forEach(sets => { if (!Array.isArray(sets)) return; sets.forEach(s => { total++; if (s.done) done++; }); });
  return { done, total };
}
export function prSeries(id) {
  const pts = [];
  S.history.forEach(s => {
    const sets = s.sets && s.sets[id]; if (!Array.isArray(sets)) return;
    // only sets that were actually completed count toward a PR
    const mw = Math.max(0, ...sets.filter(x => x.done !== false).map(x => parseFloat(x.weight) || 0));
    if (mw > 0) pts.push({ date: s.date, weight: mw });
  });
  pts.sort((a, b) => a.date.localeCompare(b.date));
  let run = 0;
  return pts.map(p => { const isPR = p.weight > run; if (isPR) run = p.weight; return { ...p, isPR }; });
}
export const bestWeight = id => Math.max(0, ...prSeries(id).map(p => p.weight));
export function lastSession(id) {
  const today = isoToday();
  for (let i = S.history.length - 1; i >= 0; i--) {
    const s = S.history[i]; if (s.date === today) continue; const sets = s.sets && s.sets[id];
    if (Array.isArray(sets) && sets.some(x => x.done)) return { date: s.date, sets };
  }
  return null;
}
export function streak() {
  const days = new Set(S.history.map(h => h.date));
  let n = 0; const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  // rest days (no plan) don't break the streak
  for (let i = 0; i < 400; i++) {
    const iso = d.toISOString().slice(0, 10), wd = WD[(d.getDay() + 6) % 7];
    if (days.has(iso)) n++;
    else if ((S.customPlan[wd] || []).length) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function prsThisMonth() {
  const m = isoToday().slice(0, 7); let n = 0;
  const ids = new Set(); S.history.forEach(h => Object.keys(h.sets || {}).forEach(k => ids.add(k)));
  ids.forEach(id => prSeries(id).forEach((p, i) => { if (p.isPR && i > 0 && p.date.startsWith(m)) n++; }));
  return n;
}
export function trainedIds() {
  const c = {}; S.history.forEach(h => Object.keys(h.sets || {}).forEach(k => { c[k] = (c[k] || 0) + 1; }));
  return Object.keys(c).filter(k => EX[k] && !EX[k].isCardio).sort((a, b) => c[b] - c[a]);
}

// day title from what is actually planned (v1 used fixed labels)
export function dayFocus(day) {
  const plan = (S.customPlan[day] || []).map(e => EX[e.id]).filter(e => e && !e.isCardio);
  if (!plan.length) return (S.customPlan[day] || []).length ? 'cardio' : null;
  const c = {}; plan.forEach(e => { c[e.cat] = (c[e.cat] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0];
}
export function dayTitle(day) {
  const f = dayFocus(day);
  if (!f) return t('休息日', 'Rest day');
  return t(CATS[f].zhL + '日', CATS[f].en + ' day');
}

// ---------- tasks ----------
export function genTasks(gId, ans, profile) {
  const w = profile.weight || 75, h2 = profile.height || 170, a = profile.age || 28;
  const td = tdee(w, h2, a); const tasks = {};
  for (let i = 0; i < 7; i++) {
    const dt = [];
    if (gId === 'lose_weight') {
      const app = ans.approach || 'weights_cardio';
      if (app === 'cardio_only') { if (i < 5) dt.push({ zh: '有氧45分鐘', en: 'Cardio 45 min', type: 'cardio', pts: 15 }); else dt.push({ zh: '休息', en: 'Rest', type: 'rest', pts: 3 }); }
      else if (app === 'weights_cardio') {
        if (i === 0 || i === 2 || i === 4) { dt.push({ zh: '力量訓練45分鐘', en: 'Weight training 45 min', type: 'strength', pts: 15 }); dt.push({ zh: 'HIIT有氧20分鐘', en: 'HIIT 20 min', type: 'cardio', pts: 10 }); }
        else if (i === 1 || i === 3) dt.push({ zh: '穩態有氧40分鐘', en: 'Cardio 40 min', type: 'cardio', pts: 10 });
        else dt.push({ zh: '休息/拉伸', en: 'Rest/stretch', type: 'rest', pts: 3 });
      } else { if (i < 4) dt.push({ zh: '力量訓練60分鐘', en: 'Weight training 60 min', type: 'strength', pts: 15 }); else dt.push({ zh: '休息', en: 'Rest', type: 'rest', pts: 3 }); }
      dt.push({ zh: `飲水${(w * 0.033).toFixed(1)}L`, en: `Drink ${(w * 0.033).toFixed(1)}L`, type: 'habit', pts: 5 });
      dt.push({ zh: `蛋白質${Math.round(w * 1.8)}g`, en: `Protein ${Math.round(w * 1.8)}g`, type: 'diet', pts: 5 });
      dt.push({ zh: `卡路里${td - 550}kcal`, en: `Calories ${td - 550}kcal`, type: 'diet', pts: 5 });
      if (i === 6) dt.push({ zh: '量體重並記錄', en: 'Weigh in and log', type: 'track', pts: 8 });
    } else if (gId === 'build_muscle') {
      const gym = parseInt(ans.gym_days || 4); const gi = gym >= 5 ? [0, 1, 2, 3, 4] : gym === 4 ? [0, 1, 3, 4] : gym === 3 ? [0, 2, 4] : [0, 3];
      const sp = [['胸部', 'Chest'], ['背部', 'Back'], ['腿部', 'Legs'], ['肩膀', 'Shoulders'], ['手臂', 'Arms']]; const gs = gi.indexOf(i);
      if (gs >= 0) { const x = sp[gs % sp.length]; dt.push({ zh: `力量訓練—${x[0]}`, en: `Train—${x[1]}`, type: 'strength', pts: 15 }); dt.push({ zh: '熱身10分鐘', en: 'Warm-up 10 min', type: 'cardio', pts: 5 }); }
      else dt.push({ zh: '主動恢復', en: 'Active recovery', type: 'rest', pts: 5 });
      dt.push({ zh: `蛋白質${Math.round(w * 2.0)}g`, en: `Protein ${Math.round(w * 2.0)}g`, type: 'diet', pts: 5 });
      dt.push({ zh: `卡路里${td + 400}kcal`, en: `Calories ${td + 400}kcal`, type: 'diet', pts: 5 });
      if (i === 6) dt.push({ zh: '量體圍記錄', en: 'Measure body', type: 'track', pts: 8 });
    } else {
      if (i < 5) dt.push({ zh: '運動30分鐘', en: 'Exercise 30 min', type: 'cardio', pts: 10 }); else dt.push({ zh: '休息', en: 'Rest', type: 'rest', pts: 3 });
      dt.push({ zh: `飲水${(w * 0.033).toFixed(1)}L`, en: `Drink ${(w * 0.033).toFixed(1)}L`, type: 'habit', pts: 5 });
      dt.push({ zh: '5份蔬菜水果', en: '5 portions fruit & veg', type: 'diet', pts: 5 });
      if (i === 6) dt.push({ zh: '量體重', en: 'Weigh in', type: 'track', pts: 5 });
    }
    tasks[i] = dt;
  }
  return tasks;
}
export function habitTasks() {
  const w = S.profile.weight || 75, i = todayIdx();
  const h = [
    { id: 'water', icon: 'drop', zh: `飲水 ${(w * 0.033).toFixed(1)}L`, en: `Drink ${(w * 0.033).toFixed(1)}L water`, pts: 5 },
    { id: 'protein', icon: 'food', zh: `蛋白質 ${Math.round(w * 1.8)}g`, en: `Hit ${Math.round(w * 1.8)}g protein`, pts: 5 },
    { id: 'sleep', icon: 'moon', zh: '10:30 前上床（7–9 小時）', en: 'In bed by 10:30pm (7–9h)', pts: 5 },
    { id: 'steps', icon: 'walk', zh: '行 8,000 步', en: 'Walk 8,000 steps', pts: 5 }
  ];
  if (i === 6) h.push({ id: 'weigh', icon: 'scale', zh: '朝早空肚量體重', en: 'Weigh in (morning, fasted)', pts: 8 });
  return h.map(x => ({ ...x, key: 'h-today-' + x.id + '-' + i }));
}

// ---------- backup ----------
export function exportPayload() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PFX)) data[k] = localStorage.getItem(k); }
  return { app: 'FitTrack', version: 2, exportedAt: new Date().toISOString(), data };
}
export function importPayload(p) {
  let entries;
  if (p && p.data && typeof p.data === 'object') entries = Object.entries(p.data);
  else if (p && p.logs) entries = Object.entries(p).filter(([k]) => k !== 'exportedAt').map(([k, v]) => [PFX + k, JSON.stringify(v)]);
  else throw new Error('not a FitTrack backup');
  const keep = entries.filter(([k]) => k.startsWith(PFX));
  if (!keep.length) throw new Error('backup is empty');
  keep.forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
}

// Rebuild points from the workout history (sets, cardio, PRs, finished workouts).
// Used once to undo points inflated by the first version's untick/retick bug.
export function recomputeScores() {
  const wk = weekStart(), sc = { total: 0, weekly: 0, weekStart: wk, breakdown: {}, history: [] }, weeks = {};
  const add = (date, pts, muscle) => {
    sc.total += pts;
    if (date >= wk) { sc.weekly += pts; if (muscle) sc.breakdown[muscle] = (sc.breakdown[muscle] || 0) + pts; const d = WD[(new Date(date + 'T12:00:00').getDay() + 6) % 7]; sc.breakdown[d] = (sc.breakdown[d] || 0) + pts; }
    else { const w = weekStart(new Date(date + 'T12:00:00')); weeks[w] = (weeks[w] || 0) + pts; }
  };
  const best = {};
  [...S.history].sort((a, b) => a.date.localeCompare(b.date)).forEach(h => {
    Object.entries(h.sets || {}).forEach(([id, arr]) => {
      if (!Array.isArray(arr)) return; const ex = EX[id]; const done = arr.filter(x => x.done !== false);
      done.forEach(() => add(h.date, SCORE_CFG.set_done, ex ? ex.cat : null));
      const top = Math.max(0, ...done.map(x => parseFloat(x.weight) || 0));
      if (top > 0 && best[id] > 0 && top > best[id]) add(h.date, SCORE_CFG.pr_broken, ex ? ex.cat : null);
      if (top > (best[id] || 0)) best[id] = top;
    });
    (h.cardio || []).forEach(() => add(h.date, SCORE_CFG.set_done, 'cardio'));
  });
  Object.keys(S.savedWorkouts || {}).forEach(k => { const m = /^saved_(\d{4}-\d{2}-\d{2})_/.exec(k); if (m) add(m[1], SCORE_CFG.workout_saved, null); });
  sc.history = Object.entries(weeks).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([week, score]) => ({ week, score, breakdown: {} }));
  S.scores = sc; save('scores');
  return sc;
}

export function boot() {
  if (!DB.get('scoreFix1', false)) { recomputeScores(); DB.set('scoreFix1', true); }
  if (!S.customPlan || typeof S.customPlan !== 'object') S.customPlan = clone(DEFAULT_PLAN);
  for (const d of WD) if (!Array.isArray(S.customPlan[d])) S.customPlan[d] = [];
  ensLogs();
  rolloverDay();
  chkWeek();
  save('logs');
}
