import time  # Add this import at the top of your file

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
            time.sleep(1)  # 1 FPS for placeholder - FIXED
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
