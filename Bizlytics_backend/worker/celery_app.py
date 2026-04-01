import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv()

celery_app = Celery(
    "bizlytics_worker",
    broker=os.getenv("CELERY_BROKER_URL"),
    backend=os.getenv("CELERY_RESULT_BACKEND"),
    include=["worker.etl_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,  # Track when task starts
    task_acks_late=True,  # Acknowledge only after completion
    worker_prefetch_multiplier=1,  # Process one task at a time per worker
    task_reject_on_worker_lost=True,  # Retry if worker crashes mid-task
    task_time_limit=600,  # Hard kill after 10 minutes
    task_soft_time_limit=540,  # Soft warning at 9 minutes
)
