"""Scarica i dati grezzi: prezzi (Yahoo), COT (CFTC), macro (FRED, OECD, BIS).

Ogni funzione è tollerante agli errori: se una serie non arriva viene
segnalata nel log e il sito mostrerà "—" al suo posto.
"""
import io
import json
import logging
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

import config as C

log = logging.getLogger("fetch")
UA = {"User-Agent": "Mozilla/5.0 (BiasLab data pipeline)"}
CACHE = Path(__file__).resolve().parent / ".cache"
CACHE.mkdir(exist_ok=True)


def _get(url, params=None, headers=None, tries=3, timeout=60):
    h = dict(UA)
    h.update(headers or {})
    last = None
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers=h, timeout=timeout)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:  # pragma: no cover
            last = str(e)
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"{url}: {last}")


# ------------------------------------------------------------------ prezzi
def fetch_prices(tickers):
    """Restituisce {ticker: pd.Series(close)} con storico giornaliero."""
    out = {}
    try:
        import yfinance as yf
        df = yf.download(list(tickers), start=C.PRICE_START, interval="1d",
                         auto_adjust=False, progress=False, threads=True, group_by="column")
        close = df["Close"] if isinstance(df.columns, pd.MultiIndex) else df[["Close"]]
        for t in tickers:
            if t in close:
                s = close[t].dropna()
                if len(s) > 50:
                    out[t] = s
    except Exception as e:
        log.warning("yfinance fallito: %s", e)
    missing = [t for t in tickers if t not in out]
    for t in missing:  # fallback: API chart di Yahoo
        try:
            r = _get(f"https://query2.finance.yahoo.com/v8/finance/chart/{t}",
                     params={"range": "max", "interval": "1d"})
            res = r.json()["chart"]["result"][0]
            s = pd.Series(res["indicators"]["quote"][0]["close"],
                          index=pd.to_datetime(res["timestamp"], unit="s").normalize()).dropna()
            s = s[s.index >= C.PRICE_START]
            if len(s) > 50:
                out[t] = s
        except Exception as e:
            log.warning("prezzo %s non disponibile: %s", t, e)
    return out


# ------------------------------------------------------------------ COT
def _pick(row, names):
    for n in names:
        if n in row and row[n] not in (None, ""):
            try:
                return float(row[n])
            except ValueError:
                pass
    return np.nan


TFF_GROUPS = [  # (nome, campi long, campi short)
    ("Asset manager", ["asset_mgr_positions_long", "asset_mgr_positions_long_all"],
     ["asset_mgr_positions_short", "asset_mgr_positions_short_all"]),
    ("Leveraged funds", ["lev_money_positions_long", "lev_money_positions_long_all"],
     ["lev_money_positions_short", "lev_money_positions_short_all"]),
    ("Dealer", ["dealer_positions_long_all", "dealer_positions_long"],
     ["dealer_positions_short_all", "dealer_positions_short"]),
]
DISAGG_GROUPS = [
    ("Managed money", ["m_money_positions_long_all", "m_money_positions_long"],
     ["m_money_positions_short_all", "m_money_positions_short"]),
    ("Produttori", ["prod_merc_positions_long", "prod_merc_positions_long_all"],
     ["prod_merc_positions_short", "prod_merc_positions_short_all"]),
    ("Swap dealer", ["swap_positions_long_all", "swap_positions_long"],
     ["swap__positions_short_all", "swap_positions_short_all", "swap_positions_short"]),
]


def _cot_dataset(dataset, codes, groups, start):
    quoted = ",".join(f"'{c}'" for c in codes)
    params = {"$where": f"cftc_contract_market_code in({quoted}) AND report_date_as_yyyy_mm_dd >= '{start}'",
              "$limit": 50000, "$order": "report_date_as_yyyy_mm_dd"}
    rows = _get(f"https://publicreporting.cftc.gov/resource/{dataset}.json", params=params).json()
    by_code = {}
    for r in rows:
        code = r.get("cftc_contract_market_code", "").strip()
        if code not in codes:
            continue
        rec = {"date": pd.Timestamp(r["report_date_as_yyyy_mm_dd"][:10]),
               "oi": _pick(r, ["open_interest_all"])}
        for i, (_, lk, sk) in enumerate(groups):
            rec[f"g{i}_long"] = _pick(r, lk)
            rec[f"g{i}_short"] = _pick(r, sk)
        by_code.setdefault(code, []).append(rec)
    out = {}
    for code, recs in by_code.items():
        df = pd.DataFrame(recs).drop_duplicates("date").set_index("date").sort_index()
        out[code] = {"groups": [g[0] for g in groups], "df": df}
    return out


def fetch_cot(start="2015-01-01"):
    fin_codes = sorted(set(C.COT_CURRENCY.values()) | {v[2] for v in C.INDICES.values() if v[2]})
    com_codes = [v[2] for v in C.COMMODITIES.values()]
    out = {}
    for ds, codes, groups in [(C.COT_TFF_DATASET, fin_codes, TFF_GROUPS),
                              (C.COT_DISAGG_DATASET, com_codes, DISAGG_GROUPS)]:
        try:
            out.update(_cot_dataset(ds, codes, groups, start))
        except Exception as e:
            log.warning("COT %s non disponibile: %s", ds, e)
    for c in fin_codes + com_codes:
        if c not in out:
            log.warning("COT: nessun dato per il codice %s", c)
    return out


# ------------------------------------------------------------------ macro
def _transform(s, how, scale=1.0):
    s = s.dropna().astype(float) * scale
    if how == "mom":
        return (s.pct_change() * 100).dropna()
    if how == "yoy":
        per = 12 if (s.index.to_series().diff().dt.days.median() or 30) < 45 else 4
        return (s.pct_change(per) * 100).dropna()
    if how == "diff":
        return s.diff().dropna()
    return s


def _fred(sid):
    r = _get("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": sid, "cosd": "2005-01-01"})
    df = pd.read_csv(io.StringIO(r.text))
    df.columns = ["date", "value"]
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df.dropna().set_index(pd.to_datetime(df.dropna()["date"]))["value"]


_oecd_cache = {}


def _oecd_flow(flow):
    if flow in _oecd_cache:
        return _oecd_cache[flow]
    f = CACHE / (flow.replace(",", "_").replace("@", "_") + ".csv")
    if f.exists() and time.time() - f.stat().st_mtime < 6 * 3600:
        text = f.read_text()
    else:
        url = f"https://sdmx.oecd.org/public/rest/data/{flow},/all"
        r = _get(url, params={"startPeriod": "2012", "dimensionAtObservation": "AllDimensions"},
                 headers={"Accept": "application/vnd.sdmx.data+csv; charset=utf-8"}, timeout=180)
        text = r.text
        f.write_text(text)
    df = pd.read_csv(io.StringIO(text), dtype=str)
    _oecd_cache[flow] = df
    return df


def _period_to_date(p):
    p = str(p)
    if "-Q" in p:
        y, q = p.split("-Q")
        return pd.Timestamp(int(y), int(q) * 3, 1) + pd.offsets.MonthEnd(0)
    if len(p) == 7:
        return pd.Timestamp(p + "-01") + pd.offsets.MonthEnd(0)
    return pd.Timestamp(p)


def _oecd(spec, areas):
    df = _oecd_flow(spec["flow"])
    area = next((a for a in areas if (df.get("REF_AREA") == a).any()), None)
    if area is None:
        raise RuntimeError(f"area {areas} assente")
    d = df[df["REF_AREA"] == area]
    freqs = None
    for k, v in spec["filters"].items():
        if k not in d.columns:
            continue
        vals = v if isinstance(v, list) else [v]
        if k == "FREQ":
            freqs = vals
            d = d[d[k].isin(vals)]
            continue
        if d[k].isin(vals).any():
            d = d[d[k].isin(vals)]
        else:
            log.info("OECD %s: filtro %s=%s ignorato (valori: %s)", spec["flow"], k, v,
                     sorted(d[k].dropna().unique())[:8])
    if d.empty:
        raise RuntimeError("nessuna riga dopo i filtri")
    if freqs and "FREQ" in d.columns:  # preferisci la prima frequenza disponibile
        for fq in freqs:
            if (d["FREQ"] == fq).any():
                d = d[d["FREQ"] == fq]
                break
    dims = [c for c in d.columns if c not in ("TIME_PERIOD", "OBS_VALUE", "OBS_STATUS", "UNIT_MULT",
                                               "DECIMALS", "DATAFLOW", "STRUCTURE", "STRUCTURE_ID",
                                               "ACTION", "BASE_PER", "CONF_STATUS", "OBS_STATUS_2")]
    best = None
    for _, g in d.groupby(dims, dropna=False):
        s = pd.Series(pd.to_numeric(g["OBS_VALUE"], errors="coerce").values,
                      index=[_period_to_date(p) for p in g["TIME_PERIOD"]]).dropna().sort_index()
        if best is None or (len(s) and s.index[-1] > best.index[-1]) or \
                (len(s) and s.index[-1] == best.index[-1] and len(s) > len(best)):
            best = s
    return best


def _bis(area):
    for url in [f"https://stats.bis.org/api/v1/data/WS_CBPOL/M.{area}",
                f"https://stats.bis.org/api/v1/data/BIS,WS_CBPOL,1.0/M.{area}"]:
        try:
            r = _get(url, params={"startPeriod": "2010", "format": "csv"}, tries=2)
            df = pd.read_csv(io.StringIO(r.text))
            col_t = next(c for c in df.columns if c.upper() == "TIME_PERIOD")
            col_v = next(c for c in df.columns if c.upper() == "OBS_VALUE")
            s = pd.Series(pd.to_numeric(df[col_v], errors="coerce").values,
                          index=[_period_to_date(p) for p in df[col_t]]).dropna().sort_index()
            if len(s):
                return s
        except Exception as e:
            last = e
    raise RuntimeError(f"BIS {area}: {last}")


def fetch_macro():
    """{(valuta, indicatore): {"series": pd.Series, "source": str}}"""
    out = {}
    for (cur, ind), spec in C.MACRO_SOURCES.items():
        try:
            if spec["src"] == "fred":
                raw = _fred(spec["id"])
                s = _transform(raw, spec["transform"], spec.get("scale", 1.0))
                if ind == "claims":  # settimanale -> media mobile 4 settimane
                    s = s.rolling(4).mean().dropna()
                src = f"FRED {spec['id']}"
            elif spec["src"] == "oecd":
                s = _transform(_oecd(spec, C.OECD_AREA[cur]), spec["transform"])
                src = "OECD " + spec["flow"].split("@")[-1]
            elif spec["src"] == "bis":
                try:
                    s = _bis(spec["area"])
                    src = "BIS policy rates"
                except Exception:
                    fid = C.FRED_RATE_FALLBACK.get(cur)
                    if not fid:
                        raise
                    s = _fred(fid).resample("ME").last().dropna()
                    src = f"FRED {fid}"
            else:
                continue
            if s is None or len(s) < 3:
                raise RuntimeError("serie troppo corta")
            out[(cur, ind)] = {"series": s.sort_index(), "source": src}
        except Exception as e:
            log.warning("macro %s/%s non disponibile: %s", cur, ind, e)
    return out
