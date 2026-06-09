export type StockMarket = "SH" | "SZ";

export type StockOption = {
  code: string;
  market: StockMarket;
  name: string;
  apiCode: string;
};

export type StockInfo = StockOption & {
  bars: StockBar[];
};

export type StockBar = {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
  pctChg: number;
};

export type TradeDirection = "BUY" | "SELL";

export type TradeRecord = {
  id: number;
  date: string;
  code: string;
  name: string;
  direction: TradeDirection;
  price: number;
  shares: number;
  amount: number;
};

export type IndicatorName = "MACD" | "KDJ" | "RSI";

export type AccountSnapshot = {
  initialCapital: number;
  cash: number;
  shares: number;
  holdingCost: number;
  marketValue: number;
  totalAssets: number;
  floatingPnl: number;
  returnRate: number;
};
