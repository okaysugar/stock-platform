import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { AccountSummary } from "@/components/replay/AccountSummary";
import { DatePicker } from "@/components/replay/DatePicker";
import { KLineReplayChart } from "@/components/replay/KLineReplayChart";
import { StockSearch } from "@/components/replay/StockSearch";
import { TradeHistoryTable } from "@/components/replay/TradeHistoryTable";
import { TradingPanel } from "@/components/replay/TradingPanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { HISTORY_WARMUP_DAYS, INITIAL_CAPITAL } from "@/lib/format";
import { findReplayStartIndex, getDefaultStartDate } from "@/lib/mockData";
import { getDataSourceLabel, getInitialStocks, getStockKline, searchStocks } from "@/lib/marketData";
import { calculateAccount, getBuyShares, getSellShares } from "@/lib/trading";
import type { IndicatorName, StockInfo, StockOption, TradeRecord } from "@/types";

export function StockReplayApp() {
  const [selectedStock, setSelectedStock] = React.useState<StockOption | null>(null);
  const [searchKeyword, setSearchKeyword] = React.useState("");

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
  const [cash, setCash] = React.useState(INITIAL_CAPITAL);
  const [shares, setShares] = React.useState(0);
  const [costAmount, setCostAmount] = React.useState(0);
  const [trades, setTrades] = React.useState<TradeRecord[]>([]);
  const [tradeSequence, setTradeSequence] = React.useState(1);
  const [indicator, setIndicator] = React.useState<IndicatorName>("MACD");

  const searchOptions = searchKeyword.trim() ? searchedStocks : initialStocks;
  const stockOptions = React.useMemo(
    () => mergeSelectedStock(selectedStock, searchOptions),
    [searchOptions, selectedStock],
  );

  const resetReplay = React.useCallback((stock: StockInfo, date: string) => {
    const nextReplayIndex = findReplayStartIndex(stock, date);
    setStartDate(stock.bars[nextReplayIndex].date);
    setReplayIndex(nextReplayIndex);
    setViewIndex(nextReplayIndex);
    setWarmupStartIndex(Math.max(0, nextReplayIndex - HISTORY_WARMUP_DAYS));
    setCash(INITIAL_CAPITAL);
    setShares(0);
    setCostAmount(0);
    setTrades([]);
    setTradeSequence(1);
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
  const account = calculateAccount({ cash, shares, costAmount, valuationBar: replayBar });
  const canPrevious = viewIndex > warmupStartIndex;
  const canNext = viewIndex < replayIndex || replayIndex < bars.length - 1;
  const minStartDate = bars[Math.min(HISTORY_WARMUP_DAYS, bars.length - 1)]?.date ?? bars[0].date;
  const maxStartDate = bars[bars.length - 1].date;

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
      setViewIndex(replayIndex);
      return;
    }
    setReplayIndex((current) => {
      const next = Math.min(bars.length - 1, current + 1);
      setViewIndex(next);
      return next;
    });
  };

  const appendTrade = (trade: Omit<TradeRecord, "id">) => {
    setTrades((current) => [{ id: tradeSequence, ...trade }, ...current]);
    setTradeSequence((current) => current + 1);
  };

  const handleBuy = (ratio: number) => {
    if (isReviewing) return;
    const price = replayBar.close;
    const buyShares = getBuyShares(cash, price, ratio);
    if (buyShares <= 0) return;
    const amount = buyShares * price;

    setCash((current) => current - amount);
    setShares((current) => current + buyShares);
    setCostAmount((current) => current + amount);
    appendTrade({
      date: replayBar.date,
      code: stockData.code,
      name: stockData.name,
      direction: "BUY",
      price,
      shares: buyShares,
      amount,
    });
  };

  const handleSell = (ratio: number) => {
    if (isReviewing || shares <= 0) return;
    const price = replayBar.close;
    const sellShares = getSellShares(shares, ratio);
    if (sellShares <= 0) return;
    const amount = sellShares * price;
    const averageCost = shares > 0 ? costAmount / shares : 0;
    const remainingShares = shares - sellShares;

    setCash((current) => current + amount);
    setShares(remainingShares);
    setCostAmount(remainingShares === 0 ? 0 : costAmount - averageCost * sellShares);
    appendTrade({
      date: replayBar.date,
      code: stockData.code,
      name: stockData.name,
      direction: "SELL",
      price,
      shares: sellShares,
      amount,
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1760px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold text-slate-950">A 股交易复盘</div>
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">副图指标</span>
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
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1760px] grid-cols-[minmax(820px,1fr)_360px] gap-4 p-5">
        <section className="min-w-0 rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                {stockData.name} <span className="font-mono text-slate-500">{stockData.market}.{stockData.code}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                已推进至 {replayBar.date}，当前视图 {viewBar.date}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold text-slate-950">{replayBar.close.toFixed(2)}</div>
              <div className={`text-xs font-medium ${replayBar.pctChg > 0 ? "text-red-600" : replayBar.pctChg < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                {(replayBar.pctChg > 0 ? "+" : "") + (replayBar.pctChg * 100).toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="h-[720px] p-3">
            <KLineReplayChart
              stock={stockData}
              bars={visibleBars}
              focusIndex={Math.max(0, viewIndex - warmupStartIndex)}
              indicator={indicator}
              resetKey={`${stockData.market}-${stockData.code}-${startDate}-${warmupStartIndex}`}
            />
          </div>
        </section>

        <aside className="space-y-4">
          <TradingPanel
            stock={stockData}
            viewBar={viewBar}
            replayBar={replayBar}
            isReviewing={isReviewing}
            account={account}
            canPrevious={canPrevious}
            canNext={canNext}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onBuy={handleBuy}
            onSell={handleSell}
          />
          <AccountSummary account={account} valuationBar={replayBar} />
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
