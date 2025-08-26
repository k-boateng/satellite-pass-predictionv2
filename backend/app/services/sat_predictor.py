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
   
        #loads
        sats_list = load.tle_file(str(CACHE_FILE))
        
        self.sats = {int(sat.model.satnum): sat for sat in sats_list}

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
        
    def groundtrack(self, norad_id: int, start: datetime, end: datetime, step_s: int = 30):
        pts: List[Tuple[float,float]] = []
        cur = start.replace(tzinfo=timezone.utc)
        while cur <= end:
            s = self.state_at(norad_id, cur)
            pts.append((s["lat"], s["lon"]))
            cur += timedelta(seconds=max(1, step_s))
        return {"points": pts}
        
        
    def passes_over(self, norad_ids: Iterable[int], lat: float, lon: float, alt_m: float,
                    start: datetime, end: datetime):
        # Pass starts when satellite is above the horizon(>0 degress) and ends at (<0)
        site = wgs84.latlon(latitude_degrees=lat, longitude_degrees=lon, elevation_m=alt_m)
        t0 = start.replace(tzinfo=timezone.utc)
        t1 = end.replace(tzinfo=timezone.utc)
        step = timedelta(seconds=30)
        out: Dict[int, List[dict]] = {nid: [] for nid in norad_ids}

        for nid in norad_ids:
            in_pass = False
            aos = los = max_el = None
            max_el_time = None
            cur = t0
            while cur <= t1:
                t = self.ts.from_datetime(cur)
                topocentric = self._sat(nid).at(t) - site
                alt, az, _ = topocentric.altaz()
                el = float(alt.degrees)
                if not in_pass and el > 0:
                    in_pass = True
                    aos = cur
                    max_el = el
                    max_el_time = cur
                elif in_pass and el > max_el:
                    max_el = el
                    max_el_time = cur
                elif in_pass and el <= 0:
                    in_pass = False
                    los = cur
                    out[nid].append({
                        "aos": aos.isoformat(),
                        "los": los.isoformat(),
                        "max_elevation_deg": max_el,
                        "duration_s": int((los - aos).total_seconds()),
                        "max_elevation_time": max_el_time.isoformat(),
                    })
                cur += step
        return out

predictor = _Predictor()


