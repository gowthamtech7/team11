import sys
import os
import traceback

print(f"Current Working Directory: {os.getcwd()}")
print(f"Python Executable: {sys.executable}")

def check_import(module_name):
    try:
        __import__(module_name)
        print(f"[OK] {module_name} imported")
        return True
    except ImportError as e:
        print(f"[FAIL] {module_name} failed: {e}")
        return False

check_import("fastapi")
check_import("sqlalchemy")
check_import("tensorflow")

print("Attempting to import main...")
try:
    import main
    print("[OK] main imported successfully")
except Exception as e:
    print(f"[FAIL] Failed to import main: {e}")
    traceback.print_exc()
