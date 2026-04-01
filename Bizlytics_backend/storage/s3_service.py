import logging
import os
from uuid import uuid4

from dotenv import load_dotenv

from storage.s3_client import s3

load_dotenv()

logger = logging.getLogger(__name__)
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")


def upload_file_to_s3(file, filename, content_type="application/octet-stream"):
    try:
        unique_filename = f"{uuid4()}_{filename}"

        s3.upload_fileobj(
            file, BUCKET_NAME, unique_filename, ExtraArgs={"ContentType": content_type}
        )

        file_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{unique_filename}"
        return file_url

    except Exception as e:
        logger.error(f"S3 Upload Error: {e}")
        return None


def download_file_from_s3(file_url: str) -> bytes:
    """
    Downloads a private file from S3 using the authenticated s3 client.
    Extracts the key from the URL.
    """
    try:
        # Extract the key from the URL (everything after the last '/')
        unique_filename = file_url.split("/")[-1]

        logger.info(f"Downloading key {unique_filename} from bucket {BUCKET_NAME}")
        response = s3.get_object(Bucket=BUCKET_NAME, Key=unique_filename)
        return response["Body"].read()

    except Exception as e:
        logger.error(f"S3 Download Error: {e}")
        raise Exception(f"Failed to download file from S3: {str(e)}")
