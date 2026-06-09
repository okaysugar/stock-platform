import os


class Settings:
    port: int = int(os.getenv("PORT", "8000"))
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    cache_ttl_kline: int = int(os.getenv("CACHE_TTL_KLINE", "3600"))
    cache_ttl_stocklist: int = int(os.getenv("CACHE_TTL_STOCKLIST", "86400"))
    akshare_request_timeout_seconds: float = float(os.getenv("AKSHARE_REQUEST_TIMEOUT_SECONDS", "8"))


settings = Settings()
