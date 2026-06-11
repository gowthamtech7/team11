import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmailService, cls).__new__(cls)
            cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 465))
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_PASSWORD")
        self.enabled = all([self.sender_email, self.sender_password])
        
        if not self.enabled:
            print("[WARNING] Email Service disabled: SENDER_EMAIL or SENDER_PASSWORD not set in .env")

    def _send_email(self, recipient_email, subject, body_html, attach_image_path=None):
        if not self.enabled:
            print(f"[INTERNAL] Email suppressed (Service Disabled). Recipient: {recipient_email}")
            return False

        msg_type = "related" if attach_image_path else "alternative"
        message = MIMEMultipart(msg_type)
        message["Subject"] = subject
        message["From"] = f"Road Damage Monitoring <{self.sender_email}>"
        message["To"] = recipient_email

        if attach_image_path:
            alt_part = MIMEMultipart("alternative")
            alt_part.attach(MIMEText(body_html, "html"))
            message.attach(alt_part)
            
            if os.path.exists(attach_image_path):
                from email.mime.image import MIMEImage
                try:
                    with open(attach_image_path, 'rb') as f:
                        msg_image = MIMEImage(f.read())
                    msg_image.add_header('Content-ID', '<resolved_image>')
                    msg_image.add_header('Content-Disposition', 'inline')
                    message.attach(msg_image)
                except Exception as e:
                    print(f"[ERROR] Could not attach inline image: {e}")
        else:
            part = MIMEText(body_html, "html")
            message.attach(part)

        context = ssl.create_default_context()
        try:
            with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context) as server:
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())
            print(f"[SUCCESS] Email sent to {recipient_email}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to send email: {str(e)}")
            return False

    def send_confirmation(self, recipient_email, user_name, ticket_id, damage_type, severity):
        subject = f"Ticket #{ticket_id}: Road Damage Report Received"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">Report Received</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>Thank you for reporting road damage. Your report has been successfully logged in our system.</p>
                        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Ticket ID:</strong> #{ticket_id}</p>
                            <p style="margin: 5px 0;"><strong>Damage Type:</strong> {damage_type}</p>
                            <p style="margin: 5px 0;"><strong>Severity:</strong> {severity}</p>
                        </div>
                        <p>Our team will review the report and take necessary action. You will receive an update once the status changes.</p>
                        <p>Safe travels!</p>
                    </div>
                    <div style="background: #f3f4f6; color: #666; padding: 15px; text-align: center; font-size: 12px;">
                        This is an automated message from the Road Damage Detection System.
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)

    def send_status_update(self, recipient_email, user_name, ticket_id, new_status, admin_feedback=None):
        subject = f"Update on Ticket #{ticket_id}: Status is now {new_status}"
        feedback_section = f'<div style="background: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0;"><strong>Admin Feedback:</strong><br/>{admin_feedback}</div>' if admin_feedback else ""
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background: #6366f1; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">Ticket Update</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>There has been an update on your road damage report.</p>
                        <p style="font-size: 18px;">New Status: <span style="color: #4f46e5; font-weight: bold;">{new_status}</span></p>
                        {feedback_section}
                        <p>You can view more details in the "My Tickets" section of the application.</p>
                    </div>
                    <div style="background: #f3f4f6; color: #666; padding: 15px; text-align: center; font-size: 12px;">
                        This is an automated message from the Road Damage Detection System.
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)
    def send_escalation_alert(self, recipient_email, ticket_id, damage_type, severity, location, created_at):
        subject = f"URGENT: Escalated Ticket #{ticket_id} - Unaddressed for 48 Hours"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 8px; overflow: hidden;">
                    <div style="background: #ef4444; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">Escalation Alert</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>This is an automated escalation alert for a road damage report that has remained <strong>Open</strong> for more than 48 hours without administrative action.</p>
                        <div style="background: #fee2e2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <p style="margin: 0;"><strong>Ticket ID:</strong> #{ticket_id}</p>
                            <p style="margin: 5px 0;"><strong>Report Date:</strong> {created_at}</p>
                            <p style="margin: 5px 0;"><strong>Damage Type:</strong> {damage_type}</p>
                            <p style="margin: 5px 0;"><strong>Severity:</strong> {severity}</p>
                            <p style="margin: 5px 0;"><strong>Location:</strong> {location}</p>
                        </div>
                        <p>Please review this ticket immediately in the Admin Dashboard.</p>
                    </div>
                    <div style="background: #f3f4f6; color: #666; padding: 15px; text-align: center; font-size: 12px;">
                        Higher Authority Notification System | Road Damage Detection
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)

    def send_resolution_confirmed(self, recipient_email, user_name, ticket_id, damage_type):
        """Sent when AI verification passes — road confirmed fixed."""
        subject = f"✅ Ticket #{ticket_id}: Road Repair Confirmed!"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #22c55e; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 30px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                        <h1 style="margin: 0; font-size: 1.8rem;">Road Repair Confirmed!</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>Great news! Our AI system has verified that the road damage you reported has been <strong>successfully repaired</strong>.</p>
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Ticket ID:</strong> #{ticket_id}</p>
                            <p style="margin: 5px 0;"><strong>Issue:</strong> {damage_type}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Resolved</span></p>
                        </div>
                        <p>Thank you for helping keep our roads safe. Your report made a difference!</p>
                        <p>Safe travels! 🚗</p>
                    </div>
                    <div style="background: #f3f4f6; color: #666; padding: 15px; text-align: center; font-size: 12px;">
                        Road Damage Detection System — Automated Resolution Notice
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)

    def send_user_verification_email(self, recipient_email, user_name, ticket_id, damage_type,
                                      after_image_path, verify_yes_url, verify_no_url, ai_passed=False):
        """Sent to ask user if the road is actually fixed."""
        subject = f"❓ Ticket #{ticket_id}: Is your road issue resolved?"
        
        if ai_passed:
            ai_message = "Our AI analysis indicates that the road damage you reported has been <strong>successfully repaired</strong>. However, we still need <strong>your confirmation</strong>."
        else:
            ai_message = "Our automatic AI analysis was <strong>unable to fully confirm</strong> whether the road damage you reported has been repaired. We need <strong>your confirmation</strong>."

        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
                <div style="max-width: 620px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">

                    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 30px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
                        <h1 style="margin: 0; font-size: 1.6rem;">Please Verify Road Repair</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.85;">Ticket #{ticket_id} · {damage_type}</p>
                    </div>

                    <div style="padding: 30px;">
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>{ai_message}</p>

                        <p style="font-weight: 600; margin-bottom: 8px;">📸 After-repair image submitted by the field team:</p>
                        <div style="border-radius: 10px; overflow: hidden; border: 2px solid #e5e7eb; margin-bottom: 24px;">
                            <img src="cid:resolved_image" alt="After Repair" style="width: 100%; display: block; object-fit: cover; max-height: 300px;" />
                        </div>

                        <p style="font-size: 1.1rem; font-weight: 700; text-align: center; margin-bottom: 20px; color: #1e293b;">
                            Is the road issue at your location now resolved?
                        </p>

                        <table style="width: 100%; border-collapse: separate; border-spacing: 12px;">
                            <tr>
                                <td style="width: 50%; text-align: center;">
                                    <a href="{verify_yes_url}"
                                       style="display: block; background: linear-gradient(135deg, #16a34a, #15803d); color: white; text-decoration: none;
                                              padding: 16px 10px; border-radius: 10px; font-size: 1.1rem; font-weight: 700;">
                                        ✅ Yes, It's Fixed!
                                    </a>
                                </td>
                                <td style="width: 50%; text-align: center;">
                                    <a href="{verify_no_url}"
                                       style="display: block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none;
                                              padding: 16px 10px; border-radius: 10px; font-size: 1.1rem; font-weight: 700;">
                                        ❌ No, Still Broken
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin-top: 24px; font-size: 0.85rem; color: #6b7280; text-align: center;">
                            If you click <em>"No, Still Broken"</em>, this issue will be <strong>escalated to higher authorities</strong> for urgent attention.
                        </p>
                    </div>

                    <div style="background: #f3f4f6; color: #999; padding: 15px; text-align: center; font-size: 12px;">
                        Road Damage Detection System — User Verification Request
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body, attach_image_path=after_image_path)

    def send_user_escalation_confirmed(self, recipient_email, user_name, ticket_id):
        """Sent to user after they report the issue is still not fixed."""
        subject = f"🚨 Ticket #{ticket_id}: Issue Escalated to Higher Authority"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
                        <h1 style="margin: 0; font-size: 1.6rem;">Issue Escalated</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>We've received your feedback that Ticket #{ticket_id} is <strong>still not resolved</strong>.</p>
                        <p>This issue has been <strong>escalated to higher authorities</strong> for urgent action. You will receive a follow-up once the issue is properly addressed.</p>
                        <p>Thank you for keeping our roads safe.</p>
                    </div>
                    <div style="background: #f3f4f6; color: #666; padding: 15px; text-align: center; font-size: 12px;">
                        Road Damage Detection System
                    </div>
                </div>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)
