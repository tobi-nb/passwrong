// app.js — read-only datasource loader (JSON -> TXT fallback)

async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function loadServices() {
  // 1) Versuch: services.json
  try {
    const txt = await fetchText("services.json");
    const data = JSON.parse(txt);
    if (!Array.isArray(data)) throw new Error("services.json must be an array");
    return data.map(normalizeItem);
  } catch (eJson) {
    // 2) Fallback: services.txt (optional)
    try {
      const txt = await fetchText("services.txt");
      return parseTxt(txt).map(normalizeItem);
    } catch (eTxt) {
      console.error("Konnte weder services.json noch services.txt laden:", eJson, eTxt);
      return [];
    }
  }
}

function parseTxt(txt) {
  return txt
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(line => {
      const [name="", url="", icon="", color=""] = line.split("|").map(s => s.trim());
      return { name, url, icon, color };
    })
    .filter(item => item.name && item.url);
}

function normalizeItem(item) {
  return {
    name: String(item.name || "").trim(),
    url: String(item.url || "").trim(),
    icon: String(item.icon || "").trim(),
    color: String(item.color || "").trim()
  };
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "name";
  const iconSpan = document.createElement("span");
  iconSpan.textContent = item.icon || "🔗";
  const nameSpan = document.createElement("span");
  nameSpan.textContent = item.name;
  title.append(iconSpan, nameSpan);

  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `Öffnen`;
  if (item.color) {
    link.style.background = item.color;
  }

  card.append(title, link);
  return card;
}

async function render() {
  const container = document.getElementById("services");
  container.innerHTML = ""; // sicherheitshalber

  const items = await loadServices();

  if (!items.length) {
    const msg = document.createElement("div");
    msg.className = "muted";
    msg.textContent = "Keine Dienste gefunden. Lege services.json oder services.txt im Projekt-Root an.";
    container.appendChild(msg);
    return;
  }

  for (const item of items) {
    container.appendChild(createCard(item));
  }
}

// WICHTIG: Keine Edit-Funktionen, keine Speicherzugriffe.
document.addEventListener("DOMContentLoaded", render);
