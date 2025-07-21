from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import time
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, create_engine
from database import get_session
from models import (
    Detection, DetectionResponse, DetectionCreate, 
    CameraStatus, WebSocketMessage
)
from tracker import DroneTracker
import cv2
import json
import asyncio
import logging
from datetime import date, datetime
from typing import List, Optional
import os
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
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



# Initialize FastAPI app
app = FastAPI(
    title="Drone Tracking API",
    description="Real-time drone detection and tracking system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global tracker instance - Replace with your model path
MODEL_PATH = "best.pt"  # Change this to your YOLO model path
tracker: Optional[DroneTracker] = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
            
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected.append(connection)
                
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# Initialize tracker with callbacks
def initialize_tracker():
    global tracker
    try:
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model file not found: {MODEL_PATH}")
            return None
            
        tracker = DroneTracker(MODEL_PATH, confidence_threshold=0.5)
        
        # Set WebSocket callbacks
        async def on_new_detection(data):
            await manager.broadcast(json.dumps(data))
            
        async def on_status_update(data):
            await manager.broadcast(json.dumps(data))
            
        tracker.set_callbacks(on_new_detection, on_status_update)
        logger.info("Tracker initialized successfully")
        return tracker
        
    except Exception as e:
        logger.error(f"Failed to initialize tracker: {e}")
        return None

# Initialize on startup
@app.on_event("startup")
async def startup_event():
    initialize_tracker()

def generate_frames():
    """Generate video frames for streaming"""
    global tracker
    
    if not tracker:
        # Return a placeholder frame
        frame = cv2.imread('static/placeholder.jpg') if os.path.exists('static/placeholder.jpg') else None
        if frame is None:
            # Create a simple placeholder frame
            frame = cv2.zeros((480, 640, 3), dtype=cv2.uint8)
            cv2.putText(frame, "Camera Not Available", (50, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
        
        while True:
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            asyncio.sleep(1)  # 1 FPS for placeholder
        return
    
    while True:
        try:
            frame = tracker.get_latest_frame()
            
            if frame is None:
                # Create a "no signal" frame
                frame = cv2.zeros((480, 640, 3), dtype=cv2.uint8)
                if tracker.is_camera_running():
                    cv2.putText(frame, "Initializing Camera...", (50, 240), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
                else:
                    cv2.putText(frame, "Camera Stopped", (50, 240), 
                               cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 3)
                    cv2.putText(frame, "Click Start to begin tracking", (50, 300), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if not ret:
                continue
                
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                   
        except Exception as e:
            logger.error(f"Error generating frame: {e}")
            # Yield error frame
            error_frame = cv2.zeros((480, 640, 3), dtype=cv2.uint8)
            cv2.putText(error_frame, "Stream Error", (200, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 3)
            ret, buffer = cv2.imencode('.jpg', error_frame)
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            
        time.sleep(0.033)  # ~30 FPS - FIXED

# API Routes

@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "Drone Tracking API",
        "version": "1.0.0",
        "endpoints": [
            "/video - Video stream",
            "/camera/{action} - Camera control",
            "/detections/today - Today's detections",
            "/detections/ - All detections",
            "/ws - WebSocket connection"
        ]
    }

@app.get("/video")
async def video_feed():
    """Stream video feed with drone detection overlay"""
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/camera/{action}")
async def camera_control(action: str) -> CameraStatus:
    """Control camera (start/stop)"""
    global tracker
    
    if not tracker:
        raise HTTPException(status_code=503, detail="Tracker not initialized")
    
    if action.lower() == "start":
        if tracker.is_camera_running():
            return CameraStatus(
                is_running=True,
                message="Camera is already running",
                total_detections_today=tracker.get_today_detection_count()
            )
        
        success = tracker.start()
        if success:
            return CameraStatus(
                is_running=True,
                message="Camera started successfully",
                total_detections_today=tracker.get_today_detection_count()
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to start camera")
            
    elif action.lower() == "stop":
        if not tracker.is_camera_running():
            return CameraStatus(
                is_running=False,
                message="Camera is already stopped",
                total_detections_today=tracker.get_today_detection_count()
            )
        
        success = tracker.stop()
        if success:
            return CameraStatus(
                is_running=False,
                message="Camera stopped successfully",
                total_detections_today=tracker.get_today_detection_count()
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to stop camera")
            
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'")

@app.get("/camera/status")
async def camera_status() -> CameraStatus:
    """Get current camera status"""
    global tracker
    
    if not tracker:
        return CameraStatus(
            is_running=False,
            message="Tracker not initialized",
            total_detections_today=0
        )
    
    return CameraStatus(
        is_running=tracker.is_camera_running(),
        message="Camera status retrieved",
        total_detections_today=tracker.get_today_detection_count()
    )

@app.get("/detections/today", response_model=List[DetectionResponse])
async def get_today_detections(session: Session = Depends(get_session)):
    """Get all detections for today"""
    today = date.today()
    statement = select(Detection).where(Detection.detection_date == today).order_by(Detection.start_time.desc())
    detections = session.exec(statement).all()
    return detections

@app.get("/detections/", response_model=List[DetectionResponse])
async def get_all_detections(
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """Get all detections with pagination"""
    statement = select(Detection).order_by(Detection.start_time.desc()).offset(offset).limit(limit)
    detections = session.exec(statement).all()
    return detections

@app.get("/detections/date/{detection_date}", response_model=List[DetectionResponse])
async def get_detections_by_date(detection_date: date, session: Session = Depends(get_session)):
    """Get detections for specific date"""
    statement = select(Detection).where(Detection.detection_date == detection_date).order_by(Detection.start_time.desc())
    detections = session.exec(statement).all()
    return detections

@app.post("/detections/", response_model=DetectionResponse)
async def create_detection(detection: DetectionCreate, session: Session = Depends(get_session)):
    """Create a new detection (mainly for testing)"""
    db_detection = Detection.from_orm(detection)
    session.add(db_detection)
    session.commit()
    session.refresh(db_detection)
    return db_detection

@app.delete("/detections/{detection_id}")
async def delete_detection(detection_id: int, session: Session = Depends(get_session)):
    """Delete a detection"""
    detection = session.get(Detection, detection_id)
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    session.delete(detection)
    session.commit()
    return {"message": "Detection deleted successfully"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        # Send initial status
        global tracker
        if tracker:
            status_message = {
                "event": "status_update",
                "is_running": tracker.is_camera_running(),
                "total_detections_today": tracker.get_today_detection_count(),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(status_message))
        
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back or handle specific commands if needed
            if data == "ping":
                await websocket.send_text(json.dumps({"event": "pong", "timestamp": datetime.now().isoformat()}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Serve static files for development
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global tracker
    return {
        "status": "healthy",
        "tracker_initialized": tracker is not None,
        "camera_running": tracker.is_camera_running() if tracker else False,
        "timestamp": datetime.now().isoformat()
    }

# Development static file serving
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
