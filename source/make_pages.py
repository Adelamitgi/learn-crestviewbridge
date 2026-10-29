"""Privacy notice, about/credits, 404 and security/config files for the public site.
Fill the three values in site.config.json, then re-run this script."""
import json, sys, os, html
SITE, CONF = sys.argv[1], sys.argv[2]
c = json.load(open(CONF, encoding="utf-8"))
NAME, EMAIL, DOMAIN = c["operator_name"], c["contact_email"], c["domain"]
UPDATED = c.get("updated", "29 October 2026")
e = html.escape

def page(title, body, desc):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#FFD23F">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<main class="doc">
<p><a class="btn sm" href="/">← Back to the study desk</a></p>
{body}
<p class="muted small">Last updated {e(UPDATED)}.</p>
</main>
</body>
</html>
'''

privacy = f"""<h1>Privacy notice</h1>
<div class="box yellow"><p><b>In short:</b> HSK 4 Study Desk has no accounts, no cookies, no analytics and no ads. Your study progress is kept only in your own browser. We never receive it, so we cannot see, sell or share it. This notice applies to everyone, wherever you live.</p></div>

<h2>Who runs this site</h2>
<p>HSK 4 Study Desk is a free study tool run by {e(NAME)} (“we”). For anything about privacy, email <b>{e(EMAIL)}</b>. We are the controller (in some laws, the “data fiduciary” or “personal information handler”) only for the limited technical data described under “What our hosting provider processes”.</p>

<h2>What is stored on your device</h2>
<p>To remember your flashcards and plan, the site saves the following in your browser’s local storage on the device you use. It stays there and is not sent to us or anyone else.</p>
<ul>
<li>Flashcard progress: which words you have started and when each is due again.</li>
<li>Daily study log: minutes studied, reviews done, routine blocks ticked.</li>
<li>Drill and reading scores, mock exam scores you enter, and sentences or essays you choose to save.</li>
<li>Settings: your exam date, timer lengths, sound and speech speed, and whether you have seen this notice.</li>
<li>Essay drafts in progress, kept in session storage and cleared when you close the tab.</li>
</ul>
<p><b>Why, and why there is no consent banner:</b> this storage is strictly necessary to provide the study features you ask for. Storage of that kind is exempt from cookie consent under the EU and UK ePrivacy rules and under Nigeria’s GAID 2025, and similar rules elsewhere. There are no advertising, analytics or tracking cookies, and no similar tracking technologies.</p>
<p><b>How long:</b> until you delete it. Use <b>Progress → Delete all my data on this device</b>, or clear this site’s data in your browser settings. Data on one device never syncs to another. Use <b>Export backup</b> to move it yourself.</p>

<h2>What our hosting provider processes</h2>
<p>The site is delivered by Cloudflare, Inc. Like any website host, Cloudflare must receive basic technical data to send you the pages and protect the site from attacks: your IP address, browser type, the page requested and the time. We have not turned on visitor analytics or request logging, and we do not receive this data. Cloudflare processes it as our service provider for delivery and security only, and keeps it only as its own policies allow.</p>
<ul>
<li><b>Lawful basis:</b> our legitimate interest in delivering a working, secure website (for example GDPR and UK GDPR Article 6(1)(f), and section 25 of the Nigeria Data Protection Act 2023).</li>
<li><b>International transfers:</b> Cloudflare’s network is global, so this technical data may be handled outside your country. Cloudflare protects such transfers under its data processing terms, which include standard contractual clauses. See <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener noreferrer" target="_blank">Cloudflare’s privacy policy</a>.</li>
<li><b>No selling or sharing:</b> we do not sell or share personal information for advertising, as those terms are used in California and other US state laws, and we make no automated decisions about you.</li>
</ul>

<h2>Features that use your browser</h2>
<ul>
<li><b>Listen buttons</b> use your browser’s built-in speech feature. Some browsers use their maker’s online voices, in which case the Chinese text being read is handled by that browser maker, not by us.</li>
<li><b>System notifications</b> are only shown if you allow them. Timers run on your device.</li>
<li><b>Links</b> to other sites, such as Mandarin Zone, open in a new tab and are covered by those sites’ own privacy notices.</li>
</ul>

<h2>Children</h2>
<p>Learners of any age can use the desk. It collects no personal data from anyone, so it does not collect data from children either, and no parental consent is needed to use it.</p>

<h2>Your rights</h2>
<p>Depending on where you live, laws such as the EU and UK GDPR, the Nigeria Data Protection Act, China’s Personal Information Protection Law, Brazil’s LGPD, India’s DPDP Act, South Africa’s POPIA, Kenya’s Data Protection Act, Canada’s PIPEDA and US state privacy laws give you rights to know about, access, correct, delete and port your personal data, to restrict or object to processing, and to withdraw consent.</p>
<ul>
<li>For data on your device, you control it directly: export it with <b>Export backup</b> and erase it with <b>Delete all my data on this device</b>.</li>
<li>For hosting data, or any question, email {e(EMAIL)}. We will reply without undue delay and within 30 days, and help you reach Cloudflare where only they hold the data. We will never treat you differently for using your rights.</li>
<li>You can also complain to the data protection authority where you live, for example the <a href="https://ndpc.gov.ng" rel="noopener noreferrer" target="_blank">Nigeria Data Protection Commission</a>, your <a href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en" rel="noopener noreferrer" target="_blank">EU supervisory authority</a> or the UK <a href="https://ico.org.uk" rel="noopener noreferrer" target="_blank">ICO</a>.</li>
</ul>

<h2>Security</h2>
<p>The site is served only over HTTPS, loads no third-party scripts, fonts or trackers, and sends strict security headers (a content security policy, HSTS and anti-framing protection). If a personal data breach affecting you ever occurred, we would notify the relevant authorities within the deadlines the law sets, which is 72 hours in the EU, UK and Nigeria, and tell you without undue delay where it posed a high risk to you.</p>

<h2>Changes</h2>
<p>If we add any feature that collects personal data, such as accounts, sync or AI feedback, we will update this notice first and ask for your consent where the law requires it.</p>
"""

about = f'''<h1>About &amp; credits</h1>
<p>HSK 4 Study Desk is a free daily study tool for the new HSK 4 exam (HSK 3.0). It groups the Level 4 words by shared characters, schedules reviews with spaced repetition, and adds grammar drills, graded reading, writing and speaking practice, and study timers. Everything runs on your device.</p>
<div class="box"><p><b>Not official.</b> This site is not affiliated with Chinese Testing International (CTI), the Center for Language Education and Cooperation (CLEC) or Mandarin Zone. Confirm exam dates, format and registration at <a href="https://www.chinesetest.cn" rel="noopener noreferrer" target="_blank">chinesetest.cn</a>.</p></div>

<h2>Sources and licences</h2>
<ul>
<li><b>Word and character levels:</b> from the HSK Examination Syllabus published by CLEC in November 2025, as extracted in <a href="https://github.com/harukicoder/hsk30" rel="noopener noreferrer" target="_blank">harukicoder/hsk30</a> (MIT licence).</li>
<li><b>English glosses:</b> adapted from <a href="https://www.mdbg.net/chinese/dictionary?page=cedict" rel="noopener noreferrer" target="_blank">CC-CEDICT</a>, via <a href="https://github.com/drkameleon/complete-hsk-vocabulary" rel="noopener noreferrer" target="_blank">complete-hsk-vocabulary</a> (MIT licence). CC-CEDICT is licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener noreferrer" target="_blank">CC BY-SA 4.0</a>; the shortened glosses on this site are shared under the same licence.</li>
<li><b>Grammar units, example sentences, reading passages, writing and speaking prompts:</b> written for this site, following the Level 4 grammar points of the new syllabus.</li>
<li><b>Fonts:</b> Bricolage Grotesque and JetBrains Mono, under the <a href="/fonts/OFL-bricolage.txt">SIL Open Font License</a>, served from this site. Chinese text uses the fonts already on your device.</li>
</ul>

<h2>Terms of use</h2>
<ul>
<li>The desk is free and provided as is, for personal study. We can’t promise it is error-free or that it will always be available.</li>
<li>Practice content is not official exam material, and no score here predicts your HSK result.</li>
<li>Don’t try to break, overload or misuse the site.</li>
</ul>

<h2>Contact</h2>
<p>Questions, corrections or security reports: <b>{e(EMAIL)}</b>. See also our <a href="/privacy.html">privacy notice</a>.</p>
'''

notfound = '''<h1>Page not found</h1>
<p>That page doesn’t exist. Your study progress is safe on your device.</p>
<p><a class="btn primary" href="/">Open the study desk</a></p>
'''

open(f"{SITE}/privacy.html", "w", encoding="utf-8").write(page("Privacy · HSK 4 Study Desk", privacy, "How HSK 4 Study Desk handles data worldwide: no accounts, no cookies, no tracking; progress stays on your device."))
open(f"{SITE}/about.html", "w", encoding="utf-8").write(page("About · HSK 4 Study Desk", about, "Sources, licences and terms for HSK 4 Study Desk."))
open(f"{SITE}/404.html", "w", encoding="utf-8").write(page("Not found · HSK 4 Study Desk", notfound, "Page not found."))

CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; "
       "connect-src 'self'; manifest-src 'self'; media-src 'self'; worker-src 'none'; object-src 'none'; "
       "base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests")
headers = f'''# Security headers for every response (Cloudflare Workers static assets / Pages)
/*
  Content-Security-Policy: {CSP}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Permitted-Cross-Domain-Policies: none

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
/
  Cache-Control: public, max-age=0, must-revalidate
/app.js
  Cache-Control: public, max-age=0, must-revalidate
/styles.css
  Cache-Control: public, max-age=0, must-revalidate
'''
open(f"{SITE}/_headers", "w", encoding="utf-8").write(headers)
os.makedirs(f"{SITE}/.well-known", exist_ok=True)
open(f"{SITE}/.well-known/security.txt", "w", encoding="utf-8").write(
    f"Contact: mailto:{EMAIL}\nExpires: 2027-10-29T00:00:00.000Z\nPreferred-Languages: en, zh\nCanonical: https://{DOMAIN}/.well-known/security.txt\nPolicy: https://{DOMAIN}/about.html\n")
open(f"{SITE}/robots.txt", "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\n")
open(f"{SITE}/favicon.svg", "w", encoding="utf-8").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="8" fill="#FFD23F" stroke="#16181D" stroke-width="5"/><path d="M18 22h28M32 14v36M20 46l12-14 12 14" fill="none" stroke="#16181D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>')
open(f"{SITE}/site.webmanifest", "w", encoding="utf-8").write(json.dumps({
    "name": "HSK 4 Study Desk", "short_name": "HSK 4 Desk", "start_url": "/", "display": "standalone",
    "background_color": "#F6F7F2", "theme_color": "#FFD23F", "icons": [{"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))
print("pages ok")
