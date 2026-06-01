FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build -- --mode staging

FROM nginx:1.27-alpine
# docker-compose healthcheck uses wget; not included in nginx:alpine by default
RUN apk add --no-cache wget
COPY nginx.staging.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
