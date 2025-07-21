from ultralytics import YOLO
import cv2
import redis
import json

redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)
model = YOLO("../models/yolov8_drone.pt")

def detect_drones_in_video(video_path: str, result_file: str):
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    results_list = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        results = model(frame)
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = box.conf.item()
                cls = box.cls.item()

                if conf > 0.5 and int(cls) == 0:
                    detection = {
                        "frame": frame_count,
                        "bbox": [x1, y1, x2, y2],
                        "confidence": round(conf, 2),
                        "class": "drone"
                    }

                    results_list.append(json.dumps(detection))
                    redis_client.publish("drone_detection", json.dumps(detection))

        frame_count += 1

    cap.release()
    with open(result_file, "w") as f:
        f.write("\n".join(results_list))