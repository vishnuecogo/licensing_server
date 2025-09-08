from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import calendar

from app.db.database import SessionLocal
from app.db.models import Organization, Plan, Subscription, ApiKey
from app.routes.admin import get_admin

router = APIRouter(prefix="/admin/analytics", tags=["Analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/overview")
def get_overview_analytics(db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get overall system analytics overview"""
    
    # Total counts
    total_organizations = db.query(Organization).count()
    active_organizations = db.query(Organization).filter(Organization.status == "active").count()
    total_api_keys = db.query(ApiKey).count()
    active_api_keys = db.query(ApiKey).filter(ApiKey.active == True).count()
    total_subscriptions = db.query(Subscription).count()
    active_subscriptions = db.query(Subscription).filter(Subscription.status == "active").count()
    
    # Plan distribution
    plan_distribution = db.query(
        Organization.plan_tier,
        func.count(Organization.id).label('count')
    ).group_by(Organization.plan_tier).all()
    
    # Recent organizations (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_orgs = db.query(Organization).filter(
        Organization.created_at >= thirty_days_ago
    ).count()
    
    # Organization status distribution
    status_distribution = db.query(
        Organization.status,
        func.count(Organization.id).label('count')
    ).group_by(Organization.status).all()
    
    return {
        "totals": {
            "organizations": total_organizations,
            "active_organizations": active_organizations,
            "api_keys": total_api_keys,
            "active_api_keys": active_api_keys,
            "subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "recent_organizations": recent_orgs
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

@router.get("/growth")
def get_growth_analytics(db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get growth analytics for the last 12 months"""
    
    # Get monthly organization growth for last 12 months
    twelve_months_ago = datetime.now() - timedelta(days=365)
    
    # Monthly organization registrations
    monthly_orgs = db.execute(text("""
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
        FROM organizations 
        WHERE created_at >= :start_date
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
    """), {"start_date": twelve_months_ago}).fetchall()
    
    # Monthly API key creation
    monthly_keys = db.execute(text("""
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
        FROM api_keys 
        WHERE created_at >= :start_date
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
    """), {"start_date": twelve_months_ago}).fetchall()
    
    # Format the data
    growth_data = []
    for i in range(12):
        month_date = datetime.now().replace(day=1) - timedelta(days=30*i)
        month_str = month_date.strftime("%Y-%m")
        
        org_count = next((item.count for item in monthly_orgs if item.month.strftime("%Y-%m") == month_str), 0)
        key_count = next((item.count for item in monthly_keys if item.month.strftime("%Y-%m") == month_str), 0)
        
        growth_data.append({
            "month": month_date.strftime("%b %Y"),
            "organizations": org_count,
            "api_keys": key_count
        })
    
    return {"growth_data": list(reversed(growth_data))}

@router.get("/top-organizations")
def get_top_organizations(limit: int = 10, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get top organizations by API key count"""
    
    top_orgs = db.execute(text("""
        SELECT 
            o.id,
            o.name,
            o.plan_tier,
            o.status,
            o.created_at,
            COUNT(ak.id) as api_key_count
        FROM organizations o
        LEFT JOIN api_keys ak ON o.id = ak.org_id
        GROUP BY o.id, o.name, o.plan_tier, o.status, o.created_at
        ORDER BY api_key_count DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()
    
    return {
        "top_organizations": [
            {
                "id": org.id,
                "name": org.name,
                "plan_tier": org.plan_tier,
                "status": org.status,
                "created_at": org.created_at.isoformat() if org.created_at else None,
                "api_key_count": org.api_key_count
            }
            for org in top_orgs
        ]
    }

@router.get("/revenue")
def get_revenue_analytics(db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get revenue analytics based on plans"""
    
    # Revenue by plan
    revenue_by_plan = db.execute(text("""
        SELECT 
            p.name as plan_name,
            p.price,
            COUNT(s.id) as subscription_count,
            (p.price * COUNT(s.id)) as total_revenue
        FROM plans p
        LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status = 'active'
        GROUP BY p.id, p.name, p.price
        ORDER BY total_revenue DESC
    """)).fetchall()
    
    # Total revenue
    total_revenue = sum(item.total_revenue for item in revenue_by_plan)
    
    return {
        "total_revenue": float(total_revenue),
        "revenue_by_plan": [
            {
                "plan_name": item.plan_name,
                "price": float(item.price),
                "subscription_count": item.subscription_count,
                "total_revenue": float(item.total_revenue)
            }
            for item in revenue_by_plan
        ]
    }

@router.get("/recent-activity")
def get_recent_activity(limit: int = 20, db: Session = Depends(get_db), admin = Depends(get_admin)):
    """Get recent system activity"""
    
    # Recent organizations
    recent_orgs = db.query(Organization).order_by(Organization.created_at.desc()).limit(limit//2).all()
    
    # Recent API keys
    recent_keys = db.query(ApiKey).join(Organization).order_by(ApiKey.created_at.desc()).limit(limit//2).all()
    
    activities = []
    
    # Add organization activities
    for org in recent_orgs:
        activities.append({
            "type": "organization_created",
            "title": f"New Organization: {org.name}",
            "description": f"Plan: {org.plan_tier}",
            "timestamp": org.created_at.isoformat() if org.created_at else None,
            "icon": "business"
        })
    
    # Add API key activities
    for key in recent_keys:
        activities.append({
            "type": "api_key_created",
            "title": f"New API Key for {key.organization.name}",
            "description": f"Status: {'Active' if key.active else 'Inactive'}",
            "timestamp": key.created_at.isoformat() if key.created_at else None,
            "icon": "key"
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return {"recent_activity": activities[:limit]}
