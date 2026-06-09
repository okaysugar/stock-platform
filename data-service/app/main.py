from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import akshare_client as data_source
from .routers import internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_source.login()
    yield
    data_source.logout()


app = FastAPI(title="stock-data-service", lifespan=lifespan)
app.include_router(internal.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "data-service"}
