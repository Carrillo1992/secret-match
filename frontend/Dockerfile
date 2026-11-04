# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Runs at container start (nginx image convention): writes config.json from API_BASE_URL.
COPY docker/40-write-app-config.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/40-write-app-config.sh
COPY --from=build /workspace/dist/secret-match/browser/ /usr/share/nginx/html/
EXPOSE 80
