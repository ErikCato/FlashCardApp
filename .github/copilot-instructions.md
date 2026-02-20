# Copilot Instructions for FlashCardApp

## Architecture Overview

**FlashCardApp** is a Progressive Web App (PWA) for studying flashcards via a remote API (Google Apps Script-based). It's a **vanilla JavaScript** project with no frameworks—keep it lightweight and local-storage-first.

### Core Data Flow
1. **Config Layer** (`localStorage`): API URL + read-only key → persisted with `LS_CFG` version key
2. **API Layer** (`app.js`): `apiBase()` → `apiGet()` fetches decks, sheets, and cards from remote API
3. **State** (global variables): `decks[]`, `cards[]`, `order[]`, `idx` track current selection
4. **Storage** (`localStorage`): Progress per deck+sheet (`LS_PROGRESS`) with grade/timestamp pairs
5. **UI** (`index.html` + `app.js`): Swedish-language cards, toggle answer visibility, shuffle & grade cards
6. **Offline** (`sw.js`): Service worker caches assets on install, then cache-first + network fallback

### Key Files & Their Boundaries
- **app.js**: All logic except styling; no bundling or compilation
- **index.html**: DOM structure, inline error handlers, **loads `apps.js?v=4`** (⚠️ typo: should be `app.js`)
- **sw.js**: Caches `["./", "./index.html", "./app.js", "./manifest.json"]` on install; caches same-origin GET responses
- **manifest.json**: PWA metadata (standalone display, dark theme colors)

## Critical Conventions & Patterns

### LocalStorage Versioning
Keys use `v1` suffix for easy schema evolution:
```javascript
const LS_CFG = "flashcards_cfg_v1";        // {apiUrl, apiKey}
const LS_PROGRESS = "flashcards_progress_v1"; // {deckId::sheet -> {cardId -> {grade, ts}}}
```
If schema changes → increment version, migrate old data on load, or accept data loss.

### API Communication Pattern
All API calls go through `apiGet(cfg, params)`:
```javascript
const js = await apiGet(cfg, { path: "decks" });
const js = await apiGet(cfg, { path: "cards", deckId, sheet, activeOnly: "true" });
```
API response format: `{ ok: boolean, error?: string, decks?: [], cards?: [], ... }`
**Critical**: API key is appended to URL querystring; never expose in logs/errors.

### Progress Tracking Model
```javascript
progressKey(deckId, sheet) -> "deckId::sheet"
p[key][card.id] = { grade: "easy"|"maybe"|"hard", ts: timestamp }
```
Grades are local-only; no backend sync yet. Progress loads on card flip, saves on gradeBtn click.

### DOM Access & Safety
- Shorthand: `el(id)` returns `document.getElementById(id)`
- **XSS protection**: Use `escapeHtml()` for all user/API content (tags, deck titles, card text)
- Toggle example: `answerWrap.style.display = (display === "none") ? "block" : "none"`

### Error Handling (Debug-Friendly)
- User-facing: Set `el("question").textContent = "Error message"` 
- JavaScript errors: Global handlers in HTML trigger `alert()` to show errors on mobile
- API errors: Check `!js.ok` and throw with `js.error || "API error"`

### Swedish Localization
UI text is Swedish. Common terms:
- "Fråga" = question, "Svar" = answer
- "Ladda" = load, "Spara" = save, "Osäker" = uncertain
- Do not translate API response text (user data).

## Developer Workflows

### Testing on Mobile
1. Deploy (netlify) or serve locally: `python3 -m http.server 8000`
2. Open dev console via Safari Web Inspector or Chrome DevTools (Android)
3. Check `localStorage` for config/progress: `JSON.parse(localStorage.getItem("flashcards_cfg_v1"))`
4. Monitor network: API calls in Application > Network tab

### Adding a Feature
1. **UI**: Add button/input to HTML with unique `id`, then wire event in `init()` 
2. **State**: Add to global variables if needed; prefer per-deck/sheet scope via `el()` lookups
3. **Persistence**: If new data → add new localStorage key with `v1` suffix, handle migrations
4. **Offline**: Update `sw.js` ASSETS array if new files must be cached on install

### Debugging Service Worker
```javascript
// In console:
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
// Then reload
```

## Known Issues & TODOs

1. **Critical Bug**: `index.html` loads `apps.js?v=4` but file is `app.js` → fix script src or rename file
2. **Service Worker Cache**: Only assets in ASSETS array are cached on install; API responses cached dynamically but no expiry logic
3. **Progress Sync**: Grades are stored locally; no backend sync (intentional? or add `POST /progress` later?)
4. **Missing Icons**: manifest.json references `icon-192.png` and `icon-512.png` (not in repo)

## Project-Specific Rules

- **No dependencies**: Keep vanilla JS; no npm packages. Rationale: lightweight PWA, fast initial load
- **Single-file logic**: app.js is the only JS file loaded at runtime (except sw.js)
- **Config-first UX**: API URL/key must be set before loading decks; fail gracefully with user message
- **Grade → Next**: Grading always calls `next()` to prevent re-grading the same card
- **Shuffle is Fisher-Yates**: Uses standard algorithm; `order[]` tracks shuffled indices while `idx` tracks position
