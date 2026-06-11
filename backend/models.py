from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True) # Optional phone number
    password = Column(String, nullable=False)
    role = Column(String, default="user")  # "user" or "admin"
    created_at = Column(DateTime, default=datetime.utcnow)

    tickets = relationship("Ticket", back_populates="user")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_path = Column(String)
    damage_type = Column(String)
    severity = Column(String)
    confidence = Column(Float)
    priority = Column(String)
    status = Column(String, default="Open")
    location = Column(String, default="Unknown")
    latitude = Column(Float, nullable=True)   # Added for GPS Map View
    longitude = Column(Float, nullable=True)  # Added for GPS Map View
    user_comment = Column(String, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)
    admin_feedback = Column(String, default=None)
    resolution_image_path = Column(String, nullable=True)
    verification_status = Column(String, default="Pending")
    is_escalated = Column(Integer, default=0)
    escalated_at = Column(DateTime, nullable=True)
    user_verification_token = Column(String, nullable=True, unique=True)
    user_verified_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="tickets")