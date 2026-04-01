import subprocess


def run_uvicorn():
    print("Starting uvicorn with output capture...")
    process = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=r"c:\Users\acer\Desktop\Bizlytics Ai\Bizlytics_backend",
    )

    # Print output in real-time
    for line in process.stdout:
        print(line, end="", flush=True)


if __name__ == "__main__":
    run_uvicorn()
