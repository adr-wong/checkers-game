# Checkers Game with AI Microservice

A full-stack multiplayer checkers game with a dedicated AI microservice.

## Status
🚧 Under development

## Prerequisites

- [Bun](https://bun.sh) (runtime & package manager)
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [MongoDB](https://www.mongodb.com/) (Docker container required)

## Getting Started

### Option A: Docker Compose (recommended)

Starts everything — MongoDB, AI service, API server, and frontend.

```bash
# Install dependencies
bun install

# Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your keys (Clerk is optional)

# Start all services
docker compose up --build
```

Services:
- Frontend: http://localhost:3001
- API: http://localhost:3000

To run in dev mode with HMR:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Option B: Manual Setup

Run MongoDB in Docker, then start each service yourself.

#### 1. MongoDB (Docker required)

```bash
docker run -d --name checkers-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=checkers \
  mongo:7
```

#### 2. AI Service

```bash
cd apps/ai-service
PORT=4000 ALLOWED_ORIGIN=* bun run src/index.ts
```

#### 3. API Server

```bash
cd apps/web
PORT=3000 \
MONGODB_URI=mongodb://localhost:27017/checkers \
AI_SERVICE_URL=http://localhost:4000 \
bun run index.ts
```

#### 4. Frontend (Vite dev server)

```bash
cd apps/web
bun run dev
```

Frontend: http://localhost:3001
API: http://localhost:3000

## Clerk Authentication (optional)

The app works without Clerk. To enable auth and the leaderboard:

1. Create a free account at [clerk.com](https://clerk.com)
2. Get your keys from the Clerk Dashboard
3. Add them to `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
4. If using Docker, rebuild: `docker compose up --build`
5. If running manually, restart the frontend dev server

## Project Structure

```
checkers/
├── apps/
│   ├── web/                  # Hono API + React frontend
│   │   ├── index.ts          # Server entry point
│   │   ├── src/
│   │   │   ├── server/       # Hono API routes
│   │   │   ├── routes/       # React pages (TanStack Router)
│   │   │   ├── models/       # MongoDB models
│   │   │   └── lib/          # Shared utilities
│   │   └── Dockerfile*
│   └── ai-service/           # AI microservice (Hono)
│       └── src/index.ts
├── packages/
│   └── shared/               # Shared types & game logic
├── docker-compose.yml        # Production
├── docker-compose.dev.yml    # Development with HMR
└── .env.example              # Environment template
```

## Documentation

- [PRD.txt](./PRD.txt) - Product Requirements Document
