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

export function setTarget(id, kg, reps, by) { S.targets[id] = { kg, reps, by: by || null, set: isoToday() }; save('targets'); }
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
    const top = Math.max(...ds.map(x => num(x.weight)));
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
  const tooFast = losing ? -need > safe : need > 0.5;
  if (tooFast) need = losing ? -safe : 0.5;
  const kcal = Math.round(need * 7700 / 7 / 50) * 50, eat = Math.max(1500, td + kcal);
  const trend = slope === null ? null : slope;
  const onTrack = trend !== null && (losing ? trend <= need * 0.8 : trend >= need * 0.8);
  const dir = losing ? t2('減', 'lose') : t2('增', 'gain');
  const zh = `${weeksLeft && weeksLeft > 0 ? `距離期限仲有 ${Math.ceil(weeksLeft)} 星期，` : ''}每星期要${losing ? '減' : '增'}約 ${Math.abs(need).toFixed(2)} kg。` +
    `${trend === null ? '記錄多幾次體重就計到你而家嘅速度。' : `你最近每星期${trend < 0 ? '減' : '增'}緊 ${Math.abs(trend).toFixed(2)} kg，${onTrack ? '進度良好。' : '要調整。'}`}` +
    ` 建議每日食約 ${eat.toLocaleString()} kcal（維持量約 ${td.toLocaleString()}）。${tooFast ? ` 照期限計速度太快，已經限制喺每星期 ${Math.abs(need).toFixed(2)} kg 以內，建議延長期限。` : ''}${eat === 1500 ? ' 已經係建議最低食量，唔好再減。' : ''}`;
  const en = `${weeksLeft && weeksLeft > 0 ? `${Math.ceil(weeksLeft)} weeks to your date, so ` : ''}aim to ${losing ? 'lose' : 'gain'} about ${Math.abs(need).toFixed(2)} kg a week. ` +
    `${trend === null ? 'Log your weight a few more times to measure your pace.' : `Lately you're ${trend < 0 ? 'losing' : 'gaining'} ${Math.abs(trend).toFixed(2)} kg a week, ${onTrack ? 'which is on track.' : 'so adjust.'}`}` +
    ` Eat about ${eat.toLocaleString()} kcal a day (maintenance about ${td.toLocaleString()}).${tooFast ? ` The deadline needs an unsafe pace, so this is capped at ${Math.abs(need).toFixed(2)} kg a week; consider a later date.` : ''}${eat === 1500 ? ' That is the suggested minimum; don\'t go lower.' : ''}`;
  return { state: onTrack ? 'ontrack' : trend === null ? 'nopace' : 'behind', zh, en, eat, td, need, trend, weeksLeft, tooFast, dir };
}
function t2(zh) { return zh; }
