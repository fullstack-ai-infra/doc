FROM node:24-alpine AS builder

WORKDIR /app
RUN npm install --global npm@11.8.0

COPY package.json package-lock.json ./
COPY packages/cli/package.json ./packages/cli/package.json
COPY services/collaboration/package.json ./services/collaboration/package.json
RUN npm ci --ignore-scripts --workspace @fullstack-ai-infra/doc-collaboration

COPY services/collaboration/tsconfig.json ./services/collaboration/tsconfig.json
COPY services/collaboration/src ./services/collaboration/src
RUN npm run build --workspace @fullstack-ai-infra/doc-collaboration

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global npm@11.8.0

COPY package.json package-lock.json ./
COPY packages/cli/package.json ./packages/cli/package.json
COPY services/collaboration/package.json ./services/collaboration/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace @fullstack-ai-infra/doc-collaboration

COPY --from=builder /app/services/collaboration/dist ./services/collaboration/dist

USER node
EXPOSE 1234

CMD ["node", "services/collaboration/dist/index.js"]
