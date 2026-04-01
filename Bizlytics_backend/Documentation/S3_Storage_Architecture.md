# AWS S3 Storage & Security Pipeline

## 1. Overview
Instead of saving massive 50MB raw Excel and CSV files to the physical hard drive of the servers (rapidly running out of SSD space), Bizlytics strictly offloads all uncleaned file blobs to an Amazon Web Services S3 Bucket (`bizlytics-uploads`).

## 2. Upload Lifecycle and Security
The S3 Bucket is definitively marked **Private** to prevent URL scraping or unauthorized downloads of sensitive HR data.

### Step 1: The Secure Upload
1. The FASTApi backend accepts the multipart generic binary file from the user.
2. The file is prefixed with a `crypto.uuid4()` tag (e.g., `456abd12-messy_data.xlsx`). This strictly prevents `File.xlsx` from overwriting a previous user's `File.xlsx`.
3. The `boto3` client natively streams the buffer direct to AWS via securely authenticated IAM credentials (`AWS_ACCESS_KEY_ID`).

### Step 2: The Secure Download
1. When Celery grabs the job ticket, it receives the secure AWS S3 URL.
2. Because the bucket is deeply private, running a bare HTTP request (`requests.get(url)`) returns a strict `403 Forbidden` error.
3. The worker actively parses the exact unqiue filename/key from the URL string, and triggers an authenticated `boto3` Client-SDK `s3.get_object()` download, instantly streaming the binary back into local RAM.

## 3. Why Not Save Files in Postgres?
Storing `.xlsx` blobs in PostgreSQL requires encoding and massive sequential table bloat, bringing database query speeds to a halt. S3 abstracts this perfectly: Postgres only saves the *URL* text string pointer, and DuckDB only saves the perfectly parsed numbers. The actual messy, bloated file lives exclusively on AWS.
