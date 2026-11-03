# BiasLab

Sito di bias macro per il forex: dati macro, posizionamento COT e stagionalità in un unico punteggio per valute, coppie, indici e materie prime.

- **Bias board**: tabella dato per dato (Valute, Major, Cross, Indici, Materie prime), matrice "ogni cross" e pannello di dettaglio.
- **Pagina di ogni mercato** con tre schede:
  - **Panoramica**: score composito, score nel tempo con il prezzo sovrapposto, dato per dato.
  - **COT**: posizionamento netto, variazioni settimanali, gruppi di trader.
  - **Stagionalità**: andamento medio a 5, 7, 10, 15 e 20 anni, test di un periodo long o short, anni positivi per mese e rendimenti mensili.
- **Posizionamento COT**: tutti i mercati in una pagina.

Ogni dato macro viene confrontato con il **dato precedente**: un miglioramento dà un punteggio positivo, un peggioramento negativo. Le regole complete sono nella pagina "Metodo" del sito.

## Struttura

```
pipeline/            script Python che scaricano i dati e calcolano i punteggi
  config.py          strumenti, indicatori e fonti: qui si personalizza tutto
  fetch.py           download da Yahoo Finance, CFTC, FRED, OECD, BIS
  compute.py         regole di punteggio e scrittura dei JSON
  demo.py            dati sintetici per provare il sito offline
  build.py           comando principale
site/                il sito statico (HTML, CSS, JS) + site/data/*.json
.github/workflows/   aggiornamento automatico e pubblicazione su GitHub Pages
```

## Mettere il sito online (gratis, con GitHub)

1. Crea un account su github.com, se non ce l'hai.
2. Crea un nuovo repository, ad esempio `biaslab`, e carica tutti i file di questa cartella. Puoi trascinarli dalla pagina web del repository con "Add file → Upload files".
3. Nel repository apri **Settings → Pages** e in "Source" scegli **GitHub Actions**.
4. Apri la scheda **Actions**, seleziona "Aggiorna dati e pubblica il sito" e premi **Run workflow**.
5. Dopo 2–4 minuti il sito è online su `https://TUO-UTENTE.github.io/biaslab/`.

Da quel momento si aggiorna da solo ogni mattina e il venerdì sera, dopo il report COT. Puoi lanciarlo a mano quando vuoi con "Run workflow".

Se un aggiornamento fallisce, resta online la versione precedente. Nel log del workflow trovi quale fonte non ha risposto.

## Provare in locale

```bash
pip install -r requirements.txt
python pipeline/build.py          # dati reali (serve internet)
python pipeline/build.py --demo   # dati sintetici
cd site && python -m http.server 8000
# apri http://localhost:8000
```

## Fonti dati (tutte gratuite, senza chiave)

| Dato | Fonte |
|---|---|
| Prezzi giornalieri | Yahoo Finance (libreria `yfinance`) |
| COT valute e indici | CFTC, report Traders in Financial Futures |
| COT materie prime | CFTC, report Disaggregated |
| Macro USA (PIL, CPI, PCE, PPI, NFP, claims, JOLTS, salari, retail…) | FRED |
| Macro altre economie (CPI, CPI core, disoccupazione, fiducia, PIL) | OECD |
| Tassi di policy | BIS (con FRED come riserva per Fed e BCE) |

I dati USA sono i più completi. Per le altre economie le fonti gratuite coprono CPI, disoccupazione, fiducia, PIL e tassi. Gli altri indicatori appaiono come "—" e non pesano sul punteggio, perché ogni area usa la media dei dati disponibili.

## Personalizzare

- **Nome del sito**: `SITE_NAME` in `pipeline/config.py`.
- **Aggiungere o cambiare una serie**: dizionario `MACRO_SOURCES` in `config.py`. Per esempio `("GBP", "retail"): _fred("ID_SERIE", "mom")` aggiunge una serie FRED.
- **Regole di punteggio**: funzioni `indicator_score`, `cot_score` e `season_stats` in `pipeline/compute.py`.
- **Colori e grafica**: variabili CSS in cima a `site/styles.css`.

Solo a scopo informativo, non è una consulenza finanziaria.
