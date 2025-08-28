# Satellite View

Small app that shows satellites moving on a 3D globe.  
Backend (FastAPI + Skyfield) serves data from TLEs; frontend (React + Three.js) renders and lets you click a satellite to see details.

## Tech stack
- **Frontend:** React, Three.js
- **Backend:** FastAPI, Skyfield, httpx, Uvicorn
- **Hosting (free):** Vercel (frontend), Render (backend)

## What it does
- Renders a globe with moving satellite dots
- Click a dot → small card shows: name, NORAD, velocity, altitude, period and TLE epoch
- Bottom-right UTC clock -> shows satellite's orbit in the next 24hrs
- Smooth updates with staggered polling

## Project layout
```
/                 # React app (Vite or CRA) at repo root
├─ public/        # assets (geojson, star textures)
├─ src/
│  ├─ GlobeScene.jsx
│  ├─ components/ (SummaryCard.jsx, Hud.jsx)
│  └─ utils/ (api.js, picking.js, stars.js, random.js)
└─ backend/
   ├─ app/ (main.py, routes/satellites.py, services/sat_predictor.py, models, utils)
   └─ requirements.txt
```

## Run it locally
Backend:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# http://127.0.0.1:8000/api/healthz
```

Frontend:
```bash
# in repo root
npm ci
# optional: .env.local with VITE_API_BASE=http://127.0.0.1:8000
npm run dev
# http://localhost:5173
```

## Key API endpoints (under `/api`)
- `GET /api/healthz`
- `GET /api/debug/sat-ids?limit=800`
- `GET /api/satellites/{norad_id}/state`
- `GET /api/satellites/{norad_id}/summary`
- `GET /api/satellites/{norad_id}/groundtrack`
- `GET /api/passes?lat&lon&alt_m&start&end&norad_ids=...`

## Deploy for free (quick)
Backend on Render:
- Root Directory: `backend`
- Build: `pip install --no-cache-dir -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check: `/api/healthz`
- CORS allows `http://localhost:5173` and `https://*.vercel.app`

Frontend on Vercel:
- Import repo; root is the React app
- Build: `npm run build` → output `dist` (Vite) or `build` (CRA)
- Env: `VITE_API_BASE=https://<your-api>.onrender.com`

Notes: Render free instances sleep when idle (first request may be slow). Do not rely on backend disk for persistence.

## Config you might change
- `src/utils/api.js` reads `VITE_API_BASE` (defaults to localhost in dev)
- Satellite count, dot size, and polling in `GlobeScene.jsx` / `satelliteDot.js`
- Assets (GeoJSON, star textures) live in `public/`

## Troubleshooting
- CORS error: ensure backend allows your Vercel domain and localhost
- Slow first request: Render cold start
- 404 assets: make sure files are in `public/` and paths start with `/`

## Acknowledgements
- [Skyfield](https://rhodesmill.org/skyfield/) for TLE parsing and propagation    
- [Three.js and OrbitControls](https://threejs.org/) for WebGL rendering and camera controls  
- [CelesTrak](https://celestrak.org/) (and upstream sources) for public TLE data  
- [Natural-earth-geojson](https://github.com/martynafford/natural-earth-geojson) 
- [ThreeGeoJSON](https://github.com/bobbyroe/ThreeGeoJSON/tree/three-v170) for rendering GeoJSON with Three.js