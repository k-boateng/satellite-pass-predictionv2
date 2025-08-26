from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.services.sat_predictor import predictor
from app.models.satellite import State, Groundtrack, PassEvent

router = APIRouter()

@router.get("/satellites/{norad_id}/state", response_model=State)
async def state(norad_id: int, at: Optional[datetime] = None):
    if not predictor.sats:
        await predictor.refresh_tles()
    at = at or datetime.now(timezone.utc)
    return predictor.state_at(norad_id, at)

@router.get("/satellites/{norad_id}/groundtrack", response_model=Groundtrack)
async def track(norad_id: int,
                start: Optional[datetime] = None,
                end: Optional[datetime] = None,
                step_s: int = Query(30, ge=1, le=300)):
    if not predictor.sats:
        await predictor.refresh_tles()
    now = datetime.now(timezone.utc)
    start = start or now
    end = end or (start + timedelta(hours=3))
    return predictor.groundtrack(norad_id, start, end, step_s)

@router.get("/passes", response_model=dict[int, list[PassEvent]])
async def passes(lat: float, lon: float, alt_m: float = 0,
                 start: Optional[datetime] = None, end: Optional[datetime] = None,
                 norad_ids: Optional[str] = None):
    if not predictor.sats:
        await predictor.refresh_tles()
    now = datetime.now(timezone.utc)
    start = start or now
    end = end or (start + timedelta(hours=24))
    ids = [int(x) for x in (norad_ids.split(",") if norad_ids else [])] or list(predictor.sats.keys())[:50]
    return predictor.passes_over(ids, lat, lon, alt_m, start, end)

@router.get("/debug/sat-ids")
async def sat_ids(limit: int = 10):
    if not predictor.sats:
        await predictor.refresh_tles()
    return sorted(list(predictor.sats.keys()))[:limit]