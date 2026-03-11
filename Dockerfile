# Stage 1: Build Nuxt SPA
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx nuxt build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nuxt SPA output
COPY --from=build /app/.output/public/ /usr/share/nginx/html/

# Legacy pages not yet migrated to Nuxt
COPY static/docs/ /usr/share/nginx/html/docs/
COPY static/mcp/ /usr/share/nginx/html/mcp/
COPY static/img/ /usr/share/nginx/html/img/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
