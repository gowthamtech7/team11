import sqlite3
import os

def migrate_escalation():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'road_damage.db')
    print(f"Migrating database at: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Add is_escalated column
        try:
            cursor.execute("ALTER TABLE tickets ADD COLUMN is_escalated INTEGER DEFAULT 0")
            print("Successfully added is_escalated column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column is_escalated already exists.")
            else:
                raise e

        # Add escalated_at column
        try:
            cursor.execute("ALTER TABLE tickets ADD COLUMN escalated_at DATETIME DEFAULT NULL")
            print("Successfully added escalated_at column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column escalated_at already exists.")
            else:
                raise e

        conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"An error occurred during migration: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_escalation()
