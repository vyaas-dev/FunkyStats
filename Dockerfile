FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG TBA_API_KEY
ARG FSM_CACHE_URL
ENV TBA_API_KEY=$TBA_API_KEY
ENV FSM_CACHE_URL=$FSM_CACHE_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Coolify builders are often memory-constrained during next build
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
