@echo off
cd ml_model
echo Installing ML Requirements...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo "py launcher not found, trying 'python'..."
    python -m pip install -r requirements.txt
    
    echo Starting Training...
    python train.py --epochs 20
) else (
    py -m pip install -r requirements.txt
    
    echo Starting Training...
    py train.py --epochs 20
)
pause
