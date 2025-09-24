// app.js — reine JSON-Datenquelle, keine Edit-Funktionen

async function loadServices() {
  const res = await fetch("services.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`services.json konnte nicht geladen werden`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("services.json muss ein Array enthalten");
  return data;
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  if (item.maxLength && item.maxLength !== null) card.classList.add("red");

  const title = document.createElement("div");
  title.className = "name";
  title.innerHTML = `${item.icon || "🔗"} <span>${item.name}</span>`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    Mindestlänge: <b>${item.minLength ?? "-"}</b><br>
    Maximallänge: <b>${item.maxLength ?? "keine"}</b><br>
    Erlaubte Sonderzeichen: <b>${item.allowedSpecials || "beliebig"}</b><br>
    Sonstiges: <b>${item.otherRequirements || "-"}</b>
  `;

  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Zur Website";
  if (item.color) link.style.background = item.color;

  card.append(title, meta, link);
  return card;
}

async function render() {
  const container = document.getElementById("services");
  container.innerHTML = "";
  try {
    const items = await loadServices();
    if (!items.length) {
      container.textContent = "Keine Einträge in services.json gefunden.";
      return;
    }
    for (const item of items) container.appendChild(createCard(item));
  } catch (err) {
    console.error(err);
    container.textContent = "Fehler beim Laden von services.json.";
  }
}

document.addEventListener("DOMContentLoaded", render);
