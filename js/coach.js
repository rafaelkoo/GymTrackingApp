// Targets and suggestions. Plain rules, no AI:
// - next load: double progression (hit every rep -> add weight; miss twice -> drop 10%)
// - target pace: weekly e1RM trend vs the pace the deadline needs
// - body weight: weekly trend vs the pace the goal date needs, as a daily calorie change
import { EX, WD } from './data.js';
import { S, save, isoToday, tdee } from './state.js';

const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
export const e1rm = (w, r) => (r <= 1 ? w : w * (1 + r / 30));   // Epley
const DAY = 864e5;
const days = (a, b) => (new Date(b) - new Date(a)) / DAY;

if (!S.targets || typeof S.targets !== 'object') S.targets = {};

export function setTarget(id, kg, reps, by) {
  const ses = sessions(id, false), base = ses.length ? Math.max(...ses.map(x => x.e1)) : 0;
  const old = S.targets[id];
  // keep the original start (and its plan) when only the deadline or numbers are edited the same day
  S.targets[id] = { kg, reps, by: by || null, set: old && old.set === isoToday() ? old.set : isoToday(), base: old && old.set === isoToday() ? old.base : base };
  save('targets');
}
export function clearTarget(id) { delete S.targets[id]; save('targets'); }

// smallest sensible jump for this exercise
export function increment(id) {
  const e = EX[id]; if (!e) return 2.5;
  if (e.equip === 'Bodyweight') return 0;
  if (e.equip === 'Dumbbell') return 2;
  if (e.equip === 'Barbell' && (e.cat === 'legs' || id === 'deadlift' || id === 'sumo_deadlift' || id === 'rdl')) return 5;
  return 2.5;
}
const roundTo = (v, step) => step ? Math.round(v / step) * step : Math.round(v);

export function planReps(id, prefer) {
  for (const d of [prefer, ...WD]) { const e = d && (S.customPlan[d] || []).find(x => x.id === id); if (e && typeof e.reps === 'number') return e.reps; }
  const t = S.targets[id]; return t ? t.reps : 10;
}

// completed sessions for an exercise, oldest first (optionally leaving today out)
export function sessions(id, skipToday) {
  const today = isoToday(), out = [];
  for (const h of S.history) {
    if (skipToday && h.date === today) continue;
    const sets = h.sets && h.sets[id]; if (!Array.isArray(sets)) continue;
    const ds = sets.filter(x => x.done !== false && num(x.reps) > 0); if (!ds.length) continue;
    // working weight = the weight used for the most sets (ties go to the heavier), so one heavy top set doesn't count as the norm
    const cnt = {}; ds.forEach(x => { const w = num(x.weight); cnt[w] = (cnt[w] || 0) + 1; });
    const top = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b - a)[0];
    out.push({ date: h.date, sets: ds, top, e1: Math.max(...ds.map(x => e1rm(num(x.weight), num(x.reps)))), atTop: ds.filter(x => num(x.weight) === top) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// what to lift next time
export function nextLoad(id, prefer) {
  const e = EX[id]; if (!e || e.isCardio) return null;
  const ses = sessions(id, true), reps = planReps(id, prefer), inc = increment(id);
  if (!ses.length) return null;
  const last = ses[ses.length - 1], prev = ses[ses.length - 2];
  const hit = s => s.atTop.every(x => num(x.reps) >= reps);
  if (inc === 0) { // bodyweight: progress reps
    const best = Math.max(...last.sets.map(x => num(x.reps)));
    return hit(last) ? { kg: 0, reps: best + 1, kind: 'up', zh: '上次全部做足，下次每組加 1 次', en: 'You hit every rep last time; add one rep per set' }
      : { kg: 0, reps, kind: 'same', zh: `上次未做足，下次再挑戰每組 ${reps} 次`, en: `Missed some reps; aim for ${reps} per set again` };
  }
  if (hit(last)) return { kg: roundTo(last.top + inc, inc), reps, kind: 'up', zh: `上次 ${last.top} kg 全部組數做足 ${reps} 次，可以加 ${inc} kg`, en: `You hit ${reps} reps on every set at ${last.top} kg, so add ${inc} kg` };
  if (prev && prev.top === last.top && !hit(prev)) {
    const kg = Math.max(inc, roundTo(last.top * 0.9, inc));
    return { kg, reps, kind: 'down', zh: `連續兩次喺 ${last.top} kg 做唔足，減到 ${kg} kg 重新起步`, en: `Missed reps at ${last.top} kg twice; drop to ${kg} kg and build back up` };
  }
  return { kg: last.top, reps, kind: 'same', zh: `維持 ${last.top} kg，目標每組做足 ${reps} 次`, en: `Stay at ${last.top} kg and aim for ${reps} reps on every set` };
}

// least-squares slope (units per week) over the last `weeks`
function weeklySlope(pts, weeks) {
  if (pts.length < 2) return null;
  const end = pts[pts.length - 1].date, use = pts.filter(p => days(p.date, end) <= weeks * 7);
  if (use.length < 2) return null;
  const xs = use.map(p => days(use[0].date, p.date) / 7), ys = use.map(p => p.v);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  return sxx > 0 ? sxy / sxx : null;
}

// how a target is going
export function targetStatus(id) {
  const tg = S.targets[id]; if (!tg) return null;
  const ses = sessions(id, false), goal = e1rm(tg.kg, tg.reps);
  if (!ses.length) return { tg, goal, cur: 0, pct: 0, state: 'nodata' };
  const cur = ses[ses.length - 1].e1, best = Math.max(...ses.map(s => s.e1));
  const reached = ses.some(s => s.sets.some(x => num(x.weight) >= tg.kg && num(x.reps) >= tg.reps));
  const pct = Math.min(100, Math.round(best / goal * 100));
  if (reached || best >= goal) return { tg, goal, cur: best, pct: 100, state: 'done' };
  const slope = weeklySlope(ses.map(s => ({ date: s.date, v: s.e1 })), 8);
  const weeksLeft = tg.by ? days(isoToday(), tg.by) / 7 : null;
  const need = weeksLeft && weeksLeft > 0 ? (goal - best) / weeksLeft : null;
  const eta = slope && slope > 0.05 ? (goal - best) / slope : null;
  let state = 'nopace';
  if (weeksLeft !== null && weeksLeft <= 0) state = 'late';
  else if (need !== null && slope !== null) state = slope >= need * 0.9 ? 'ontrack' : 'behind';
  else if (slope !== null) state = slope > 0.05 ? 'improving' : 'flat';
  return { tg, goal, cur: best, pct, slope, need, weeksLeft, eta, state };
}

// advice text for a target
export function targetAdvice(id, st) {
  if (!st) return null;
  const inc = increment(id);
  switch (st.state) {
    case 'done': return { zh: '已經達標！可以設一個新目標。', en: 'Target reached! Set a new one.' };
    case 'nodata': return { zh: '完成一次訓練之後就會計到進度。', en: 'Log a session to start tracking progress.' };
    case 'late': return { zh: '期限已過。可以延長期限，或者將目標調低少少。', en: 'The deadline has passed. Extend it or lower the target a little.' };
    case 'ontrack': return { zh: '進度良好，照而家嘅節奏繼續加重就得。', en: 'On track. Keep adding weight at this pace.' };
    case 'behind': {
      const extra = st.slope > 0 ? Math.ceil((st.goal - st.cur) / st.slope / 4.345) : null;
      return { zh: `進度落後。每星期要進步約 ${st.need.toFixed(1)} kg（1RM），而家係 ${Math.max(0, st.slope).toFixed(1)} kg。試吓：每次做足就即刻加 ${inc || 1}${inc ? ' kg' : ' 次'}、每星期練多一次呢個動作，同埋確保瞓夠同食夠蛋白質。${extra ? `照而家速度大約要 ${extra} 個月。` : ''}`,
        en: `Behind. You need about ${st.need.toFixed(1)} kg/week of est. 1RM; you're at ${Math.max(0, st.slope).toFixed(1)}. Try adding ${inc || 1}${inc ? ' kg' : ' rep'} as soon as you hit every rep, training it one more time a week, and getting enough sleep and protein.${extra ? ` At this pace it takes about ${extra} months.` : ''}` };
    }
    case 'improving': return { zh: `每星期進步約 ${st.slope.toFixed(1)} kg（1RM）${st.eta ? `，預計約 ${Math.ceil(st.eta)} 星期達標` : ''}。設定期限就會知夠唔夠快。`, en: `Improving about ${st.slope.toFixed(1)} kg/week${st.eta ? `, about ${Math.ceil(st.eta)} weeks to go` : ''}. Add a deadline to check the pace.` };
    case 'flat': return { zh: '最近冇進步。試吓減輕 10% 再重新加上去，或者換一個相近動作練幾星期。', en: 'No progress lately. Try dropping 10% and building back up, or swap in a similar exercise for a few weeks.' };
    default: return { zh: '再記錄多幾次就計到進度速度。', en: 'Log a few more sessions to measure your pace.' };
  }
}

// body weight goal: trend vs required pace, as a daily calorie change
export function bodyAdvice() {
  const p = S.profile, log = (S.bodyLog || []).map(x => ({ date: x.date, v: x.kg }));
  const cur = log.length ? log[log.length - 1].v : p.weight, goal = p.goalWeight, diff = goal - cur;
  const td = tdee(p.weight, p.height, p.age);
  if (Math.abs(diff) < 0.3) return { state: 'done', zh: '已經喺目標體重，保持而家嘅食量就得。', en: 'You are at your goal weight. Keep eating as you are.', td };
  const slope = weeklySlope(log, 4);
  const weeksLeft = p.goalDate ? days(isoToday(), p.goalDate) / 7 : null;
  const losing = diff < 0, safe = cur * 0.01;   // about 1% of body weight per week at most
  let need = weeksLeft && weeksLeft > 0 ? diff / weeksLeft : (losing ? -0.5 : 0.25);
  const rawNeed = need;
  const tooFast = losing ? -need > safe : need > 0.5;
  if (tooFast) need = losing ? -safe : 0.5;
  const kcal = Math.round(need * 7700 / 7 / 50) * 50, eat = Math.max(1500, td + kcal);
  const trend = slope === null ? null : slope;
  const onTrack = trend !== null && (losing ? trend <= need * 0.8 : trend >= need * 0.8);
  const dir = losing ? t2('減', 'lose') : t2('增', 'gain');
  const zh = (tooFast && weeksLeft > 0 ? `距離期限仲有 ${Math.ceil(weeksLeft)} 星期，照期限每星期要${losing ? '減' : '增'} ${Math.abs(rawNeed).toFixed(2)} kg，太快。按安全速度，每星期${losing ? '減' : '增'}約 ${Math.abs(need).toFixed(2)} kg。`
    : `${weeksLeft && weeksLeft > 0 ? `距離期限仲有 ${Math.ceil(weeksLeft)} 星期，` : ''}每星期要${losing ? '減' : '增'}約 ${Math.abs(need).toFixed(2)} kg。`) +
    `${trend === null ? '記錄多幾次體重就計到你而家嘅速度。' : `你最近每星期${trend < 0 ? '減' : '增'}緊 ${Math.abs(trend).toFixed(2)} kg，${onTrack ? '進度良好。' : '要調整。'}`}` +
    ` 建議每日食約 ${eat.toLocaleString()} kcal（維持量約 ${td.toLocaleString()}）。${tooFast ? ' 建議將期限延後，或者接受遲少少達標。' : ''}${eat === 1500 ? ' 已經係建議最低食量，唔好再減。' : ''}`;
  const en = (tooFast && weeksLeft > 0 ? `${Math.ceil(weeksLeft)} weeks to your date would need ${Math.abs(rawNeed).toFixed(2)} kg a week, which is too fast. At a safe pace, aim for about ${Math.abs(need).toFixed(2)} kg a week. `
    : `${weeksLeft && weeksLeft > 0 ? `${Math.ceil(weeksLeft)} weeks to your date, so ` : ''}aim to ${losing ? 'lose' : 'gain'} about ${Math.abs(need).toFixed(2)} kg a week. `) +
    `${trend === null ? 'Log your weight a few more times to measure your pace.' : `Lately you're ${trend < 0 ? 'losing' : 'gaining'} ${Math.abs(trend).toFixed(2)} kg a week, ${onTrack ? 'which is on track.' : 'so adjust.'}`}` +
    ` Eat about ${eat.toLocaleString()} kcal a day (maintenance about ${td.toLocaleString()}).${tooFast ? ' Consider a later date.' : ''}${eat === 1500 ? ' That is the suggested minimum; don\'t go lower.' : ''}`;
  return { state: onTrack ? 'ontrack' : trend === null ? 'nopace' : 'behind', zh, en, eat, td, need, trend, weeksLeft, tooFast, dir };
}
function t2(zh) { return zh; }

// ── week-by-week plan to a target ──
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export function targetPlan(id, prefer) {
  const tg = S.targets[id]; if (!tg) return null;
  const ses = sessions(id, false), goal = e1rm(tg.kg, tg.reps), inc = increment(id) || 0, reps = planReps(id, prefer);
  // starting point: best est. 1RM when the target was set (or the first session after)
  let base = tg.base || 0;
  if (!base) { const before = ses.filter(x => x.date <= tg.set); base = before.length ? Math.max(...before.map(x => x.e1)) : (ses[0] ? ses[0].e1 : 0); }
  if (!base) return { tg, empty: true };
  const start = tg.set;
  // a steady, sustainable pace is about 1.5% of est. 1RM a week; faster than 2.5% is aggressive
  const steadyWeeks = Math.max(1, Math.ceil((goal - base) / (base * 0.015)));
  const weeks = tg.by ? Math.max(1, Math.ceil(days(start, tg.by) / 7)) : Math.min(52, steadyWeeks);
  const perWeek = (goal - base) / weeks, pct = perWeek / base * 100;
  const aggressive = tg.by && pct > 2.5;
  const suggestBy = addDays(start, steadyWeeks * 7);
  const today = isoToday(), out = [];
  let prevKg = 0;
  for (let i = 1; i <= weeks; i++) {
    const ws = addDays(start, (i - 1) * 7), we = addDays(start, i * 7);   // [ws, we)
    const last = i === weeks, e = base + perWeek * i;
    let r = last ? tg.reps : reps, kg = e / (1 + (r <= 1 ? 0 : r / 30));
    kg = inc ? Math.round(kg / inc) * inc : Math.round(kg);
    if (last) kg = tg.kg;
    if (kg < prevKg) kg = prevKg; prevKg = kg;
    const inWeek = ses.filter(x => x.date >= ws && x.date < we);
    const best = inWeek.length ? Math.max(...inWeek.map(x => x.e1)) : 0;
    const hit = best >= e1rm(kg, r) * 0.98;
    const status = we <= today ? (hit ? 'hit' : inWeek.length ? 'miss' : 'skip') : ws <= today ? (hit ? 'hit' : 'now') : 'next';
    out.push({ n: i, ws, we, kg, reps: r, e1: e, status, best });
  }
  const cur = out.find(w => w.status === 'now') || out.find(w => w.status === 'next') || null;
  return { tg, base, goal, weeks: out, perWeek, pct, aggressive, suggestBy, steadyWeeks, cur };
}

// ── week-by-week body-weight plan, anchored where it started ──
// The plan starts on the day the goal (weight or date) was set, so "week 3" always means the same week.
export function ensureBodyStart(reset) {
  const p = S.profile, log = S.bodyLog || [];
  if (!reset && p.goalStart && p.goalStart.date && p.goalStart.kg) return p.goalStart;
  const today = isoToday(), last = log.filter(x => x.date <= today).pop();
  p.goalStart = { date: today, kg: last ? last.kg : p.weight }; save('profile');
  return p.goalStart;
}
export function bodyPlan() {
  const p = S.profile, log = S.bodyLog || [], st = ensureBodyStart();
  const goal = p.goalWeight, diff = goal - st.kg;
  if (Math.abs(diff) < 0.3) return null;
  const losing = diff < 0, cap = losing ? st.kg * 0.01 : 0.5, today = isoToday();
  const wantWeeks = p.goalDate ? Math.max(1, Math.ceil(days(st.date, p.goalDate) / 7)) : null;
  const minWeeks = Math.ceil(Math.abs(diff) / cap);
  const weeks = Math.min(52, Math.max(wantWeeks || Math.ceil(Math.abs(diff) / (losing ? 0.5 : 0.25)), minWeeks));
  const per = diff / weeks, out = [];
  for (let i = 1; i <= weeks; i++) out.push({ n: i, date: addDays(st.date, i * 7), kg: Math.round((st.kg + per * i) * 10) / 10 });
  // where you should be today, and where you are
  const elapsed = Math.max(0, days(st.date, today)), weekNo = Math.min(weeks, Math.floor(elapsed / 7) + 1);
  const expected = Math.round((st.kg + per * Math.min(weeks, elapsed / 7)) * 10) / 10;
  const lastLog = log.filter(x => x.date <= today).pop();
  const actual = lastLog ? lastLog.kg : null;
  const ahead = actual === null ? null : Math.round((losing ? expected - actual : actual - expected) * 10) / 10; // + = ahead of plan
  const done = actual !== null && (losing ? actual <= goal : actual >= goal);
  return { weeks: out, per, start: st, goal, losing, weekNo, total: weeks, expected, actual, lastLog, ahead, done,
    capped: wantWeeks !== null && minWeeks > wantWeeks, safeDate: addDays(st.date, minWeeks * 7), endDate: addDays(st.date, weeks * 7) };
}

// one-line weekly report for an exercise target
export function targetReport(id) {
  const pl = targetPlan(id); if (!pl || pl.empty) return null;
  const today = isoToday(), wk = pl.weeks.find(w => w.ws <= today && today < w.we) || (today >= pl.weeks[pl.weeks.length - 1].we ? pl.weeks[pl.weeks.length - 1] : pl.weeks[0]);
  const ses = sessions(id, false), recent = ses.filter(x => days(x.date, today) < 14);
  const bestNow = recent.length ? Math.max(...recent.map(x => x.e1)) : (ses.length ? ses[ses.length - 1].e1 : 0);
  const shouldE1 = e1rm(wk.kg, wk.reps), gap = bestNow - shouldE1;   // + = ahead
  return { pl, wk, bestNow, shouldE1, gap, hitThisWeek: wk.status === 'hit' };
}

// ── strength progress for every lift (no target needed) ──
// The clock starts at your first session, or at your comeback after a break of more than 4 weeks.
// Expected est. 1RM grows about 1.5% a week for the first 12 weeks, 1% to week 26, then 0.5%.
const GAP_DAYS = 28;
function growth(weeks) {
  let f = 1;
  for (let i = 1; i <= Math.floor(weeks); i++) f *= 1 + (i <= 12 ? 0.015 : i <= 26 ? 0.01 : 0.005);
  const frac = weeks - Math.floor(weeks), nx = Math.floor(weeks) + 1;
  return f * (1 + frac * (nx <= 12 ? 0.015 : nx <= 26 ? 0.01 : 0.005));
}
// turn an est. 1RM into a set to do: weight on your plate steps, extra reps before the next jump
function setFor(e, reps, inc) {
  const per = 1 + (reps <= 1 ? 0 : reps / 30);
  let kg = inc ? Math.floor(e / per / inc) * inc : Math.floor(e / per);
  if (kg <= 0) kg = inc || 1;
  let r = reps;
  if (kg * per < e * 0.99) { r = Math.ceil(30 * (e / kg - 1)); if (r > reps + 5) { kg += inc || 1; r = reps; } }
  return { kg, reps: Math.max(reps, r) };
}
export function strengthReport(id, prefer) {
  const e = EX[id]; if (!e || e.isCardio) return null;
  const inc = increment(id); if (inc === 0) return null;
  const ses = sessions(id, false).filter(s => s.top > 0); if (!ses.length) return null;
  let a = 0; for (let i = 1; i < ses.length; i++) if (days(ses[i - 1].date, ses[i].date) > GAP_DAYS) a = i;
  const run = ses.slice(a), start = run[0].date, today = isoToday();
  const base = Math.max(...run.filter(s => days(start, s.date) < 7).map(s => s.e1));
  const reps = planReps(id, prefer), weeksIn = Math.max(0, days(start, today) / 7), weekNo = Math.floor(weeksIn) + 1;
  const expE = base * growth(weeksIn), should = setFor(expE, reps, inc);
  const recent = run.filter(s => days(s.date, today) < 14);
  const bestS = recent.length ? recent.reduce((m, s) => (s.e1 > m.e1 ? s : m)) : null;
  let you = null;
  if (bestS) { const top = bestS.sets.reduce((m, x) => (e1rm(num(x.weight), num(x.reps)) > e1rm(num(m.weight), num(m.reps)) ? x : m)); you = { kg: num(top.weight), reps: num(top.reps) }; }
  const gap = bestS ? bestS.e1 / expE - 1 : null;   // + = ahead
  const state = weekNo === 1 ? 'start' : !bestS ? 'idle' : gap >= -0.02 ? 'ontrack' : gap >= -0.06 ? 'close' : 'behind';
  const ahead = [4, 8].map(k => ({ k, ...setFor(base * growth(weeksIn + k), reps, inc) }));
  const daysOff = days(run[run.length - 1].date, today);
  return { id, start, weekNo, sessions: run.length, base, expE, should, you, gap, state, ahead, comeback: a > 0, daysOff };
}

// ── weekly review ──
// Due from the most recent review day until you mark it done.
export function lastReviewDate() {
  const want = WD.indexOf(S.reviewDay || 'Sun'), d = new Date(isoToday() + 'T12:00:00');
  const back = ((d.getDay() + 6) % 7 - want + 7) % 7; d.setDate(d.getDate() - back);
  return d.toISOString().slice(0, 10);
}
export function reviewDue() {
  const since = lastReviewDate();
  return !(S.reviews || []).some(r => r.date >= since);
}
export function weeklyReview() {
  const today = isoToday(), from = addDays(today, -6);
  const inWeek = S.history.filter(h => h.date >= from && h.date <= today && (Object.keys(h.sets || {}).length || (h.cardio || []).length));
  const dates = [...new Set(inWeek.map(h => h.date))];
  const planned = WD.filter(d => (S.customPlan[d] || []).length).length;
  // lifts trained this week
  const ids = [...new Set(inWeek.flatMap(h => Object.keys(h.sets || {})))].filter(id => EX[id] && !EX[id].isCardio);
  const lifts = ids.map(id => {
    if (S.targets[id]) { const r = targetReport(id); return r ? { id, kind: 'target', ok: r.hitThisWeek || r.gap >= 0, r } : null; }
    const r = strengthReport(id); return r ? { id, kind: 'lift', base: r.state === 'start', ok: r.state === 'ontrack', close: r.state === 'close', r } : null;
  }).filter(Boolean);
  // personal bests this week (est. 1RM above everything before)
  const prs = ids.filter(id => { const ses = sessions(id, false), old = ses.filter(s => s.date < from), now = ses.filter(s => s.date >= from);
    return old.length && now.length && Math.max(...now.map(s => s.e1)) > Math.max(...old.map(s => s.e1)); });
  const bp = bodyPlan(), log = S.bodyLog || [], weighed = log.some(x => x.date >= from && x.date <= today);
  const nextBody = bp ? bp.weeks.find(w => w.date > today) : null;
  // next week: what to lift on each planned exercise
  const next = [...new Set(WD.flatMap(d => (S.customPlan[d] || []).map(e => e.id)))].filter(id => EX[id] && !EX[id].isCardio)
    .map(id => ({ id, s: nextLoad(id) })).filter(x => x.s && x.s.kg).slice(0, 8);
  const judged = lifts.filter(l => !l.base), behind = judged.filter(l => !l.ok && !l.close).length;
  const score = (planned ? Math.min(1, dates.length / planned) : 1) * 60 + (judged.length ? (judged.filter(l => l.ok).length / judged.length) * 25 : 12) + (weighed ? 15 : 0);
  return { from, to: today, judged, done: dates.length, planned, lifts, prs, bp, weighed, nextBody, next, behind, score: Math.round(score) };
}
export function saveReview(rv) {
  if (!Array.isArray(S.reviews)) S.reviews = [];
  const lastKg = (S.bodyLog || []).filter(x => x.date <= rv.to).pop();
  S.reviews = S.reviews.filter(r => r.date !== rv.to);
  S.reviews.push({ date: rv.to, done: rv.done, planned: rv.planned, ok: rv.judged.filter(l => l.ok).length, lifts: rv.judged.length, prs: rv.prs.length, kg: lastKg ? lastKg.kg : null, score: rv.score });
  S.reviews.sort((a, b) => a.date.localeCompare(b.date)); save('reviews');
}
