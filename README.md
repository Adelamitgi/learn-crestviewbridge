# HSK 4 Study Desk

Free daily study desk for the new HSK 4 (HSK 3.0), at https://learn.crestviewbridge.net.

- `public/`: the live site. Cloudflare Workers Builds deploys it from the `main` branch using `wrangler.jsonc`.
- `source/`: everything it's built from. Run `python3 build.py` after any change.
- `CLAUDE.md`: how to work on the project, including the privacy and security rules.

Cloudflare settings: Worker `learn-crestviewbridge`, build command empty, deploy command `npx wrangler deploy`, custom domain `learn.crestviewbridge.net` (Settings → Domains & Routes).
