import hashlib
from fastapi import Header, HTTPException

def hash_api_key(api_key: str) -> str:
    """Hash an API key using SHA256"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def get_api_key_from_header(auth_header: str = Header(None, alias="Authorization")) -> str:
    """Extract API key from Authorization header"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    return auth_header.split(" ", 1)[1]
