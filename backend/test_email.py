import sys
import os

# Add current directory to path so we can import email_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from email_service import EmailService
from dotenv import load_dotenv

def test_email():
    print("--- Starting Email Diagnostic Test ---")
    load_dotenv()
    
    email_service = EmailService()
    
    if not email_service.enabled:
        print("[FAIL] Email Service is DISABLED. Check your .env file.")
        print(f"SENDER_EMAIL: {os.getenv('SENDER_EMAIL')}")
        print(f"SENDER_PASSWORD: {'SET' if os.getenv('SENDER_PASSWORD') else 'NOT SET'}")
        return

    print(f"[INFO] Attempting to send test email from: {email_service.sender_email}")
    
    # We'll send it back to the same email address for testing
    success = email_service._send_email(
        recipient_email=email_service.sender_email,
        subject="🚀 Road Damage Detection - System Test",
        body_html="""
        <html>
            <body>
                <h2 style='color: #4f46e5;'>System Verification Success</h2>
                <p>If you are reading this, your Gmail notification system is <strong>operational</strong>!</p>
                <hr/>
                <p style='font-size: 12px; color: #666;'>Test triggered by Antigravity AI.</p>
            </body>
        </html>
        """
    )
    
    if success:
        print("[SUCCESS] Test email sent successfully! Please check your inbox.")
    else:
        print("[FAIL] Failed to send email. Ensure the App Password is correct and has no spaces.")

if __name__ == "__main__":
    test_email()
