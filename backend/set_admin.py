import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database
import models

if len(sys.argv) < 2:
    print("Usage: python set_admin.py <user_id>")
    sys.exit(1)

user_id = int(sys.argv[1])
s = database.SessionLocal()
user = s.query(models.User).filter(models.User.id == user_id).first()

if not user:
    print(f"ERROR: No user found with ID {user_id}")
else:
    user.role = "admin"
    s.commit()
    print(f"SUCCESS: User '{user.email}' (ID: {user.id}) has been promoted to ADMIN!")

s.close()
