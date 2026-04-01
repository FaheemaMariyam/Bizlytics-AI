print("🔥 FILE STARTED")

from storage.s3_client import s3

try:
    response = s3.list_buckets()
    print("✅ S3 Connected")
    print(response)
except Exception as e:
    print("❌ Error:", e)