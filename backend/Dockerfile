# ==========================================
# DriftGuard Backend Dockerfile
# Production-minded, secure container
# ==========================================

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

# Install system dependencies needed for collectors (procps for ps/socket info)
RUN apt-get update && apt-get install -y --no-install-recommends \
    iproute2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . ./

# Create non-root user for security (Requirement: never run as root)
RUN useradd -u 10001 -m appuser && \
    mkdir -p /app/data/reports && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Production WSGI server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "30", "app:app"]
