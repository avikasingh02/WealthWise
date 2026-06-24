# WealthWise — Personal Finance Analytics Platform

WealthWise is a full-stack personal finance platform. Upload bank statements, automatically categorise transactions, track budgets, and get AI-powered spending forecasts — all in a clean dark-theme dashboard.

---

## Quick start (Docker)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2)

```bash
git clone https://github.com/avikasingh02/WealthWise.git
cd WealthWise
docker compose up --build
```

Open **http://localhost:3000** — that's it. Everything (frontend, API, DB, cache) runs behind a single nginx proxy.

| Port | Service |
|---|---|
| `3000` | **Main app** (nginx → frontend + API) |
| `9001` | MinIO console (admin/minioadmin) |

---

## Architecture overview

```
Browser
  └── http://localhost:3000
        └── nginx (reverse proxy)
              ├── /api/*    → FastAPI  (port 8000)
              └── /*        → Vite dev  (port 5173)

FastAPI
  ├── Auth router     → JWT + Argon2id
  ├── Upload router   → MinIO + Celery task
  ├── Analytics router→ Redis-cached SQL aggregations
  ├── Budgets router  → CRUD
  └── Transactions    → paginated list

Celery worker
  └── process_statement task
        ├── reads CSV/XLSX from MinIO
        ├── parses with bank adapter (HDFC / ICICI / Generic)
        ├── deduplicates via SHA-256 txn_hash
        ├── categorises with rule-based engine (15 categories)
        └── bulk-inserts into PostgreSQL

PostgreSQL 16   — persistent data store
Redis 7         — job queue (Celery broker) + read-through cache
MinIO           — S3-compatible object store for raw uploaded files
```

---

## Repository structure

```
WealthWise/
├── backend/                    FastAPI application
│   ├── app/
│   │   ├── main.py             App factory, middleware, routers
│   │   ├── config.py           Pydantic Settings (reads .env)
│   │   ├── deps.py             FastAPI dependencies (get_current_user, etc.)
│   │   ├── auth/
│   │   │   └── security.py     Password hashing (Argon2id), JWT helpers
│   │   ├── routers/
│   │   │   ├── auth.py         POST /auth/register|login|refresh|logout, GET /auth/me
│   │   │   ├── upload.py       POST /upload, GET /upload/{job_id}
│   │   │   ├── analytics.py    GET /analytics/dashboard|categories|trends|health-score|forecast
│   │   │   ├── budgets.py      CRUD /budgets
│   │   │   └── transactions.py GET /transactions (paginated, filtered)
│   │   ├── models/
│   │   │   ├── user.py         User, RefreshToken, AuditLog (SQLAlchemy)
│   │   │   ├── transaction.py  Transaction, Account, UploadJob
│   │   │   └── budget.py       Budget, Category
│   │   ├── services/
│   │   │   └── auth_service.py register, login, refresh, logout
│   │   ├── analytics/
│   │   │   ├── categorizer.py  Rule-based transaction categoriser
│   │   │   ├── health_score.py Financial Health Score (0–100)
│   │   │   └── forecast.py     Moving-average + linear regression
│   │   ├── etl/
│   │   │   ├── adapters/       Bank-specific CSV parsers (HDFC, ICICI, Generic)
│   │   │   └── pipeline.py     run_etl() — parse → normalise → categorise
│   │   ├── tasks/
│   │   │   ├── celery_app.py   Celery + Redis broker config
│   │   │   └── process_statement.py  Async upload processing task
│   │   └── db/
│   │       ├── base.py         SQLAlchemy DeclarativeBase
│   │       ├── session.py      Engine + SessionLocal + get_db()
│   │       └── migrations/     Alembic — 0001_initial_schema creates all tables
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/                   React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx             Routes, ProtectedRoute, PublicRoute
│   │   ├── index.css           Tailwind + custom component classes
│   │   ├── store/
│   │   │   └── auth.tsx        AuthContext — login, register, logout, session restore
│   │   ├── lib/
│   │   │   └── api.ts          Axios instance, 401→refresh interceptor, API methods
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── BudgetsPage.tsx
│   │   │   ├── UploadPage.tsx
│   │   │   └── TransactionsPage.tsx
│   │   └── components/
│   │       ├── Layout.tsx       Sidebar nav + main content wrapper
│   │       ├── KpiCard.tsx      Stat cards with colour accents
│   │       ├── ScoreGauge.tsx   Semicircle health score gauge
│   │       ├── BudgetBar.tsx    Progress bar with status badge
│   │       └── UploadDropzone.tsx  Drag-and-drop file upload + job polling
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── docker/
│   ├── api.Dockerfile
│   ├── worker.Dockerfile
│   ├── frontend.Dockerfile
│   ├── nginx.Dockerfile
│   └── nginx.conf              Reverse proxy: / → frontend, /api/ → backend
│
└── docker-compose.yml          6 services: postgres, redis, minio, api, worker, frontend, nginx
```

---

## Tech stack

### Backend

| Layer | Technology |
|---|---|
| Web framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 (sync, `psycopg2`) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache / Broker | Redis 7 |
| Task queue | Celery 5 |
| Object storage | MinIO (S3-compatible) |
| Auth | JWT (HS256, 15-min access tokens) + opaque refresh tokens (7 days, hashed in DB) |
| Password hash | Argon2id via `argon2-cffi` |
| Data processing | Pandas, NumPy, scikit-learn |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Data fetching | React Query v3 |
| Routing | React Router v6 |
| HTTP client | Axios |

### Infrastructure

| Component | Image |
|---|---|
| Reverse proxy | nginx:alpine |
| Database | postgres:16-alpine |
| Cache | redis:7-alpine |
| Object store | minio/minio:latest |
| Backend runtime | python:3.11-slim |
| Frontend dev server | node:20-alpine |

---

## Authentication flow

```
Register  POST /api/v1/auth/register   → 201 { id, name, email, role }
Login     POST /api/v1/auth/login      → 200 { access_token, refresh_token, token_type }
Refresh   POST /api/v1/auth/refresh    → 200 { access_token, refresh_token }  (rotation)
Logout    POST /api/v1/auth/logout     → 204
Me        GET  /api/v1/auth/me         → 200 { id, name, email, role }
```

- **Access token**: JWT, 15-minute TTL, stored in memory (never localStorage)
- **Refresh token**: opaque random string, 7-day TTL, stored as SHA-256 hash in DB, kept in `localStorage` as `ww_refresh`
- **Rotation**: every refresh call issues a new pair and revokes the old token's `jti`
- **Transparent refresh**: the Axios interceptor queues concurrent 401s, refreshes once, then replays all queued requests

---

## Upload & ETL flow

```
User drops CSV/XLSX
  → POST /api/v1/upload         (multipart)
  → file saved to MinIO
  → Celery task enqueued        → job_id returned immediately

Celery worker
  → reads file from MinIO
  → detects bank format (HDFC / ICICI / Generic)
  → parses rows with pandas
  → normalises merchant names
  → categorises with regex rules (15 categories)
  → bulk INSERT with ON CONFLICT DO NOTHING  (SHA-256 dedup)
  → updates UploadJob status → DONE
  → invalidates Redis cache keys

Frontend polls GET /api/v1/upload/{job_id} every 2 s
  → shows spinner while status = PROCESSING
  → shows success banner when status = DONE
```

---

## Analytics endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/analytics/dashboard?period=YYYY-MM` | Income, expenses, savings, savings rate, top category |
| `GET /api/v1/analytics/categories?period=YYYY-MM` | Spending breakdown by category |
| `GET /api/v1/analytics/trends?months=N` | Month-over-month income vs expenses series |
| `GET /api/v1/analytics/health-score?period=YYYY-MM` | Composite 0–100 Financial Health Score |
| `GET /api/v1/analytics/forecast?months=N` | Next-period spending forecast by category |

All analytics responses are **Redis-cached for 5 minutes** and invalidated automatically on new uploads.

### Financial Health Score breakdown

```
Score = savings_rate_score (30) + budget_adherence (25) + expense_growth (20) + debt_ratio (25)
```

| Component | Weight | Green threshold |
|---|---|---|
| Savings rate | 30 pts | ≥ 30% |
| Budget adherence | 25 pts | ≤ 100% of limit |
| MoM expense growth | 20 pts | < 20% growth |
| Debt ratio | 25 pts | Near 0 |

---

## Transaction categoriser

The categoriser uses a ranked list of regex patterns matched against the normalised merchant name and description. First match wins.

| Category | Example merchants |
|---|---|
| Food & Dining | Swiggy, Zomato, McDonald's |
| Transport | Uber, Ola, IRCTC |
| Shopping | Amazon, Flipkart, Myntra |
| Utilities | Electricity, Water, Gas |
| Healthcare | Apollo, Practo, MedPlus |
| Entertainment | Netflix, Spotify, PVR |
| Travel | MakeMyTrip, Goibibo, Airbnb |
| Education | Byju's, Unacademy, Coursera |
| Finance | Insurance, Mutual Fund, SIP |
| Groceries | BigBasket, Blinkit, DMart |
| … 5 more | — |

---

## Data model (key tables)

```
users              id, name, email, password_hash, role, is_active
refresh_tokens     id, user_id, jti, token_hash, expires_at, revoked
audit_logs         id, user_id, action, ip, created_at

accounts           id, user_id, bank_name, account_number
transactions       id, account_id, user_id, txn_date, amount, direction,
                   merchant_norm, description, category_id, txn_hash (unique)
categories         id, name, icon, color  (seeded: 15 rows)
budgets            id, user_id, category_id, monthly_limit, period, spent, status
upload_jobs        id, user_id, filename, status, rows_inserted, error, created_at
```

---

## Environment variables

All config is read from environment variables (or a `.env` file at `backend/`).

| Variable | Default (dev) | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `JWT_SECRET` | dev placeholder | **Change in production** |
| `JWT_ACCESS_TTL` | `900` | Access token TTL in seconds |
| `JWT_REFRESH_TTL` | `604800` | Refresh token TTL in seconds |
| `S3_ENDPOINT` | `http://minio:9000` | MinIO / S3 endpoint |
| `S3_BUCKET` | `wealthwise` | Bucket name |
| `S3_ACCESS_KEY` | `minioadmin` | MinIO root user |
| `S3_SECRET_KEY` | `minioadmin` | MinIO root password |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | JSON array of allowed origins |

---

## Development workflow

### Run everything via Docker (recommended)

```bash
docker compose up --build          # first run builds all images
docker compose up                  # subsequent runs
docker compose down                # stop
docker compose down -v             # stop + delete volumes (fresh DB)
```

### Backend only (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# start postgres + redis separately, then:
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend only (without Docker)

```bash
cd frontend
npm install
npm run dev
```

The Vite config already proxies `/api/*` to `localhost:8000`, so the backend must be running.

### Database migrations

```bash
# create a new migration after changing models:
docker compose exec api alembic revision --autogenerate -m "description"

# apply:
docker compose exec api alembic upgrade head

# rollback one step:
docker compose exec api alembic downgrade -1
```

### Useful commands

```bash
# view API logs
docker compose logs -f api

# open a psql shell
docker compose exec postgres psql -U wealthwise -d wealthwise

# flush Redis cache
docker compose exec redis redis-cli FLUSHDB

# run backend tests
docker compose exec api pytest
```

---

## API reference (Swagger)

Interactive docs are available at **http://localhost:3000/api/docs** when the stack is running.

---

## Key design decisions

1. **Nginx as single entry point** — all traffic enters on port 3000. The frontend and API are internal services; no direct port exposure (except MinIO console on 9001 for admin use).

2. **Celery for async ETL** — uploading large CSVs blocks for several seconds. By offloading to a Celery worker, the upload endpoint returns immediately with a `job_id`, and the frontend polls for completion.

3. **SHA-256 deduplication** — a `txn_hash` is computed per row using (date, amount, description). Duplicate uploads are silently skipped via `ON CONFLICT DO NOTHING`, making re-uploads safe.

4. **Access token in memory** — the JWT access token is stored in a JS variable, not localStorage, to prevent XSS token theft. Only the opaque refresh token touches localStorage.

5. **SQLAlchemy `__allow_unmapped__ = True`** — required for SQLAlchemy 2.0 strict annotation mode when legacy relationship back-references use bare `Mapped` without a generic type parameter.

6. **Redis read-through cache** — analytics queries are expensive aggregations over potentially millions of rows. Redis caches responses for 5 minutes and is invalidated automatically when new data is ingested.

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Backend changes → update models → run `alembic revision --autogenerate`
3. Frontend changes → `npm run dev` picks up hot-reload automatically
4. All services have volume mounts so code changes reflect without rebuilding
5. Submit a pull request against `main`

---

*Built with FastAPI, React, PostgreSQL, Redis, MinIO, and Celery.*
