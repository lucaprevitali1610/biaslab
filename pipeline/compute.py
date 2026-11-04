"""Calcolo dei punteggi e scrittura dei file JSON letti dal sito."""
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

import config as C

IND = {i["id"]: i for i in C.INDICATORS}


def _clip(x, lo, hi):
    return max(lo, min(hi, x))


def _r(x, nd=4):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return float(round(x, nd))


def _sig(x, sig=6):
    if x is None or not np.isfinite(x):
        return None
    if x == 0:
        return 0.0
    return float(round(x, sig - int(math.floor(math.log10(abs(x)))) - 1))


# ================================================================== macro
def _available(s, lag, as_of):
    if as_of is None:
        return s
    return s[s.index + pd.Timedelta(days=lag) <= as_of]


def indicator_score(ind_id, s, as_of=None):
    meta = IND[ind_id]
    a = _available(s, meta["lag"], as_of)
    if len(a) < 3:
        return None
    if ind_id == "rate":
        # ultimo movimento negli ultimi ~6 mesi
        recent = a[a.index >= a.index[-1] - pd.Timedelta(days=183)]
        moves = recent.diff().dropna()
        moves = moves[moves.abs() > 1e-9]
        prev = a[a.index < a.index[-1]]
        prev_val = float(a.iloc[-2])
        changed = a[a.diff().abs() > 1e-9]
        if len(changed):
            prev_val = float(a[a.index < changed.index[-1]].iloc[-1]) if (a.index < changed.index[-1]).any() else prev_val
        if moves.empty:
            sc = 0
        else:
            last = np.sign(moves.iloc[-1])
            same = int((np.sign(moves) == last).sum())
            sc = int(last * (2 if same >= 2 else 1))
        return {"score": sc, "actual": _r(a.iloc[-1], 3), "previous": _r(prev_val, 3),
                "period": a.index[-1].strftime("%Y-%m")}
    latest, prev = float(a.iloc[-1]), float(a.iloc[-2])
    diffs = a.diff().dropna().iloc[-60:]
    # volatilità robusta: la mediana ignora i picchi estremi (es. Covid 2020)
    if len(diffs) > 5:
        mad = float((diffs - diffs.median()).abs().median()) * 1.4826
        sd = mad if mad > 1e-9 else float(diffs.std())
    else:
        sd = abs(prev) * 0.05
    sd = sd or 1.0
    z = (latest - prev) / sd
    if meta.get("invert"):
        z = -z
    if abs(z) < 0.25:
        sc = 0
    elif abs(z) < 1.0:
        sc = int(np.sign(z))
    else:
        sc = int(2 * np.sign(z))
    idx = a.index[-1]
    freq_q = (a.index.to_series().diff().dt.days.median() or 30) > 60
    period = f"{idx.year}-Q{(idx.month - 1) // 3 + 1}" if freq_q else idx.strftime("%Y-%m")
    if (idx.to_period("W").start_time == idx.normalize()) or (a.index.to_series().diff().dt.days.median() or 30) < 10:
        period = idx.strftime("%Y-%m-%d")
    return {"score": sc, "actual": _r(latest, 3), "previous": _r(prev, 3), "period": period}


def currency_macro(macro, cur, as_of=None):
    inds = {}
    for meta in C.INDICATORS:
        item = macro.get((cur, meta["id"]))
        res = indicator_score(meta["id"], item["series"], as_of) if item else None
        if res and as_of is None:
            res["source"] = item["source"]
        inds[meta["id"]] = res
    cats = {}
    for cid, _ in C.CATEGORIES:
        vals = [inds[m["id"]]["score"] for m in C.INDICATORS if m["cat"] == cid and inds[m["id"]]]
        cats[cid] = int(_clip(round(float(np.mean(vals))), -2, 2)) if vals else 0
    return {"ind": inds, "cats": cats, "total": int(sum(cats.values()))}


# ================================================================== COT
def cot_net(entry):
    df = entry["df"]
    if entry["groups"][0] == "Asset manager":  # TFF: asset manager + leveraged funds
        net = (df["g0_long"] - df["g0_short"]).fillna(0) + (df["g1_long"] - df["g1_short"]).fillna(0)
    else:
        net = df["g0_long"] - df["g0_short"]
    return net.dropna()


def cot_score(entry, as_of=None):
    if not entry:
        return None
    net = cot_net(entry)
    if as_of is not None:
        net = net[net.index + pd.Timedelta(days=3) <= as_of]
    if len(net) < 10:
        return None
    ch4 = net.diff(4).dropna()
    sd = float(ch4.iloc[-104:].std()) or 1.0
    z = float(ch4.iloc[-1]) / sd
    sc = 0 if abs(z) < 0.3 else (int(np.sign(z)) if abs(z) < 1 else int(2 * np.sign(z)))
    w = net.iloc[-156:]
    pct = float((w < net.iloc[-1]).mean() * 100)
    return {"score": sc, "net": float(net.iloc[-1]), "chg_1w": float(net.iloc[-1] - net.iloc[-2]),
            "chg_4w": float(ch4.iloc[-1]), "pctile": round(pct), "date": net.index[-1].strftime("%Y-%m-%d")}


# ================================================================== stagionalità
def season_stats(px, as_of, years=C.SEASON_YEARS, horizon=C.SEASON_HORIZON_DAYS):
    if px is None or len(px) < 400:
        return None
    rets = []
    idx = px.index.values
    vals = px.values
    for k in range(1, years + 1):
        start = as_of - pd.DateOffset(years=k)
        end = start + pd.Timedelta(days=horizon)
        if end > px.index[-1] or start < px.index[0]:
            continue
        ia = idx.searchsorted(np.datetime64(start))
        ib = idx.searchsorted(np.datetime64(end))
        if ib >= len(vals):
            continue
        rets.append(float(vals[ib] / vals[ia] - 1) * 100)
    if len(rets) < max(3, years // 2):
        return None
    wr = float(np.mean([r > 0 for r in rets]))
    avg = float(np.mean(rets))
    sc = 0
    if wr >= 0.7 and avg > 0:
        sc = 2
    elif wr >= 0.6 and avg > 0:
        sc = 1
    elif wr <= 0.3 and avg < 0:
        sc = -2
    elif wr <= 0.4 and avg < 0:
        sc = -1
    return {"score": sc, "winrate": round(wr * 100), "avg": round(avg, 2), "n": len(rets)}


# ================================================================== strumenti
def bias_label(total, mx):
    r = total / mx if mx else 0
    if r >= 0.35:
        return "Molto rialzista"
    if r >= 0.12:
        return "Rialzista"
    if r <= -0.35:
        return "Molto ribassista"
    if r <= -0.12:
        return "Ribassista"
    return "Neutrale"


def instrument_list():
    out = []
    for p in C.MAJORS:
        out.append({"id": p, "type": "major", "name": f"{p[:3]}/{p[3:]}", "base": p[:3], "quote": p[3:],
                    "ticker": C.fx_ticker(p)})
    for p in C.CROSSES:
        out.append({"id": p, "type": "cross", "name": f"{p[:3]}/{p[3:]}", "base": p[:3], "quote": p[3:],
                    "ticker": C.fx_ticker(p)})
    for k, (n, t, code, cur) in C.INDICES.items():
        out.append({"id": k, "type": "index", "name": n, "ticker": t, "cot": code, "ccy": cur})
    for k, (n, t, code) in C.COMMODITIES.items():
        out.append({"id": k, "type": "commodity", "name": n, "ticker": t, "cot": code, "ccy": "USD"})
    return out


MAX_FX = 16 + 4 + 2
MAX_OTHER = 2 + 2


def score_instrument(inst, cm, cc, season):
    """cm: macro per valuta; cc: cot per valuta/codice; season: dict o None."""
    s_season = season["score"] if season else 0
    if inst["type"] in ("major", "cross"):
        b, q = inst["base"], inst["quote"]
        macro = cm[b]["total"] - cm[q]["total"]
        cb = (cc.get(b) or {}).get("score", 0)
        cq = (cc.get(q) or {}).get("score", 0)
        cot = int(_clip(cb - cq, -4, 4))
        total = macro + cot + s_season
        return {"total": int(total), "max": MAX_FX, "macro": int(macro), "cot": cot, "season": s_season}
    cot = (cc.get(inst["cot"]) or {}).get("score", 0) if inst.get("cot") else 0
    total = cot + s_season
    return {"total": int(total), "max": MAX_OTHER, "macro": None, "cot": cot, "season": s_season}


def history_dates(end):
    end = pd.Timestamp(end).normalize()
    fri = end - pd.Timedelta(days=(end.weekday() - 4) % 7)
    return list(pd.date_range(end=fri, periods=C.HISTORY_WEEKS, freq="7D")) + ([end] if end > fri else [])


# ================================================================== build
def build(prices, cot, macro, out_dir, demo=False, now=None, errors=None):
    out = Path(out_dir)
    (out / "inst").mkdir(parents=True, exist_ok=True)
    now = pd.Timestamp(now or datetime.now(timezone.utc).date())
    insts = instrument_list()

    # ---- valute: macro + COT oggi
    cm = {c: currency_macro(macro, c) for c in C.CURRENCIES}
    cc = {}
    for c, code in C.COT_CURRENCY.items():
        cc[c] = cot_score(cot.get(code))
    for i in insts:
        if i.get("cot"):
            cc[i["cot"]] = cot_score(cot.get(i["cot"]))

    # ---- storico (settimanale) delle componenti per valuta
    hdates = history_dates(now)
    cm_hist = {d: {c: currency_macro(macro, c, d) for c in C.CURRENCIES} for d in hdates}
    cc_hist = {d: {k: cot_score(cot.get(code), d) for k, code in
                   list(C.COT_CURRENCY.items()) + [(i["cot"], i["cot"]) for i in insts if i.get("cot")]}
               for d in hdates}

    board = {"generated": datetime.now(timezone.utc).isoformat(timespec="minutes"), "demo": demo,
             "as_of": now.strftime("%Y-%m-%d"), "currencies": {}, "instruments": {}, "matrix": {}}
    for c in C.CURRENCIES:
        board["currencies"][c] = {"name": C.CURRENCY_NAMES[c], **cm[c], "cot": cc.get(c),
                                  "cot_code": C.COT_CURRENCY[c]}

    for inst in insts:
        px = prices.get(inst["ticker"])
        season = season_stats(px, now) if px is not None else None
        sc = score_instrument(inst, cm, cc, season)
        row = {k: inst[k] for k in ("type", "name") }
        row.update({k: inst.get(k) for k in ("base", "quote", "ccy") if inst.get(k)})
        if inst.get("cot"):
            row["cot_code"] = inst["cot"]
        row.update(sc)
        row["bias"] = bias_label(sc["total"], sc["max"])
        row["season_detail"] = season
        if inst["type"] in ("major", "cross"):
            b, q = inst["base"], inst["quote"]
            row["ind"] = {}
            for m in C.INDICATORS:
                ib, iq = cm[b]["ind"][m["id"]], cm[q]["ind"][m["id"]]
                row["ind"][m["id"]] = None if (ib is None and iq is None) else \
                    int(_clip((ib or {}).get("score", 0) - (iq or {}).get("score", 0), -2, 2))
            row["cats"] = {k: cm[b]["cats"][k] - cm[q]["cats"][k] for k, _ in C.CATEGORIES}
        # storico
        hist = {"d": [], "total": [], "macro": [], "cot": [], "season": []}
        for d in hdates:
            se = season_stats(px, d) if px is not None else None
            h = score_instrument(inst, cm_hist[d], cc_hist[d], se)
            hist["d"].append(d.strftime("%Y-%m-%d"))
            for k in ("total", "macro", "cot", "season"):
                hist[k].append(h[k])
        tot = hist["total"]
        row["spark"] = tot[-26:]
        row["chg"] = {"1w": tot[-1] - tot[-2] if len(tot) > 1 else 0,
                      "1m": tot[-1] - tot[-5] if len(tot) > 4 else 0,
                      "3m": tot[-1] - tot[-14] if len(tot) > 13 else 0}
        if px is not None and len(px) > 2:
            row["last"] = _sig(float(px.iloc[-1]))
            row["chg_1d"] = _r(float(px.iloc[-1] / px.iloc[-2] - 1) * 100, 2)
        board["instruments"][inst["id"]] = row

        detail = {"id": inst["id"], "history": hist}
        if px is not None:
            detail["prices"] = {"d": [x.strftime("%Y-%m-%d") for x in px.index],
                                "c": [_sig(float(v)) for v in px.values]}
        (out / "inst" / f"{inst['id']}.json").write_text(json.dumps(detail, separators=(",", ":")))

    # ---- matrice "ogni cross": riga = base, colonna = quotata
    for b in C.CURRENCIES:
        board["matrix"][b] = {}
        for q in C.CURRENCIES:
            if b == q:
                continue
            pid, inv = (b + q, 1) if (b + q) in board["instruments"] else (q + b, -1)
            r = board["instruments"].get(pid)
            board["matrix"][b][q] = r["total"] * inv if r else None

    (out / "board.json").write_text(json.dumps(board, separators=(",", ":")))

    # ---- COT completo per pagina posizionamento
    cot_out = {}
    for code, entry in cot.items():
        df = entry["df"].iloc[-160:]
        net_spec = cot_net(entry).reindex(df.index)
        cot_out[code] = {
            "name": C.COT_NAMES.get(code, code), "groups": entry["groups"],
            "d": [x.strftime("%Y-%m-%d") for x in df.index],
            "oi": [None if not np.isfinite(v) else int(v) for v in df["oi"]],
            "long": [[None if not np.isfinite(v) else int(v) for v in df[f"g{i}_long"]] for i in range(3)],
            "short": [[None if not np.isfinite(v) else int(v) for v in df[f"g{i}_short"]] for i in range(3)],
            "net_spec": [None if not np.isfinite(v) else int(v) for v in net_spec],
            "score": cot_score(entry),
        }
    (out / "cot.json").write_text(json.dumps(cot_out, separators=(",", ":")))

    status = []
    for (cur, ind), spec in C.MACRO_SOURCES.items():
        item = macro.get((cur, ind))
        sc_ = board["currencies"][cur]["ind"].get(ind)
        if item is not None:
            s_ = item["series"]
            status.append({"cur": cur, "ind": ind, "ok": sc_ is not None, "source": item["source"],
                           "last": s_.index[-1].strftime("%Y-%m-%d"), "n": int(len(s_)),
                           "error": None if sc_ is not None else "serie troppo corta per il confronto"})
        else:
            status.append({"cur": cur, "ind": ind, "ok": False, "source": spec.get("id") or spec.get("flow") or spec.get("area"),
                           "src": spec["src"], "error": (errors or {}).get((cur, ind), "non scaricato")})
    prices_ok = {i["id"]: i["ticker"] in prices for i in insts}
    cot_ok = {code: code in cot for code in set(C.COT_CURRENCY.values()) | {i["cot"] for i in insts if i.get("cot")}}

    meta = {
        "status": {"macro": status, "prices": prices_ok, "cot": cot_ok},
        "site": C.SITE_NAME, "demo": demo, "generated": board["generated"],
        "currencies": C.CURRENCIES, "currency_names": C.CURRENCY_NAMES,
        "groups": {"major": C.MAJORS, "cross": C.CROSSES, "index": list(C.INDICES), "commodity": list(C.COMMODITIES)},
        "indicators": C.INDICATORS, "categories": C.CATEGORIES,
        "cot_currency": C.COT_CURRENCY, "max_fx": MAX_FX, "max_other": MAX_OTHER,
        "season_horizon": C.SEASON_HORIZON_DAYS, "season_years": C.SEASON_YEARS,
    }
    (out / "meta.json").write_text(json.dumps(meta, separators=(",", ":"), ensure_ascii=False))
    return board
