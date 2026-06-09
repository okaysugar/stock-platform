import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent, formatPrice, pnlClass } from "@/lib/format";
import { getBuyShares, getSellShares } from "@/lib/trading";
import type { AccountSnapshot, StockBar, StockOption } from "@/types";

type TradingPanelProps = {
  stock: StockOption;
  viewBar: StockBar;
  replayBar: StockBar;
  isReviewing: boolean;
  account: AccountSnapshot;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onBuy: (ratio: number) => void;
  onSell: (ratio: number) => void;
};

const RATIOS = [0.25, 0.5, 1];

export function TradingPanel({
  stock,
  viewBar,
  replayBar,
  isReviewing,
  account,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onBuy,
  onSell,
}: TradingPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">交易操作</h2>
          <Badge variant={isReviewing ? "outline" : "default"}>{isReviewing ? "回看" : "复盘"}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Info label="股票" value={`${stock.code} ${stock.name}`} />
          <Info label="日期" value={viewBar.date} />
          <Info label="收盘价" value={formatPrice(viewBar.close)} />
          <Info label="涨跌幅" value={formatPercent(viewBar.pctChg)} className={pnlClass(viewBar.pctChg)} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={!canPrevious} onClick={onPrevious}>
            <ChevronLeft />
            上一天
          </Button>
          <Button type="button" variant="outline" disabled={!canNext} onClick={onNext}>
            下一天
            <ChevronRight />
          </Button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">买入</span>
            <span className="text-xs text-slate-400">可用 {formatCurrency(account.cash)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RATIOS.map((ratio) => {
              const shares = getBuyShares(account.cash, replayBar.close, ratio);
              return (
                <Button
                  key={`buy-${ratio}`}
                  type="button"
                  variant="buy"
                  disabled={isReviewing || shares <= 0}
                  title={shares > 0 ? `预计买入 ${shares} 股` : "现金不足"}
                  onClick={() => onBuy(ratio)}
                >
                  <ArrowUpRight />
                  {getActionLabel("买入", ratio)}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">卖出</span>
            <span className="text-xs text-slate-400">持仓 {account.shares.toLocaleString("zh-CN")} 股</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RATIOS.map((ratio) => {
              const shares = getSellShares(account.shares, ratio);
              return (
                <Button
                  key={`sell-${ratio}`}
                  type="button"
                  variant="sell"
                  disabled={isReviewing || shares <= 0}
                  title={shares > 0 ? `预计卖出 ${shares} 股` : "无可卖持仓"}
                  onClick={() => onSell(ratio)}
                >
                  <ArrowDownRight />
                  {getActionLabel("卖出", ratio)}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function getActionLabel(prefix: string, ratio: number) {
  return `${prefix} ${Math.round(ratio * 100)}%`;
}

function Info({ label, value, className = "text-slate-900" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-sm font-semibold ${className}`}>{value}</div>
    </div>
  );
}
