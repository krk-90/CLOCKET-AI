# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /build/app/frontend
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend/ ./
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM python:3.11-slim

ARG RAG_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
ARG MEM0_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    MCP_HOST=127.0.0.1 \
    MCP_PORT=8001 \
    MCP_TRANSPORT=streamable-http \
    RAG_EMBEDDING_MODEL=${RAG_EMBEDDING_MODEL} \
    MEM0_EMBEDDING_MODEL=${MEM0_EMBEDDING_MODEL} \
    FASTEMBED_CACHE_PATH=/opt/fastembed_cache \
    RAG_INDEX_REPO=false \
    MEM0_HISTORY_DB_PATH=/app/data/mem0-history.db \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        supervisor \
        git \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip then install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Sanity-check: git and mcp-server-git must be on PATH
RUN git --version \
    && (which mcp-server-git || echo "mcp-server-git not on PATH — check requirements.txt")

# Pre-download embedding models into the cache directory
RUN mkdir -p /opt/fastembed_cache \
    && python -c "
import os
from fastembed import TextEmbedding
models = {os.environ['RAG_EMBEDDING_MODEL'], os.environ['MEM0_EMBEDDING_MODEL']}
for m in models:
    TextEmbedding(model_name=m)
"

# Copy application source
COPY app        ./app
COPY agent      ./agent
COPY llm_gateway ./llm_gateway
COPY mcp_server  ./mcp_server
COPY supabase   ./supabase

# Copy built frontend assets from Stage 1
COPY --from=frontend-build /build/app/frontend/dist ./app/frontend/dist

# Copy runtime configuration files
COPY docker/supervisord.conf /etc/supervisor/conf.d/personal-assistant.conf
COPY docker/entrypoint.sh    /entrypoint.sh

# Create non-root user, required runtime directories, and fix ownership
RUN chmod +x /entrypoint.sh \
    && useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/data/uploads \
    && chown -R appuser:appuser /app/data /opt/fastembed_cache

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/health', timeout=4)" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
