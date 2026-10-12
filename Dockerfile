# ==============================================================================
# GeoNetra · National Intelligent Hazard Monitoring Platform
# Multi-Stage Production Dockerfile for High-Availability Deployment
# ==============================================================================

# Stage 1: Build & Install Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install native dependencies required for any alpine builds
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY backend/package*.json ./backend/

# Clean production dependency install
RUN cd backend && npm ci --only=production

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for container health check probes
RUN apk add --no-cache curl

# Security hardening: Create unprivileged system group & user
RUN addgroup -S -g 1001 geonetra && \
    adduser -S -u 1001 -G geonetra geonetra

# Copy production node_modules from builder
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules

# Copy backend application code and telemetry fixtures
COPY backend ./backend

# Copy unified frontend assets (delivered via Express static)
COPY combined ./combined

# Ensure persistence directory exists and unprivileged user owns runtime files
RUN mkdir -p /app/backend/data && \
    chown -R geonetra:geonetra /app

# Switch to unprivileged user
USER geonetra

WORKDIR /app/backend

# Expose HTTP API and Frontend Service Port
EXPOSE 3000

# Container Healthcheck probe targeting /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Launch GeoNetra unified server
CMD ["node", "server.js"]
