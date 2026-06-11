@echo off
REM Unified deployment script for Road Damage Detection System

REM Start backend
start cmd /k "call run_backend.bat"

REM Start frontend
start cmd /k "call run_frontend.bat"

REM (Optional) Start ML training (uncomment if needed)
REM start cmd /k "call run_training.bat"

echo All services started in separate terminals.
pause
