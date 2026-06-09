import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatPrice, formatShares, pnlClass } from "@/lib/format";
import type { AccountSnapshot, StockBar } from "@/types";

type AccountSummaryProps = {
  account: AccountSnapshot;
  valuationBar: StockBar;
};

export function AccountSummary({ account, valuationBar }: AccountSummaryProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">账户资产</h2>
        <Badge variant={account.returnRate >= 0 ? "red" : "green"}>{formatPercent(account.returnRate)}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4">
        <Metric label="本金" value={formatCurrency(account.initialCapital)} />
        <Metric label="现金" value={formatCurrency(account.cash)} />
        <Metric label="持仓股数" value={formatShares(account.shares)} />
        <Metric label="持仓成本" value={account.shares > 0 ? formatPrice(account.holdingCost) : "--"} />
        <Metric label="持仓市值" value={formatCurrency(account.marketValue)} />
        <Metric label="估值价" value={formatPrice(valuationBar.close)} />
        <Metric label="总资产" value={formatCurrency(account.totalAssets)} strong />
        <Metric label="浮动盈亏" value={formatCurrency(account.floatingPnl)} className={pnlClass(account.floatingPnl)} strong />
      </div>
    </section>
  );
}

function Metric({ label, value, className = "text-slate-900", strong = false }: { label: string; value: string; className?: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`${strong ? "text-base font-semibold" : "text-sm font-medium"} mt-1 truncate ${className}`}>{value}</div>
    </div>
  );
}
