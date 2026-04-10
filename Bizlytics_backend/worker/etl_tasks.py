# It connects to the database, downloads the file, cleans it, classifies the columns, and loads it into DuckDB
import json
import logging
import time

from sqlalchemy import text

from app.analytics.duckdb_manager import load_dataframe
from app.analytics.models import RawUpload, UploadStatus
from app.analytics.service import _parse_to_dataframe, clean_dataframe
from app.auth.models import Company
from app.database import SessionLocal
from storage.s3_service import download_file_from_s3
from worker.aggregation import run_aggregations
from worker.celery_app import celery_app
from worker.column_classifier import classify_columns

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_etl(self, upload_id: int, company_id: int):
    """
    Main background task to process a file from S3 to DuckDB.
    """
    db = SessionLocal()
    start_time = time.time()

    try:
        # 1. SCOPING: Identify which tenant's schema we must use
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.error(f"Company {company_id} not found in public.companies")
            return

        schema_name = company.schema_name
        logger.info(
            f"Processing ETL for company: {company.company_name} (Schema: {schema_name})"
        )

        # 2. ISOLATION: Explicitly switch Postgres to this company's private schema
        # This ensures all DB writes (like upload status) go to the right place.
        db.execute(text(f"SET search_path TO {schema_name}, public"))

        # 3. DATA RETRIEVAL
        upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()
        if not upload:
            logger.error(f"Upload {upload_id} not found")
            return

        upload.status = UploadStatus.processing
        db.commit()

        # 4. DATA PIPELINE (S3 -> Pandas -> DuckDB)
        logger.info(f"Downloading file for upload {upload_id}")
        content = download_file_from_s3(upload.s3_url)

        df_raw = _parse_to_dataframe(content, upload.file_type)
        df_clean = clean_dataframe(df_raw)

        # 5. METADATA: Classify and save column mapping
        mapping = classify_columns(df_clean.columns.tolist())
        upload.column_count = len(df_clean.columns)
        upload.columns_metadata = json.dumps(df_clean.columns.tolist())
        upload.column_mapping = json.dumps(mapping)
        db.commit()

        # 6. STORAGE: Load cleaned data into isolated DuckDB table
        # Note: We use the numeric company_id for the DuckDB filename for stability.
        logger.info(f"Loading {len(df_clean)} rows into DuckDB")
        load_dataframe(company_id, df_clean)

        # 7. AGGREGATION: Pre-calculate analytical metrics for the frontend
        logger.info(f"Running aggregations for company {company_id}")
        run_aggregations(company_id, mapping)

        # 8. FINALIZE
        upload.status = UploadStatus.completed
        upload.row_count = len(df_clean)
        db.commit()

        elapsed = time.time() - start_time
        logger.info(f"ETL Completed in {elapsed:.2f}s for upload {upload_id}")

    except Exception as exc:
        db.rollback()
        logger.error(f"ETL Failed for upload {upload_id}: {exc}")

        # Update status to failed
        upload = db.query(RawUpload).filter(RawUpload.id == upload_id).first()
        if upload:
            upload.status = UploadStatus.failed
            db.commit()

        # Retry logic for network/S3 issues
        raise self.retry(exc=exc, countdown=60)

    finally:
        db.close()
