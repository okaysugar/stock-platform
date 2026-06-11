import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, RotateCcw, Sun, Moon } from "lucide-react";
import { AccountSummary } from "@/components/replay/AccountSummary";
import { DatePicker } from "@/components/replay/DatePicker";
import { KLineReplayChart } from "@/components/replay/KLineReplayChart";
import { StockSearch } from "@/components/replay/StockSearch";
import { TradeHistoryTable } from "@/components/replay/TradeHistoryTable";
import { TradingPanel } from "@/components/replay/TradingPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { formatPercent, pnlClass } from "@/lib/format";
import {
  findReplayStartIndex,
  findWarmupStartIndex,
  getDefaultStartDate,
  getMinimumReplayStartDate,
} from "@/lib/mockData";
import { getDataSourceLabel, getInitialStocks, getStockKline, searchStocks } from "@/lib/marketData";
import { calculateAccountFromTrades, getBuyShares, getSellShares } from "@/lib/trading";
import type { IndicatorName, StockInfo, StockOption, TradeRecord } from "@/types";

const DEFAULT_MA_PERIOD_FIELDS = ["5", "10", "20", "60"];
const MAX_MA_PERIOD = 250;

export function StockReplayApp() {
  const [selectedStock, setSelectedStock] = React.useState<StockOption | null>(null);
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("stock-replay-theme");
    return (saved as "light" | "dark") || "dark";
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("stock-replay-theme", theme);
  }, [theme]);

  const {
    data: initialStocks = [],
    isLoading: isInitialStocksLoading,
    error: initialStocksError,
    refetch: refetchInitialStocks,
  } = useQuery({
    queryKey: ["initial-stocks"],
    queryFn: getInitialStocks,
  });

  const {
    data: searchedStocks = [],
    isFetching: isSearching,
  } = useQuery({
    queryKey: ["stock-search", searchKeyword.trim()],
    queryFn: () => searchStocks(searchKeyword.trim()),
    enabled: searchKeyword.trim().length > 0,
  });

  const {
    data: stockData,
    isLoading: isKlineLoading,
    error: klineError,
    refetch: refetchKline,
  } = useQuery({
    queryKey: ["stock-kline", selectedStock?.market, selectedStock?.code, selectedStock?.apiCode],
    queryFn: () => getStockKline(selectedStock!),
    enabled: Boolean(selectedStock),
  });

  const [startDate, setStartDate] = React.useState("");
  const [replayIndex, setReplayIndex] = React.useState(0);
  const [viewIndex, setViewIndex] = React.useState(0);
  const [warmupStartIndex, setWarmupStartIndex] = React.useState(0);
  const [trades, setTrades] = React.useState<TradeRecord[]>([]);
  const [indicator, setIndicator] = React.useState<IndicatorName>("MACD");
  const [maVisible, setMaVisible] = React.useState(true);
  const [maPeriodFields, setMaPeriodFields] = React.useState(DEFAULT_MA_PERIOD_FIELDS);

  const searchOptions = searchKeyword.trim() ? searchedStocks : initialStocks;
  const stockOptions = React.useMemo(
    () => mergeSelectedStock(selectedStock, searchOptions),
    [searchOptions, selectedStock],
  );
  const maPeriods = React.useMemo(() => normalizeMaPeriodFields(maPeriodFields), [maPeriodFields]);

  const handleMaPeriodChange = (index: number, value: string) => {
    if (!/^\d{0,3}$/.test(value)) return;
    setMaPeriodFields((current) =>
      current.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field;
        if (value === "") return value;
        return String(Math.min(Number(value), MAX_MA_PERIOD));
      }),
    );
  };

  const handleMaPeriodBlur = (index: number) => {
    setMaPeriodFields((current) =>
      current.map((field, fieldIndex) => {
        if (fieldIndex !== index || field !== "") return field;
        return DEFAULT_MA_PERIOD_FIELDS[index] ?? "5";
      }),
    );
  };

  const resetReplay = React.useCallback((stock: StockInfo, date: string) => {
    const nextReplayIndex = findReplayStartIndex(stock, date);
    setStartDate(stock.bars[nextReplayIndex].date);
    setReplayIndex(nextReplayIndex);
    setViewIndex(nextReplayIndex);
    setWarmupStartIndex(findWarmupStartIndex(stock, nextReplayIndex));
    setTrades([]);
  }, []);

  React.useEffect(() => {
    if (selectedStock || initialStocks.length === 0) return;
    setSelectedStock(initialStocks.find((stock) => stock.code === "600000") ?? initialStocks[0]);
  }, [initialStocks, selectedStock]);

  React.useEffect(() => {
    if (!stockData) return;
    resetReplay(stockData, getDefaultStartDate(stockData));
  }, [resetReplay, stockData]);

  if (initialStocksError || klineError) {
    const message = initialStocksError instanceof Error
      ? initialStocksError.message
      : klineError instanceof Error
        ? klineError.message
        : "数据加载失败";
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <section className="w-[420px] rounded-md border border-slate-200 bg-white p-5">
          <h1 className="text-base font-semibold text-slate-950">数据加载失败</h1>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => {
              if (initialStocksError) void refetchInitialStocks();
              else void refetchKline();
            }}
          >
            重试
          </Button>
        </section>
      </main>
    );
  }

  if (isInitialStocksLoading || isKlineLoading || !selectedStock || !stockData || !startDate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        正在加载复盘数据
      </main>
    );
  }

  const bars = stockData.bars;
  const viewBar = bars[viewIndex];
  const replayBar = bars[replayIndex];
  const visibleBars = bars.slice(warmupStartIndex, replayIndex + 1);
  const isReviewing = viewIndex !== replayIndex;
  const account = calculateAccountFromTrades({ trades, bars, throughIndex: viewIndex, valuationBar: viewBar });
  const canPrevious = viewIndex > warmupStartIndex;
  const canNext = viewIndex < replayIndex || replayIndex < bars.length - 1;
  const minStartDate = getMinimumReplayStartDate(stockData);
  const maxStartDate = bars[bars.length - 1].date;
  const barIndexByDate = new Map(bars.map((bar, index) => [bar.date, index]));

  const handleStockChange = (stock: StockOption) => {
    setSelectedStock(stock);
    setStartDate("");
    setSearchKeyword("");
  };

  const handleDateChange = (date: string) => {
    resetReplay(stockData, date);
  };

  const handlePrevious = () => {
    setViewIndex((current) => Math.max(warmupStartIndex, current - 1));
  };

  const handleNext = () => {
    if (viewIndex < replayIndex) {
      setViewIndex((current) => Math.min(replayIndex, current + 1));
      return;
    }
    setReplayIndex((current) => {
      const next = Math.min(bars.length - 1, current + 1);
      setViewIndex(next);
      return next;
    });
  };

  const appendTrade = (trade: Omit<TradeRecord, "id">) => {
    const tradeIndex = barIndexByDate.get(trade.date) ?? viewIndex;
    setTrades((current) => {
      const nextId = current.reduce((maxId, record) => Math.max(maxId, record.id), 0) + 1;
      const keptTrades = current.filter((record) => {
        const recordIndex = barIndexByDate.get(record.date);
        return recordIndex !== undefined && recordIndex <= tradeIndex;
      });
      return [{ id: nextId, ...trade }, ...keptTrades];
    });
    setReplayIndex(tradeIndex);
    setViewIndex(tradeIndex);
  };

  const handleBuy = (ratio: number) => {
    const price = viewBar.close;
    const buyShares = getBuyShares(account.cash, price, ratio);
    if (buyShares <= 0) return;
    const amount = buyShares * price;

    appendTrade({
      date: viewBar.date,
      code: stockData.code,
      name: stockData.name,
      direction: "BUY",
      price,
      shares: buyShares,
      amount,
    });
  };

  const handleSell = (ratio: number) => {
    if (account.shares <= 0) return;
    const price = viewBar.close;
    const sellShares = getSellShares(account.shares, ratio);
    if (sellShares <= 0) return;
    const amount = sellShares * price;

    appendTrade({
      date: viewBar.date,
      code: stockData.code,
      name: stockData.name,
      direction: "SELL",
      price,
      shares: sellShares,
      amount,
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="mx-auto flex min-h-14 max-w-[1760px] flex-wrap items-center justify-between gap-3 px-5 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-base font-bold text-foreground">A 股交易复盘</div>
            <Badge variant="outline">{getDataSourceLabel()}</Badge>
            <StockSearch
              stocks={stockOptions}
              value={selectedStock.code}
              onChange={handleStockChange}
              searchValue={searchKeyword}
              isSearching={isSearching}
              onSearchChange={setSearchKeyword}
            />
            <DatePicker value={startDate} min={minStartDate} max={maxStartDate} onChange={handleDateChange} />
            <Button type="button" variant="outline" onClick={() => resetReplay(stockData, startDate)}>
              <RotateCcw />
              重置
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">均线</span>
              <Button
                type="button"
                variant={maVisible ? "default" : "outline"}
                size="sm"
                className="h-8 w-[74px] px-2"
                onClick={() => setMaVisible((visible) => !visible)}
              >
                {maVisible ? <Eye /> : <EyeOff />}
                {maVisible ? "显示" : "隐藏"}
              </Button>
              <div className="flex items-center gap-1">
                {maPeriodFields.map((field, index) => (
                  <Input
                    key={`ma-period-${index}`}
                    value={field}
                    inputMode="numeric"
                    aria-label={`MA${index + 1}周期`}
                    className="h-8 w-12 px-2 text-center font-mono text-xs"
                    onBlur={() => handleMaPeriodBlur(index)}
                    onChange={(event) => handleMaPeriodChange(index, event.target.value)}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground">副图指标</span>
            <ToggleGroup
              type="single"
              value={indicator}
              onValueChange={(value) => value && setIndicator(value as IndicatorName)}
            >
              <ToggleGroupItem value="MACD">MACD</ToggleGroupItem>
              <ToggleGroupItem value="KDJ">KDJ</ToggleGroupItem>
              <ToggleGroupItem value="RSI">RSI</ToggleGroupItem>
            </ToggleGroup>
            <Select value="day" disabled>
              <SelectTrigger className="w-[96px]">
                <SelectValue placeholder="日线" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">日线</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="切换主题"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1760px] grid-cols-[minmax(820px,1fr)_360px] gap-4 p-5">
        <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <div className="text-sm font-bold text-foreground">
                {stockData.name} <span className="font-mono text-muted-foreground">{stockData.market}.{stockData.code}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                已推进至 {replayBar.date}，当前视图 {viewBar.date}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-foreground">{viewBar.close.toFixed(2)}</div>
              <div className={`text-xs font-medium ${pnlClass(viewBar.pctChg)}`}>
                {formatPercent(viewBar.pctChg)}
              </div>
            </div>
          </div>
          <div className="h-[720px] p-3">
            <KLineReplayChart
              stock={stockData}
              bars={visibleBars}
              focusIndex={Math.max(0, viewIndex - warmupStartIndex)}
              indicator={indicator}
              maVisible={maVisible}
              maPeriods={maPeriods}
              theme={theme}
              resetKey={`${stockData.market}-${stockData.code}-${startDate}-${warmupStartIndex}`}
            />
          </div>
        </section>

        <aside className="space-y-4">
          <TradingPanel
            stock={stockData}
            viewBar={viewBar}
            isReviewing={isReviewing}
            account={account}
            canPrevious={canPrevious}
            canNext={canNext}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onBuy={handleBuy}
            onSell={handleSell}
          />
          <AccountSummary account={account} valuationBar={viewBar} />
        </aside>

        <div className="col-span-2">
          <TradeHistoryTable trades={trades} />
        </div>
      </div>
    </main>
  );
}

function mergeSelectedStock(selectedStock: StockOption | null, stocks: StockOption[]) {
  if (!selectedStock) return stocks;
  const exists = stocks.some((stock) => stock.market === selectedStock.market && stock.code === selectedStock.code);
  return exists ? stocks : [selectedStock, ...stocks];
}

function normalizeMaPeriodFields(fields: string[]) {
  return fields
    .map((field) => Number(field))
    .filter((period) => Number.isInteger(period) && period > 0)
    .map((period) => Math.min(period, MAX_MA_PERIOD));
}
