alert("app.js laddad ✅");

// --- Local config ---
const LS_CFG = "flashcards_cfg_v1";
const LS_PROGRESS = "flashcards_progress_v1";

const el = (id) => document.getElementById(id);

let decks = [];
let cards = [];
let order = [];
let idx = 0;

function loadCfg() {
  const cfg = JSON.parse(localStorage.getItem(LS_CFG) || "{}");
  el("apiUrl").value = cfg.apiUrl || "";
  el("apiKey").value = cfg.apiKey || "";
  return cfg;
}

function saveCfg() {
  const cfg = {
    apiUrl: el("apiUrl").value.trim(),
    apiKey: el("apiKey").value.trim(),
  };
  localStorage.setItem(LS_CFG, JSON.stringify(cfg));
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
    el("answerWrap").style.display = "none";
    setStatusTags(null);
    return;
  }
  const card = cards[order[idx]];
  el("question").textContent = card.question;
  el("answer").textContent = card.answer;
  el("answerWrap").style.display = "none";
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
  const js = await apiGet(cfg, { path: "decks" });
  decks = js.decks || [];

  const deckSel = el("deckSelect");
  deckSel.innerHTML = decks.map(d => `<option value="${escapeHtml(d.deckId)}">${escapeHtml(d.title)}</option>`).join("");

  deckSel.onchange = () => populateSheets();
  populateSheets();
}

function populateSheets() {
  const deckId = el("deckSelect").value;
  const deck = decks.find(d => d.deckId === deckId);
  const sheetSel = el("sheetSelect");
  const sheets = (deck && deck.sheets) ? deck.sheets : [];
  sheetSel.innerHTML = sheets.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
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
  sc.style.display = (sc.style.display === "none") ? "block" : "none";
}

function init() {
  // Buttons
  el("saveCfgBtn").onclick = async () => {
    saveCfg();
    try {
      await loadDecksAndSheets();
      el("question").textContent = "Konfig sparad. Välj ämne och Ladda.";
    } catch (e) {
      el("question").textContent = `Fel: ${e.message}`;
    }
    const sc = document.getElementById("settingsCard");
    if (sc) sc.style.display = "none";
  };

  el("reloadBtn").onclick = async () => {
    try { await loadCards(); } catch (e) { el("question").textContent = `Fel: ${e.message}`; }
  };

  el("showBtn").onclick = () => {
    if (!cards.length) return;
    el("answerWrap").style.display = (el("answerWrap").style.display === "none") ? "block" : "none";
  };

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

  // Try initial load
  loadDecksAndSheets().catch(() => {
    el("question").textContent = "Fyll i API URL + nyckel och tryck Spara.";
  });


}



try {
  init();
} catch (e) {
  alert("Init-krasch: " + (e.message || e));
}