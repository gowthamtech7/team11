import sqlite3
import os

dbs = ["road_damage.db", "backend/road_damage.db"]

for db_path in dbs:
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            print(f"{db_path} has {count} users.")
        except Exception as e:
            print(f"Error checking {db_path}: {e}")
            
        conn.close()
    else:
        print(f"{db_path} does not exist.")
