from celery import Celery
from detect import detect_drones_in_video
import os

celery_app = Celery('tasks', broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')

@celery_app.task(bind=True)
def process_video(self, file_path: str, file_id: str):
    output_dir = "../data/results"
    os.makedirs(output_dir, exist_ok=True)
    result_file = os.path.join(output_dir, f"{file_id}_results.txt")

    try:
        detect_drones_in_video(file_path, result_file)
        return {"status": "completed", "result_file": result_file}
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc': str(e)})
        return {"status": "failed", "error": str(e)}