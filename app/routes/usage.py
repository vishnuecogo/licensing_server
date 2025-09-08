from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi import Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from app.db.database import SessionLocal
from app.db.models import UsageLog, MonthlyUsageSummary, UserActivity, ApiKey, Organization
from app.services.usage_service import accept_usage_report
from app.schemas.usage import TokenUsageData, MessageActivityData
from app.utils.auth import get_api_key_from_header, hash_api_key
from app.utils.admin_security import decode_token
from app.db.admin_models import AdminUser

router = APIRouter()


def calculate_token_cost(provider: str, model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost based on provider and model pricing"""
    if provider.lower() == "deepseek":
        # DeepSeek pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
        input_cost = prompt_tokens * 0.14 / 1000000
        output_cost = completion_tokens * 0.28 / 1000000
        return input_cost + output_cost
    elif provider.lower() == "openai":
        if "embedding" in model.lower():
            # OpenAI embedding pricing: $0.02 per 1M tokens
            return prompt_tokens * 0.02 / 1000000
        else:
            # OpenAI chat pricing (varies by model, using GPT-3.5 as default)
            input_cost = prompt_tokens * 0.50 / 1000000
            output_cost = completion_tokens * 1.50 / 1000000
            return input_cost + output_cost
    else:
        # Unknown provider, return 0
        return 0.0


class UsageReport(BaseModel):
    org_id: int
    api_key_id: int
    tokens_used: int
    requests_count: int


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validate_analytics_access(org_id: int, auth_header: str, db: Session):
    """Validate access to analytics data - supports both API key and admin authentication"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]

    # Try admin authentication first
    try:
        data = decode_token(token)
        if data.get("role") in ("admin", "viewer"):
            # Verify admin user exists and is active
            admin_user = db.query(AdminUser).filter(
                AdminUser.email == data.get("sub"),
                AdminUser.active.is_(True)
            ).first()
            if admin_user:
                # Admin can access any organization's analytics
                organization = db.query(Organization).filter(Organization.id == org_id).first()
                if not organization:
                    raise HTTPException(status_code=404, detail="Organization not found")
                return organization, None  # Return None for api_key_obj since this is admin access
    except:
        pass  # If admin auth fails, try API key auth

    # Try API key authentication
    try:
        organization, api_key_obj = get_org_from_api_key(token, db)
        # Validate organization access for API key
        if org_id != organization.id:
            raise HTTPException(status_code=403, detail="Access denied to this organization")
        return organization, api_key_obj
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


def get_org_from_api_key(api_key: str, db: Session):
    """Get organization and API key info from API key"""
    api_key_obj = db.query(ApiKey).filter(
        ApiKey.key_hash == hash_api_key(api_key),
        ApiKey.active == True
    ).first()

    if not api_key_obj:
        raise HTTPException(status_code=401, detail="Invalid API key")

    organization = db.query(Organization).get(api_key_obj.org_id)
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    return organization, api_key_obj


@router.post("/report")
def report_usage(payload: UsageReport, auth_header: str = Header(None, alias="Authorization"), db: Session = Depends(get_db)):
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    bearer_key_plain = auth_header.split(" ", 1)[1]

    # Strictly validate that the bearer key matches the provided api_key_id and org_id
    result = accept_usage_report(
        db,
        payload.org_id,
        payload.api_key_id,
        payload.tokens_used,
        payload.requests_count,
        bearer_key_plain,
    )
    if not result.get("ok"):
        raise HTTPException(status_code=401, detail=result)
    return result


@router.post("/tokens")
def track_token_usage(
    usage_data: TokenUsageData,
    background_tasks: BackgroundTasks,
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Track token usage for LLM API calls asynchronously"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    api_key = auth_header.split(" ", 1)[1]
    organization, api_key_obj = get_org_from_api_key(api_key, db)

    # Validate that the provided org_id and api_key_id match
    if usage_data.org_id != organization.id or usage_data.api_key_id != api_key_obj.id:
        raise HTTPException(status_code=400, detail="Organization ID or API Key ID mismatch")
    
    # Process token usage asynchronously
    background_tasks.add_task(
        process_token_usage,
        usage_data=usage_data
    )

    return {
        "message": "Token usage tracking initiated",
        "status": "processing",
        "total_tokens": usage_data.total_tokens
    }


def process_token_usage(usage_data: TokenUsageData):
    """Process token usage asynchronously"""
    # Use a new database session for the background task
    db = SessionLocal()
    try:
        # Calculate cost on licensing server side
        estimated_cost = calculate_token_cost(
            usage_data.llm_provider,
            usage_data.llm_model,
            usage_data.prompt_tokens,
            usage_data.completion_tokens
        )

        # Create usage log entry
        usage_log = UsageLog(
            org_id=usage_data.org_id,
            api_key_id=usage_data.api_key_id,
            llm_provider=usage_data.llm_provider,
            llm_model=usage_data.llm_model,
            prompt_tokens=usage_data.prompt_tokens,
            completion_tokens=usage_data.completion_tokens,
            total_tokens=usage_data.total_tokens,
            estimated_cost=estimated_cost,
            request_type=usage_data.request_type,
            endpoint=usage_data.endpoint,
            user_jid=usage_data.user_jid,
            message_id=usage_data.message_id,
            conversation_id=usage_data.conversation_id,
            intent_type=usage_data.intent_type,
            response_time_ms=usage_data.response_time_ms
        )

        db.add(usage_log)

        # Update monthly summary
        current_month = datetime.now().strftime("%Y-%m")
        monthly_summary = db.query(MonthlyUsageSummary).filter(
            MonthlyUsageSummary.org_id == usage_data.org_id,
            MonthlyUsageSummary.year_month == current_month
        ).first()

        if not monthly_summary:
            monthly_summary = MonthlyUsageSummary(
                org_id=usage_data.org_id,
                year_month=current_month,
                total_deepseek_tokens=0,
                total_openai_tokens=0,
                total_cost=0,
                incoming_messages=0,
                bot_responses=0,
                unique_users=0,
                intent_analyses=0,
                rag_queries=0,
                style_analyses=0
            )
            db.add(monthly_summary)
            db.flush()  # Ensure the record is created before we use it

        # Update message counts based on message type
        if activity_data.message_type == "incoming":
            monthly_summary.incoming_messages += 1
        elif activity_data.message_type == "outgoing":
            monthly_summary.bot_responses += 1

        # Update unique users count if this is a new user
        user_activity = db.query(UserActivity).filter(
            UserActivity.org_id == activity_data.org_id,
            UserActivity.year_month == current_month,
            UserActivity.user_jid == activity_data.user_jid
        ).first()

        if not user_activity:
            # This is a new user for this month
            monthly_summary.unique_users += 1
            user_activity = UserActivity(
                org_id=activity_data.org_id,
                year_month=current_month,
                user_jid=activity_data.user_jid,
                message_count=0,
                total_tokens=0,
                last_message_time=datetime.now()
            )
            db.add(user_activity)

        # Update user activity
        user_activity.message_count += 1
        user_activity.last_message_time = datetime.now()

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error tracking message activity: {str(e)}")
        finally:
            db.close()

        # Ensure all fields are not None (handle existing records with NULL values)
        if monthly_summary.total_deepseek_tokens is None:
            monthly_summary.total_deepseek_tokens = 0
        if monthly_summary.total_openai_tokens is None:
            monthly_summary.total_openai_tokens = 0
        if monthly_summary.total_cost is None:
            monthly_summary.total_cost = 0

        # Update token counts based on provider
        if usage_data.llm_provider == "deepseek":
            monthly_summary.total_deepseek_tokens += usage_data.total_tokens
        elif usage_data.llm_provider == "openai":
            monthly_summary.total_openai_tokens += usage_data.total_tokens

        # Ensure total_cost is not None and handle Decimal type properly
        from decimal import Decimal
        if monthly_summary.total_cost is None:
            monthly_summary.total_cost = Decimal('0')

        # Convert both to Decimal to avoid type mismatch
        monthly_summary.total_cost += Decimal(str(estimated_cost))

        # Update feature usage counts
        if usage_data.request_type == "intent_analysis":
            monthly_summary.intent_analyses += 1
        elif usage_data.request_type == "embedding":
            monthly_summary.rag_queries += 1
        elif usage_data.request_type == "style_analysis":
            monthly_summary.style_analyses += 1
        elif usage_data.request_type == "conversation":
            monthly_summary.bot_responses += 1

        # Update user activity if user_jid is provided
        if usage_data.user_jid:
            user_activity = db.query(UserActivity).filter(
                UserActivity.org_id == usage_data.org_id,
                UserActivity.user_jid == usage_data.user_jid,
                UserActivity.year_month == current_month
            ).first()

            if not user_activity:
                user_activity = UserActivity(
                    org_id=usage_data.org_id,
                    user_jid=usage_data.user_jid,
                    year_month=current_month,
                    first_message_at=datetime.now(),
                    message_count=0,
                    total_tokens_used=0
                )
                db.add(user_activity)

            # Ensure total_tokens_used is not None
            if user_activity.total_tokens_used is None:
                user_activity.total_tokens_used = 0
            user_activity.total_tokens_used += usage_data.total_tokens
            user_activity.last_message_at = datetime.now()

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error processing token usage: {e}")
    finally:
        db.close()


@router.post("/messages")
def track_message_activity(
    activity_data: MessageActivityData,
    background_tasks: BackgroundTasks,
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Track message activity (incoming/outgoing messages) asynchronously"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    api_key = auth_header.split(" ", 1)[1]
    organization, api_key_obj = get_org_from_api_key(api_key, db)

    # Validate that the provided org_id and api_key_id match
    if activity_data.org_id != organization.id or activity_data.api_key_id != api_key_obj.id:
        raise HTTPException(status_code=400, detail="Organization ID or API Key ID mismatch")
    
    # Process message activity asynchronously
    background_tasks.add_task(
        process_message_activity,
        activity_data=activity_data
    )

    return {
        "message": "Message activity tracking initiated",
        "status": "processing",
        "user_jid": activity_data.user_jid,
        "message_type": activity_data.message_type
    }


def process_message_activity(activity_data: MessageActivityData):
    """Process message activity asynchronously"""
    # Use a new database session for the background task
    db = SessionLocal()
    try:
        current_month = datetime.now().strftime("%Y-%m")

        # Update monthly summary
        monthly_summary = db.query(MonthlyUsageSummary).filter(
            MonthlyUsageSummary.org_id == activity_data.org_id,
            MonthlyUsageSummary.year_month == current_month
        ).first()

        if not monthly_summary:
            monthly_summary = MonthlyUsageSummary(
                org_id=activity_data.org_id,
                year_month=current_month,
                total_deepseek_tokens=0,
                total_openai_tokens=0,
                total_cost=0,
                incoming_messages=0,
                bot_responses=0,
                unique_users=0,
                intent_analyses=0,
                rag_queries=0,
                style_analyses=0
            )
            db.add(monthly_summary)
            db.flush()  # Ensure the record is created before we use it

        # Ensure all fields are not None (handle existing records with NULL values)
        if monthly_summary.incoming_messages is None:
            monthly_summary.incoming_messages = 0
        if monthly_summary.bot_responses is None:
            monthly_summary.bot_responses = 0
        if monthly_summary.unique_users is None:
            monthly_summary.unique_users = 0

        # Update message counts
        if activity_data.message_type == "incoming":
            monthly_summary.incoming_messages += 1
        elif activity_data.message_type == "outgoing":
            monthly_summary.bot_responses += 1

        # Update user activity
        user_activity = db.query(UserActivity).filter(
            UserActivity.org_id == activity_data.org_id,
            UserActivity.user_jid == activity_data.user_jid,
            UserActivity.year_month == current_month
        ).first()

        if not user_activity:
            user_activity = UserActivity(
                org_id=activity_data.org_id,
                user_jid=activity_data.user_jid,
                year_month=current_month,
                first_message_at=datetime.now(),
                message_count=0,
                total_tokens_used=0
            )
            db.add(user_activity)

            # Update unique users count
            monthly_summary.unique_users = db.query(UserActivity).filter(
                UserActivity.org_id == activity_data.org_id,
                UserActivity.year_month == current_month
            ).count()

        if activity_data.message_type == "incoming":
            # Ensure message_count is not None
            if user_activity.message_count is None:
                user_activity.message_count = 0
            user_activity.message_count += 1

        user_activity.last_message_at = datetime.now()

        db.commit()

        return {
            "message": "Message activity tracked successfully",
            "user_jid": activity_data.user_jid,
            "message_type": activity_data.message_type
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing message activity: {str(e)}")
        raise
    finally:
        db.close()


@router.get("/analytics/{org_id}")
def get_usage_analytics(
    org_id: int,
    month: Optional[str] = None,  # Format: YYYY-MM
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Get comprehensive usage analytics for an organization"""
    organization, api_key_obj = validate_analytics_access(org_id, auth_header, db)

    if not month:
        month = datetime.now().strftime("%Y-%m")

    # Get monthly summary
    monthly_summary = db.query(MonthlyUsageSummary).filter(
        MonthlyUsageSummary.org_id == org_id,
        MonthlyUsageSummary.year_month == month
    ).first()

    if not monthly_summary:
        # Return empty analytics if no data
        return {
            "organization_id": org_id,
            "organization_name": organization.name,
            "month": month,
            "total_deepseek_tokens": 0,
            "total_openai_tokens": 0,
            "total_cost": 0.0,
            "incoming_messages": 0,
            "bot_responses": 0,
            "unique_users": 0,
            "intent_analyses": 0,
            "rag_queries": 0,
            "style_analyses": 0,
            "top_users": [],
            "daily_breakdown": []
        }

    # Get top users for the month
    top_users = db.query(UserActivity).filter(
        UserActivity.org_id == org_id,
        UserActivity.year_month == month
    ).order_by(UserActivity.message_count.desc()).limit(10).all()

    # Get daily breakdown
    daily_breakdown = db.query(
        func.date(UsageLog.timestamp).label('date'),
        func.sum(UsageLog.total_tokens).label('total_tokens'),
        func.sum(UsageLog.estimated_cost).label('total_cost'),
        func.count(UsageLog.id).label('request_count')
    ).filter(
        UsageLog.org_id == org_id,
        func.to_char(UsageLog.timestamp, 'YYYY-MM') == month
    ).group_by(func.date(UsageLog.timestamp)).all()

    return {
        "organization_id": org_id,
        "organization_name": organization.name,
        "month": month,
        "total_deepseek_tokens": monthly_summary.total_deepseek_tokens,
        "total_openai_tokens": monthly_summary.total_openai_tokens,
        "total_cost": float(monthly_summary.total_cost),
        "incoming_messages": monthly_summary.incoming_messages,
        "bot_responses": monthly_summary.bot_responses,
        "unique_users": monthly_summary.unique_users,
        "intent_analyses": monthly_summary.intent_analyses,
        "rag_queries": monthly_summary.rag_queries,
        "style_analyses": monthly_summary.style_analyses,
        "top_users": [
            {
                "user_jid": user.user_jid,
                "message_count": user.message_count,
                "total_tokens_used": user.total_tokens_used,
                "first_message_at": user.first_message_at.isoformat() if user.first_message_at else None,
                "last_message_at": user.last_message_at.isoformat() if user.last_message_at else None
            }
            for user in top_users
        ],
        "daily_breakdown": [
            {
                "date": str(day.date),
                "total_tokens": int(day.total_tokens or 0),
                "total_cost": float(day.total_cost or 0),
                "request_count": day.request_count
            }
            for day in daily_breakdown
        ]
    }


@router.get("/analytics/summary")
def get_usage_summary(
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Get overall usage summary across all organizations"""
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    current_month = datetime.now().strftime("%Y-%m")

    # Get total usage across all organizations
    total_summary = db.query(
        func.sum(MonthlyUsageSummary.total_deepseek_tokens).label('total_deepseek_tokens'),
        func.sum(MonthlyUsageSummary.total_openai_tokens).label('total_openai_tokens'),
        func.sum(MonthlyUsageSummary.total_cost).label('total_cost'),
        func.sum(MonthlyUsageSummary.incoming_messages).label('total_messages'),
        func.sum(MonthlyUsageSummary.bot_responses).label('total_responses'),
        func.sum(MonthlyUsageSummary.unique_users).label('total_users'),
        func.count(MonthlyUsageSummary.org_id).label('active_orgs')
    ).filter(MonthlyUsageSummary.year_month == current_month).first()

    # Get top organizations by usage
    top_orgs = db.query(
        MonthlyUsageSummary.org_id,
        Organization.name.label('org_name'),
        MonthlyUsageSummary.total_cost,
        MonthlyUsageSummary.incoming_messages,
        MonthlyUsageSummary.bot_responses
    ).join(Organization).filter(
        MonthlyUsageSummary.year_month == current_month
    ).order_by(MonthlyUsageSummary.total_cost.desc()).limit(10).all()

    return {
        "current_month": current_month,
        "total_deepseek_tokens": int(total_summary.total_deepseek_tokens or 0),
        "total_openai_tokens": int(total_summary.total_openai_tokens or 0),
        "total_cost": float(total_summary.total_cost or 0),
        "total_messages": int(total_summary.total_messages or 0),
        "total_responses": int(total_summary.total_responses or 0),
        "total_users": int(total_summary.total_users or 0),
        "active_organizations": int(total_summary.active_orgs or 0),
        "top_organizations": [
            {
                "org_id": org.org_id,
                "org_name": org.org_name,
                "total_cost": float(org.total_cost),
                "incoming_messages": org.incoming_messages,
                "bot_responses": org.bot_responses
            }
            for org in top_orgs
        ]
    }


@router.get("/analytics/trends/{org_id}")
def get_usage_trends(
    org_id: int,
    months: int = 6,  # Number of months to look back
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Get usage trends for an organization over time"""
    organization, api_key_obj = validate_analytics_access(org_id, auth_header, db)

    # Generate list of months to query
    current_date = datetime.now()
    month_list = []
    for i in range(months):
        month_date = current_date - timedelta(days=30 * i)
        month_list.append(month_date.strftime("%Y-%m"))

    # Get monthly data
    monthly_data = db.query(MonthlyUsageSummary).filter(
        MonthlyUsageSummary.org_id == org_id,
        MonthlyUsageSummary.year_month.in_(month_list)
    ).order_by(MonthlyUsageSummary.year_month.desc()).all()

    # Fill in missing months with zeros
    data_dict = {data.year_month: data for data in monthly_data}
    trends = []

    for month in reversed(month_list):  # Reverse to get chronological order
        if month in data_dict:
            data = data_dict[month]
            trends.append({
                "month": month,
                "total_deepseek_tokens": data.total_deepseek_tokens,
                "total_openai_tokens": data.total_openai_tokens,
                "total_cost": float(data.total_cost),
                "incoming_messages": data.incoming_messages,
                "bot_responses": data.bot_responses,
                "unique_users": data.unique_users,
                "intent_analyses": data.intent_analyses,
                "rag_queries": data.rag_queries,
                "style_analyses": data.style_analyses
            })
        else:
            trends.append({
                "month": month,
                "total_deepseek_tokens": 0,
                "total_openai_tokens": 0,
                "total_cost": 0.0,
                "incoming_messages": 0,
                "bot_responses": 0,
                "unique_users": 0,
                "intent_analyses": 0,
                "rag_queries": 0,
                "style_analyses": 0
            })

    return {
        "organization_id": org_id,
        "organization_name": organization.name,
        "trends": trends
    }


@router.get("/analytics/cost-breakdown/{org_id}")
def get_cost_breakdown(
    org_id: int,
    month: Optional[str] = None,  # Format: YYYY-MM
    auth_header: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Get detailed cost breakdown by service type and model"""
    organization, api_key_obj = validate_analytics_access(org_id, auth_header, db)

    if not month:
        month = datetime.now().strftime("%Y-%m")

    # Get cost breakdown by provider and request type
    cost_breakdown = db.query(
        UsageLog.llm_provider,
        UsageLog.llm_model,
        UsageLog.request_type,
        func.sum(UsageLog.total_tokens).label('total_tokens'),
        func.sum(UsageLog.estimated_cost).label('total_cost'),
        func.count(UsageLog.id).label('request_count')
    ).filter(
        UsageLog.org_id == org_id,
        func.to_char(UsageLog.timestamp, 'YYYY-MM') == month
    ).group_by(
        UsageLog.llm_provider,
        UsageLog.llm_model,
        UsageLog.request_type
    ).all()

    # Get hourly usage pattern
    hourly_usage = db.query(
        func.extract('hour', UsageLog.timestamp).label('hour'),
        func.sum(UsageLog.total_tokens).label('total_tokens'),
        func.sum(UsageLog.estimated_cost).label('total_cost'),
        func.count(UsageLog.id).label('request_count')
    ).filter(
        UsageLog.org_id == org_id,
        func.to_char(UsageLog.timestamp, 'YYYY-MM') == month
    ).group_by(func.extract('hour', UsageLog.timestamp)).all()

    # Format the response
    breakdown_by_service = {}
    for item in cost_breakdown:
        service_key = f"{item.llm_provider}_{item.llm_model}"
        if service_key not in breakdown_by_service:
            breakdown_by_service[service_key] = {
                "provider": item.llm_provider,
                "model": item.llm_model,
                "total_tokens": 0,
                "total_cost": 0.0,
                "request_types": {}
            }

        breakdown_by_service[service_key]["total_tokens"] += item.total_tokens
        breakdown_by_service[service_key]["total_cost"] += float(item.total_cost)
        breakdown_by_service[service_key]["request_types"][item.request_type] = {
            "tokens": item.total_tokens,
            "cost": float(item.total_cost),
            "requests": item.request_count
        }

    # Format hourly usage
    hourly_pattern = [{"hour": i, "tokens": 0, "cost": 0.0, "requests": 0} for i in range(24)]
    for item in hourly_usage:
        hour_index = int(item.hour)  # Convert Decimal to int
        if 0 <= hour_index < 24:  # Safety check
            hourly_pattern[hour_index] = {
                "hour": hour_index,
                "tokens": int(item.total_tokens or 0),
                "cost": float(item.total_cost or 0),
                "requests": int(item.request_count or 0)
            }

    return {
        "organization_id": org_id,
        "organization_name": organization.name,
        "month": month,
        "breakdown_by_service": list(breakdown_by_service.values()),
        "hourly_usage_pattern": hourly_pattern,
        "total_cost": sum(service["total_cost"] for service in breakdown_by_service.values()),
        "total_tokens": sum(service["total_tokens"] for service in breakdown_by_service.values())
    }

