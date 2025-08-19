from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.services.sat_predictor import predictor
from app.models.satellite import State, Groundtrack, PassEvent

router = APIRouter()
