FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package.json package-lock.json .npmrc ./
# .npmrc references ${GITHUB_PACKAGES_TOKEN} for the private GitHub Packages
# registry (@mctlhq/css). The token is supplied via a BuildKit secret mount,
# scoped to this RUN only — it never lands in an image layer.
RUN --mount=type=secret,id=github_token \
    GITHUB_PACKAGES_TOKEN="$(cat /run/secrets/github_token 2>/dev/null || true)" \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run generate

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
