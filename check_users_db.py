import sqlite3
import os

db_path = os.path.join("backend", "road_damage.db")
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in database: {tables}")
    
    if ('users',) in tables:
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nColumns in 'users' table:")
        for col in columns:
            print(f"Index: {col[0]}, Name: {col[1]}, Type: {col[2]}")
            
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"\nTotal users in table: {count}")
    else:
        print("\n'users' table NOT FOUND!")
        
    conn.close()
