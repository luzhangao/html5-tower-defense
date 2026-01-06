FROM node:24-slim AS builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
COPY backend/verifier ./backend/verifier
COPY webpack.config.core-verifier.js ./

RUN cd frontend && npx webpack --config ../webpack.config.core-verifier.js

FROM node:24-slim
WORKDIR /app/backend/verifier

COPY backend/verifier/package.json backend/verifier/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/verifier ./
COPY --from=builder /app/backend/verifier/core-engine-bundle.js ./core-engine-bundle.js

EXPOSE 3001
CMD ["node", "verify-core.js"]
