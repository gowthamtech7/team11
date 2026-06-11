import os

PROJECT_ROOT = r"a:\road damage"
REPORT_MD = os.path.join(PROJECT_ROOT, "project_report.md")

FILES_TO_INCLUDE = [
    "README.md",
    "ARCHITECTURE.md",
    "backend/main.py",
    "backend/models.py",
    "backend/schemas.py",
    "backend/crud.py",
    "backend/database.py",
    "backend/email_service.py",
    "backend/ml_integration.py",
    "frontend/package.json",
    "ml_model/train.py",
    "ml_model/inference.py",
    "ml_model/setup_yolo_dataset.py",
    "ml_model/dataset.yaml"
]

def generate_report():
    with open(REPORT_MD, "w", encoding="utf-8") as out:
        out.write("# Comprehensive Project Report: Road Damage Detection & Smart Complaint Management System\n\n")
        out.write("This document contains the complete technical details, system architecture, and core codebase for the Road Damage Detection project.\n\n")
        
        for file_path in FILES_TO_INCLUDE:
            full_path = os.path.join(PROJECT_ROOT, file_path)
            if os.path.exists(full_path):
                out.write(f"## File: `{file_path}`\n\n")
                
                # Determine language for markdown syntax highlighting
                ext = file_path.split('.')[-1]
                lang_map = {'py': 'python', 'json': 'json', 'md': 'markdown', 'yaml': 'yaml'}
                lang = lang_map.get(ext, '')
                
                out.write(f"```{lang}\n")
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        out.write(content)
                except Exception as e:
                    out.write(f"Error reading file: {e}")
                out.write("\n```\n\n")
                
        print(f"Report generated successfully at: {REPORT_MD}")

if __name__ == '__main__':
    generate_report()
