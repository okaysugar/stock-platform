# A 股交易复盘前端

## 启动

```bash
pnpm install
pnpm dev
```

默认使用真实接口数据。

## 切换数据源

复制 `.env.example` 为 `.env.local`，按需修改：

```bash
VITE_STOCK_DATA_SOURCE=api
```

使用本项目真实接口：

```bash
VITE_STOCK_DATA_SOURCE=api
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8080
VITE_REAL_KLINE_START=2020-01-01
```

切回 mock 数据：

```bash
VITE_STOCK_DATA_SOURCE=mock
```

真实接口模式依赖根目录的 Docker 服务：

```bash
docker compose up --build
```

Vite dev server 会把 `/api/*` 代理到 `VITE_API_PROXY_TARGET`。生产部署时如果前端和 Nginx 同源，保留 `VITE_API_BASE_URL=/api` 即可。

## 构建

```bash
pnpm build
```
