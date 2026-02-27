import smtplib
from email.message import EmailMessage
from app.core.config import settings

def send_email(user_address: str, message: str, logger) -> bool:
    try:
        msg = EmailMessage()
        msg["Subject"] = "Moby Alert"
        msg["From"] = "clientmoby@gmail.com"
        msg["To"] = user_address
        msg.set_content(message)

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login("clientmoby@gmail.com", settings.GOOGLE_PASSWORD)
            s.send_message(msg)
        return True
    except Exception:
        logger.exception("send_email failed")
        return False