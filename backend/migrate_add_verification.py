import sqlite3
import os

def migrate_db():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'road_damage.db')
    print(f"Migrating database at: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Add resolution_image_path column
        try:
            cursor.execute("ALTER TABLE tickets ADD COLUMN resolution_image_path VARCHAR DEFAULT NULL")
            print("Successfully added resolution_image_path column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column resolution_image_path already exists.")
            else:
                raise e

        # Add verification_status column
        try:
            cursor.execute("ALTER TABLE tickets ADD COLUMN verification_status VARCHAR DEFAULT 'Pending'")
            print("Successfully added verification_status column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column verification_status already exists.")
            else:
                raise e

        # Set default verification_status for existing tickets based on status
        cursor.execute("UPDATE tickets SET verification_status = 'Passed' WHERE status = 'Resolved' AND verification_status is NULL")

        conn.commit()
        print("Migration complete successfully!")

    except Exception as e:
        print(f"An error occurred during migration: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_db()
