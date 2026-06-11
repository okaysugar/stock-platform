import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatPrice, formatShares, pnlClass } from "@/lib/format";
import type { AccountSnapshot, StockBar } from "@/types";

type AccountSummaryProps = {
  account: AccountSnapshot;
  valuationBar: StockBar;
};

export function AccountSummary({ account, valuationBar }: AccountSummaryProps) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">本股收益</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">按当前视图日估值</p>
        </div>
        <Badge variant={account.stockPnl >= 0 ? "red" : "green"}>{formatPercent(account.stockReturnRate)}</Badge>
      </div>
      <div className="p-5">
        <div className={`rounded-xl px-4 py-3 ${profitSurfaceClass(account.stockPnl)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-muted-foreground/80">本股总收益</div>
              <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${pnlClass(account.stockPnl)}`}>
                {formatSignedCurrency(account.stockPnl)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-muted-foreground/80">累计投入收益率</div>
              <div className={`mt-1 font-mono text-base font-bold tabular-nums ${pnlClass(account.stockReturnRate)}`}>
                {formatPercent(account.stockReturnRate)}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-foreground/10 pt-3">
            <InlineMetric label="已实现" value={formatSignedCurrency(account.realizedPnl)} className={pnlClass(account.realizedPnl)} />
            <InlineMetric label="持仓浮盈" value={formatSignedCurrency(account.floatingPnl)} className={pnlClass(account.floatingPnl)} />
            <InlineMetric label="持仓收益率" value={account.shares > 0 ? formatPercent(account.holdingReturnRate) : "--"} className={pnlClass(account.holdingReturnRate)} />
            <InlineMetric label="累计买入" value={account.totalBuyAmount > 0 ? formatCurrency(account.totalBuyAmount) : "--"} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <SummaryRow
            leftLabel="持仓市值"
            leftValue={formatCurrency(account.marketValue)}
            rightLabel="持仓成本"
            rightValue={account.shares > 0 ? formatCurrency(account.positionCostAmount) : "--"}
          />
          <SummaryRow
            leftLabel="持仓股数"
            leftValue={formatShares(account.shares)}
            rightLabel="成本均价"
            rightValue={account.shares > 0 ? formatPrice(account.holdingCost) : "--"}
          />
          <SummaryRow
            leftLabel="现金"
            leftValue={formatCurrency(account.cash)}
            rightLabel="总资产"
            rightValue={formatCurrency(account.totalAssets)}
            strong
          />
          <SummaryRow
            leftLabel="账户收益"
            leftValue={formatSignedCurrency(account.totalAssets - account.initialCapital)}
            leftClassName={pnlClass(account.returnRate)}
            rightLabel="估值价"
            rightValue={formatPrice(valuationBar.close)}
          />
        </div>
      </div>
    </section>
  );
}

function InlineMetric({ label, value, className = "text-foreground" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground/80">{label}</div>
      <div className={`mt-1 truncate font-mono text-sm font-bold tabular-nums ${className}`}>{value}</div>
    </div>
  );
}

function SummaryRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  leftClassName = "text-foreground",
  rightClassName = "text-foreground",
  strong = false,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  leftClassName?: string;
  rightClassName?: string;
  strong?: boolean;
}) {
  const valueClassName = strong ? "text-base font-bold" : "text-sm font-semibold";

  return (
    <div className="grid grid-cols-2 gap-3 border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{leftLabel}</div>
        <div className={`mt-1 truncate font-mono tabular-nums ${valueClassName} ${leftClassName}`}>{leftValue}</div>
      </div>
      <div className="min-w-0 text-right">
        <div className="text-xs text-muted-foreground">{rightLabel}</div>
        <div className={`mt-1 truncate font-mono tabular-nums ${valueClassName} ${rightClassName}`}>{rightValue}</div>
      </div>
    </div>
  );
}

function formatSignedCurrency(value: number) {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function profitSurfaceClass(value: number) {
  if (value > 0) {
    return "border bg-gradient-to-br from-rose-50/60 to-rose-100/20 border-rose-100/80 dark:from-rose-950/15 dark:to-rose-900/5 dark:border-rose-900/30";
  }
  if (value < 0) {
    return "border bg-gradient-to-br from-emerald-50/60 to-emerald-100/20 border-emerald-100/80 dark:from-emerald-950/15 dark:to-emerald-900/5 dark:border-emerald-900/30";
  }
  return "border border-border bg-muted/40";
}
