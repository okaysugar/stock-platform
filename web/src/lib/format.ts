export const INITIAL_CAPITAL = 100000;
export const LOT_SIZE = 100;
export const HISTORY_WARMUP_YEARS = 1;

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return `¥${currencyFormatter.format(value)}`;
}

export function formatNumber(value: number, digits = 2) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatShares(value: number) {
  return `${integerFormatter.format(value)} 股`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function formatPrice(value: number) {
  return value.toFixed(2);
}

export function pnlClass(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-emerald-600";
  return "text-slate-700";
}

export function dateLabel(date: string) {
  return date.replaceAll("-", ".");
}

export function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDateInput(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}
