# Use an official Python 3.11 runtime as a parent image
FROM python:3.11-slim

# Install system dependencies required for OpenCV and libGL
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# --- NEW SECTION: Install system dependencies ---
# Install ffmpeg for pydub and libgl1 for opencv-python
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*
# --- END NEW SECTION ---

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
