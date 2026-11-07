"""Punto di ingresso: scarica i dati e rigenera site/data/.

    python pipeline/build.py           # dati reali (richiede internet)
    python pipeline/build.py --demo    # dati sintetici di prova
"""
import argparse
import logging
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import compute  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true", help="usa dati sintetici")
    ap.add_argument("--out", default=str(ROOT / "site" / "data"))
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    today = date.today()

    if args.demo:
        import demo
        prices, cot, macro = demo.demo_prices(today), demo.demo_cot(today), demo.demo_macro(today)
    else:
        import fetch
        tickers = [i["ticker"] for i in compute.instrument_list()]
        prices = fetch.fetch_prices(tickers)
        logging.info("prezzi: %d/%d strumenti", len(prices), len(tickers))
        cot = fetch.fetch_cot()
        logging.info("COT: %d mercati", len(cot))
        macro = fetch.fetch_macro()
        logging.info("macro: %d serie", len(macro))
        if not prices and not cot and not macro:
            logging.error("nessun dato scaricato: interrompo per non sovrascrivere i dati esistenti")
            sys.exit(1)

    calendar = demo.demo_calendar(today) if args.demo else None
    if not args.demo:
        import calendar_ff
        calendar = calendar_ff.update(args.out, fetch.CACHE / "store")
    errors = {} if args.demo else fetch.ERRORS
    board = compute.build(prices, cot, macro, args.out, demo=args.demo, errors=errors, calendar=calendar)
    n = len(board["instruments"])
    logging.info("scritti %d strumenti in %s", n, args.out)


if __name__ == "__main__":
    main()
