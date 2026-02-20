alert("app.js laddad ✅");

// --- Local config ---
const LS_CFG = "flashcards_cfg_v1";
const LS_PROGRESS = "flashcards_progress_v1";

const el = (id) => document.getElementById(id);

let decks = [];
let cards = [];
let order = [];
let idx = 0;
// App states
const STATE_CONFIG = "CONFIG";
const STATE_SELECTION = "SELECTION";
const STATE_FLASHCARDS = "FLASHCARDS";
let currentState = STATE_CONFIG;

function render() {
  const modal = el('configModal');
  const selection = el('selectionSection');
  const flash = el('flashcardsSection');
  if (modal) modal.classList.toggle('hidden', currentState !== STATE_CONFIG);
  if (selection) selection.classList.toggle('hidden', currentState !== STATE_SELECTION);
  if (flash) flash.classList.toggle('hidden', currentState !== STATE_FLASHCARDS);
  // header visibility: show header for selection and flashcards, hide for config
  const hdr = document.querySelector('header');
  if (hdr) hdr.classList.toggle('hidden', currentState === STATE_CONFIG);
}

function loadCfg() {
  const cfg = JSON.parse(localStorage.getItem(LS_CFG) || "{}");
  const apiUrl = cfg.apiUrl || "";
  const apiKey = cfg.apiKey || "";
  if (el("apiUrl")) el("apiUrl").value = apiUrl;
  if (el("apiKey")) el("apiKey").value = apiKey;
  if (el("modalApiUrl")) el("modalApiUrl").value = apiUrl;
  if (el("modalApiKey")) el("modalApiKey").value = apiKey;
  return cfg;
}

function saveCfg() {
  // Prefer modal inputs if present (modal is primary config entry)
  const urlEl = el('modalApiUrl') || el('apiUrl');
  const keyEl = el('modalApiKey') || el('apiKey');
  const cfg = {
    apiUrl: (urlEl && urlEl.value) ? urlEl.value.trim() : "",
    apiKey: (keyEl && keyEl.value) ? keyEl.value.trim() : "",
  };
  localStorage.setItem(LS_CFG, JSON.stringify(cfg));
  // Mirror into both forms
  if (el('apiUrl')) el('apiUrl').value = cfg.apiUrl;
  if (el('apiKey')) el('apiKey').value = cfg.apiKey;
  if (el('modalApiUrl')) el('modalApiUrl').value = cfg.apiUrl;
  if (el('modalApiKey')) el('modalApiKey').value = cfg.apiKey;
  return cfg;
}

function apiBase(cfg) {
  if (!cfg.apiUrl || !cfg.apiKey) throw new Error("Sätt API URL och nyckel först.");
  const u = new URL(cfg.apiUrl);
  u.searchParams.set("key", cfg.apiKey);
  return u;
}

async function apiGet(cfg, params) {
  const u = apiBase(cfg);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString(), { method: "GET" });
  const js = await res.json();
  if (!js.ok) throw new Error(js.error || "API error");
  return js;
}

function setStatusTags(card) {
  el("pos").textContent = cards.length ? `${idx + 1} / ${cards.length}` : "";
  const t = (card && card.tags) ? card.tags.split(",").map(s => s.trim()).filter(Boolean) : [];
  el("tags").innerHTML = t.map(x => `<span class="pill">${escapeHtml(x)}</span>`).join("");
}

function showCard() {
  if (!cards.length) {
    el("question").textContent = "Inga kort hittades.";
    el("answerWrap").classList.add('hidden');
    setStatusTags(null);
    return;
  }
  const card = cards[order[idx]];
  el("question").textContent = card.question;
  el("answer").textContent = card.answer;
  el("answerWrap").classList.add('hidden');
  // Ensure show button label resets
  const sb = el("showBtn"); if (sb) sb.textContent = "Visa svar";
  setStatusTags(card);
}

function next() {
  if (!cards.length) return;
  idx = (idx + 1) % cards.length;
  showCard();
}

function prev() {
  if (!cards.length) return;
  idx = (idx - 1 + cards.length) % cards.length;
  showCard();
}

function shuffleOrder() {
  order = Array.from({ length: cards.length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  idx = 0;
  showCard();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

// Simple local progress (per deck+sheet+card id)
function progressKey(deckId, sheet) {
  return `${deckId}::${sheet}`;
}

function loadProgress() {
  return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}");
}

function saveProgress(p) {
  localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
}

function gradeCurrent(grade) {
  if (!cards.length) return;
  const deckId = el("deckSelect").value;
  const sheet = el("sheetSelect").value;
  const card = cards[order[idx]];
  const p = loadProgress();
  const k = progressKey(deckId, sheet);
  p[k] = p[k] || {};
  p[k][card.id] = { grade, ts: Date.now() };
  saveProgress(p);
  next();
}

// --- UI wiring ---
async function loadDecksAndSheets() {
  const cfg = loadCfg();
  if (!cfg.apiUrl || !cfg.apiKey) throw new Error('Sätt API URL och nyckel först.');
  const js = await apiGet(cfg, { path: "decks" });
  decks = js.decks || [];

  const deckSel = el("deckSelect");
  if (!deckSel) throw new Error('Element deckSelect saknas i DOM');
  if (decks.length === 0) {
    deckSel.innerHTML = `<option value="">Inga ämnen</option>`;
  } else {
    deckSel.innerHTML = decks.map(d => `<option value="${escapeHtml(d.deckId)}">${escapeHtml(d.title)}</option>`).join("");
    // select first deck by default
    deckSel.selectedIndex = 0;
  }

  deckSel.onchange = () => populateSheets();
  populateSheets();
}

function populateSheets() {
  const sheetSel = el("sheetSelect");
  const deckSel = el("deckSelect");
  if (!sheetSel || !deckSel) return;
  const deckId = deckSel.value || "";
  const deck = decks.find(d => d.deckId === deckId);
  const sheets = (deck && deck.sheets) ? deck.sheets : [];
  if (sheets.length === 0) {
    sheetSel.innerHTML = `<option value="">Inga områden</option>`;
  } else {
    sheetSel.innerHTML = sheets.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    sheetSel.selectedIndex = 0;
  }
}

async function loadCards() {
  const cfg = loadCfg();
  const deckId = el("deckSelect").value;
  const sheet = el("sheetSelect").value;

  const js = await apiGet(cfg, { path: "cards", deckId, sheet, activeOnly: "true" });
  cards = js.cards || [];
  order = Array.from({ length: cards.length }, (_, i) => i);
  idx = 0;
  showCard();
}

function toggleSettings() {
  const sc = document.getElementById("settingsCard");
  if (!sc) return;
  sc.classList.toggle("hidden");
}

function setUIForSettings(onlySettings) {
  const hdr = document.querySelector('header');
  const mainCards = Array.from(document.querySelectorAll('main > .card'));
  const settingsCard = document.getElementById('settingsCard');
  if (onlySettings) {
    if (hdr) hdr.classList.add('hidden');
    mainCards.forEach(c => { if (c !== settingsCard) c.classList.add('hidden'); });
    if (settingsCard) settingsCard.classList.remove('hidden');
  } else {
    if (hdr) hdr.classList.remove('hidden');
    mainCards.forEach(c => { if (c !== settingsCard) c.classList.remove('hidden'); });
    if (settingsCard) settingsCard.classList.add('hidden');
  }
}

function setUIForSelector(onlySelector) {
  const hdr = document.querySelector('header');
  const mainCards = Array.from(document.querySelectorAll('main > .card'));
  const selectorCard = document.getElementById('selectorCard');
  mainCards.forEach(c => {
    if (c === selectorCard) return;
    if (onlySelector) c.classList.add('hidden'); else c.classList.remove('hidden');
  });
  if (selectorCard) {
    if (onlySelector) selectorCard.classList.remove('hidden'); else selectorCard.classList.add('hidden');
  }
  if (hdr) {
    if (onlySelector) hdr.classList.add('hidden'); else hdr.classList.remove('hidden');
  }
}

function init() {
  // Buttons
  el("saveCfgBtn").onclick = async () => {
    try {
      saveCfg();
      await loadDecksAndSheets();
      el("question").textContent = "Konfig sparad. Välj ämne och Ladda.";
      // Show focused selector view (only deck/sheet + Ladda)
      setUIForSelector(true);
    } catch (e) {
      el("question").textContent = `Fel: ${e.message || e}`;
    }
  };

  el("reloadBtn").onclick = async () => {
    try { await loadCards(); } catch (e) { el("question").textContent = `Fel: ${e.message}`; }
  };

  el("showBtn").onclick = () => {
    if (!cards.length) return;
    const aw = el('answerWrap');
    const btn = el('showBtn');
    if (aw.classList.contains('hidden')) {
      aw.classList.remove('hidden');
      if (btn) btn.textContent = 'Dölj svar';
    } else {
      aw.classList.add('hidden');
      if (btn) btn.textContent = 'Visa svar';
    }
  };

  // Load-only button in selector view
  const loadOnly = el("loadOnlyBtn");
  if (loadOnly) {
    loadOnly.onclick = async () => {
      try {
        await loadCards();
        // Transition to flashcards on success
        currentState = STATE_FLASHCARDS; render();
      } catch (e) {
        el("question").textContent = `Fel: ${e.message || e}`;
      }
    };
  }

  // Back to selection button (in flashcards view)
  const backBtn = el('backToSelectionBtn');
  if (backBtn) backBtn.onclick = () => { currentState = STATE_SELECTION; render(); };

  // Modal save button
  const modalSave = el('modalSaveBtn');
  if (modalSave) {
    modalSave.onclick = async () => {
      try {
        const cfg = saveCfg();
        await loadDecksAndSheets();
        currentState = STATE_SELECTION; render();
      } catch (e) {
        // show error in modal by using question area
        el('question').textContent = `Fel: ${e.message || e}`;
      }
    };
  }

  el("nextBtn").onclick = next;
  el("prevBtn").onclick = prev;
  el("shuffleBtn").onclick = () => (cards.length ? shuffleOrder() : null);

  el("settingsToggleBtn").onclick = toggleSettings;

  document.querySelectorAll(".gradeBtn").forEach(btn => {
    btn.onclick = () => gradeCurrent(btn.dataset.grade);
  });

  // Service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Initial behaviour: show config modal if missing, otherwise selection
  const cfg = loadCfg();
  if (!cfg.apiUrl || !cfg.apiKey) {
    el('question').textContent = 'Fyll i API URL + nyckel och tryck Spara.';
    currentState = STATE_CONFIG; render();
    const mUrl = el('modalApiUrl'); if (mUrl) mUrl.focus();
  } else {
    try {
      await loadDecksAndSheets();
    } catch (e) {
      el('question').textContent = `Fel: ${e.message || e}`;
    }
    currentState = STATE_SELECTION; render();
  }
}

try {
  init();
} catch (e) {
  alert("Init-krasch: " + (e.message || e));
}