from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine
from app.db import models
from app.db.admin_models import AdminUser  # ensure table creation
from app.routes import auth as auth_routes
from app.routes import usage as usage_routes
from app.routes import admin as admin_routes, analytics, plans, admin_analytics
from app.routes import organization as organization_routes
# from app.routes import admin_licensing  # Temporarily disabled
from app.config import APP_NAME, FRONTEND_ORIGINS

# Tables are created via Docker entrypoint script
# See docker-entrypoint.sh init_database function

app = FastAPI(title=APP_NAME)

# CORS
origins = [o.strip() for o in FRONTEND_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mount routers
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(usage_routes.router, prefix="/api/usage", tags=["Usage"])
app.include_router(admin_routes.router, prefix="/api")
app.include_router(admin_analytics.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(organization_routes.router, prefix="/api")
# app.include_router(admin_licensing.router, prefix="/api/admin/licensing", tags=["Admin Licensing"])  # Temporarily disabled

@app.get("/")
def root():
    return {"ok": True, "service": APP_NAME}

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker health checks."""
    return {"status": "healthy", "service": "licensing-server"}

