import sqlite3
import os

# Path to the database
DB_PATH = os.path.join("backend", "road_damage.db")

if not os.path.exists(DB_PATH):
    print(f"Error: Database not found at {DB_PATH}")
    print("Make sure you have run the backend server at least once.")
    exit()

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print(f"--- Database Content: {DB_PATH} ---")

for table in tables:
    table_name = table[0]
    print(f"\n[TABLE] {table_name}")
    print("=" * 60)
    
    # Get columns
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    # Print Headers
    header = " | ".join(f"{col:^15}" for col in columns)
    print(header)
    print("-" * len(header))
    
    # Get rows
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    if not rows:
        print("(Empty Table)")
    
    for row in rows:
        # Simple formatting
        row_str = " | ".join(f"{str(r)[:15]:^15}" for r in row)
        print(row_str)
    print("=" * 60)

conn.close()
