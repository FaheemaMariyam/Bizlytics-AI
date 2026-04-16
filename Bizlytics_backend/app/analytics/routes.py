import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics import service
from app.analytics.models import RawUpload  # Added
from app.auth.dependencies import require_hr
from app.auth.models import Company, User
from app.database import get_db
from storage.s3_service import upload_file_to_s3
from worker.etl_tasks import process_etl
from app.analytics.duckdb_manager import get_connection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    1. Upload file to S3.
    2. Save metadata (S3 URL) to Postgres.
    3. Trigger ETL in background.
    """
    # Find the numeric company_id (needed for DuckDB filename)
    company = (
        db.query(Company)
        .filter(Company.schema_name == current_user.schema_name)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company metadata not found")

    # 1. Upload to S3
    file_url = upload_file_to_s3(file.file, file.filename, file.content_type)
    if not file_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")

    # 2. Save metadata to tenant-specific raw_uploads table
    raw_upload = service.save_raw_file(db, file_url, file.filename, company.id)

    # 3. Trigger ETL in background using Celery
    process_etl.delay(raw_upload.id, company.id)

    return {
        "message": f"File '{file.filename}' uploaded to S3 successfully.",
        "upload_id": raw_upload.id,
        "status": raw_upload.status,
        "s3_url": file_url,
    }


@router.get("/files")
def list_company_files(
    db: Session = Depends(get_db), current_user: User = Depends(require_hr)
):
    """
    List all uploaded files for the HR's company (scoped to tenant schema).
    """
    files = db.query(RawUpload).order_by(RawUpload.created_at.desc()).all()

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "status": f.status,
            "s3_url": f.s3_url,
            "created_at": f.created_at,
        }
        for f in files
    ]

@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(require_hr)):
    # 1. Resolve numeric company ID and latest upload status
    company = db.query(Company).filter(Company.schema_name == current_user.schema_name).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company_id = company.id
    latest_upload = db.query(RawUpload).order_by(RawUpload.created_at.desc()).first()
    
    with get_connection(company_id, read_only=True) as con:
        tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]

        # 2. Fetch Executive BI Reports (KPIs, Distributions, Trends, Cross-dims)
        bi_reports = []
        active_upload_id = None
        if "bi_reports" in tables:
            df = con.execute("SELECT type, label, value FROM bi_reports").df()
            
            # Extract internal metadata
            meta_row = df[df['type'] == 'meta_upload_id']
            if not meta_row.empty:
                active_upload_id = int(meta_row.iloc[0]['value'])
            
            # Send only visible reports to frontend
            bi_reports = df[df['type'] != 'meta_upload_id'].to_dict(orient="records")

        # 3. Fetch aggregations (numeric stats)
        aggs = []
        if "aggregations" in tables:
            aggs = con.execute("SELECT column_name as label, total, average, maximum, minimum FROM aggregations").df().to_dict(orient="records")

        # 4. Fetch data profile
        profile = {}
        if "profile" in tables:
            profile_row = con.execute("SELECT total_columns, total_rows FROM profile").fetchone()
            if profile_row:
                profile = {"total_columns": profile_row[0], "total_rows": profile_row[1]}

        return {
            "summary": aggs,
            "bi_reports": bi_reports,
            "profile": profile,
            "metadata": {
                "active_upload_id": active_upload_id,
                "latest_upload_status": latest_upload.status if latest_upload else "no_data",
                "latest_upload_filename": latest_upload.filename if latest_upload else None,
                "is_stale": latest_upload and active_upload_id and (latest_upload.id != active_upload_id)
            },
            "status": "success"
        }