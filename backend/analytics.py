"""
analytics.py — Forecast accuracy metrics for wind power generation.

Given matched (actual, forecast) pairs:
  - MAE  : Mean Absolute Error (MW)
  - RMSE : Root Mean Squared Error (MW)
  - MAPE : Mean Absolute Percentage Error (%)
  - Bias : Mean signed error — positive = forecast over-estimates actual
  - Daily breakdown  : above metrics per calendar day
  - Hourly profile   : average |error| by hour-of-day (0-23)
"""

import math
from datetime import datetime, timezone
from collections import defaultdict
from typing import Any


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def compute_metrics(actuals: list[dict], forecasts: list[dict]) -> dict[str, Any]:
    """
    Match actuals and forecasts on startTime, then compute all accuracy metrics.

    actuals  : list of {startTime, generation}  (30-min resolution, FUELHH)
    forecasts: list of {startTime, generation, publishTime, gateClosure}  (1-hour, WINDFOR)

    WINDFOR has 1-hour resolution, FUELHH has 30-min resolution.
    We match each 30-min actual to the forecast whose hour-truncated startTime
    matches the actual's hour-truncated startTime.

    Returns a dict with keys:
      overall, daily, hourly, matched_count, total_actuals, total_forecasts, pairs
    """
    # Index forecasts by hour-truncated startTime (drops :30 offset to map to :00)
    forecast_map: dict[str, dict] = {}
    for f in forecasts:
        st = f.get("startTime", "")
        if not st:
            continue
        # Truncate to the hour (handle both :00 and :30 publish times)
        dt = _parse_dt(st).replace(minute=0, second=0, microsecond=0)
        key = dt.strftime("%Y-%m-%dT%H:00:00Z")
        # Keep only the best forecast per hour (they're already pre-selected)
        forecast_map[key] = f

    pairs = []
    for a in actuals:
        st = a["startTime"]
        # Truncate actual startTime to the hour to match hourly WINDFOR
        try:
            st_hour = _parse_dt(st).replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:00:00Z")
        except ValueError:
            continue
        if st_hour not in forecast_map:
            continue
        f = forecast_map[st_hour]
        actual_gen = a["generation"]
        forecast_gen = f["generation"]
        if actual_gen is None or forecast_gen is None:
            continue
        error = actual_gen - forecast_gen  # positive → forecast under-estimated
        pairs.append(
            {
                "startTime": st,
                "actual": actual_gen,
                "forecast": forecast_gen,
                "error": error,
                "absError": abs(error),
                "pctError": abs(error) / actual_gen * 100 if actual_gen != 0 else None,
                "publishTime": f.get("publishTime"),
                "gateClosure": f.get("gateClosure"),
            }
        )

    if not pairs:
        return {
            "overall": None,
            "daily": [],
            "hourly": [],
            "matched_count": 0,
            "total_actuals": len(actuals),
            "total_forecasts": len(forecasts),
            "pairs": [],
        }

    def _stats(subset: list[dict]) -> dict:
        n = len(subset)
        mae = sum(p["absError"] for p in subset) / n
        rmse = math.sqrt(sum(p["error"] ** 2 for p in subset) / n)
        bias = sum(p["error"] for p in subset) / n
        pct_errors = [p["pctError"] for p in subset if p["pctError"] is not None]
        mape = sum(pct_errors) / len(pct_errors) if pct_errors else None
        return {"mae": round(mae, 2), "rmse": round(rmse, 2), "bias": round(bias, 2), "mape": round(mape, 2) if mape is not None else None, "count": n}

    overall = _stats(pairs)

    # Daily breakdown
    daily_groups: dict[str, list] = defaultdict(list)
    for p in pairs:
        day = _parse_dt(p["startTime"]).strftime("%Y-%m-%d")
        daily_groups[day].append(p)
    daily = []
    for day in sorted(daily_groups):
        s = _stats(daily_groups[day])
        s["date"] = day
        daily.append(s)

    # Hourly profile (hour 0-23)
    hourly_groups: dict[int, list] = defaultdict(list)
    for p in pairs:
        hour = _parse_dt(p["startTime"]).hour
        hourly_groups[hour].append(p)
    hourly = []
    for h in range(24):
        if h in hourly_groups:
            s = _stats(hourly_groups[h])
            s["hour"] = h
            hourly.append(s)

    return {
        "overall": overall,
        "daily": daily,
        "hourly": hourly,
        "matched_count": len(pairs),
        "total_actuals": len(actuals),
        "total_forecasts": len(forecasts),
        "pairs": pairs,
    }
