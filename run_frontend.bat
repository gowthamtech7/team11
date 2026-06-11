@echo off
cd frontend
echo Installing dependencies...
call npm.cmd install
if %errorlevel% neq 0 (
    echo "NPM Install Failed! Trying with 'npm'..."
    call npm install
)

echo Starting Frontend...
call npm.cmd run dev
if %errorlevel% neq 0 (
    echo "NPM Run Dev Failed! Trying with 'npm'..."
    call npm run dev
)
pause
