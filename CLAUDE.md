# HSK 4 Study Desk (learn.crestviewbridge.net)

A free HSK 4 (HSK 3.0) study site run by Crestview Bridge. Static files only: Cloudflare Workers Builds runs `npx wrangler deploy` on every push to `main`, serving `./public` as configured in `wrangler.jsonc`. No Python runs on Cloudflare, so **always run `python3 build.py` and commit `public/` with your change.**

## How to make a change

1. Edit files in `source/` (never edit `public/` by hand; it is overwritten by the build).
2. Run `python3 build.py`. It must print `Built ./public …` with no `ISSUE` lines about above-level characters, or fix them first.
3. Check the site locally: `python3 -m http.server 8000 --directory public`, then open http://localhost:8000.
4. Commit `source/` and `public/` together and push to `main`. Cloudflare deploys in about a minute.

## Where things live

| What | File |
| --- | --- |
| App logic and UI | `source/app.js` (shared with the private claude.ai version; claude.ai-only code is stripped by `make_public.py`) |
| Layout, styles, nav | `source/shell.html` |
| Grammar units and drills | `source/content_grammar.py` |
| Reading passages and questions | `source/content_reading.py` |
| Picture prompts, essays, speaking | `source/content_output.py` |
| Confusable word pairs | `source/content_pairs.py` |
| Privacy notice, about/credits, 404, security headers | `source/make_pages.py` |
| Contact email, operator, domain | `source/site.config.json` |
| Offline cache (service worker), manifest | `source/package_root.py` |
| Word lists | `source/data/` (2025 HSK syllabus via harukicoder/hsk30, MIT; glosses CC-CEDICT, CC BY-SA 4.0) |

## Rules for this project

- **Content level:** example sentences and passages should use only characters up to HSK Level 4. `build_data.py` prints `ISSUE` lines for anything above that.
- **Privacy (worldwide):** the site must collect no personal data. No accounts, cookies, analytics, ads, trackers or third-party scripts, fonts or images. Progress stays in the browser (`localStorage`). If a feature would change this, stop and ask first; the privacy notice and legal position depend on it.
- **Security:** keep the strict Content Security Policy in `make_pages.py` (`script-src 'self'`, no inline scripts or inline `style=` attributes in HTML; set styles through `el.style` in JS). Don't load anything from another domain.
- **China access:** nothing may depend on Google or other services blocked in mainland China.
- **Updates reach students** through the service worker. The cache version changes automatically when files change.
