from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, Form, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import shutil
import os
import uuid

import database
import models
import schemas
import crud
from email_service import EmailService

email_service = EmailService()

# ---------------- DATABASE ----------------

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Road Damage Detection API")


# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- JWT SETTINGS ----------------

SECRET_KEY = "road_damage_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# ---------------- UPLOAD FOLDER ----------------

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------- DATABASE DEPENDENCY ----------------

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- PASSWORD FUNCTIONS ----------------

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

# ---------------- TOKEN FUNCTIONS ----------------

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = crud.get_user_by_email(db, email)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

# ---------------- ROOT ----------------

@app.get("/")
def root():
    return {"message": "Road Damage Detection API is running"}

# ---------------- REGISTER ----------------

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):

    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)
    return crud.create_user(db, user.name, user.email, hashed_pw, user.phone)

# ---------------- USER PROFILE ----------------

@app.get("/me", response_model=schemas.UserResponse)
def get_my_profile(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)
    return user

@app.put("/me/update", response_model=schemas.UserResponse)
def update_profile(
    user_update: schemas.UserUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)
    
    updated_user = crud.update_user_profile(db, user.id, user_update.dict(exclude_unset=True))
    return updated_user

# ---------------- LOGIN ----------------

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):

    db_user = crud.get_user_by_email(db, user.email)

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": db_user.email, "role": db_user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role,
        "name": db_user.name
    }

# ---------------- UPLOAD IMAGE (FIXED VERSION) ----------------

from typing import Optional

@app.post("/upload/")
async def upload_image(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token = authorization.split(" ")[1]
    user = get_current_user(token, db)

    # Save uploaded file
    file_ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Web-safe path for the frontend (database storage)
    db_image_path = f"/{UPLOAD_DIR}/{filename}"

    # Integrate real ML Model
    try:
        from ml_integration import MLService
        ml_service = MLService.get_instance()
        prediction = ml_service.predict(file_path)

        if "error" in prediction:
            if os.path.exists(file_path):
                os.remove(file_path)
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=400, content={"detail": prediction["error"]})
            
    except HTTPException:
        raise
    except Exception as e:
         if os.path.exists(file_path):
             os.remove(file_path)
         raise HTTPException(status_code=500, detail=f"ML Model Error: {str(e)}")

    return jsonable_encoder({
        "message": "Analysis ready",
        "prediction": prediction,
        "image_path": db_image_path
    })

# ---------------- CREATE TICKET (STEP 2) ----------------

@app.post("/tickets/", response_model=schemas.TicketResponse)
def create_ticket_endpoint(
    ticket_in: schemas.TicketCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)
    
    prediction_data = {
        "class": ticket_in.damage_type,
        "severity": ticket_in.severity,
        "confidence": ticket_in.confidence,
        "location": ticket_in.location,
        "latitude": ticket_in.latitude,
        "longitude": ticket_in.longitude,
        "user_comment": ticket_in.user_comment
    }
    
    ticket = crud.create_ticket(db, user.id, prediction_data, ticket_in.image_path)
    
    # Send email notification
    try:
        email_service.send_confirmation(
            recipient_email=user.email,
            user_name=user.name,
            ticket_id=ticket.id,
            damage_type=ticket.damage_type,
            severity=ticket.severity
        )
    except Exception as e:
        print(f"Email Error: {e}")

    return ticket

# ---------------- GET MY TICKETS ----------------

@app.get("/my-tickets")
def get_my_tickets(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token = authorization.split(" ")[1]

    user = get_current_user(token, db)

    print(f"[DEBUG] Fetching tickets for user_id: {user.id} ({user.email})")
    tickets = crud.get_user_tickets(db, user.id)
    return jsonable_encoder(tickets)

# ---------------- ADMIN TICKETS ----------------
from pydantic import BaseModel
from typing import Optional

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    admin_feedback: Optional[str] = None

@app.get("/tickets/")
def get_all_tickets(
    status: str = "All",
    severity: str = "All",
    is_escalated: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Trigger escalation check on dashboard load
    crud.check_for_escalations(db)
    tickets = crud.get_all_tickets(db, status=status, severity=severity, is_escalated=is_escalated, search=search)
    return jsonable_encoder(tickets)

@app.post("/tickets/{ticket_id}/verify_resolution/")
async def verify_resolution(
    ticket_id: int,
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    request: Request = None
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token = authorization.split(" ")[1]

    # Ensure ticket exists
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Save uploaded file
    file_ext = file.filename.split(".")[-1]
    filename = f"resolve_{ticket_id}_{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_image_path = f"/{UPLOAD_DIR}/{filename}"

    # Verify with ML Service
    try:
        from ml_integration import MLService
        ml_service = MLService.get_instance()
        prediction = ml_service.predict(file_path)

        if "error" in prediction:
            if os.path.exists(file_path):
                os.remove(file_path)
            return {"success": False, "detail": prediction["error"]}
            
        detected_class = prediction.get("class", "")
        
        if detected_class == "Normal Road Surface":
            ai_passed = True
            message_prefix = "✅ AI Verification Passed! Road appears fixed."
        else:
            ai_passed = False
            message_prefix = f"⚠️ AI still detects: {detected_class}."

        # ALWAYS ask user to verify with the photo
        verification_token = str(uuid.uuid4())
        
        updated_ticket = crud.update_ticket(
            db=db,
            ticket_id=ticket_id,
            status="In Progress",
            resolution_image_path=db_image_path,
            verification_status="AwaitingUserInput"
        )
        
        # Save token to ticket
        db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
        db_ticket.user_verification_token = verification_token
        db.commit()
        db.refresh(db_ticket)

        # Build email verification links
        base_url = f"http://localhost:8000"
        after_image_path = os.path.abspath(file_path)
        verify_yes_url = f"{base_url}/tickets/{ticket_id}/confirm_resolution?token={verification_token}&resolved=true"
        verify_no_url = f"{base_url}/tickets/{ticket_id}/confirm_resolution?token={verification_token}&resolved=false"

        try:
            email_service.send_user_verification_email(
                recipient_email=ticket.user.email,
                user_name=ticket.user.name,
                ticket_id=ticket.id,
                damage_type=ticket.damage_type,
                after_image_path=after_image_path,
                verify_yes_url=verify_yes_url,
                verify_no_url=verify_no_url,
                ai_passed=ai_passed
            )
        except Exception as e:
            print(f"Email Error: {e}")

        return {
            "success": ai_passed,
            "message": f"{message_prefix} Verification email containing the photo has been sent to the user for final confirmation.",
            "ticket": jsonable_encoder(db_ticket)
        }
            
    except Exception as e:
         if os.path.exists(file_path):
             os.remove(file_path)
         raise HTTPException(status_code=500, detail=f"Verification Error: {str(e)}")


@app.get("/tickets/{ticket_id}/confirm_resolution")
def confirm_resolution(
    ticket_id: int,
    token: str,
    resolved: bool,
    db: Session = Depends(get_db)
):
    """User clicks Yes/No from their verification email. Returns a styled HTML page."""
    from fastapi.responses import HTMLResponse

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()

    def error_page(msg):
        return HTMLResponse(content=f"""
        <html><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#f8fafc;text-align:center;">
        <div><div style="font-size:64px;margin-bottom:16px;">⚠️</div><h2>{msg}</h2></div>
        </body></html>
        """, status_code=400)

    if not ticket:
        return error_page("Ticket not found.")
    if ticket.user_verification_token != token:
        return error_page("Invalid or expired verification link.")
    if ticket.verification_status not in ("AwaitingUserInput",):
        # Already responded
        return HTMLResponse(content=f"""
        <html><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#f8fafc;text-align:center;">
        <div><div style="font-size:64px;">✅</div><h2>You've already responded to this ticket.</h2><p style="color:#94a3b8;">Ticket #{ticket_id} status: {ticket.status}</p></div>
        </body></html>
        """)

    from datetime import datetime as dt
    ticket.user_verified_at = dt.utcnow()
    ticket.user_verification_token = None  # Invalidate token after use

    if resolved:
        ticket.status = "Resolved"
        ticket.verification_status = "UserConfirmedResolved"
        db.commit()

        try:
            email_service.send_status_update(
                recipient_email=ticket.user.email,
                user_name=ticket.user.name,
                ticket_id=ticket.id,
                new_status="Resolved",
                admin_feedback="You confirmed the road repair is complete. Thank you!"
            )
        except Exception as e:
            print(f"Email Error: {e}")

        return HTMLResponse(content=f"""
        <html><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#f8fafc;text-align:center;">
        <div style="max-width:500px;">
            <div style="font-size:72px;">✅</div>
            <h1 style="color:#4ade80;">Thank You!</h1>
            <p style="color:#94a3b8;font-size:1.1rem;">You confirmed that Ticket #{ticket_id} is resolved.<br/>This ticket is now <strong style="color:#4ade80;">closed</strong>. Thank you for making our roads safer!</p>
        </div>
        </body></html>
        """)
    else:
        ticket.status = "Escalated"
        ticket.verification_status = "UserEscalated"
        ticket.is_escalated = 1
        ticket.escalated_at = dt.utcnow()
        db.commit()

        # Notify user their escalation was registered
        try:
            email_service.send_user_escalation_confirmed(
                recipient_email=ticket.user.email,
                user_name=ticket.user.name,
                ticket_id=ticket.id
            )
        except Exception as e:
            print(f"Email Error (user): {e}")

        # Alert admin/authority
        try:
            email_service.send_escalation_alert(
                recipient_email=ticket.user.email,  # In production: admin email
                ticket_id=ticket.id,
                damage_type=ticket.damage_type,
                severity=ticket.severity,
                location=ticket.location,
                created_at=str(ticket.created_at)
            )
        except Exception as e:
            print(f"Email Error (admin): {e}")

        return HTMLResponse(content=f"""
        <html><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#f8fafc;text-align:center;">
        <div style="max-width:500px;">
            <div style="font-size:72px;">🚨</div>
            <h1 style="color:#f87171;">Issue Escalated</h1>
            <p style="color:#94a3b8;font-size:1.1rem;">We've escalated Ticket #{ticket_id} to <strong style="color:#f87171;">higher authorities</strong>.<br/>You will be notified once action is taken.</p>
        </div>
        </body></html>
        """)


@app.post("/tickets/{ticket_id}/mark_opened")
def mark_ticket_opened(
    ticket_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Called when admin opens a ticket modal. Auto-moves Open → In Progress."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status != "Open":
        return {"message": "No change needed", "status": ticket.status}

    ticket.status = "In Progress"
    db.commit()
    db.refresh(ticket)

    try:
        email_service.send_status_update(
            recipient_email=ticket.user.email,
            user_name=ticket.user.name,
            ticket_id=ticket.id,
            new_status="In Progress",
            admin_feedback="An administrator has opened your ticket and is now reviewing your report."
        )
    except Exception as e:
        print(f"Email Error: {e}")

    return {"message": "Ticket marked In Progress", "ticket": jsonable_encoder(ticket)}


from pydantic import BaseModel as _BaseModel

class UserVerifyRequest(_BaseModel):
    resolved: bool

@app.post("/tickets/{ticket_id}/user_verify_app")
def user_verify_app(
    ticket_id: int,
    body: UserVerifyRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """In-app shortcut: logged-in user confirms resolution directly from MyTickets page."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.split(" ")[1]
    user = get_current_user(token, db)

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id, models.Ticket.user_id == user.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or not yours")
    if ticket.verification_status != "AwaitingUserInput":
        raise HTTPException(status_code=400, detail="Ticket is not awaiting user verification")

    from datetime import datetime as dt
    ticket.user_verified_at = dt.utcnow()
    ticket.user_verification_token = None

    if body.resolved:
        ticket.status = "Resolved"
        ticket.verification_status = "UserConfirmedResolved"
        db.commit()
        try:
            email_service.send_status_update(
                recipient_email=user.email, user_name=user.name,
                ticket_id=ticket.id, new_status="Resolved",
                admin_feedback="You confirmed the road repair is complete. Thank you!"
            )
        except Exception as e:
            print(f"Email Error: {e}")
        return {"message": "Ticket resolved. Thank you for confirming!"}
    else:
        ticket.status = "Escalated"
        ticket.verification_status = "UserEscalated"
        ticket.is_escalated = 1
        ticket.escalated_at = dt.utcnow()
        db.commit()
        try:
            email_service.send_user_escalation_confirmed(
                recipient_email=user.email, user_name=user.name, ticket_id=ticket.id
            )
        except Exception as e:
            print(f"Email Error: {e}")
        return {"message": "Issue escalated to higher authority."}


@app.put("/tickets/{ticket_id}")
def update_ticket_endpoint(ticket_id: int, ticket_update: TicketUpdate, db: Session = Depends(get_db)):
    updated_ticket = crud.update_ticket(db, ticket_id, ticket_update.status, ticket_update.admin_feedback)
    if not updated_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Send email notification
    try:
        email_service.send_status_update(
            recipient_email=updated_ticket.user.email,
            user_name=updated_ticket.user.name,
            ticket_id=updated_ticket.id,
            new_status=updated_ticket.status,
            admin_feedback=updated_ticket.admin_feedback
        )
    except Exception as e:
        print(f"Email Error: {e}")

    return updated_ticket

@app.delete("/tickets/{ticket_id}")
def delete_ticket_endpoint(ticket_id: int, db: Session = Depends(get_db)):
    success = crud.delete_ticket(db, ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted successfully"}

# ---------------- ANALYTICS ----------------

@app.get("/analytics/")
def get_analytics(db: Session = Depends(get_db)):
    tickets = crud.get_all_tickets(db)
    
    total = len(tickets)
    
    damage_types = {}
    severity_dist = {}
    status_dist = {}
    
    # Very simple trend: count by date string YYYY-MM-DD
    trend_dict = {}
    
    for t in tickets:
        # Damage types
        damage_types[t.damage_type] = damage_types.get(t.damage_type, 0) + 1
        # Severity
        severity_dist[t.severity] = severity_dist.get(t.severity, 0) + 1
        # Status
        status_dist[t.status] = status_dist.get(t.status, 0) + 1
        
        # Date trend
        date_str = t.created_at.strftime("%Y-%m-%d")
        trend_dict[date_str] = trend_dict.get(date_str, 0) + 1

    trend_list = [{"date": k, "count": v} for k, v in sorted(trend_dict.items())]

    return jsonable_encoder({
        "total_tickets": total,
        "damage_type_distribution": damage_types,
        "severity_distribution": severity_dist,
        "status_distribution": status_dist,
        "trend": trend_list,
        "tickets": tickets
    })

@app.get("/debug-model")
async def debug_model():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    model_path = os.path.join(project_root, 'ml_model', 'road_damage_model.h5')
    
    exists = os.path.exists(model_path)
    size = os.path.getsize(model_path) if exists else -1
    
    error_msg = None
    try:
        from tensorflow.keras.models import load_model
        m = load_model(model_path)
        load_success = True
    except Exception as e:
        load_success = False
        import traceback
        error_msg = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        
    return {
        "model_path": model_path,
        "exists": exists,
        "size_bytes": size,
        "load_success": load_success,
        "error": error_msg
    }