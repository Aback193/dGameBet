FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache python3 make g++ linux-headers
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
EXPOSE 3001
USER node
CMD ["sh", "-c", "npx drizzle-kit push:pg && npm run dev"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3001
USER node
CMD ["node", "dist/index.js"]
