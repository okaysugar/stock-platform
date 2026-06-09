import axios, { AxiosInstance } from "axios";
import { config } from "./config";

const client: AxiosInstance = axios.create({
  baseURL: config.dataServiceUrl,
  timeout: config.requestTimeoutMs,
});

export interface SearchResult {
  keyword: string;
  count: number;
  data: Array<{ code: string; code_name: string }>;
}

export interface KlineResult {
  code: string;
  freq: string;
  adjust: string;
  start: string | null;
  end: string | null;
  count: number;
  data: Array<Record<string, string>>;
}

export async function searchStocks(keyword: string): Promise<SearchResult> {
  const resp = await client.get<SearchResult>("/internal/stocks/search", {
    params: { keyword },
  });
  return resp.data;
}

export async function getKline(
  code: string,
  params: { start?: string; end?: string; freq: string; adjust: string }
): Promise<KlineResult> {
  const resp = await client.get<KlineResult>(
    `/internal/stocks/${encodeURIComponent(code)}/kline`,
    { params }
  );
  return resp.data;
}
