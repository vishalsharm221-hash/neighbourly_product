"""Localy backend (Appwrite-powered). This FastAPI service is kept only
because supervisor manages it. All real backend logic now lives in Appwrite Cloud."""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="Localy", description="Appwrite-backed app")
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"service": "localy", "backend": "appwrite", "status": "ok"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
