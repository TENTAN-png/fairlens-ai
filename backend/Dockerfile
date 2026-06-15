# ── FairLens AI Backend — Cloud Run Dockerfile ─────────────────────────────
FROM python:3.11-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Cloud Run listens on 8080 / Hugging Face Spaces listens on 7860
ENV PORT=7860
EXPOSE 7860

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "2"]
