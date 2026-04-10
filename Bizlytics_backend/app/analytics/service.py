import io  # binary file → readable buffer
import logging

import pandas as pd
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.analytics.duckdb_manager import load_dataframe
from app.analytics.models import FileType, RawUpload, UploadStatus
from storage.s3_service import upload_file_to_s3

logger = logging.getLogger(__name__)


def _parse_to_dataframe(content: bytes, file_type: FileType) -> pd.DataFrame:
    """
    B1: Parse raw binary content into a pandas DataFrame.
    """
    buf = io.BytesIO(content)

    if file_type == FileType.csv:
        return pd.read_csv(buf, encoding="utf-8", on_bad_lines="skip")
    elif file_type == FileType.xlsx:
        # Load without header first to find the real start of the table
        df_temp = pd.read_excel(buf, header=None, engine="openpyxl")

        # Find the first row that has at least 3 non-null values (typical for a table)
        header_idx = 0
        for i, row in df_temp.iterrows():
            if row.count() >= 3:
                header_idx = i
                break

        # Reload with the detected header row
        buf.seek(0)
        return pd.read_excel(buf, header=header_idx, engine="openpyxl")

    elif file_type == FileType.json:
        return pd.read_json(buf)

    raise ValueError(f"Unsupported file type: {file_type}")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:

    # Normalize columns
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_", regex=False)

    # Strip whitespace first
    df = df.apply(lambda col: col.str.strip() if col.dtype == "object" else col)

    # Convert empty strings to NaN
    df.replace("", pd.NA, inplace=True)

    # Remove empty rows/columns
    df = df.dropna(how="all").dropna(axis=1, how="all")

    # Remove duplicates
    df = df.drop_duplicates().reset_index(drop=True)

    # REMOVE INDEX COLUMNS (e.g., 'unnamed: 0')
    unnamed_cols = [c for c in df.columns if "unnamed" in c.lower()]
    if unnamed_cols:
        df = df.drop(columns=unnamed_cols)

    #  Prevent DuckDB ConversionException on mixed-type columns.
    # If a column has mostly numbers but some strings ('No'), DuckDB might incorrectly guess 'DOUBLE'.
    #  strictly cast any remaining 'object' column to 'string' while preserving actual nulls.
    for col in df.columns:
        if df[col].dtype == "object":
            # Convert non-null values to string to enforce type consistency safely
            df[col] = df[col].apply(lambda x: str(x) if pd.notnull(x) else x)
            # Standardize column to pandas string extension type
            df[col] = df[col].astype("string")

    return df


def detect_file_type(filename: str) -> FileType:
    """Detect file type based on extension."""
    ext = filename.split(".")[-1].lower()
    if ext == "csv":
        return FileType.csv
    elif ext in ["xlsx", "xls"]:
        return FileType.xlsx
    elif ext == "json":
        return FileType.json
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")


def save_raw_file(
    db: Session, file_url: str, filename: str, company_id: int
) -> RawUpload:
    """Save the raw file metadata to PostgreSQL and stop (ETL deferred)."""
    try:
        file_type = detect_file_type(filename)

        raw_upload = RawUpload(
            filename=filename,
            file_type=file_type,
            s3_url=file_url,
            status=UploadStatus.pending,  # B1: Marked as pending till ETL runs
        )

        db.add(raw_upload)
        db.commit()

        logger.info(
            f"File {filename} metadata saved to Postgres for company (schema scope)"
        )
        return raw_upload
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving file details to Postgres: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to save file metadata: {str(e)}"
        )
