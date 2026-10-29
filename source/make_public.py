"""Turn the claude.ai study desk into a public, on-device static site."""
import re, sys, json, os
APP, SITE = sys.argv[1], sys.argv[2]
js = open(f"{APP}/app.js", encoding="utf-8").read()
shell = open(f"{APP}/shell.html", encoding="utf-8").read()
data = open(f"{APP}/app_data.json", encoding="utf-8").read()

def rep(old, new, count=1):
    global js
    assert old in js, "MISSING: " + old[:70]
    js = js.replace(old, new, count)

# --- plan dates become per-user settings ---
rep('const EXAM = "2026-12-13", NEW_END = "2026-12-03", PH1 = "2026-11-02", PH2 = "2026-11-16", PH3 = "2026-12-04", START = "2026-10-29";\nconst MOCKS = ["2026-11-15", "2026-11-29", "2026-12-06"];',
    'let EXAM, NEW_END, PH1, PH2, PH3, START, MOCKS;\nconst DEFAULT_EXAM = "2026-12-13";')
rep('settings: { newPerDay: 0,', 'settings: { exam: DEFAULT_EXAM, start: "", noticeSeen: false, newPerDay: 0,')
rep('applySrs(lsGet(LS.srs)); applyMain(lsGet(LS.main));',
    '''applySrs(lsGet(LS.srs)); applyMain(lsGet(LS.main));
function computePlan() {
  const s = S.settings;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s.exam || "")) s.exam = DEFAULT_EXAM;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s.start || "")) s.start = today();
  EXAM = s.exam; START = s.start < EXAM ? s.start : addDays(EXAM, -30);
  NEW_END = addDays(EXAM, -10); PH3 = addDays(EXAM, -9);
  PH1 = addDays(START, 4) < NEW_END ? addDays(START, 4) : START;
  PH2 = addDays(PH1, Math.max(1, Math.floor(daysBetween(PH1, NEW_END) / 2) - 1));
  MOCKS = [-28, -14, -7].map(d => addDays(EXAM, d)).filter(k => k >= START);
  const b = document.getElementById("brandSub"); if (b) b.textContent = "Exam " + nice(EXAM);
}
computePlan();''')
rep('text: "Results: computer-based written 28 Dec, paper-based 15 Jan.", color: "sky" }',
    'text: "Computer-based results usually arrive about 15 days after the exam, paper-based about a month after.", color: "sky" }')

# --- storage: on-device only ---
start = js.index("async function initStore() {"); end = js.index("let SAMPLE = null, DOWNLOADS = null;")
js = js[:start] + '''async function persistStorage() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { /* optional */ }
  setSaveState();
}

''' + js[end:]
start = js.index("let SAMPLE = null, DOWNLOADS = null;"); end = js.index("/* ---------- daily log & activity ---------- */")
js = js[:start] + "let SAMPLE = null; // Claude checks need a server; this public site has none.\n\n" + js[end:]
rep('el.className = "chip"; el.textContent = "Saved in this browser only";', 'el.className = "chip g"; el.textContent = "Saved on this device only";')
rep('initStore();', 'persistStorage();\ninitNotice();')

# --- CSP-safe inline styles ---
rep('else if (k === "style") el.setAttribute("style", v);', 'else if (k === "style") el.style.cssText = v;')

# --- dynamic dates in copy ---
rep('h("span", { class: "muted small" }, "Sun 13 Dec, 9:00")', 'h("span", { class: "muted small" }, nice(EXAM) + ", 9:00")')
rep('"Intervals are capped so every word comes back at least twice before 13 December."', '`Intervals are capped so every word comes back at least twice before ${nice(EXAM)}.`')
rep('"Dashed line: the plan, all 990 words started by 3 Dec. Solid: words you\'ve actually started."', '`Dashed line: the plan, all ${D.words.length} words started by ${nice(NEW_END)}. Solid: words you\'ve actually started.`')
rep('} a day, spread to finish by 3 Dec.`', '} a day, spread to finish by ${nice(NEW_END)}.`')
rep('!SAMPLE ? h("p", { class: "muted small" }, "Claude checks appear when this page runs in claude.ai with checks allowed.") : null);',
    'h("p", { class: "muted small" }, "Check it yourself: did you use the pattern exactly, put time and place words before the verb, and end with 。? Then read it aloud."));')
rep('rel: "noopener" }', 'rel: "noopener noreferrer" }')

# --- progress: storage line, export, exam date, delete everything ---
rep('''h("span", { id: "saveState2", class: Store.mode === "cloud" && !Store.error ? "chip g" : "chip" }, Store.mode === "cloud" ? "Progress is saved privately to your claude.ai account" : "Progress is saved in this browser only"),
      DOWNLOADS ? h("button", { class: "btn", type: "button", onclick: exportData }, "Export backup") : null,''',
    '''h("span", { id: "saveState2", class: "chip g" }, "Your progress never leaves this device"),
      h("button", { class: "btn", type: "button", onclick: exportData }, "Export backup"),''')
rep('''h("label", { class: "stack", style: "gap:4px" }, "New words per day (0 = automatic)",''',
    '''h("label", { class: "stack", style: "gap:4px" }, "Your HSK 4 exam date", h("input", { type: "date", id: "setExam", value: s.exam, onchange: e => { if (/^\\d{4}-\\d{2}-\\d{2}$/.test(e.target.value)) { s.exam = e.target.value; computePlan(); save("main"); render(); toast("Plan updated for " + nice(EXAM)); } } }), h("span", { class: "muted small" }, "The phases, mock days and daily word target follow this date.")),
      h("label", { class: "stack", style: "gap:4px" }, "New words per day (0 = automatic)",''')
rep('''h("button", { class: "btn sm red", type: "button", onclick: () => { const keep = S.settings; S = freshState(); S.settings = keep; save("srs"); save("main"); UI.pr.reset = false; render(); toast("Progress reset"); } }, "Delete everything")''',
    '''h("button", { class: "btn sm red", type: "button", onclick: () => { wipeDevice(); UI.pr.reset = false; render(); toast("Everything on this device was deleted"); } }, "Delete everything")''')
rep('"This deletes every card, log and score."', '"This deletes every card, log, score and setting stored by this site on this device."')
rep('"Reset all progress…"', '"Delete all my data on this device…"')

# --- export without platform downloads; import validation ---
start = js.index("async function exportData() {"); end = js.index('$("#importFile").addEventListener')
js = js[:start] + '''function exportData() {
  const data = JSON.stringify({ app: "hsk4-study-desk", v: 1, exported: new Date().toISOString(), srs: packSrs(), main: packMain() });
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = h("a", { href: url, download: `hsk4-progress-${today()}.json` }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast("Backup downloaded");
}
function wipeDevice() {
  try { Object.keys(localStorage).filter(k => k.startsWith("hsk4desk.")).forEach(k => localStorage.removeItem(k)); } catch (e) { /* none */ }
  try { sessionStorage.clear(); } catch (e) { /* none */ }
  S = freshState(); computePlan(); stopTimer();
}
function cleanImport(o) {
  const okCard = c => Array.isArray(c) && c.length === 7 && ["n", "l", "r"].includes(c[0]) && c.slice(1).every(x => typeof x === "number" && isFinite(x));
  const cards = {};
  for (const [w, c] of Object.entries((o.srs && o.srs.cards) || {})) if (WORD.has(w) && okCard(c)) cards[w] = c;
  const m = o.main || {}, out = { updated: Date.now() };
  const isObj = x => x && typeof x === "object" && !Array.isArray(x);
  out.log = {}; if (isObj(m.log)) for (const [k, l] of Object.entries(m.log)) if (/^\\d{4}-\\d{2}-\\d{2}$/.test(k) && isObj(l)) out.log[k] = { sec: +l.sec || 0, rev: +l.rev || 0, nw: +l.nw || 0, blocks: isObj(l.blocks) ? Object.fromEntries(Object.entries(l.blocks).filter(([b]) => ROUTINE.some(r => r[0] === b)).map(([b, v]) => [b, !!v])) : {} };
  out.grammar = {}; if (isObj(m.grammar)) for (const [k, g] of Object.entries(m.grammar)) if (GR.has(k) && isObj(g)) out.grammar[k] = { b: +g.b || 0, c: +g.c || 0, n: +g.n || 0 };
  out.reading = {}; if (isObj(m.reading)) for (const [k, r] of Object.entries(m.reading)) if (D.readings.some(x => x.id === k) && isObj(r)) out.reading[k] = { score: +r.score || 0, last: String(r.last || "").slice(0, 10), speed: +r.speed || null };
  out.writing = Array.isArray(m.writing) ? m.writing.slice(-80).filter(isObj).map(x => ({ d: String(x.d || "").slice(0, 10), p: String(x.p || "").slice(0, 200), t: String(x.t || "").slice(0, 2000), r: null })) : [];
  out.mocks = Array.isArray(m.mocks) ? m.mocks.slice(0, 50).filter(isObj).map(x => ({ d: String(x.d || "").slice(0, 10), L: String(x.L ?? "").slice(0, 3), R: String(x.R ?? "").slice(0, 3), W: String(x.W ?? "").slice(0, 3), S: String(x.S ?? "").slice(0, 3) })) : [];
  out.extra = Array.isArray(m.extra) ? m.extra.filter(w => WORD.has(w)).slice(0, 1200) : [];
  out.hw = {}; if (isObj(m.hw)) for (const [k, v] of Object.entries(m.hw)) if (D.hw.some(x => x[0] === k) && isObj(v)) out.hw[k] = { ok: +v.ok || 0, miss: +v.miss || 0, last: String(v.last || "").slice(0, 10) };
  out.pairs = {}; if (isObj(m.pairs)) for (const [k, v] of Object.entries(m.pairs)) if (/^p\\d+$/.test(k)) out.pairs[k] = +v || 0;
  out.tones = isObj(m.tones) ? { r: +m.tones.r || 0, n: +m.tones.n || 0 } : { r: 0, n: 0 };
  out.gaps = {}; if (isObj(m.gaps)) for (const [k, v] of Object.entries(m.gaps)) if (D.readings.some(x => x.id === k)) out.gaps[k] = +v ? 1 : 0;
  const st = isObj(m.settings) ? m.settings : {}, base = freshState().settings;
  out.settings = { ...base };
  for (const k of Object.keys(base)) if (k in st && typeof st[k] === typeof base[k]) out.settings[k] = st[k];
  return { srs: { cards, updated: Date.now() }, main: out };
}
''' + js[end:]
rep('''try { const o = JSON.parse(await f.text()); if (o.app !== "hsk4-study-desk") throw new Error("not ours"); applySrs(o.srs); applyMain(o.main); save("srs"); save("main"); toast("Backup restored"); render(); }''',
    '''try { if (f.size > 2e6) throw new Error("too big"); const o = JSON.parse(await f.text()); if (!o || o.app !== "hsk4-study-desk") throw new Error("not ours"); const c = cleanImport(o); applySrs(c.srs); applyMain(c.main); computePlan(); save("srs"); save("main"); toast("Backup restored"); render(); }''')

# --- first-visit storage notice (NDPA / GAID Art. 19 transparency) ---
js = js.replace("/* ---------- boot ---------- */", '''/* ---------- storage notice ---------- */
function initNotice() {
  const n = document.getElementById("notice"); if (!n) return;
  n.hidden = !!S.settings.noticeSeen;
  document.getElementById("noticeOk").addEventListener("click", () => { S.settings.noticeSeen = true; save("main"); n.hidden = true; });
}

/* ---------- boot ---------- */''')
assert "window.claude" not in js.replace("window.claude?.hot", "")
open(f"{SITE}/app.js", "w", encoding="utf-8").write(js)

# --- stylesheet ---
css = re.search(r"<style>(.*?)</style>", shell, re.S).group(1)
css = css.replace('--f-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;', '--f-display: "Bricolage Desk", "Segoe UI", system-ui, sans-serif;')
css = css.replace('--f-body: "Bricolage Grotesque", "Noto Sans SC", system-ui, sans-serif;', '--f-body: "Bricolage Desk", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;')
css = css.replace('--f-zh: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;', '--f-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", sans-serif;')
css = css.replace('--f-han: "Noto Serif SC", "Songti SC", "STSong", serif;', '--f-han: "Songti SC", "STSong", "Noto Serif CJK SC", "Noto Serif SC", "Source Han Serif SC", "SimSun", serif;')
css = css.replace('--f-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;', '--f-mono: "JetBrains Desk", ui-monospace, Menlo, Consolas, monospace;')
fontface = '''@font-face { font-family: "Bricolage Desk"; src: url("/fonts/bricolage.woff") format("woff"); font-weight: 500 800; font-display: swap; }
@font-face { font-family: "JetBrains Desk"; src: url("/fonts/jetbrains-mono.woff") format("woff"); font-weight: 100 800; font-display: swap; }
'''
extra = '''
.banner-text { gap: 2px; flex: 1; }
html, body { height: auto; }
body { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
.site-foot { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.8rem; }
.site-foot a { color: var(--muted); }
.notice { position: sticky; top: 0; z-index: 60; background: var(--ink); color: var(--paper); border-bottom: var(--bw) solid var(--line); padding: 12px max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px)); padding-top: calc(12px + env(safe-area-inset-top, 0px)); display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; }
.notice p { flex: 1 1 320px; min-width: 0; font-size: 0.92rem; }
.notice a { color: var(--pencil); font-weight: 700; }
.notice .btn { background: var(--pencil); color: var(--on-accent); }
.doc { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; padding-block: 24px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.doc h2 { margin-top: 10px; }
.doc p, .doc li { max-width: 68ch; }
.doc ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 4px; }
.doc .box p + p { margin-top: 8px; }
.doc a { color: inherit; }
'''
open(f"{SITE}/styles.css", "w", encoding="utf-8").write(fontface + css + extra)

# --- index.html ---
body = shell[shell.index('<div class="app">'):shell.index('<script type="application/json"')]
body = body.replace('<span>Words: 2025 HSK syllabus. Lessons and passages written for this desk.</span>',
  '<span>Words: 2025 HSK syllabus. Lessons and passages written for this desk.</span>\n      <nav class="site-foot" aria-label="Site"><a href="/privacy.html">Privacy</a><a href="/about.html">About &amp; credits</a></nav>')
notice = '''<div class="notice" id="notice" role="region" aria-label="How this site stores your progress" hidden>
  <p><b>No account, no cookies, no tracking.</b> Your study progress is stored only in this browser on this device, so the desk can remember your cards. Nothing is sent to us. <a href="/privacy.html">Read the privacy notice</a>.</p>
  <button class="btn sm" id="noticeOk" type="button">Got it</button>
</div>
'''
safe_data = data.replace("</", "<\\/")
body = body.replace('<div class="stack" style="gap:2px;flex:1">', '<div class="stack banner-text">')
html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>HSK 4 Study Desk</title>
<meta name="description" content="A free daily study desk for the new HSK 4 (HSK 3.0): flashcards grouped by shared characters, grammar drills, graded reading, writing and speaking practice, and study timers. Works on your device, no account.">
<meta name="theme-color" content="#FFD23F">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/styles.css">
<script src="/app.js" defer></script>
</head>
<body>
{notice}{body}<script type="application/json" id="appdata">{safe_data}</script>
<noscript><p class="doc">The study desk needs JavaScript. Your progress stays on your device.</p></noscript>
</body>
</html>
'''
open(f"{SITE}/index.html", "w", encoding="utf-8").write(html)
print("ok", len(js), len(html))
