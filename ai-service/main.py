import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import flood, fire, climate, simulation, emergency, economic, earthgpt, scan
from agents.flood_agent import get_flood_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[EarthMind X] Booting AI Service...")
    try:
        get_flood_agent()
        print("[EarthMind X] Flood Agent ready")
    except Exception as e:
        print(f"[EarthMind X] Warning: Flood Agent init failed — {e}")
    yield
    print("[EarthMind X] AI Service shutting down")


app = FastAPI(
    title="EarthMind X — AI Service",
    description="Multi-agent AI backend for Digital Twin Earth",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "earthmind-x-ai", "agents": 7}


app.include_router(flood.router, prefix="/ai")
app.include_router(fire.router, prefix="/ai")
app.include_router(climate.router, prefix="/ai")
app.include_router(simulation.router, prefix="/ai")
app.include_router(emergency.router, prefix="/ai")
app.include_router(economic.router, prefix="/ai")
app.include_router(earthgpt.router, prefix="/ai")
app.include_router(scan.router, prefix="/ai")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
