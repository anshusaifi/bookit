FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy package manifest AND .npmrc before installing so pnpm reads
# the correct config (onlyBuiltDependencies) during the install step.
COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install

COPY . .

# Generate Prisma Client for the linux-musl binary target inside the container.
RUN pnpm prisma generate

EXPOSE 5000

CMD ["pnpm", "run", "dev"]