---
title: Road Damage Detection API
emoji: 🛣️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# 🛣️ Road Damage Detection & Smart Complaint Management System

An AI-driven platform designed to detect road damage (potholes, cracks) in real-time, assess maintenance severity, and streamline complaint management for civic authorities.

---

## 🔗 Live Deployments

* **💻 Interactive Frontend UI:** [https://team11-vert.vercel.app](https://team11-vert.vercel.app) (Hosted on Vercel)
* **⚙️ Backend API Service:** [https://team11-4ujl.onrender.com](https://team11-4ujl.onrender.com) (Hosted on Render)

---

## 🛠️ Architecture & Tech Stack

* **Frontend:** React.js (Vite) + Leaflet (GPS/Map Tracker) + Recharts (Analytics Dashboard) + Vanilla CSS (Glassmorphism & Rich Micro-animations).
* **Backend:** FastAPI (Python 3.9) + SQLAlchemy ORM.
* **Database:** SQLite (SQL-based relational database).
* **AI/ML Model:** TensorFlow/Keras fine-tuned MobileNetV2 for CPU-efficient, high-accuracy road distress classification.
* **Email System:** SMTP-based verification & escalation workflow.

---

## ✨ Features

1. **AI-Powered Diagnostics:** Instantly classifies road damage (e.g., Potholes, Cracks) and calculates severity/confidence scores on image upload.
2. **Interactive GPS Mapping:** Automatically tracks damage coordinates and pins them onto a live interactive map for maintenance workers.
3. **Admin Command Center:** Dashboard for civic authorities to oversee tickets, write administrator feedback, track analytics, and trigger repairs.
4. **Resolution Verification Loop:** Admin uploads proof of repair -> AI runs verification -> system emails the citizen to confirm the fix (Yes/No).
5. **Auto-Escalation Engine:** Unresolved tickets are automatically flagged and escalated to higher authorities.

---

## 💻 How to Run Locally

### Prerequisites
* Python 3.9+
* Node.js & npm

---

### 1. Setup the Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --reload
   ```
   *The backend will run locally at `http://127.0.0.1:8000`.*

---

### 2. Setup the Frontend UI

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser to view the application.*

---

## 🔑 Demo Login Credentials

You can test the live deployment using these pre-populated test accounts:

* **Administrator Portal:**
  * **Email:** `a@gmail.com`
  * **Role:** Admin (Allows access to the map tracker and analytics charts)

* **Citizen Center:**
  * **Email:** `gow@gmail.com` (or create a new account via the frontend's sign-up page)
