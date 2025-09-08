import hashlib
from typing import Optional


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    provided_hash = sha256_hex(provided_key)
    # Constant-time compare would be ideal; Python's == is acceptable for now
    return provided_hash == stored_hash

