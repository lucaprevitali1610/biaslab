"""Calendario economico Forex Factory tramite Apify.

Ogni dato pubblicato arriva con valore attuale, previsione e precedente.
Gli eventi vengono accumulati in un archivio (site/data/calendar.json) così
ogni aggiornamento scarica solo gli ultimi giorni e costa pochissimo.

Serve il secret APIFY_TOKEN. Senza token il sito usa FRED/OECD come prima.
"""
import json
import logging
import math
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

import config as C

log = logging.getLogger("calendar")
ACTOR = os.environ.get("APIFY_ACTOR", "xtracto~forexfactory-calendar")
BACKFILL_DAYS = 150          # primo download: ~5 mesi di storico (una tantum)
MAX_GAP_DAYS = 30            # se il sito è rimasto fermo, recupera al massimo 30 giorni
STALE_DAYS = 200             # oltre questa età un dato non viene più usato
MIN_IMPACT = "low"           # anche i dati a "basso impatto" (molti PMI, disoccupazione, CPI nazionali)

# --------------------------------------------------------------------------------
# nome dell'evento su Forex Factory -> indicatore del sito (prima regola = priorità)
CAL_MAP = {
    "USD": {
        "gdp": [r"(advance|prelim|final) gdp q/q"],
        "mpmi": [r"ism manufacturing pmi"],
        "spmi": [r"ism services pmi"],
        "retail": [r"retail sales m/m"],
        "cci": [r"cb consumer confidence", r"(prelim |revised )?uom consumer sentiment"],
        "cpi": [r"cpi y/y"],
        "core": [r"core cpi m/m"],
        "ppi": [r"ppi m/m"],
        "pce": [r"core pce price index m/m"],
        "rate": [r"federal funds rate"],
        "nfp": [r"non-farm employment change"],
        "unemp": [r"unemployment rate"],
        "claims": [r"unemployment claims"],
        "adp": [r"adp non-farm employment change"],
        "wages": [r"average hourly earnings m/m", r"employment cost index q/q"],
        "jolts": [r"jolts job openings"],
    },
    "EUR": {
        "gdp": [r"(prelim |revised |final )?(flash )?gdp q/q"],
        "mpmi": [r"(hcob )?flash manufacturing pmi"],
        "spmi": [r"(hcob )?flash services pmi"],
        "retail": [r"retail sales m/m"],
        "cci": [r"consumer confidence"],
        "cpi": [r"cpi flash estimate y/y", r"final cpi y/y"],
        "core": [r"core cpi flash estimate y/y", r"final core cpi y/y"],
        "ppi": [r"ppi m/m"],
        "rate": [r"main refinancing rate"],
        "unemp": [r"unemployment rate"],
    },
    "GBP": {
        "gdp": [r"prelim gdp q/q", r"(final|revised) gdp q/q", r"gdp m/m"],
        "mpmi": [r"(s&p global )?flash manufacturing pmi"],
        "spmi": [r"(s&p global )?flash services pmi"],
        "retail": [r"retail sales m/m"],
        "cci": [r"gfk consumer confidence"],
        "cpi": [r"cpi y/y"],
        "core": [r"core cpi y/y"],
        "ppi": [r"ppi output m/m"],
        "rate": [r"official bank rate"],
        "claims": [r"claimant count change"],
        "unemp": [r"unemployment rate"],
        "wages": [r"average earnings index 3m/y"],
    },
    "JPY": {
        "gdp": [r"prelim gdp q/q", r"final gdp q/q"],
        "mpmi": [r"(au jibun bank )?flash manufacturing pmi"],
        "spmi": [r"(au jibun bank )?flash services pmi"],
        "retail": [r"retail sales y/y"],
        "cci": [r"consumer confidence"],
        "cpi": [r"national core cpi y/y"],
        "core": [r"tokyo core cpi y/y"],
        "ppi": [r"ppi y/y"],
        "rate": [r"boj policy rate"],
        "unemp": [r"unemployment rate"],
        "wages": [r"average cash earnings y/y"],
    },
    "CHF": {
        "gdp": [r"gdp q/q"],
        "mpmi": [r"(procure\.ch )?manufacturing pmi"],
        "spmi": [r"(procure\.ch )?services pmi"],
        "retail": [r"retail sales y/y"],
        "cci": [r"consumer climate"],
        "cpi": [r"cpi y/y", r"cpi m/m"],
        "ppi": [r"ppi m/m"],
        "rate": [r"snb policy rate"],
        "unemp": [r"unemployment rate"],
    },
    "CAD": {
        "gdp": [r"gdp m/m"],
        "mpmi": [r"(s&p global )?manufacturing pmi"],
        "spmi": [r"ivey pmi"],
        "retail": [r"retail sales m/m"],
        "cpi": [r"cpi y/y", r"cpi m/m"],
        "core": [r"median cpi y/y", r"trimmed cpi y/y", r"common cpi y/y"],
        "ppi": [r"ippi m/m"],
        "rate": [r"overnight rate"],
        "nfp": [r"employment change"],
        "unemp": [r"unemployment rate"],
    },
    "AUD": {
        "gdp": [r"gdp q/q"],
        "mpmi": [r"(s&p global )?flash manufacturing pmi"],
        "spmi": [r"(s&p global )?flash services pmi"],
        "retail": [r"retail sales m/m"],
        "cci": [r"westpac consumer sentiment"],
        "cpi": [r"cpi y/y", r"monthly cpi indicator y/y", r"cpi m/m", r"cpi q/q"],
        "core": [r"trimmed mean cpi (q/q|m/m|y/y)"],
        "ppi": [r"ppi q/q"],
        "rate": [r"cash rate"],
        "nfp": [r"employment change"],
        "unemp": [r"unemployment rate"],
        "wages": [r"wage price index q/q"],
    },
    "NZD": {
        "gdp": [r"gdp q/q"],
        "mpmi": [r"business nz manufacturing index"],
        "spmi": [r"business nz services index"],
        "retail": [r"retail sales q/q"],
        "cci": [r"anz-roy morgan consumer confidence"],
        "cpi": [r"cpi q/q"],
        "ppi": [r"ppi input q/q"],
        "rate": [r"official cash rate"],
        "nfp": [r"employment change q/q"],
        "unemp": [r"unemployment rate"],
        "wages": [r"labor cost index q/q"],
    },
}
_RX = {cur: {ind: [re.compile("^" + p + "$", re.I) for p in pats] for ind, pats in m.items()}
       for cur, m in CAL_MAP.items()}

STORE_FILE = "calendar.json"


# --------------------------------------------------------------------------------
def parse_num(s):
    """'175K' -> 175000, '2.4%' -> 2.4, '-0.3%' -> -0.3, '' -> None"""
    if s is None:
        return None
    t = str(s).strip().replace(",", "").replace("−", "-")
    if not t:
        return None
    m = re.match(r"^[<>~]?\s*(-?\d+(?:\.\d+)?)\s*([KMBT%]?)", t, re.I)
    if not m:
        return None
    v = float(m.group(1))
    mult = {"K": 1e3, "M": 1e6, "B": 1e9, "T": 1e12}.get(m.group(2).upper(), 1)
    return v * mult


def match(cur, title):
    for ind, rxs in _RX.get(cur, {}).items():
        for i, rx in enumerate(rxs):
            if rx.match(title.strip()):
                return ind, i
    return None, None


# --------------------------------------------------------------------------------
def _apify(input_, token, max_wait=900):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.post(f"https://api.apify.com/v2/acts/{ACTOR}/runs", params={"waitForFinish": 60},
                      headers=h, data=json.dumps(input_), timeout=90)
    r.raise_for_status()
    run = r.json()["data"]
    t0 = time.time()
    while run["status"] in ("READY", "RUNNING") and time.time() - t0 < max_wait:
        r = requests.get(f"https://api.apify.com/v2/actor-runs/{run['id']}", params={"waitForFinish": 60},
                         headers=h, timeout=90)
        r.raise_for_status()
        run = r.json()["data"]
    if run["status"] != "SUCCEEDED":
        raise RuntimeError(f"run Apify {run['status']}")
    r = requests.get(f"https://api.apify.com/v2/datasets/{run['defaultDatasetId']}/items",
                     params={"clean": "true", "format": "json"}, headers=h, timeout=120)
    r.raise_for_status()
    return r.json()


def _norm(item):
    ts = item.get("dateline")
    if ts is None and item.get("datetimeISO"):
        ts = pd.Timestamp(item["datetimeISO"]).timestamp()
    cur = (item.get("currency") or item.get("country") or "").upper()
    title = (item.get("title") or "").strip()
    if not ts or cur not in C.CURRENCIES or not title:
        return None
    eid = str(item.get("id") or f"{cur}|{title}|{int(ts)}")
    return {"id": eid, "cur": cur, "title": title, "ts": int(float(ts)), "imp": (item.get("impact") or "")[:1],
            "a": item.get("actual") or "", "f": item.get("forecast") or "", "p": item.get("previous") or "",
            "r": item.get("revision") or ""}


def _load_store(paths, pages_url):
    for p in paths:
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                pass
    if pages_url:
        try:
            r = requests.get(pages_url.rstrip("/") + "/data/" + STORE_FILE, timeout=30)
            if r.status_code == 200:
                log.info("archivio calendario recuperato dal sito pubblicato")
                return r.json()
        except Exception as e:
            log.info("archivio dal sito non disponibile: %s", e)
    return {"events": {}, "last_fetch": None}


def update(site_data_dir, cache_dir):
    """Scarica i nuovi eventi e restituisce l'archivio completo (dict)."""
    token = os.environ.get("APIFY_TOKEN", "").strip()
    out_file = Path(site_data_dir) / STORE_FILE
    cache_file = Path(cache_dir) / STORE_FILE
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    pages_url = os.environ.get("PAGES_URL") or (
        f"https://{repo.split('/')[0].lower()}.github.io/{repo.split('/')[1]}" if "/" in repo else None)
    store = _load_store([cache_file, out_file], pages_url)
    store.setdefault("events", {})
    if not token:
        log.info("APIFY_TOKEN assente: calendario non aggiornato")
        return store if store["events"] else None
    today = datetime.now(timezone.utc).date()
    if store.get("impact") != MIN_IMPACT:
        store["last_fetch"] = None  # filtro cambiato: riscarica lo storico una volta
    if store.get("last_fetch") and store["events"]:
        last = datetime.strptime(store["last_fetch"], "%Y-%m-%d").date()
        # riscarica dal giorno dell'ultimo download (prende i dati usciti dopo) fino a oggi
        start = max(last, today - timedelta(days=MAX_GAP_DAYS))
    else:
        start = today - timedelta(days=BACKFILL_DAYS)
        log.info("primo download del calendario: %d giorni", BACKFILL_DAYS)
    inp = {"dateRange": "range", "rangeFrom": start.isoformat(), "rangeTo": today.isoformat(),
           "currencies": C.CURRENCIES, "minImpact": MIN_IMPACT, "upcomingOnly": False, "maxItems": 0}
    try:
        items = _apify(inp, token)
        n_new = 0
        for it in items:
            e = _norm(it)
            if e:
                n_new += e["id"] not in store["events"]
                store["events"][e["id"]] = e
        store["last_fetch"] = today.isoformat()
        store["impact"] = MIN_IMPACT
        log.info("calendario: %d eventi ricevuti (%d nuovi), archivio %d", len(items), n_new, len(store["events"]))
    except Exception as e:
        log.warning("calendario Apify non disponibile: %s (uso l'archivio esistente)", e)
    # pulizia: tieni ~2 anni
    cutoff = time.time() - 760 * 86400
    store["events"] = {k: v for k, v in store["events"].items() if v["ts"] >= cutoff}
    txt = json.dumps(store, separators=(",", ":"))
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(txt)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(txt)
    return store


# --------------------------------------------------------------------------------
def build_series(store):
    """{(cur, ind): [gruppo0_eventi, gruppo1_eventi, ...]} con eventi già pubblicati, ordinati."""
    if not store:
        return {}, []
    groups, unmapped = {}, {}
    now = time.time()
    for e in store["events"].values():
        ind, gi = match(e["cur"], e["title"])
        if ind is None:
            if e["ts"] < now and parse_num(e["a"]) is not None:
                k = (e["cur"], e["title"])
                unmapped[k] = unmapped.get(k, 0) + 1
            continue
        a = parse_num(e["a"])
        if a is None:
            continue
        g = groups.setdefault((e["cur"], ind), {}).setdefault(gi, [])
        g.append(dict(e, an=a, fn=parse_num(e["f"]), pn=parse_num(e["r"] or e["p"])))
    out = {}
    for k, gs in groups.items():
        out[k] = {gi: sorted(evs, key=lambda x: x["ts"]) for gi, evs in gs.items()}
    um = sorted([{"cur": c, "title": t, "n": n} for (c, t), n in unmapped.items()], key=lambda x: -x["n"])
    return out, um


def _surprise(e):
    base = e["fn"] if e["fn"] is not None else e["pn"]
    return None if base is None else e["an"] - base


def score(ind, groups, as_of=None, invert=False):
    """Punteggio dell'ultimo dato pubblicato prima di as_of."""
    lim = (pd.Timestamp(as_of).timestamp() + 86399) if as_of is not None else time.time()
    best, bg = None, None
    for gi, evs in groups.items():
        for e in evs:
            if e["ts"] <= lim and (best is None or e["ts"] > best["ts"]):
                best, bg = e, gi
    if best is None or lim - best["ts"] > STALE_DAYS * 86400:
        return None
    e = best
    if ind == "rate":
        if e["pn"] is not None and abs(e["an"] - e["pn"]) > 1e-9:
            sc = int(2 * np.sign(e["an"] - e["pn"]))
        elif e["fn"] is not None and abs(e["an"] - e["fn"]) > 1e-9:
            sc = int(np.sign(e["an"] - e["fn"]))
        else:
            sc = 0
        s = None if e["fn"] is None else e["an"] - e["fn"]
    else:
        s = _surprise(e)
        if s is None:
            return None
        hist = [_surprise(x) for x in groups[bg] if x["ts"] < e["ts"]][-24:]
        hist = [abs(h) for h in hist if h is not None and abs(h) > 0]
        scale = 1.4826 * float(np.median(hist)) if len(hist) >= 5 else None
        if scale:
            z = s / scale
            sc = 0 if abs(z) < .3 else (int(np.sign(z)) if abs(z) < 1.5 else int(2 * np.sign(z)))
        else:
            sc = 0 if abs(s) < 1e-12 else int(np.sign(s))
        if invert:
            sc = -sc
    d = datetime.fromtimestamp(e["ts"], timezone.utc).strftime("%Y-%m-%d")
    return {"score": sc, "actual": e["an"], "previous": e["pn"], "forecast": e["fn"], "surprise": s,
            "actual_s": e["a"], "forecast_s": e["f"] or None, "previous_s": (e["r"] or e["p"]) or None,
            "released": d, "period": d, "title": e["title"], "source": "Forex Factory"}
