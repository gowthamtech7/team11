import sys
import os
import subprocess
import time

print("--- DIAGNOSTIC START ---")
print(f"CWD: {os.getcwd()}")
print(f"Python: {sys.executable}")

# Check if backend folder exists
if not os.path.exists("backend"):
    print("ERROR: 'backend' directory not found!")
    sys.exit(1)

# Check if main.py exists
if not os.path.exists("backend/main.py"):
    print("ERROR: 'backend/main.py' not found!")
    sys.exit(1)

print("Attempting to import backend modules...")
try:
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    os.chdir("backend")
    import main
    print("SUCCESS: main.py imported successfully.")
except Exception as e:
    print(f"ERROR IMPORTING MAIN: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n--- ATTEMPTING TO LAUNCH SERVER ---")
print("Press Ctrl+C to stop if it freezes.")
try:
    subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload"], check=True)
except Exception as e:
    print(f"SERVER CRASHED: {e}")

print("--- DIAGNOSTIC END ---")
input("Press Enter to close...")
