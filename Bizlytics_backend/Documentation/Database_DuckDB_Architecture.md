# Database Architecture: PostgreSQL & DuckDB

## 1. Overview
The platform takes an advanced "Dual-Database Engine" approach, routing fundamentally different data types to the engines that handle them best mathematically and architecturally.

## 2. PostgreSQL (Relational Metadata & User Auth)
PostgreSQL handles all User accounts, Company Roles, Subscriptions, and File Meta-Tracking.
1. **Schema Partitioning:** Every registered company receives an entirely separate, isolated SQL Schema. User A inside `Company A's` schema absolutely cannot query Users inside `Company B's` schema.
2. **Metadata Tracking:** When an HR user uploads a raw file, the exact filename, assigned `Upload_ID`, AWS S3 URL, and current working status (`Pending/Processing/Completed/Failed`) is written here.

## 3. DuckDB (The OLAP Powerhouse)
DuckDB handles the raw, mathematically dense analytics data.
1. **No Relational Overhead:** DuckDB is specifically designed to run `GROUP BY`, `SUM`, and `AVERAGE` queries across hundreds of millions of raw columns simultaneously in milliseconds.
2. **Dynamic Generation:** When the Celery Worker transforms a new dataset, it forces a clean `DROP TABLE IF EXISTS company_{id}_data` and rebuilds a brand new table with the strict schema.
3. **Data Profiling Table:** Beside the data table lives a `{company_id}_profile` table holding pre-computed metadata regarding text vs. numeric columns, vastly accelerating front-end visual rendering.

## 4. The `Context Manager` Lock Fix
Because Docker and the DuckDB extension (VS Code) run natively on the Windows host, the raw `bizlytics.db` file suffers from severe "Read/Write Locking" errors on concurrent access.
* **The Solution:** The backend no longer holds a global connection. By utilizing a Python `@contextlib.contextmanager` loop (`with get_connection() as con:`), the Celery worker only explicitly locks the DB file for the 50 milliseconds required to execute the Pandas load. The connection is instantly severed, freeing the DB file for external UI or Chatbot reads seamlessly.
