from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ---------------- USER SCHEMAS ----------------

class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------------- TICKET SCHEMAS ----------------

class TicketBase(BaseModel):
    location: Optional[str] = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    user_comment: Optional[str] = None


class TicketCreate(TicketBase):
    image_path: str
    damage_type: str
    severity: str
    confidence: float

class TicketResponse(TicketBase):
    id: int
    image_path: str
    damage_type: str
    severity: str
    confidence: float
    priority: str
    status: str
    created_at: datetime
    admin_feedback: Optional[str]
    user_comment: Optional[str]
    resolution_image_path: Optional[str] = None
    verification_status: Optional[str] = None
    is_escalated: int = 0
    escalated_at: Optional[datetime] = None
    
    # Adding user details for admin dashboard
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True