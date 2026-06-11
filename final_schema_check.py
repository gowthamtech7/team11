import sqlite3
import os

db_path = os.path.join("backend", "road_damage.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def check(table):
    print(f"\n--- {table} ---")
    cursor.execute(f"PRAGMA table_info({table})")
    for col in cursor.fetchall():
        print(f"  {col[1]} ({col[2]})")

check("users")
check("tickets")
conn.close()
