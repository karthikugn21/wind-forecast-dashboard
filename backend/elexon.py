"""
elexon.py — Elexon BMRS API client with in-memory caching.

Fetches:
  - FUELHH (actual wind generation, 30-min resolution)
  - WINDFOR (wind forecasts, with publishTime)

For day-ahead procurement decisions, the "relevant" forecast for a delivery
period starting at time T on day D is the latest WINDFOR record where
  publishTime <= gate_closure(D)
where gate_closure(D) = D-1 at 23:00 UTC (UK EPEX day-ahead gate closure).
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional

import httpx
from cachetools import TTLCache

logger = logging.getLogger(__name__)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

# TTL cache: 30 min — Jan 2026 data is historical and stable
_actuals_cache: TTLCache = TTLCache(maxsize=10, ttl=1800)
_forecasts_cache: TTLCache = TTLCache(maxsize=10, ttl=1800)


async def _fetch_fuelhh_chunk(
    client: httpx.AsyncClient,
    date_from: str,
    date_to: str,
    fuel_type: str = "WIND",
) -> list[dict]:
    """
    Fetch FUELHH actuals using settlementDateFrom/settlementDateTo.
    date_from / date_to: 'YYYY-MM-DD' strings (inclusive).
    """
    params = {
        "settlementDateFrom": date_from,
        "settlementDateTo": date_to,
        "fuelType": fuel_type,
        "format": "json",
    }
    url = f"{BASE_URL}/datasets/FUELHH/stream"
    logger.info(f"Fetching FUELHH {date_from} → {date_to}")
    resp = await client.get(url, params=params, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


async def _fetch_windfor_chunk(
    client: httpx.AsyncClient,
    date_from: str,
    date_to: str,
) -> list[dict]:
    """
    Fetch WINDFOR forecasts using publishDateTimeFrom/publishDateTimeTo.
    """
    params = {
        "publishDateTimeFrom": f"{date_from}T00:00:00Z",
        "publishDateTimeTo":   f"{date_to}T23:59:59Z",
        "format": "json",
    }
    url = f"{BASE_URL}/datasets/WINDFOR/stream"
    logger.info(f"Fetching WINDFOR published {date_from} → {date_to}")
    resp = await client.get(url, params=params, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def _date_chunks(start: date, end: date, chunk_days: int = 7):
    """Yield (date_from, date_to) string pairs for chunked fetching."""
    cursor = start
    while cursor < end:
        chunk_end = min(cursor + timedelta(days=chunk_days - 1), end - timedelta(days=1))
        yield cursor.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")
        cursor = chunk_end + timedelta(days=1)


async def get_actuals() -> list[dict]:
    """
    Return actual wind generation (FUELHH, fuelType=WIND) for Jan 2026.
    Each record: { startTime, settlementPeriod, generation }
    """
    cache_key = "actuals_jan2026"
    if cache_key in _actuals_cache:
        logger.info("Returning actuals from cache")
        return _actuals_cache[cache_key]

    jan_start = date(2026, 1, 1)
    jan_end   = date(2026, 2, 1)  # exclusive

    chunks = list(_date_chunks(jan_start, jan_end, chunk_days=7))

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_fuelhh_chunk(client, df, dt) for df, dt in chunks]
        results = await asyncio.gather(*tasks)

    raw: list[dict] = []
    for chunk in results:
        raw.extend(chunk)

    # Deduplicate by startTime and filter to Jan 2026
    seen = set()
    records = []
    for r in raw:
        st = r.get("startTime", "")
        if not st or st in seen:
            continue
        # Only keep Jan 2026 settlement dates
        sd = r.get("settlementDate", "")
        if not (sd.startswith("2026-01")):
            continue
        seen.add(st)
        records.append(
            {
                "startTime": st,
                "settlementPeriod": r.get("settlementPeriod"),
                "generation": r.get("generation"),
            }
        )

    records.sort(key=lambda x: x["startTime"])
    _actuals_cache[cache_key] = records
    logger.info(f"Fetched {len(records)} actual records for Jan 2026")
    return records


async def get_forecasts() -> list[dict]:
    """
    Return the day-ahead relevant WINDFOR forecast for each delivery period
    in Jan 2026.

    For delivery period startTime T on day D:
      gate_closure = D-1 23:00 UTC
    We pick the WINDFOR record with the latest publishTime <= gate_closure.

    Returns list of:
      { startTime, publishTime, generation, gateClosure }
    sorted by startTime ascending.
    """
    cache_key = "forecasts_jan2026"
    if cache_key in _forecasts_cache:
        logger.info("Returning forecasts from cache")
        return _forecasts_cache[cache_key]

    # Fetch WINDFOR published Dec 31 – Jan 31 (forecasts for Jan published on D-1)
    fetch_start = date(2025, 12, 28)
    fetch_end   = date(2026, 2, 1)

    chunks = list(_date_chunks(fetch_start, fetch_end, chunk_days=7))

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_windfor_chunk(client, df, dt) for df, dt in chunks]
        results = await asyncio.gather(*tasks)

    raw: list[dict] = []
    for chunk in results:
        raw.extend(chunk)

    logger.info(f"Raw WINDFOR records fetched: {len(raw)}")

    # Index: startTime -> list of (publishTime_dt, generation)
    from collections import defaultdict
    index: dict[str, list[tuple[datetime, int]]] = defaultdict(list)
    for r in raw:
        st  = r.get("startTime", "")
        pt  = r.get("publishTime", "")
        gen = r.get("generation")
        if not st or not pt or gen is None:
            continue
        try:
            pt_dt = datetime.fromisoformat(pt.replace("Z", "+00:00"))
            index[st].append((pt_dt, int(gen)))
        except ValueError:
            continue

    # For each delivery period in Jan 2026, select gate-closure forecast
    jan_start_dt = datetime(2026, 1, 1, tzinfo=timezone.utc)
    jan_end_dt   = datetime(2026, 2, 1, tzinfo=timezone.utc)

    records = []
    for st, candidates in index.items():
        try:
            st_dt = datetime.fromisoformat(st.replace("Z", "+00:00"))
        except ValueError:
            continue
        if not (jan_start_dt <= st_dt < jan_end_dt):
            continue

        # Gate closure: 23:00 on the day BEFORE the delivery day
        delivery_day = st_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        gate_closure = delivery_day - timedelta(hours=1)  # D-1 23:00 UTC

        eligible = [(pt, g) for pt, g in candidates if pt <= gate_closure]
        if not eligible:
            eligible = candidates  # fallback: use any available forecast

        best_pt, best_gen = max(eligible, key=lambda x: x[0])

        records.append(
            {
                "startTime":   st,
                "publishTime": best_pt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "generation":  best_gen,
                "gateClosure": gate_closure.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
        )

    records.sort(key=lambda x: x["startTime"])
    _forecasts_cache[cache_key] = records
    logger.info(f"Selected {len(records)} day-ahead forecast records for Jan 2026")
    return records
