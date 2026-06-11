import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database
import models
from sqlalchemy import text, inspect

# Add role column if it doesn't exist 
inspector = inspect(database.engine)
columns = [c['name'] for c in inspector.get_columns('users')]

if 'role' not in columns:
    with database.engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
        conn.commit()
    print("SUCCESS: 'role' column added to users table!")
else:
    print("INFO: 'role' column already exists. Skipping migration.")

# List all users so you can see who to promote to admin
s = database.SessionLocal()
users = s.query(models.User).all()
print("\n=== Current Users ===")
for u in users:
    role = u.role if u.role else 'user'
    print(f"  ID: {u.id} | Email: {u.email} | Role: {role}")
s.close()
print("\nTo promote a user to admin, run: python set_admin.py <user_id>")
