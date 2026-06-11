import sqlite3
import os

db_path = "road_damage.db"
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tickets)")
    columns = cursor.fetchall()
    print("Columns in 'tickets' table:")
    for col in columns:
        print(f"Index: {col[0]}, Name: {col[1]}, Type: {col[2]}")
    conn.close()
