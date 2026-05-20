# ── Stage 1: build React UI ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE_URL=
ENV VITE_BASE_PATH=/ui/
RUN npm run build

# ── Stage 2: API + static UI + PPO models ────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps (healthcheck curl optional; urllib used in HEALTHCHECK)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-deploy.txt requirements.txt ./
RUN pip install --no-cache-dir -r requirements-deploy.txt \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# App source and built UI (models downloaded — not stored in HF git)
COPY . .
COPY --from=frontend-build /build/dist ./server/static

RUN chmod +x scripts/download_models.sh \
    && ./scripts/download_models.sh \
    && chmod -R 755 /app

ENV CORS_ORIGINS="*"
ENV PORT=7860

EXPOSE 7860

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "7860", "--app-dir", "/app"]
