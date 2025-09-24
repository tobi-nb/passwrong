// --- State + Storage ---
const STORAGE_KEY = "passwordServices.v1";
let services = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    services = raw ? JSON.parse(raw) : sampleData();
  } catch {
    services = sampleData();
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

// --- Helpers ---
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function sampleData() {
  return [
    { id: uid(), name: "Google", min: 10, max: 20, notes: "Empfohlen: 2FA aktivieren" },
    { id: uid(), name: "GitHub", min: 8, max: null, notes: "Lange Passphrasen möglich" },
    { id: uid(), name: "Netflix", min: 6, max: 60, notes: "" }
  ];
}
function sanitizeInt(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// --- Rendering ---
let currentSort = { key: "name", dir: "asc" };
function render() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  const q = document.getElementById("search").value.trim().toLowerCase();
  let rows = services.filter(s =>
    s.name.toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q)
  );

  rows.sort((a, b) => {
    const { key, dir } = currentSort;
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    const r = (typeof av === "string" ? av.localeCompare(bv) : (av ?? 0) - (bv ?? 0));
    return dir === "asc" ? r : -r;
  });

  for (const s of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge">${escapeHtml(s.name)}</span></td>
      <td>${s.min ?? "—"}</td>
      <td>${s.max ?? "—"}</td>
      <td>${s.notes ? escapeHtml(s.notes) : "<span class='muted'>—</span>"}</td>
      <td>
        <button data-act="edit" data-id="${s.id}">Bearbeiten</button>
        <button data-act="del" class="danger" data-id="${s.id}">Löschen</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById("empty").classList.toggle("hidden", rows.length !== 0);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}

// --- Form Handling ---
document.addEventListener("DOMContentLoaded", () => {
  load();
  render();

  const form = document.getElementById("service-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const min = sanitizeInt(document.getElementById("min").value);
    const max = sanitizeInt(document.getElementById("max").value);
    const notes = document.getElementById("notes").value.trim();

    // Validierungen
    if (!name) return alert("Bitte Dienstnamen angeben.");
    if (min == null || min < 1) return alert("Bitte eine gültige Mindestlänge angeben.");
    if (max != null && max < min) return alert("Maximale Länge darf nicht kleiner als Mindestlänge sein.");

    services.push({ id: uid(), name, min, max, notes });
    save(); render();
    form.reset();
    document.getElementById("name").focus();
  });

  document.getElementById("reset-form").addEventListener("click", () => form.reset());
  document.getElementById("search").addEventListener("input", render);

  // Sortierung
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
      } else {
        currentSort = { key, dir: "asc" };
      }
      render();
    });
  });

  // Aktionen (Edit/Delete)
  document.getElementById("tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) return;

    if (act === "del") {
      if (confirm("Diesen Eintrag wirklich löschen?")) {
        services.splice(idx, 1);
        save(); render();
      }
    } else if (act === "edit") {
      openEditDialog(services[idx]);
    }
  });

  // Export
  document.getElementById("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(services, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "passwort-anforderungen.json" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // Import
  document.getElementById("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Ungültiges Format");
      // naive Validierung
      services = data.map(x => ({
        id: x.id || uid(),
        name: String(x.name || "").trim(),
        min: sanitizeInt(x.min),
        max: sanitizeInt(x.max),
        notes: String(x.notes || "")
      })).filter(x => x.name && x.min);
      save(); render();
    } catch (err) {
      alert("Import fehlgeschlagen: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  // Clear all
  document.getElementById("clear-all").addEventListener("click", () => {
    if (confirm("Wirklich alle lokalen Einträge löschen?")) {
      services = [];
      save(); render();
    }
  });
});

// --- Edit Dialog ---
function openEditDialog(item) {
  const dlg = document.getElementById("edit-dialog");
  document.getElementById("edit-name").value = item.name;
  document.getElementById("edit-min").value = item.min ?? "";
  document.getElementById("edit-max").value = item.max ?? "";
  document.getElementById("edit-notes").value = item.notes ?? "";
  dlg.returnValue = "";
  dlg.showModal();

  const saveBtn = document.getElementById("edit-save");
  const handler = (e) => {
    e.preventDefault();
    const name = document.getElementById("edit-name").value.trim();
    const min = sanitizeInt(document.getElementById("edit-min").value);
    const max = sanitizeInt(document.getElementById("edit-max").value);
    const notes = document.getElementById("edit-notes").value.trim();
    if (!name) return alert("Bitte Dienstnamen angeben.");
    if (min == null || min < 1) return alert("Bitte eine gültige Mindestlänge angeben.");
    if (max != null && max < min) return alert("Max darf nicht kleiner als Min sein.");
    Object.assign(item, { name, min, max, notes });
    save(); render(); dlg.close();
  };
  saveBtn.addEventListener("click", handler, { once: true });
}
