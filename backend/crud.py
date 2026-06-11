from sqlalchemy.orm import Session
import models
from datetime import datetime


def create_user(db: Session, name: str, email: str, hashed_password: str, phone: str = None):
    user = models.User(name=name, email=email, password=hashed_password, phone=phone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def update_user_profile(db: Session, user_id: int, user_update: dict):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        if "name" in user_update and user_update["name"]:
            user.name = user_update["name"]
        if "phone" in user_update and user_update["phone"] is not None:
             user.phone = user_update["phone"]
        db.commit()
        db.refresh(user)
    return user


def create_ticket(db: Session, user_id: int, ticket_data: dict, image_path: str):
    ticket = models.Ticket(
        user_id=user_id,
        image_path=image_path,
        damage_type=ticket_data["class"],
        severity=ticket_data["severity"],
        confidence=ticket_data["confidence"],
        priority=calculate_priority(ticket_data["class"], ticket_data["severity"]),
        location=ticket_data.get("location", "Unknown"),
        latitude=ticket_data.get("latitude", None),
        longitude=ticket_data.get("longitude", None),
        user_comment=ticket_data.get("user_comment", None)
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_user_tickets(db: Session, user_id: int):
    from sqlalchemy.orm import joinedload
    return db.query(models.Ticket).options(joinedload(models.Ticket.user)).filter(models.Ticket.user_id == user_id).all()


def calculate_priority(damage_type, severity):
    if damage_type == "Normal":
        return "Low"
    if severity == "High":
        return "Critical"
    elif severity == "Medium":
        return "High"
    else:
        return "Medium"

def get_all_tickets(db: Session, status: str = None, severity: str = None, is_escalated: int = None, search: str = None):
    from sqlalchemy.orm import joinedload
    query = db.query(models.Ticket).options(joinedload(models.Ticket.user))
    
    if status and status != "All":
        if status == "AwaitingUserInput":
            query = query.filter(models.Ticket.verification_status == "AwaitingUserInput")
        else:
            query = query.filter(models.Ticket.status == status)
    if severity and severity != "All":
        query = query.filter(models.Ticket.severity == severity)
    if is_escalated is not None:
        query = query.filter(models.Ticket.is_escalated == is_escalated)
    if search:
        query = query.filter(
            (models.Ticket.location.ilike(f"%{search}%")) | 
            (models.Ticket.damage_type.ilike(f"%{search}%")) |
            (models.Ticket.id.cast(models.String).ilike(f"%{search}%"))
        )
        
    return query.order_by(models.Ticket.created_at.desc()).all()

def check_for_escalations(db: Session):
    """Marks 'Open' tickets older than 48 hours as escalated."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=48)
    
    unaddressed_tickets = db.query(models.Ticket).filter(
        models.Ticket.status == "Open",
        models.Ticket.is_escalated == 0,
        models.Ticket.created_at <= cutoff
    ).all()
    
    escalated_count = 0
    for ticket in unaddressed_tickets:
        ticket.is_escalated = 1
        ticket.escalated_at = datetime.utcnow()
        escalated_count += 1
        
    if escalated_count > 0:
        db.commit()
    return escalated_count

def update_ticket(db: Session, ticket_id: int, status: str = None, admin_feedback: str = None, resolution_image_path: str = None, verification_status: str = None):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if ticket:
        if status:
            ticket.status = status
        if admin_feedback is not None:
            ticket.admin_feedback = admin_feedback
        if resolution_image_path is not None:
            ticket.resolution_image_path = resolution_image_path
        if verification_status is not None:
            ticket.verification_status = verification_status
        db.commit()
        db.refresh(ticket)
    return ticket

def delete_ticket(db: Session, ticket_id: int):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if ticket:
        db.delete(ticket)
        db.commit()
        return True
    return False