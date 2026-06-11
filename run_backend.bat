@echo off
cd backend
echo Installing Backend Requirements...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo "py launcher not found, trying 'python'..."
    python -m pip install -r requirements.txt
    python -m uvicorn main:app --reload
) else (
    py -m pip install -r requirements.txt
    py -m uvicorn main:app --reload
)
pause
