import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database
import models
from sqlalchemy import text, inspect

# Add user_comment column if it doesn't exist 
inspector = inspect(database.engine)
columns = [c['name'] for c in inspector.get_columns('tickets')]

if 'user_comment' not in columns:
    with database.engine.connect() as conn:
        conn.execute(text("ALTER TABLE tickets ADD COLUMN user_comment VARCHAR DEFAULT NULL"))
        conn.commit()
    print("SUCCESS: 'user_comment' column added to tickets table!")
else:
    print("INFO: 'user_comment' column already exists. Skipping migration.")
