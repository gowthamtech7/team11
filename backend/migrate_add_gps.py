import sqlite3

def migrate():
    print("Migrating database adding latitude and longitude columns to tickets...")
    conn = sqlite3.connect("road_damage.db")
    cursor = conn.cursor()
    
    try:
        # Check if the column exists
        cursor.execute("PRAGMA table_info(tickets)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "latitude" not in columns:
            cursor.execute("ALTER TABLE tickets ADD COLUMN latitude FLOAT")
            print("Successfully added 'latitude' column to 'tickets' table.")
        else:
            print("'latitude' column already exists.")
            
        if "longitude" not in columns:
            cursor.execute("ALTER TABLE tickets ADD COLUMN longitude FLOAT")
            print("Successfully added 'longitude' column to 'tickets' table.")
        else:
            print("'longitude' column already exists.")
            
        conn.commit()
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
