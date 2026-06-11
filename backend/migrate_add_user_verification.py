"""
Migration: Add user_verification_token and user_verified_at to tickets table.
Run once: py migrate_add_user_verification.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "road_damage.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get current columns
cursor.execute("PRAGMA table_info(tickets)")
cols = [row[1] for row in cursor.fetchall()]

if "user_verification_token" not in cols:
    cursor.execute("ALTER TABLE tickets ADD COLUMN user_verification_token TEXT")
    print("[OK] Added user_verification_token column")
else:
    print("[SKIP] user_verification_token already exists")

if "user_verified_at" not in cols:
    cursor.execute("ALTER TABLE tickets ADD COLUMN user_verified_at DATETIME")
    print("[OK] Added user_verified_at column")
else:
    print("[SKIP] user_verified_at already exists")

conn.commit()
conn.close()
print("Migration complete.")
