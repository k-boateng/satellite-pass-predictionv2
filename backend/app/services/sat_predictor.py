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

    #Caching TLE data
    async def refresh_tles(self) -> None:
        text = None
        if CACHE_FILE.exists() and (time.time() - CACHE_FILE.stat().st_mtime) < CACHE_TTL: #now - time of last modification
            text = CACHE_FILE.read_text()
        else:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(TLE_URL)
                r.raise_for_status()
                text = r.text
                CACHE_FILE.write_text(text)

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        sats: Dict[int, EarthSatellite] = {}
        for i in range(0, len(lines), 3):
            if i + 2 >= len(lines): break
            name, l1, l2 = lines[i], lines[i+1], lines[i+2]
            try:
                norad = int(l1.split()[1])
                sats[norad] = EarthSatellite(l1, l2, name, self.ts)
            except Exception:
                continue
        
        self.sats = sats

        def _sat(self, norad_id: int) -> EarthSatellite:
            return self.sats[norad_id]
        
        def state_at(self, norad_id: int, at: datetime):
            
            t = self.ts.from_datetime(at.replace(tzinfo=timezone.utc))
            geo = self._sat(norad_id).at(t)
            sub = wgs84.subpoint(geo)
            vx, vy, vz = geo.velocity.km_per_s
            return {
                "timestamp": at.replace(tzinfo=timezone.utc).isoformat(),
                "lat": sub.latitude.degrees,
                "lon": sub.longitude.degrees,
                "alt_km": sub.elevation.km,
                "vel_kms": math.sqrt(vx*vx + vy*vy + vz*vz),
                }
        


