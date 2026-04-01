import smtplib
from email.mime.text import MIMEText

from app.core.config import SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USERNAME


def send_email(to: str, subject: str, body: str):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_USERNAME
    msg["To"] = to

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
