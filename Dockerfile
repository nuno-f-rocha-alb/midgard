# ── frontend build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── runtime ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend /build/dist ./static
# /config = override por volume; /app/config = cópia baked usada como fallback
# (um volume montado em /config nunca tapa esta)
COPY config /config
COPY config /app/config

ENV MIDGARD_STATIC=/app/static \
    MIDGARD_CONFIG=/config

EXPOSE 8484
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8484"]
