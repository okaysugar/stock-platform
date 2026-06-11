import * as React from "react";
import { dispose, init } from "klinecharts";
import type { IndicatorName, StockBar, StockInfo } from "@/types";

type ChartApi = NonNullable<ReturnType<typeof init>>;
type KLineBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
};

type KLineReplayChartProps = {
  stock: StockInfo;
  bars: StockBar[];
  focusIndex: number;
  indicator: IndicatorName;
  maVisible: boolean;
  maPeriods: number[];
  theme: "light" | "dark";
  resetKey: string;
};

export function KLineReplayChart({
  stock,
  bars,
  focusIndex,
  indicator,
  maVisible,
  maPeriods,
  theme,
  resetKey,
}: KLineReplayChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<ChartApi | null>(null);
  const dataRef = React.useRef<KLineBar[]>([]);
  const subscribeCallbackRef = React.useRef<((bar: KLineBar) => void) | null>(null);
  const previousStateRef = React.useRef({ resetKey: "", length: 0 });
  const indicatorIdRef = React.useRef<string | null>(null);
  const movingAverageIdRef = React.useRef<string | null>(null);

  const chartData = React.useMemo(
    () =>
      bars.map((bar) => ({
        timestamp: bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        turnover: bar.turnover,
      })),
    [bars],
  );

  dataRef.current = chartData;

  React.useEffect(() => {
    if (!containerRef.current) return undefined;
    const element = containerRef.current;
    const chart = init(element);
    if (!chart) return undefined;

    chartRef.current = chart;
    chart.setStyles(theme === "dark" ? darkChartTheme : lightChartTheme as never);
    chart.setSymbol({ ticker: `${stock.market}.${stock.code}`, pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod({ span: 1, type: "day" });
    chart.setDataLoader({
      getBars: ({ callback }: { callback: (data: KLineBar[], more?: boolean | { forward?: boolean; backward?: boolean }) => void }) => {
        callback(dataRef.current, { forward: false, backward: false });
      },
      subscribeBar: ({ callback }: { callback: (data: KLineBar) => void }) => {
        subscribeCallbackRef.current = callback;
      },
      unsubscribeBar: () => {
        subscribeCallbackRef.current = null;
      },
    });
    chart.createIndicator("VOL", { pane: { id: "volume_pane", height: 118, minHeight: 90 } });
    indicatorIdRef.current = chart.createIndicator(indicator, {
      pane: { id: "indicator_pane", height: 132, minHeight: 100 },
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);

    requestAnimationFrame(() => {
      chart.resetData();
      chart.scrollToDataIndex(focusIndex, 0);
    });

    return () => {
      resizeObserver.disconnect();
      chartRef.current = null;
      dispose(element);
    };
  }, []);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setSymbol({ ticker: `${stock.market}.${stock.code}`, pricePrecision: 2, volumePrecision: 0 });
    chart.resetData();
    previousStateRef.current = { resetKey, length: chartData.length };
    requestAnimationFrame(() => chart.scrollToDataIndex(focusIndex, 0));
  }, [stock.code, stock.market, resetKey]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicatorIdRef.current) {
      chart.removeIndicator({ id: indicatorIdRef.current });
    } else {
      chart.removeIndicator({ paneId: "indicator_pane" });
    }
    indicatorIdRef.current = chart.createIndicator(indicator, {
      pane: { id: "indicator_pane", height: 132, minHeight: 100 },
    });
  }, [indicator]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setStyles(theme === "dark" ? darkChartTheme : lightChartTheme as never);
  }, [theme]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (movingAverageIdRef.current) {
      chart.removeIndicator({ id: movingAverageIdRef.current });
      movingAverageIdRef.current = null;
    }

    const periods = maPeriods.filter((period) => Number.isFinite(period) && period > 0);
    if (!maVisible || periods.length === 0) return;

    movingAverageIdRef.current = chart.createIndicator(
      { name: "MA", calcParams: periods },
      { pane: { id: MAIN_PANE_ID }, isStack: true },
    );
  }, [maPeriods, maVisible]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartData.length === 0) return;

    const previous = previousStateRef.current;
    const canAppend = previous.resetKey === resetKey && chartData.length === previous.length + 1;
    if (canAppend && subscribeCallbackRef.current) {
      subscribeCallbackRef.current(chartData[chartData.length - 1]);
    } else if (previous.length !== chartData.length || previous.resetKey !== resetKey) {
      chart.resetData();
    }

    previousStateRef.current = { resetKey, length: chartData.length };
    requestAnimationFrame(() => chart.scrollToDataIndex(Math.max(0, focusIndex), 220));
  }, [chartData, focusIndex, resetKey]);

  return <div ref={containerRef} className="kline-pane h-full min-h-[620px] w-full" />;
}

const MAIN_PANE_ID = "candle_pane";

const lightChartTheme = {
  grid: {
    horizontal: {
      color: "#f1f5f9",
      size: 1,
    },
    vertical: {
      color: "#f8fafc",
      size: 1,
    },
  },
  candle: {
    type: "candle_solid",
    bar: {
      upColor: "#dc2626",
      downColor: "#059669",
      noChangeColor: "#64748b",
      upBorderColor: "#dc2626",
      downBorderColor: "#059669",
      noChangeBorderColor: "#64748b",
      upWickColor: "#dc2626",
      downWickColor: "#059669",
      noChangeWickColor: "#64748b",
    },
    priceMark: {
      high: { color: "#64748b" },
      low: { color: "#64748b" },
      last: {
        upColor: "#dc2626",
        downColor: "#059669",
        noChangeColor: "#64748b",
      },
    },
    tooltip: {
      text: {
        size: 12,
        color: "#334155",
      },
    },
  },
  xAxis: {
    axisLine: { color: "#e2e8f0" },
    tickText: { color: "#64748b", size: 11 },
  },
  yAxis: {
    axisLine: { color: "#e2e8f0" },
    tickText: { color: "#64748b", size: 11 },
  },
  separator: {
    color: "#e2e8f0",
    size: 1,
  },
  indicator: {
    tooltip: {
      text: {
        size: 11,
        color: "#334155",
      },
    },
  },
};

const darkChartTheme = {
  grid: {
    horizontal: {
      color: "#1e293b",
      size: 1,
    },
    vertical: {
      color: "#161e2e",
      size: 1,
    },
  },
  candle: {
    type: "candle_solid",
    bar: {
      upColor: "#ef4444",
      downColor: "#10b981",
      noChangeColor: "#94a3b8",
      upBorderColor: "#ef4444",
      downBorderColor: "#10b981",
      noChangeBorderColor: "#94a3b8",
      upWickColor: "#ef4444",
      downWickColor: "#10b981",
      noChangeWickColor: "#94a3b8",
    },
    priceMark: {
      high: { color: "#94a3b8" },
      low: { color: "#94a3b8" },
      last: {
        upColor: "#ef4444",
        downColor: "#10b981",
        noChangeColor: "#94a3b8",
      },
    },
    tooltip: {
      text: {
        size: 12,
        color: "#cbd5e1",
      },
    },
  },
  xAxis: {
    axisLine: { color: "#1e293b" },
    tickText: { color: "#94a3b8", size: 11 },
  },
  yAxis: {
    axisLine: { color: "#1e293b" },
    tickText: { color: "#94a3b8", size: 11 },
  },
  separator: {
    color: "#1e293b",
    size: 1,
  },
  indicator: {
    tooltip: {
      text: {
        size: 11,
        color: "#cbd5e1",
      },
    },
  },
};
