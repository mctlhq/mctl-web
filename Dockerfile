FROM node:26-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Baked in at generate time: the site is statically generated, so setting this
# on `docker run` is too late to affect the bundle. Defaults to the production
# sitekey (see nuxt.config.ts); pass Cloudflare's localhost-friendly test key
# `1x00000000000000000000AA` to build an image whose forms work on localhost.
ARG NUXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NUXT_PUBLIC_TURNSTILE_SITE_KEY=$NUXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run generate

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
