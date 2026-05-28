FROM oven/bun:1

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json bun.lockb ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/ai-service/package.json ./apps/ai-service/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/ai-service ./apps/ai-service

# Build shared package
RUN bun run --cwd packages/shared build

EXPOSE 4000

CMD ["bun", "run", "apps/ai-service/src/index.ts"]
