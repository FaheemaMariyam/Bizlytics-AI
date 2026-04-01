from storage.s3_service import upload_file_to_s3

file_path = "test.csv"

with open(file_path, "rb") as f:
    url = upload_file_to_s3(f, "test.csv", "text/csv")
    print("Uploaded URL:", url)