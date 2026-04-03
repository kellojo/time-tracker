# syntax=docker/dockerfile:1.7

FROM node:25-alpine AS build
WORKDIR /app

# Install build tools for native modules (e.g. better-sqlite3).
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Required at build time because auth config is evaluated during SvelteKit postbuild analysis.
ARG OIDC_ISSUER=https://example.invalid
ARG OIDC_CLIENT_ID=build-placeholder-client-id
ARG OIDC_CLIENT_SECRET=build-placeholder-client-secret
ENV OIDC_ISSUER=$OIDC_ISSUER
ENV OIDC_CLIENT_ID=$OIDC_CLIENT_ID
ENV OIDC_CLIENT_SECRET=$OIDC_CLIENT_SECRET
RUN npm run build

# Keep only production dependencies for the runtime image.
RUN npm prune --omit=dev

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/time-tracker.db
ENV AUTH_DATABASE_PATH=/data/auth.db

# Runtime dependency for native module binaries.
RUN apk add --no-cache libstdc++

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./package.json

VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "build"]
