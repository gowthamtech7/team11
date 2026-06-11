import sqlite3
import os

db_path = "backend/road_damage.db"

def migrate_table(table, column, type_and_default):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [info[1] for info in cursor.fetchall()]
        if column not in columns:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_and_default}")
            print(f"SUCCESS: Added {column} to {table}")
        else:
            print(f"INFO: {column} already exists in {table}")
        conn.commit()
    except Exception as e:
        print(f"ERROR migrating {table}.{column}: {e}")
    finally:
        conn.close()

# Users table
migrate_table("users", "role", "VARCHAR DEFAULT 'user'")
migrate_table("users", "phone", "VARCHAR")

# Tickets table (for completeness)
migrate_table("tickets", "resolution_image_path", "VARCHAR DEFAULT NULL")
migrate_table("tickets", "verification_status", "VARCHAR DEFAULT 'Pending'")
migrate_table("tickets", "is_escalated", "INTEGER DEFAULT 0")
migrate_table("tickets", "escalated_at", "DATETIME DEFAULT NULL")
migrate_table("tickets", "latitude", "FLOAT DEFAULT NULL")
migrate_table("tickets", "longitude", "FLOAT DEFAULT NULL")
migrate_table("tickets", "user_comment", "VARCHAR DEFAULT NULL")
migrate_table("tickets", "admin_feedback", "VARCHAR DEFAULT NULL")
