FROM node:26-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Baked in at generate time: the site is statically generated, so setting this
# on `docker run` is too late to affect the bundle. Left unset it falls back to
# the production sitekey (see nuxt.config.ts); pass Cloudflare's
# localhost-friendly test key `1x00000000000000000000AA` to build an image
# whose forms work on localhost.
#
# Passed through only when non-empty, and deliberately NOT via `ENV`. Nuxt
# applies any *defined* NUXT_PUBLIC_* variable over runtimeConfig, and a
# defined-but-empty one wins over the fallback in nuxt.config.ts — so an
# unconditional `ENV` would hand every argument-less build (including
# build.yml's, which passes none) an empty sitekey. `render()` then returns
# at `if (!sitekey)`, the widget never appears, and both gated forms reject
# every submission with no way for the user to proceed.
ARG NUXT_PUBLIC_TURNSTILE_SITE_KEY
RUN if [ -z "$NUXT_PUBLIC_TURNSTILE_SITE_KEY" ]; then \
      unset NUXT_PUBLIC_TURNSTILE_SITE_KEY; \
    fi; \
    npm run generate

FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:378d0c32f6562f7fd9629170797f57d2b953aa09be983b3daaf4809bb039ca00
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public/ /usr/share/nginx/html/
USER 101:101
# Fail the build on a broken config. The test writes nginx's temp directories
# into /tmp; the rm keeps the image's /tmp empty (see portfolio 0.1.46).
RUN nginx -t && rm -rf /tmp/*
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
