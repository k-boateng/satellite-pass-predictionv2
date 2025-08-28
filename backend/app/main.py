from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.satellites import router
import asyncio

REFRESH_SECONDS = 6 * 60 * 60  # every 6h

app = FastAPI(title="SatService")
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],          # dev
    allow_origin_regex=r"https://.*\.vercel\.app$",   # any vercel.app domain
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    
    from app.services.sat_predictor import predictor

    async def refresher():
        while True:
            try:
                await predictor.refresh_tles()
                await asyncio.sleep(REFRESH_SECONDS)
            except Exception: #Keeps loop alive
                pass
            
    asyncio.create_task(refresher())

@app.get("/healthz")
def healthz():
    return {"ok": True}

