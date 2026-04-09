FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app

RUN pip install --upgrade pip && pip install .

# Bind all interfaces inside the container (required for reverse proxies / bridge networks).
#
# EXPOSE does NOT publish the port on the host machine. Docker has no Dockerfile instruction
# for host mapping; that is always: docker run -p 6000:6000, Compose "ports:", or your
# platform UI (e.g. Dokploy → Ports → 6000:6000). See docker-compose.yml in this folder.
#
# Swarm/Dokploy without host publish: "docker ps" may show only "6000/tcp" while Traefik
# still reaches the container on the overlay network.
ENV API_HOST=0.0.0.0 \
    API_PORT=6000

EXPOSE 6000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import os,urllib.request; p=os.environ.get('API_PORT','6000'); urllib.request.urlopen(f'http://127.0.0.1:{p}/health', timeout=3)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host \"${API_HOST:-0.0.0.0}\" --port \"${API_PORT:-6000}\""]
