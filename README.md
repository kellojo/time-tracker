# Time Tracker

A simple self-hosted time tracking app built with SvelteKit.

## What this app does

- Track work time with start and stop controls
- Edit daily totals manually
- View monthly totals
- Create personal API keys with scoped access
- Use API keys to:
  - start or stop the timer
  - read worked time for today or any date

## Tech stack

- SvelteKit (Node adapter)
- Better Auth with OIDC login
- SQLite for application data and auth data
- Docker + Docker Compose for self-hosting

## Self-host with Docker Compose

### 1. Prerequisites

- Docker
- Docker Compose plugin
- An OIDC provider (issuer URL, client id, client secret)

### 2. Configure environment in compose.yml

Edit [compose.yml](compose.yml) and set at least:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `OIDC_ISSUER`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`

Notes:

- `BETTER_AUTH_URL` must match the public URL you will use in the browser.
- `BETTER_AUTH_SECRET` should be a long random string.
- Keep OIDC values in sync with your identity provider app settings.

### 3. Build and start

```bash
docker compose up -d --build
```

The app is exposed on port `3000` by default.

### 4. Open the app

- URL: `http://localhost:3000`

### 5. Persistent storage

Compose creates a named volume:

- `time_tracker_data`

It stores:

- `/data/time-tracker.db` (app data)
- `/data/auth.db` (auth data)

## Update / restart

```bash
docker compose pull
docker compose up -d --build
```

## Stop

```bash
docker compose down
```

## API quick overview

Authentication:

- Session cookie from web login, or
- API key via `Authorization: Bearer <API_KEY>`

Endpoints:

- `POST /api/timer/start` (scope: `timer:start`)
- `POST /api/timer/stop` (scope: `timer:stop`)
- `GET /api/hours/today` (scope: `hours:read`)
- `GET /api/hours/:date` (scope: `hours:read`, date format `YYYY-MM-DD`)
- `GET /api/hours/week` (scope: `hours:read`, current week Monday-Sunday)

API keys can be managed in the app UI at `/keys`.

## Local development (optional)

```bash
npm ci
npm run dev
```

By default, local development still expects OIDC variables.

If you want to run without an OIDC provider in development, create a `.env`
from `.env.example` and enable:

- `DEV_AUTH_BYPASS=true`

Optional identity fields for the local dev user:

- `DEV_AUTH_USER_ID`
- `DEV_AUTH_USER_EMAIL`
- `DEV_AUTH_USER_NAME`
- `DEV_AUTH_USER_IMAGE`

When `DEV_AUTH_BYPASS=true`, the app injects a local session in development and
skips the OIDC login flow.
