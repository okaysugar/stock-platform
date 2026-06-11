# stock-platform

本地可运行的股票数据全栈项目骨架。当前已实现股票模拟交易复盘前端与后端股票数据 API。

前端基于 React/Vite 构建为静态资源，由 Nginx 统一对外提供；后端基于 AKShare（免费 A 股数据），通过 Nginx → Node 网关 → Python 数据服务 → AKShare/Redis 的分层架构对外提供接口。

## 目录结构

```text
stock-platform/
  web/                    # React 交易复盘前端
  api-gateway/            # Node/Express，对外 API 网关
  data-service/           # Python/FastAPI，内部数据服务
  infra/
    nginx/                # 统一入口层配置
  docker-compose.yml      # 本地完整链路编排
  .env.example            # 环境变量说明
```

## 架构

```
外部 (http://localhost:8080)
        │  / 前端静态资源，/api/* 后端接口
        ▼
   ┌─────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────┐
   │  Nginx  │ ───▶ │ api-gateway  │ ───▶ │ data-service │ ───▶ │ AKShare  │ (外网)
   │  :8080  │      │ Express :3000│      │ FastAPI :8000│      └──────────┘
   └─────────┘      │   (Node/TS)  │      │   (Python)   │ ───▶ ┌──────────┐
                    └──────────────┘      └──────────────┘      │  Redis   │ (缓存)
                                                                └──────────┘

docker 网段：
  edge     = nginx + api-gateway
  internal = api-gateway + data-service + redis
  → nginx 不在 internal，访问不到 data-service；data-service/redis 不发布端口到宿主。
  → 只有 api-gateway 同时在两个网段，是访问 /internal/* 的唯一入口。
```

| 服务 | 容器名 | 监听端口 | 对宿主暴露 |
|------|--------|----------|-----------|
| Nginx + Web | stock-nginx | 8080 | `127.0.0.1:8080` |
| api-gateway (Node) | stock-api-gateway | 3000 | 否 |
| data-service (Python) | stock-data-service | 8000 | 否 |
| redis | stock-redis | 6379 | 否 |

## 启动

需要 Docker 与 Docker Compose，且容器能访问外网（AKShare 会访问东方财富等公开数据源）。

```bash
docker compose up --build
```

四个服务会依次构建并启动（redis → data-service → api-gateway → nginx）。Nginx 镜像会先构建 `web/` 前端产物，并在容器内提供静态页面。

启动后访问：

- 前端页面：`http://localhost:8080/`
- 健康检查：`http://localhost:8080/healthz`
- API 接口：`http://localhost:8080/api/*`

停止：`Ctrl-C`，或 `docker compose down`。

## 接口

API 通过 `http://localhost:8080/api/*` 访问。

### 1. 股票搜索

```
GET /api/stocks/search?keyword=xxx
```

按关键字（股票代码或名称的子串，不区分大小写）匹配，最多返回 50 条。

```bash
curl 'http://localhost:8080/api/stocks/search?keyword=浦发'
curl 'http://localhost:8080/api/stocks/search?keyword=600000'
```

响应：

```json
{
  "keyword": "浦发",
  "count": 1,
  "data": [
    { "code": "sh.600000", "code_name": "浦发银行" }
  ]
}
```

### 2. K 线查询

```
GET /api/stocks/:code/kline?start=YYYY-MM-DD&end=YYYY-MM-DD&freq=d&adjust=none
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `:code` | 股票代码，支持 `sh.600000` / `sh600000` / `600000`（自动补全交易所前缀） | 必填 |
| `start` | 起始日期 | 空（默认从 `19700101` 开始） |
| `end` | 结束日期 | 空（默认到 `22220101` 结束） |
| `freq` | 周期：`d`(日) / `w`(周) / `m`(月) | `d` |
| `adjust` | 复权：`none`(不复权) / `qfq`(前复权) / `hfq`(后复权) | `none` |

```bash
curl 'http://localhost:8080/api/stocks/sh.600000/kline?start=2024-01-01&end=2024-01-31&freq=d&adjust=none'
curl 'http://localhost:8080/api/stocks/600000/kline?start=2024-01-01&end=2024-01-31'
```

响应：

```json
{
  "code": "sh.600000",
  "freq": "d",
  "adjust": "none",
  "start": "2024-01-01",
  "end": "2024-01-31",
  "count": 22,
  "data": [
    { "date": "2024-01-02", "code": "sh.600000", "open": "...", "high": "...", "low": "...", "close": "...", "preclose": "...", "volume": "...", "amount": "...", "turn": "...", "pctChg": "...", "tradestatus": "1" }
  ]
}
```

> 注：AKShare 返回 DataFrame，data-service 会将响应字段统一转为字符串。`preclose` 由当前查询结果的上一条 `close` 补齐，首条为空；`tradestatus` 固定为 `"1"`。

## 缓存

Redis 缓存在 data-service（Python）层：

- `stocklist:all` — 全量证券列表，TTL `CACHE_TTL_STOCKLIST`（默认 86400s / 1 天）。搜索首次请求会拉全量列表并写入，之后命中缓存。
- `kline:{code}:{start}:{end}:{freq}:{adjust}` — 每次 K 线查询结果，TTL `CACHE_TTL_KLINE`（默认 3600s / 1 小时）。

缓存不可用时不会阻断请求，会直接回源 AKShare。

## 访问隔离

- **统一入口**：Nginx 对外提供前端静态资源，并将 `/api/*` 代理到 api-gateway；data-service / redis 不发布端口到宿主。
- **`/internal/*` 只给 Node 容器调用**：靠 docker 网段隔离 —— nginx 与宿主都不在 data-service 所在的 `internal` 网段，只有 api-gateway 能到达。
- **容器前端默认使用真实接口**：Nginx 镜像构建时设置 `VITE_STOCK_DATA_SOURCE=api` 与 `VITE_API_BASE_URL=/api`，前端会同源访问本项目后端接口。

## 配置（环境变量）

均在 `docker-compose.yml` 内置默认值，可按需覆盖，详见 `.env.example`：

| 变量 | 服务 | 默认 |
|------|------|------|
| `PORT` | api-gateway / data-service | 3000 / 8000 |
| `DATA_SERVICE_URL` | api-gateway | `http://data-service:8000` |
| `REDIS_URL` | data-service | `redis://redis:6379/0` |
| `CACHE_TTL_KLINE` | data-service | 3600 |
| `CACHE_TTL_STOCKLIST` | data-service | 86400 |
| `AKSHARE_REQUEST_TIMEOUT_SECONDS` | data-service | 8 |

前端构建参数在 `infra/nginx/Dockerfile` 中设置，可通过 Docker build args 覆盖：

| 变量 | 默认 |
|------|------|
| `VITE_STOCK_DATA_SOURCE` | `api` |
| `VITE_API_BASE_URL` | `/api` |
| `VITE_REAL_KLINE_START` | `2020-01-01` |

## 已知限制（MVP）

- AKShare 依赖公开数据源页面/API；上游接口调整、限流或网络不可达时会以 502 返回。
- 股票搜索列表优先使用 AKShare 的 `stock_zh_a_spot_em`；若该接口不可用，会用 `stock_info_a_code_name` 兜底。
- K 线优先使用 AKShare 的 `stock_zh_a_hist`；若该接口不可用，会用 `stock_zh_a_daily` 兜底，周线/月线由日线在服务内聚合。
- K 线查询请求超时由 `AKSHARE_REQUEST_TIMEOUT_SECONDS` 控制。
- 搜索结果上限 50 条；K 线无分页。
- 需要容器能访问外网，离线环境无法取数。
