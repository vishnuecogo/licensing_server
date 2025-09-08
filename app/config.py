import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Helpers to read docker secrets mounted as *_FILE

def _read_secret_file(path: str):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception:
        return None

# Database configuration
# You can provide a full DATABASE_URL or individual parts (host, port, name, user, password or password file)
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PASSWORD_FILE = os.getenv("DB_PASSWORD_FILE")
if not DB_PASSWORD and DB_PASSWORD_FILE:
    DB_PASSWORD = _read_secret_file(DB_PASSWORD_FILE)

if os.getenv("DATABASE_URL"):
    DATABASE_URL = os.getenv("DATABASE_URL")
elif DB_HOST and DB_NAME and DB_USER and DB_PASSWORD:
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Fallback to local SQLite for development
    DATABASE_URL = "sqlite:///./licensing.db"

# General settings
APP_NAME = os.getenv("APP_NAME", "Evachatbot Licensing Server")
DEBUG = os.getenv("DEBUG", "0") in ("1", "true", "True")

# CORS (comma-separated list). Example: "http://localhost:8080,https://admin.example.com"
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:8080")

# Admin auth
_secret_file = os.getenv("SECRET_KEY_FILE")
SECRET_KEY = os.getenv("SECRET_KEY") or (_read_secret_file(_secret_file) if _secret_file else None) or "dev-secret"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"

