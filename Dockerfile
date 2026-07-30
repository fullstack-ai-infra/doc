FROM node:24-alpine AS base
RUN npm install --global npm@11.8.0

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY packages/cli/package.json ./packages/cli/package.json
COPY services/collaboration/package.json ./services/collaboration/package.json
RUN \
  if [ -f package-lock.json ]; then HUSKY=0 npm ci; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM deps AS prisma-base
RUN apk add --no-cache openssl

FROM prisma-base AS migrator
WORKDIR /app
COPY prisma ./prisma
CMD ["npx", "prisma", "db", "push"]

# Rebuild the source code only when needed
FROM prisma-base AS builder
WORKDIR /app
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_COLLABORATE_EDIT_URL=ws://localhost:1234/collaborate
ARG NEXT_PUBLIC_OSS_CDN_HOSTNAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_COLLABORATE_EDIT_URL=$NEXT_PUBLIC_COLLABORATE_EDIT_URL \
    NEXT_PUBLIC_OSS_CDN_HOSTNAME=$NEXT_PUBLIC_OSS_CDN_HOSTNAME \
    AUTH_SECRET=doc-image-build-only-secret \
    DATABASE_URL=postgresql://doc:doc@postgres:5432/doc?schema=public \
    COLLABORATE_API_AUTH_KEY=doc-image-build-only-collaboration-key \
    COLLABORATE_INTERNAL_API_KEY=doc-image-build-only-internal-key \
    NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
