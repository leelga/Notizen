// ============================================================
// HIER DEINE WEB-APP-URL AUS GOOGLE APPS SCRIPT EINTRAGEN
// Solange das Feld leer ist, läuft die App im Testmodus und
// speichert nur im Browser.
// ============================================================
   const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzgHFUham4GHJtwIlktwB4eAqQH149s3X2kSnKLwdGNDcE3Enr1KVqRp-am2ekLbkFI/exec";

const formular = document.getElementById("formular");
const formTitel = document.getElementById("eingabe-titel");
const titelFeld = document.getElementById("titel");
const textFeld = document.getElementById("text");
const titelLabel = document.getElementById("titel-label");
const textLabel = document.getElementById("text-label");
const speichernBtn = document.getElementById("speichern");
const meldung = document.getElementById("meldung");
const listeDiv = document.getElementById("liste");
const sucheFeld = document.getElementById("suche");
const filterFeld = document.getElementById("filter");

// Abbrechen-Knopf (wird nur beim Bearbeiten gezeigt)
const abbrechenBtn = document.createElement("button");
abbrechenBtn.type = "button";
abbrechenBtn.id = "abbrechen";
abbrechenBtn.textContent = "Abbrechen";
abbrechenBtn.hidden = true;
speichernBtn.after(abbrechenBtn);

let eintraege = [];
let bearbeiteZeile = null; // Zeile des Eintrags, der gerade bearbeitet wird
let alterTitel = "";       // dient als Sicherheitsprüfung im Skript

// ---------- Hilfsfunktionen ----------
function zeigeMeldung(text, istFehler = false) {
  meldung.textContent = text;
  meldung.classList.toggle("fehler", istFehler);
}

function aktuellerTyp() {
  return document.querySelector('input[name="typ"]:checked').value;
}

function datumFormatieren(wert) {
  const d = new Date(wert);
  return isNaN(d) ? "" : d.toLocaleDateString("de-DE");
}

function aktualisiereBeschriftung() {
  const istBegriff = aktuellerTyp() === "Begriff";
  titelLabel.textContent = istBegriff ? "Begriff" : "Titel der Notiz";
  textLabel.textContent = istBegriff ? "Erklärung" : "Notiz";
}

// ---------- Anzeige ----------
function anzeigen() {
  const suchtext = sucheFeld.value.trim().toLowerCase();
  const typ = filterFeld.value;

  const treffer = eintraege
    .filter(e => !typ || e.typ === typ)
    .filter(e => (e.titel + " " + e.text).toLowerCase().includes(suchtext))
    .sort((a, b) => String(a.titel).localeCompare(String(b.titel), "de"));

  listeDiv.innerHTML = "";

  if (treffer.length === 0) {
    const leer = document.createElement("p");
    leer.className = "leer";
    leer.textContent = eintraege.length === 0
      ? "Noch nichts gespeichert. Lege links deinen ersten Eintrag an."
      : "Keine Einträge gefunden. Ändere Suche oder Filter.";
    listeDiv.appendChild(leer);
    return;
  }

  for (const e of treffer) {
    const karte = document.createElement("article");
    karte.className = "eintrag " + String(e.typ).toLowerCase();

    const h = document.createElement("h3");
    h.textContent = e.titel;

    const p = document.createElement("p");
    p.textContent = e.text;

    const klein = document.createElement("small");
    klein.textContent = e.typ + " vom " + datumFormatieren(e.datum);

    const knoepfe = document.createElement("div");
    knoepfe.className = "aktionen";

    const bearbeitenBtn = document.createElement("button");
    bearbeitenBtn.type = "button";
    bearbeitenBtn.className = "klein";
    bearbeitenBtn.textContent = "Bearbeiten";
    bearbeitenBtn.addEventListener("click", () => bearbeitenStarten(e));

    const loeschenBtn = document.createElement("button");
    loeschenBtn.type = "button";
    loeschenBtn.className = "klein gefahr";
    loeschenBtn.textContent = "Löschen";
    loeschenBtn.addEventListener("click", () => loeschen(e));

    knoepfe.append(bearbeitenBtn, loeschenBtn);
    karte.append(h, p, klein, knoepfe);
    listeDiv.appendChild(karte);
  }
}

// ---------- Daten laden und ändern ----------
async function ladeAusSheet() {
  const antwort = await fetch(SCRIPT_URL);
  eintraege = await antwort.json();
}

async function laden() {
  if (!SCRIPT_URL) {
    eintraege = JSON.parse(localStorage.getItem("lernzettel") || "[]");
    eintraege.forEach((e, i) => { e.zeile = i + 2; });
    anzeigen();
    zeigeMeldung("Testmodus: Einträge werden nur in diesem Browser gespeichert.");
    return;
  }
  try {
    await ladeAusSheet();
    anzeigen();
  } catch (fehler) {
    zeigeMeldung("Die Einträge konnten nicht geladen werden. Prüfe die Script-URL.", true);
  }
}

// aktion: "neu", "bearbeiten" oder "loeschen"
async function aendern(aktion, daten) {
  if (!SCRIPT_URL) {
    const i = daten.zeile - 2;
    if (aktion === "neu") eintraege.push(daten);
    if (aktion === "bearbeiten") Object.assign(eintraege[i], { typ: daten.typ, titel: daten.titel, text: daten.text });
    if (aktion === "loeschen") eintraege.splice(i, 1);
    eintraege.forEach((e, n) => { e.zeile = n + 2; });
    localStorage.setItem("lernzettel", JSON.stringify(eintraege));
    return;
  }

  // text/plain vermeidet eine CORS-Vorabprüfung bei Google Apps Script
  const antwort = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ aktion, ...daten })
  });

  let ergebnis = null;
  try { ergebnis = await antwort.json(); } catch (e) { /* Antwort nicht lesbar */ }
  if (ergebnis && ergebnis.ok === false) {
    throw new Error(ergebnis.fehler || "Unbekannter Fehler");
  }

  await ladeAusSheet(); // Liste neu aus dem Sheet holen, damit die Zeilen stimmen
}

// ---------- Bearbeiten und Löschen ----------
function bearbeitenStarten(e) {
  bearbeiteZeile = e.zeile;
  alterTitel = e.titel;

  document.querySelector(`input[name="typ"][value="${e.typ}"]`).checked = true;
  titelFeld.value = e.titel;
  textFeld.value = e.text;

  formTitel.textContent = "Eintrag bearbeiten";
  speichernBtn.textContent = "Änderung speichern";
  abbrechenBtn.hidden = false;
  aktualisiereBeschriftung();
  zeigeMeldung("");

  formular.scrollIntoView({ behavior: "smooth", block: "center" });
  titelFeld.focus();
}

function bearbeitenBeenden() {
  bearbeiteZeile = null;
  alterTitel = "";
  formular.reset();
  formTitel.textContent = "Neuer Eintrag";
  speichernBtn.textContent = "Eintrag speichern";
  abbrechenBtn.hidden = true;
  aktualisiereBeschriftung();
}

async function loeschen(e) {
  if (!confirm("„" + e.titel + "“ wirklich löschen?")) return;
  try {
    await aendern("loeschen", { zeile: e.zeile, alterTitel: e.titel });
    if (bearbeiteZeile) bearbeitenBeenden();
    anzeigen();
    zeigeMeldung("Eintrag gelöscht.");
  } catch (fehler) {
    zeigeMeldung("Löschen fehlgeschlagen: " + fehler.message, true);
  }
}

// ---------- Ereignisse ----------
formular.addEventListener("submit", async (event) => {
  event.preventDefault();

  const daten = {
    typ: aktuellerTyp(),
    titel: titelFeld.value.trim(),
    text: textFeld.value.trim()
  };

  speichernBtn.disabled = true;
  zeigeMeldung("Wird gespeichert …");

  try {
    if (bearbeiteZeile) {
      daten.zeile = bearbeiteZeile;
      daten.alterTitel = alterTitel;
      await aendern("bearbeiten", daten);
      bearbeitenBeenden();
      zeigeMeldung("Änderung gespeichert.");
    } else {
      daten.datum = new Date().toISOString();
      await aendern("neu", daten);
      formular.reset();
      aktualisiereBeschriftung();
      zeigeMeldung(daten.typ + " gespeichert.");
    }
    anzeigen();
  } catch (fehler) {
    zeigeMeldung("Speichern fehlgeschlagen: " + fehler.message, true);
  } finally {
    speichernBtn.disabled = false;
  }
});

abbrechenBtn.addEventListener("click", () => {
  bearbeitenBeenden();
  zeigeMeldung("");
});

document.querySelectorAll('input[name="typ"]').forEach(r =>
  r.addEventListener("change", aktualisiereBeschriftung));
sucheFeld.addEventListener("input", anzeigen);
filterFeld.addEventListener("change", anzeigen);

aktualisiereBeschriftung();
laden();

const themeBtn = document.createElement("button");
themeBtn.type = "button";
themeBtn.className = "theme-knopf";
document.body.appendChild(themeBtn);

function themeSetzen(dunkel) {
  document.documentElement.dataset.theme = dunkel ? "dark" : "light";
  themeBtn.textContent = dunkel ? "☀ Hell" : "☾ Dunkel";
  themeBtn.setAttribute("aria-pressed", String(dunkel));
}

// Startwert: gespeicherte Wahl, sonst die Einstellung des Geräts
let gespeichertesTheme = null;
try { gespeichertesTheme = localStorage.getItem("theme"); } catch (e) { /* ignorieren */ }
themeSetzen(
  gespeichertesTheme
    ? gespeichertesTheme === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches
);

themeBtn.addEventListener("click", () => {
  const dunkel = document.documentElement.dataset.theme !== "dark";
  themeSetzen(dunkel);
  try { localStorage.setItem("theme", dunkel ? "dark" : "light"); } catch (e) { /* ignorieren */ }
});
