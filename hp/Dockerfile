# ---- Base ----
FROM node:20-slim AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS dependencies
# package.jsonとlockファイルをコピー
COPY package*.json ./
# 本番依存関係のみをインストール
RUN npm ci --omit=dev

# ---- Builder ----
FROM base AS builder
WORKDIR /app
# 開発依存関係を含むすべての依存関係をインストール
COPY package*.json ./
RUN npm ci
# プロジェクトファイル全体をコピー
COPY ./ ./
RUN npm run build

# ---- Release ----
FROM base AS release
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=dependencies /app/node_modules ./node_modules

USER node
CMD ["npm", "run", "start"]