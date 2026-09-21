import datetime
from typing import Optional

import math
import random
import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

EXCHANGERATE_HOST = "https://api.exchangerate.host"
FRANKFURTER = "https://api.frankfurter.app"


def _validate_date(date_str: str) -> str:
    try:
        datetime.datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")


def _fetch_exchangerate_host_timeseries(base: str, symbols: str, start_date: str, end_date: str):
    url = f"{EXCHANGERATE_HOST}/timeseries"
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "base": base.upper(),
        "symbols": symbols.upper(),
    }
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise HTTPException(status_code=502, detail=data)
    return data


def _fetch_frankfurter_timeseries(base: str, symbols: str, start_date: str, end_date: str):
    url = f"{FRANKFURTER}/{start_date}..{end_date}"
    params = {
        "from": base.upper(),
        "to": symbols.upper(),
    }
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    j = resp.json()
    # Convert to exchangerate.host-like structure
    return {
        "success": True,
        "base": base.upper(),
        "start_date": start_date,
        "end_date": end_date,
        "rates": j.get("rates", {}),
    }


def _generate_sample_series(base: str, symbols: str, start_date: str, end_date: str):
    start = datetime.date.fromisoformat(start_date)
    end = datetime.date.fromisoformat(end_date)
    days = (end - start).days + 1
    random.seed((base + symbols + start_date + end_date))
    rates = {}
    for i in range(days):
        d = start + datetime.timedelta(days=i)
        # Generate a smooth synthetic series
        val = 1.0 + 0.05 * math.sin(i / 8.0) + 0.02 * math.cos(i / 3.0) + random.uniform(-0.005, 0.005)
        # Expand to multiple symbols if provided
        day = {}
        for sym in [s.strip() for s in symbols.split(',') if s.strip()]:
            # scale per symbol for variation
            factor = 1.0 + (hash(sym) % 7) / 50.0
            day[sym.upper()] = round(val * factor, 4)
        rates[d.isoformat()] = day
    return {
        "success": True,
        "base": base.upper(),
        "start_date": start_date,
        "end_date": end_date,
        "rates": rates,
        "fallback": "synthetic",
    }


@router.get("/timeseries")
def forex_timeseries(
    base: str = Query("USD", min_length=3, max_length=3),
    symbols: str = Query("EUR,INR", description="Comma-separated list of target currency codes"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    today = datetime.date.today()
    if not end_date:
        end_date = today.isoformat()
    if not start_date:
        start_date = (today - datetime.timedelta(days=90)).isoformat()

    _validate_date(start_date)
    _validate_date(end_date)

    try:
        # Primary provider
        return _fetch_exchangerate_host_timeseries(base, symbols, start_date, end_date)
    except Exception:
        # Fallback provider
        try:
            return _fetch_frankfurter_timeseries(base, symbols, start_date, end_date)
        except Exception:
            # Last resort: synthetic series so UI doesn't break
            return _generate_sample_series(base, symbols, start_date, end_date)


