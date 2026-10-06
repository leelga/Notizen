// ============================================================
// HIER DEINE WEB-APP-URL AUS GOOGLE APPS SCRIPT EINTRAGEN
// (siehe Anleitung). Solange das Feld leer ist, läuft die App
// im Testmodus und speichert nur im Browser.
// ============================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzgHFUham4GHJtwIlktwB4eAqQH149s3X2kSnKLwdGNDcE3Enr1KVqRp-am2ekLbkFI/exec";

const formular = document.getElementById("formular");
const titelFeld = document.getElementById("titel");
const textFeld = document.getElementById("text");
const titelLabel = document.getElementById("titel-label");
const textLabel = document.getElementById("text-label");
const speichernBtn = document.getElementById("speichern");
const meldung = document.getElementById("meldung");
const listeDiv = document.getElementById("liste");
const sucheFeld = document.getElementById("suche");
const filterFeld = document.getElementById("filter");

let eintraege = [];

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

// ---------- Anzeige ----------
function anzeigen() {
  const suchtext = sucheFeld.value.trim().toLowerCase();
  const typ = filterFeld.value;

  const treffer = eintraege
    .filter(e => !typ || e.typ === typ)
    .filter(e => (e.titel + " " + e.text).toLowerCase().includes(suchtext))
    .sort((a, b) => a.titel.localeCompare(b.titel, "de"));

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
    karte.className = "eintrag " + e.typ.toLowerCase();

    const h = document.createElement("h3");
    h.textContent = e.titel;

    const p = document.createElement("p");
    p.textContent = e.text;

    const klein = document.createElement("small");
    klein.textContent = e.typ + " vom " + datumFormatieren(e.datum);

    karte.append(h, p, klein);
    listeDiv.appendChild(karte);
  }
}

// ---------- Daten laden und speichern ----------
async function laden() {
  if (!SCRIPT_URL) {
    eintraege = JSON.parse(localStorage.getItem("lernzettel") || "[]");
    anzeigen();
    zeigeMeldung("Testmodus: Einträge werden nur in diesem Browser gespeichert.");
    return;
  }
  try {
    const antwort = await fetch(SCRIPT_URL);
    eintraege = await antwort.json();
    anzeigen();
  } catch (fehler) {
    zeigeMeldung("Die Einträge konnten nicht geladen werden. Prüfe die Script-URL.", true);
  }
}

async function speichern(eintrag) {
  if (!SCRIPT_URL) {
    eintraege.push(eintrag);
    localStorage.setItem("lernzettel", JSON.stringify(eintraege));
    return;
  }
  // text/plain vermeidet eine CORS-Vorabprüfung bei Google Apps Script
  await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(eintrag)
  });
  eintraege.push(eintrag);
}

// ---------- Ereignisse ----------
formular.addEventListener("submit", async (event) => {
  event.preventDefault();

  const eintrag = {
    datum: new Date().toISOString(),
    typ: aktuellerTyp(),
    titel: titelFeld.value.trim(),
    text: textFeld.value.trim()
  };

  speichernBtn.disabled = true;
  zeigeMeldung("Wird gespeichert …");

  try {
    await speichern(eintrag);
    formular.reset();
    aktualisiereBeschriftung();
    anzeigen();
    zeigeMeldung(eintrag.typ + " gespeichert.");
  } catch (fehler) {
    zeigeMeldung("Speichern fehlgeschlagen. Prüfe deine Internetverbindung.", true);
  } finally {
    speichernBtn.disabled = false;
  }
});

function aktualisiereBeschriftung() {
  const istBegriff = aktuellerTyp() === "Begriff";
  titelLabel.textContent = istBegriff ? "Begriff" : "Titel der Notiz";
  textLabel.textContent = istBegriff ? "Erklärung" : "Notiz";
}

document.querySelectorAll('input[name="typ"]').forEach(r =>
  r.addEventListener("change", aktualisiereBeschriftung));
sucheFeld.addEventListener("input", anzeigen);
filterFeld.addEventListener("change", anzeigen);

aktualisiereBeschriftung();
laden();
