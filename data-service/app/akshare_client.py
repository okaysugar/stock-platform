import threading
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import akshare as ak
import pandas as pd

from .config import settings

# AKShare pulls from public market-data endpoints. Keep calls serialized to avoid
# unnecessary pressure on upstream services and reduce rate-limit surprises.
_lock = threading.Lock()


def login() -> None:
    """Compatibility hook; AKShare does not require an authenticated session."""
    return None


def logout() -> None:
    """Compatibility hook; AKShare does not require an authenticated session."""
    return None


def normalize_code(code: str) -> str:
    """接受 '600000' / 'sh600000' / 'sh.600000'，统一为 'sh.600000'。"""
    c = code.strip().lower()
    if "." in c:
        return c
    if c.startswith(("sh", "sz", "bj")):
        return f"{c[:2]}.{c[2:]}"
    if c.startswith(("6", "9")):          # 沪市主板 / 科创板 / B 股
        return f"sh.{c}"
    if c.startswith(("0", "2", "3")):     # 深市主板 / B / 创业板
        return f"sz.{c}"
    if c.startswith(("4", "8")):          # 北交所
        return f"bj.{c}"
    return f"sh.{c}"


def _stock_code_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    if text.isdigit() and len(text) < 6:
        return text.zfill(6)
    return text


def _symbol_for_akshare(code: str) -> str:
    return normalize_code(code).split(".", 1)[1]


def _market_symbol_for_akshare(code: str) -> str:
    market, symbol = normalize_code(code).split(".", 1)
    return f"{market}{symbol}"


def _date_for_akshare(value: Optional[str], default: str) -> str:
    if not value:
        return default
    digits = value.strip().replace("-", "")
    if len(digits) != 8 or not digits.isdigit():
        raise ValueError("date must be YYYY-MM-DD or YYYYMMDD")
    return digits


def _as_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.strftime("%Y-%m-%d")
    return str(value)


def _pct_change_text(close: Any, previous_close: Any) -> str:
    try:
        close_value = float(close)
        previous_close_value = float(previous_close)
    except (TypeError, ValueError):
        return ""
    if previous_close_value == 0:
        return ""
    value = (close_value - previous_close_value) / previous_close_value * 100
    return f"{value:.6f}".rstrip("0").rstrip(".")


def _fetch_stock_list_df() -> pd.DataFrame:
    try:
        return ak.stock_zh_a_spot_em()
    except Exception:
        return ak.stock_info_a_code_name()


def fetch_all_stocks() -> List[Dict[str, str]]:
    """全量 A 股证券列表 [{code, code_name}, ...]。"""
    with _lock:
        df = _fetch_stock_list_df()

    code_column = "代码" if "代码" in df.columns else "code"
    name_column = "名称" if "名称" in df.columns else "name"

    result: List[Dict[str, str]] = []
    for _, row in df.iterrows():
        code = _stock_code_text(row.get(code_column))
        if not code:
            continue
        result.append({
            "code": normalize_code(code),
            "code_name": _as_text(row.get(name_column)),
        })
    return result


_ADJUST_MAP = {"none": "", "qfq": "qfq", "hfq": "hfq"}
_FREQ_MAP = {"d": "daily", "w": "weekly", "m": "monthly"}


def _fetch_daily_fallback_df(norm: str, start_date: str, end_date: str, adjust: str) -> pd.DataFrame:
    df = ak.stock_zh_a_daily(
        symbol=_market_symbol_for_akshare(norm),
        start_date=start_date,
        end_date=end_date,
        adjust=adjust,
    )
    if "turnover" in df.columns:
        df = df.copy()
        df["turnover"] = df["turnover"] * 100
    return df.rename(columns={
        "date": "日期",
        "open": "开盘",
        "high": "最高",
        "low": "最低",
        "close": "收盘",
        "volume": "成交量",
        "amount": "成交额",
        "turnover": "换手率",
    })


def _aggregate_daily_df(df: pd.DataFrame, period: str) -> pd.DataFrame:
    if period == "daily" or df.empty:
        return df

    grouped_df = df.copy()
    grouped_df["日期"] = pd.to_datetime(grouped_df["日期"])
    grouped_df["_period"] = grouped_df["日期"].dt.to_period("W" if period == "weekly" else "M")

    aggregations: Dict[str, str] = {
        "日期": "last",
        "开盘": "first",
        "最高": "max",
        "最低": "min",
        "收盘": "last",
    }
    for column in ("成交量", "成交额", "换手率"):
        if column in grouped_df.columns:
            aggregations[column] = "sum"

    return grouped_df.groupby("_period").agg(aggregations).reset_index(drop=True)


def _fetch_history_df(norm: str, period: str, start_date: str, end_date: str, adjust: str) -> pd.DataFrame:
    try:
        return ak.stock_zh_a_hist(
            symbol=_symbol_for_akshare(norm),
            period=period,
            start_date=start_date,
            end_date=end_date,
            adjust=adjust,
            timeout=settings.akshare_request_timeout_seconds,
        )
    except Exception:
        return _aggregate_daily_df(
            _fetch_daily_fallback_df(norm, start_date, end_date, adjust),
            period,
        )


def fetch_kline(code: str, start: Optional[str], end: Optional[str], freq: str, adjust: str) -> List[Dict[str, str]]:
    norm = normalize_code(code)
    period = _FREQ_MAP.get(freq)
    if period is None:
        raise ValueError("freq must be one of d,w,m")

    ak_adjust = _ADJUST_MAP.get(adjust)
    if ak_adjust is None:
        raise ValueError("adjust must be one of none,qfq,hfq")

    start_date = _date_for_akshare(start, "19700101")
    end_date = _date_for_akshare(end, "22220101")
    with _lock:
        df = _fetch_history_df(norm, period, start_date, end_date, ak_adjust)

    rows: List[Dict[str, str]] = []
    previous_close = ""
    previous_close_value: Any = None
    for _, row in df.iterrows():
        close_value = row.get("收盘")
        close = _as_text(close_value)
        pct_chg = _as_text(row.get("涨跌幅")) or _pct_change_text(close_value, previous_close_value)
        rows.append({
            "date": _as_text(row.get("日期")),
            "code": norm,
            "open": _as_text(row.get("开盘")),
            "high": _as_text(row.get("最高")),
            "low": _as_text(row.get("最低")),
            "close": close,
            "preclose": previous_close,
            "volume": _as_text(row.get("成交量")),
            "amount": _as_text(row.get("成交额")),
            "turn": _as_text(row.get("换手率")),
            "pctChg": pct_chg,
            "tradestatus": "1",
        })
        previous_close = close
        previous_close_value = close_value
    return rows
