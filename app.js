// app.js — reine JSON-Quelle, Read-only, mit Suche & Kategorien

let ALL_ITEMS = [];
let ACTIVE_CATEGORY = "ALL";
let QUERY = "";

const UNCATEGORIZED = "Ohne Kategorie";

async function loadServices() {
  const res = await fetch("services.json", { cache: "no-store" });
  if (!res.ok) throw new Error("services.json konnte nicht geladen werden");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("services.json muss ein Array enthalten");
  return data.map(normalize);
}

function normalize(item) {
  return {
    name: String(item.name || "").trim(),
    url: String(item.url || "").trim(),
    icon: String(item.icon || "🔗").trim(),
    color: String(item.color || "").trim(),
    minLength: isFinite(item.minLength) ? Number(item.minLength) : null,
    maxLength: isFinite(item.maxLength) ? Number(item.maxLength) : null, // null = keine
    allowedSpecials: (item.allowedSpecials ?? "").toString(),
    otherRequirements: (item.otherRequirements ?? "").toString(),
    twoFactor: Boolean(item.twoFactor),   // ✅ Boolean
    passkey: Boolean(item.passkey),       // ✅ Boolean
    category: (item.category ?? "").toString().trim()
  };
}

function buildChips(categories) {
  const chips = document.getElementById("chips");
  chips.innerHTML = "";
  const makeChip = (label, value) => {
    const span = document.createElement("button");
    span.type = "button";
    span.className = "chip" + (ACTIVE_CATEGORY === value ? " active" : "");
    span.textContent = label;
    span.addEventListener("click", () => {
      ACTIVE_CATEGORY = value;
      render();
    });
    return span;
  };

  chips.appendChild(makeChip("Alle", "ALL"));
  for (const c of categories) chips.appendChild(makeChip(c, c));
  if (categories.includes(UNCATEGORIZED)) return;
}

function filterItems() {
  const q = QUERY.toLowerCase();
  return ALL_ITEMS.filter(it => {
    const matchName = !q || it.name.toLowerCase().includes(q);
    const matchCat = ACTIVE_CATEGORY === "ALL"
      ? true
      : (it.category ? it.category === ACTIVE_CATEGORY : ACTIVE_CATEGORY === UNCATEGORIZED);
    return matchName && matchCat;
  });
}

function groupByCategory(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.category || UNCATEGORIZED;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  // sort categories alphabetisch, UNCATEGORIZED ans Ende
  const keys = [...map.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, "de", { sensitivity: "base" });
  });
  return keys.map(k => [k, map.get(k).sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))]);
}

function boolBadge(label, val) {
  const span = document.createElement("span");
  span.className = "badge " + (val ? "ok" : "no");
  span.textContent = `${label}: ${val ? "Ja" : "Nein"}`;
  return span;
}

function createCard(it) {
  const card = document.createElement("div");
  card.className = "card" + (typeof it.maxLength === "number" ? " red" : "");

  const title = document.createElement("div");
  title.className = "name";
  title.innerHTML = `${it.icon} <span>${it.name}</span>`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    Mindestlänge: <b>${it.minLength ?? "-"}</b><br>
    Maximallänge: <b>${it.maxLength ?? "keine"}</b><br>
    Erlaubte Sonderzeichen: <b>${it.allowedSpecials || "beliebig"}</b><br>
    Sonstiges: <b>${it.otherRequirements || "-"}</b>
  `;

  const badges = document.createElement("div");
  badges.className = "badges";
  badges.appendChild(boolBadge("2FA", it.twoFactor));
  badges.appendChild(boolBadge("Passkey", it.passkey));

  const link = document.createElement("a");
  link.className = "btn";
  link.href = it.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Zur Website";
  if (it.color) link.style.background = it.color;

  card.append(title, meta, badges, link);
  return card;
}

function render() {
  const container = document.getElementById("list");
  container.innerHTML = "";

  const items = filterItems();
  if (!items.length) {
    container.innerHTML = `<p class="meta">Keine Treffer.</p>`;
    return;
  }

  const groups = groupByCategory(items);
  for (const [cat, arr] of groups) {
    const section = document.createElement("section");
    section.className = "section";
    const h2 = document.createElement("h2");
    h2.textContent = cat;
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const it of arr) grid.appendChild(createCard(it));
    section.append(h2, grid);
    container.appendChild(section);
  }
}

async function init() {
  try {
    ALL_ITEMS = await loadServices();

    // Kategorien sammeln:
    const categories = Array.from(new Set(ALL_ITEMS.map(i => i.category || UNCATEGORIZED)));
    buildChips(categories);

    // Suche:
    const qInput = document.getElementById("q");
    qInput.addEventListener("input", (e) => {
      QUERY = e.target.value.trim();
      render();
    });

    render();
  } catch (e) {
    console.error(e);
    const container = document.getElementById("list");
    container.textContent = "Fehler beim Laden von services.json.";
  }
}

document.addEventListener("DOMContentLoaded", init);
