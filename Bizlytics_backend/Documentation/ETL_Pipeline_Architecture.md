# Core ETL Pipeline Architecture

## 1. File Structure (Isolation)
Every company in Bizlytics has its own dedicated data folder at `data/analytics/`. There are two types of files:
*   **`company_{id}.db` (The Safe):** The actual DuckDB database file containing the processed tables (`raw_data`, `aggregations`, and `profile`).
*   **`company_{id}.db.lock` (The Lock):** A coordination file that tells other processes (like the AI or Worker) to wait if the database is currently busy. This prevents "Permission Denied" errors.

## 2. Overview
The ETL (Extract, Transform, Load) pipeline is the mathematical engine of Bizlytics. It is designed to ingest extremely messy, unpredictable raw Excel (`.xlsx`) and `.csv` files uploaded by HRs, and output pristine, strictly-typed data warehouses ready for lightning-fast AI querying.

## 2. The Step-by-Step Data Flow
The entire process is automated in the background to ensure the FastAPI server remains unblocked.

### Step A: Extraction (S3 & Pandas)
1. The raw file is securely downloaded directly into the worker's RAM from the AWS S3 private bucket.
2. The file is piped into a `pandas.DataFrame`.
3. **Smart Header Detection:** If a user uploads an Excel file with stylized meta-titles at the top, the system automatically scans downward until it detects the first row with at least 3 populated columns, designating that as the true "Header Row."

### Step B: Transformation (Cleaning & Sanitizing)
Before data ever touches the database, it undergoes aggressive sanitization in `app/analytics/service.py`:
1. **Column Normalization:** Spaces are replaced with underscores, and all text is lowercased (e.g., "Order Date" -> `order_date`).
2. **Null Stripping:** Entirely empty rows and columns are completely dropped.
3. **String Whitespace:** Invisible trailing spaces (`"Sales   "`) are stripped natively to prevent aggregation grouping errors.
4. **Type Casting Safeguards:** To prevent DuckDB `ConversionExceptions` (which occur if a mostly-numeric column contains a stray string like `"No"`), the pipeline forces any Pandas `object` columns explicitly into `String` types, preserving null values cleanly.

### Step C: Load (DuckDB Isolation)
1. **Per-Company Databases:** To prevent multi-tenant data leakage and locking conflicts, each company now has its own **isolated DuckDB file** at `data/analytics/company_{id}.db`.
2. **Simplified Schema:** Within these private files, the cleaned table is always named **`raw_data`**. This allows for simpler, more consistent analytical queries.
3. **Overwriting Logic:** To prevent catastrophic schema conflicts (e.g., when a user uploads a radically different dataset), any existing `raw_data` table is structurally dropped (`DROP TABLE IF EXISTS`) before being recreated from the new file contents.
4. **Speed:** The table is recreated from scratch using DuckDB's native memory-optimized pandas reader (`CREATE TABLE AS SELECT * FROM df`), loading hundreds of thousands of rows in milliseconds.

### Step D: Auto-Profiling & Aggregation
Immediately after the load is complete, `worker/aggregation.py` mathematically scans the freshly inserted data and generates two specialized tables:
1. **`profile` Table:** Contains high-level metadata (total rows, total columns, breakdown of numeric vs. text vs. date columns).
2. **`aggregations` Table:** Pre-computes `SUM`, `AVG`, `MIN`, `MAX`, and `COUNT` for every numeric column. This ensures that Dashboard charts and AI responses are nearly instantaneous.

---

## 3. Concurrency & Safety
Since Bizlytics runs in a multi-container Docker environment (FastAPI Backend + Celery Worker),  use a dual-locking strategy managed in `app/analytics/duckdb_manager.py`:

*   **Thread Safety:** An internal `threading.Lock` prevents race conditions inside a single container.
*   **Cross-Container Locking:** A **`FileLock`** (`.lock` file) ensures that the Background Worker and the AI Chatbot do not attempt to write/read the same company database at the exact same millisecond.
*   **Retry-on-Busy:** If the database is currently being queried by the AI, the ETL worker will **automatically retry** up to 10 times with a jitter delay instead of failing.
