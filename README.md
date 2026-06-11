# Road Damage Detection & Smart Complaint Management System

## Quick Start (Windows)
1. Double-click `run_backend.bat` to start the server.
2. Double-click `run_frontend.bat` to start the website.
3. Open http://localhost:5173 to use the app.

## Overview
This project is an AI-based system designed to detect road damage (like potholes, cracks) using a Deep Learning model (CNN). It automatically categorizes the damage severity and generates complaint tickets for authorities to review.

## Architecture
- **Frontend**: React (Vite) - User interface for uploading images and viewing reports.
- **Backend**: FastAPI (Python) - Handles API requests, processes images, and manages the database.
- **AI Model**: TensorFlow/MobilenetV2 - Pre-trained model fine-tuned for road damage detection.
- **Database**: SQLite - Stores ticket info and image references.

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js & npm

### Backend Setup
1. `cd backend`
2. `py -m venv venv`
3. `venv\Scripts\activate`
4. `pip install -r requirements.txt`
5. `py -m uvicorn main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### ML Model Training
1. `cd ml_model`
2. `py train.py`
