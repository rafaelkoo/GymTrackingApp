// FitTrack UI: screens, events and the exercise sheet.
import { EX, EX_LIST, CATS, WD, WD_ZH, WD_LONG, GOALS, GQS, LEVEL_XP, SCORE_CFG, DEFAULT_PLAN, bodyParts, muscleZh, equipZh, levelZh } from './data.js';
import { MOVES } from './moves.js';
import {
  S, save, t, todayKey, todayIdx, isoToday, weekStart, ensLogs, syncSets, chkWeek, addPts, grade, levelXP,
  calcBMI, bmiLabel, tdee, logWeight, strLvl, dSets, prSeries, bestWeight, lastSession, streak, prsThisMonth,
  trainedIds, dayFocus, dayTitle, genTasks, habitTasks, exportPayload, importPayload, upsertSession, rolloverDay
} from './state.js';
import { nextLoad, targetStatus, targetAdvice, bodyAdvice, setTarget, clearTarget, e1rm, planReps, targetPlan, bodyPlan, ensureBodyStart, targetReport, strengthReport, reviewDue, weeklyReview, saveReview, lastReviewDate, liftGoals, liftGoal, cutting, scheme, schemeChanges, applyScheme, isCompound } from './coach.js';

const ui = {
  tab: 'today', day: todayKey(), planDay: todayKey(), libQ: '', libCat: 'all', addTo: null,
  progEx: null, progRange: '12w', ob: null, sheet: null, viewer: null,
  timer: { left: 0, max: 0, on: false, go: false, h: 0 }
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const exName = e => t(e.zh, e.en);
const catName = c => t(CATS[c].zhL, CATS[c].en);
const dayShort = d => t(WD_ZH[d], d);
const dayLong = d => t(WD_LONG[d][0], WD_LONG[d][1]);

// ---------- icons ----------
const P = {
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z', plan: 'M4 6h16M4 12h16M4 18h10', chart: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  book: 'M6 4h11a1 1 0 011 1v15H7a2 2 0 01-2-2V5a1 1 0 011-1zM5 18a2 2 0 012-2h11', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  check: 'M5 12.5l4.5 4.5L19 7.5', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M6 6l12 12M18 6L6 18', back: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7', down: 'M6 9l6 6 6-6', cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2M9 2h6', play: 'M7 5l12 7-12 7z', pause: 'M8 5v14M16 5v14',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a3 3 0 003 3M16 6h4v1a3 3 0 01-3 3M12 13v4M8 21h8M9 17h6',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 1-5 1-7z', drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z',
  food: 'M7 3v8M5 3v4a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 3 3 3v9', moon: 'M20 14A8 8 0 1110 4a6 6 0 0010 10z',
  walk: 'M13 4.5a1.5 1.5 0 100-.01M10 21l2-6 3 3v3M9 10l3-2.5 3 3 3 1M12 7.5l-1 5', scale: 'M4 7h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM9 13l3-3M8 4h8',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12', upload: 'M12 15V4M7 9l5-5 5 5M5 20h14', download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4', search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5',
  reset: 'M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3M19 9A7 7 0 007 6', trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z', info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z', run: 'M14 4.5a1.5 1.5 0 100-.01M7 21l3-5 3 2 1 5M6 12l3-3 4 1 2 4 3 1M10 16l2-6'
};
const I = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const GRIP = '<svg viewBox="0 0 14 20" width="14" height="20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/></svg>';

// ---------- toast / level up ----------
let toastT = 0;
export function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
}
function confetti() {
  const cv = document.createElement('canvas'); cv.id = 'fx'; document.body.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const cols = ['#FF7A2F', '#F2EDE4', '#F2C14E', '#FFA06B', '#B3AB9E'];
  let ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 3, s: 4 + Math.random() * 5, r: Math.random() * 6, c: cols[Math.random() * cols.length | 0], l: 1 }));
  (function f() {
    c.clearRect(0, 0, innerWidth, innerHeight);
    ps = ps.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += .32; p.vx *= .99; p.r += .1; p.l -= .011; c.globalAlpha = Math.max(0, p.l); c.fillStyle = p.c; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); return p.l > 0; });
    if (ps.length) requestAnimationFrame(f); else cv.remove();
  })();
}
function levelUp() {
  const lx = levelXP();
  const d = document.createElement('div'); d.className = 'lvlup'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', t('升級', 'Level up'));
  d.innerHTML = `<div class="box stack">
    <div class="eyebrow">${t('升級', 'Level up')}</div>
    <div class="big">${lx.level}</div>
    <div class="h2">${t('你越嚟越強！', 'You\'re getting stronger!')}</div>
    <div class="bar" style="margin:6px 0 2px"><i style="width:0"></i></div>
    <div class="sub num">${lx.xp} / ${LEVEL_XP} XP</div>
    <button class="btn btn-p btn-w" data-a="closeLvl" style="margin-top:8px">${t('繼續', 'Continue')}</button></div>`;
  document.body.appendChild(d); confetti();
  setTimeout(() => { const b = d.querySelector('.bar i'); if (b) b.style.width = lx.pct + '%'; }, 350);
}
function award(type, muscle) {
  const before = levelXP().level; const pts = addPts(type, muscle);
  if (levelXP().level > before) setTimeout(levelUp, 500);
  return pts;
}

// ---------- rest timer ----------
function startTimer(sec) {
  const T = ui.timer; clearInterval(T.h);
  Object.assign(T, { left: sec, max: sec, on: true, go: false });
  T.h = setInterval(() => {
    if (T.left > 0) { T.left--; if (T.left === 0) { T.go = true; try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch { } setTimeout(() => { if (T.left === 0) stopTimer(); }, 4000); } }
    drawTimer();
  }, 1000);
  drawTimer();
}
function stopTimer() { const T = ui.timer; clearInterval(T.h); T.on = false; T.go = false; drawTimer(); }
function drawTimer() {
  const T = ui.timer, slot = $('#timer-slot'); if (!slot) return;
  if (!T.on || ui.ob || ui.sheet) { slot.innerHTML = ''; return; }
  const mm = Math.floor(T.left / 60), ss = String(T.left % 60).padStart(2, '0');
  slot.innerHTML = `<div class="timer${T.go ? ' go' : ''}" role="timer" aria-live="off">
    ${I('timer')}
    <div style="flex:1;min-width:0"><div class="tl">${T.go ? t('開始下一組！', 'Next set!') : t('休息', 'REST')}</div>
      <div class="tv">${mm}:${ss}</div><div class="tb"><i style="width:${T.max ? T.left / T.max * 100 : 0}%"></i></div></div>
    ${T.go ? '' : `<button data-a="timerAdd">+30s</button>`}
    <button class="dark" data-a="timerStop">${T.go ? t('好', 'OK') : t('略過', 'Skip')}</button></div>`;
}

// ---------- common bits ----------
function lvlBlock() {
  const lx = levelXP();
  return `<div class="lvl"><div class="row" style="gap:4px;align-items:baseline"><span>LV</span><b class="num">${lx.level}</b></div>
    <div class="bar" style="width:96px"><i style="width:${lx.pct}%"></i></div><span class="num" style="letter-spacing:0;font-weight:500">${lx.xp} / ${LEVEL_XP} XP</span></div>`;
}
function nav() {
  const tabs = [['today', 'bolt', '今日', 'Today'], ['plan', 'plan', '計劃', 'Plan'], ['progress', 'chart', '進度', 'Progress'], ['library', 'book', '動作庫', 'Library'], ['me', 'user', '我', 'Me']];
  $('#nav').innerHTML = `<div class="nav-in">${tabs.map(([id, ic, zh, en]) => `<button data-a="tab" data-v="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>${I(ic)}<span>${t(zh, en)}</span></button>`).join('')}</div>`;
  $('#nav').hidden = !!ui.ob;
}

// ---------- TODAY ----------
function exDone(day, e) {
  const ex = EX[e.id]; if (!ex) return false;
  if (ex.isCardio) return !!(S.logs[day] && S.logs[day]['__cardio__' + e.id]);
  const sets = S.logs[day] && S.logs[day][e.id]; return Array.isArray(sets) && sets.length > 0 && sets.every(s => s.done);
}
function isOpen(day, e, firstOpen) {
  const k = day + '__' + e.id, v = S.collapsedEx[k];
  if (v === true) return false; if (v === false) return true;
  return e.id === firstOpen;
}
function renderToday() {
  const day = ui.day, plan = (S.customPlan[day] || []).filter(e => EX[e.id]), isToday = day === todayKey();
  const dateStr = new Date().toLocaleDateString(S.lang === 'zh' ? 'zh-HK' : 'en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
  let h = `<header class="ph"><div><div class="eyebrow">${isToday ? esc(dateStr) : dayLong(day)}</div><h1 class="h1">${dayTitle(day)}</h1></div>${lvlBlock()}</header>`;
  h += `<nav class="week" aria-label="${t('揀日子', 'Pick a day')}">${WD.map(d => {
    const pl = (S.customPlan[d] || []).length, ds = dSets(d), done = ds.done > 0 || Object.keys(S.logs[d] || {}).some(k => k.startsWith('__cardio__') && S.logs[d][k]);
    return `<button data-a="day" data-v="${d}" aria-pressed="${d === day}" class="${pl ? '' : 'rest'} ${done ? 'done' : ''} ${d === todayKey() ? 'today' : ''}" aria-label="${dayLong(d)} · ${dayTitle(d)}"><span class="d">${dayShort(d)}</span><span class="dot"></span></button>`;
  }).join('')}</nav>`;
  if (isToday && reviewDue()) h += reviewHTML(weeklyReview());
  if (!plan.length) {
    h += `<div class="card empty">${I('moon')}<div class="h2" style="color:var(--tx)">${t('休息日', 'Rest day')}</div><div>${t('好好恢復，聽日繼續！', 'Recover well, back at it tomorrow!')}</div>
      <button class="btn btn-g" data-a="goPlan" data-v="${day}">${I('plus')}${t('加動作入呢日', 'Add exercises to this day')}</button></div>`;
  } else {
    const doneN = plan.filter(e => exDone(day, e)).length;
    const mins = Math.round(plan.reduce((a, e) => a + (EX[e.id].isCardio ? (parseInt(e.reps) || 30) : (e.sets || 3) * 2), 0));
    h += `<div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="sub">${t('完成', 'Done')} <b class="num" style="color:var(--tx);font-size:16px">${doneN} / ${plan.length}</b> ${t('個動作', 'exercises')}</span><span class="sub">${t(`約 ${mins} 分鐘`, `~${mins} min`)}</span></div>
      <div class="bar" style="margin-bottom:8px"><i style="width:${plan.length ? doneN / plan.length * 100 : 0}%"></i></div>
      <p class="note" style="margin-bottom:12px">${I('check')}${t('打剔即自動記錄。聽日會自動清返打剔，重量會保留。', 'Ticks are recorded automatically. They clear tomorrow; your weights stay.')}</p>`;
    const firstOpen = (plan.find(e => !EX[e.id].isCardio && !exDone(day, e)) || {}).id;
    plan.forEach((e, idx) => { h += EX[e.id].isCardio ? cardioCard(day, e, idx) : strengthCard(day, e, idx, firstOpen); });
    const { done } = dSets(day);
    const anyCardio = plan.some(e => EX[e.id].isCardio && exDone(day, e));
    if (done > 0 || anyCardio) {
      const saved = !!S.savedWorkouts['saved_' + isoToday() + '_' + day];
      h += `<button class="btn ${saved ? 'btn-g' : 'btn-p'} btn-w" data-a="saveWorkout" ${saved ? 'disabled' : ''} style="margin:4px 0 14px">${saved ? I('check') + t('今日已完成', 'Finished today') : I('check') + t(`完成訓練 (+${SCORE_CFG.workout_saved})`, `Finish workout (+${SCORE_CFG.workout_saved})`)}</button>`;
    }
  }
  if (isToday) h += habitsCard();
  return h;
}
function strengthCard(day, e, idx, firstOpen) {
  const ex = EX[e.id], sets = (S.logs[day] && S.logs[day][e.id]) || [], open = isOpen(day, e, firstOpen), done = exDone(day, e);
  const nDone = sets.filter(s => s.done).length, best = bestWeight(e.id), last = lastSession(e.id);
  const maxNow = Math.max(0, ...sets.map(s => num(s.weight)));
  const right = done ? t('完成', 'Done') : nDone ? `${nDone}/${sets.length}` : (best ? best + ' kg' : '');
  let h = `<section class="ex ${open ? 'open' : ''} ${done ? 'done' : ''}">
    <button class="ex-h" data-a="toggleEx" data-d="${day}" data-id="${e.id}" aria-expanded="${open}">
      <span class="ex-badge">${done ? I('check') : idx + 1}</span>
      <span class="ex-t"><b>${esc(exName(ex))}</b><span>${e.sets} ${t('組', 'sets')} × ${esc(e.reps)} ${t('次', 'reps')} · ${catName(ex.cat)}</span></span>
      <span class="ex-r num">${esc(right)}</span>${I(open ? 'down' : 'right', 'muted')}</button>`;
  if (open) {
    const sl = strLvl(e.id, Math.max(maxNow, best), S.profile.weight);
    h += `<div class="ex-body"><div class="ex-meta">
      ${best ? `<span class="tag gold">${I('trophy')}&nbsp;PR ${best} kg</span>` : ''}
      ${maxNow > best && best > 0 ? `<span class="tag acc">${t('新紀錄！', 'New PR!')}</span>` : ''}
      ${sl ? `<span class="tag">${t('力量', 'Strength')}: ${t(sl.l[0], sl.l[1])}</span>` : ''}
      ${last ? `<span class="tag">${t('上次', 'Last')} ${last.date.slice(5).replace('-', '/')}</span>` : ''}
      <button class="tag acc" data-a="openEx" data-id="${e.id}" data-tab="how" style="margin-left:auto;height:32px">${I('cube')}&nbsp;${t('3D 示範', '3D demo')}</button></div>
      ${(() => { const pl = targetPlan(e.id, day); return pl && pl.cur ? `<div class="note" style="color:var(--acc);font-weight:600">${I('target')}${t(`目標計劃：今個星期要做到 ${pl.cur.kg} kg × ${pl.cur.reps}`, `Target plan: ${pl.cur.kg} kg × ${pl.cur.reps} this week`)}${pl.cur.status === 'hit' ? t('（已達成 ✓）', ' (done ✓)') : ''}</div>` : ''; })()}
      ${(() => { const sg = nextLoad(e.id, day); if (!sg || nDone) return ''; return `<div class="sugg"><span class="sugg-i ${sg.kind}">${I(sg.kind === 'up' ? 'chart' : sg.kind === 'down' ? 'reset' : 'target')}</span><div style="flex:1;min-width:0"><b class="num">${t('建議', 'Try')} ${sg.kg ? sg.kg + ' kg × ' : ''}${sg.reps} ${t('次', 'reps')}</b><span>${esc(t(sg.zh, sg.en))}</span></div>${sg.kg ? `<button class="btn btn-g" data-a="applySugg" data-d="${day}" data-id="${e.id}" data-v="${sg.kg}" data-r="${sg.reps}">${t('套用', 'Use')}</button>` : ''}</div>`; })()}
      <div class="sets-h"><span>${t('組', 'SET')}</span><span>${t('上次', 'LAST')}</span><span>KG</span><span>${t('次數', 'REPS')}</span><span></span></div>`;
    sets.forEach((s, i) => {
      const p = last && last.sets[i] ? `${num(last.sets[i].weight)}×${esc(last.sets[i].reps)}` : '—';
      const lw = t(`第 ${i + 1} 組重量`, `Set ${i + 1} weight`), lr = t(`第 ${i + 1} 組次數`, `Set ${i + 1} reps`);
      h += `<div class="set ${s.done ? 'done' : ''}"><span class="n">${i + 1}</span><span class="prev">${p}</span>
        <input class="fin" inputmode="decimal" aria-label="${lw}" value="${num(s.weight) || ''}" placeholder="${last && last.sets[i] ? num(last.sets[i].weight) : '0'}" data-c="w" data-d="${day}" data-id="${e.id}" data-i="${i}">
        <input class="fin" inputmode="numeric" aria-label="${lr}" value="${esc(s.reps)}" data-c="r" data-d="${day}" data-id="${e.id}" data-i="${i}">
        <button class="tick" data-a="tick" data-d="${day}" data-id="${e.id}" data-i="${i}" aria-pressed="${!!s.done}" aria-label="${t(`完成第 ${i + 1} 組`, `Complete set ${i + 1}`)}">${I('check')}</button></div>`;
    });
    h += `<div class="ex-foot"><button class="btn btn-g" data-a="setCount" data-d="${day}" data-id="${e.id}" data-v="1">${I('plus')}${t('加一組', 'Add set')}</button>
      ${sets.length > 1 ? `<button class="btn btn-g" data-a="setCount" data-d="${day}" data-id="${e.id}" data-v="-1">${I('minus')}${t('減一組', 'Remove set')}</button>` : ''}</div></div>`;
  }
  return h + '</section>';
}
function cardioCard(day, e, idx) {
  const ex = EX[e.id], done = exDone(day, e), mins = parseInt(e.reps) || 30;
  return `<section class="ex ${done ? 'done' : ''}"><div class="ex-h" style="cursor:default">
    <span class="ex-badge">${done ? I('check') : idx + 1}</span>
    <span class="ex-t"><b>${esc(exName(ex))}</b><span>${t('有氧', 'Cardio')} · ${mins} ${t('分鐘', 'min')}${e.id !== 'warmup' && (S.customPlan[day] || []).some(x => EX[x.id] && EX[x.id].cat === 'legs') ? ` · ${t('腳日：建議斜坡行或者單車，唔好跑', 'Leg day: incline walk or bike, not running')}` : e.id !== 'warmup' ? ` · ${t('第二區：講到句子、唱唔到歌', 'Zone 2: can talk, can\'t sing')}` : ''}</span></span>
    ${done ? '' : `<span class="stepper"><button data-a="cardioMin" data-d="${day}" data-id="${e.id}" data-v="-5" aria-label="${t('減 5 分鐘', 'Minus 5 minutes')}">−</button><button data-a="cardioMin" data-d="${day}" data-id="${e.id}" data-v="5" aria-label="${t('加 5 分鐘', 'Plus 5 minutes')}">+</button></span>`}
    <button class="tick" data-a="cardioTick" data-d="${day}" data-id="${e.id}" aria-pressed="${done}" aria-label="${t('完成有氧', 'Complete cardio')}">${I('check')}</button></div></section>`;
}
function habitsCard() {
  const hs = habitTasks(), n = hs.filter(x => S.completedTasks[x.key]).length;
  return `<section class="card" style="margin-top:6px"><div class="card-h"><h2 class="h2">${t('今日習慣', 'Daily habits')}</h2><span class="sub num">${n} / ${hs.length}</span></div>
    ${hs.map(x => `<button class="habit" data-a="habit" data-v="${x.key}" aria-pressed="${!!S.completedTasks[x.key]}"><span class="box">${S.completedTasks[x.key] ? I('check') : ''}</span>${I(x.icon, 'muted')}<span class="lbl">${esc(t(x.zh, x.en))}</span><span class="pts">+${SCORE_CFG.task_done}</span></button>`).join('')}</section>`;
}

// ---------- PROGRESS ----------
function lineChart(pts, opts = {}) {
  if (pts.length < 2) return '';
  const W = 320, H = 150, pad = 14;
  const ys = pts.map(p => p.v), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const x = i => pad + i * (W - 2 * pad) / (pts.length - 1), y = v => H - 18 - (v - lo) / span * (H - 40);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const label = opts.label || '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
    <g stroke="#262320" stroke-width="1"><line x1="0" y1="${y(hi)}" x2="${W}" y2="${y(hi)}"/><line x1="0" y1="${y((hi + lo) / 2)}" x2="${W}" y2="${y((hi + lo) / 2)}"/><line x1="0" y1="${y(lo)}" x2="${W}" y2="${y(lo)}"/></g>
    <polygon points="${x(0)},${H} ${line} ${x(pts.length - 1)},${H}" fill="#FF7A2F" fill-opacity=".12"/>
    <polyline points="${line}" fill="none" stroke="#FF7A2F" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${pts.map((p, i) => p.pr ? `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="#F2C14E" stroke="#1C1A17" stroke-width="2"/>` : '').join('')}
    <circle cx="${x(pts.length - 1)}" cy="${y(pts[pts.length - 1].v)}" r="5" fill="#FF7A2F" stroke="#1C1A17" stroke-width="3"/></svg>`;
}
function renderProgress() {
  chkWeek();
  const ws = new Date(weekStart() + 'T12:00:00'), we = new Date(ws); we.setDate(ws.getDate() + 6);
  const fmt = d => d.toLocaleDateString(S.lang === 'zh' ? 'zh-HK' : 'en-GB', { month: 'short', day: 'numeric' });
  const weekly = S.scores.weekly || 0, g = grade(Math.min(100, Math.round(weekly / 3)));
  let h = `<header class="ph"><div><div class="eyebrow">${fmt(ws)} – ${fmt(we)}</div><h1 class="h1">${t('進度', 'Progress')}</h1></div>${lvlBlock()}</header>`;
  h += `<div class="grid3" style="margin-bottom:10px">
    <div class="tile"><span class="k">${t('連續', 'Streak')}</span><span class="v" style="color:var(--acc)">${streak()}</span><span class="s">${t('日', 'days')}</span></div>
    <div class="tile"><span class="k">${t('本週', 'This week')}</span><span class="v">${weekly}</span><span class="s">${t('分 · 評級 ', 'pts · grade ')}${g}</span></div>
    <div class="tile"><span class="k">${t('新紀錄', 'New PRs')}</span><span class="v">${prsThisMonth()}</span><span class="s">${t('今個月', 'this month')}</span></div></div>`;
  h += targetsCard();
  h += liftGoalsCard();
  h += liftProgressCard();
  h += reviewLogCard();
  // exercise chart
  const ids = trainedIds();
  if (!ui.progEx || !ids.includes(ui.progEx)) ui.progEx = ids[0] || null;
  h += `<section class="card hot"><div class="card-h"><h2 class="h2">${t('重量走勢', 'Weight trend')}</h2>
    <div class="seg" role="group" aria-label="${t('時間範圍', 'Range')}">${[['4w', '4週', '4w'], ['12w', '12週', '12w'], ['all', '全部', 'All']].map(([v, zh, en]) => `<button data-a="progRange" data-v="${v}" aria-pressed="${ui.progRange === v}">${t(zh, en)}</button>`).join('')}</div></div>`;
  if (!ui.progEx) {
    h += `<div class="empty">${I('chart')}<div>${t('完成並儲存一次訓練之後，呢度會顯示每個動作嘅重量走勢。', 'Finish and save a workout and each exercise\'s weight trend shows up here.')}</div></div>`;
  } else {
    let ser = prSeries(ui.progEx);
    if (ui.progRange !== 'all') { const d = new Date(); d.setDate(d.getDate() - (ui.progRange === '4w' ? 28 : 84)); const c = d.toISOString().slice(0, 10); ser = ser.filter(p => p.date >= c); }
    const best = bestWeight(ui.progEx), first = ser[0], lastP = ser[ser.length - 1];
    h += `<div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:8px">
      <div class="field" style="flex:1;min-width:0"><label for="progEx">${t('動作', 'Exercise')}</label>
      <select id="progEx" data-c="progEx" class="input" style="font-size:18px">${ids.map(id => `<option value="${id}" ${id === ui.progEx ? 'selected' : ''}>${esc(exName(EX[id]))}</option>`).join('')}</select></div>
      <button class="ibtn" data-a="openEx" data-id="${ui.progEx}" aria-label="${t('睇動作詳情', 'Open exercise details')}" style="align-self:flex-end">${I('right')}</button>
      <div style="text-align:right;flex-shrink:0"><div class="num" style="font-size:26px;font-weight:800;color:var(--acc)">${lastP ? lastP.weight : best} kg</div>
      <div class="sub">${first && lastP && ser.length > 1 ? `${lastP.weight - first.weight >= 0 ? '+' : ''}${+(lastP.weight - first.weight).toFixed(1)} kg` : `PR ${best} kg`}</div></div></div>`;
    h += ser.length >= 2 ? lineChart(ser.map(p => ({ v: p.weight, pr: p.isPR })), { label: t(`${exName(EX[ui.progEx])} 最高重量走勢`, `${exName(EX[ui.progEx])} top weight trend`) }) + `<div class="axis"><span>${ser[0].date.slice(5).replace('-', '/')}</span><span>● ${t('黃點 = 新紀錄', 'gold = PR')}</span><span>${lastP.date.slice(5).replace('-', '/')}</span></div>`
      : `<div class="empty" style="padding:16px">${t('呢段時間只有一次記錄，再練多次就會見到走勢。', 'Only one session in this range so far.')}</div>`;
  }
  h += '</section>';
  // muscle coverage
  const b = S.scores.breakdown || {};
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('本週肌群', 'Muscle groups this week')}</h2><span class="sub">${t('白線 = 目標', 'line = target')}</span></div><div class="stack" style="gap:8px">`;
  Object.entries(CATS).forEach(([k, c]) => {
    const v = b[k] || 0, max = Math.max(c.target * 1.3, v);
    h += `<div class="mbar"><span style="text-align:left;color:var(--tx)">${t(c.zh, c.en)}</span><div class="tr" role="img" aria-label="${t(c.zhL, c.en)} ${v}/${c.target}"><i class="${v >= c.target ? 'hit' : ''}" style="width:${Math.min(100, v / max * 100)}%"></i><b style="left:${c.target / max * 100}%"></b></div><span>${v}/${c.target}</span></div>`;
  });
  h += '</div></section>';
  // daily points
  const dmax = Math.max(1, ...WD.map(d => b[d] || 0));
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('每日積分', 'Daily points')}</h2></div><div class="dbars" role="img" aria-label="${t('本週每日積分', 'Points per day this week')}">${WD.map(d => { const v = b[d] || 0; return `<div><em>${v || ''}</em><i class="${v ? 'on' : ''}" style="height:${Math.max(4, v / dmax * 70)}px"></i><span>${dayShort(d)}</span></div>`; }).join('')}</div></section>`;
  // body weight
  const bl = S.bodyLog || [];
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('體重', 'Body weight')}</h2><span class="sub">${t('目標', 'Goal')} ${S.profile.goalWeight} kg</span></div>`;
  h += bl.length >= 2 ? lineChart(bl.slice(-30).map(x => ({ v: x.kg })), { label: t('體重走勢', 'Body weight trend') }) + `<div class="axis"><span>${bl.slice(-30)[0].date.slice(5).replace('-', '/')}</span><span class="num">${bl[bl.length - 1].kg} kg</span><span>${bl[bl.length - 1].date.slice(5).replace('-', '/')}</span></div>`
    : `<div class="empty" style="padding:14px">${t('喺「我」記錄兩次體重之後會見到走勢。', 'Log your weight twice in Me to see a trend.')}<button class="btn btn-g" data-a="tab" data-v="me">${t('去記錄', 'Log weight')}</button></div>`;
  h += '</section>';
  // training log: every session, newest first
  const sess = [...S.history].sort((a, b) => b.date.localeCompare(a.date) || a.day.localeCompare(b.day));
  const shown = sess.slice(0, ui.logN || 8);
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('訓練記錄', 'Workout log')}</h2><span class="sub">${t(`共 ${sess.length} 次`, `${sess.length} sessions`)}</span></div>`;
  if (!sess.length) h += `<div class="empty" style="padding:14px">${t('喺「今日」打剔第一組，就會出現喺度。', 'Tick your first set in Today and it shows up here.')}</div>`;
  shown.forEach(s => {
    const ids = Object.keys(s.sets || {}).filter(id => EX[id]);
    let n = 0, vol = 0; ids.forEach(id => s.sets[id].forEach(x => { if (x.done !== false) { n++; vol += num(x.weight) * num(x.reps); } }));
    const prs = ids.filter(id => { const ser = prSeries(id); return ser.some((p, k) => k > 0 && p.isPR && p.date === s.date); });
    const cardio = (s.cardio || []).filter(id => EX[id]);
    h += `<details class="logd"><summary><div style="flex:1;min-width:0"><b>${fmtDate(s.date, true)}</b><span>${esc(dayTitle(s.day))} · ${ids.length + cardio.length} ${t('個動作', 'exercises')} · ${n} ${t('組', 'sets')}${vol ? ` · ${Math.round(vol).toLocaleString()} kg` : ''}</span></div>${prs.length ? `<span class="tag gold">${I('trophy')}&nbsp;${prs.length}</span>` : ''}${I('down', 'muted')}</summary>
      <div class="logb">${ids.map(id => { const done = s.sets[id].filter(x => x.done !== false); return `<button class="logx" data-a="openEx" data-id="${id}" data-tab="hist"><b>${esc(exName(EX[id]))}${prs.includes(id) ? ' 🏆' : ''}</b><span class="num">${done.map(x => `${num(x.weight)}×${esc(x.reps)}`).join('  ')}</span></button>`; }).join('')}
      ${cardio.map(id => `<div class="logx"><b>${esc(exName(EX[id]))}</b><span>${t('有氧完成', 'Cardio done')}</span></div>`).join('')}</div></details>`;
  });
  if (sess.length > shown.length) h += `<button class="btn btn-g btn-w" data-a="logMore" style="margin-top:8px">${t('睇多啲', 'Show more')}</button>`;
  h += '</section>';
  // past weeks
  const past = (S.scores.history || []).slice(0, 6);
  if (past.length) {
    h += `<section class="card"><div class="card-h"><h2 class="h2">${t('過往週數', 'Past weeks')}</h2></div>${past.map(w => `<div class="row" style="padding:6px 0"><span class="grade">${grade(Math.min(100, Math.round(w.score / 3)))}</span><span style="flex:1">${t('週', 'Week of')} ${esc(w.week)}</span><b class="num" style="font-size:20px">${w.score}</b><span class="sub">${t('分', 'pts')}</span></div>`).join('')}</section>`;
  }
  h += `<details class="card"><summary class="h3" style="cursor:pointer;min-height:28px">${t('點樣賺分？', 'How do I earn points?')}</summary><div class="grid2" style="margin-top:10px">
    ${[['完成一組', 'Complete a set', 'set_done'], ['完成習慣', 'Complete a habit', 'task_done'], ['破個人紀錄', 'Beat a PR', 'pr_broken'], ['儲存訓練', 'Save a workout', 'workout_saved']].map(([zh, en, k]) => `<div class="tile"><span class="s">${t(zh, en)}</span><span class="v" style="font-size:24px;color:var(--acc)">+${SCORE_CFG[k]}</span></div>`).join('')}</div>
    <p class="sub" style="margin-top:10px">${t(`每 ${LEVEL_XP} 分升一級。每星期一重新計本週分數。`, `Every ${LEVEL_XP} points is a level. Weekly points reset on Monday.`)}</p></details>`;
  return h;
}

// ---------- PLAN ----------
function guideCard() {
  const sc = scheme(), ch = schemeChanges(sc), open = ui.guideOpen;
  const row = (k, v) => `<li><span class="n">${k}</span><b class="v num">${v}</b></li>`;
  let h = `<section class="card hot guide"><div class="card-h"><h2 class="h2">${t('訓練指引', 'Training guide')}</h2><span class="tag acc">${t(sc.zh, sc.en)}</span></div>
    <ul class="rvlist">${row(t('複合動作（深蹲、推、拉）', 'Compound (squat, press, pull)'), `${sc.c[0]} × ${sc.c[1]}–${sc.c[2]}`)}${row(t('孤立動作（彎舉、側平舉）', 'Isolation (curls, raises)'), `${sc.i[0]} × ${sc.i[1]}–${sc.i[2]}`)}
      ${row(t('組間休息', 'Rest between sets'), `${sc.rest < 120 ? sc.rest + t(' 秒', 's') : sc.rest / 60 + t(' 分鐘', ' min')}`)}${row(t('每個部位每週組數', 'Sets per body part / week'), `${sc.sets[0]}–${sc.sets[1]}`)}
      ${row(t('每週有氧', 'Cardio / week'), `${sc.cardio} ${t('分鐘', 'min')}`)}${row(t('每日步數', 'Daily steps'), sc.steps.toLocaleString())}</ul>`;
  h += `<button class="btn btn-g btn-w" data-a="guideOpen" style="margin-top:10px" aria-expanded="${!!open}">${t(open ? '收埋點做' : '點做？', open ? 'Hide how-to' : 'How does it work?')}</button>`;
  if (open) {
    const tips = [
      [`加重：每組都做到 ${sc.c[2]}（孤立 ${sc.i[2]}）次就加重，加完由 ${sc.c[1]}（孤立 ${sc.i[1]}）次重新開始。`, `Add weight once every set reaches ${sc.c[2]} (isolation ${sc.i[2]}) reps, then start again at ${sc.c[1]} (${sc.i[1]}).`],
      ['先重訓、後有氧；可以分開兩個時段（相隔 6 小時以上）更好。', 'Lift first, cardio after; even better, split them 6+ hours apart.'],
      ['有氧主力做第二區：斜坡行、單車、划艇機，辛苦到講到句子但唱唔到歌。', 'Most cardio in zone 2: incline walk, bike, rower; you can talk but not sing.'],
      ['腳日之後唔好跑步，改斜坡行或者踩單車。', 'No running after leg day; walk on an incline or cycle instead.'],
      [sc.key === 'fat' || sc.key === 'recomp' ? 'HIIT 每星期最多 1–2 次，唔好排喺腳日前一日。減脂主要靠食量，有氧係輔助。' : 'HIIT 可有可無，每星期最多 1–2 次。', sc.key === 'fat' || sc.key === 'recomp' ? 'HIIT at most 1-2 times a week, not the day before legs. Food does most of the fat loss; cardio helps.' : 'HIIT is optional, at most 1-2 times a week.'],
      [sc.key === 'fat' ? '減緊重：目標係體重跌而力量唔跌；力量升得慢係正常。' : sc.key === 'muscle' ? '增肌：每日食多約 250–300 kcal，每星期體重升 0.25–0.5%。' : sc.key === 'strength' ? '力量：主要動作休息足 2–4 分鐘，每次加細步。' : '每個部位每星期最好練兩次。', sc.key === 'fat' ? 'Cutting: aim to lose weight without losing strength; slow strength gains are normal.' : sc.key === 'muscle' ? 'Building: eat about 250-300 kcal over maintenance, gain 0.25-0.5% a week.' : sc.key === 'strength' ? 'Strength: rest 2-4 minutes on main lifts and add small steps.' : 'Train each body part twice a week if you can.']
    ];
    h += `<ul class="rvtips" style="margin-top:10px">${tips.map(x => `<li>${esc(t(x[0], x[1]))}</li>`).join('')}</ul>`;
  }
  if (ch.out.length) {
    if (ui.guideConfirm) h += `<div class="warn" style="margin-top:10px;display:block"><b>${t(`會改 ${ch.out.length} 個動作：`, `This changes ${ch.out.length} exercises:`)}</b><ul class="rvtips" style="margin:6px 0 8px">${ch.out.slice(0, 8).map(c => `<li>${esc(exName(EX[c.id]))}（${dayShort(c.d)}）：${c.from} → ${c.to}</li>`).join('')}${ch.out.length > 8 ? `<li>${t(`仲有 ${ch.out.length - 8} 個…`, `and ${ch.out.length - 8} more…`)}</li>` : ''}</ul>${ch.kept.length ? `<span class="sub small" style="display:block;margin-bottom:8px">${t(`你自己改過嘅 ${ch.kept.length} 個動作唔會郁。`, `${ch.kept.length} exercises you edited yourself stay as they are.`)}</span>` : ''}
      <div class="row" style="gap:8px"><button class="btn btn-p" data-a="guideApply" style="flex:1">${t('確定套用', 'Apply')}</button><button class="btn btn-g" data-a="guideCancel">${t('取消', 'Cancel')}</button></div></div>`;
    else h += `<button class="btn btn-p btn-w" data-a="guideAsk" style="margin-top:8px">${I('target')}${t(`套用到計劃（${ch.out.length} 個動作）`, `Apply to my plan (${ch.out.length} exercises)`)}</button>`;
  } else h += `<p class="sub small" style="margin-top:8px">${t('你個計劃已經跟緊呢個指引。', 'Your plan already follows this guide.')}</p>`;
  return h + '</section>';
}
function renderPlan() {
  const day = ui.planDay, plan = S.customPlan[day] || [];
  const trainDays = WD.filter(d => (S.customPlan[d] || []).length).length;
  let h = `<header class="ph"><div><div class="eyebrow">${t(`每週 ${trainDays} 日訓練`, `${trainDays} training days a week`)}</div><h1 class="h1">${t('計劃', 'Plan')}</h1></div>
    <button class="btn btn-g" data-a="resetPlan" style="min-height:44px">${I('reset')}${t('還原預設', 'Reset')}</button></header>`;
  h += guideCard();
  h += `<div class="days7" role="tablist" aria-label="${t('揀日子', 'Pick a day')}" style="margin-bottom:14px">${WD.map(d => {
    const f = dayFocus(d);
    return `<button role="tab" data-a="planDay" data-v="${d}" aria-selected="${d === day}" aria-pressed="${d === day}">${dayShort(d)}<small>${f ? (f === 'cardio' ? t('有氧', 'Cardio') : t(CATS[f].zh, CATS[f].en.slice(0, 4))) : t('休息', 'Rest')}</small></button>`;
  }).join('')}</div>`;
  h += `<div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 class="h2">${dayLong(day)} · ${dayTitle(day)}</h2>${plan.length > 1 ? `<span class="sub">${t('按住 ⠿ 拖動排序', 'Drag ⠿ to reorder')}</span>` : ''}</div>`;
  h += `<div id="planList">`;
  plan.forEach((e, i) => {
    const ex = EX[e.id]; if (!ex) return;
    h += `<div class="pli" data-i="${i}"><span class="grip" data-drag="${i}" aria-label="${t('拖動排序', 'Drag to reorder')}" role="button" tabindex="0">${GRIP}</span>
      <div class="tx"><b>${esc(exName(ex))}</b><span>${catName(ex.cat)} · ${t(equipZh(ex.equip), ex.equip)}</span></div>`;
    if (ex.isCardio) {
      h += `<div class="mini"><span class="lab">${t('分鐘', 'MIN')}</span><div class="ctl"><button data-a="planNum" data-i="${i}" data-f="reps" data-v="-5" aria-label="${t('減', 'Less')}">−</button><span class="v num">${parseInt(e.reps) || 30}</span><button data-a="planNum" data-i="${i}" data-f="reps" data-v="5" aria-label="${t('加', 'More')}">+</button></div></div>`;
    } else {
      h += `<div class="mini"><span class="lab">${t('組', 'SETS')}</span><div class="ctl"><button data-a="planNum" data-i="${i}" data-f="sets" data-v="-1" aria-label="${t('減一組', 'One less set')}">−</button><span class="v num">${e.sets}</span><button data-a="planNum" data-i="${i}" data-f="sets" data-v="1" aria-label="${t('加一組', 'One more set')}">+</button></div></div>
        <div class="mini"><span class="lab">${t('次', 'REPS')}</span><div class="ctl"><button data-a="planNum" data-i="${i}" data-f="reps" data-v="-1" aria-label="${t('減一次', 'One less rep')}">−</button><span class="v num"${Array.isArray(e.range) && e.range[0] !== e.range[1] ? ' style="font-size:13px"' : ''}>${Array.isArray(e.range) && e.range[0] !== e.range[1] ? e.range[0] + '–' + e.range[1] : esc(e.reps)}</span><button data-a="planNum" data-i="${i}" data-f="reps" data-v="1" aria-label="${t('加一次', 'One more rep')}">+</button></div></div>`;
    }
    h += `<button class="ibtn ghost" data-a="planDel" data-i="${i}" aria-label="${t('移除', 'Remove')} ${esc(exName(ex))}" style="width:36px">${I('x')}</button></div>`;
  });
  h += `</div>`;
  if (!plan.length) h += `<div class="card empty">${I('moon')}<div>${t('呢日係休息日。', 'This is a rest day.')}</div></div>`;
  h += `<button class="btn btn-d btn-w" data-a="addFromLib" style="margin-top:4px">${I('plus')}${t('由動作庫加入', 'Add from library')}</button>`;
  return h;
}

// ---------- LIBRARY ----------
function renderLibrary() {
  const q = ui.libQ.trim().toLowerCase();
  const list = EX_LIST.filter(e => (ui.libCat === 'all' || e.cat === ui.libCat) && (!q || e.zh.includes(q) || e.en.toLowerCase().includes(q) || e.muscles.some(m => m.toLowerCase().includes(q) || muscleZh(m).includes(q))));
  let h = `<header class="ph"><div><div class="eyebrow">${t(`${EX_LIST.length} 個動作 · 3D 示範`, `${EX_LIST.length} exercises · 3D demos`)}</div><h1 class="h1">${t('動作庫', 'Library')}</h1></div></header>`;
  if (ui.addTo) h += `<div class="card hot row" style="justify-content:space-between"><div><div class="eyebrow">${t('加入緊', 'Adding to')}</div><div class="h2">${dayLong(ui.addTo)}</div></div><button class="btn btn-p" data-a="addDone">${t('完成', 'Done')}</button></div>`;
  h += `<label class="search">${I('search')}<span class="sr">${t('搜尋動作', 'Search exercises')}</span><input type="search" data-c="libQ" value="${esc(ui.libQ)}" placeholder="${t('搜尋動作或者肌肉', 'Search exercise or muscle')}"></label>`;
  h += `<div class="chips" style="margin-bottom:12px">${['all', ...Object.keys(CATS)].map(c => `<button class="chip" data-a="libCat" data-v="${c}" aria-pressed="${ui.libCat === c}">${c === 'all' ? t('全部', 'All') : t(CATS[c].zh, CATS[c].en)}</button>`).join('')}</div>`;
  if (!list.length) h += `<div class="empty">${I('search')}<div>${t('搵唔到動作', 'No exercises found')}</div></div>`;
  list.forEach(e => {
    const inPlan = WD.filter(d => (S.customPlan[d] || []).some(x => x.id === e.id));
    const inTarget = ui.addTo && (S.customPlan[ui.addTo] || []).some(x => x.id === e.id);
    h += `<div class="row" style="gap:8px;margin-bottom:8px"><button class="li" style="margin:0;flex:1" data-a="openEx" data-id="${e.id}">
      <span class="ic"><span style="font-weight:700;font-size:13px">${t(CATS[e.cat].zh, CATS[e.cat].en.slice(0, 3))}</span></span>
      <span class="tx"><b>${esc(exName(e))}</b><span>${esc(e.muscles.slice(0, 3).map(m => t(muscleZh(m), m)).join(' · '))} · ${t(equipZh(e.equip), e.equip)}</span></span>
      ${inPlan.length && !ui.addTo ? `<span class="tag acc">${inPlan.map(dayShort).join(S.lang === 'zh' ? '' : ' ')}</span>` : ''}${I('right', 'muted')}</button>
      ${ui.addTo ? `<button class="ibtn" style="${inTarget ? 'background:var(--acc);color:var(--acc-ink);border-color:var(--acc)' : ''}" data-a="togPlan" data-id="${e.id}" data-v="${ui.addTo}" aria-pressed="${!!inTarget}" aria-label="${inTarget ? t('從計劃移除', 'Remove from plan') : t('加入計劃', 'Add to plan')} ${esc(exName(e))}">${I(inTarget ? 'check' : 'plus')}</button>` : ''}</div>`;
  });
  return h;
}

// ---------- ME ----------
function renderMe() {
  const p = S.profile, bmi = calcBMI(p.weight, p.height), bl = bmiLabel(bmi), gd = GOALS.find(g => g.id === S.goalId);
  const remain = +(p.weight - p.goalWeight).toFixed(1);
  let h = `<header class="ph"><div><div class="eyebrow">${gd ? t('目標 · ' + gd.zh, 'Goal · ' + gd.en) : ''}</div><h1 class="h1">${t('我', 'Me')}</h1></div>
    <div class="seg" role="group" aria-label="${t('語言', 'Language')}"><button data-a="lang" data-v="zh" aria-pressed="${S.lang === 'zh'}">中</button><button data-a="lang" data-v="en" aria-pressed="${S.lang === 'en'}">EN</button></div></header>`;
  h += `<section class="card hot"><div class="card-h"><h2 class="h2">${t('體重', 'Body weight')}</h2><span class="sub">${t('目標', 'Goal')} ${p.goalWeight} kg</span></div>
    <div class="row" style="align-items:flex-end;margin-bottom:10px"><span class="num" style="font-size:52px;font-weight:800;line-height:1">${p.weight}</span><span class="sub" style="font-size:16px;margin-bottom:6px">kg</span>
    <span class="sub" style="margin-left:auto;margin-bottom:6px">${remain > 0 ? t(`仲差 ${remain} kg`, `${remain} kg to go`) : remain < 0 ? t(`仲差 ${-remain} kg`, `${-remain} kg to go`) : t('已達標', 'Goal reached')}</span></div>
    <div class="row"><label class="sr" for="wNew">${t('今日體重', 'Today\'s weight')}</label><input id="wNew" class="input" inputmode="decimal" placeholder="${p.weight}" style="flex:1">
    <button class="btn btn-p" data-a="logW">${t('記錄今日', 'Log today')}</button></div></section>`;
  h += `<div class="grid2" style="margin-bottom:10px">
    <div class="tile"><span class="k">BMI</span><span class="v">${bmi}</span><span class="s">${t(bl.zh, bl.en)} · ${t('亞洲標準', 'Asian cut-offs')}</span></div>
    <div class="tile"><span class="k">TDEE</span><span class="v">${tdee(p.weight, p.height, p.age).toLocaleString()}</span><span class="s">kcal / ${t('日', 'day')}</span></div>
    <div class="tile"><span class="k">${t('蛋白質', 'Protein')}</span><span class="v">${Math.round(p.weight * 1.8)}</span><span class="s">g / ${t('日', 'day')}</span></div>
    <div class="tile"><span class="k">${t('飲水', 'Water')}</span><span class="v">${(p.weight * 0.033).toFixed(1)}</span><span class="s">L / ${t('日', 'day')}</span></div></div>`;
  { const ba = bodyAdvice(); h += `<section class="card"><div class="card-h"><h2 class="h2">${t('體重目標建議', 'Weight goal advice')}</h2>${stateChip(ba.state)}</div>
    <div class="row" style="gap:8px;margin-bottom:10px"><div class="field" style="flex:1"><label for="pf-goalDate">${t('目標日期（可選）', 'Goal date (optional)')}</label><input id="pf-goalDate" type="date" class="input" style="font-size:16px" value="${p.goalDate || ''}" data-c="goalDate"></div></div>
    <p style="font-size:15px;line-height:1.5">${esc(t(ba.zh, ba.en))}</p>${bodyPlanHTML()}</section>`; }
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('身體數據', 'Body stats')}</h2></div><div class="grid3">
    ${[['height', '身高 (cm)', 'Height (cm)'], ['age', '年齡', 'Age'], ['goalWeight', '目標體重', 'Goal (kg)']].map(([f, zh, en]) => `<div class="field"><label for="pf-${f}">${t(zh, en)}</label><input id="pf-${f}" class="input" inputmode="decimal" value="${p[f]}" data-c="prof" data-f="${f}"></div>`).join('')}</div></section>`;
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('檢討日', 'Review day')}</h2><span class="sub">${t('每星期睇一次進度', 'Check progress once a week')}</span></div>
    <div class="days7">${WD.map(d => `<button data-a="reviewDay" data-v="${d}" aria-pressed="${(S.reviewDay || 'Sun') === d}" aria-label="${dayLong(d)}">${dayShort(d)}</button>`).join('')}</div></section>`;
  h += `<section class="card"><div class="card-h"><h2 class="h2">${t('休息時間', 'Rest timer')}</h2><span class="sub">${t('完成一組自動開始', 'Starts when you tick a set')}</span></div>
    <div class="chips">${[30, 60, 90, 120, 180].map(s => `<button class="chip" data-a="rest" data-v="${s}" aria-pressed="${S.restSec === s}">${s < 60 ? s + 's' : s / 60 + (S.lang === 'zh' ? ' 分' : ' min')}</button>`).join('')}</div></section>`;
  h += `<section class="card row" style="justify-content:space-between"><div><div class="eyebrow">${t('目標', 'Goal')}</div><div class="h2">${gd ? t(gd.zh, gd.en) : '—'}</div></div><button class="btn btn-g" data-a="changeGoal">${t('更改', 'Change')}</button></section>`;
  const lb = S.lastBackup ? new Date(S.lastBackup) : null;
  const ago = lb ? Math.floor((Date.now() - lb) / 86400000) : null;
  h += `<section class="card hot"><div class="row" style="margin-bottom:10px"><span class="ex-badge" style="background:var(--acc-bg);color:var(--acc)">${I('shield')}</span>
    <div style="flex:1"><h2 class="h2">${t('備份', 'Backup')}</h2><div class="sub">${lb ? t(`上次備份：${ago === 0 ? '今日' : ago + ' 日前'}`, `Last backup: ${ago === 0 ? 'today' : ago + ' days ago'}`) : t('未備份過', 'Never backed up')}</div></div></div>
    <p class="sub" style="margin-bottom:12px">${t('資料只存喺呢部機。換手機或者清瀏覽器資料之前，記得先匯出。', 'Your data lives only on this device. Export before you switch phones or clear browser data.')}</p>
    <div class="grid2"><button class="btn btn-p" data-a="export">${I('download')}${t('匯出', 'Export')}</button><button class="btn btn-g" data-a="import">${I('upload')}${t('匯入', 'Import')}</button></div></section>`;
  h += `<button class="btn btn-g btn-w btn-danger" data-a="resetWeek" style="margin-top:4px">${I('reset')}${t('重置本週積分', 'Reset this week\'s points')}</button>
    <p class="sub" style="text-align:center;margin-top:18px">FitTrack 3.7</p>`;
  return h;
}

// ---------- ONBOARDING ----------
function renderOb() {
  const o = ui.ob; let h = '<div class="ob">';
  if (o.step === 0) {
    h += `<div class="grow"></div><div class="mark">${I('dumbbell')}</div><div><h1 class="h1" style="font-size:52px">FitTrack</h1><p class="sub" style="font-size:16px">記錄訓練 · 睇住自己進步<br>Track workouts, watch yourself improve</p></div><div class="grow"></div>
      <div class="grid2"><button class="btn btn-p" data-a="obLang" data-v="zh">繁體中文</button><button class="btn btn-g" data-a="obLang" data-v="en">English</button></div>`;
  } else if (o.step === 1) {
    h += `<div><div class="eyebrow">${t('第 1 步，共 3 步', 'Step 1 of 3')}</div><h1 class="h1">${t('你嘅目標係？', 'What\'s your goal?')}</h1></div>
      <div class="grid2">${GOALS.map(g => `<button class="goal" data-a="obGoal" data-v="${g.id}" aria-pressed="${o.goal === g.id}">${I('target')}${t(g.zh, g.en)}</button>`).join('')}</div><div class="grow"></div>
      <div class="row">${o.edit ? `<button class="btn btn-g" data-a="obCancel">${t('取消', 'Cancel')}</button>` : `<button class="btn btn-g" data-a="obBack">${I('back')}</button>`}<button class="btn btn-p" style="flex:1" data-a="obNext" ${o.goal ? '' : 'disabled'}>${t('下一步', 'Next')}</button></div>`;
  } else if (o.step === 2) {
    const q = (GQS[o.goal] || [])[o.qi];
    h += `<div><div class="eyebrow">${t('第 2 步，共 3 步', 'Step 2 of 3')}</div><h1 class="h1" style="font-size:34px">${esc(t(q.zh, q.en))}</h1></div><div>`;
    if (q.type === 'choice') h += q.opts.map(op => `<button class="opt" data-a="obAns" data-q="${q.id}" data-v="${op.id}" aria-pressed="${o.ans[q.id] === op.id}">${esc(t(op.zh, op.en))}</button>`).join('');
    else { const v = o.ans[q.id] ?? q.def; o.ans[q.id] = v; h += `<div class="row" style="justify-content:center;margin:12px 0"><span class="num" id="obNumV" style="font-size:64px;font-weight:800">${v}</span><span class="sub" style="font-size:18px">${esc(q.unit === '日' ? t('日', 'days') : q.unit === '分鐘' ? t('分鐘', 'min') : q.unit)}</span></div><label class="sr" for="obR">${esc(t(q.zh, q.en))}</label><input id="obR" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${v}" data-c="obNum" data-q="${q.id}">`; }
    h += `</div><div class="grow"></div><div class="row"><button class="btn btn-g" data-a="obBack">${I('back')}</button><button class="btn btn-p" style="flex:1" data-a="obNext" ${q.type === 'choice' && !o.ans[q.id] ? 'disabled' : ''}>${t('下一步', 'Next')}</button></div>`;
  } else {
    const p = S.profile;
    h += `<div><div class="eyebrow">${t('第 3 步，共 3 步', 'Step 3 of 3')}</div><h1 class="h1">${t('身體數據', 'Your body')}</h1><p class="sub">${t('用嚟計你嘅每日目標', 'Used to work out your daily targets')}</p></div>
      <div class="grid2">${[['weight', '體重 (kg)', 'Weight (kg)'], ['goalWeight', '目標體重 (kg)', 'Goal weight (kg)'], ['height', '身高 (cm)', 'Height (cm)'], ['age', '年齡', 'Age']].map(([f, zh, en]) => `<div class="field"><label for="ob-${f}">${t(zh, en)}</label><input id="ob-${f}" class="input" inputmode="decimal" value="${p[f]}"></div>`).join('')}</div>
      <div class="grow"></div><div class="row"><button class="btn btn-g" data-a="obBack">${I('back')}</button><button class="btn btn-p" style="flex:1" data-a="obFinish">${o.edit ? t('儲存', 'Save') : t('開始訓練', 'Start training')}</button></div>`;
  }
  return h + '</div>';
}

// ---------- TARGETS ----------
function stateChip(st) {
  const M = { done: ['已達標', 'Reached', 'gold'], ontrack: ['進度良好', 'On track', 'acc'], improving: ['有進步', 'Improving', 'acc'], behind: ['落後', 'Behind', 'bad'], late: ['過咗期限', 'Past date', 'bad'], flat: ['停滯', 'Stalled', 'bad'], nodata: ['未有記錄', 'No data', ''], nopace: ['計算中', 'Measuring', ''] }[st] || ['', '', ''];
  return M[0] ? `<span class="tag ${M[2]}">${t(M[0], M[1])}</span>` : '';
}
function targetForm(ex) {
  const tg = S.targets[ex.id] || {}, sg = nextLoad(ex.id), ses = exSessions(ex.id), best = ses.length ? Math.max(...ses.map(s => s.heaviest)) : 0;
  const defKg = tg.kg || (best ? Math.ceil(best * 1.1 / 2.5) * 2.5 : ''), defReps = tg.reps || planReps(ex.id);
  const d = new Date(); d.setDate(d.getDate() + 56); const defBy = tg.by || d.toISOString().slice(0, 10);
  return `<form class="tform" data-id="${ex.id}" onsubmit="return false">
    <div class="grid3"><div class="field"><label for="tg-kg">${t('重量 (kg)', 'Weight (kg)')}</label><input id="tg-kg" class="input" inputmode="decimal" value="${defKg}" required></div>
    <div class="field"><label for="tg-reps">${t('次數', 'Reps')}</label><input id="tg-reps" class="input" inputmode="numeric" value="${defReps}"></div>
    <div class="field"><label for="tg-by">${t('期限', 'By')}</label><input id="tg-by" type="date" class="input" style="font-size:14px;padding:0 6px" value="${defBy}"></div></div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn btn-p" style="flex:1" data-a="tgSave" data-id="${ex.id}">${t('儲存目標', 'Save target')}</button><button type="button" class="btn btn-g" data-a="tgCancel" data-id="${ex.id}">${t('取消', 'Cancel')}</button></div></form>`;
}
function targetBlock(ex, editing) {
  const st = targetStatus(ex.id), sg = nextLoad(ex.id);
  let h = '';
  if (sg) h += `<section class="card" style="margin-top:12px"><div class="card-h"><h2 class="h3">${t('下次建議', 'Next session')}</h2></div><div class="sugg" style="margin:0"><span class="sugg-i ${sg.kind}">${I(sg.kind === 'up' ? 'chart' : sg.kind === 'down' ? 'reset' : 'target')}</span><div style="flex:1;min-width:0"><b class="num">${sg.kg ? sg.kg + ' kg × ' : ''}${sg.reps} ${t('次', 'reps')}</b><span>${esc(t(sg.zh, sg.en))}</span></div></div></section>`;
  h += `<section class="card" style="margin-top:${sg ? 0 : 12}px"><div class="card-h"><h2 class="h3">${t('目標', 'Target')}</h2>${st ? stateChip(st.state) : ''}</div>`;
  if (editing || ui.tgEdit === ex.id) h += targetForm(ex);
  else if (!st) h += (strengthReport(ex.id) ? `<h3 class="h3" style="margin-bottom:6px">${t('每週進度', 'Weekly progress')}</h3>${strengthReportHTML(strengthReport(ex.id))}` : '') + `<p class="sub" style="margin-bottom:10px">${t('設定一個目標，例如喺某日之前做到某個重量，App 會話你進度同點樣調整。', 'Set a target weight and date and the app tracks your pace and tells you how to adjust.')}</p><button class="btn btn-g btn-w" data-a="tgEdit" data-id="${ex.id}">${I('target')}${t('設定目標', 'Set a target')}</button>`;
  else {
    const adv = targetAdvice(ex.id, st), tg = st.tg;
    h += `<div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:6px"><b class="num" style="font-size:22px">${tg.kg} kg × ${tg.reps}</b><span class="sub">${tg.by ? t('期限 ', 'by ') + fmtDate(tg.by) : t('冇期限', 'no deadline')}</span></div>
      <div class="bar" style="margin-bottom:6px"><i style="width:${st.pct}%"></i></div>
      <div class="row sub small" style="justify-content:space-between;margin-bottom:10px"><span>${t('估算 1RM', 'Est. 1RM')} <b class="num" style="color:var(--tx)">${Math.round(st.cur)}</b> / ${Math.round(st.goal)} kg</span><span class="num">${st.pct}%</span></div>
      <p style="font-size:15px;line-height:1.5;margin-bottom:10px">${esc(t(adv.zh, adv.en))}</p>
      ${planHTML(ex.id)}
      <div class="row"><button class="btn btn-g" style="flex:1" data-a="tgEdit" data-id="${ex.id}">${t('修改', 'Edit')}</button><button class="btn btn-g btn-danger" data-a="tgDel" data-id="${ex.id}">${t('刪除', 'Remove')}</button></div>`;
  }
  return h + '</section>';
}
const WK = { hit: ['✓', 'hit'], miss: ['✗', 'miss'], skip: ['–', 'skip'], now: ['●', 'now'], next: ['', 'next'] };
function planHTML(id) {
  const pl = targetPlan(id); if (!pl || pl.empty) return '';
  const hit = pl.weeks.filter(w => w.status === 'hit').length, past = pl.weeks.filter(w => w.status === 'hit' || w.status === 'miss' || w.status === 'skip').length;
  let h = `<div class="plan"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 class="h3">${t('達標計劃', 'Plan to target')}</h3><span class="sub small">${t(`${pl.weeks.length} 星期 · 已達 ${hit}/${past}`, `${pl.weeks.length} weeks · hit ${hit}/${past}`)}</span></div>
    <p class="sub small" style="margin-bottom:8px">${t(`由 ${fmtDate(pl.tg.set)} 起，每星期估算 1RM 要加約 ${pl.perWeek.toFixed(1)} kg（${pl.pct.toFixed(1)}%）。每個星期做到一組就當達標。`, `From ${fmtDate(pl.tg.set)}: about +${pl.perWeek.toFixed(1)} kg est. 1RM a week (${pl.pct.toFixed(1)}%). One set at the weekly number counts.`)}</p>`;
  h += targetReportHTML(id);
  if (pl.aggressive) h += `<p class="warn">${I('alert')}<span>${t(`呢個期限要每星期進步 ${pl.pct.toFixed(1)}%，比一般穩定速度（約 1.5%）快好多，容易受傷或者停滯。建議將期限延到 ${fmtDate(pl.suggestBy)}。`, `This deadline needs ${pl.pct.toFixed(1)}% a week, much faster than a steady 1.5%. Consider moving it to ${fmtDate(pl.suggestBy)}.`)}</span></p>`;
  h += `<ol class="weeks">${pl.weeks.map(w => `<li class="wk ${WK[w.status][1]}"><span class="wn">${t('第', 'W')}${w.n}${t('週', '')}</span><span class="wd">${fmtDate(w.ws)}</span><b class="num">${w.kg ? w.kg + ' kg × ' : ''}${w.reps}</b><span class="ws" aria-label="${w.status}">${WK[w.status][0]}</span></li>`).join('')}</ol></div>`;
  return h;
}
function bodyReportHTML(bp) {
  if (!bp) return '';
  if (bp.done) return `<div class="report good">${I('trophy')}<div><b>${t('已經達到目標體重！', 'Goal weight reached!')}</b></div></div>`;
  const wkTxt = t(`第 ${bp.weekNo} 週（共 ${bp.total} 週）`, `Week ${bp.weekNo} of ${bp.total}`);
  if (bp.actual === null || !bp.lastLog || bp.lastLog.date < bp.start.date) return `<div class="report"><span class="rk">${wkTxt}</span><div><b class="num">${t(`而家應該約 ${bp.expected} kg`, `You should be about ${bp.expected} kg now`)}</b><span>${t('記錄今日體重就知你有冇跟上。', 'Log today\'s weight to see if you are on track.')}</span></div></div>`;
  const cls = bp.ahead >= 0 ? 'good' : bp.ahead >= -0.5 ? '' : 'bad';
  const msg = bp.ahead >= 0.1 ? t(`比計劃快 ${bp.ahead} kg，做得好！`, `${bp.ahead} kg ahead of plan. Nice work!`)
    : bp.ahead > -0.1 ? t('啱啱好跟住計劃。', 'Right on plan.')
    : bp.ahead >= -0.5 ? t(`比計劃慢 ${-bp.ahead} kg，仲追得返。`, `${-bp.ahead} kg behind, easy to catch up.`)
    : t(`比計劃慢 ${-bp.ahead} kg。檢查吓食量同步數，或者考慮延長期限。`, `${-bp.ahead} kg behind. Check your food and steps, or consider a later date.`);
  return `<div class="report ${cls}"><span class="rk">${wkTxt}</span><div><b class="num">${t(`應該 ${bp.expected} kg · 你 ${bp.actual} kg`, `Plan ${bp.expected} kg · you ${bp.actual} kg`)}</b><span>${msg}${bp.lastLog.date !== isoToday() ? t(`（最近記錄：${fmtDate(bp.lastLog.date)}）`, ` (last logged ${fmtDate(bp.lastLog.date)})`) : ''}</span></div></div>`;
}
function targetReportHTML(id) {
  const r = targetReport(id); if (!r) return '';
  const w = r.wk, n = r.pl.weeks.length;
  const msg = r.hitThisWeek ? t('今個星期已經達標 ✓', 'Done for this week ✓')
    : r.bestNow === 0 ? t('最近兩星期未有記錄。', 'Nothing logged in the last two weeks.')
    : r.gap >= 0 ? t('你嘅水平已經夠，做一組就達標。', 'You are strong enough; one set at this weight does it.')
    : t(`差約 ${Math.round(-r.gap)} kg（估算 1RM）。`, `About ${Math.round(-r.gap)} kg (est. 1RM) short.`);
  return `<div class="report ${r.hitThisWeek || r.gap >= 0 ? 'good' : r.gap > -r.shouldE1 * 0.05 ? '' : 'bad'}"><span class="rk">${t(`第 ${w.n} 週（共 ${n} 週）`, `Week ${w.n} of ${n}`)}</span><div><b class="num">${t(`應該做到 ${w.kg} kg × ${w.reps}`, `Should hit ${w.kg} kg × ${w.reps}`)}</b><span>${msg}</span></div></div>`;
}
function bodyPlanHTML() {
  const bp = bodyPlan(); if (!bp) return '';
  const log = S.bodyLog || [];
  const startIdx = Math.max(0, bp.weekNo - 3), shown = bp.weeks.slice(startIdx, startIdx + 12);
  return `<div class="plan" style="margin-top:12px"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h3 class="h3">${t('每星期體重目標', 'Weekly weight targets')}</h3><span class="sub small">${t(`由 ${fmtDate(bp.start.date)}（${bp.start.kg} kg）開始`, `From ${fmtDate(bp.start.date)} (${bp.start.kg} kg)`)}</span></div>
    ${bodyReportHTML(bp)}
    ${bp.capped ? `<p class="warn">${I('alert')}<span>${t(`你揀嘅日期太急，已經按安全速度計，大約 ${fmtDate(bp.safeDate)} 達標。`, `Your date is too fast, so this uses a safe pace and reaches the goal around ${fmtDate(bp.safeDate)}.`)}</span></p>` : ''}
    <ol class="weeks">${shown.map(w => { const from = new Date(new Date(w.date + 'T12:00:00').getTime() - 7 * 864e5).toISOString().slice(0, 10); const got = log.filter(x => x.date <= w.date && x.date > from).pop(); const ok = got && (bp.per < 0 ? got.kg <= w.kg + 0.2 : got.kg >= w.kg - 0.2); const st = w.date <= isoToday() ? (got ? (ok ? 'hit' : 'miss') : 'skip') : (w.n === bp.weekNo ? 'now' : 'next');
      return `<li class="wk ${WK[st][1]}"><span class="wn">${t('第', 'W')}${w.n}${t('週', '')}</span><span class="wd">${fmtDate(w.date)}</span><b class="num">${w.kg} kg</b><span class="ws">${WK[st][0]}</span></li>`; }).join('')}</ol>
    ${bp.weeks.length > startIdx + 12 ? `<p class="sub small" style="margin-top:6px">${t(`之後再 ${bp.weeks.length - startIdx - 12} 星期，${fmtDate(bp.endDate)} 去到 ${bp.goal} kg`, `${bp.weeks.length - startIdx - 12} more weeks to ${bp.goal} kg by ${fmtDate(bp.endDate)}`)}</p>` : ''}
    <button class="btn btn-g btn-w" data-a="bodyRestart" style="margin-top:10px">${I('reset')}${t('由今日重新開始計劃', 'Restart the plan from today')}</button></div>`;
}
function strengthReportHTML(r) {
  if (!r) return '';
  const set = x => `${x.kg} kg × ${x.reps}`;
  const wk = t(`第 ${r.weekNo} 週`, `Week ${r.weekNo}`);
  let cls = '', main, msg;
  if (r.state === 'start') {
    main = t(`起點：${r.you ? set(r.you) : set(r.should)}`, `Starting point: ${r.you ? set(r.you) : set(r.should)}`);
    msg = r.comeback ? t('休息咗一段時間，由今次重新計。', 'Back after a break, so the clock restarts here.') : t('第一個星期，呢個就係你嘅起點。', 'Your first week, so this is your baseline.');
  } else if (r.state === 'idle') {
    cls = 'bad'; main = t(`應該做到 ${set(r.should)}`, `Should be at ${set(r.should)}`);
    msg = t(`已經 ${Math.round(r.daysOff)} 日冇練。${r.daysOff > 28 ? '下次練會由新起點計。' : '盡快練返，一個月內返嚟唔會重新計。'}`, `${Math.round(r.daysOff)} days since you trained it. ${r.daysOff > 28 ? 'Next session starts a new baseline.' : 'Come back within 4 weeks to keep the plan.'}`);
  } else {
    const pct = Math.round(r.gap * 100);
    cls = r.state === 'ontrack' ? 'good' : r.state === 'behind' ? 'bad' : '';
    main = t(`應該 ${set(r.should)} · 你 ${set(r.you)}`, `Plan ${set(r.should)} · you ${set(r.you)}`);
    msg = r.state === 'ontrack' ? (pct >= 3 ? t(`比計劃強 ${pct}%，做得好！`, `${pct}% ahead of plan. Nice work!`) : t('跟得上計劃。', 'On plan.'))
      : r.state === 'close' ? t(`差少少（${-pct}%）。下次照建議加重或者加次數就追得返。`, `Slightly behind (${-pct}%). Follow the next-session suggestion to catch up.`)
      : t(`落後 ${-pct}%。檢查吓每星期有冇練夠呢個動作、瞓得夠唔夠、蛋白質夠唔夠；連續做唔足就減 10% 再加返上去。`, `${-pct}% behind. Check you train it every week, sleep and protein; if you keep missing reps, drop 10% and build back up.`);
  }
  return `<div class="report ${cls}"><span class="rk">${wk}</span><div><b class="num">${main}</b><span>${msg}</span><span class="num">${t('之後', 'Next')}：${r.ahead.map(a => t(`${a.k} 週後 ${set(a)}`, `in ${a.k} wk ${set(a)}`)).join(' · ')}</span></div></div>`;
}
function reviewHTML(rv) {
  const md = d => d.slice(5).replace('-', '/');
  const g = grade(rv.score);
  const tips = [];
  if (rv.planned && rv.done < rv.planned) tips.push(t(`今個星期練咗 ${rv.done} 日，計劃係 ${rv.planned} 日。下星期預先揀定時間，或者將計劃改少一日都得。`, `You trained ${rv.done} of ${rv.planned} planned days. Book the times ahead, or plan one day fewer.`));
  rv.judged.filter(l => !l.ok && !l.close).forEach(l => tips.push(t(`${exName(EX[l.id])} 落後：下星期每次都做足先加重；連續兩次做唔足就減 10%。`, `${exName(EX[l.id])} is behind: add weight only after hitting every rep; drop 10% after two misses.`)));
  if (rv.vol.cardio < rv.sc.cardio * 0.9) tips.push(t(`有氧做咗 ${rv.vol.cardio} 分鐘，目標 ${rv.sc.cardio}。可以每次加 10 分鐘斜坡行，或者多行啲路。`, `Cardio ${rv.vol.cardio} of ${rv.sc.cardio} min. Add 10 minutes of incline walking per session, or walk more.`));
  const low = ['chest', 'back', 'legs', 'shoulders', 'arms'].filter(c => (rv.vol.sets[c] || 0) < rv.sc.sets[0]);
  if (low.length) tips.push(t(`${low.map(c => CATS[c].zh).join('、')}今個星期少過 ${rv.sc.sets[0]} 組。每個部位一星期練兩次最容易夠量。`, `${low.map(c => CATS[c].en).join(', ')} got fewer than ${rv.sc.sets[0]} sets. Training each part twice a week makes this easy.`));
  if (!rv.weighed) tips.push(t('今個星期未記體重，記低先比較到減重進度。', 'No weigh-in this week; log one so the weight plan can compare.'));
  if (rv.bp && rv.bp.ahead !== null && rv.bp.ahead < -0.5) tips.push(t('體重落後計劃：檢查食量同步數。', 'Weight is behind plan: check food and steps.'));
  if (!tips.length) tips.push(t('全部跟上計劃，下星期照做！', 'Everything on plan. Same again next week!'));
  const liftRow = l => {
    const icon = l.base ? '●' : l.ok ? '✓' : l.close ? '≈' : '✗', cls = l.base ? 'next' : l.ok ? 'hit' : l.close ? 'now' : 'miss';
    const r = l.r, txt = l.kind === 'target' ? t(`目標週：${r.wk.kg} kg × ${r.wk.reps}`, `Target week: ${r.wk.kg} kg × ${r.wk.reps}`)
      : r.state === 'start' ? t(`起點 ${r.you ? r.you.kg + ' kg × ' + r.you.reps : ''}`, `Baseline ${r.you ? r.you.kg + ' kg × ' + r.you.reps : ''}`)
      : `${t('應該', 'Plan')} ${r.should.kg} kg × ${r.should.reps}${r.you ? ` · ${t('你', 'you')} ${r.you.kg} kg × ${r.you.reps}` : ''}`;
    return `<li class="${cls}"><span class="n">${esc(exName(EX[l.id]))}</span><span class="v num">${txt}</span><span class="i">${icon}</span></li>`;
  };
  return `<section class="card hot review"><div class="card-h"><h2 class="h2">${t('每週檢討', 'Weekly review')}</h2><span class="sub small num">${md(rv.from)} – ${md(rv.to)}</span></div>
    <div class="grid3" style="margin-bottom:10px">
      <div class="tile"><span class="k">${t('訓練', 'Workouts')}</span><span class="v">${rv.done}<small style="font-size:14px;color:var(--tx2)">/${rv.planned}</small></span><span class="s">${t('日', 'days')}</span></div>
      <div class="tile"><span class="k">${t('動作跟上', 'Lifts on plan')}</span><span class="v">${rv.judged.length ? `${rv.judged.filter(l => l.ok).length}<small style="font-size:14px;color:var(--tx2)">/${rv.judged.length}</small>` : '—'}</span><span class="s">${rv.lifts.length - rv.judged.length ? t(`${rv.lifts.length - rv.judged.length} 個新起點`, `${rv.lifts.length - rv.judged.length} new baselines`) : rv.prs.length ? t(`${rv.prs.length} 個新紀錄`, `${rv.prs.length} PRs`) : t('個動作', 'lifts')}</span></div>
      <div class="tile"><span class="k">${t('評級', 'Grade')}</span><span class="v" style="color:var(--acc)">${g}</span><span class="s">${rv.score} / 100</span></div></div>
    ${rv.bp ? bodyReportHTML(rv.bp) : ''}
    ${!rv.weighed ? `<div class="row" style="margin-bottom:10px"><label class="sr" for="rvW">${t('今日體重', 'Today\'s weight')}</label><input id="rvW" class="input" inputmode="decimal" placeholder="${t('今日體重 kg', 'Today\'s weight kg')}" style="flex:1"><button class="btn btn-g" data-a="rvLogW">${t('記錄', 'Log')}</button></div>` : ''}
    ${rv.lifts.length ? `<h3 class="h3" style="margin:6px 0">${t('今個星期嘅動作', 'This week\'s lifts')}</h3><ul class="rvlist">${rv.lifts.map(liftRow).join('')}</ul>` : ''}
    <h3 class="h3" style="margin:12px 0 6px">${t('訓練量', 'Volume')} <span class="sub small">· ${t(rv.sc.zh, rv.sc.en)}</span></h3><ul class="rvlist">
      <li class="${rv.vol.cardio >= rv.sc.cardio * 0.9 ? 'hit' : rv.vol.cardio >= rv.sc.cardio * 0.6 ? 'now' : 'miss'}"><span class="n">${t('有氧', 'Cardio')}</span><span class="v num">${rv.vol.cardio} / ${rv.sc.cardio} ${t('分鐘', 'min')}</span><span class="i">${rv.vol.cardio >= rv.sc.cardio * 0.9 ? '✓' : rv.vol.cardio >= rv.sc.cardio * 0.6 ? '≈' : '✗'}</span></li>
      ${['chest', 'back', 'legs', 'shoulders', 'arms'].map(c => { const n = rv.vol.sets[c] || 0, [a, b] = rv.sc.sets, st = n >= a && n <= b + 4 ? 'hit' : n >= a * 0.6 ? 'now' : 'miss'; return `<li class="${st}"><span class="n">${t(CATS[c].zh, CATS[c].en)}</span><span class="v num">${n} ${t('組', 'sets')} · ${t('目標', 'aim')} ${a}–${b}</span><span class="i">${st === 'hit' ? '✓' : st === 'now' ? '≈' : '✗'}</span></li>`; }).join('')}</ul>
    <h3 class="h3" style="margin:12px 0 6px">${t('要改進', 'To work on')}</h3><ul class="rvtips">${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${rv.next.length || rv.nextBody ? `<h3 class="h3" style="margin:12px 0 6px">${t('下星期目標', 'Next week')}</h3><ul class="rvlist">${rv.nextBody ? `<li class="next"><span class="n">${t('體重', 'Body weight')}</span><b class="v num">${rv.nextBody.kg} kg</b></li>` : ''}${rv.next.map(x => `<li class="next"><span class="n">${esc(exName(EX[x.id]))}</span><b class="v num">${x.s.kg} kg × ${x.s.reps}</b></li>`).join('')}</ul>` : ''}
    <button class="btn btn-p btn-w" data-a="reviewDone" style="margin-top:12px">${I('check')}${t('完成檢討', 'Finish review')}</button></section>`;
}
function reviewLogCard() {
  const list = (S.reviews || []).slice(-8).reverse();
  let h = `<section class="card"><div class="card-h"><h2 class="h2">${t('每週檢討', 'Weekly reviews')}</h2><button class="btn btn-g" data-a="reviewOpen" style="min-height:36px;padding:0 12px">${t('睇今週', 'This week')}</button></div>`;
  if (ui.reviewOpen) h += '</section>' + reviewHTML(weeklyReview()) + '<section class="card">';
  h += list.length ? `<ol class="weeks">${list.map(r => `<li class="wk ${r.score >= 70 ? 'hit' : r.score >= 45 ? 'now' : 'miss'}"><span class="wd num" style="width:52px">${r.date.slice(5).replace('-', '/')}</span><span class="num" style="flex:1;font-size:13px">${r.lifts ? t(`練 ${r.done}/${r.planned} 日 · 動作 ${r.ok}/${r.lifts}`, `${r.done}/${r.planned} days · lifts ${r.ok}/${r.lifts}`) : t(`練 ${r.done}/${r.planned} 日`, `${r.done}/${r.planned} days`)}${r.kg ? ` · ${r.kg} kg` : ''}</span><b class="num">${grade(r.score)}</b><span class="ws"></span></li>`).join('')}</ol>`
    : `<p class="sub small">${t(`每逢${dayLong(S.reviewDay || 'Sun')}，「今日」頁會出檢討。完成之後會記低喺度。`, `Every ${dayLong(S.reviewDay || 'Sun')} a review appears on Today. Finished reviews are listed here.`)}</p>`;
  return h + '</section>';
}
function liftGoalsCard() {
  const gs = liftGoals(); if (!gs.length) return '';
  const bw = S.profile.goalWeight;
  return `<section class="card"><div class="card-h"><h2 class="h2">${t('按目標體重定重量', 'Lift goals for your goal weight')}</h2><span class="sub small num">${bw} kg</span></div>
    <p class="sub small" style="margin-bottom:8px">${t(`用力量標準（體重嘅倍數，估算 1RM）計：去到 ${bw} kg 嗰陣，每個動作下一級應該做幾重。${cutting() ? '減緊重，所以速度按正常嘅 2/3 計。' : ''}`, `From strength standards (multiples of body weight, est. 1RM): what the next level is at ${bw} kg.${cutting() ? ' You are cutting, so the pace is two thirds of normal.' : ''}`)}</p>
    <ul class="rvlist">${gs.map(g => {
      const has = !!S.targets[g.id];
      const main = g.reached ? t(`已經係${g.level[0]}（${g.nowRatio.toFixed(2)}× 體重）`, `Already ${g.level[1]} (${g.nowRatio.toFixed(2)}× BW)`)
        : t(`${g.level[0]}：${g.kg} kg × ${g.reps}`, `${g.level[1]}: ${g.kg} kg × ${g.reps}`);
      const sub = g.reached ? t('保持就得，或者自己設更高目標。', 'Maintain, or set a higher target yourself.')
        : t(`而家 1RM 約 ${Math.round(g.best)} kg（${g.nowRatio.toFixed(2)}×）→ 要 ${Math.round(g.goalE1)} kg（${g.ratio}×）· 約 ${g.weeks} 星期`, `Est. 1RM ${Math.round(g.best)} kg (${g.nowRatio.toFixed(2)}×) → ${Math.round(g.goalE1)} kg (${g.ratio}×) · about ${g.weeks} weeks`);
      return `<li style="flex-wrap:wrap"><div style="flex:1;min-width:0"><span class="n" style="display:block">${esc(exName(EX[g.id]))}</span><b class="num" style="display:block;font-size:15px;margin-top:2px">${main}</b><span class="sub small" style="display:block;margin-top:2px">${sub}</span></div>
        ${g.reached ? '' : has ? `<span class="tag">${t('已設目標', 'Target set')}</span>` : `<button class="btn btn-g" data-a="tgFromGoal" data-id="${g.id}" style="min-height:36px;padding:0 12px">${t('設為目標', 'Set')}</button>`}</li>`;
    }).join('')}</ul></section>`;
}
function liftProgressCard() {
  const list = trainedIds().filter(id => !S.targets[id]).map(id => strengthReport(id)).filter(r => r && r.daysOff <= 42)
    .sort((a, b) => a.daysOff - b.daysOff);
  if (!list.length) return '';
  return `<section class="card"><div class="card-h"><h2 class="h2">${t('力量進度', 'Strength progress')}</h2><span class="sub small">${t('每星期應該去到邊', 'Where you should be each week')}</span></div>
    <p class="sub small" style="margin-bottom:8px">${t('由第一次練（或者休息超過 4 星期之後返嚟嗰次）開始計：頭 12 星期每週估算 1RM 加約 1.5%，之後 1%，半年後 0.5%。', 'Counted from your first session (or your return after 4+ weeks off): est. 1RM about +1.5% a week for 12 weeks, then 1%, then 0.5% after six months.')}</p>
    ${list.slice(0, 10).map(r => `<button class="tgrow" data-a="openEx" data-id="${r.id}"><div class="row" style="justify-content:space-between;gap:8px;margin-bottom:6px"><b>${esc(exName(EX[r.id]))}</b><span class="sub small">${t(`練咗 ${r.sessions} 次`, `${r.sessions} sessions`)}</span></div>${strengthReportHTML(r)}</button>`).join('')}</section>`;
}
function targetsCard() {
  const ids = Object.keys(S.targets || {}).filter(id => EX[id]);
  let h = `<section class="card hot"><div class="card-h"><h2 class="h2">${t('我嘅目標', 'My targets')}</h2><button class="btn btn-g" data-a="tgPick" style="min-height:36px;padding:0 12px">${I('plus')}${t('新增', 'Add')}</button></div>`;
  if (ui.tgPick) {
    const opts = EX_LIST.filter(e => !e.isCardio && !S.targets[e.id]);
    const tr = trainedIds();
    opts.sort((a, b) => (tr.includes(b.id) - tr.includes(a.id)) || a.zh.localeCompare(b.zh));
    h += `<div class="field" style="margin-bottom:10px"><label for="tgPickSel">${t('揀動作', 'Choose an exercise')}</label><select id="tgPickSel" class="input" style="font-size:16px" data-c="tgPick"><option value="">—</option>${opts.map(e => `<option value="${e.id}">${esc(exName(e))}${tr.includes(e.id) ? ' ●' : ''}</option>`).join('')}</select></div>`;
  }
  if (!ids.length && !ui.tgPick) h += `<p class="sub">${t('撳「新增」揀一個動作設目標，例如「深蹲 100 kg × 5，12 月前」。', 'Tap Add to set one, e.g. “Squat 100 kg × 5 by December”.')}</p>`;
  ids.forEach(id => {
    const st = targetStatus(id), adv = targetAdvice(id, st);
    h += `<button class="tgrow" data-a="openEx" data-id="${id}"><div class="row" style="justify-content:space-between;gap:8px"><b>${esc(exName(EX[id]))}</b>${stateChip(st.state)}</div>
      <div class="row sub small" style="justify-content:space-between;margin:4px 0 6px"><span class="num">${st.tg.kg} kg × ${st.tg.reps}${st.tg.by ? ' · ' + fmtDate(st.tg.by) : ''}</span><span class="num">${st.pct}%</span></div>
      <div class="bar"><i style="width:${st.pct}%"></i></div><div style="margin-top:8px">${targetReportHTML(id)}</div><span class="sub small" style="display:block;margin-top:4px">${esc(t(adv.zh, adv.en))}</span></button>`;
  });
  const ba = bodyAdvice();
  h += `<button class="tgrow" data-a="tab" data-v="me"><div class="row" style="justify-content:space-between"><b>${t('體重', 'Body weight')} → ${S.profile.goalWeight} kg</b>${stateChip(ba.state)}</div><div style="margin-top:8px">${bodyReportHTML(bodyPlan())}</div></button>`;
  return h + '</section>';
}

// ---------- EXERCISE SHEET (Summary / History / How to) ----------
const METRICS = [
  { id: 'heaviest', zh: '最重重量', en: 'Heaviest weight', u: 'kg' },
  { id: 'e1rm', zh: '估算 1RM', en: 'Est. 1RM', u: 'kg' },
  { id: 'bestSet', zh: '最佳一組容量', en: 'Best set volume', u: 'kg' },
  { id: 'volume', zh: '單次總容量', en: 'Session volume', u: 'kg' },
  { id: 'reps', zh: '總次數', en: 'Total reps', u: 'reps' }
];
const RANGES = [['1m', '1 個月', '1 month', 31], ['3m', '3 個月', '3 months', 92], ['1y', '1 年', '1 year', 366], ['all', '全部', 'All time', 0]];
function exSessions(id) {
  const out = [];
  for (const h of S.history) {
    const sets = h.sets && h.sets[id]; if (!Array.isArray(sets)) continue;
    const ds = sets.filter(x => x.done !== false && num(x.reps) > 0); if (!ds.length) continue;
    const w = x => num(x.weight), r = x => num(x.reps);
    out.push({
      date: h.date, sets: ds,
      heaviest: Math.max(...ds.map(w)),
      e1rm: Math.max(...ds.map(x => (r(x) === 1 ? w(x) : w(x) * (1 + r(x) / 30)))),   // Epley
      bestSet: Math.max(...ds.map(x => w(x) * r(x))),
      volume: ds.reduce((a, x) => a + w(x) * r(x), 0),
      reps: ds.reduce((a, x) => a + r(x), 0)
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  let run = 0; out.forEach(o => { o.pr = o.heaviest > run && run > 0; if (o.heaviest > run) run = o.heaviest; });
  return out;
}
const fmtVal = (v, u) => u === 'reps' ? `${Math.round(v)} ${t('次', 'reps')}` : `${(Math.round(v * 10) / 10).toLocaleString()} kg`;
const fmtDate = (iso, long) => new Date(iso + 'T12:00:00').toLocaleDateString(S.lang === 'zh' ? 'zh-HK' : 'en-GB', long ? { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' } : { month: 'short', day: 'numeric' });
function niceStep(span) { const raw = span / 3, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function metricChart(pts, metric, sel) {
  const W = 340, H = 176, L = 46, R = 10, Tp = 10, B = 26, u = METRICS.find(m => m.id === metric).u;
  const vs = pts.map(p => p.v); let lo = Math.min(...vs), hi = Math.max(...vs); if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const st = niceStep(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  const t0 = new Date(pts[0].date).getTime(), t1 = new Date(pts[pts.length - 1].date).getTime(), span = Math.max(1, t1 - t0);
  const x = p => pts.length === 1 ? (L + W - R) / 2 : L + (new Date(p.date).getTime() - t0) / span * (W - L - R);
  const y = v => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += st) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--s2)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${u === 'reps' ? Math.round(v) : (+v.toFixed(1)).toLocaleString()}${u === 'kg' ? ' kg' : ''}</text>`;
  const ticks = pts.length < 3 ? [0, pts.length - 1] : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  [...new Set(ticks)].forEach((k, n, arr) => { g += `<text x="${x(pts[k])}" y="${H - 6}" text-anchor="${arr.length > 1 && n === 0 ? 'start' : n === arr.length - 1 && arr.length > 1 ? 'end' : 'middle'}" class="ax">${fmtDate(pts[k].date)}</text>`; });
  const line = pts.map(p => `${x(p).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const sp = pts[sel];
  return `<svg class="mchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('走勢圖', 'Trend chart'))}" data-n="${pts.length}" data-l="${L}" data-r="${R}" data-w="${W}">
    ${g}${sp ? `<line x1="${x(sp)}" x2="${x(sp)}" y1="${Tp}" y2="${H - B}" stroke="var(--line2)" stroke-dasharray="3 3"/>` : ''}
    <polyline points="${line}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round"/>
    ${pts.map((p, k) => `<circle cx="${x(p)}" cy="${y(p.v)}" r="${k === sel ? 5.5 : 3.2}" fill="${k === sel ? 'var(--acc)' : 'var(--s1)'}" stroke="var(--acc)" stroke-width="2"/>`).join('')}
    ${pts.map(p => `<i data-x="${x(p)}"></i>`).join('')}</svg>`;
}
function summaryStats(ex) {
  if (ex.isCardio) return `<div class="empty" style="padding:18px">${I('run')}<div>${t('有氧動作記錄嘅係完成與否，冇重量走勢。', 'Cardio is logged as done or not, so there is no weight trend.')}</div></div>`;
  const all = exSessions(ex.id);
  if (!all.length) return `<div class="empty" style="padding:18px">${I('chart')}<div>${t('完成並儲存一次有呢個動作嘅訓練，呢度就會見到走勢。', 'Finish and save a workout with this exercise to see your trend here.')}</div></div>`;
  const E = ui.exv;
  const days = RANGES.find(r => r[0] === E.range)[3];
  const cut = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : '';
  let ses = all.filter(s => s.date >= cut); if (!ses.length) ses = all.slice(-1);
  const hasW = all.some(s => s.heaviest > 0);
  if (!hasW && E.metric !== 'reps') E.metric = 'reps';
  const m = METRICS.find(x => x.id === E.metric);
  const pts = ses.map(s => ({ date: s.date, v: s[m.id] }));
  if (E.sel == null || E.sel >= pts.length) E.sel = pts.length - 1;
  const cur = pts[E.sel];
  return `<div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:6px">
      <div><span class="num" style="font-size:30px;font-weight:800">${fmtVal(cur.v, m.u)}</span> <span class="sub" style="color:var(--acc);font-weight:600">${fmtDate(cur.date)}</span></div>
      <label class="sr" for="exRange">${t('時間範圍', 'Range')}</label>
      <select id="exRange" class="rsel" data-c="exRange">${RANGES.map(r => `<option value="${r[0]}" ${r[0] === E.range ? 'selected' : ''}>${t(r[1], r[2])}</option>`).join('')}</select></div>
    ${metricChart(pts, m.id, E.sel)}
    <div class="chips" style="margin-top:8px">${METRICS.filter(x => hasW || x.id === 'reps').map(x => `<button class="chip" data-a="exMetric" data-v="${x.id}" aria-pressed="${x.id === m.id}">${t(x.zh, x.en)}</button>`).join('')}</div>
    <p class="sub small" style="margin-top:8px">${t(`共 ${all.length} 次訓練記錄${E.metric === 'e1rm' ? '。1RM 用 Epley 公式由重量同次數估算。' : '。撳圖上嘅點睇嗰日數字。'}`, `${all.length} sessions logged.${E.metric === 'e1rm' ? ' 1RM is estimated from weight and reps (Epley).' : ' Tap a dot to see that day.'}`)}</p>`;
}
function summaryHTML(ex) {
  const prim = ex.muscles.slice(0, 1).map(m => t(muscleZh(m), m)), sec = ex.muscles.slice(1).map(m => t(muscleZh(m), m));
  return `<div class="stage studio"><div class="cv" id="cv"></div><div class="load" id="cvLoad">${t('載入 3D 模型…', 'Loading 3D model…')}</div>
      <div class="ov" style="justify-content:flex-end"><button class="ibtn round" data-a="v3play" id="v3play" aria-label="${t('暫停', 'Pause')}">${I('pause')}</button></div></div>
    <h2 class="h2" style="font-size:24px;margin-top:4px">${esc(exName(ex))}</h2>
    <p class="sub" style="margin-bottom:12px">${t('主要', 'Primary')}：${esc(prim.join('、'))}${sec.length ? ` · ${t('次要', 'Secondary')}：${esc(sec.join('、'))}` : ''}</p>
    <div id="exStats">${summaryStats(ex)}</div>
    ${ex.isCardio ? '' : `<div id="exTarget">${targetBlock(ex)}</div>`}
    <section class="card" style="margin-top:12px"><h2 class="h3" style="margin-bottom:10px">${t('加入計劃', 'Add to plan')}</h2><div class="days7">${WD.map(d => { const on = (S.customPlan[d] || []).some(x => x.id === ex.id); return `<button data-a="togPlan" data-id="${ex.id}" data-v="${d}" aria-pressed="${on}" aria-label="${dayLong(d)}">${dayShort(d)}<small>${on ? '✓' : '+'}</small></button>`; }).join('')}</div></section>`;
}
function historyHTML(ex) {
  if (ex.isCardio) return `<div class="empty">${I('run')}<div>${t('有氧動作冇逐組記錄。', 'Cardio has no set-by-set log.')}</div></div>`;
  const all = exSessions(ex.id).reverse();
  if (!all.length) return `<div class="empty">${I('book')}<div>${t('未有記錄。喺「今日」完成並儲存訓練就會出現喺度。', 'Nothing logged yet. Finish and save a workout in Today and it shows up here.')}</div></div>`;
  return all.map(s => `<section class="card"><div class="card-h" style="margin-bottom:8px"><h3 class="h3">${fmtDate(s.date, true)}</h3>${s.pr ? `<span class="tag gold">${I('trophy')}&nbsp;PR</span>` : ''}</div>
    ${s.sets.map((x, k) => `<div class="hrow"><span class="n num">${k + 1}</span><span class="num">${num(x.weight)} kg × ${esc(x.reps)}</span><span class="muted small num">1RM ${Math.round(num(x.reps) === 1 ? num(x.weight) : num(x.weight) * (1 + num(x.reps) / 30))}</span></div>`).join('')}
    <div class="row sub small" style="justify-content:space-between;margin-top:8px"><span>${t('總容量', 'Volume')} <b class="num" style="color:var(--tx)">${Math.round(s.volume).toLocaleString()} kg</b></span><span>${t('總次數', 'Reps')} <b class="num" style="color:var(--tx)">${s.reps}</b></span></div></section>`).join('');
}
function howtoHTML(ex) {
  const mv = MOVES[ex.move] || {}, phases = mv.phases || [];
  return `<div class="stage"><div class="cv" id="cv"></div><div class="load" id="cvLoad">${t('載入 3D 模型…', 'Loading 3D model…')}</div>
      <div class="ov"><span class="pill acc" id="phName">${esc(phases[0] ? t(phases[0].zh, phases[0].en) : '')}</span><span class="pill" id="ovR">${t('拖動旋轉', 'Drag to rotate')}</span></div>
      <div class="ov-b" id="badTag" hidden><span class="pill bad">${t('紅色 = 錯誤動作', 'Red = wrong form')}</span></div></div>
    <div class="ctrls"><button class="ibtn" data-a="v3play" id="v3play" aria-label="${t('暫停', 'Pause')}">${I('pause')}</button>
      <div class="phases" style="grid-template-columns:repeat(${Math.max(1, phases.length)},minmax(0,1fr))" id="phBar">${phases.map((p, i) => `<div class="${i === 0 ? 'on' : ''}"><i></i><span>${esc(t(p.zh, p.en))}</span></div>`).join('')}</div></div>
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div class="seg" role="group" aria-label="${t('角度', 'View')}">${[['side', '側面', 'Side'], ['front', '正面', 'Front'], ['q', '斜角', '3/4']].map(([v, zh, en]) => `<button data-a="v3view" data-v="${v}" aria-pressed="${(mv.cam && mv.cam.view || 'q') === v}">${t(zh, en)}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="${t('速度', 'Speed')}"><button data-a="v3speed" data-v="0.5" aria-pressed="false">0.5×</button><button data-a="v3speed" data-v="1" aria-pressed="true">1×</button></div></div>
    <button class="chip" data-a="v3slow" aria-pressed="true" style="margin-bottom:12px">${I('timer')}${t('重點位置自動慢鏡', 'Slow down at key moments')}</button>
    <div class="cue" aria-live="polite"><span class="ph-n" id="cueN">1</span><p id="cueT"><b>${esc(phases[0] ? t(phases[0].zh, phases[0].en) : '')}</b>${esc(phases[0] ? t(phases[0].czh, phases[0].cen) : '')}</p></div>
    ${ex.approx ? `<p class="note" style="margin:-4px 0 12px">${I('info')}${t('示範用咗代表性嘅動作。', 'The demo shows a representative movement.')}</p>` : ''}
    <section class="card"><h2 class="h3" style="margin-bottom:6px">${t('要點', 'Key points')}</h2><p style="font-size:15px;line-height:1.5">${esc(t(ex.dZh, ex.dEn))}</p>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px">${ex.muscles.map((m, i) => `<span class="tag ${i === 0 ? 'acc' : ''}">${esc(t(muscleZh(m), m))}</span>`).join('')}<span class="tag">${t(equipZh(ex.equip), ex.equip)}</span><span class="tag">${t(levelZh(ex.level), ex.level)}</span></div></section>
    ${mv.mistakes ? `<section class="card"><h2 class="h3" style="margin-bottom:4px">${t('常見錯誤', 'Common mistakes')}</h2><p class="sub" style="margin-bottom:6px">${t('撳「睇錯誤」，紅色公仔會重疊示範錯誤做法。', 'Tap “Show me” to overlay the wrong form in red.')}</p>${mv.mistakes.map((m, i) => `<div class="mist">${I('alert')}<span style="flex:1">${esc(t(m.zh, m.en))}</span>${m.patch ? `<button class="chip" data-a="v3bad" data-v="${i}" aria-pressed="false" style="height:36px">${t('睇錯誤', 'Show me')}</button>` : ''}</div>`).join('')}</section>` : ''}`;
}
function sheetHTML(ex) {
  const tabs = [['sum', '概覽', 'Summary'], ['hist', '記錄', 'History'], ['how', '教學', 'How to']];
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(exName(ex))}"><div class="sheet-in">
    <div class="row" style="margin-bottom:6px"><button class="ibtn ghost" data-a="closeEx" aria-label="${t('返回', 'Back')}">${I('back')}</button>
      <div style="flex:1;min-width:0;text-align:center" class="h3">${esc(exName(ex))}</div><span style="width:44px"></span></div>
    <div class="tabs" role="tablist">${tabs.map(([v, zh, en]) => `<button role="tab" data-a="exTab" data-v="${v}" aria-selected="${ui.exv.tab === v}">${t(zh, en)}</button>`).join('')}</div>
    <div id="sheetBody"></div></div></div>`;
}
async function mountViewer(ex, studio) {
  const id = ex.id, tab = ui.exv.tab;
  if (ui.viewer) { ui.viewer.dispose(); ui.viewer = null; }
  try {
    const { createViewer } = await import('./viewer3d.js');
    const el = document.getElementById('cv'); if (!el || ui.sheet !== id || ui.exv.tab !== tab) return;
    const v = await createViewer(el, studio ? { studio: true, accent: '#D9412F' } : { accent: '#FF7A2F' });
    if (ui.sheet !== id || ui.exv.tab !== tab || !document.body.contains(el)) { v.dispose(); return; }
    ui.viewer = v; document.getElementById('cvLoad')?.remove();
    const mv = MOVES[ex.move] || {};
    v.onPhase((i, p) => {
      const n = document.getElementById('phName'); if (!n) return;
      n.textContent = t(p.zh, p.en);
      document.getElementById('cueN').textContent = i + 1;
      document.getElementById('cueT').innerHTML = `<b>${esc(t(p.zh, p.en))}</b>${esc(t(p.czh, p.cen))}`;
      document.querySelectorAll('#phBar > div').forEach((d, j) => d.classList.toggle('on', j <= i));
    });
    v.setMove(ex.move, bodyParts(ex));
    if (studio) v.setSlowmo(false);
    if (!mv.phases && document.getElementById('phBar')) document.getElementById('phBar').innerHTML = '';
  } catch (err) {
    console.error(err);
    const l = document.getElementById('cvLoad'); if (l) l.textContent = t('呢部機顯示唔到 3D（需要 WebGL）。', 'This device can\'t show 3D (WebGL needed).');
  }
}
function drawSheet() {
  const ex = EX[ui.sheet]; if (!ex) return;
  if (ui.viewer) { ui.viewer.dispose(); ui.viewer = null; }
  const tab = ui.exv.tab, body = document.getElementById('sheetBody'); if (!body) return;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === tab));
  body.innerHTML = tab === 'sum' ? summaryHTML(ex) : tab === 'hist' ? historyHTML(ex) : howtoHTML(ex);
  document.querySelector('.sheet').scrollTop = 0;
  if (tab !== 'hist') mountViewer(ex, tab === 'sum');
}
function redrawStats() { const ex = EX[ui.sheet], el = document.getElementById('exStats'); if (ex && el) el.innerHTML = summaryStats(ex); }
function openSheet(id, tab) {
  const ex = EX[id]; if (!ex) return;
  closeSheet(true);
  ui.sheet = id; ui.exv = { tab: tab || 'sum', metric: ui.exv?.metric || 'heaviest', range: ui.exv?.range || '1y', sel: null };
  const wrap = document.createElement('div'); wrap.id = 'sheetWrap'; wrap.innerHTML = sheetHTML(ex); document.body.appendChild(wrap);
  document.body.style.overflow = 'hidden'; drawTimer();
  try { history.pushState({ sheet: id }, ''); } catch { }
  drawSheet();
}
function closeSheet(silent) {
  if (ui.viewer) { ui.viewer.dispose(); ui.viewer = null; }
  const w = document.getElementById('sheetWrap'); if (w) w.remove();
  if (ui.sheet && !silent) { ui.sheet = null; render(); }
  ui.sheet = null; document.body.style.overflow = ''; drawTimer();
}
window.addEventListener('popstate', () => { if (ui.sheet) closeSheet(); });
// tap / drag on the chart picks the nearest session
function chartPick(e) {
  const svg = e.target.closest && e.target.closest('svg.mchart'); if (!svg) return;
  const r = svg.getBoundingClientRect(), W = +svg.dataset.w, xs = [...svg.querySelectorAll('i')].map(n => +n.dataset.x);
  const vx = (e.clientX - r.left) / r.width * W; let best = 0;
  xs.forEach((x, k) => { if (Math.abs(x - vx) < Math.abs(xs[best] - vx)) best = k; });
  if (ui.exv.sel !== best) { ui.exv.sel = best; redrawStats(); }
}
document.addEventListener('pointerdown', chartPick);
document.addEventListener('pointermove', e => { if (e.buttons) chartPick(e); });

// ---------- render ----------
let lastTab = null;
export function render() {
  if (!S.goalId && !ui.ob) ui.ob = { step: 0, goal: null, ans: {}, qi: 0 };
  nav();
  const main = $('#main');
  if (ui.ob) { main.innerHTML = renderOb(); drawTimer(); window.scrollTo(0, 0); return; }
  const y = window.scrollY;
  main.innerHTML = ui.tab === 'today' ? renderToday() : ui.tab === 'progress' ? renderProgress() : ui.tab === 'plan' ? renderPlan() : ui.tab === 'library' ? renderLibrary() : renderMe();
  window.scrollTo(0, lastTab === ui.tab ? y : 0); lastTab = ui.tab;
  document.documentElement.lang = S.lang === 'zh' ? 'zh-HK' : 'en';
  drawTimer();
}

// ---------- actions ----------
const A = {
  tab(el) { ui.tab = el.dataset.v; if (ui.tab !== 'library') ui.addTo = null; render(); },
  day(el) { ui.day = el.dataset.v; render(); },
  goPlan(el) { ui.planDay = el.dataset.v; ui.tab = 'plan'; render(); },
  toggleEx(el) {
    const { d, id } = el.dataset, plan = S.customPlan[d] || [], e = plan.find(x => x.id === id);
    const firstOpen = (plan.find(x => EX[x.id] && !EX[x.id].isCardio && !exDone(d, x)) || {}).id;
    S.collapsedEx[d + '__' + id] = isOpen(d, e, firstOpen); save('collapsedEx'); render();
  },
  tick(el) {
    const { d, id } = el.dataset, i = +el.dataset.i, s = S.logs[d][id][i], ex = EX[id];
    s.done = !s.done;
    if (s.done) {
      if (!s.awarded) {
        s.awarded = true;
        const before = bestWeight(id), w = num(s.weight);
        let pts = award('set_done', ex.cat);
        if (w > 0 && w > before && before > 0) { pts += award('pr_broken', ex.cat); toast(t(`新紀錄 ${w} kg！+${pts} 分`, `New PR ${w} kg! +${pts} pts`)); }
        else toast(`+${pts} ${t('分', 'pts')}`);
      }
      startTimer(S.restSec || 90);
    }
    save('logs'); upsertSession(d); render();
  },
  setCount(el) {
    const { d, id } = el.dataset, e = (S.customPlan[d] || []).find(x => x.id === id); if (!e) return;
    e.sets = Math.max(1, Math.min(12, (e.sets || 3) + +el.dataset.v)); syncSets(d, id); save('customPlan', 'logs'); upsertSession(d); render();
  },
  cardioMin(el) {
    const { d, id } = el.dataset, e = (S.customPlan[d] || []).find(x => x.id === id); if (!e) return;
    e.reps = Math.max(5, Math.min(180, (parseInt(e.reps) || 30) + +el.dataset.v)); save('customPlan'); render();
  },
  cardioTick(el) {
    const { d, id } = el.dataset; S.logs[d] = S.logs[d] || {};
    const k = '__cardio__' + id, aw = '__cardioAw__' + id;
    S.logs[d][k] = !S.logs[d][k];
    if (S.logs[d][k] && !S.logs[d][aw]) { S.logs[d][aw] = true; toast(`+${award('set_done', 'cardio')} ${t('分', 'pts')}`); }
    save('logs'); upsertSession(d); render();
  },
  saveWorkout() {
    const day = ui.day, today = isoToday(), key = 'saved_' + today + '_' + day;
    if (S.savedWorkouts[key]) { toast(t('今日已經儲存咗', 'Already saved today')); return; }
    upsertSession(day);
    S.savedWorkouts[key] = true;
    let pts = award('workout_saved', null);
    const ti = todayIdx();
    if (S.weekTasks && S.weekTasks[ti]) S.weekTasks[ti].forEach((task, k) => {
      const tk = ti + '-' + k; if (!S.completedTasks[tk] && (task.type === 'strength' || task.type === 'cardio')) { S.completedTasks[tk] = true; pts += award('task_done', null); }
    });
    save('history', 'savedWorkouts', 'completedTasks'); stopTimer();
    toast(t(`完成訓練！+${pts} 分`, `Workout finished! +${pts} pts`)); confetti(); render();
  },
  habit(el) {
    const k = el.dataset.v, was = !!S.completedTasks[k]; S.completedTasks[k] = !was;
    if (!was && !S.completedTasks[k + '_aw']) { S.completedTasks[k + '_aw'] = true; toast(`+${award('task_done', null)} ${t('分', 'pts')}`); }
    save('completedTasks'); render();
  },
  timerAdd() { ui.timer.left += 30; ui.timer.max = Math.max(ui.timer.max, ui.timer.left); drawTimer(); },
  timerStop() { stopTimer(); },
  closeLvl(el) { el.closest('.lvlup').remove(); },
  progRange(el) { ui.progRange = el.dataset.v; render(); },
  logMore() { ui.logN = (ui.logN || 8) + 10; render(); },
  planDay(el) { ui.planDay = el.dataset.v; render(); },
  planNum(el) {
    const d = ui.planDay, i = +el.dataset.i, f = el.dataset.f, e = S.customPlan[d][i], ex = EX[e.id];
    if (f === 'sets') { e.sets = Math.max(1, Math.min(12, (e.sets || 3) + +el.dataset.v)); syncSets(d, e.id); if (!ex.isCardio) e.custom = true; }
    else if (ex.isCardio) e.reps = Math.max(5, Math.min(180, (parseInt(e.reps) || 30) + +el.dataset.v));
    else {
      const dv = +el.dataset.v; e.reps = Math.max(1, Math.min(100, (parseInt(e.reps) || 12) + dv));
      if (Array.isArray(e.range)) e.range = [e.reps, Math.max(e.reps, e.range[1] + dv)];   // shift the whole range
      e.custom = true; (S.logs[d][e.id] || []).forEach(s => { if (!s.done) s.reps = e.reps; });
    }
    save('customPlan', 'logs'); render();
  },
  planDel(el) {
    const d = ui.planDay, i = +el.dataset.i, e = S.customPlan[d][i];
    S.customPlan[d].splice(i, 1); save('customPlan'); toast(t(`已移除 ${EX[e.id].zh}`, `Removed ${EX[e.id].en}`)); render();
  },
  resetPlan() {
    if (!confirm(t('還原做預設嘅每週計劃？你自己改過嘅會冇咗。', 'Reset to the default weekly plan? Your changes will be lost.'))) return;
    S.customPlan = JSON.parse(JSON.stringify(DEFAULT_PLAN)); ensLogs(); save('customPlan', 'logs'); render();
  },
  addFromLib() { ui.addTo = ui.planDay; ui.tab = 'library'; render(); },
  addDone() { ui.planDay = ui.addTo; ui.addTo = null; ui.tab = 'plan'; render(); },
  libCat(el) { ui.libCat = el.dataset.v; render(); },
  openEx(el) { openSheet(el.dataset.id, el.dataset.tab); },
  closeEx() { if (history.state && history.state.sheet) history.back(); else closeSheet(); },
  togPlan(el) {
    const id = el.dataset.id, d = el.dataset.v, plan = S.customPlan[d] = S.customPlan[d] || [], i = plan.findIndex(x => x.id === id), ex = EX[id];
    if (i >= 0) { plan.splice(i, 1); toast(t(`已從${WD_LONG[d][0]}移除`, `Removed from ${WD_LONG[d][1]}`)); }
    else { plan.push({ id, sets: ex.isCardio ? 1 : 3, reps: ex.isCardio ? 30 : 12 }); ensLogs(); toast(t(`已加入${WD_LONG[d][0]}`, `Added to ${WD_LONG[d][1]}`)); }
    save('customPlan', 'logs');
    if (ui.sheet) { const on = i < 0; el.setAttribute('aria-pressed', on); el.querySelector('small').textContent = on ? '✓' : '+'; }
    else render();
  },
  v3play(el) { if (!ui.viewer) return; const p = ui.viewer.toggle(); el.innerHTML = I(p ? 'pause' : 'play'); el.setAttribute('aria-label', p ? t('暫停', 'Pause') : t('播放', 'Play')); },
  v3view(el) { ui.viewer && ui.viewer.setView(el.dataset.v); el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); },
  applySugg(el) {
    const { d, id } = el.dataset, kg = num(el.dataset.v), r = +el.dataset.r;
    (S.logs[d][id] || []).forEach(s => { if (!s.done) { s.weight = kg; s.reps = r; } }); save('logs'); toast(t(`已套用 ${kg} kg`, `Set to ${kg} kg`)); render();
  },
  tgPick() { ui.tgPick = !ui.tgPick; render(); },
  guideOpen() { ui.guideOpen = !ui.guideOpen; render(); },
  guideAsk() { ui.guideConfirm = true; render(); },
  guideCancel() { ui.guideConfirm = false; render(); },
  guideApply() { const n = applyScheme(); ui.guideConfirm = false; toast(t(`已更新 ${n} 個動作`, `Updated ${n} exercises`)); render(); },
  tgFromGoal(el) {
    const g = liftGoal(el.dataset.id); if (!g) return;
    setTarget(g.id, g.kg, g.reps, g.by); toast(t(`已設目標：${g.kg} kg × ${g.reps}`, `Target set: ${g.kg} kg × ${g.reps}`)); render();
  },
  reviewDone() { saveReview(weeklyReview()); ui.reviewOpen = false; toast(t('檢討完成，下星期見！', 'Review saved. See you next week!')); render(); },
  reviewOpen() { ui.reviewOpen = !ui.reviewOpen; render(); },
  reviewDay(el) { S.reviewDay = el.dataset.v; save('reviewDay'); render(); },
  rvLogW() {
    const v = num($('#rvW').value); if (!v || v < 25 || v > 300) { toast(t('請輸入正確體重', 'Enter a valid weight')); return; }
    S.profile.weight = v; save('profile'); logWeight(v); toast(t('已記錄', 'Logged')); render();
  },
  bodyRestart() { ensureBodyStart(true); toast(t('體重計劃由今日重新計', 'Weight plan restarted from today')); render(); },
  tgEdit(el) { ui.tgEdit = el.dataset.id; const b = document.getElementById('exTarget'); if (b && ui.sheet) b.innerHTML = targetBlock(EX[el.dataset.id]); else render(); },
  tgCancel(el) { ui.tgEdit = null; const b = document.getElementById('exTarget'); if (b && ui.sheet) b.innerHTML = targetBlock(EX[el.dataset.id]); else render(); },
  tgSave(el) {
    const id = el.dataset.id, kg = num(document.getElementById('tg-kg').value), reps = Math.max(1, Math.round(num(document.getElementById('tg-reps').value) || 1)), by = document.getElementById('tg-by').value || null;
    if (!kg && EX[id].equip !== 'Bodyweight') { toast(t('請輸入目標重量', 'Enter a target weight')); return; }
    if (by && by <= isoToday()) { toast(t('期限要喺今日之後', 'Pick a date after today')); return; }
    setTarget(id, kg, reps, by); ui.tgEdit = null; toast(t('目標已儲存', 'Target saved'));
    const b = document.getElementById('exTarget'); if (b && ui.sheet) b.innerHTML = targetBlock(EX[id]); else render();
  },
  tgDel(el) { clearTarget(el.dataset.id); toast(t('已刪除目標', 'Target removed')); const b = document.getElementById('exTarget'); if (b && ui.sheet) b.innerHTML = targetBlock(EX[el.dataset.id]); else render(); },
  exTab(el) { ui.exv.tab = el.dataset.v; drawSheet(); },
  exMetric(el) { ui.exv.metric = el.dataset.v; ui.exv.sel = null; redrawStats(); },
  v3slow(el) { const on = el.getAttribute('aria-pressed') !== 'true'; el.setAttribute('aria-pressed', on); ui.viewer && ui.viewer.setSlowmo(on); },
  v3bad(el) {
    if (!ui.viewer) return;
    const was = el.getAttribute('aria-pressed') === 'true';
    document.querySelectorAll('[data-a="v3bad"]').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.textContent = t('睇錯誤', 'Show me'); });
    const on = !was && ui.viewer.setMistake(+el.dataset.v);
    if (!on) ui.viewer.setMistake(-1);
    if (on) { el.setAttribute('aria-pressed', 'true'); el.textContent = t('收起', 'Hide'); document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    const tag = document.getElementById('badTag'); if (tag) tag.hidden = !on;
  },
  v3speed(el) { ui.viewer && ui.viewer.setSpeed(+el.dataset.v); el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); },
  lang(el) { S.lang = el.dataset.v; save('lang'); render(); },
  logW() {
    const v = num($('#wNew').value); if (!v || v < 25 || v > 300) { toast(t('請輸入正確體重', 'Enter a valid weight')); return; }
    S.profile.weight = v; save('profile'); logWeight(v); toast(t('已記錄', 'Logged')); render();
  },
  rest(el) { S.restSec = +el.dataset.v; save('restSec'); render(); },
  changeGoal() { ui.ob = { step: 1, goal: S.goalId, ans: { ...S.goalAnswers }, qi: 0, edit: true }; render(); },
  export() {
    const payload = exportPayload(), name = 'fittrack-backup-' + isoToday() + '.json';
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const done = () => { S.lastBackup = new Date().toISOString(); save('lastBackup'); render(); toast(t('已匯出', 'Exported')); };
    const dl = () => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); done(); };
    let file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: name }).then(done).catch(e => { if (e && e.name !== 'AbortError') dl(); });
    else dl();
  },
  import() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader();
      r.onload = () => {
        try {
          const p = JSON.parse(r.result);
          if (!confirm(t('會用備份覆蓋而家嘅資料，確定？', 'This replaces your current data with the backup. Continue?'))) return;
          importPayload(p); location.reload();
        } catch (e) { toast(t('匯入失敗：', 'Import failed: ') + e.message); }
      };
      r.readAsText(f);
    };
    inp.click();
  },
  resetWeek() {
    if (!confirm(t('重置本週積分？', 'Reset this week\'s points?'))) return;
    S.scores.weekly = 0; S.scores.breakdown = {}; save('scores'); render(); toast(t('已重置', 'Reset'));
  },
  // onboarding
  obLang(el) { S.lang = el.dataset.v; save('lang'); ui.ob.step = 1; render(); },
  obGoal(el) { if (ui.ob.goal !== el.dataset.v) { ui.ob.goal = el.dataset.v; ui.ob.ans = {}; } render(); },
  obAns(el) { ui.ob.ans[el.dataset.q] = el.dataset.v; render(); },
  obNext() {
    const o = ui.ob, qs = GQS[o.goal] || [];
    if (o.step === 1) { o.qi = 0; o.step = qs.length ? 2 : 3; }
    else if (o.step === 2) { if (o.qi < qs.length - 1) o.qi++; else o.step = 3; }
    render();
  },
  obBack() {
    const o = ui.ob;
    if (o.step === 2 && o.qi > 0) o.qi--;
    else if (o.step === 3) { const qs = GQS[o.goal] || []; o.step = qs.length ? 2 : 1; o.qi = Math.max(0, qs.length - 1); }
    else if (o.step === 1 && o.edit) { ui.ob = null; }
    else o.step = Math.max(0, o.step - 1);
    render();
  },
  obCancel() { ui.ob = null; render(); },
  obFinish() {
    const g = f => num(document.getElementById('ob-' + f).value);
    const p = { weight: g('weight') || 75, height: g('height') || 170, age: g('age') || 28, goalWeight: g('goalWeight') || 70 };
    const o = ui.ob; S.profile = p; S.goalId = o.goal; S.goalAnswers = o.ans; S.weekTasks = genTasks(o.goal, o.ans, p);
    if (!(S.bodyLog || []).length || o.edit) logWeight(p.weight);
    chkWeek(); save('profile', 'goalId', 'goalAnswers', 'weekTasks', 'scores');
    const wasEdit = o.edit; ui.ob = null; ui.tab = wasEdit ? 'me' : 'today'; ensLogs(); save('logs'); render();
    if (wasEdit && schemeChanges().out.length) toast(t('目標改咗：去「計劃」頁睇新嘅訓練指引', 'Goal changed: see the new training guide on the Plan tab'));
  }
};

const C = {
  w(el) { const { d, id } = el.dataset; const s = S.logs[d][id][+el.dataset.i]; s.weight = num(el.value); save('logs'); if (s.done) upsertSession(d); },
  r(el) { const { d, id } = el.dataset; const s = S.logs[d][id][+el.dataset.i]; s.reps = Math.max(0, Math.round(num(el.value))); save('logs'); if (s.done) upsertSession(d); },
  progEx(el) { ui.progEx = el.value; render(); },
  tgPick(el) { if (!el.value) return; ui.tgPick = false; ui.tgEdit = el.value; openSheet(el.value, 'sum'); },
  goalDate(el) { S.profile.goalDate = el.value || null; ensureBodyStart(true); save('profile'); toast(t('體重計劃由今日重新計', 'Weight plan restarted from today')); render(); },
  exRange(el) { ui.exv.range = el.value; ui.exv.sel = null; redrawStats(); },
  prof(el) { const f = el.dataset.f, v = num(el.value); if (v > 0) { const was = S.profile[f]; S.profile[f] = v; if (f === 'goalWeight' && was !== v) ensureBodyStart(true); save('profile'); render(); } },
  obNum(el) { ui.ob.ans[el.dataset.q] = +el.value; const o = document.getElementById('obNumV'); if (o) o.textContent = el.value; }
};

// ---------- plan drag-to-reorder (pointer events, works on touch) ----------
function startDrag(handle, ev) {
  const item = handle.closest('.pli'), list = document.getElementById('planList'); if (!item || !list) return;
  const items = [...list.querySelectorAll('.pli')], from = items.indexOf(item); if (from < 0) return;
  const rects = items.map(x => x.getBoundingClientRect()), gap = 8, hgt = rects[from].height + gap, y0 = ev.clientY;
  let to = from; item.classList.add('drag'); handle.setPointerCapture(ev.pointerId); ev.preventDefault();
  const move = e => {
    const dy = e.clientY - y0; item.style.transform = `translateY(${dy}px)`;
    const c = rects[from].top + rects[from].height / 2 + dy;
    to = from; rects.forEach((r, j) => { const m = r.top + r.height / 2; if (j > from && c > m) to = j; if (j < from && c < m && to >= from) to = j; });
    rects.forEach((r, j) => { if (j < from && c < r.top + r.height / 2) to = Math.min(to, j); });
    items.forEach((x, j) => { if (j === from) return; let s = 0; if (j > from && j <= to) s = -hgt; if (j < from && j >= to) s = hgt; x.style.transition = 'transform .15s'; x.style.transform = s ? `translateY(${s}px)` : ''; });
  };
  const up = () => {
    handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up);
    items.forEach(x => { x.style.transform = ''; x.style.transition = ''; }); item.classList.remove('drag');
    if (to !== from) { const plan = S.customPlan[ui.planDay]; const [m] = plan.splice(from, 1); plan.splice(to, 0, m); save('customPlan'); }
    render();
  };
  handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
}
function keyMove(handle, dir) {
  const i = +handle.dataset.drag, plan = S.customPlan[ui.planDay], j = i + dir; if (j < 0 || j >= plan.length) return;
  [plan[i], plan[j]] = [plan[j], plan[i]]; save('customPlan'); render();
  document.querySelector(`[data-drag="${j}"]`)?.focus();
}

export function bindEvents() {
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const f = A[el.dataset.a]; if (f) { e.preventDefault(); f(el, e); } });
  document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el); });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.c === 'libQ') { ui.libQ = el.value; const pos = el.selectionStart; render(); const n = document.querySelector('[data-c="libQ"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { } } }
    if (el.dataset.c === 'obNum') C.obNum(el);
  });
  document.addEventListener('pointerdown', e => { const g = e.target.closest('[data-drag]'); if (g) startDrag(g, e); });
  document.addEventListener('keydown', e => {
    const g = e.target.closest && e.target.closest('[data-drag]');
    if (g && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); keyMove(g, e.key === 'ArrowUp' ? -1 : 1); }
    if (e.key === 'Escape' && ui.sheet) A.closeEx();
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('fin')) e.target.blur();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { const nd = rolloverDay(); chkWeek(); if (nd) ui.day = todayKey(); if (!ui.sheet) render(); } });
  setInterval(() => { if (!document.hidden && rolloverDay()) { ui.day = todayKey(); if (!ui.sheet) render(); } }, 60000);
}
export { ui };
