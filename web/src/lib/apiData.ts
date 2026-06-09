import { appConfig } from "@/lib/config";
import { DEFAULT_STOCK_OPTIONS } from "@/lib/mockData";
import type { StockBar, StockInfo, StockMarket, StockOption } from "@/types";

type ApiSearchResponse = {
  keyword: string;
  count: number;
  data: Array<{
    code: string;
    code_name: string;
  }>;
};

type ApiKlineResponse = {
  code: string;
  freq: string;
  adjust: string;
  start: string | null;
  end: string | null;
  count: number;
  data: Array<Record<string, string>>;
};

export async function getApiInitialStocks(): Promise<StockOption[]> {
  const results = await Promise.allSettled(
    DEFAULT_STOCK_OPTIONS.map((stock) => searchApiStocks(stock.code)),
  );
  const stocks = dedupeStocks(
    results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
  return stocks.length > 0 ? stocks : DEFAULT_STOCK_OPTIONS;
}

export async function searchApiStocks(keyword: string): Promise<StockOption[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return getApiInitialStocks();
  const response = await apiFetch<ApiSearchResponse>(`/stocks/search?keyword=${encodeURIComponent(trimmed)}`);
  return dedupeStocks(response.data.map(normalizeSearchItem));
}

export async function getApiStockKline(stock: StockOption): Promise<StockInfo> {
  const params = new URLSearchParams({
    start: appConfig.realKlineStart,
    end: appConfig.realKlineEnd,
    freq: "d",
    adjust: "none",
  });
  const response = await apiFetch<ApiKlineResponse>(`/stocks/${encodeURIComponent(stock.apiCode)}/kline?${params}`);
  const bars = response.data.map(mapApiBar).filter((bar): bar is StockBar => Boolean(bar));
  if (bars.length === 0) {
    throw new Error(`${stock.code} ${stock.name} 暂无可用 K 线数据`);
  }
  return { ...stock, bars };
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${appConfig.apiBaseUrl}${path}`);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // Keep the HTTP status text when the backend response is not JSON.
    }
    throw new Error(`接口请求失败：${message}`);
  }
  return response.json() as Promise<T>;
}

function normalizeSearchItem(item: { code: string; code_name: string }): StockOption {
  const rawCode = item.code.trim();
  const compact = rawCode.replace(".", "").toLowerCase();
  const market = inferMarket(compact);
  const code = compact.replace(/^(sh|sz)/, "");
  return {
    code,
    market,
    apiCode: rawCode,
    name: item.code_name,
  };
}

function inferMarket(value: string): StockMarket {
  if (value.startsWith("sz")) return "SZ";
  if (value.startsWith("sh")) return "SH";
  const code = value.replace(/^(sh|sz)/, "");
  return code.startsWith("6") || code.startsWith("9") ? "SH" : "SZ";
}

function mapApiBar(row: Record<string, string>, index: number, rows: Array<Record<string, string>>): StockBar | null {
  const date = row.date;
  const open = toNumber(row.open);
  const high = toNumber(row.high);
  const low = toNumber(row.low);
  const close = toNumber(row.close);
  if (!date || !isFiniteNumber(open) || !isFiniteNumber(high) || !isFiniteNumber(low) || !isFiniteNumber(close)) {
    return null;
  }

  const previousClose = toNumber(row.preclose) || (index > 0 ? toNumber(rows[index - 1].close) : 0);
  const rawPctChg = toNumber(row.pctChg);
  const pctChg = isFiniteNumber(rawPctChg)
    ? rawPctChg / 100
    : previousClose > 0
      ? (close - previousClose) / previousClose
      : 0;

  return {
    date,
    timestamp: new Date(`${date}T00:00:00+08:00`).getTime(),
    open,
    high,
    low,
    close,
    volume: toNumber(row.volume) || 0,
    turnover: toNumber(row.amount) || 0,
    pctChg,
  };
}

function toNumber(value: string | undefined) {
  if (value === undefined || value === "") return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function dedupeStocks(stocks: StockOption[]) {
  const map = new Map<string, StockOption>();
  stocks.forEach((stock) => {
    map.set(`${stock.market}.${stock.code}`, stock);
  });
  return Array.from(map.values());
}
