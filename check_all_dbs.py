import sqlite3
import os

dbs = ["road_damage.db", "backend/road_damage.db"]

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"\nChecking {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(users)")
        cols = [info[1] for info in cursor.fetchall()]
        print(f"  'users' columns: {cols}")
        
        cursor.execute("PRAGMA table_info(tickets)")
        cols = [info[1] for info in cursor.fetchall()]
        print(f"  'tickets' columns: {cols}")
        
        conn.close()
    else:
        print(f"\n{db_path} does not exist.")
