# Use official lightweight Python image.
FROM python:3.9-slim

# Set working directory.
WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt ./backend/requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, ML model, and necessary directories
COPY backend/ ./backend
COPY ml_model/ ./ml_model

# Change working directory to backend so imports resolve correctly
WORKDIR /app/backend

# Expose port (7860 is default for Hugging Face Spaces, Render uses dynamic $PORT)
EXPOSE 7860

# Command to run. We use uvicorn to start the app.
# Note: Hugging Face Spaces automatically binds to port 7860.
# Render will automatically map the container port or let you expose it.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
