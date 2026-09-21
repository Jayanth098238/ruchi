import os
from dotenv import load_dotenv
load_dotenv()
import smtplib
from email.message import EmailMessage
import logging
from typing import Optional

# Optional PDF generation
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv('SMTP_HOST', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')
SMTP_FROM = os.getenv('SMTP_FROM', SMTP_USER)
USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
USE_SSL = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'


def send_email_with_attachment(to_email: str, subject: str, body_text: str, attachment_bytes: bytes, filename: str, content_type: str = 'application/octet-stream'):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        raise RuntimeError('SMTP not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS env vars')

    msg = EmailMessage()
    msg['From'] = SMTP_FROM
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(body_text)
    maintype, subtype = content_type.split('/', 1) if '/' in content_type else ('application', 'octet-stream')
    msg.add_attachment(attachment_bytes, maintype=maintype, subtype=subtype, filename=filename)

    try:
        if USE_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
                logger.info('Email sent to %s via SSL', to_email)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                if USE_TLS:
                    server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
                logger.info('Email sent to %s', to_email)
    except Exception as e:
        logger.error('Failed to send email: %s', e)
        raise


def build_pdf_bytes_from_text(text: str) -> Optional[bytes]:
    """Create a simple PDF from plain text. Returns None if PDF generation is unavailable."""
    if not REPORTLAB_AVAILABLE:
        return None
    try:
        from io import BytesIO
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        margin = 50
        max_width = width - margin * 2
        y = height - margin

        # Simple word-wrapped text
        c.setFont("Times-Roman", 11)
        import textwrap
        lines = []
        for paragraph in text.split("\n"):
            if not paragraph.strip():
                lines.append("")
                continue
            wrapped = textwrap.wrap(paragraph, width=95)
            lines.extend(wrapped)

        for line in lines:
            if y < margin + 40:
                c.showPage()
                c.setFont("Times-Roman", 11)
                y = height - margin
            c.drawString(margin, y, line)
            y -= 14

        c.showPage()
        c.save()
        pdf = buffer.getvalue()
        buffer.close()
        return pdf
    except Exception as e:
        logger.error('Failed to build PDF: %s', e)
        return None
