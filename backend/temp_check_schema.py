import sqlite3
import os

db_path = os.path.join("..", "road_damage.db")
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found from here ({os.getcwd()})")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tickets)")
    columns = cursor.fetchall()
    print("Columns in 'tickets' table:")
    for col in columns:
        print(f"Name: {col[1]}, Type: {col[2]}")
    conn.close()
