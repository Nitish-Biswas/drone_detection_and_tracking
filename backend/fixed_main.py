
# main.py - FIXED VERSION
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel, create_engine
import uvicorn

# Import your database models BEFORE creating tables
from models import Detection, Daily  # These define your SQLModel tables

# Database configuration
DATABASE_URL = "sqlite:///./drone_tracking.db"
engine = create_engine(DATABASE_URL, echo=True)

# This function will run during startup and shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    print("Creating database tables...")
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created successfully")
    
    # Initialize your tracker here if needed
    # tracker = initialize_tracker()
    
    yield  # App runs here
    
    # Shutdown cleanup (optional)
    print("🛑 Application shutting down")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="Drone Detection & Tracking API",
    version="1.0.0",
    lifespan=lifespan  # This is the key fix!
)

# Your existing endpoints...
@app.post("/camera/start")
async def start_camera():
    return {"status": "Camera started"}

@app.get("/detections/today")
async def get_today_detections():
    # This will now work because tables exist!
    from sqlmodel import Session, select
    from datetime import date
    
    with Session(engine) as session:
        statement = select(Detection).where(Detection.detection_date == date.today())
        detections = session.exec(statement).all()
        return detections

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
