from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger, Boolean, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    plan_tier = Column(String(50), default="free")  # free, pro, enterprise
    contact_email = Column(String(255))
    # Login credentials for organization access
    login_email = Column(String(255), unique=True, nullable=True)  # Organization login email
    password_hash = Column(String(255), nullable=True)  # Hashed password for organization login
    can_reset_password = Column(Boolean, default=True)  # Allow password reset
    status = Column(String(50), default="active")  # active, disabled, suspended, blocked
    # Enhanced status tracking
    disabled_at = Column(DateTime, nullable=True)  # When organization was disabled
    disabled_reason = Column(String(500), nullable=True)  # Reason for disabling
    last_activity_at = Column(DateTime, nullable=True)  # Last activity timestamp
    # Quota enforcement
    auto_disable_on_quota_exceeded = Column(Boolean, default=True)  # Auto-disable when quota exceeded
    quota_warning_sent = Column(Boolean, default=False)  # Warning notification sent
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    monthly_quota = Column(BigInteger, nullable=True)  # None => unlimited
    price = Column(Numeric(10, 2), default=0)
    description = Column(String(500), nullable=True)  # Plan description
    features = Column(String(1000), nullable=True)  # JSON string of features

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    key_hash = Column(String(64), unique=True, nullable=False)  # SHA256 hex
    active = Column(Boolean, default=True)
    # Enhanced API key tracking
    disabled_at = Column(DateTime, nullable=True)  # When API key was disabled
    disabled_reason = Column(String(500), nullable=True)  # Reason for disabling (quota_exceeded, manual, etc.)
    auto_disabled = Column(Boolean, default=False)  # Whether it was auto-disabled
    last_used_at = Column(DateTime, nullable=True)  # Last usage timestamp
    total_requests = Column(BigInteger, default=0)  # Total requests made with this key
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), default="active")  # active, expired, cancelled
    period_reset_date = Column(String(10), nullable=True)  # YYYY-MM-DD

    organization = relationship("Organization")
    plan = relationship("Plan")

class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False)
    timestamp = Column(DateTime, server_default=func.now())

    # LLM Usage
    llm_provider = Column(String(50))  # 'deepseek', 'openai'
    llm_model = Column(String(100))
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost = Column(Numeric(10, 6), default=0)

    # Request Details
    request_type = Column(String(50))  # 'conversation', 'intent', 'embedding', 'style_analysis'
    endpoint = Column(String(200))
    user_jid = Column(String(100))  # WhatsApp user ID

    # Message Context
    message_id = Column(String(100))
    conversation_id = Column(String(100))
    intent_type = Column(String(50))
    response_time_ms = Column(Integer)

    # Relationships
    organization = relationship("Organization")
    api_key = relationship("ApiKey")

class MonthlyUsageSummary(Base):
    __tablename__ = "monthly_usage_summary"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    year_month = Column(String(7), nullable=False)  # '2024-01'

    # Token Usage by Provider
    total_deepseek_tokens = Column(BigInteger, default=0)
    total_openai_tokens = Column(BigInteger, default=0)

    # Model-Specific Token Usage
    gpt_vision_tokens = Column(BigInteger, default=0)
    text_embedding_tokens = Column(BigInteger, default=0)
    chat_completion_tokens = Column(BigInteger, default=0)

    # Cost Tracking
    total_cost = Column(Numeric(10, 2), default=0)
    deepseek_cost = Column(Numeric(10, 4), default=0)
    openai_cost = Column(Numeric(10, 4), default=0)
    gpt_vision_cost = Column(Numeric(10, 4), default=0)
    embedding_cost = Column(Numeric(10, 4), default=0)

    # Message Counts
    incoming_messages = Column(BigInteger, default=0)
    bot_responses = Column(BigInteger, default=0)
    unique_users = Column(Integer, default=0)

    # Feature Usage
    intent_analyses = Column(BigInteger, default=0)
    rag_queries = Column(BigInteger, default=0)
    style_analyses = Column(BigInteger, default=0)

    # File Processing Usage
    files_processed = Column(BigInteger, default=0)
    vision_analyses = Column(BigInteger, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization")

class UserActivity(Base):
    __tablename__ = "user_activity"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_jid = Column(String(100), nullable=False)
    year_month = Column(String(7), nullable=False)
    message_count = Column(Integer, default=0)
    first_message_at = Column(DateTime)
    last_message_at = Column(DateTime)
    total_tokens_used = Column(BigInteger, default=0)

    # Relationships
    organization = relationship("Organization")

