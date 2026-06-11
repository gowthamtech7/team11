import sys
import os

# Set up path to import backend modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from database import SessionLocal
import crud
import schemas
from fastapi.encoders import jsonable_encoder

def diagnose():
    db = SessionLocal()
    try:
        print("1. Testing db.query(models.Ticket).all()...")
        tickets = crud.get_all_tickets(db)
        print(f"   Success: Found {len(tickets)} tickets.")

        print("2. Testing jsonable_encoder(tickets)...")
        encoded = jsonable_encoder(tickets)
        print(f"   Success: Encoded {len(encoded)} tickets.")

        if tickets:
            print("3. Testing Pydantic validation for the first ticket...")
            # Simulate what response_model=List[schemas.TicketResponse] would do
            try:
                # Need to satisfy all fields in TicketResponse
                first_ticket = tickets[0]
                validated = schemas.TicketResponse.from_orm(first_ticket)
                print(f"   Success: Validated ticket ID {validated.id}")
            except Exception as ve:
                print(f"   FAILED Pydantic Validation: {ve}")

    except Exception as e:
        print(f"   FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    diagnose()
