# Infrastructure & Docker Architecture

## 1. Overview
The entire Bizlytics backend is securely containerized via Docker. Instead of manually downloading Python, configuring PostgreSQL routes, or installing Redis locally, `docker-compose.yml` launches the entire interconnected microservice ecosystem with a single command.

## 2. Docker Compose Services

### A. Data Services
* **`postgres`:** An official Alpine PostgreSQL container housing the User authentication data and file metadata. Port `5433` is explicitly mapped to prevent Windows OS port conflicts with internal databases.
* **`redis`:** An official Alpine Redis container handling the lightning-fast task message queue between FastAPI and Celery.

### B. Compute Services
* **`backend`:** The main FastAPI image. It continuously handles incoming REST HTTP requests, UI interactions, token minting, and routes files to S3.
* **`celery_worker`:** An identical copy of the FastAPI Python image, but runs the explicit `celery worker` startup command. It runs infinitely in the background pulling jobs purely off the `redis` queue silently.
* **`flower` (Optional Tools):** A visual monitoring dashboard running on port `5555`, revealing the real-time processing timelines and RAM usage of the Celery worker instances.

## 3. Live Volume Syncing (Bind Mounts)
Volumes are fundamentally critical to this prototype's structure:
1. **Live Code Sync:** `./Bizlytics_backend:/app` natively binds the Windows backend Python folder to the interior of the FastAPI and Celery containers. This ensures any Python edits saved in VS Code instantly execute on the containers without forcing a manual `docker rebuild`.
2. **Live Database Sync:** `./Bizlytics_backend/data:/app/data` natively binds the DuckDB `.db` binary file. Without this bind, the database lives in a hidden virtual Docker volume invisible to the developer. With it, the VS Code DuckDB extension can visually read the live, updating tables.
