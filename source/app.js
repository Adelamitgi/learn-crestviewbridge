"use strict";
const D = JSON.parse(document.getElementById("appdata").textContent);
const EXAM = "2026-12-13", NEW_END = "2026-12-03", PH1 = "2026-11-02", PH2 = "2026-11-16", PH3 = "2026-12-04", START = "2026-10-29";
const MOCKS = ["2026-11-15", "2026-11-29", "2026-12-06"];
const MIN = 6e4, DAY = 864e5;
const WORD = new Map([...D.base.map(b => [b[0], [b[0], b[1], b[2], b[3], "", 1, b[4]]]), ...D.words.map(w => [w[0], w])]);
const L4 = new Set(D.words.map(w => w[0])), BASESET = new Set(D.base.map(b => b[0]));
const PAIRS = D.pairs.map((p, i) => ({ id: "p" + i, words: p[0], rule: p[1], items: p[2] }));
const FAMS = new Map(D.families.map(f => [f[0], f]));
const GR = new Map(D.grammar.map(g => [g.id, g]));

/* ---------- tiny DOM helper ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") { el.className = v; if (/\b(zh|han|chunk|opt|siblings|passage)\b/.test(v)) el.lang = "zh-CN"; }
    else if (k === "text") el.textContent = v;
    else if (k === "style") el.setAttribute("style", v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const $ = (s, el = document) => el.querySelector(s);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const hanCount = s => (s.match(/[一-鿿]/g) || []).length;

/* ---------- dates ---------- */
function keyOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
const today = () => keyOf(new Date());
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) { const A = parseKey(a), B = parseKey(b); return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / DAY); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function nice(k) { const d = parseKey(k); return `${DOW[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function dayStart(n) { const d = new Date(); d.setHours(4, 0, 0, 0); d.setDate(d.getDate() + n); return d.getTime(); }
function phase(k = today()) {
  if (k < PH1) return { id: 0, name: "Set up", zh: "准备", text: "Confirm your booking, import your words, take one timed sample paper.", color: "sky" };
  if (k < PH2) return { id: 1, name: "Phase 1 · known characters", zh: "熟字词族", text: "About 30 new words a day from families built on characters you already know. One grammar unit every two days.", color: "yellow" };
  if (k < PH3) return { id: 2, name: "Phase 2 · new characters", zh: "生字词族", text: "Learn each new character, then its family. Five picture sentences daily, an essay every other day.", color: "lilac" };
  if (k < EXAM) return { id: 3, name: "Phase 3 · review only", zh: "复习", text: "No new words. Clear hard cards, redo mock mistakes, rehearse essay and speaking frames.", color: "jade" };
  if (k === EXAM) return { id: 4, name: "Exam day", zh: "考试", text: "Written paper 9:00, speaking about 11:30. Bring your ticket, ID and two 2B pencils.", color: "yellow" };
  return { id: 5, name: "After the exam", zh: "加油", text: "Results: computer-based written 28 Dec, paper-based 15 Jan.", color: "sky" };
}

/* ---------- state + storage ---------- */
function freshState() {
  return { v: 1, cards: {}, log: {}, grammar: {}, reading: {}, writing: [], mocks: [], extra: [], hw: {}, pairs: {}, tones: { r: 0, n: 0 }, gaps: {},
    settings: { newPerDay: 0, rate: 0.85, sound: true, autoNext: true, focus: 25, rest: 5, long: 15, mode: "zh2en", notify: false },
    srsUpdated: 0, mainUpdated: 0 };
}
let S = freshState();
const Store = { db: null, uid: null, mode: "local", timers: {}, chains: {}, error: "" };
const LS = { srs: "hsk4desk.srs", main: "hsk4desk.main" };
function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
function packSrs() { return { cards: S.cards, updated: S.srsUpdated }; }
function packMain() { const { cards, srsUpdated, ...rest } = S; return { ...rest, updated: S.mainUpdated }; }
function applySrs(o) { if (o && o.cards) { S.cards = o.cards; S.srsUpdated = o.updated || 0; } }
function applyMain(o) {
  if (!o) return;
  const base = freshState();
  for (const k of ["log", "grammar", "reading", "writing", "mocks", "extra", "hw", "pairs", "tones", "gaps"]) if (o[k] != null) S[k] = o[k];
  S.settings = { ...base.settings, ...(o.settings || {}) };
  S.mainUpdated = o.updated || 0;
}
function save(kind) {
  if (kind === "srs") S.srsUpdated = Date.now(); else S.mainUpdated = Date.now();
  const obj = kind === "srs" ? packSrs() : packMain();
  lsSet(LS[kind], obj);
  if (!Store.db) return;
  clearTimeout(Store.timers[kind]);
  Store.timers[kind] = setTimeout(() => pushDoc(kind), 1500);
}
function pushDoc(kind) {
  const obj = kind === "srs" ? packSrs() : packMain();
  const ref = Store.db.doc(`data/users/${Store.uid}/${kind}`);
  Store.chains[kind] = (Store.chains[kind] || Promise.resolve())
    .then(() => ref.set({ json: JSON.stringify(obj), updated: obj.updated }))
    .then(() => { Store.error = ""; setSaveState(); })
    .catch(e => { Store.error = (e && e.code) || "unavailable"; setSaveState(); });
}
function setSaveState() {
  const el = $("#saveState"); if (!el) return;
  if (Store.mode === "cloud" && !Store.error) { el.className = "chip g"; el.textContent = "Saved to your account"; }
  else if (Store.mode === "cloud") { el.className = "chip y"; el.textContent = "Saving paused, kept in this browser"; }
  else { el.className = "chip"; el.textContent = "Saved in this browser only"; }
}
applySrs(lsGet(LS.srs)); applyMain(lsGet(LS.main));

async function initStore() {
  try {
    const use = window.claude && window.claude.use;
    if (!use) { setSaveState(); return; }
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) { setSaveState(); return; }
    Store.db = db; Store.uid = uid; Store.mode = "cloud";
    let changed = false;
    for (const kind of ["srs", "main"]) {
      const snap = await db.doc(`data/users/${uid}/${kind}`).get();
      const local = kind === "srs" ? S.srsUpdated : S.mainUpdated;
      if (snap.exists) {
        let remote = null; try { remote = JSON.parse(snap.data().json); } catch (e) { remote = null; }
        if (remote && (remote.updated || 0) > local) { kind === "srs" ? applySrs(remote) : applyMain(remote); lsSet(LS[kind], remote); changed = true; }
        else if (local > (remote ? remote.updated || 0 : 0)) pushDoc(kind);
      } else if (local) pushDoc(kind);
    }
    setSaveState();
    if (changed) render();
  } catch (e) { Store.mode = Store.db ? "cloud" : "local"; Store.error = Store.db ? "unavailable" : ""; setSaveState(); }
}

let SAMPLE = null, DOWNLOADS = null;
(async () => {
  try { if (window.claude && window.claude.use) { SAMPLE = await window.claude.use("sample"); DOWNLOADS = await window.claude.use("downloads"); render(); } } catch (e) { /* absent */ }
})();

/* ---------- daily log & activity ---------- */
function tlog(k = today()) { return (S.log[k] ||= { sec: 0, rev: 0, nw: 0, blocks: {} }); }
let lastAct = Date.now();
["pointerdown", "keydown", "scroll"].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); unlockAudio(); }, { passive: true }));
setInterval(() => {
  if (document.visibilityState === "visible" && Date.now() - lastAct < 90000) { tlog().sec += 15; save("main"); if (view === "today") updateTodayLive(); }
}, 15000);
function streak() {
  let n = 0, k = today();
  const ok = d => { const l = S.log[d]; return l && (l.sec >= 600 || l.rev >= 20); };
  if (!ok(k)) k = addDays(k, -1);
  while (ok(k)) { n++; k = addDays(k, -1); }
  return n;
}

/* ---------- SRS ---------- */
// card: [state n|l|r, due ms, interval days, ease, reps, lapses, step]
function examCap() { return Math.max(1, Math.floor(Math.max(0, daysBetween(today(), EXAM)) / 2)); }
function simulate(c, grade) {
  const now = Date.now(); let [s, due, ivl, ease, reps, lapses, step] = c || ["n", 0, 0, 2.5, 0, 0, 0];
  const cap = examCap();
  if (s === "n" || s === "l") {
    if (grade === 1) { s = "l"; step = 0; due = now + MIN; }
    else if (grade === 2) { s = "l"; due = now + (step === 0 ? 6 : 10) * MIN; }
    else if (grade === 3) { if (step >= 1) { s = "r"; ivl = Math.min(cap, ivl > 0 ? ivl : 1); due = dayStart(ivl); } else { s = "l"; step = 1; due = now + 10 * MIN; } }
    else { s = "r"; ivl = Math.min(cap, Math.max(3, ivl)); due = dayStart(ivl); }
  } else {
    if (grade === 1) { lapses++; ease = Math.max(1.3, ease - 0.2); ivl = Math.max(1, Math.round(ivl * 0.4)); s = "l"; step = 1; due = now + 10 * MIN; }
    else {
      if (grade === 2) { ivl = Math.max(ivl + 1, Math.round(ivl * 1.2)); ease = Math.max(1.3, ease - 0.15); }
      else if (grade === 3) ivl = Math.max(ivl + 1, Math.round(ivl * ease));
      else { ivl = Math.max(ivl + 2, Math.round(ivl * ease * 1.3)); ease += 0.15; }
      ivl = Math.min(ivl, cap); due = dayStart(ivl);
    }
  }
  return [s, due, ivl, +ease.toFixed(2), reps + 1, lapses, step];
}
function fmtNext(c) { const ms = c[1] - Date.now(); if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))}m`; const d = Math.round((c[1] - dayStart(0)) / DAY); return d <= 1 ? "1d" : `${d}d`; }
function newQuota() {
  if (S.settings.newPerDay > 0) return S.settings.newPerDay;
  const t = today(); if (t > NEW_END) return 0;
  const unseen = D.words.filter(w => !S.cards[w[0]]).length + (tlog().nw || 0);
  const days = Math.max(1, daysBetween(t < START ? START : t, NEW_END) + 1);
  return Math.min(60, Math.max(10, Math.ceil(unseen / days)));
}
function queues() {
  const now = Date.now(), learnNow = [], learnLater = [], due = [];
  for (const [w, c] of Object.entries(S.cards)) {
    if (c[0] === "l") (c[1] <= now ? learnNow : learnLater).push(w);
    else if (c[0] === "r" && c[1] <= now) due.push(w);
  }
  learnLater.sort((a, b) => S.cards[a][1] - S.cards[b][1]);
  const left = Math.max(0, newQuota() - (tlog().nw || 0));
  const extra = (S.extra || []).filter(w => !S.cards[w] && WORD.has(w));
  const pool = D.words.map(w => w[0]).filter(w => !S.cards[w] && !extra.includes(w)).slice(0, left);
  return { learnNow, learnLater, due: shuffle(due), fresh: extra.concat(pool) };
}
function rate(w, grade) {
  const was = S.cards[w];
  S.cards[w] = simulate(was, grade);
  const l = tlog(); l.rev++; if (!was) { if (L4.has(w)) l.nw++; else l.bw = (l.bw || 0) + 1; S.extra = (S.extra || []).filter(x => x !== w); }
  save("srs"); save("main");
}
function status(w) { const c = S.cards[w]; if (!c) return "new"; if (c[0] === "l") return "learning"; return c[2] >= 7 ? "known" : "review"; }

/* ---------- speech ---------- */
let zhVoice = null;
function loadVoices() { try { const vs = speechSynthesis.getVoices(); zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null; } catch (e) { zhVoice = null; } }
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function speak(text, rate, onend) {
  if (!("speechSynthesis" in window)) { toast("Speech isn't available in this browser."); return null; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "zh-CN"; if (zhVoice) u.voice = zhVoice;
  u.rate = rate || S.settings.rate; if (onend) u.onend = onend;
  speechSynthesis.speak(u); return u;
}
const sayBtn = (text, label = "▶ Listen", cls = "btn sm") => h("button", { class: cls, type: "button", onclick: () => speak(text), "aria-label": "Listen to " + text }, label);

/* ---------- sound, notifications, toast ---------- */
let AC = null;
function unlockAudio() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function chime(kind) {
  if (!S.settings.sound || !AC) return;
  const notes = kind === "rest" ? [523, 659, 784] : [880, 660, 880, 660];
  notes.forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = "triangle"; o.frequency.value = f; o.connect(g); g.connect(AC.destination); const t = AC.currentTime + i * 0.22; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.start(t); o.stop(t + 0.22); });
}
let titleTimer = null; const baseTitle = document.title;
function flashTitle(t) { clearInterval(titleTimer); let n = 0; titleTimer = setInterval(() => { document.title = n++ % 2 ? baseTitle : "⏰ " + t; if (n > 20 || document.visibilityState === "visible" && n > 6) { clearInterval(titleTimer); document.title = baseTitle; } }, 800); }
function notify(title, body) {
  try { if (S.settings.notify && "Notification" in window && Notification.permission === "granted") new Notification(title, { body }); } catch (e) { /* not allowed here */ }
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* none */ }
  flashTitle(title);
}
async function enableNotify() {
  if (!("Notification" in window)) { toast("System notifications aren't available here. You'll get the on-page alert and sound."); return; }
  try { const p = await Notification.requestPermission(); S.settings.notify = p === "granted"; save("main"); toast(p === "granted" ? "System notifications on." : "Notifications were blocked here. You'll still get the on-page alert and sound."); }
  catch (e) { toast("This view blocks system notifications. You'll still get the on-page alert and sound."); }
  render();
}
let toastT = null;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }

/* ---------- timer engine ---------- */
const SEQS = {
  pomodoro: () => { const s = S.settings, f = []; for (let i = 0; i < 4; i++) { f.push({ label: `Focus ${i + 1} of 4`, kind: "focus", min: s.focus }); f.push(i < 3 ? { label: "Short rest", kind: "rest", min: s.rest } : { label: "Long rest", kind: "rest", min: s.long }); } return f; },
  daily: () => [
    { label: "Flashcard reviews", kind: "focus", min: 25, go: "cards", block: "reviews" },
    { label: "Rest: stand up, drink water", kind: "rest", min: 5 },
    { label: "New words by family", kind: "focus", min: 25, go: "families", block: "new" },
    { label: "Rest: look away from the screen", kind: "rest", min: 5 },
    { label: "Listening + dictation", kind: "focus", min: 20, go: "speaking", block: "listening" },
    { label: "Rest", kind: "rest", min: 5 },
    { label: "Reading passage", kind: "focus", min: 20, go: "reading", block: "reading" },
    { label: "Long rest: walk around", kind: "rest", min: 15 },
    { label: "Writing: 5 sentences", kind: "focus", min: 15, go: "writing", block: "writing" },
    { label: "Rest", kind: "rest", min: 5 },
    { label: "Speaking out loud", kind: "focus", min: 15, go: "speaking", block: "speaking" }],
  busy: () => [
    { label: "Flashcard reviews", kind: "focus", min: 15, go: "cards", block: "reviews" },
    { label: "One character family", kind: "focus", min: 10, go: "families", block: "new" },
    { label: "Five sentences", kind: "focus", min: 5, go: "writing", block: "writing" }],
  mock: () => [
    { label: "Mock · Listening (32 items)", kind: "focus", min: 20 },
    { label: "Mock · Reading (32 items)", kind: "focus", min: 30 },
    { label: "Mock · Writing (6 items)", kind: "focus", min: 25 },
    { label: "Copy answers / check sheet", kind: "focus", min: 5 },
    { label: "Break before speaking", kind: "rest", min: 15 },
    { label: "Mock · Speaking (5 items)", kind: "focus", min: 20 }],
};
const T = { running: false, paused: false, end: 0, remain: 0, dur: 0, steps: [], idx: 0, name: "", lock: null };
function startSeq(name, steps, idx = 0) { T.name = name; T.steps = steps; T.idx = idx; startStep(); }
function startStep() {
  const st = T.steps[T.idx]; if (!st) return stopTimer();
  unlockAudio();
  T.dur = Math.round(st.min * MIN); T.end = Date.now() + T.dur; T.remain = T.dur; T.running = true; T.paused = false;
  $("#banner").hidden = true; requestLock(); paintDock(); if (view === "timer") render();
}
function pauseTimer() { if (!T.running) return; if (T.paused) { T.end = Date.now() + T.remain; T.paused = false; requestLock(); } else { T.remain = T.end - Date.now(); T.paused = true; } paintDock(); if (view === "timer") render(); }
function stopTimer() { T.running = false; T.paused = false; T.steps = []; T.idx = 0; releaseLock(); paintDock(); if (view === "timer") render(); }
function skipStep() { finishStep(true); }
function finishStep(skipped) {
  const st = T.steps[T.idx]; if (!st) return;
  if (st.kind === "focus" && !skipped) { const l = tlog(); if (st.block) l.blocks[st.block] = true; save("main"); }
  const next = T.steps[T.idx + 1];
  T.running = false; releaseLock();
  if (!skipped) { chime(st.kind); notify(st.kind === "rest" ? "Rest is over" : `${st.label} done`, next ? `Next: ${next.label} (${next.min} min)` : "Session complete. Well done."); }
  if (next) {
    T.idx++;
    if (S.settings.autoNext) { startStep(); showBanner(st, next, true); }
    else { showBanner(st, next, false); paintDock(); }
  } else { showBanner(st, null, false); T.steps = []; paintDock(); }
  if (view === "timer" || view === "today") render();
}
function showBanner(st, next, auto) {
  const b = $("#banner"); b.hidden = false; b.className = "banner" + (next && next.kind === "rest" ? " rest" : "");
  $("#bannerTitle").textContent = next ? (next.kind === "rest" ? "Time for a rest" : `Next: ${next.label}`) : "Session complete";
  $("#bannerText").textContent = next ? (auto ? `${next.min}-minute ${next.kind === "rest" ? "rest" : "block"} has started.` : `${st.label} finished. Start the ${next.min}-minute ${next.kind === "rest" ? "rest" : "block"} when ready.`) : "Every block is done. Log off with a clear head.";
  const nb = $("#bannerNext"); nb.hidden = !(next && !auto) && !(next && next.go && next.kind === "focus");
  nb.textContent = next && !auto ? "Start next" : "Go there";
  nb.onclick = () => { if (next && !auto) startStep(); else if (next && next.go) location.hash = next.go; b.hidden = true; };
  $("#bannerClose").onclick = () => { b.hidden = true; };
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => { b.hidden = true; }, 20000);
}
async function requestLock() { try { if (navigator.wakeLock && !T.lock) T.lock = await navigator.wakeLock.request("screen"); } catch (e) { T.lock = null; } }
function releaseLock() { try { T.lock && T.lock.release(); } catch (e) { /* ignore */ } T.lock = null; }
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function curRemain() { return T.paused ? T.remain : T.end - Date.now(); }
function paintDock() {
  const d = $("#dock"), st = T.steps[T.idx];
  if (!T.running || !st || view === "timer") { d.hidden = true; return; }
  d.hidden = false; d.className = "dock " + (st.kind === "rest" ? "rest" : "focus");
  $("#dockLabel").textContent = st.label; $("#dockTime").textContent = mmss(curRemain());
  $("#dockToggle").textContent = T.paused ? "Resume" : "Pause";
}
$("#dockToggle").onclick = pauseTimer;
setInterval(() => {
  if (T.running && !T.paused) {
    const r = T.end - Date.now();
    if (r <= 0) finishStep(false);
    else { paintDock(); const big = $("#tBig"); if (big) { big.textContent = mmss(r); const ring = $("#tRing"); if (ring) ring.setAttribute("stroke-dashoffset", String(ringLen * (r / T.dur))); } }
  }
  for (const lt of LocalTimers) lt.tick();
}, 250);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && T.running && !T.lock) requestLock(); });

/* small inline countdowns for speaking prep/answer */
const LocalTimers = new Set();
function inlineTimer(el, phases, onDone) {
  // phases: [{label, sec}]
  let i = 0, end = 0, live = true;
  const lab = h("span", { class: "small" }), clock = h("span", { class: "clock" }, "00:00");
  el.replaceChildren(h("div", { class: "prep" }, clock, lab));
  const startP = () => { const p = phases[i]; end = Date.now() + p.sec * 1000; lab.textContent = p.label; };
  const obj = { tick() { if (!live) return; if (!document.body.contains(el)) { live = false; LocalTimers.delete(obj); return; } const r = end - Date.now(); clock.textContent = mmss(r); if (r <= 0) { chime(phases[i].kind || "focus"); i++; if (i < phases.length) startP(); else { live = false; LocalTimers.delete(obj); lab.textContent = "Time's up"; onDone && onDone(); } } }, stop() { live = false; LocalTimers.delete(obj); } };
  unlockAudio(); startP(); LocalTimers.add(obj); return obj;
}

/* ---------- Claude checks ---------- */
async function askClaude(prompt) {
  if (!SAMPLE) throw { code: "unavailable" };
  return SAMPLE.json(prompt, { cache: false });
}
function claudeBox(getText, makePrompt, onResult) {
  const out = h("div", { class: "stack" });
  const btn = h("button", { class: "btn blue", type: "button" }, "Check with Claude");
  btn.onclick = async () => {
    const txt = getText().trim(); if (!txt) { toast("Write something first."); return; }
    btn.disabled = true; btn.textContent = "Checking…"; out.replaceChildren(h("p", { class: "muted small" }, "Claude is reading your Chinese…"));
    try {
      const r = await askClaude(makePrompt(txt));
      out.replaceChildren(renderFeedback(r)); onResult && onResult(txt, r);
    } catch (e) {
      const c = e && e.code;
      out.replaceChildren(h("div", { class: "feedback no" }, c === "not_granted" ? "Claude checks are switched off for this page. Compare with the model answer instead." : c === "rate_limited" ? "Too many checks in a row. Wait a minute and try again." : "The check didn't finish. Try again, or compare with the model answer."));
    }
    btn.disabled = false; btn.textContent = "Check with Claude";
  };
  if (!SAMPLE) btn.hidden = true;
  return { btn, out };
}
function renderFeedback(r) {
  const ok = r && (r.ok === true || (typeof r.score === "number" && r.score >= 7));
  return h("div", { class: "feedback " + (ok ? "ok" : "no") },
    h("div", { class: "row" }, h("b", null, ok ? "Looks good" : "Needs fixing"), typeof r.score === "number" ? h("span", { class: "chip " + (ok ? "g" : "y") }, `${r.score}/10`) : null, r.chars ? h("span", { class: "chip" }, `${r.chars} characters`) : null),
    r.corrected ? h("p", { class: "zh", style: "font-size:1.1rem;margin-top:6px" }, r.corrected) : null,
    Array.isArray(r.good) && r.good.length ? h("ul", { class: "small" }, r.good.slice(0, 3).map(x => h("li", null, "✓ " + x))) : null,
    Array.isArray(r.issues) && r.issues.length ? h("ul", { class: "small" }, r.issues.slice(0, 4).map(x => h("li", null, x))) : null,
    r.tip ? h("p", { class: "small muted" }, "Tip: " + r.tip) : null);
}
const SENT_PROMPT = (task, txt) => `You are a strict but kind HSK 4 (new HSK 3.0) writing examiner. Task: ${task}\nLearner's answer: «${txt}»\nJudge grammar, word choice, word order, use of the required word or pattern, and punctuation (full-width). Keep the learner's idea; correct minimally; stay within HSK 1-4 vocabulary.\nReply with ONLY JSON: {"ok": true or false, "corrected": "the corrected sentence in simplified Chinese (same as input if already correct)", "issues": ["up to 3 short notes in English, each naming the exact problem"], "tip": "one short English tip"}`;
const ESSAY_PROMPT = (task, txt) => `You are an HSK 4 (new HSK 3.0) examiner marking the short essay task (at least 80 characters, simplified Chinese). Prompt: ${task}\nEssay (${hanCount(txt)} Chinese characters): «${txt}»\nMark for task completion, structure (opening, details, closing), grammar accuracy, vocabulary range at HSK 4, connectors, and length. Under 80 characters is a major deduction.\nReply with ONLY JSON: {"score": integer 0-10, "chars": ${hanCount(txt)}, "corrected": "a corrected version keeping the learner's content, HSK 1-4 vocabulary", "good": ["up to 2 strengths in English"], "issues": ["up to 4 specific problems in English"], "tip": "one concrete improvement in English"}`;

/* ---------- popover (word lookup) ---------- */
function showPop(anchor, word, py, gl, lv) {
  const p = $("#pop"); const inDeck = WORD.has(word);
  p.replaceChildren(
    h("div", { class: "row", style: "justify-content:space-between" }, h("b", { class: "zh", style: "font-size:1.4rem" }, word), lv ? h("span", { class: "chip" + (lv === 4 ? " y" : "") }, lv <= 6 ? `HSK ${lv}` : "HSK 7–9") : null),
    py ? h("div", { class: "py" }, py) : null, gl ? h("div", null, gl) : h("div", { class: "muted small" }, "No short gloss"),
    h("div", { class: "row", style: "margin-top:8px" }, sayBtn(word, "▶"), inDeck && !S.cards[word] ? h("button", { class: "btn sm primary", type: "button", onclick: () => { S.extra = [...new Set([word, ...(S.extra || [])])]; save("main"); toast(`${word} added to today's new cards`); p.hidden = true; } }, "Add to cards") : inDeck ? h("span", { class: "chip g" }, status(word)) : null));
  p.hidden = false;
  const r = anchor.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
  let x = Math.min(Math.max(16, r.left), innerWidth - pw - 16), y = r.bottom + 8; if (y + ph > innerHeight - 90) y = r.top - ph - 8;
  p.style.left = x + "px"; p.style.top = Math.max(16, y) + "px";
}
document.addEventListener("pointerdown", e => { const p = $("#pop"); if (!p.hidden && !p.contains(e.target) && !e.target.closest(".tok")) p.hidden = true; });

/* ---------- views ---------- */
let view = "today";
const UI = { cards: { cur: null, shown: false, mode: null }, fam: { sel: null, filter: "all", q: "" }, gr: { sel: null, tab: "build", i: 0 }, rd: { sel: null, py: false, hl: true, t0: 0, answers: {} }, wr: { tab: "pic", pi: null, ei: 0 }, sp: { tab: "dict" }, pr: { reset: false } };
const VIEWS = { today: vToday, cards: vCards, families: vFamilies, grammar: vGrammar, reading: vReading, writing: vWriting, speaking: vSpeaking, timer: vTimer, progress: vProgress };
function route() { const v = (location.hash || "#today").slice(1); view = VIEWS[v] ? v : "today"; render(); }
addEventListener("hashchange", route);
function render() {
  const root = $("#view"); if (!root) return;
  document.querySelectorAll("#nav a").forEach(a => { if (a.dataset.v === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $("#pop").hidden = true;
  root.replaceChildren(...[].concat(VIEWS[view]()));
  root.querySelectorAll(".seg").forEach(seg => { const on = seg.querySelector('[aria-pressed="true"]'); if (on && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = Math.max(0, on.offsetLeft - 16); });
  paintDock();
}

function header(title, zh, sub) {
  return h("div", { class: "topbar" }, h("div", { class: "stack", style: "gap:2px" }, h("div", { class: "row", style: "gap:10px" }, h("h1", null, title), zh ? h("span", { class: "zh muted", style: "font-size:1.2rem" }, zh) : null), sub ? h("p", { class: "muted small" }, sub) : null), h("div", { class: "spacer" }), h("span", { class: "chip y num" }, `${Math.max(0, daysBetween(today(), EXAM))} days to exam`));
}

/* ===== Today ===== */
const ROUTINE = [
  ["reviews", "Flashcard reviews", 25, "cards", "First thing. Never skip."],
  ["new", "New words by family", 25, "families", "1–3 families, say each word aloud."],
  ["listening", "Listening + dictation", 20, "speaking", "One set, then shadow 2 minutes."],
  ["reading", "Reading passage", 20, "reading", "Timed, then answer the questions."],
  ["writing", "Writing", 15, "writing", "5 picture sentences; essay on alternate days."],
  ["speaking", "Speaking out loud", 15, "speaking", "One retell or one 2-minute answer."]];
function vToday() {
  const t = today(), ph = phase(t), days = daysBetween(t, EXAM), q = queues(), l = tlog(), quota = newQuota();
  const seen = Object.keys(S.cards).filter(w => L4.has(w)).length, mock = MOCKS.includes(t);
  const nextFam = D.families.find(f => f[3].some(w => !S.cards[w]));
  const kids = [];
  kids.push(header("Today", "今天", nice(t)));
  kids.push(h("div", { class: "grid g2" },
    h("div", { class: "box " + ph.color },
      h("div", { class: "eyebrow" }, ph.zh + " · " + ph.name),
      h("div", { class: "countdown", style: "margin:8px 0" }, h("span", { class: "big num" }, String(Math.max(0, days))), h("span", { style: "font-weight:700" }, days === 1 ? "day to HSK 4" : "days to HSK 4"), h("span", { class: "muted small" }, "Sun 13 Dec, 9:00")),
      h("p", null, ph.text),
      mock ? h("p", { style: "margin-top:10px;font-weight:800" }, "Mock exam today: start at 9:00 like the real thing.") : null),
    h("div", { class: "box" },
      h("div", { class: "grid g2", style: "gap:12px" },
        stat("Due now", q.learnNow.length + q.due.length, "cards to review"),
        stat("New today", `${l.nw || 0}/${quota}`, quota ? "new words" : "new words paused (review phase)"),
        stat("Study time", `${Math.round((l.sec || 0) / 60)}m`, "active today", "todayMin"),
        stat("Streak", streak(), "days in a row")),
      h("div", { class: "stack", style: "margin-top:14px;gap:6px" }, h("div", { class: "row small" }, h("b", null, `${seen} of ${D.words.length} words started`), h("span", { class: "muted" }, `${D.words.length - seen} to go`)), h("div", { class: "meter" }, h("i", { style: `width:${(seen / D.words.length * 100).toFixed(1)}%` }))))));
  kids.push(h("div", { class: "grid g2" },
    h("div", { class: "box" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:10px" }, h("h2", null, "Daily routine"), h("span", { class: "muted small" }, "about 2 hours")),
      h("div", { class: "blocks" }, ROUTINE.map(([id, name, min, go, hint]) => {
        const done = !!l.blocks[id];
        return h("div", { class: "block" + (done ? " done" : "") },
          h("input", { type: "checkbox", id: "blk-" + id, checked: done, "aria-label": "Mark " + name + " done", onchange: e => { l.blocks[id] = e.target.checked; save("main"); render(); } }),
          h("label", { for: "blk-" + id, class: "stack", style: "gap:0;font-weight:600" }, h("span", null, `${name} · ${min} min`), h("span", { class: "muted small", style: "font-weight:400" }, hint)),
          h("a", { class: "btn sm", href: "#" + go }, "Go"));
      })),
      h("div", { class: "row", style: "margin-top:14px" },
        h("button", { class: "btn primary", type: "button", onclick: () => { startSeq("Guided daily session", SEQS.daily()); location.hash = "timer"; } }, "▶ Start guided session"),
        h("button", { class: "btn", type: "button", onclick: () => { startSeq("Busy-day 30 minutes", SEQS.busy()); location.hash = "timer"; } }, "Busy day: 30 min"),
        mock ? h("button", { class: "btn red", type: "button", onclick: () => { startSeq("Mock exam", SEQS.mock()); location.hash = "timer"; } }, "Start mock exam") : null),
      h("p", { class: "muted small", style: "margin-top:8px" }, "The guided session runs each block with timed rests in between and alerts you when to switch.")),
    h("div", { class: "stack", style: "gap:16px" },
      baseLeft() ? h("div", { class: "box sky" }, h("div", { class: "eyebrow" }, "HSK 1–3 check"),
        h("p", { style: "margin-top:6px" }, `The new HSK 4 tests all 2,000 words, including ${D.base.length} from Levels 1–3. ${baseLeft()} haven't been checked yet. Tap through 30 a day: “I know it” or “Learn it”.`),
        h("div", { class: "row", style: "margin-top:10px" }, h("button", { class: "btn", type: "button", onclick: () => { UI.cards.deck = "base"; location.hash = "cards"; render(); } }, "Check HSK 1–3 words"))) : null,
      nextFam ? h("div", { class: "box " + (nextFam[1] === "k" ? "yellow" : "lilac") },
        h("div", { class: "eyebrow" }, "Next character family"),
        h("div", { class: "row", style: "gap:16px;margin-top:6px" }, h("span", { class: "han md" }, nextFam[0]), h("div", { class: "stack", style: "gap:2px;min-width:0" }, h("span", { class: "zh" }, nextFam[3].join("、")), h("span", { class: "small muted" }, nextFam[1] === "k" ? `You know ${nextFam[0]} from ${nextFam[2]}` : "New character: learn it first"))),
        h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn", type: "button", onclick: () => studyFamily(nextFam[0]) }, "Study this family"))) : null,
      h("div", { class: "box" }, h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, "Study minutes, last 14 days"), h("span", { class: "muted small" }, "goal 120")), minutesChart()),
      h("div", { class: "box flat small" }, h("b", null, "Key dates "), MOCKS.map(m => h("span", { class: "chip", style: "margin:4px 4px 0 0" }, "Mock " + nice(m))), h("span", { class: "chip y", style: "margin:4px 4px 0 0" }, "New words stop " + nice(NEW_END)), h("span", { class: "chip r", style: "margin:4px 0 0 0" }, "Exam " + nice(EXAM))))));
  return kids;
}
function stat(label, value, sub, id) { return h("div", { class: "stack", style: "gap:2px" }, h("span", { class: "eyebrow" }, label), h("span", { class: "big num", id }, String(value)), h("span", { class: "muted small" }, sub)); }
function updateTodayLive() { const el = $("#todayMin"); if (el) el.textContent = `${Math.round((tlog().sec || 0) / 60)}m`; }
function minutesChart() {
  const W = 600, H = 170, L = 34, B = 26, days = [...Array(14)].map((_, i) => addDays(today(), i - 13));
  const vals = days.map(d => Math.round(((S.log[d] && S.log[d].sec) || 0) / 60));
  const max = Math.max(150, ...vals), y = v => H - B - (v / max) * (H - B - 10), bw = (W - L - 8) / 14;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "bars"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Study minutes per day for the last 14 days");
  const add = (tag, a, txt) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; svg.append(e); return e; };
  [0, 60, 120].forEach(v => { add("line", { x1: L, x2: W, y1: y(v), y2: y(v), stroke: "var(--muted)", "stroke-width": v === 120 ? 1.5 : 0.6, "stroke-dasharray": v === 120 ? "5 4" : "2 4" }); add("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)", "font-family": "var(--f-mono)" }, String(v)); });
  vals.forEach((v, i) => { const x = L + 4 + i * bw; add("rect", { x, y: y(v), width: bw - 8, height: Math.max(0, H - B - y(v)), fill: i === 13 ? "var(--pencil)" : "var(--jade)", stroke: "var(--line)", "stroke-width": 2 }); add("text", { x: x + (bw - 8) / 2, y: H - 8, "text-anchor": "middle", "font-size": 11, fill: i === 13 ? "var(--ink)" : "var(--muted)", "font-weight": i === 13 ? 700 : 400, "font-family": "var(--f-mono)" }, String(parseKey(days[i]).getDate())); });
  return svg;
}
function studyFamily(c) {
  const f = FAMS.get(c); if (!f) return;
  const add = f[3].filter(w => !S.cards[w]);
  S.extra = [...new Set([...add, ...(S.extra || [])])]; save("main");
  toast(add.length ? `${add.length} words from ${c} queued first` : `You've started every ${c} word`);
  UI.cards.cur = null; location.hash = "cards";
}

/* ===== Cards ===== */
function nextCard() {
  const q = queues();
  if (q.learnNow.length) return { w: q.learnNow[0], kind: "learning" };
  if (q.due.length) return { w: q.due[0], kind: "review" };
  if (q.fresh.length) return { w: q.fresh[0], kind: "new" };
  return null;
}
function vCards() {
  const q = queues(), mode = S.settings.mode;
  const kids = [header("Flashcards", "生词", "Say the answer out loud before you reveal it. That recall is what makes it stick.")];
  kids.push(h("div", { class: "seg", role: "group", "aria-label": "Deck" }, [["l4", "HSK 4 cards"], ["base", `HSK 1–3 check (${baseLeft()} left)`]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String((UI.cards.deck || "l4") === k), onclick: () => { UI.cards.deck = k; render(); } }, lab))));
  if (UI.cards.deck === "base") return kids.concat(baseCheck());
  kids.push(h("div", { class: "row" },
    h("span", { class: "chip b" }, `${q.learnNow.length + q.learnLater.length} learning`), h("span", { class: "chip y" }, `${q.due.length} reviews due`), h("span", { class: "chip l" }, `${q.fresh.length} new left today`), hardWords().length ? h("a", { class: "chip r", href: "#progress" }, `${hardWords().length} hard words`) : null,
    h("div", { class: "spacer", style: "flex:1" }),
    h("div", { class: "seg", role: "group", "aria-label": "Card direction" }, [["zh2en", "汉字 → meaning"], ["en2zh", "Meaning → 汉字"], ["listen", "Listen"]].map(([m, lab]) => h("button", { type: "button", "aria-pressed": String(mode === m), onclick: () => { S.settings.mode = m; save("main"); UI.cards.shown = false; render(); } }, lab)))));
  let cur = UI.cards.cur;
  if (!cur || (cur.kind === "new" && S.cards[cur.w])) { cur = UI.cards.cur = nextCard(); UI.cards.shown = false; if (cur && mode === "listen") setTimeout(() => speak(cur.w), 250); }
  if (!cur) {
    const soon = q.learnLater[0];
    kids.push(h("div", { class: "box jade cardstage" }, h("div", { class: "stack", style: "align-items:center" },
      h("span", { class: "han md" }, "完成了"), h("h2", null, "All caught up for now"),
      soon ? h("p", null, `${q.learnLater.length} learning card${q.learnLater.length > 1 ? "s" : ""} come back in ${fmtNext(S.cards[soon])}.`) : h("p", null, "Come back tomorrow for your reviews."),
      h("div", { class: "row", style: "justify-content:center;margin-top:8px" },
        soon ? h("button", { class: "btn", type: "button", onclick: () => { UI.cards.cur = { w: soon, kind: "learning" }; UI.cards.shown = false; render(); } }, "Review early") : null,
        h("button", { class: "btn primary", type: "button", onclick: () => { const add = D.words.map(w => w[0]).filter(w => !S.cards[w] && !(S.extra || []).includes(w)).slice(0, 10); S.extra = [...(S.extra || []), ...add]; save("main"); UI.cards.cur = null; render(); } }, "Learn 10 more"),
        h("a", { class: "btn", href: "#families" }, "Browse families")))));
    return kids;
  }
  const w = WORD.get(cur.w), shown = UI.cards.shown, c = S.cards[cur.w];
  const fam = w[4] ? FAMS.get(w[4]) : null;
  const front = mode === "en2zh" ? h("div", { class: "stack", style: "align-items:center" }, h("span", { class: "gl", style: "font-size:1.6rem;font-weight:800" }, w[2] || w[1]), w[3] ? h("span", { class: "chip" }, w[3]) : null, h("span", { class: "muted small" }, "Picture the characters, then reveal"))
    : mode === "listen" ? h("div", { class: "stack", style: "align-items:center" }, h("button", { class: "btn primary", type: "button", style: "min-height:72px;font-size:1.3rem", onclick: () => speak(cur.w) }, "▶ Play again"), h("span", { class: "muted small" }, "What word did you hear?"))
    : h("div", { class: "stack", style: "align-items:center" }, h("span", { class: "han" }, w[0]));
  const back = h("div", { class: "stack", style: "align-items:center;gap:8px;margin-top:14px" },
    mode !== "zh2en" ? h("span", { class: "han" }, w[0]) : null,
    h("div", { class: "row", style: "justify-content:center" }, h("span", { class: "py" }, w[1]), sayBtn(w[0], "▶")),
    h("span", { class: "gl" }, w[2] || "See Mandarin Zone for the meaning"), w[3] ? h("span", { class: "chip" }, w[3]) : null,
    fam ? h("div", { class: "stack", style: "align-items:center;gap:4px;margin-top:6px" }, h("span", { class: "eyebrow" }, `Family ${fam[0]}` + (fam[2] ? ` · you know it from ${fam[2]}` : "")), h("div", { class: "siblings" }, fam[3].map(x => h("span", { class: x === w[0] ? "me" : "" }, x)))) : null,
    seenIn(w[0]),
    h("a", { class: "small", href: "https://hsk4.mandarinzone.com/vocabulary/", target: "_blank", rel: "noopener" }, "More example sentences on Mandarin Zone ↗"));
  const stage = h("div", { class: "box cardstage", id: "stage" }, h("div", { class: "stack", style: "align-items:center;gap:6px" },
    h("span", { class: "chip " + (cur.kind === "new" ? "l" : cur.kind === "learning" ? "b" : "y") }, cur.kind === "new" ? "New word" : cur.kind === "learning" ? "Learning" : "Review"),
    front, shown ? back : null));
  kids.push(stage);
  if (!shown) kids.push(h("button", { class: "btn primary", type: "button", style: "min-height:56px;font-size:1.05rem", onclick: () => { UI.cards.shown = true; if (mode === "zh2en") speak(cur.w); render(); } }, "Show answer ", h("span", { class: "kbd" }, "Space")));
  else kids.push(h("div", { class: "rate" }, [[1, "Again", "red"], [2, "Hard", ""], [3, "Good", "green"], [4, "Easy", "blue"]].map(([g, lab, cls]) =>
    h("button", { class: "btn " + cls, type: "button", onclick: () => doRate(g) }, h("span", null, lab, " ", h("span", { class: "kbd" }, String(g))), h("small", null, fmtNext(simulate(c, g)))))));
  kids.push(h("p", { class: "muted small" }, "Intervals are capped so every word comes back at least twice before 13 December."));
  return kids;
}
function doRate(g) { const cur = UI.cards.cur; if (!cur) return; rate(cur.w, g); UI.cards.cur = null; UI.cards.shown = false; render(); }
addEventListener("keydown", e => {
  if (view !== "cards" || UI.cards.deck === "base" || e.target.closest("input,textarea,select")) return;
  if ((e.key === " " || e.key === "Enter") && !UI.cards.shown && UI.cards.cur) { e.preventDefault(); UI.cards.shown = true; if (S.settings.mode === "zh2en") speak(UI.cards.cur.w); render(); }
  else if (UI.cards.shown && ["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); doRate(Number(e.key)); }
});

/* ===== Families ===== */
function vFamilies() {
  const U = UI.fam, kids = [header("Character families", "字族", "73% of HSK 4 words reuse a character you already know. Learn them as a set.")];
  if (U.sel) {
    const f = FAMS.get(U.sel);
    kids.push(h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onclick: () => { U.sel = null; render(); } }, "← All families")));
    kids.push(h("div", { class: "box " + (f[1] === "k" ? "yellow" : "lilac") }, h("div", { class: "row", style: "gap:18px" }, h("span", { class: "han" }, f[0]),
      h("div", { class: "stack", style: "gap:4px;min-width:0" }, h("h2", null, `${f[3].length} HSK 4 words`), h("p", null, f[1] === "k" ? `You already know ${f[0]} from ${f[2] || "HSK 1–3"}. Guess each word before you check it.` : `${f[0]} is a new HSK 4 character. Learn its sound and meaning first, then the set.`), f[4] ? h("span", { class: "chip" }, "✍ Handwriting character by Level 4") : null,
        h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => studyFamily(f[0]) }, "Study this family now"), sayBtn(f[3].join("，"), "▶ Hear all"))))));
    kids.push(h("div", { class: "wordlist" }, f[3].map(x => { const w = WORD.get(x), st = status(x); return h("div", { class: "word" }, h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, x), sayBtn(x, "▶")), h("span", { class: "py", style: "font-size:0.95rem" }, w ? w[1] : ""), h("span", { class: "small" }, w ? w[2] : ""), h("span", { class: "chip " + (st === "known" ? "g" : st === "new" ? "" : "b"), style: "align-self:flex-start;margin-top:4px" }, st)); })));
    return kids;
  }
  const qv = U.q.trim();
  const list = D.families.filter(f => (U.filter === "all" || (U.filter === "k" ? f[1] === "k" : f[1] === "n")) && (!qv || f[0] === qv || f[3].some(w => w.includes(qv))));
  kids.push(h("div", { class: "row" },
    h("div", { class: "seg", role: "group", "aria-label": "Filter families" }, [["all", "All 241"], ["k", "Known characters"], ["n", "New characters"]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String(U.filter === k), onclick: () => { U.filter = k; render(); } }, lab))),
    h("input", { type: "text", id: "famSearch", placeholder: "Find a character or word, e.g. 降", value: U.q, style: "max-width:260px", oninput: e => { U.q = e.target.value; clearTimeout(vFamilies.t); vFamilies.t = setTimeout(() => { render(); const i = $("#famSearch"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } })));
  kids.push(h("div", { class: "famgrid" }, list.map(f => { const started = f[3].filter(w => S.cards[w]).length; return h("button", { class: "fam" + (f[1] === "n" ? " new" : ""), type: "button", onclick: () => { U.sel = f[0]; render(); scrollTo(0, 0); } },
    h("div", { class: "row", style: "justify-content:space-between" }, h("span", { class: "han" }, f[0]), h("span", { class: "num small" }, `${started}/${f[3].length}`)),
    h("span", { class: "zh small", style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, f[3].slice(0, 4).join("、") + (f[3].length > 4 ? "…" : "")),
    h("span", { class: "muted" }, f[1] === "k" ? `from ${f[2]}` : "new character", f[4] ? " · ✍" : ""),
    h("div", { class: "meter" }, h("i", { style: `width:${started / f[3].length * 100}%` }))); })));
  if (!list.length) kids.push(h("p", { class: "muted" }, "No family matches that. Try one character, such as 降 or 餐."));
  return kids;
}

/* ===== Grammar ===== */
function grStat(id) { return (S.grammar[id] ||= { b: 0, c: 0, n: 0 }); }
function vGrammar() {
  const U = UI.gr, kids = [header("Grammar", "语法", "Level 4 patterns for building sentences. Each unit: the pattern, examples, then three kinds of drill.")];
  if (U.pair) return kids.concat(pairView(U));
  if (!U.sel) {
    kids.push(h("h2", { style: "margin-top:6px" }, "Confusable words (Reading Part 1)"));
    kids.push(h("p", { class: "muted small" }, "The word-choice questions love near-synonyms. Learn the rule, then test it."));
    kids.push(h("div", { class: "unitlist" }, PAIRS.map(p => { const s = S.pairs[p.id] || 0; return h("button", { class: "unit", type: "button", onclick: () => { U.pair = p.id; render(); scrollTo(0, 0); } }, h("b", { class: "zh", style: "font-size:1.2rem" }, p.words.join(" / ")), h("span", { class: "muted small" }, p.rule.split(". ")[0] + "."), h("span", { class: "chip " + (s >= p.items.length ? "g" : ""), style: "align-self:flex-start" }, `${Math.min(s, p.items.length)}/${p.items.length} right`)); })));
    const groups = [...new Set(D.grammar.map(g => g.group))];
    for (const gname of groups) {
      kids.push(h("h2", { style: "margin-top:6px" }, gname));
      kids.push(h("div", { class: "unitlist" }, D.grammar.filter(g => g.group === gname).map(g => { const s = grStat(g.id), done = Math.min(6, s.b + s.c); return h("button", { class: "unit", type: "button", onclick: () => { U.sel = g.id; U.tab = "learn"; U.i = 0; render(); scrollTo(0, 0); } },
        h("b", null, g.title), h("span", { class: "zh small" }, g.pattern), h("span", { class: "muted small" }, g.meaning), h("div", { class: "row small" }, h("div", { class: "meter", style: "flex:1;height:10px;border-width:2px" }, h("i", { style: `width:${done / 6 * 100}%` })), h("span", { class: "num" }, `${done}/6`))); })));
    }
    return kids;
  }
  const g = GR.get(U.sel), s = grStat(g.id);
  kids.push(h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onclick: () => { U.sel = null; render(); } }, "← All units"), h("span", { class: "chip" }, g.group)));
  kids.push(h("div", { class: "box stack" }, h("h2", null, g.title), h("div", { class: "pattern" }, g.pattern), h("p", null, h("b", null, "Meaning: "), g.meaning), h("p", { class: "muted" }, g.notes)));
  kids.push(h("div", { class: "seg", role: "group", "aria-label": "Unit sections" }, [["learn", "Examples"], ["build", "Build sentences"], ["choose", "Choose the word"], ["own", "Make your own"]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String(U.tab === k), onclick: () => { U.tab = k; U.i = 0; render(); } }, lab))));
  if (U.tab === "learn") {
    kids.push(h("div", { class: "box" }, g.examples.map(([zh, en]) => h("div", { class: "ex" }, sayBtn(zh, "▶"), h("div", { class: "stack", style: "gap:0" }, h("span", { class: "zh" }, zh), h("span", { class: "muted small" }, en))))));
    kids.push(h("p", { class: "muted small" }, "Shadow each example: play it, then say it at the same speed. Then try the drills."));
  } else if (U.tab === "build") kids.push(buildDrill(g, s));
  else if (U.tab === "choose") kids.push(chooseDrill(g, s));
  else kids.push(ownDrill(g, s));
  return kids;
}
function buildDrill(g, s) {
  const U = UI.gr, item = g.build[U.i % g.build.length];
  const target = item.filter(x => x !== "，" && x !== "；");
  const bankItems = shuffle(target.map((t, i) => ({ t, i })));
  const placed = [];
  const box = h("div", { class: "box stack" });
  const line = h("div", { class: "chunks", "aria-label": "Your sentence" }), bank = h("div", { class: "chunks", style: "border-style:solid", "aria-label": "Word bank" }), fb = h("div");
  const draw = () => {
    line.replaceChildren(...(placed.length ? placed.map((p, k) => h("button", { class: "chunk placed", type: "button", onclick: () => { placed.splice(k, 1); draw(); } }, p.t)) : [h("span", { class: "muted small" }, "Tap the words below in the right order")]));
    bank.replaceChildren(...bankItems.filter(b => !placed.includes(b)).map(b => h("button", { class: "chunk", type: "button", onclick: () => { placed.push(b); draw(); } }, b.t)));
  };
  draw();
  const answer = target.join("");
  box.append(h("div", { class: "row", style: "justify-content:space-between" }, h("h3", null, `Sentence ${U.i % g.build.length + 1} of ${g.build.length}`), h("span", { class: "muted small" }, "Commas are added for you")), line, bank, fb,
    h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", onclick: () => { const mine = placed.map(p => p.t).join(""); const ok = mine === answer; fb.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", null, ok ? "Correct. " : "Not yet. "), ok ? h("span", { class: "zh" }, item.join("") + "。") : "Check where the time words, adverbs and the pattern words sit.")); if (ok) { s.b = Math.min(3, s.b + 1); save("main"); speak(item.join("")); } } }, "Check"),
      h("button", { class: "btn", type: "button", onclick: () => { fb.replaceChildren(h("div", { class: "feedback" }, h("span", { class: "zh" }, item.join("") + "。"), " ", sayBtn(item.join(""), "▶"))); } }, "Show answer"),
      h("button", { class: "btn", type: "button", onclick: () => { U.i++; render(); } }, "Next →")));
  return box;
}
function chooseDrill(g, s) {
  const U = UI.gr, [sent, opts, ans, why] = g.choose[U.i % g.choose.length];
  const order = shuffle(opts.map((o, i) => i)); const fb = h("div");
  const box = h("div", { class: "box stack" }, h("h3", null, `Question ${U.i % g.choose.length + 1} of ${g.choose.length}`), h("p", { class: "zh", style: "font-size:1.3rem" }, sent));
  const grid = h("div", { class: "opts" }, order.map(i => h("button", { class: "opt", type: "button", onclick: e => {
    grid.querySelectorAll(".opt").forEach(b => b.disabled = true);
    e.currentTarget.classList.add(i === ans ? "right" : "wrong");
    if (i !== ans) grid.children[order.indexOf(ans)].classList.add("right"); else { s.c = Math.min(3, s.c + 1); save("main"); }
    fb.replaceChildren(h("div", { class: "feedback " + (i === ans ? "ok" : "no") }, h("b", null, i === ans ? "Right. " : "Not this one. "), why, " ", h("span", { class: "zh" }, sent.replace("___", opts[ans]))));
  } }, opts[i])));
  box.append(grid, fb, h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { U.i++; render(); } }, "Next →")));
  return box;
}
function ownDrill(g, s) {
  const ta = h("textarea", { id: "own-" + g.id, placeholder: "用这个句型写一个关于你自己生活的句子…" });
  const cb = claudeBox(() => ta.value, txt => SENT_PROMPT(`write one original sentence using the grammar pattern "${g.pattern}" (${g.meaning})`, txt), () => { s.n++; save("main"); });
  return h("div", { class: "box stack" }, h("h3", null, "Write a sentence about your own life"), h("p", { class: "muted small" }, "Making your own sentence is the best test that you own the pattern. Use people, places and plans from your week."), ta,
    h("div", { class: "row" }, cb.btn, h("button", { class: "btn", type: "button", onclick: () => { cb.out.replaceChildren(h("div", { class: "feedback" }, h("b", null, "Compare with: "), h("span", { class: "zh" }, g.examples.map(e => e[0]).join(" ")))); } }, "Compare with examples")), cb.out,
    !SAMPLE ? h("p", { class: "muted small" }, "Claude checks appear when this page runs in claude.ai with checks allowed.") : null);
}

/* ===== Reading ===== */
function vReading() {
  const U = UI.rd, kids = [header("Reading", "阅读", "Short passages built from HSK 4 words and the grammar units. Tap any word for its pinyin and meaning.")];
  if (!U.sel) {
    kids.push(h("div", { class: "unitlist" }, D.readings.map(r => { const best = S.reading[r.id]; return h("button", { class: "unit", type: "button", onclick: () => { U.sel = r.id; U.t0 = 0; U.answers = {}; U.speed = null; render(); scrollTo(0, 0); } },
      h("div", { class: "row", style: "justify-content:space-between" }, h("b", { class: "zh", style: "font-size:1.15rem" }, r.title), best ? h("span", { class: "chip g" }, `${best.score}/${r.q.length}`) : null),
      h("span", { class: "muted small" }, `${r.topic} · ${hanCount(r.text)} characters`), h("span", { class: "small" }, "Patterns: ", r.patterns.map(p => GR.get(p) ? GR.get(p).title.split(",")[0] : p).join(" · "))); })));
    return kids;
  }
  const r = D.readings.find(x => x.id === U.sel);
  const chars = hanCount(r.text);
  kids.push(h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onclick: () => { U.sel = null; render(); } }, "← All passages"), h("span", { class: "chip" }, r.topic), h("span", { class: "chip" }, `${chars} characters`)));
  const timerTxt = h("span", { class: "num" }, U.speed ? `${U.speed} characters/min` : U.t0 ? "Reading…" : "Target 140 characters/min");
  kids.push(h("div", { class: "row" },
    h("button", { class: "btn primary", type: "button", onclick: () => { if (!U.t0) { U.t0 = Date.now(); U.speed = null; render(); } else { const m = (Date.now() - U.t0) / MIN; U.speed = Math.round(chars / Math.max(m, 0.1)); U.t0 = 0; render(); } } }, U.t0 ? "■ Finished reading" : "▶ Start reading timer"), timerTxt,
    h("button", { class: "btn", type: "button", onclick: () => speak(r.text, S.settings.rate) }, "▶ Listen"), h("button", { class: "btn ghost", type: "button", onclick: () => speechSynthesis && speechSynthesis.cancel() }, "Stop"),
    h("label", { class: "row small", style: "gap:6px" }, h("input", { type: "checkbox", id: "rdPy", checked: U.py, onchange: e => { U.py = e.target.checked; render(); } }), "Pinyin"),
    h("label", { class: "row small", style: "gap:6px" }, h("input", { type: "checkbox", id: "rdHl", checked: U.hl, onchange: e => { U.hl = e.target.checked; render(); } }), "Highlight HSK 4 words"),
    h("label", { class: "row small", style: "gap:6px" }, h("input", { type: "checkbox", id: "rdHide", checked: !!U.hide, onchange: e => { U.hide = e.target.checked; render(); } }), "Listening mode: hide the text")));
  if (U.speed) kids.push(h("div", { class: "feedback " + (U.speed >= 140 ? "ok" : "no") }, U.speed >= 140 ? `${U.speed} characters a minute: at exam pace.` : `${U.speed} characters a minute. The exam expects about 140. Read it again tomorrow and beat this.`));
  const pass = h("div", { class: "passage", lang: "zh" }, r.tokens.map(t => {
    if (t.length === 1) return t[0];
    const [w, py, gl, lv] = t, cls = "tok" + (U.hl && lv === 4 ? " l4" : "");
    const inner = U.py && py ? h("ruby", null, w, h("rt", null, py)) : w;
    return h("span", { class: cls, role: "button", tabindex: "0", onclick: e => showPop(e.currentTarget, w, py, gl, lv), onkeydown: e => { if (e.key === "Enter") showPop(e.currentTarget, w, py, gl, lv); } }, inner);
  }));
  kids.push(U.hide ? h("div", { class: "box stack" }, h("h2", { class: "zh" }, r.title), h("p", null, "Listening Part 2 practice: play the passage at exam speed, then answer without reading. Untick the box to check the text."), h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => speak(r.text, 1.0) }, "▶ Play at exam speed"), h("button", { class: "btn", type: "button", onclick: () => speak(r.text, 0.8) }, "▶ Play slower")))
    : h("div", { class: "box" }, h("h2", { class: "zh", style: "margin-bottom:10px" }, r.title), pass));
  const qbox = h("div", { class: "box stack" }, h("h3", null, "Questions"));
  const orders = (U.orders ||= {});
  r.q.forEach(([qq, opts, ans], qi) => {
    const key = r.id + qi; const ord = (orders[key] ||= shuffle(opts.map((o, i) => i)));
    const chosen = U.answers[qi];
    qbox.append(h("div", { class: "stack", style: "gap:6px" }, h("p", { class: "zh", style: "font-weight:700" }, `${qi + 1}. ${qq}`),
      h("div", { class: "opts" }, ord.map(i => h("button", { class: "opt" + (U.checked ? (i === ans ? " right" : chosen === i ? " wrong" : "") : chosen === i ? " placed" : ""), style: !U.checked && chosen === i ? "background:var(--sky);color:var(--on-accent)" : "", type: "button", disabled: !!U.checked, onclick: () => { U.answers[qi] = i; render(); } }, opts[i])))));
  });
  qbox.append(h("div", { class: "row" },
    !U.checked ? h("button", { class: "btn primary", type: "button", onclick: () => { U.checked = true; const score = r.q.filter(([, , a], qi) => U.answers[qi] === a).length; const prev = S.reading[r.id]; S.reading[r.id] = { score: Math.max(score, prev ? prev.score : 0), last: today(), speed: U.speed || (prev && prev.speed) || null }; save("main"); render(); } }, "Check answers")
      : h("button", { class: "btn", type: "button", onclick: () => { U.checked = false; U.answers = {}; delete U.orders; render(); } }, "Try again"),
    U.checked ? h("b", null, `${r.q.filter(([, , a], qi) => U.answers[qi] === a).length} of ${r.q.length} correct`) : null));
  kids.push(qbox);
  kids.push(gapFill(r));
  const ta = h("textarea", { id: "rdOwn-" + r.id, placeholder: "Write 1–2 sentences on this topic using one of the patterns above…" });
  const cb = claudeBox(() => ta.value, txt => SENT_PROMPT(`after reading a passage about "${r.title}", write 1-2 sentences on the same topic using at least one of these patterns: ${r.patterns.map(p => GR.get(p).pattern).join(" / ")}`, txt));
  kids.push(h("div", { class: "box stack" }, h("h3", null, "Make the patterns your own"), h("div", { class: "row" }, r.patterns.map(p => h("button", { class: "chip b", type: "button", style: "cursor:pointer", onclick: () => { UI.gr.sel = p; UI.gr.tab = "learn"; location.hash = "grammar"; } }, GR.get(p).title))), ta, h("div", { class: "row" }, cb.btn), cb.out));
  return kids;
}

/* ===== Writing ===== */
function vWriting() {
  const U = UI.wr, kids = [header("Writing", "写作", "Part 1: five picture sentences (Q65–69). Part 2: one essay of 80+ characters (Q70). 25 minutes in total.")];
  kids.push(h("div", { class: "seg", role: "group", "aria-label": "Writing parts" }, [["pic", "Part 1 · Picture sentences"], ["essay", "Part 2 · Essay"], ["hand", "Handwriting"], ["log", `My writing (${S.writing.length})`]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String(U.tab === k), onclick: () => { U.tab = k; render(); } }, lab))));
  if (U.tab === "pic") {
    if (U.pi == null) U.pi = Math.floor(Math.random() * D.picture.length);
    const [scene, word, en, model] = D.picture[U.pi];
    const ta = h("textarea", { id: "pic-" + U.pi, placeholder: `用“${word}”写一个句子…`, style: "min-height:72px" });
    const fb = h("div");
    const cb = claudeBox(() => ta.value, txt => SENT_PROMPT(`HSK 4 writing part 1: look at the picture (${en}) and write ONE complete sentence that uses the word「${word}」.`, txt), (txt, r) => logWriting("Picture: " + word, txt, r));
    kids.push(h("div", { class: "grid g2" },
      h("div", { class: "box stack" }, h("div", { class: "scene", role: "img", "aria-label": en }, scene), h("div", { class: "row" }, h("span", { class: "chip y zh", style: "font-size:1.1rem" }, word), WORD.has(word) ? h("span", { class: "py small" }, WORD.get(word)[1]) : null, sayBtn(word, "▶")), h("details", null, h("summary", { class: "small" }, "What's in the picture?"), h("p", { class: "small" }, en))),
      h("div", { class: "box stack" }, h("label", { for: "pic-" + U.pi }, "Your sentence"), ta, h("div", { class: "row" }, cb.btn, h("button", { class: "btn", type: "button", onclick: () => fb.replaceChildren(h("div", { class: "feedback" }, h("b", null, "Model: "), h("span", { class: "zh" }, model), " ", sayBtn(model, "▶"))) }, "Show a model"), h("button", { class: "btn", type: "button", onclick: () => { if (!SAMPLE && ta.value.trim()) logWriting("Picture: " + word, ta.value.trim(), null); U.pi = (U.pi + 1 + Math.floor(Math.random() * (D.picture.length - 1))) % D.picture.length; render(); } }, "Next picture →")), cb.out, fb,
        h("ul", { class: "small muted" }, h("li", null, "Use the given word exactly, in a full sentence."), h("li", null, "Pick a safe pattern first: 正在…呢, 把, 被, 又…又."), h("li", null, "Simple and correct beats ambitious and broken. End with 。")))));
  } else if (U.tab === "hand") { kids.push(...handwriting());
  } else if (U.tab === "essay") {
    const [prompt, type, frame] = D.essay[U.ei];
    const draftKey = "essay-" + U.ei; const ta = h("textarea", { id: draftKey, style: "min-height:220px", placeholder: "开头… 中间… 结尾…" });
    try { ta.value = sessionStorage.getItem(draftKey) || ""; } catch (e) { /* none */ }
    const cnt = h("span", { class: "count" });
    const upd = () => { const n = hanCount(ta.value); cnt.textContent = `${n} / 80 characters`; cnt.className = "count " + (n >= 80 ? "ok" : "low"); try { sessionStorage.setItem(draftKey, ta.value); } catch (e) { /* none */ } };
    ta.addEventListener("input", upd); upd();
    const cb = claudeBox(() => ta.value, txt => ESSAY_PROMPT(prompt, txt), (txt, r) => logWriting(prompt, txt, r));
    kids.push(h("div", { class: "box stack" },
      h("div", { class: "row" }, h("label", { for: "essaySel" }, "Prompt"), h("select", { id: "essaySel", style: "max-width:520px", onchange: e => { U.ei = Number(e.target.value); render(); } }, D.essay.map((e, i) => h("option", { value: i, selected: i === U.ei }, `${e[1]}: ${e[0].replace("请写一篇不少于80字的短文，", "")}`)))),
      h("p", { class: "zh", style: "font-size:1.2rem;font-weight:700" }, prompt),
      h("div", { class: "row" }, frame.map(f => h("span", { class: "chip zh" }, f))),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => { startSeq("Essay", [{ label: "Essay (exam gives ~15 min)", kind: "focus", min: 15, block: "writing" }]); toast("15-minute essay timer started"); } }, "⏱ Start 15-min timer"), cnt)));
    kids.push(h("div", { class: "box stack" }, ta, h("div", { class: "row" }, cb.btn, !SAMPLE ? h("button", { class: "btn", type: "button", onclick: () => { if (ta.value.trim()) { logWriting(prompt, ta.value.trim(), null); toast("Saved to My writing"); } } }, "Save to My writing") : null), cb.out,
      h("details", null, h("summary", { class: "small" }, "Model opening (travel prompt)"), h("p", { class: "zh" }, "去年寒假，我和朋友一起去了云南旅游。首先，我们参观了很多有名的景点，风景特别美。然后，我们尝了当地的美食。最后，我们还认识了几个新朋友。虽然那次旅行有点儿累，但是让我非常难忘。"))));
  } else {
    if (!S.writing.length) kids.push(h("div", { class: "box flat" }, h("p", null, "Your checked sentences and essays will appear here, newest first, so you can see your mistakes repeat or disappear.")));
    kids.push(h("div", { class: "stack" }, S.writing.slice().reverse().slice(0, 40).map(x => h("div", { class: "box flat stack" }, h("div", { class: "row small muted" }, h("span", null, x.d), h("span", { class: "zh" }, x.p.slice(0, 40)), x.r && typeof x.r.score === "number" ? h("span", { class: "chip" }, `${x.r.score}/10`) : x.r ? h("span", { class: "chip " + (x.r.ok ? "g" : "y") }, x.r.ok ? "correct" : "fixed") : null), h("p", { class: "zh" }, x.t), x.r && x.r.corrected && x.r.corrected !== x.t ? h("p", { class: "zh small" }, "→ " + x.r.corrected) : null, x.r && x.r.issues && x.r.issues.length ? h("p", { class: "small muted" }, x.r.issues.join(" · ")) : null))));
  }
  return kids;
}
function logWriting(p, t, r) { S.writing.push({ d: today(), p, t, r: r ? { ok: r.ok, score: r.score, corrected: r.corrected, issues: (r.issues || []).slice(0, 4) } : null }); if (S.writing.length > 80) S.writing = S.writing.slice(-80); const l = tlog(); l.blocks.writing = true; save("main"); }

/* ===== Listen & speak ===== */
const DICT = [...D.grammar.flatMap(g => g.examples.map(e => e[0])), ...D.readings.flatMap(r => r.text.split(/(?<=[。！？])/).filter(s => hanCount(s) >= 6 && hanCount(s) <= 30))];
function vSpeaking() {
  const U = UI.sp, kids = [header("Listen & speak", "听说", "Listening drills, plus the three parts of the HSK 4 speaking test with real timings.")];
  kids.push(h("div", { class: "seg", role: "group", "aria-label": "Practice type" }, [["dict", "Dictation"], ["tones", "Tones"], ["retell", "Part 1 · Retell"], ["story", "Part 2 · Picture story"], ["q", "Part 3 · Questions"]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String(U.tab === k), onclick: () => { U.tab = k; U.item = null; render(); } }, lab))));
  const noTTS = !("speechSynthesis" in window);
  if (noTTS && (U.tab === "dict" || U.tab === "retell")) kids.push(h("div", { class: "feedback no" }, "This browser has no Chinese voice, so audio drills can't play here. Try Chrome or Safari, or the official mock papers' audio."));
  if (U.tab === "dict") {
    U.item ??= pick(DICT);
    const ta = h("input", { type: "text", id: "dictIn", placeholder: "Type what you hear in characters (or pinyin)", lang: "zh" });
    const fb = h("div");
    kids.push(h("div", { class: "box stack" },
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => speak(U.item, 1.0) }, "▶ Exam speed"), h("button", { class: "btn", type: "button", onclick: () => speak(U.item, 0.7) }, "▶ Slow")),
      ta, h("div", { class: "row" },
        h("button", { class: "btn green", type: "button", onclick: () => { const mine = ta.value.replace(/[\s，。！？、]/g, ""), ans = U.item.replace(/[，。！？、\s]/g, ""); let hit = 0; const marks = [...ans].map((c, i) => { const ok = mine.includes(c); if (ok) hit++; return h("span", { style: `background:${ok ? "color-mix(in srgb, var(--jade) 45%, transparent)" : "color-mix(in srgb, var(--seal) 45%, transparent)"};padding:0 1px` }, c); }); fb.replaceChildren(h("div", { class: "feedback " + (hit / ans.length > 0.85 ? "ok" : "no") }, h("p", { class: "zh", style: "font-size:1.25rem" }, marks), h("p", { class: "small" }, `${hit} of ${ans.length} characters caught. Red ones are the gaps to listen for.`))); } }, "Check"),
        h("button", { class: "btn", type: "button", onclick: () => { U.item = null; render(); } }, "Next sentence →")), fb,
      h("p", { class: "muted small" }, "Then shadow it: play again and speak along at the same speed. Shadowing trains your ear and mouth together.")));
  } else if (U.tab === "tones") { kids.push(...toneTrainer(U));
  } else if (U.tab === "retell") {
    U.item ??= Math.floor(Math.random() * D.retell.length);
    const text = D.retell[U.item]; const tbox = h("div"), reveal = h("div");
    let played = false;
    kids.push(h("div", { class: "box stack" },
      h("p", null, "The exam plays each passage once. Listen, then retell it in about 40 seconds: who, what, in what order."),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: e => { if (played) return; played = true; e.currentTarget.disabled = true; tbox.replaceChildren(h("p", { class: "muted" }, "Listening…")); speak(text, 1.0, () => inlineTimer(tbox, [{ label: "Retell now (40 s)", sec: 40 }], () => toast("Time. How much did you keep?"))); } }, "▶ Play once"),
        h("button", { class: "btn", type: "button", onclick: () => reveal.replaceChildren(h("div", { class: "feedback" }, h("span", { class: "zh" }, text))) }, "Show the passage"),
        h("button", { class: "btn", type: "button", onclick: () => { U.item = null; render(); } }, "Next →")), tbox, reveal,
      h("p", { class: "small muted" }, "Useful glue: 先…后来…结果… · 因为…所以…")));
  } else if (U.tab === "story") {
    U.item ??= Math.floor(Math.random() * D.story.length);
    const st = D.story[U.item], tbox = h("div");
    kids.push(h("div", { class: "box stack" }, h("div", { class: "panels" }, [0, 1, 2].map(i => h("div", { class: "panel", role: "img", "aria-label": "Picture " + (i + 1) }, h("b", null, String(i + 1)), st[i]))),
      h("details", null, h("summary", { class: "small" }, "What happens?"), h("p", { class: "small" }, st[3])),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => inlineTimer(tbox, [{ label: "Prepare (3 min)", sec: 180 }, { label: "Speak now (2 min)", sec: 120 }]) }, "⏱ Start 3 + 2 min"), h("button", { class: "btn", type: "button", onclick: () => { U.item = null; render(); } }, "Next story →")), tbox,
      h("div", { class: "row" }, ["先", "然后", "接着", "没想到", "最后", "结果"].map(w => h("span", { class: "chip zh" }, w)))));
  } else {
    U.item ??= Math.floor(Math.random() * D.questions.length);
    const qq = D.questions[U.item], tbox = h("div"), ta = h("textarea", { id: "outline", style: "min-height:80px", placeholder: "Outline 3–4 points (key words only)…" }), out = h("div");
    const sampleBtn = SAMPLE ? h("button", { class: "btn blue", type: "button", onclick: async e => { const b = e.currentTarget; b.disabled = true; out.replaceChildren(h("p", { class: "muted small" }, "Writing a model answer…")); try { const r = await askClaude(`Write a model spoken answer for the HSK 4 speaking question below. 120-160 characters, simplified Chinese, HSK 1-4 vocabulary, natural spoken style, structure 我觉得… 因为… 比如… 所以… . Question: ${qq}\nReply with ONLY JSON: {"answer": "...", "keywords": ["4-6 useful words from the answer"]}`); out.replaceChildren(h("div", { class: "feedback ok" }, h("p", { class: "zh" }, r.answer || ""), h("div", { class: "row", style: "margin-top:6px" }, (r.keywords || []).map(k => h("span", { class: "chip zh" }, k)), r.answer ? sayBtn(r.answer, "▶ Listen") : null))); } catch (err) { out.replaceChildren(h("div", { class: "feedback no" }, "Couldn't get a model answer just now.")); } b.disabled = false; } }, "Model answer") : null;
    kids.push(h("div", { class: "box stack" }, h("p", { class: "muted small" }, "Printed in characters only, no audio. Read it twice before you plan."), h("p", { class: "zh", style: "font-size:1.35rem;font-weight:700" }, qq),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => inlineTimer(tbox, [{ label: "Prepare (3.5 min)", sec: 210 }, { label: "Answer now (2 min)", sec: 120 }]) }, "⏱ Start 3.5 + 2 min"), sampleBtn, h("button", { class: "btn", type: "button", onclick: () => { U.item = null; render(); } }, "Next question →")), tbox, ta, out,
      h("div", { class: "row" }, ["我觉得", "因为", "比如", "另外", "所以", "总的来说"].map(w => h("span", { class: "chip zh" }, w)))));
  }
  kids.push(h("p", { class: "muted small" }, "This page can't record audio. Record your answers with your phone's voice recorder and play them back: you'll hear tone and hesitation problems at once."));
  return kids;
}

/* ===== Timer ===== */
const ringLen = 2 * Math.PI * 88;
function vTimer() {
  const st = T.steps[T.idx], r = T.running ? curRemain() : 0, kids = [header("Timer", "计时", "Focus blocks with timed rests. You'll get a sound and an on-page alert when each one ends.")];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 200 200"); svg.setAttribute("class", "dial"); svg.setAttribute("aria-hidden", "true");
  const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle"); Object.entries({ cx: 100, cy: 100, r: 88, fill: "var(--soft)", stroke: "var(--line)", "stroke-width": 10 }).forEach(([k, v]) => c1.setAttribute(k, v));
  const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle"); Object.entries({ id: "tRing", cx: 100, cy: 100, r: 88, fill: "none", stroke: st && st.kind === "rest" ? "var(--jade)" : "var(--pencil)", "stroke-width": 7, "stroke-dasharray": ringLen, "stroke-dashoffset": T.running ? ringLen * (r / T.dur) : ringLen, transform: "rotate(-90 100 100)", "stroke-linecap": "butt" }).forEach(([k, v]) => c2.setAttribute(k, v));
  svg.append(c1, c2);
  kids.push(h("div", { class: "grid g2" },
    h("div", { class: "box stack", style: "align-items:center" }, svg, h("div", { class: "timer-big", id: "tBig" }, T.running ? mmss(r) : "--:--"),
      h("b", null, st ? st.label : "Pick a session below"), st ? h("span", { class: "muted small" }, `${T.name} · step ${T.idx + 1} of ${T.steps.length}`) : null,
      h("div", { class: "row", style: "justify-content:center" },
        T.running ? h("button", { class: "btn primary", type: "button", onclick: pauseTimer }, T.paused ? "Resume" : "Pause") : st ? h("button", { class: "btn primary", type: "button", onclick: startStep }, "Start") : null,
        st ? h("button", { class: "btn", type: "button", onclick: skipStep }, "Skip") : null, st ? h("button", { class: "btn", type: "button", onclick: stopTimer }, "Stop") : null,
        st && st.go ? h("a", { class: "btn green", href: "#" + st.go }, "Go to section") : null)),
    h("div", { class: "box stack" }, h("h2", null, "Sessions"),
      h("div", { class: "grid g2", style: "gap:10px" },
        presetBtn("Guided daily", "6 blocks, rests between · ~2h40", () => startSeq("Guided daily session", SEQS.daily()), "primary"),
        presetBtn("Pomodoro", `${S.settings.focus}/${S.settings.rest} × 4, then ${S.settings.long}`, () => startSeq("Pomodoro", SEQS.pomodoro())),
        presetBtn("Busy day", "15 + 10 + 5 minutes", () => startSeq("Busy-day 30 minutes", SEQS.busy())),
        presetBtn("Full mock", "Written 85 min + speaking 20", () => startSeq("Mock exam", SEQS.mock()), "red")),
      h("h3", { style: "margin-top:8px" }, "Single sections at exam length"),
      h("div", { class: "row" }, [["Listening", 20], ["Reading", 30], ["Writing", 25], ["Speaking", 20], ["Rest", 5]].map(([n, m]) => h("button", { class: "btn sm", type: "button", onclick: () => startSeq(n, [{ label: n, kind: n === "Rest" ? "rest" : "focus", min: m }]) }, `${n} ${m}′`))))));
  if (T.steps.length) kids.push(h("div", { class: "box flat" }, h("h3", null, "Up next"), h("div", { class: "blocks", style: "margin-top:8px" }, T.steps.map((s, i) => h("div", { class: "block" + (s.kind === "rest" ? " rest" : "") + (i < T.idx ? " done" : "") }, h("span", { class: "num small" }, String(i + 1)), h("span", null, s.label), h("span", { class: "num small" }, `${s.min}′`))))));
  const s = S.settings;
  const numIn = (id, key, label) => h("label", { class: "stack", style: "gap:4px" }, label, h("input", { type: "number", id, min: 1, max: 90, value: s[key], onchange: e => { s[key] = Math.max(1, Math.min(90, Number(e.target.value) || s[key])); save("main"); render(); } }));
  const notifState = !("Notification" in window) ? "Not available in this view" : Notification.permission === "granted" && s.notify ? "On" : Notification.permission === "denied" ? "Blocked here" : "Off";
  kids.push(h("div", { class: "box stack" }, h("h2", null, "Alerts and lengths"),
    h("div", { class: "grid g3" }, numIn("setFocus", "focus", "Focus minutes"), numIn("setRest", "rest", "Rest minutes"), numIn("setLong", "long", "Long rest minutes")),
    h("div", { class: "row" },
      h("label", { class: "row", style: "gap:6px" }, h("input", { type: "checkbox", id: "setAuto", checked: s.autoNext, onchange: e => { s.autoNext = e.target.checked; save("main"); } }), "Start the next block automatically"),
      h("label", { class: "row", style: "gap:6px" }, h("input", { type: "checkbox", id: "setSound", checked: s.sound, onchange: e => { s.sound = e.target.checked; save("main"); } }), "Sound")),
    h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { unlockAudio(); chime("focus"); } }, "Test sound"), h("button", { class: "btn", type: "button", onclick: enableNotify }, "Turn on system notifications"), h("span", { class: "chip" }, "System notifications: " + notifState)),
    h("p", { class: "muted small" }, "Keep this tab open while a timer runs. When a block ends you'll hear a chime, see an alert at the top of the page, and the tab title will flash. The screen stays awake while a timer runs, where your device allows it.")));
  return kids;
}
function presetBtn(title, sub, fn, cls = "") { return h("button", { class: "btn " + cls, type: "button", style: "flex-direction:column;align-items:flex-start;min-height:64px", onclick: () => { fn(); render(); } }, h("span", null, title), h("small", { style: "font-weight:500" }, sub)); }

/* ===== Progress ===== */
function vProgress() {
  const kids = [header("Progress", "进度", "Your numbers, your mock scores and your backup.")];
  const cards = Object.entries(S.cards).filter(([w]) => L4.has(w)).map(([, c]) => c), mature = cards.filter(c => c[0] === "r" && c[2] >= 7).length, seen = cards.length;
  const totalRev = Object.values(S.log).reduce((a, l) => a + (l.rev || 0), 0), totalMin = Math.round(Object.values(S.log).reduce((a, l) => a + (l.sec || 0), 0) / 60);
  const tomorrow = cards.filter(c => c[1] <= dayStart(1) + DAY - 1).length;
  const t = today(), target = t <= START ? 0 : t >= NEW_END ? D.words.length : Math.round(D.words.length * (daysBetween(START, t) + 1) / (daysBetween(START, NEW_END) + 1));
  kids.push(h("div", { class: "grid g4" }, h("div", { class: "box" }, stat("Started", seen, `of ${D.words.length} words`)), h("div", { class: "box" }, stat("Solid", mature, "interval 7+ days")), h("div", { class: "box" }, stat("Reviews", totalRev, `${totalMin} study minutes`)), h("div", { class: "box" }, stat("Due by tomorrow", tomorrow, "cards"))));
  kids.push(h("div", { class: "box stack" }, h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, "On track?"), h("span", { class: "chip " + (seen >= target ? "g" : "y") }, seen >= target ? "Ahead of plan" : `${target - seen} words behind plan`)), wordsChart(),
    h("p", { class: "muted small" }, "Dashed line: the plan, all 990 words started by 3 Dec. Solid: words you've actually started.")));
  // grammar & reading summary
  const grDone = D.grammar.filter(g => { const s = S.grammar[g.id]; return s && s.b + s.c >= 4; }).length, rdDone = Object.keys(S.reading).length;
  const hard = hardWords();
  if (hard.length) kids.push(h("div", { class: "box stack" }, h("div", { class: "row", style: "justify-content:space-between" }, h("h2", null, `Hard words (${hard.length})`), h("button", { class: "btn primary", type: "button", onclick: () => { const now = Date.now(); hard.forEach(w => { const c = S.cards[w]; if (c && c[0] === "r") c[1] = now; }); save("srs"); UI.cards.deck = "l4"; UI.cards.cur = null; location.hash = "cards"; } }, "Drill them now")),
    h("p", { class: "muted small" }, "Words you've forgotten three or more times. Look for the family, a sentence or a picture that makes each one stick."),
    h("div", { class: "wordlist" }, hard.slice(0, 40).map(x => { const w = WORD.get(x); return h("div", { class: "word" }, h("div", { class: "row", style: "justify-content:space-between" }, h("b", null, x), sayBtn(x, "▶")), h("span", { class: "py", style: "font-size:0.95rem" }, w[1]), h("span", { class: "small" }, w[2]), h("span", { class: "chip r", style: "align-self:flex-start;margin-top:4px" }, `forgot ${S.cards[x][5]}×`)); }))));
  const hwDone = Object.values(S.hw || {}).filter(x => x.ok > x.miss).length;
  kids.push(h("div", { class: "grid g3" }, h("div", { class: "box" }, stat("HSK 1–3 check", `${D.base.length - baseLeft()}/${D.base.length}`, `${baseLearning()} sent to learning`)), h("div", { class: "box" }, stat("Handwriting", `${hwDone}/${D.hw.length}`, "characters written right")), h("div", { class: "box" }, stat("Tones", S.tones.n ? `${Math.round(S.tones.r / S.tones.n * 100)}%` : "–", `${S.tones.n} tone pairs heard`))));
  kids.push(h("div", { class: "grid g3" }, h("div", { class: "box" }, stat("Grammar units", `${grDone}/${D.grammar.length}`, "with 4+ drills right")), h("div", { class: "box" }, stat("Passages", `${rdDone}/${D.readings.length}`, "read and answered")), h("div", { class: "box" }, stat("Writing", S.writing.length, "sentences and essays saved"))));
  // mocks
  const mk = h("div", { class: "box stack" }, h("h2", null, "Mock exam scores"), h("p", { class: "muted small" }, "The new HSK 4 pass mark isn't published yet, so log the percentage you got right in each section and watch the weakest one."));
  const row = { d: today(), L: "", R: "", W: "", S: "" };
  const inp = (k, lab) => h("label", { class: "stack", style: "gap:4px" }, lab, h("input", { type: k === "d" ? "text" : "number", id: "mk" + k, min: 0, max: 100, value: row[k], placeholder: k === "d" ? "YYYY-MM-DD" : "%", oninput: e => { row[k] = e.target.value; } }));
  mk.append(h("div", { class: "grid g4", style: "grid-template-columns:repeat(auto-fit,minmax(110px,1fr))" }, inp("d", "Date"), inp("L", "Listening %"), inp("R", "Reading %"), inp("W", "Writing %"), inp("S", "Speaking %")),
    h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => { if (!/^\d{4}-\d{2}-\d{2}$/.test(row.d)) { toast("Use a date like 2026-11-15"); return; } S.mocks.push({ ...row }); S.mocks.sort((a, b) => a.d < b.d ? -1 : 1); save("main"); render(); } }, "Add score")));
  if (S.mocks.length) mk.append(h("div", { class: "scroll" }, h("table", { class: "t num" }, h("thead", null, h("tr", null, ["Date", "Listening", "Reading", "Writing", "Speaking", ""].map(x => h("th", null, x)))), h("tbody", null, S.mocks.map((m, i) => { const vals = [m.L, m.R, m.W, m.S].map(Number), low = Math.min(...vals.filter(v => !isNaN(v))); return h("tr", null, h("td", null, m.d), [m.L, m.R, m.W, m.S].map(v => h("td", { style: Number(v) === low ? "background:color-mix(in srgb, var(--seal) 30%, transparent);font-weight:700" : "" }, v === "" ? "–" : v + "%")), h("td", null, h("button", { class: "btn sm ghost", type: "button", onclick: () => { S.mocks.splice(i, 1); save("main"); render(); }, "aria-label": "Remove score" }, "✕"))); })))), h("p", { class: "muted small" }, "Red marks your weakest section in each mock. Give it the most time this week."));
  kids.push(mk);
  // settings + backup
  const s = S.settings;
  kids.push(h("div", { class: "box stack" }, h("h2", null, "Settings and backup"),
    h("div", { class: "grid g2" },
      h("label", { class: "stack", style: "gap:4px" }, "New words per day (0 = automatic)", h("input", { type: "number", id: "setNew", min: 0, max: 80, value: s.newPerDay, onchange: e => { s.newPerDay = Math.max(0, Math.min(80, Number(e.target.value) || 0)); save("main"); render(); } }), h("span", { class: "muted small" }, `Automatic today: ${(() => { const o = s.newPerDay; s.newPerDay = 0; const v = newQuota(); s.newPerDay = o; return v; })()} a day, spread to finish by 3 Dec.`)),
      h("label", { class: "stack", style: "gap:4px" }, `Speech speed for study: ${s.rate.toFixed(2)}×`, h("input", { type: "range", id: "setRate", min: 0.5, max: 1.2, step: 0.05, value: s.rate, oninput: e => { s.rate = Number(e.target.value); e.target.previousSibling.textContent = `Speech speed for study: ${s.rate.toFixed(2)}×`; }, onchange: () => save("main") }), h("button", { class: "btn sm", type: "button", style: "align-self:flex-start", onclick: () => speak("我们一起准备汉语水平考试吧。") }, "▶ Test voice"))),
    h("div", { class: "row" }, h("span", { id: "saveState2", class: Store.mode === "cloud" && !Store.error ? "chip g" : "chip" }, Store.mode === "cloud" ? "Progress is saved privately to your claude.ai account" : "Progress is saved in this browser only"),
      DOWNLOADS ? h("button", { class: "btn", type: "button", onclick: exportData }, "Export backup") : null,
      h("button", { class: "btn", type: "button", onclick: () => $("#importFile").click() }, "Import backup")),
    !UI.pr.reset ? h("button", { class: "btn sm ghost", type: "button", style: "align-self:flex-start", onclick: () => { UI.pr.reset = true; render(); } }, "Reset all progress…")
      : h("div", { class: "feedback no row" }, "This deletes every card, log and score.", h("button", { class: "btn sm red", type: "button", onclick: () => { const keep = S.settings; S = freshState(); S.settings = keep; save("srs"); save("main"); UI.pr.reset = false; render(); toast("Progress reset"); } }, "Delete everything"), h("button", { class: "btn sm", type: "button", onclick: () => { UI.pr.reset = false; render(); } }, "Cancel"))));
  return kids;
}
function wordsChart() {
  const W = 640, H = 200, L = 40, B = 26, R = 12, d0 = START, d1 = NEW_END, n = daysBetween(d0, d1);
  const X = k => L + (daysBetween(d0, k) / n) * (W - L - R), Y = v => H - B - (v / D.words.length) * (H - B - 12);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "bars"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Words started compared with the plan");
  const add = (tag, a, txt) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; svg.append(e); return e; };
  [0, 250, 500, 750, 990].forEach(v => { add("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--muted)", "stroke-width": 0.6, "stroke-dasharray": "2 4" }); add("text", { x: L - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)", "font-family": "var(--f-mono)" }, String(v)); });
  for (let i = 0; i <= n; i += 7) { const k = addDays(d0, i), p = parseKey(k); add("text", { x: X(k), y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", "font-family": "var(--f-mono)" }, `${p.getDate()} ${MONTHS[p.getMonth()]}`); }
  add("line", { x1: X(d0), y1: Y(0), x2: X(d1), y2: Y(D.words.length), stroke: "var(--ink)", "stroke-width": 1.5, "stroke-dasharray": "6 5" });
  const end = today() < d1 ? today() : d1; let cum = 0; const pts = [];
  // introduced before start counted on day 0
  const pre = Object.entries(S.log).filter(([k]) => k < d0).reduce((a, [, l]) => a + (l.nw || 0), 0); cum = pre;
  for (let i = 0; i <= Math.max(0, daysBetween(d0, end)); i++) { const k = addDays(d0, i); cum += (S.log[k] && S.log[k].nw) || 0; pts.push(`${X(k).toFixed(1)},${Y(Math.min(cum, D.words.length)).toFixed(1)}`); }
  if (pts.length) { add("polyline", { points: pts.join(" "), fill: "none", stroke: "var(--jade)", "stroke-width": 4, "stroke-linejoin": "round" }); const [lx, ly] = pts[pts.length - 1].split(","); add("circle", { cx: lx, cy: ly, r: 6, fill: "var(--pencil)", stroke: "var(--line)", "stroke-width": 2 }); }
  return svg;
}
async function exportData() {
  const data = JSON.stringify({ app: "hsk4-study-desk", v: 1, exported: new Date().toISOString(), srs: packSrs(), main: packMain() });
  try { await DOWNLOADS.save({ filename: `hsk4-progress-${today()}.json`, data }); toast("Backup saved"); }
  catch (e) { toast(e && e.code === "cancelled" ? "Backup not saved" : "The backup couldn't be saved here."); }
}
$("#importFile").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (o.app !== "hsk4-study-desk") throw new Error("not ours"); applySrs(o.srs); applyMain(o.main); save("srs"); save("main"); toast("Backup restored"); render(); }
  catch (err) { toast("That file isn't an HSK 4 Study Desk backup."); }
  e.target.value = "";
});

/* ---------- round 2: learning features ---------- */
function baseLeft() { return D.base.filter(b => !S.cards[b[0]] && !(S.extra || []).includes(b[0])).length; }
function baseLearning() { return D.base.filter(b => (S.cards[b[0]] && S.cards[b[0]][0] !== "r") || (S.extra || []).includes(b[0])).length; }
function hardWords() { return Object.entries(S.cards).filter(([, c]) => c[5] >= 3).sort((a, b) => b[1][5] - a[1][5]).map(([w]) => w); }
function seenIn(w) {
  const hits = D.corpus.filter(s => s.includes(w)).sort((a, b) => a.length - b.length).slice(0, 2);
  if (!hits.length) return null;
  return h("div", { class: "stack", style: "gap:4px;margin-top:6px;max-width:560px" }, h("span", { class: "eyebrow" }, "In a sentence"),
    hits.map(s => h("div", { class: "row", style: "justify-content:center;gap:8px" }, h("span", { class: "zh" }, s.split(w).flatMap((part, i, arr) => i < arr.length - 1 ? [part, h("b", { class: "zh" }, w)] : [part])), sayBtn(s, "▶"))));
}

/* HSK 1-3 foundation check: fast triage of the cumulative words */
function baseCheck() {
  const U = UI.cards;
  const left = D.base.filter(b => !S.cards[b[0]] && !(S.extra || []).includes(b[0]));
  const ordered = left.slice().sort((a, b) => b[4] - a[4]);
  const cur = U.baseCur && left.some(b => b[0] === U.baseCur) ? left.find(b => b[0] === U.baseCur) : ordered[0];
  U.baseCur = cur ? cur[0] : null;
  if (!cur) return [h("div", { class: "box jade cardstage" }, h("div", { class: "stack", style: "align-items:center" }, h("span", { class: "han md" }, "都检查了"), h("h2", null, "Every HSK 1–3 word is checked"), h("p", null, "Words you marked “Learn it” are now in your daily cards.")))];
  const known = () => { const cap = examCap(), ivl = Math.min(14, cap); S.cards[cur[0]] = ["r", dayStart(ivl), ivl, 2.5, 1, 0, 0]; U.baseShown = false; U.baseCur = null; save("srs"); render(); };
  const learn = () => { S.extra = [cur[0], ...(S.extra || []).filter(x => x !== cur[0])]; U.baseShown = false; U.baseCur = null; save("main"); render(); };
  return [
    h("p", { class: "muted small" }, `Level 3 words first, since those are most likely new if you sat the old HSK. ${left.length} left.`),
    h("div", { class: "box cardstage" }, h("div", { class: "stack", style: "align-items:center;gap:8px" },
      h("span", { class: "chip b" }, `HSK ${cur[4]} word`), h("span", { class: "han" }, cur[0]),
      U.baseShown ? h("div", { class: "stack", style: "align-items:center;gap:6px" }, h("div", { class: "row", style: "justify-content:center" }, h("span", { class: "py" }, cur[1]), sayBtn(cur[0], "▶")), h("span", { class: "gl" }, cur[2] || "")) : h("span", { class: "muted small" }, "Do you know its sound and meaning?"))),
    h("div", { class: "rate", style: "grid-template-columns:repeat(3,minmax(0,1fr))" },
      h("button", { class: "btn green", type: "button", onclick: known }, "I know it"),
      h("button", { class: "btn", type: "button", onclick: () => { U.baseShown = true; speak(cur[0]); render(); } }, "Show me"),
      h("button", { class: "btn red", type: "button", onclick: learn }, "Learn it")),
    h("p", { class: "muted small" }, "“I know it” schedules one check-up review before the exam. “Learn it” puts the word at the front of your new cards.")];
}

/* Confusable word drills */
function pairView(U) {
  const p = PAIRS.find(x => x.id === U.pair); const kids = [];
  kids.push(h("div", { class: "row" }, h("button", { class: "btn sm", type: "button", onclick: () => { U.pair = null; render(); } }, "← All units")));
  kids.push(h("div", { class: "box stack" }, h("h2", { class: "zh" }, p.words.join(" / ")), h("p", null, p.rule), h("div", { class: "row" }, p.words.map(w => h("span", { class: "row", style: "gap:4px" }, h("span", { class: "chip zh" }, w), WORD.get(w) ? h("span", { class: "py small" }, WORD.get(w)[1]) : null, sayBtn(w, "▶"))))));
  p.items.forEach(([sent, ans, why], qi) => {
    const fb = h("div");
    const grid = h("div", { class: "opts" }, p.words.map((w, i) => h("button", { class: "opt", type: "button", onclick: e => {
      grid.querySelectorAll(".opt").forEach(b => b.disabled = true);
      e.currentTarget.classList.add(i === ans ? "right" : "wrong"); if (i !== ans) grid.children[ans].classList.add("right");
      if (i === ans) { S.pairs[p.id] = (S.pairs[p.id] || 0) + 1; save("main"); }
      fb.replaceChildren(h("div", { class: "feedback " + (i === ans ? "ok" : "no") }, h("b", null, i === ans ? "Right. " : "Not this one. "), why, " ", h("span", { class: "zh" }, sent.replace("___", p.words[ans])), " ", sayBtn(sent.replace("___", p.words[ans]), "▶")));
    } }, w)));
    kids.push(h("div", { class: "box stack" }, h("h3", null, `Sentence ${qi + 1}`), h("p", { class: "zh", style: "font-size:1.3rem" }, sent), grid, fb));
  });
  const ta = h("textarea", { id: "pairOwn-" + p.id, style: "min-height:72px", placeholder: `Write one sentence with ${p.words[0]} and one with ${p.words[1]}…` });
  kids.push(h("div", { class: "box stack" }, h("h3", null, "Use both words yourself"), h("p", { class: "muted small" }, "Writing your own pair of sentences is the fastest way to stop mixing them up."), ta));
  return kids;
}

/* Reading Part 3: choose the missing sentence */
function gapFill(r) {
  const U = UI.rd; const sents = r.text.match(/[^。！？]+[。！？]/g) || [];
  if (sents.length < 4) return null;
  const g = (U.gap && U.gap.id === r.id) ? U.gap : (U.gap = (() => {
    const idx = 1 + Math.floor(Math.random() * (sents.length - 2));
    const others = D.readings.filter(x => x.id !== r.id).flatMap(x => x.text.match(/[^。！？]+[。！？]/g) || []).filter(s => hanCount(s) >= 6);
    const opts = shuffle([sents[idx], ...shuffle(others).slice(0, 2)]);
    return { id: r.id, idx, opts, ans: opts.indexOf(sents[idx]), chosen: null };
  })());
  const box = h("div", { class: "box stack" }, h("h3", null, "Reading Part 3 · Choose the missing sentence"),
    h("p", { class: "zh", style: "font-size:1.12rem;line-height:1.9" }, sents.map((s, i) => i === g.idx ? h("b", { style: "border-bottom:3px solid var(--line);padding:0 2.5em" }, "　") : s)));
  const fb = h("div");
  const grid = h("div", { class: "opts", style: "grid-template-columns:minmax(0,1fr)" }, g.opts.map((s, i) => h("button", { class: "opt" + (g.chosen != null ? (i === g.ans ? " right" : i === g.chosen ? " wrong" : "") : ""), type: "button", disabled: g.chosen != null, onclick: () => { g.chosen = i; S.gaps[r.id] = Math.max(S.gaps[r.id] || 0, i === g.ans ? 1 : 0); save("main"); render(); } }, s)));
  if (g.chosen != null) fb.append(h("div", { class: "feedback " + (g.chosen === g.ans ? "ok" : "no") }, g.chosen === g.ans ? "Right. Notice how it links to the sentences on either side." : "Not that one. Look at the words at the edges of the gap: names, 但是, 所以, 他 / 她 and time words have to connect.", " ", h("button", { class: "btn sm", type: "button", onclick: () => { U.gap = null; render(); } }, "Try another gap")));
  box.append(grid, fb); return box;
}

/* Handwriting: write the missing character from pinyin and meaning */
function handwriting() {
  const U = UI.wr; U.hwSet ||= "l4";
  const pool = D.hw.filter(x => U.hwSet === "all" || x[1] === 4);
  const score = x => { const s = S.hw[x[0]]; return s ? (s.ok > s.miss ? 3 : 1) : 0; };
  if (!U.hwCur || !pool.some(x => x[0] === U.hwCur)) { const min = Math.min(...pool.map(score)); U.hwCur = pick(pool.filter(x => score(x) === min))[0]; U.hwShown = false; }
  const [ch, lv, word, py, gl] = pool.find(x => x[0] === U.hwCur);
  const prompt = word.split("").map(c => c === ch ? "＿" : c).join("");
  const size = 280;
  const cv = h("canvas", { width: size * 2, height: size * 2, class: "pad", "aria-label": "Writing pad" });
  const ctx = cv.getContext("2d"); ctx.scale(2, 2); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 7;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#16181D";
  let drawing = false, last = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
  cv.addEventListener("pointerdown", e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener("pointermove", e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev => cv.addEventListener(ev, () => { drawing = false; }));
  const mark = ok => { const s = (S.hw[ch] ||= { ok: 0, miss: 0 }); ok ? s.ok++ : s.miss++; s.last = today(); save("main"); U.hwCur = null; render(); };
  const answer = h("div", { class: "stack", style: "align-items:flex-start;gap:6px", hidden: true }, h("span", { class: "eyebrow" }, "Answer: compare it with yours"), h("span", { class: "han" }, ch), h("div", { class: "row" }, h("button", { class: "btn green", type: "button", onclick: () => mark(true) }, "I wrote it right"), h("button", { class: "btn red", type: "button", onclick: () => mark(false) }, "I missed it")));
  const showBtn = h("button", { class: "btn primary", type: "button", onclick: () => { answer.hidden = false; showBtn.hidden = true; } }, "Show answer");
  const doneCount = Object.keys(S.hw).filter(k => pool.some(x => x[0] === k) && S.hw[k].ok > S.hw[k].miss).length;
  return [
    h("div", { class: "row" }, h("div", { class: "seg", role: "group", "aria-label": "Character set" }, [["l4", "Level 4 · 150"], ["all", "All by Level 4 · 400"]].map(([k, lab]) => h("button", { type: "button", "aria-pressed": String(U.hwSet === k), onclick: () => { U.hwSet = k; U.hwCur = null; render(); } }, lab))), h("span", { class: "chip g" }, `${doneCount}/${pool.length} written right`)),
    h("div", { class: "grid g2" },
      h("div", { class: "box stack" }, h("span", { class: "eyebrow" }, "Write the missing character"), h("span", { class: "han md" }, prompt), h("span", { class: "py" }, py), h("span", null, gl || ""), sayBtn(word, "▶ Hear the word"),
        answer,
        h("p", { class: "muted small" }, "Paper-based candidates write every answer by hand. Write it from memory, then check every stroke against the answer.")),
      h("div", { class: "box stack", style: "align-items:center" }, h("div", { class: "padwrap" }, cv),
        h("div", { class: "row", style: "justify-content:center" }, h("button", { class: "btn", type: "button", onclick: () => ctx.clearRect(0, 0, size, size) }, "Clear"), showBtn, h("button", { class: "btn", type: "button", onclick: () => { U.hwCur = null; render(); } }, "Skip →"))))];
}

/* Tone trainer: hear a two-syllable word, pick its tones */
const TONE = { "ā": 1, "á": 2, "ǎ": 3, "à": 4, "ē": 1, "é": 2, "ě": 3, "è": 4, "ī": 1, "í": 2, "ǐ": 3, "ì": 4, "ō": 1, "ó": 2, "ǒ": 3, "ò": 4, "ū": 1, "ú": 2, "ǔ": 3, "ù": 4, "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4 };
const TONE_WORDS = [...D.words, ...D.base.map(b => [b[0], b[1], b[2]])].filter(w => w[0].length === 2 && [...w[1]].filter(c => TONE[c]).length === 2);
function toneTrainer(U) {
  U.toneItem ||= (() => { const w = pick(TONE_WORDS); const t = [...w[1]].filter(c => TONE[c]).map(c => TONE[c]).join("–"); const all = []; for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4]) all.push(`${a}–${b}`); return { w, t, opts: shuffle([t, ...shuffle(all.filter(x => x !== t)).slice(0, 3)]), chosen: null, showZh: false }; })();
  const it = U.toneItem;
  setTimeout(() => { if (!it.played) { it.played = true; speak(it.w[0], 0.8); } }, 200);
  const fb = h("div");
  if (it.chosen != null) fb.append(h("div", { class: "feedback " + (it.opts[it.chosen] === it.t ? "ok" : "no") }, h("p", { class: "zh", style: "font-size:1.4rem" }, it.w[0], " ", h("span", { class: "py" }, it.w[1]), " ", h("span", { class: "chip" }, it.t)), h("p", { class: "small" }, (it.w[2] || "") + (it.t.startsWith("3–3") ? " · Note: two 3rd tones in a row are spoken as 2–3." : it.w[0][0] === "不" || it.w[0][0] === "一" ? " · 不 and 一 change tone before a 4th tone." : ""))));
  return [
    h("div", { class: "box stack" },
      h("p", null, "Listen and pick the tones. Tones are the first thing HSK 4 speaking examiners hear, and the easiest to fix with daily ear training."),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => speak(it.w[0], 0.8) }, "▶ Play"), h("button", { class: "btn", type: "button", onclick: () => speak(it.w[0], 1.0) }, "▶ Normal speed"), h("label", { class: "row small", style: "gap:6px" }, h("input", { type: "checkbox", id: "toneZh", checked: it.showZh, onchange: e => { it.showZh = e.target.checked; render(); } }), "Show the characters")),
      it.showZh ? h("span", { class: "han md" }, it.w[0]) : null,
      h("div", { class: "opts", style: "grid-template-columns:repeat(4,minmax(0,1fr))" }, it.opts.map((o, i) => h("button", { class: "opt" + (it.chosen != null ? (o === it.t ? " right" : i === it.chosen ? " wrong" : "") : ""), type: "button", disabled: it.chosen != null, style: "text-align:center;font-family:var(--f-mono);font-weight:700", onclick: () => { it.chosen = i; S.tones.n++; if (o === it.t) S.tones.r++; save("main"); render(); } }, o))),
      fb,
      h("div", { class: "row" }, h("button", { class: "btn", type: "button", onclick: () => { U.toneItem = null; render(); } }, "Next word →"), h("span", { class: "muted small" }, S.tones.n ? `${S.tones.r} of ${S.tones.n} right so far` : "")),
      h("p", { class: "muted small" }, "1 = high and level · 2 = rising · 3 = low, dipping · 4 = falling. After each answer, say the word aloud three times, copying the voice."))];
}

/* ---------- boot ---------- */
route();
setSaveState();
initStore();
