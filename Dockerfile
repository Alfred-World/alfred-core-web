# ============================================
# Build Stage
# ============================================
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Copy all source first (postinstall needs src/assets/iconify-icons/)
COPY . .

# Install dependencies (postinstall runs build:icons)
RUN pnpm install --frozen-lockfile

# Build-time env vars (NEXT_PUBLIC_*) must be available at build time
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_SSO_URL
ARG NEXT_PUBLIC_OIDC_CLIENT_ID

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID

RUN pnpm build

# ============================================
# Production Stage (standalone output)
# ============================================
FROM base AS final
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Install curl for healthcheck
RUN apk --no-cache add curl

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
