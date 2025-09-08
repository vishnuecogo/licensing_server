from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

# Reuse same Base as other models by importing if desired; keeping separate here then will be merged in main metadata via import
from app.db.models import Base

class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="admin")  # admin, viewer
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

