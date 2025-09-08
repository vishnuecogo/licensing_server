from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

from app.db.database import SessionLocal
from app.db.models import Organization, ApiKey, UsageLog, MonthlyUsageSummary, UserActivity
from app.db.admin_models import AdminUser
from app.routes.admin import get_admin

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/admin/analytics/overview")
def get_admin_overview(
    admin: AdminUser = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard overview analytics"""
    
    # Get current date for recent calculations
    current_date = datetime.now()
    last_month = current_date - timedelta(days=30)
    
    # Total organizations
    total_orgs = db.query(Organization).count()
    recent_orgs = db.query(Organization).filter(
        Organization.created_at >= last_month
    ).count()
    
    # Active API keys
    active_keys = db.query(ApiKey).filter(ApiKey.active == True).count()
    recent_keys = db.query(ApiKey).filter(
        ApiKey.created_at >= last_month,
        ApiKey.active == True
    ).count()
    
    # Total requests (from usage logs)
    total_requests = db.query(UsageLog).count()
    recent_requests = db.query(UsageLog).filter(
        UsageLog.timestamp >= last_month
    ).count()
    
    # Total revenue (from monthly summaries)
    total_revenue = db.query(func.sum(MonthlyUsageSummary.total_cost)).scalar() or 0
    recent_revenue = db.query(func.sum(MonthlyUsageSummary.total_cost)).filter(
        MonthlyUsageSummary.year_month == current_date.strftime('%Y-%m')
    ).scalar() or 0
    
    # Plan distribution
    plan_distribution = db.query(
        Organization.plan_tier,
        func.count(Organization.id).label('count')
    ).group_by(Organization.plan_tier).all()

    # Status distribution
    status_distribution = db.query(
        Organization.status,
        func.count(Organization.id).label('count')
    ).group_by(Organization.status).all()
    
    return {
        "totals": {
            "organizations": total_orgs,
            "recent_organizations": recent_orgs,
            "active_api_keys": active_keys,
            "recent_api_keys": recent_keys,
            "total_requests": total_requests,
            "recent_requests": recent_requests,
            "total_revenue": float(total_revenue),
            "recent_revenue": float(recent_revenue)
        },
        "plan_distribution": [
            {"plan": item.plan_tier, "count": item.count}
            for item in plan_distribution
        ],
        "status_distribution": [
            {"status": item.status, "count": item.count}
            for item in status_distribution
        ]
    }


@router.get("/admin/analytics/growth")
def get_admin_growth(
    months: int = 12,
    admin: AdminUser = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get growth analytics over time"""
    
    # Generate list of months
    current_date = datetime.now()
    monthly_data = []
    
    for i in range(months):
        month_date = current_date - timedelta(days=30 * i)
        year_month = month_date.strftime('%Y-%m')
        
        # Count organizations created in this month
        orgs_count = db.query(Organization).filter(
            func.to_char(Organization.created_at, 'YYYY-MM') == year_month
        ).count()
        
        # Count API keys created in this month
        keys_count = db.query(ApiKey).filter(
            func.to_char(ApiKey.created_at, 'YYYY-MM') == year_month
        ).count()
        
        monthly_data.append({
            "month": year_month,
            "organizations": orgs_count,
            "api_keys": keys_count
        })
    
    # Reverse to show oldest first
    monthly_data.reverse()
    
    return {
        "monthly_growth": monthly_data
    }


@router.get("/admin/analytics/top-organizations")
def get_top_organizations(
    limit: int = 10,
    admin: AdminUser = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get top organizations by usage"""
    
    # Get organizations with their usage data
    top_orgs = db.query(
        Organization.id,
        Organization.name,
        Organization.plan_tier,
        Organization.status,
        func.sum(MonthlyUsageSummary.total_cost).label('total_cost'),
        func.sum(MonthlyUsageSummary.total_deepseek_tokens + MonthlyUsageSummary.total_openai_tokens).label('total_tokens'),
        func.sum(MonthlyUsageSummary.incoming_messages).label('total_messages')
    ).join(
        MonthlyUsageSummary, Organization.id == MonthlyUsageSummary.org_id, isouter=True
    ).group_by(
        Organization.id, Organization.name, Organization.plan_tier, Organization.status
    ).order_by(
        desc('total_cost')
    ).limit(limit).all()
    
    return {
        "organizations": [
            {
                "id": org.id,
                "name": org.name,
                "plan": org.plan_tier,
                "status": org.status,
                "total_cost": float(org.total_cost or 0),
                "total_tokens": int(org.total_tokens or 0),
                "total_messages": int(org.total_messages or 0)
            }
            for org in top_orgs
        ]
    }


@router.get("/admin/analytics/revenue")
def get_revenue_analytics(
    months: int = 12,
    admin: AdminUser = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get revenue analytics over time"""
    
    # Generate monthly revenue data
    current_date = datetime.now()
    monthly_revenue = []
    
    for i in range(months):
        month_date = current_date - timedelta(days=30 * i)
        year_month = month_date.strftime('%Y-%m')
        
        # Get revenue for this month
        month_revenue = db.query(func.sum(MonthlyUsageSummary.total_cost)).filter(
            MonthlyUsageSummary.year_month == year_month
        ).scalar() or 0
        
        monthly_revenue.append({
            "month": year_month,
            "revenue": float(month_revenue)
        })
    
    # Reverse to show oldest first
    monthly_revenue.reverse()
    
    # Calculate total revenue
    total_revenue = sum(item["revenue"] for item in monthly_revenue)
    
    return {
        "monthly_revenue": monthly_revenue,
        "total_revenue": total_revenue
    }


@router.get("/admin/analytics/recent-activity")
def get_recent_activity(
    limit: int = 20,
    admin: AdminUser = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get recent system activity"""
    
    activities = []
    
    # Recent organizations
    recent_orgs = db.query(Organization).order_by(
        desc(Organization.created_at)
    ).limit(5).all()
    
    for org in recent_orgs:
        activities.append({
            "type": "organization_created",
            "description": f"New organization '{org.name}' created",
            "timestamp": org.created_at.isoformat(),
            "organization_id": org.id
        })
    
    # Recent API keys
    recent_keys = db.query(ApiKey).join(Organization).order_by(
        desc(ApiKey.created_at)
    ).limit(5).all()
    
    for key in recent_keys:
        activities.append({
            "type": "api_key_created",
            "description": f"New API key created for '{key.organization.name}'",
            "timestamp": key.created_at.isoformat(),
            "organization_id": key.org_id
        })
    
    # Recent high usage
    recent_usage = db.query(
        UsageLog.org_id,
        Organization.name,
        func.sum(UsageLog.total_tokens).label('tokens'),
        func.max(UsageLog.timestamp).label('last_activity')
    ).join(Organization).filter(
        UsageLog.timestamp >= datetime.now() - timedelta(days=1)
    ).group_by(
        UsageLog.org_id, Organization.name
    ).having(
        func.sum(UsageLog.total_tokens) > 1000
    ).order_by(desc('tokens')).limit(5).all()
    
    for usage in recent_usage:
        activities.append({
            "type": "high_usage",
            "description": f"High usage detected: {usage.name} used {usage.tokens} tokens",
            "timestamp": usage.last_activity.isoformat(),
            "organization_id": usage.org_id
        })
    
    # Sort all activities by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "activities": activities[:limit]
    }
