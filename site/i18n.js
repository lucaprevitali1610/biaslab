/* PRV Board · lingua IT/EN.
   Il sito è scritto in italiano; in inglese i testi mostrati vengono tradotti al volo
   (dizionario + regole per le frasi con numeri). La scelta arriva da ?lang=en|it,
   poi dalla memoria del browser (prv_lang), poi dalla lingua del browser. */
"use strict";
const LANG = (() => {
  let q = null; try { q = new URLSearchParams(location.search).get("lang"); } catch {}
  if (q === "en" || q === "it") { try { localStorage.setItem("prv_lang", q); } catch {} return q; }
  try { const s = localStorage.getItem("prv_lang"); if (s === "en" || s === "it") return s; } catch {}
  return (navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en";
})();
const LOC = LANG === "en" ? "en-GB" : "it-IT";
document.documentElement.lang = LANG;

const EN = {
  // struttura
  "Analisi": "Analysis", "Posizionamento COT": "COT positioning", "Grafico": "Chart",
  "Cerca un mercato: EURUSD, oro, Nasdaq…": "Search a market: EURUSD, gold, Nasdaq…",
  "Tema chiaro/scuro": "Light/dark theme", "Cambia tema chiaro o scuro": "Switch light or dark theme",
  "Caricamento…": "Loading…", "Torna al sito PRV Journal": "Back to the PRV Journal website",
  "← prvjournal.com": "← prvjournal.com",
  "· © 2026 PRV Journal · Tutti i diritti riservati ·": "· © 2026 PRV Journal · All rights reserved ·",
  "Privacy e cookie": "Privacy & cookies", "Preferenze cookie": "Cookie preferences", "☕ Sostieni": "☕ Support",
  "Solo a scopo informativo, non costituisce consulenza finanziaria.": "For information only, not financial advice.",
  "Cookie e privacy": "Cookies & privacy",
  "Il Board usa solo memoria tecnica del browser, senza cookie. Il grafico interattivo è fornito da": "The Board only uses technical browser storage, no cookies. The interactive chart is provided by",
  ", che può usare cookie propri: lo carichiamo solo se acconsenti.": ", which may use its own cookies: we only load it if you agree.",
  "Rifiuta": "Decline", "Accetta": "Accept",
  "Aggiornamento automatico": "Automatic updates",
  "Ogni mattina e il venerdì sera dopo il report COT.": "Every morning, and on Friday evening after the COT report.",
  "Dati dimostrativi.": "Demo data.",
  "Sono numeri sintetici per provare l'interfaccia: i dati reali arrivano quando la pipeline gira online.": "These are synthetic numbers to try the interface: real data arrives when the pipeline runs online.",
  "Nessun risultato": "No results",
  // bias
  "Molto rialzista": "Strongly bullish", "Rialzista": "Bullish", "Neutrale": "Neutral", "Ribassista": "Bearish", "Molto ribassista": "Strongly bearish",
  "Rialzisti": "Bullish", "Ribassisti": "Bearish",
  // gruppi e categorie
  "Valute": "Currencies", "Indici": "Indices", "Materie prime": "Commodities", "Valuta": "Currency",
  "Crescita": "Growth", "Inflazione": "Inflation", "Tassi": "Rates", "Lavoro": "Labour",
  // indicatori
  "PIL": "GDP", "Fiducia imprese": "Business confidence", "Imprese": "Business", "Fiducia consumatori": "Consumer confidence", "Consum.": "Consumer",
  "Vendite al dettaglio": "Retail sales", "Produzione industriale": "Industrial production", "Prod.ind": "Ind.prod",
  "Inflazione CPI": "CPI inflation", "CPI core": "Core CPI", "Prezzi produzione PPI": "Producer prices PPI",
  "Tasso di policy": "Policy rate", "Tasso": "Rate", "Disoccupazione": "Unemployment", "Disocc.": "Unempl.",
  "Richieste sussidi": "Jobless claims", "ADP occupati": "ADP employment", "Salari orari": "Hourly earnings", "Salari": "Wages",
  "Posti vacanti JOLTS": "JOLTS job openings",
  // valute e mercati
  "Dollaro USA": "US dollar", "Sterlina": "British pound", "Franco svizzero": "Swiss franc", "Dollaro canadese": "Canadian dollar",
  "Dollaro australiano": "Australian dollar", "Dollaro neozelandese": "New Zealand dollar",
  "Oro": "Gold", "Argento": "Silver", "Petrolio WTI": "WTI crude oil", "Rame": "Copper", "Produttori": "Producers",
  // board
  "Forza delle valute": "Currency strength", "macro + COT, da −10 a +10": "macro + COT, from −10 to +10",
  "Setup più forti": "Strongest setups", "andamento dello score, ultimi 6 mesi": "score trend, last 6 months",
  "Mercati": "Markets", "Sintesi": "Summary", "Dato per dato": "Release by release",
  "Mappa dei cross": "Cross map", "valuta in riga contro valuta in colonna": "row currency against column currency",
  "Cambiamenti della settimana": "This week's changes", "variazione dello score in 7 giorni": "score change over 7 days",
  "Nessuna variazione questa settimana": "No changes this week",
  "Flussi": "Flows", "Mercato": "Market", "Stag.": "Seas.", "Bias": "Bias", "Componenti": "Components", "Trend 6 mesi": "6-month trend",
  "1 sett.": "1 wk", "4 sett.": "4 wk", "Sett.": "Wk", "Prezzo": "Price", "1 giorno": "1 day",
  "da ribassista a rialzista · ogni dato confrontato con il precedente · trattino = dato non disponibile": "from bearish to bullish · each release compared with the previous one · dash = not available",
  "macro": "macro", "stagionalità": "seasonality", "clicca una riga per il dettaglio": "click a row for details",
  "ribassista": "bearish", "neutrale": "neutral", "rialzista · più grande = più forte": "bullish · bigger = stronger",
  "n.d.": "n/a",
  // pannello
  "Dati macro": "Macro data", "attuale · precedente": "actual · previous", "Macro": "Macro", "Stagionalità": "Seasonality",
  "Ultimo": "Last", "Apri l'analisi completa": "Open the full analysis", "Analisi completa": "Full analysis",
  "Dato": "Release", "Attuale": "Actual", "Previsione": "Forecast", "Sorpresa": "Surprise", "Uscito": "Released", "Score": "Score",
  "precedente": "previous", "Coppia": "Pair",
  "Se manca la previsione, il confronto è con il dato precedente (in grigio).": "If there is no forecast, the comparison is with the previous release (in grey).",
  "Rendimento medio": "Average return", "Posizione netta speculativa": "Net speculative position", "Variazione 4 settimane": "4-week change",
  "Percentile 3 anni": "3-year percentile", "Nessun contratto CFTC per questo mercato": "No CFTC contract for this market",
  "non disponibile": "not available", "Chiusura": "Close",
  // pagina mercato
  "← PRV Board": "← PRV Board", "Ultimo prezzo": "Last price", "Score 1 sett.": "Score 1 wk", "Panoramica": "Overview",
  "Score composito": "Composite score", "Macro per area": "Macro by area", "Variazione dello score": "Score change",
  "1 settimana": "1 week", "1 mese": "1 month", "3 mesi": "3 months", "Score nel tempo": "Score over time",
  "Totale": "Total", "Ora": "Now", "Media": "Average", "Massimo": "High", "Minimo": "Low",
  "ogni dato confrontato con la previsione degli analisti": "each release compared with the analysts' forecast",
  "Prezzo giornaliero": "Daily price", "Storico non disponibile": "History not available",
  "Sorpresa = attuale − previsione. Senza previsione il confronto è con il dato precedente (in grigio). Passa sopra al valore per il nome dell'evento e la fonte.": "Surprise = actual − forecast. Without a forecast the comparison is with the previous release (in grey). Hover a value for the event name and source.",
  "Torna alla board": "Back to the board",
  // COT
  "Dati COT non disponibili per questo mercato": "COT data not available for this market",
  "contratti netti speculativi": "net speculative contracts", "Questa settimana": "This week", "4 settimane": "4 weeks", "Open interest": "Open interest",
  "Netto speculativo, ultimi 3 anni": "Net speculative, last 3 years", "Variazione settimanale del netto, ultime 26 settimane": "Weekly change in net, last 26 weeks",
  "Gruppo": "Group", "Netto": "Net",
  "Lo score COT della coppia è la differenza tra il momentum a 4 settimane delle due valute. Il dollaro usa il contratto US Dollar Index.": "The pair's COT score is the difference between the 4-week momentum of the two currencies. The dollar uses the US Dollar Index contract.",
  "Commitments of Traders della CFTC: posizione netta degli speculatori": "CFTC Commitments of Traders: speculators' net position",
  "Report settimanale, dati al martedì": "Weekly report, data as of Tuesday", "Contratto": "Contract", "Ultimo anno": "Last year",
  // stagionalità
  "Quest'anno": "This year", "Anno scorso": "Last year", "Media 5 anni": "5-year average", "Media 7 anni": "7-year average",
  "Media 10 anni": "10-year average", "Media 15 anni": "15-year average", "Media 20 anni": "20-year average",
  "Prezzi non disponibili": "Prices not available", "Andamento stagionale": "Seasonal pattern",
  "Rendimento cumulato dall'inizio dell'anno. Trascina sul grafico per testare un periodo.": "Cumulative return since the start of the year. Drag on the chart to test a period.",
  "Da inizio anno": "Year to date", "Anni positivi": "Positive years", "Testa un periodo": "Test a period",
  "Dal": "From", "Al": "To", "Calcola": "Calculate", "Azzera": "Reset", "Nessuna linea selezionata": "No line selected",
  "% di anni in rialzo": "% of up years", "Settimana": "Week", "Mese": "Month", "Rendimenti mensili": "Monthly returns", "Tutti": "All",
  "5 anni": "5 years", "7 anni": "7 years", "10 anni": "10 years", "15 anni": "15 years", "20 anni": "20 years",
  "Storico insufficiente": "Not enough history", "Anno": "Year", "Entrata": "Entry", "Uscita": "Exit",
  "Max drawdown": "Max drawdown", "Max guadagno": "Max gain", "Rendimento": "Return",
  // grafico
  "Analisi tecnica": "Technical analysis", "Grafico TradingView con il bias del mercato selezionato": "TradingView chart with the bias of the selected market",
  "Grafico interattivo TradingView": "Interactive TradingView chart",
  "Questo grafico è fornito da TradingView, un servizio esterno che può usare cookie propri. Lo carichiamo solo con il tuo consenso.": "This chart is provided by TradingView, an external service that may use its own cookies. We only load it with your consent.",
  "Carica il grafico": "Load the chart",
  "Il grafico TradingView si carica sul sito pubblicato. Se non compare, controlla la connessione o un eventuale blocco pubblicità.": "The TradingView chart loads on the published site. If it doesn't appear, check your connection or any ad blocker.",
  "Lingua": "Language", "1A": "1Y", "2A": "2Y", "5A": "5Y",
};
const MON_IT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const RX = [
  [/^Dove punta il mercato · (.+)$/, "Where the market is heading · $1"],
  [/^(\d+) coppie rialziste e (\d+) ribassiste su (\d+) · macro, COT e stagionalità in un punteggio$/, "$1 bullish and $2 bearish pairs out of $3 · macro, COT and seasonality in one score"],
  [/^Le (\d+) coppie forex per bias$/, "The $1 FX pairs by bias"],
  [/^Aggiornato il (.+)$/, "Updated $1"],
  [/^· Dati al (.+)$/, "· Data as of $1"],
  [/^Ultimo: (.+)$/, "Last: $1"],
  [/^su ±(\d+)$/, "out of ±$1"],
  [/^Coppie con (\w+)$/, "Pairs with $1"],
  [/^(\w+) come base$/, "$1 as base"],
  [/^(\w+) · (\w+) · coppia$/, "$1 · $2 · pair"],
  [/^stagionalità (\d+)% anni positivi$/, "seasonality $1% positive years"],
  [/^Stagionalità prossimi (\d+) giorni$/, "Seasonality, next $1 days"],
  [/^Prossimi (\d+) giorni$/, "Next $1 days"],
  [/^Anni positivi \(ultimi (.+)\)$/, "Positive years (last $1)"],
  [/^COT · non disponibile$/, "COT · not available"],
  [/^(.+) contro (.+)$/, (m, a, b) => `${tx(a)} against ${tx(b)}`],
  [/^Mercato "(.+)" non trovato\.$/, 'Market "$1" not found.'],
  [/^(.+) · report del (.+)$/, "$1 · report of $2"],
  [/^min 52s (.+)$/, "52w low $1"], [/^max 52s (.+)$/, "52w high $1"],
  [/^Nessun contratto CFTC per (.+)$/, "No CFTC contract for $1"],
  [/^Dal (.+) al (.+)$/, "From $1 to $2"],
  [/^Media (\d+) anni$/, "$1-year average"],
  [/^(\d+) su (\d+) positivi · media (.+)$/, "$1 of $2 positive · average $3"],
  [/^Dati non trovati\. Esegui$/, "Data not found. Run"], [/^per generarli\.$/, "to generate them."],
  [/^S(\d+)$/, "W$1"], [/^S(\d+): (.+)$/, "W$1: $2"],
  // tooltip "Etichetta: valore"
  [/^([^:]+): (.+)$/, (m, a, b) => EN[a.trim()] != null ? `${EN[a.trim()]}: ${b}` : m],
];
function tx(s) {
  if (LANG !== "en" || s == null) return s;
  const str = String(s), t = str.trim(); if (!t) return str;
  let out = EN[t]; if (out == null && t.includes("\u00a0")) out = EN[t.replace(/\u00a0/g, " ")];
  if (out == null) for (const [r, f] of RX) { if (r.test(t)) { const v = t.replace(r, f); if (v !== t) { out = v; break; } } }
  return out == null ? str : str.replace(t, out);
}
function translateTree(root) {
  if (LANG !== "en" || !root) return;
  if (root.nodeType === 3) { const v = tx(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = root.nodeType === 1 ? root : w.nextNode();
  while (n) {
    if (n.nodeType === 3) { const p = n.parentNode && n.parentNode.nodeName; if (p !== "SCRIPT" && p !== "STYLE") { const v = tx(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } }
    else for (const a of ["title", "placeholder", "aria-label"]) { const v0 = n.getAttribute && n.getAttribute(a); if (v0) { const v = tx(v0); if (v !== v0) n.setAttribute(a, v); } }
    n = w.nextNode();
  }
}
function setLang(l) {
  try { localStorage.setItem("prv_lang", l); } catch {}
  try { window.umami && umami.track("lingua", { lingua: l }); } catch {}
  const u = new URL(location.href); u.searchParams.delete("lang");
  if (u.search !== location.search) location.replace(u.href); else location.reload();
}
(function initLang() {
  document.querySelectorAll("[data-lang]").forEach((b) => { b.setAttribute("aria-pressed", b.dataset.lang === LANG); b.onclick = () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }; });
  if (LANG !== "en") return;
  document.title = "PRV Board — FX bias with macro data, COT and seasonality";
  translateTree(document.body);
  new MutationObserver((ms) => ms.forEach((m) => {
    if (m.type === "characterData") translateTree(m.target);
    else if (m.type === "attributes") translateTree(m.target);
    else m.addedNodes.forEach(translateTree);
  })).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] });
})();
