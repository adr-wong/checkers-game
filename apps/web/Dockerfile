FROM oven/bun:1

WORKDIR /app

# Copy all workspace manifests first for layer caching
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/ai-service/package.json ./apps/ai-service/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build the Vite frontend
RUN bun run --cwd apps/web build

EXPOSE 3000

CMD ["bun", "run", "apps/web/index.ts"]
