import sqlite3
import os

def repair_db():
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'road_damage.db')
    print(f"Repairing database at: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check existing columns
        cursor.execute("PRAGMA table_info(tickets)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns: {existing_cols}")

        to_add = [
            ("latitude", "FLOAT"),
            ("longitude", "FLOAT"),
            ("user_comment", "VARCHAR")
        ]

        for col_name, col_type in to_add:
            if col_name not in existing_cols:
                try:
                    cursor.execute(f"ALTER TABLE tickets ADD COLUMN {col_name} {col_type}")
                    print(f"Added column: {col_name}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")
            else:
                print(f"Column {col_name} already exists.")

        conn.commit()
        print("Repair complete!")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    repair_db()
