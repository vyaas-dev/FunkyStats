import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

TBA_API_KEY = os.getenv("TBA_API_KEY", "")
TBA_BASE = "https://www.thebluealliance.com/api/v3"

HOST = os.getenv("CACHE_HOST", "127.0.0.1")
PORT = int(os.getenv("CACHE_PORT", "8787"))

DATA_DIR = Path(os.getenv("CACHE_DATA_DIR", "./data")).resolve()
BLOBS_DIR = DATA_DIR / "blobs"
DB_PATH = DATA_DIR / "cache.db"

MAX_BYTES = int(os.getenv("CACHE_MAX_BYTES", str(2 * 1024 * 1024 * 1024)))
CACHE_YEARS = [
    int(y.strip())
    for y in os.getenv("CACHE_YEARS", "2024,2025,2026").split(",")
    if y.strip()
]

REFRESH_ENABLED = os.getenv("REFRESH_ENABLED", "true").lower() in (
    "1",
    "true",
    "yes",
)

# Policy constants (seconds)
FROZEN_AFTER_END_DAYS = 2
FUTURE_REFRESH_SEC = 24 * 60 * 60
ACTIVE_MIN_REFRESH_SEC = 5 * 60
ACTIVE_MAX_REFRESH_SEC = 30 * 60
