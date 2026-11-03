"""Configurazione di BiasLab: strumenti, indicatori macro, fonti COT.

Ogni indicatore macro viene confrontato con il dato PRECEDENTE:
miglioramento -> punteggio positivo, peggioramento -> negativo.
Per modificare fonti o serie basta cambiare questo file.
"""

SITE_NAME = "BiasLab"

# ---------------------------------------------------------------- valute
CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"]
CURRENCY_NAMES = {
    "USD": "Dollaro USA", "EUR": "Euro", "GBP": "Sterlina", "JPY": "Yen",
    "CHF": "Franco svizzero", "CAD": "Dollaro canadese",
    "AUD": "Dollaro australiano", "NZD": "Dollaro neozelandese",
}
# codici paese usati da OECD e BIS
OECD_AREA = {"USD": ["USA"], "EUR": ["EA20", "EA19"], "GBP": ["GBR"], "JPY": ["JPN"],
             "CHF": ["CHE"], "CAD": ["CAN"], "AUD": ["AUS"], "NZD": ["NZL"]}
BIS_AREA = {"USD": "US", "EUR": "XM", "GBP": "GB", "JPY": "JP", "CHF": "CH",
            "CAD": "CA", "AUD": "AU", "NZD": "NZ"}

# ---------------------------------------------------------------- strumenti
MAJORS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD"]
_ORDER = ["EUR", "GBP", "AUD", "NZD", "CAD", "CHF", "JPY"]
CROSSES = [a + b for i, a in enumerate(_ORDER) for b in _ORDER[i + 1:]]

INDICES = {
    # id: (nome, ticker Yahoo, codice CFTC o None, valuta/economia di riferimento)
    "SPX":  ("S&P 500", "^GSPC", "13874A", "USD"),
    "NDX":  ("Nasdaq 100", "^NDX", "209742", "USD"),
    "DJI":  ("Dow Jones", "^DJI", "124603", "USD"),
    "RUT":  ("Russell 2000", "^RUT", "239742", "USD"),
    "DAX":  ("DAX 40", "^GDAXI", None, "EUR"),
    "FTSE": ("FTSE 100", "^FTSE", None, "GBP"),
    "NKY":  ("Nikkei 225", "^N225", "240741", "JPY"),
}
COMMODITIES = {
    "XAU":   ("Oro", "GC=F", "088691"),
    "XAG":   ("Argento", "SI=F", "084691"),
    "WTI":   ("Petrolio WTI", "CL=F", "067651"),
    "COPPER": ("Rame", "HG=F", "085692"),
}

def fx_ticker(pair):
    return f"{pair}=X"

# ---------------------------------------------------------------- COT
# report "Traders in Financial Futures" (valute e indici)
COT_TFF_DATASET = "gpe5-46if"
# report "Disaggregated" (materie prime)
COT_DISAGG_DATASET = "72hh-3qpy"
COT_CURRENCY = {"EUR": "099741", "GBP": "096742", "JPY": "097741", "CHF": "092741",
                "CAD": "090741", "AUD": "232741", "NZD": "112741", "USD": "098662"}
COT_NAMES = {"099741": "Euro FX (CME)", "096742": "British Pound (CME)",
             "097741": "Japanese Yen (CME)", "092741": "Swiss Franc (CME)",
             "090741": "Canadian Dollar (CME)", "232741": "Australian Dollar (CME)",
             "112741": "NZ Dollar (CME)", "098662": "US Dollar Index (ICE)",
             "13874A": "E-mini S&P 500", "209742": "Nasdaq-100 Mini",
             "124603": "Dow Jones Mini", "239742": "Russell 2000 Mini",
             "240741": "Nikkei 225 (CME)", "088691": "Gold (COMEX)",
             "084691": "Silver (COMEX)", "067651": "Crude Oil WTI (NYMEX)",
             "085692": "Copper (COMEX)"}

# ---------------------------------------------------------------- macro
CATEGORIES = [("growth", "Crescita"), ("inflation", "Inflazione"),
              ("rates", "Tassi"), ("jobs", "Lavoro")]

# transform: level | mom (var % m/m) | yoy (var % a/a) | diff (differenza assoluta)
# invert: True se un valore più alto è NEGATIVO per la valuta (disoccupazione, sussidi)
# lag: giorni medi tra fine periodo e pubblicazione (serve per lo storico dello score)
INDICATORS = [
    {"id": "gdp", "label": "PIL", "short": "PIL", "cat": "growth", "unit": "% t/t", "lag": 30},
    {"id": "bci", "label": "Fiducia imprese", "short": "Imprese", "cat": "growth", "unit": "idx", "lag": 5},
    {"id": "cci", "label": "Fiducia consumatori", "short": "Consum.", "cat": "growth", "unit": "idx", "lag": 5},
    {"id": "retail", "label": "Vendite al dettaglio", "short": "Retail", "cat": "growth", "unit": "% m/m", "lag": 16},
    {"id": "indprod", "label": "Produzione industriale", "short": "Prod.ind", "cat": "growth", "unit": "% m/m", "lag": 16},
    {"id": "cpi", "label": "Inflazione CPI", "short": "CPI", "cat": "inflation", "unit": "% a/a", "lag": 14},
    {"id": "core", "label": "CPI core", "short": "Core", "cat": "inflation", "unit": "% a/a", "lag": 14},
    {"id": "ppi", "label": "Prezzi produzione PPI", "short": "PPI", "cat": "inflation", "unit": "% a/a", "lag": 15},
    {"id": "pce", "label": "PCE core", "short": "PCE", "cat": "inflation", "unit": "% a/a", "lag": 30},
    {"id": "rate", "label": "Tasso di policy", "short": "Tasso", "cat": "rates", "unit": "%", "lag": 0},
    {"id": "nfp", "label": "Non-farm payrolls", "short": "NFP", "cat": "jobs", "unit": "k", "lag": 7},
    {"id": "unemp", "label": "Disoccupazione", "short": "Disocc.", "cat": "jobs", "unit": "%", "lag": 20, "invert": True},
    {"id": "claims", "label": "Richieste sussidi", "short": "Claims", "cat": "jobs", "unit": "k", "lag": 5, "invert": True},
    {"id": "adp", "label": "ADP occupati", "short": "ADP", "cat": "jobs", "unit": "k", "lag": 5},
    {"id": "wages", "label": "Salari orari", "short": "Salari", "cat": "jobs", "unit": "% a/a", "lag": 7},
    {"id": "jolts", "label": "Posti vacanti JOLTS", "short": "JOLTS", "cat": "jobs", "unit": "M", "lag": 38},
]

_OECD_CPI = "OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL"
_OECD_LFS = "OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M"
_OECD_CLI = "OECD.SDD.STES,DSD_STES@DF_CLI"
_OECD_QNA = "OECD.SDD.NAD,DSD_NAMAIN1@DF_QNA_EXPENDITURE_GROWTH_OECD"

def _oecd(flow, filters, transform="level"):
    return {"src": "oecd", "flow": flow, "filters": filters, "transform": transform}

def _fred(sid, transform="level", scale=1.0):
    return {"src": "fred", "id": sid, "transform": transform, "scale": scale}

OECD_SOURCES = {
    "gdp": _oecd(_OECD_QNA, {"FREQ": "Q", "TRANSACTION": "B1GQ", "ADJUSTMENT": "Y",
                             "TRANSFORMATION": "G1", "PRICE_BASE": "LR"}),
    "bci": _oecd(_OECD_CLI, {"FREQ": "M", "MEASURE": "BCICP"}),
    "cci": _oecd(_OECD_CLI, {"FREQ": "M", "MEASURE": "CCICP"}),
    "cpi": _oecd(_OECD_CPI, {"FREQ": ["M", "Q"], "MEASURE": "CPI", "EXPENDITURE": "_T",
                             "TRANSFORMATION": "GY", "METHODOLOGY": "N", "ADJUSTMENT": "N"}),
    "core": _oecd(_OECD_CPI, {"FREQ": ["M", "Q"], "MEASURE": "CPI", "EXPENDITURE": "_TXCP01_NRG",
                              "TRANSFORMATION": "GY", "METHODOLOGY": "N", "ADJUSTMENT": "N"}),
    "unemp": _oecd(_OECD_LFS, {"FREQ": ["M", "Q"], "MEASURE": "UNE_LF_M", "ADJUSTMENT": "Y",
                               "SEX": "_T", "AGE": "Y_GE15"}),
}

# sorgenti per (valuta, indicatore). Se manca -> "—" nel sito.
MACRO_SOURCES = {}
for _c in CURRENCIES:
    for _k, _v in OECD_SOURCES.items():
        MACRO_SOURCES[(_c, _k)] = _v
    MACRO_SOURCES[(_c, "rate")] = {"src": "bis", "area": BIS_AREA[_c], "transform": "level"}

# Stati Uniti: serie FRED (gratuite, senza chiave)
MACRO_SOURCES.update({
    ("USD", "gdp"): _fred("A191RL1Q225SBEA"),
    ("USD", "cci"): _fred("UMCSENT"),
    ("USD", "retail"): _fred("RSAFS", "mom"),
    ("USD", "indprod"): _fred("INDPRO", "mom"),
    ("USD", "cpi"): _fred("CPIAUCSL", "yoy"),
    ("USD", "core"): _fred("CPILFESL", "yoy"),
    ("USD", "ppi"): _fred("PPIFIS", "yoy"),
    ("USD", "pce"): _fred("PCEPILFE", "yoy"),
    ("USD", "nfp"): _fred("PAYEMS", "diff"),
    ("USD", "unemp"): _fred("UNRATE"),
    ("USD", "claims"): _fred("ICSA", "level", 0.001),
    ("USD", "adp"): _fred("ADPMNUSNERSA", "diff", 0.001),
    ("USD", "wages"): _fred("CES0500000003", "yoy"),
    ("USD", "jolts"): _fred("JTSJOL", "level", 0.001),
})
# fallback FRED per il tasso Fed se BIS non risponde
FRED_RATE_FALLBACK = {"USD": "DFEDTARU", "EUR": "ECBDFR"}

# ---------------------------------------------------------------- scoring
SEASON_HORIZON_DAYS = 30     # finestra stagionale guardata in avanti
SEASON_YEARS = 10
HISTORY_WEEKS = 104          # storico dello score (settimanale)
PRICE_START = "2005-01-01"
