FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
ARG CACHEBUST=1
ARG APP_VERSION=dev
COPY static/ /usr/share/nginx/html/
RUN sed -i "s/content=\"1.0.0\"/content=\"${APP_VERSION}\"/" /usr/share/nginx/html/index.html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
