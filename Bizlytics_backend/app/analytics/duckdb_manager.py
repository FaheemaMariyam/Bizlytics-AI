import contextlib
import logging
import threading
import time
from pathlib import Path

import duckdb
from filelock import FileLock  #  Handles locking between different Docker containers

logger = logging.getLogger(__name__)

# Base directory for analytical databases
DATA_DIR = Path("data/analytics")

# Internal lock for thread safety within the same process
_db_lock = threading.Lock()


def get_db_path(company_id: int) -> Path:
    """Returns the unique path for a specific company's database file."""
    return DATA_DIR / f"company_{company_id}.db"


def get_lock_path(company_id: int) -> Path:
    """Returns the unique path for a specific company's lock file."""
    return DATA_DIR / f"company_{company_id}.db.lock"


@contextlib.contextmanager
def get_connection(company_id: int, read_only=False, retries=10, delay=0.5):
    """
    Yields a short-lived DuckDB connection isolated by company_id.
    Isolating files prevents processes for different companies from blocking each other.
    """
    db_path = get_db_path(company_id)
    lock_path = get_lock_path(company_id)

    # Ensure the analytics directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Use FileLock for cross-container safety (scoped to this specific company)
    lock = FileLock(lock_path)

    for attempt in range(retries):
        try:
            # Wait up to 10 seconds for the lock to become available
            with lock.acquire(timeout=10):
                # Connect to the company-specific database file
                conn = duckdb.connect(str(db_path), read_only=read_only)
                try:
                    yield conn
                finally:
                    conn.close()  # ALWAYS close immediately to release the file
                return  # Success, exit the retry loop

        except Exception as e:
            if attempt < retries - 1:
                logger.warning(
                    f"[Company {company_id}] DB busy (Attempt {attempt+1}/{retries}). Retrying..."
                )
                time.sleep(delay)  # Wait a bit before trying again
                continue
            logger.error(f"[Company {company_id}] DuckDB Connection failed: {e}")
            raise e


def load_dataframe(company_id: int, df, table_name: str = "raw_data"):
    """
    Loads cleaned rows into a company-specific database file.
    """
    # 1. Thread lock for safety inside this container
    with _db_lock:
        # 2. File lock (inside get_connection) for safety across all containers
        with get_connection(company_id, read_only=False) as con:
            # Drop old table to prevent schema conflicts
            con.execute(f"DROP TABLE IF EXISTS {table_name}")
            # Create table and insert all data safely
            con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")

    return len(df)


def swap_tables(company_id: int, table_mappings: dict):
    """
    Atomically swaps temporary tables to their final names.
    table_mappings: {"temp_raw_data": "raw_data", "temp_bi_reports": "bi_reports"}
    """
    with _db_lock:
        with get_connection(company_id, read_only=False) as con:
            # Begin transaction for ACID atomicity
            con.execute("BEGIN TRANSACTION")
            try:
                for temp_name, final_name in table_mappings.items():
                    con.execute(f"DROP TABLE IF EXISTS {final_name}")
                    con.execute(f"ALTER TABLE {temp_name} RENAME TO {final_name}")
                con.execute("COMMIT")
                logger.info(f"[Company {company_id}] Transactional swap completed for {list(table_mappings.values())}")
            except Exception as e:
                con.execute("ROLLBACK")
                logger.error(f"[Company {company_id}] Transactional swap failed: {e}")
                raise e
