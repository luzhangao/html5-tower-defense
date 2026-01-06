FROM node:24-slim AS builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
COPY src ./src
COPY webpack.config.core-browser.js ./

RUN cd frontend && npx webpack --config ../webpack.config.core-browser.js

FROM nginx:alpine
COPY --from=builder /app/src /usr/share/nginx/html
EXPOSE 80
