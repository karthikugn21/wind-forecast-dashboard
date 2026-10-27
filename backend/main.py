"""
main.py — FastAPI application for Wind Forecast Accuracy Dashboard.

Endpoints:
  GET /api/health      → service health
  GET /api/actuals     → actual FUELHH WIND generation Jan 2026
  GET /api/forecasts   → day-ahead relevant WINDFOR forecasts Jan 2026
  GET /api/accuracy    → accuracy metrics (overall, daily, hourly, pairs)
"""

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from elexon import get_actuals, get_forecasts
from analytics import compute_metrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Wind Forecast Accuracy API",
    description="Backend for the WindSight UK wind procurement dashboard",
    version="1.0.0",
)

# Allow all origins in dev; tighten in production via env
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wind-forecast-api"}


@app.get("/api/actuals")
async def actuals():
    """
    Return actual wind generation (FUELHH, fuelType=WIND) for Jan 2026.
    Each item: { startTime, settlementPeriod, generation }
    """
    try:
        data = await get_actuals()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("Failed to fetch actuals")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/forecasts")
async def forecasts():
    """
    Return day-ahead relevant WINDFOR forecasts for Jan 2026.
    Each item: { startTime, publishTime, generation, gateClosure }
    """
    try:
        data = await get_forecasts()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("Failed to fetch forecasts")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/accuracy")
async def accuracy():
    """
    Compute and return forecast accuracy metrics for Jan 2026.
    Returns: { overall, daily, hourly, matched_count, pairs }
    """
    try:
        act, fct = await get_actuals(), await get_forecasts()
        result = compute_metrics(act, fct)
        return result
    except Exception as e:
        logger.exception("Failed to compute accuracy")
        raise HTTPException(status_code=502, detail=str(e))
