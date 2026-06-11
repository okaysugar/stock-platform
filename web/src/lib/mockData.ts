import { HISTORY_WARMUP_YEARS } from "@/lib/format";
import type { StockBar, StockInfo, StockOption } from "@/types";

type SeedConfig = {
  seed: number;
  basePrice: number;
  trend: number;
  amplitude: number;
  volumeBase: number;
};

const STOCK_CONFIGS: Array<StockOption & SeedConfig> = [
  { code: "600000", market: "SH", apiCode: "sh.600000", name: "浦发银行", seed: 11, basePrice: 7.2, trend: 0.0015, amplitude: 0.018, volumeBase: 710000 },
  { code: "000001", market: "SZ", apiCode: "sz.000001", name: "平安银行", seed: 29, basePrice: 10.8, trend: 0.0012, amplitude: 0.02, volumeBase: 680000 },
  { code: "600519", market: "SH", apiCode: "sh.600519", name: "贵州茅台", seed: 53, basePrice: 1540, trend: 0.0008, amplitude: 0.014, volumeBase: 43000 },
  { code: "300750", market: "SZ", apiCode: "sz.300750", name: "宁德时代", seed: 73, basePrice: 188, trend: 0.0019, amplitude: 0.026, volumeBase: 172000 },
  { code: "601318", market: "SH", apiCode: "sh.601318", name: "中国平安", seed: 97, basePrice: 42, trend: 0.001, amplitude: 0.017, volumeBase: 390000 },
  { code: "000858", market: "SZ", apiCode: "sz.000858", name: "五粮液", seed: 131, basePrice: 128, trend: 0.0009, amplitude: 0.018, volumeBase: 185000 },
  { code: "600036", market: "SH", apiCode: "sh.600036", name: "招商银行", seed: 157, basePrice: 34, trend: 0.0011, amplitude: 0.016, volumeBase: 520000 },
  { code: "002475", market: "SZ", apiCode: "sz.002475", name: "立讯精密", seed: 181, basePrice: 31, trend: 0.0018, amplitude: 0.024, volumeBase: 610000 },
];

export const DEFAULT_STOCK_OPTIONS: StockOption[] = STOCK_CONFIGS.map((stock) => ({
  code: stock.code,
  market: stock.market,
  apiCode: stock.apiCode,
  name: stock.name,
}));

export async function getMockStocks(): Promise<StockInfo[]> {
  return MOCK_STOCKS;
}

export async function searchMockStocks(keyword: string): Promise<StockOption[]> {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return DEFAULT_STOCK_OPTIONS;
  return DEFAULT_STOCK_OPTIONS.filter((stock) =>
    `${stock.code} ${stock.market} ${stock.apiCode} ${stock.name}`.toLowerCase().includes(normalizedKeyword),
  );
}

export async function getMockStockKline(stock: StockOption): Promise<StockInfo> {
  return MOCK_STOCKS.find((item) => item.code === stock.code) ?? MOCK_STOCKS[0];
}

export function findReplayStartIndex(stock: StockInfo, targetDate: string) {
  if (stock.bars.length === 0) return 0;
  const minIndex = getMinimumReplayStartIndex(stock);
  const exactOrNext = findFirstIndexOnOrAfter(stock, targetDate);
  return Math.min(stock.bars.length - 1, Math.max(minIndex, exactOrNext === -1 ? stock.bars.length - 1 : exactOrNext));
}

export function findWarmupStartIndex(stock: StockInfo, replayIndex: number) {
  if (stock.bars.length === 0) return 0;
  const safeReplayIndex = Math.min(Math.max(replayIndex, 0), stock.bars.length - 1);
  const warmupDate = shiftDateByYears(stock.bars[safeReplayIndex].date, -HISTORY_WARMUP_YEARS);
  const warmupIndex = findFirstIndexOnOrAfter(stock, warmupDate);
  return Math.min(safeReplayIndex, Math.max(0, warmupIndex === -1 ? 0 : warmupIndex));
}

export function getDefaultStartDate(stock: StockInfo) {
  return stock.bars[getMinimumReplayStartIndex(stock)]?.date ?? stock.bars[0]?.date ?? "";
}

export function getMinimumReplayStartDate(stock: StockInfo) {
  return stock.bars[getMinimumReplayStartIndex(stock)]?.date ?? stock.bars[0]?.date ?? "";
}

function getMinimumReplayStartIndex(stock: StockInfo) {
  if (stock.bars.length === 0) return 0;
  const firstDateAfterWarmup = shiftDateByYears(stock.bars[0].date, HISTORY_WARMUP_YEARS);
  const index = findFirstIndexOnOrAfter(stock, firstDateAfterWarmup);
  return index === -1 ? stock.bars.length - 1 : index;
}

function findFirstIndexOnOrAfter(stock: StockInfo, targetDate: string) {
  return stock.bars.findIndex((bar) => bar.date >= targetDate);
}

function shiftDateByYears(date: string, years: number) {
  const cursor = new Date(`${date}T00:00:00`);
  cursor.setFullYear(cursor.getFullYear() + years);
  return formatYmd(cursor);
}

const MOCK_STOCKS = STOCK_CONFIGS.map(({ seed, basePrice, trend, amplitude, volumeBase, ...stock }) => ({
  ...stock,
  bars: generateBars({ seed, basePrice, trend, amplitude, volumeBase }),
}));

function generateBars(config: SeedConfig): StockBar[] {
  const dates = generateTradingDates("2023-01-03", 520);
  let price = config.basePrice;
  let previousClose = price;
  let seed = config.seed;

  return dates.map((date, index) => {
    seed = nextSeed(seed);
    const randomA = normalized(seed);
    seed = nextSeed(seed);
    const randomB = normalized(seed);
    seed = nextSeed(seed);
    const randomC = normalized(seed);

    const wave = Math.sin(index / 13 + config.seed) * config.amplitude;
    const drift = config.trend + Math.sin(index / 47) * 0.0015;
    const dailyChange = clamp(drift + wave + (randomA - 0.5) * config.amplitude * 2.2, -0.075, 0.075);
    const openGap = clamp((randomB - 0.5) * config.amplitude, -0.035, 0.035);
    const close = roundPrice(previousClose * (1 + dailyChange), config.basePrice);
    const open = roundPrice(previousClose * (1 + openGap), config.basePrice);
    const high = roundPrice(Math.max(open, close) * (1 + 0.004 + randomC * config.amplitude), config.basePrice);
    const low = roundPrice(Math.min(open, close) * (1 - 0.004 - (1 - randomC) * config.amplitude), config.basePrice);
    const volume = Math.round(config.volumeBase * (0.72 + randomA * 0.7 + Math.abs(dailyChange) * 8));
    const turnover = Math.round(volume * close * 100);
    const pctChg = previousClose === 0 ? 0 : (close - previousClose) / previousClose;

    price = close;
    previousClose = close;

    return {
      date,
      timestamp: new Date(`${date}T00:00:00+08:00`).getTime(),
      open,
      high,
      low,
      close: price,
      volume,
      turnover,
      pctChg,
    };
  });
}

function generateTradingDates(startDate: string, count: number) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);

  while (dates.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(formatYmd(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function formatYmd(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function nextSeed(seed: number) {
  return (seed * 9301 + 49297) % 233280;
}

function normalized(seed: number) {
  return seed / 233280;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPrice(value: number, basePrice: number) {
  const digits = basePrice > 500 ? 2 : 3;
  return Number(value.toFixed(digits));
}
