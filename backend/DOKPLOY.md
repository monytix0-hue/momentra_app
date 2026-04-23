# Dokploy Deployment Guide (Backend)

This backend is deployment-ready on Dokploy using the included `Dockerfile`.

## 1) Create service in Dokploy

- **Type:** Dockerfile
- **Context path:** `backend`
- **Dockerfile path:** `Dockerfile`
- **Container port:** `8002` (or use Dokploy's `PORT` injection)

## 2) Set environment variables

Required for production:

- `DATABASE_URL` (Postgres connection string)
- `FIREBASE_PROJECT_ID`
- one of:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (raw JSON)
  - `FIREBASE_SERVICE_ACCOUNT_JSON_B64` (base64 JSON)
  - `FIREBASE_CREDENTIALS_PATH` (path inside container)

Recommended:

- `CORS_ORIGINS` (comma-separated origins)
- `PUBLIC_APP_BASE_URL` (invite link base URL)
- `MOMENTRA_UPLOAD_DIR` (defaults to `/app/uploads`)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `UVICORN_WORKERS` (default `1`; increase only after removing startup DDL/backfill work)

Optional dev/testing only:

- `FIREBASE_AUTH_DISABLED=true`

## 3) Health check

The container exposes:

- `GET /health` -> `{"status":"ok"}`

Docker healthcheck is already configured in `Dockerfile` against `/health`.

## 4) Start command

No custom command needed. The image runs:

- `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8002}`

## 5) First deploy validation

After deploy, validate:

- `/health` returns 200
- `/docs` loads
- `/openapi.json` loads
- app can authenticate and read personal/group/business endpoints

