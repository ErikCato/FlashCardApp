# Copilot Instructions — FlashCardApp

This file gives concise, actionable guidance for AI coding agents working on this small PWA.

**Quick summary**
- Purpose: vanilla JS PWA for studying flashcards backed by a Google-Apps-Script API.
- Runtime: no build tooling; serve over HTTP (static files). Primary JS is in [app.js](app.js).

**What matters (architecture & flow)**
- `app.js`: single-file app logic — API helpers, state (`decks[]`, `cards[]`, `order[]`, `idx`), UI wiring.
- API calls use `apiGet(cfg, params)` and expect `{ok:boolean, ...}` responses; `apiKey` is appended to querystring — do not log it.
- Progress stored locally under keys like `flashcards_progress_v1`; progress key format is `deckId::sheet` and values are `{ cardId: {grade, ts} }`.
- `sw.js`: service worker implements install-time caching for ASSETS and a cache-first + network-fallback strategy for same-origin GETs.

**Key files**
- [app.js](app.js): API layer and UI logic (escapeHtml(), `el(id)`, `apiGet`, shuffle/`order[]`, grading flow).
- [index.html](index.html): DOM structure and the entry script (note: there is a historical typo where `apps.js?v=4` may be referenced — ensure it loads `app.js`).
- [sw.js](sw.js): offline caching; update ASSETS here when adding files.
- [manifest.json](manifest.json): PWA metadata (icons may be missing).

**Project-specific conventions & patterns**
- No package manager or bundler — keep changes compatible with plain ES and browsers.
- LocalStorage versioning: use `..._v1` suffix when adding new keys (e.g., `flashcards_cfg_v1`).
- Always sanitize API/user content using `escapeHtml()` before injecting into DOM.
- Grading flow: a grade action saves to localStorage then immediately calls `next()`.

**Developer workflows & useful commands**
- Serve locally: `python3 -m http.server 8000` from repo root.
- Clear service worker & caches (DevTools console):
	- `navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()));`
	- `caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k))));`
- Inspect stored config/progress: `JSON.parse(localStorage.getItem("flashcards_cfg_v1"))` and `JSON.parse(localStorage.getItem("flashcards_progress_v1"))`.

**Integration points & cautions**
- Remote API: implemented in [app.js](app.js) — `apiBase()` + `apiGet()` compose calls; treat API key as sensitive.
- Offline behaviour: `sw.js` caches static assets and dynamic GET responses without expiry — modifying caching requires editing [sw.js](sw.js).

**Common small TODOs you may encounter**
- Fix script reference in [index.html](index.html) if it points to `apps.js?v=4`.
- Add missing icons referenced in [manifest.json](manifest.json).

If any section is unclear or you'd like explicit examples (specific functions or lines), tell me which area to expand.
