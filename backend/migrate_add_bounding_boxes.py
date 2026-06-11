import sqlite3

def upgrade():
    conn = sqlite3.connect("road_damage.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE tickets ADD COLUMN bounding_boxes TEXT DEFAULT NULL")
        conn.commit()
        print("Successfully added bounding_boxes column to tickets table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column bounding_boxes already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    upgrade()
