from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from .. import akshare_client as data_source
from ..cache import cache_get, cache_set
from ..config import settings

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/stocks/search")
def search_stocks(keyword: str = Query(..., min_length=1)):
    kw = keyword.strip()
    if not kw:
        raise HTTPException(status_code=400, detail="keyword is required")

    stocks = cache_get("stocklist:all")
    if stocks is None:
        try:
            stocks = data_source.fetch_all_stocks()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"akshare error: {e}")
        cache_set("stocklist:all", stocks, settings.cache_ttl_stocklist)

    low = kw.lower()
    matched = [s for s in stocks if low in s["code"].lower() or low in s["code_name"].lower()]
    return {"keyword": kw, "count": len(matched), "data": matched[:50]}


@router.get("/stocks/{code}/kline")
def get_kline(
    code: str,
    start: Optional[str] = Query(default=None),
    end: Optional[str] = Query(default=None),
    freq: str = Query(default="d"),
    adjust: str = Query(default="none"),
):
    cache_key = f"kline:{code}:{start}:{end}:{freq}:{adjust}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        rows = data_source.fetch_kline(code, start, end, freq, adjust)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"akshare error: {e}")

    result = {
        "code": code, "freq": freq, "adjust": adjust,
        "start": start, "end": end, "count": len(rows), "data": rows,
    }
    cache_set(cache_key, result, settings.cache_ttl_kline)
    return result
