from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.satellites import router
import anyio

REFRESH_SECONDS = 6 * 60 * 60  # every 6h

app = FastAPI(title="SatService")
app.include_router(router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your React dev origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

