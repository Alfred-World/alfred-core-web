# ============================================
# Build Stage
# ============================================
FROM node:24-alpine AS base
RUN npm install -g pnpm@10

FROM base AS builder
WORKDIR /app

# 1) Copy only dependency manifests first → cached pnpm install layer
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-core-web,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# 2) Copy source code (after deps are installed)
COPY . .

# 2.5) Run postinstall scripts (build:icons needs source files)
RUN pnpm run build:icons

# 3) Build-time env vars (NEXT_PUBLIC_* are inlined into the JS bundle)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_SSO_URL
ARG NEXT_PUBLIC_OIDC_CLIENT_ID

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID
# Alias for backwards-compat with sso-config.ts
ENV NEXT_PUBLIC_OAUTH_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID

RUN pnpm build

# ============================================
# Production Stage (standalone output)
# ============================================
FROM base AS final
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN apk --no-cache add curl

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
