from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.satellites import router
import anyio

REFRESH_SECONDS = 6 * 60 * 60  # every 6h

app = FastAPI(title="SatService")
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    
    from app.services.sat_predictor import predictor
    async def refresher():
        while True:
            await predictor.refresh_tles()
            await anyio.sleep(REFRESH_SECONDS)
    anyio.create_task_group().start_soon(refresher)

@app.get("/healthz")
def healthz():
    return {"ok": True}

