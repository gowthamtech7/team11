import sqlite3
import os

db_path = "road_damage.db"
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tables in root database: {tables}")
    
    if ('users',) in tables:
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("\nColumns in 'users' table:")
        for col in columns:
            print(f"Name: {col[1]}")
            
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"\nTotal users in root table: {count}")
    else:
        print("\n'users' table NOT FOUND in root database!")
        
    conn.close()
