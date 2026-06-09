export type StockDataSource = "mock" | "api";

const dataSource = normalizeDataSource(import.meta.env.VITE_STOCK_DATA_SOURCE);

export const appConfig = {
  dataSource,
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "/api"),
  realKlineStart: import.meta.env.VITE_REAL_KLINE_START ?? "2020-01-01",
  realKlineEnd: import.meta.env.VITE_REAL_KLINE_END ?? todayYmd(),
};

function normalizeDataSource(value: unknown): StockDataSource {
  return value === "mock" ? "mock" : "api";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}
