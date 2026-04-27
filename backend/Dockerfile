# ── Base ──────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System dependencies
# postgresql-client provides pg_isready for the entrypoint health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    libwebp7 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runtime

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Create non-root user
RUN groupadd --gid 1001 django && useradd --uid 1001 --gid django --no-create-home django

# Create necessary directories
RUN mkdir -p /app/media/uploads /app/staticfiles && \
    chown -R django:django /app

COPY --chown=django:django . .

USER django

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/schema/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--worker-tmp-dir", "/dev/shm", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
