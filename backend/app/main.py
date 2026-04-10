from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.firebase import init_firebase
from app.routers import business, group, health, me, personal, storage, users


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_firebase()
    yield


app = FastAPI(
    title="Momentra API",
    version="0.1.0",
    lifespan=lifespan,
)

s = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=s.cors_origin_list,
    allow_origin_regex=s.cors_origin_regex_effective,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(me.router)
app.include_router(storage.router)
app.include_router(users.router)
app.include_router(personal.router)
app.include_router(group.router)
app.include_router(business.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "momentra-api", "docs": "/docs"}
