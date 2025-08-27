from pydantic import BaseModel
from typing import List, Tuple


class SatSummary(BaseModel):
    name: str
    norad_id: int
    velocity_kms: float
    altitude_km: float
    period_minutes: float

class State(BaseModel):
    timestamp: str
    lat: float
    lon: float
    alt_km: float
    vel_kms: float

class Groundtrack(BaseModel):
    points: List[Tuple[float, float]]

class PassEvent(BaseModel):
    aos: str
    los: str
    max_elevation_deg: float
    duration_s: int
    max_elevation_time: str

