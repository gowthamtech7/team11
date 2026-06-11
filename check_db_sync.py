import sqlite3
import os

dbs = ["road_damage.db", "backend/road_damage.db"]

for db_path in dbs:
    full_path = os.path.abspath(db_path)
    if os.path.exists(full_path):
        print(f"\nDATABASE: {full_path}")
        conn = sqlite3.connect(full_path)
        cursor = conn.cursor()
        
        for table in ["users", "tickets"]:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [info[1] for info in cursor.fetchall()]
            print(f"  {table} table columns: {cols}")
        
        conn.close()
    else:
        print(f"\nDATABASE NOT FOUND: {full_path}")
