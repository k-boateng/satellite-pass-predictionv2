from __future__ import annotations
from pathlib import Path
import time, math, httpx
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Iterable
from skyfield.api import load, EarthSatellite, wgs84

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
CACHE_FILE = DATA_DIR / "active.tle"
CACHE_TTL = 24 * 3600  # seconds

class _Predictor:
    def __init__(self) -> None:
        self.ts = load.timescale()
        self.sats: Dict[int, EarthSatellite] = {}