import sqlite3

def migrate():
    print("Migrating database adding phone column...")
    conn = sqlite3.connect("road_damage.db")
    cursor = conn.cursor()
    
    try:
        # Check if the column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "phone" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR")
            print("Successfully added 'phone' column to 'users' table.")
        else:
            print("'phone' column already exists.")
            
        conn.commit()
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
