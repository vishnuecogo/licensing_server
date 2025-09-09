from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class TokenUsageData(BaseModel):
    """Schema for tracking token usage - cost calculation handled by licensing server"""
    org_id: int
    api_key_id: int

    # LLM Usage
    llm_provider: str  # 'deepseek', 'openai'
    llm_model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    # NOTE: estimated_cost removed - licensing server calculates costs

    # Request Details
    request_type: str  # 'conversation', 'intent', 'embedding', 'style_analysis'
    endpoint: Optional[str] = None
    user_jid: Optional[str] = None

    # Message Context
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    intent_type: Optional[str] = None
    response_time_ms: Optional[int] = None

class MessageActivityData(BaseModel):
    """Schema for tracking message activity"""
    org_id: int
    api_key_id: int
    user_jid: str
    message_type: str  # 'incoming', 'outgoing'
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    intent_type: Optional[str] = None

class UsageStatsResponse(BaseModel):
    """Response schema for usage statistics"""
    org_id: int
    year_month: str

    # Token Usage by Provider
    total_deepseek_tokens: int
    total_openai_tokens: int

    # Model-Specific Token Usage
    gpt_vision_tokens: int
    text_embedding_tokens: int
    chat_completion_tokens: int

    # Cost Tracking
    total_cost: float
    deepseek_cost: float
    openai_cost: float
    gpt_vision_cost: float
    embedding_cost: float

    # Message Counts
    incoming_messages: int
    bot_responses: int
    unique_users: int

    # Feature Usage
    intent_analyses: int
    rag_queries: int
    style_analyses: int
    files_processed: int
    vision_analyses: int

class UserActivityResponse(BaseModel):
    """Response schema for user activity"""
    user_jid: str
    year_month: str
    message_count: int
    first_message_at: Optional[datetime]
    last_message_at: Optional[datetime]
    total_tokens_used: int

class UsageAnalyticsResponse(BaseModel):
    """Comprehensive usage analytics response"""
    organization_id: int
    organization_name: str
    current_month: UsageStatsResponse
    previous_month: Optional[UsageStatsResponse]
    top_users: list[UserActivityResponse]
    daily_breakdown: list[dict]  # Daily usage for current month
    cost_breakdown: dict  # Cost by service type
