# Celery & Redis Background Worker Architecture

## 1. Overview
Processing heavy Excel spreadsheets and executing complex aggregations requires significant CPU time. To prevent the user interface from "freezing" or timing out with a 504 error during a 50MB upload, the heavy lifting has been completely decoupled from the main FastAPI server using **Celery** and **Redis**.

## 2. Component Roles

### Redis (The Message Broker)
Redis acts as the ultra-fast middleman. 
1. When FastAPI receives a file upload, it instantly throws a "Job Ticket" (e.g., `Process Dataset 104`) into the Redis queue.
2. FastAPI then answers the frontend immediately with a `200 OK` (Status: "Processing"), letting the user go about their day.

### Celery (The Heavy Lifter)
The Celery Worker is a completely separate Docker container that continuously monitors Redis.
1. When it sees an idle ticket, it grabs it.
2. It executes `process_etl()` defined in `worker/etl_tasks.py`.
3. It performs the S3 download, Pandas cleaning, and DuckDB loading completely in the background.

## 3. Worker Resilience & Failure Handling
Celery is configured for production-grade reliability:

1. **`task_acks_late = True`**: The worker only tells Redis "Job Done" *after* DuckDB successfully writes the data. If the Docker container loses power mid-process, the job is securely returned to the Redis queue to be retried automatically.
2. **`max_retries = 3`**: If the S3 download fails due to a network blip, the task pauses for 60 seconds and retries.
3. **Error Reporting:** If the task completely fails (e.g., due to an impossible file corruption), the `UploadStatus` in PostgreSQL is formally changed from `Processing` to `Failed`, instantly notifying the user on the React frontend.
