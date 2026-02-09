# RateMyBars

Rate and discover the best bars, nightclubs, frat parties, and party venues near every college in the US.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Go (Chi router) REST API
- **Database**: Gel (EdgeDB) with `ext::auth`
- **Maps**: Mapbox GL JS (dark theme)
- **Security**: Per-IP rate limiting, input sanitization, spam prevention

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 20+
- Gel CLI (for database, optional for prototype)

### Backend

```bash
cd backend

# Set environment variables (optional, has defaults)
export PORT=8080
export FRONTEND_URL=http://localhost:3000
export DATA_PATH=../data/schools.json
export AUTH_SIGNING_KEY=your-secret-key

# Run the server
go run cmd/server/main.go
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Mapbox token

# Run dev server
npm run dev
```

### Import Full School Data

When you have the full IPEDS `hd2024.csv` file:

```bash
cd backend
go run ../scripts/import_schools.go -input /path/to/hd2024.csv -output ../data/schools.json
```

This filters ~6,000 schools down to ~2,466 (Public 4-year + Private Non-Profit 4-year).

## Project Structure

```
ratemybars/
├── frontend/          # Next.js app
│   ├── src/app/       # Pages (map, auth, venue, submit)
│   ├── src/components # React components
│   └── src/lib/       # API client, auth context
├── backend/           # Go API server
│   ├── cmd/server/    # Entry point
│   └── internal/      # Handlers, middleware, services
├── dbschema/          # Gel database schema
├── scripts/           # Data import tools
└── data/              # School data (JSON)
```

## API Endpoints

| Method | Endpoint                 | Auth | Description              |
|--------|--------------------------|------|--------------------------|
| GET    | /api/schools             | No   | Search/list schools      |
| GET    | /api/schools/map         | No   | All schools (map data)   |
| GET    | /api/schools/{id}        | No   | School details           |
| GET    | /api/schools/{id}/venues | No   | Venues for a school      |
| GET    | /api/venues/{id}         | No   | Venue details            |
| GET    | /api/venues/{id}/ratings | No   | Ratings for a venue      |
| POST   | /api/venues              | Yes  | Create a venue           |
| POST   | /api/ratings             | Yes  | Submit a rating          |
| POST   | /api/auth/register       | No   | Register with email      |
| POST   | /api/auth/login          | No   | Login with email         |
| POST   | /api/auth/logout         | No   | Logout                   |
| GET    | /api/auth/me             | Yes  | Get current user         |

## Security

- **Rate Limiting**: Per-IP token bucket (30 req/min reads, 6 req/min writes)
- **Spam Prevention**: 20 ratings/user/day, unique constraint per user+venue
- **Input Sanitization**: HTML/script stripping via bluemonday
- **Auth**: JWT tokens in HttpOnly cookies, bcrypt password hashing
- **CORS**: Strict origin whitelist
