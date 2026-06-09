import json
from typing import Any, Optional

import redis

from .config import settings

_client: Optional[redis.Redis] = None


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


def cache_get(key: str) -> Optional[Any]:
    try:
        raw = get_client().get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None  # 缓存不可用绝不阻断请求


def cache_set(key: str, value: Any, ttl: int) -> None:
    try:
        get_client().set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:
        pass
