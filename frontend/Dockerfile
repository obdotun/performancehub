# ── Stage 1 : Build React ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2 : Nginx ───────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copier le build React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la config Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]