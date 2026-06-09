import { INITIAL_CAPITAL, LOT_SIZE } from "@/lib/format";
import type { AccountSnapshot, StockBar } from "@/types";

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
}): AccountSnapshot {
  const holdingCost = params.shares > 0 ? params.costAmount / params.shares : 0;
  const marketValue = params.shares * params.valuationBar.close;
  const totalAssets = params.cash + marketValue;
  const floatingPnl = params.shares > 0 ? marketValue - params.costAmount : 0;
  const returnRate = (totalAssets - INITIAL_CAPITAL) / INITIAL_CAPITAL;

  return {
    initialCapital: INITIAL_CAPITAL,
    cash: params.cash,
    shares: params.shares,
    holdingCost,
    marketValue,
    totalAssets,
    floatingPnl,
    returnRate,
  };
}
