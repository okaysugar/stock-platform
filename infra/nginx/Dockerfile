FROM node:20-alpine AS web-build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web ./

ARG VITE_STOCK_DATA_SOURCE=api
ARG VITE_API_BASE_URL=/api
ARG VITE_REAL_KLINE_START=2020-01-01

ENV VITE_STOCK_DATA_SOURCE=${VITE_STOCK_DATA_SOURCE}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_REAL_KLINE_START=${VITE_REAL_KLINE_START}

RUN pnpm build

FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/dist /usr/share/nginx/html
EXPOSE 8080
