import { getApiInitialStocks, getApiStockKline, searchApiStocks } from "@/lib/apiData";
import { appConfig } from "@/lib/config";
import { getMockStockKline, getMockStocks, searchMockStocks } from "@/lib/mockData";
import type { StockInfo, StockOption } from "@/types";

export function getDataSourceLabel() {
  return appConfig.dataSource === "api" ? "真实接口" : "Mock";
}

export async function getInitialStocks(): Promise<StockOption[]> {
  if (appConfig.dataSource === "api") return getApiInitialStocks();
  const stocks = await getMockStocks();
  return stocks.map(toStockOption);
}

export async function searchStocks(keyword: string): Promise<StockOption[]> {
  if (appConfig.dataSource === "api") return searchApiStocks(keyword);
  return searchMockStocks(keyword);
}

export async function getStockKline(stock: StockOption): Promise<StockInfo> {
  if (appConfig.dataSource === "api") return getApiStockKline(stock);
  return getMockStockKline(stock);
}

function toStockOption(stock: StockInfo): StockOption {
  return {
    code: stock.code,
    market: stock.market,
    apiCode: stock.apiCode,
    name: stock.name,
  };
}
