# ==========================================
# DriftGuard Frontend Dockerfile
# Stage 1: Build static assets with Node
# Stage 2: Serve with lightweight Nginx
# ==========================================

FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . ./
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built bundle from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom reverse-proxy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
