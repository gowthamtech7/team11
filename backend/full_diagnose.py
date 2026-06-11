import sys
import os

# Set up path to import backend modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import crud
import schemas
import models
from fastapi.encoders import jsonable_encoder

def diagnose():
    db = SessionLocal()
    try:
        print("--- DATABASE DIAGNOSTIC ---")
        print(f"Engine URL: {engine.url}")
        
        user_count = db.query(models.User).count()
        ticket_count = db.query(models.Ticket).count()
        print(f"Users found: {user_count}")
        print(f"Tickets found: {ticket_count}")

        if user_count > 0:
            user = db.query(models.User).first()
            print(f"Sample User: {user.name} ({user.email}) | Role: {user.role} | Phone: {user.phone}")

        if ticket_count > 0:
            print("\n--- SAMPLE TICKET CHECK ---")
            ticket = db.query(models.Ticket).first()
            print(f"Ticket ID: {ticket.id}")
            print(f"User ID associated: {ticket.user_id}")
            
            user = db.query(models.User).filter(models.User.id == ticket.user_id).first()
            if user:
                print(f"Associated User: {user.name} ({user.email})")
            else:
                print("WARNING: Associated User NOT FOUND in database!")

            print("\n--- PYDANTIC VALIDATION CHECK ---")
            try:
                # Need to satisfy all fields in TicketResponse
                validated = schemas.TicketResponse.from_orm(ticket)
                print(f"SUCCESS: Pydantic validation passed for ticket {validated.id}")
                
                # Check JSON encoding
                encoded = jsonable_encoder(validated)
                print("SUCCESS: jsonable_encoder passed")
            except Exception as ve:
                print(f"FAILED Pydantic/JSON: {ve}")
                import traceback
                traceback.print_exc()

        print("\n--- ENDPOINT SIMULATION ---")
        # Simulate get_all_tickets
        tickets = crud.get_all_tickets(db)
        print(f"CRUD get_all_tickets returned {len(tickets)} items")
        if tickets:
            print("SUCCESS: crud.get_all_tickets succeeded")
        
    except Exception as e:
        print(f"GENERAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
