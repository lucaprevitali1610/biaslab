"""Dati SINTETICI per provare il sito senza connessione. Non sono dati di mercato reali."""
import numpy as np
import pandas as pd

import config as C
from compute import instrument_list

FX_LEVEL = {"USD": 1.0, "EUR": 1.16, "GBP": 1.33, "AUD": 0.66, "NZD": 0.58,
            "CAD": 1 / 1.40, "CHF": 1 / 0.80, "JPY": 1 / 152.0}
OTHER_LEVEL = {"^GSPC": 6800, "^NDX": 25500, "^DJI": 47000, "^RUT": 2450, "^GDAXI": 24000,
               "^FTSE": 9700, "^N225": 51000, "GC=F": 4000, "SI=F": 48, "CL=F": 61, "HG=F": 5.1}


def demo_prices(end, seed=7):
    rng = np.random.default_rng(seed)
    days = pd.bdate_range(C.PRICE_START, end)
    n = len(days)
    doy = days.dayofyear.values
    # un "fattore" per valuta (contro un numerario) con stagionalità
    fac = {}
    for i, c in enumerate(C.CURRENCIES):
        if c == "USD":
            fac[c] = np.zeros(n)
            continue
        drift = rng.normal(0, 0.00005)
        seas = 0.0012 * np.sin(2 * np.pi * (doy + 40 * i) / 365.25)
        r = rng.normal(drift, 0.0055, n) + np.diff(np.concatenate([[0], seas]))
        fac[c] = np.cumsum(r)
    out = {}
    for inst in instrument_list():
        t = inst["ticker"]
        if inst["type"] in ("major", "cross"):
            b, q = inst["base"], inst["quote"]
            lvl = FX_LEVEL[b] / FX_LEVEL[q]
            x = fac[b] - fac[q]
            s = np.exp(x - x[-1]) * lvl
        else:
            lvl = OTHER_LEVEL[t]
            r = rng.normal(0.0003, 0.011, n) + 0.0006 * np.sin(2 * np.pi * (doy + rng.integers(0, 365)) / 365.25)
            x = np.cumsum(r)
            s = np.exp(x - x[-1]) * lvl
        out[t] = pd.Series(s, index=days)
    return out


def demo_cot(end, seed=11):
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp(end) - pd.Timedelta(days=3), periods=320, freq="W-TUE")
    out = {}
    codes = list(C.COT_CURRENCY.values()) + [v[2] for v in C.INDICES.values() if v[2]] + \
        [v[2] for v in C.COMMODITIES.values()]
    com = {v[2] for v in C.COMMODITIES.values()}
    for code in codes:
        oi = rng.uniform(60_000, 600_000)
        df = pd.DataFrame(index=dates)
        df["oi"] = oi * (1 + np.cumsum(rng.normal(0, 0.01, len(dates))) * 0.3)
        for g in range(3):
            base = rng.uniform(0.1, 0.35) * oi
            trend = np.cumsum(rng.normal(0, 0.03 * oi, len(dates)))
            trend = trend - trend.mean()
            df[f"g{g}_long"] = np.clip(base + np.maximum(trend, 0) * 0.6 + rng.normal(0, 0.01 * oi, len(dates)), 1000, None)
            df[f"g{g}_short"] = np.clip(base + np.maximum(-trend, 0) * 0.6 + rng.normal(0, 0.01 * oi, len(dates)), 1000, None)
        groups = ["Managed money", "Produttori", "Swap dealer"] if code in com else \
            ["Asset manager", "Leveraged funds", "Dealer"]
        out[code] = {"groups": groups, "df": df.round(0)}
    return out


DEMO_LEVEL = {"gdp": (0.4, 0.5), "mpmi": (50, 1.0), "spmi": (52, 1.0), "cci": (99.5, 1.2), "retail": (0.3, 0.6), "cpi": (2.6, 0.25), "core": (2.8, 0.2), "ppi": (2.2, 0.5),
              "pce": (2.8, 0.15), "rate": (3.0, 0.0), "nfp": (120, 70), "unemp": (4.3, 0.12),
              "claims": (225, 8), "adp": (90, 60), "wages": (3.8, 0.15), "jolts": (7.2, 0.25)}


def demo_macro(end, seed=5):
    rng = np.random.default_rng(seed)
    out = {}
    keys = list(C.MACRO_SOURCES) + [(c, "spmi") for c in C.CURRENCIES]
    for (cur, ind) in keys:
        if cur != "USD" and ind in ("ppi", "pce", "nfp", "claims", "adp", "wages", "jolts", "retail"):
            if rng.random() < 0.85:
                continue
        lvl, vol = DEMO_LEVEL[ind]
        if ind == "gdp":
            idx = pd.date_range("2015-03-31", end, freq="QE")[:-1]
        elif ind == "claims":
            idx = pd.date_range("2015-01-03", end, freq="W-SAT")[:-1]
        else:
            idx = pd.date_range("2015-01-31", end, freq="ME")[:-1]
        if ind == "rate":
            steps = rng.choice([0, 0, 0, 0, 0, 0, 0.25, -0.25], len(idx))
            v = np.clip(lvl + rng.normal(0, 1) + np.cumsum(steps), 0, 6)
        else:
            ar = np.zeros(len(idx))
            for k in range(1, len(idx)):
                ar[k] = 0.8 * ar[k - 1] + rng.normal(0, vol)
            v = lvl + ar
        out[(cur, ind)] = {"series": pd.Series(v, index=idx).round(3), "source": "DEMO"}
    return out


def demo_calendar(end, seed=3):
    """Eventi sintetici nel formato del calendario Forex Factory (solo per la demo)."""
    import calendar_ff as CF
    rng = np.random.default_rng(seed)
    end = pd.Timestamp(end)
    events = {}
    lv = {"gdp": (0.4, 0.3, "%"), "mpmi": (50, 1.2, ""), "spmi": (52, 1.2, ""), "retail": (0.3, 0.5, "%"),
          "cci": (95, 3, ""), "cpi": (2.8, 0.2, "%"), "core": (0.3, 0.1, "%"), "ppi": (0.2, 0.3, "%"),
          "pce": (0.2, 0.1, "%"), "rate": (3.0, 0, "%"), "nfp": (90, 60, "K"), "unemp": (4.3, 0.1, "%"),
          "claims": (220, 10, "K"), "adp": (80, 50, "K"), "wages": (0.3, 0.1, "%"), "jolts": (7.2, 0.3, "M")}
    for cur, m in CF.CAL_MAP.items():
        for ind, pats in m.items():
            title = pats[0].replace("(", "").replace(")", "").replace("?", "").replace("|", " ").replace("\\", "")
            title = " ".join(title.split()).replace("advance prelim final ", "").replace("flash prelim revised ", "")
            base, vol, u = lv[ind]
            step = 7 if ind == "claims" else 91 if ind in ("gdp",) else 30
            prev = base
            for k, d in enumerate(pd.date_range(end - pd.Timedelta(days=200), end, freq=f"{step}D")):
                if ind == "rate":
                    act = prev + rng.choice([0, 0, 0, 0.25, -0.25])
                    fc = act if rng.random() < .8 else prev
                else:
                    fc = prev + rng.normal(0, vol * .3)
                    act = fc + rng.normal(0, vol)
                fmt = (lambda v: f"{v:.1f}{u}") if u in ("%", "") else (lambda v: f"{v:.0f}{u}" if u == "K" else f"{v:.2f}{u}")
                ts = int((d + pd.Timedelta(hours=13, minutes=30)).timestamp())
                eid = f"demo-{cur}-{ind}-{k}"
                events[eid] = {"id": eid, "cur": cur, "title": title, "ts": ts, "imp": "H",
                               "a": fmt(act), "f": fmt(fc), "p": fmt(prev), "r": ""}
                prev = act
    return {"events": events, "last_fetch": end.strftime("%Y-%m-%d")}
