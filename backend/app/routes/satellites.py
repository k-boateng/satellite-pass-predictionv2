from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.services.sat_predictor import predictor
from app.models.satellite import State, Groundtrack, PassEvent, SatSummary
import math


router = APIRouter()


@router.get("/satellites/{norad_id}/state", response_model=State)
async def state(norad_id: int, at: Optional[datetime] = None):
    if not predictor.sats:
        await predictor.refresh_tles()
    if norad_id not in predictor.sats:
        raise HTTPException(status_code=404, detail=f"NORAD ID {norad_id} not found in loaded TLEs")
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

@router.get("/satellites/{norad_id}/summary", response_model=SatSummary)
async def satellite_summary(norad_id: int):
    if not predictor.sats:
        await predictor.refresh_tles()
    if norad_id not in predictor.sats:
        raise HTTPException(404, f"NORAD ID {norad_id} not found in loaded TLEs")

    sat = predictor._sat(norad_id)

    now = datetime.now(timezone.utc)
    st = predictor.state_at(norad_id, now)

    # Period calculation
    n = getattr(sat.model, "no_kozai", None) or getattr(sat.model, "no", None)
    if not n:
        raise HTTPException(500, f"Mean motion missing for {norad_id}")
    period_minutes = float((2.0 * math.pi) / n)

    #Retrieve epoch
    try:
        epoch_dt = sat.epoch.utc_datetime()
    except Exception:
        yy = int(sat.model.epochyr)
        year = 1900 + yy if yy >= 57 else 2000 + yy
        doy = float(sat.model.epochdays) 
        epoch_dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=doy - 1)

    return {
        "name": sat.name or str(norad_id),
        "norad_id": norad_id,
        "velocity_kms": st["vel_kms"],
        "lat": st["lat"],
        "lon": st["lon"],
        "altitude_km": st["alt_km"],
        "period_minutes": period_minutes,
        "epoch_utc": epoch_dt
    }  

@router.get("/debug/sat-ids")
async def sat_ids(limit: int = 10):
    if not predictor.sats:
        await predictor.refresh_tles()
    return sorted(list(predictor.sats.keys()))[:limit]