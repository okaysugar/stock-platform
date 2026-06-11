import { INITIAL_CAPITAL, LOT_SIZE } from "@/lib/format";
import type { AccountSnapshot, StockBar, TradeRecord } from "@/types";

export function getBuyShares(cash: number, price: number, ratio: number) {
  if (price <= 0 || cash <= 0) return 0;
  const rawShares = Math.floor((cash * ratio) / price);
  return Math.floor(rawShares / LOT_SIZE) * LOT_SIZE;
}

export function getSellShares(shares: number, ratio: number) {
  if (shares <= 0) return 0;
  if (ratio >= 1) return shares;
  return Math.floor((shares * ratio) / LOT_SIZE) * LOT_SIZE;
}

export function calculateAccount(params: {
  cash: number;
  shares: number;
  costAmount: number;
  valuationBar: StockBar;
  realizedPnl?: number;
  totalBuyAmount?: number;
  totalSellAmount?: number;
}): AccountSnapshot {
  const holdingCost = params.shares > 0 ? params.costAmount / params.shares : 0;
  const marketValue = params.shares * params.valuationBar.close;
  const totalAssets = params.cash + marketValue;
  const floatingPnl = params.shares > 0 ? marketValue - params.costAmount : 0;
  const realizedPnl = params.realizedPnl ?? 0;
  const totalBuyAmount = params.totalBuyAmount ?? 0;
  const totalSellAmount = params.totalSellAmount ?? 0;
  const stockPnl = realizedPnl + floatingPnl;
  const holdingReturnRate = params.costAmount > 0 ? floatingPnl / params.costAmount : 0;
  const stockReturnRate = totalBuyAmount > 0 ? stockPnl / totalBuyAmount : 0;
  const returnRate = (totalAssets - INITIAL_CAPITAL) / INITIAL_CAPITAL;

  return {
    initialCapital: INITIAL_CAPITAL,
    cash: params.cash,
    shares: params.shares,
    positionCostAmount: params.costAmount,
    holdingCost,
    marketValue,
    totalAssets,
    floatingPnl,
    realizedPnl,
    stockPnl,
    holdingReturnRate,
    stockReturnRate,
    totalBuyAmount,
    totalSellAmount,
    returnRate,
  };
}

export function calculateAccountFromTrades(params: {
  trades: TradeRecord[];
  bars: StockBar[];
  throughIndex: number;
  valuationBar: StockBar;
}): AccountSnapshot {
  const barIndexByDate = new Map(params.bars.map((bar, index) => [bar.date, index]));
  const safeThroughIndex = Math.min(Math.max(params.throughIndex, 0), params.bars.length - 1);
  let cash = INITIAL_CAPITAL;
  let shares = 0;
  let costAmount = 0;
  let realizedPnl = 0;
  let totalBuyAmount = 0;
  let totalSellAmount = 0;

  const applicableTrades = params.trades
    .map((trade) => ({ trade, index: barIndexByDate.get(trade.date) ?? -1 }))
    .filter(({ index }) => index >= 0 && index <= safeThroughIndex)
    .sort((left, right) => left.index - right.index || left.trade.id - right.trade.id);

  applicableTrades.forEach(({ trade }) => {
    if (trade.direction === "BUY") {
      cash -= trade.amount;
      shares += trade.shares;
      costAmount += trade.amount;
      totalBuyAmount += trade.amount;
      return;
    }

    if (shares <= 0) return;
    const sellShares = Math.min(trade.shares, shares);
    const averageCost = costAmount / shares;
    const sellAmount = sellShares * trade.price;
    const sellCost = averageCost * sellShares;
    const remainingShares = shares - sellShares;
    cash += sellAmount;
    shares = remainingShares;
    costAmount = remainingShares === 0 ? 0 : costAmount - sellCost;
    realizedPnl += sellAmount - sellCost;
    totalSellAmount += sellAmount;
  });

  return calculateAccount({
    cash,
    shares,
    costAmount,
    realizedPnl,
    totalBuyAmount,
    totalSellAmount,
    valuationBar: params.valuationBar,
  });
}
