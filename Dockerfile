# ---- Base ----
FROM node:20-slim AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Builder ----
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Release ----
FROM base AS release
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

# Cloud Runはポート8080を要求
CMD ["node", "dist/index.js"]