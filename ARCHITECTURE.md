# System Architecture

## Overview
The Road Damage Detection System uses a Microservices-like architecture where the Backend (FastAPI) serves as the central hub connecting the Client (React), the AI Brain (TensorFlow), and the Persistence Layer (SQLite).

## High-Level Architecture
```mermaid
graph TD
    Client[React Frontend] -->|HTTP/JSON| API[FastAPI Backend]
    API -->|Images| ML[ML Model (MobileNetV2)]
    ML -->|Predictions| API
    API -->|CRUD| DB[(SQLite Database)]
    API -->|Serve Static| Storage[File Storage]
```

## Detailed Flow

### 1. Image Upload & Detection
1. User uploads image on React Frontend.
2. Image sent to `POST /upload/` on Backend.
3. Backend saves image to `static/uploads/`.
4. Backend calls `MLService`.
5. `MLService` preprocesses image (`224x224`, Normalized).
6. Model predicts Class (`Pothole`, `Crack`, `Normal`) and Confidence.
7. System calculates Severity based on Confidence & Type.
8. Ticket created in Database with status `Open`.
9. Response returned to Frontend.

### 2. Admin Management
1. Admin loads Dashboard.
2. Frontend requests `GET /tickets/`.
3. Backend queries Database.
4. List of tickets displayed in Table.
5. Admin clicks "Resolve".
6. Frontend sends `PUT /tickets/{id}` with `status="Resolved"`.
7. Backend updates Database.

## Tech Stack
- **Frontend**: React, Vite, Recharts, Axios, CSS Modules.
- **Backend**: Python, FastAPI, SQLAlchemy, Pydantic.
- **AI/ML**: TensorFlow, Keras, MobileNetV2, OpenCV.
- **Database**: SQLite (File-based).

## Directory Structure
```
/
├── backend/
│   ├── main.py          # API Routes
│   ├── models.py        # DB Tables
│   ├── schemas.py       # Pydantic Models
│   ├── ml_integration.py# Model Wrapper
│   └── static/          # Uploaded Images
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard & Upload
│   │   ├── App.jsx      # Wiring
│   │   └── main.jsx     # Entry
├── ml_model/
│   ├── train.py         # Training Script
│   ├── inference.py     # Prediction Logic
│   └── dataset/         # Training Data
```
