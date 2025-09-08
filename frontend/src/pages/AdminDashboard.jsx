import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminAPI, setToken, getToken, getClaims } from '../api';
import OrganizationManagement from '../components/OrganizationManagement';
import PlanManagement from '../components/PlanManagement';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: null,
    growth: null,
    topOrgs: null,
    revenue: null,
    recentActivity: null
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    console.log('🔍 AdminDashboard: Initializing...');
    const token = getToken();
    const claims = getClaims();

    console.log('🔍 AdminDashboard: Token exists:', !!token);
    console.log('🔍 AdminDashboard: Claims:', claims);

    if (!token || !claims) {
      console.log('❌ AdminDashboard: No token or claims, redirecting to login');
      window.location.href = '/login';
      return;
    }

    // Check if user is admin, if not redirect to organization dashboard
    if (claims.role !== 'admin') {
      console.log('❌ AdminDashboard: User is not admin, redirecting to organization dashboard');
      window.location.href = '/organization';
      return;
    }

    console.log('✅ AdminDashboard: User is admin, loading analytics...');
    setUser(claims);
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      console.log('🔍 AdminDashboard: Loading analytics...');
      setLoading(true);

      // Helper function to safely fetch data
      const safeFetch = async (url) => {
        try {
          console.log(`🔍 AdminDashboard: Fetching ${url}...`);
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ AdminDashboard: ${url} success:`, data);
            return data;
          } else {
            console.warn(`⚠️ AdminDashboard: ${url} failed:`, response.status, response.statusText);
            return null;
          }
        } catch (error) {
          console.warn(`❌ AdminDashboard: Failed to fetch ${url}:`, error);
          return null;
        }
      };

      // Load all analytics data with error handling
      const [overview, growth, topOrgs, revenue, recentActivity] = await Promise.all([
        safeFetch('/api/admin/analytics/overview'),
        safeFetch('/api/admin/analytics/growth'),
        safeFetch('/api/admin/analytics/top-organizations'),
        safeFetch('/api/admin/analytics/revenue'),
        safeFetch('/api/admin/analytics/recent-activity')
      ]);

      // Set analytics with fallback data
      const analyticsData = {
        overview: overview || {
          totals: {
            organizations: 0,
            recent_organizations: 0,
            active_api_keys: 0,
            recent_api_keys: 0,
            total_requests: 0,
            recent_requests: 0,
            total_revenue: 0,
            recent_revenue: 0
          },
          plan_distribution: [],
          status_distribution: []
        },
        growth: growth || { monthly_growth: [] },
        topOrgs: topOrgs || { organizations: [] },
        revenue: revenue || { monthly_revenue: [] },
        recentActivity: recentActivity || { activities: [] }
      };

      console.log('✅ AdminDashboard: Setting analytics data:', analyticsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set fallback data on error
      setAnalytics({
        overview: {
          totals: {
            organizations: 0,
            recent_organizations: 0,
            active_api_keys: 0,
            recent_api_keys: 0,
            total_requests: 0,
            recent_requests: 0,
            total_revenue: 0,
            recent_revenue: 0
          },
          plan_distribution: [],
          status_distribution: []
        },
        growth: { monthly_growth: [] },
        topOrgs: { organizations: [] },
        revenue: { monthly_revenue: [] },
        recentActivity: { activities: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-eva-50 to-eva-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-eva-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-eva-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-eva-50 to-eva-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-eva-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-eva-500 to-eva-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EVA Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Licensing Server Management</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.sub}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role} Access</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-eva-500 hover:bg-eva-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-eva-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'organizations', label: 'Organizations', icon: 'business' },
              { id: 'plans', label: 'Plans', icon: 'layers' },
              { id: 'analytics', label: 'Analytics', icon: 'analytics' },
              { id: 'revenue', label: 'Revenue', icon: 'payments' },
              { id: 'activity', label: 'Activity', icon: 'history' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-eva-500 text-eva-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'organizations' && <OrganizationManagement analytics={analytics} onRefresh={loadAnalytics} />}
        {activeTab === 'plans' && <PlanManagement onRefresh={loadAnalytics} />}
        {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
        {activeTab === 'revenue' && <RevenueTab analytics={analytics} />}
        {activeTab === 'activity' && <ActivityTab analytics={analytics} />}
      </main>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics }) => {
  const { overview } = analytics || {};

  if (!overview || !overview.totals) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eva-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading overview...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Organizations',
      value: overview.totals.organizations,
      change: `+${overview.totals.recent_organizations} this month`,
      icon: 'business',
      color: 'eva'
    },
    {
      title: 'Active API Keys',
      value: overview.totals.active_api_keys,
      change: `+${overview.totals.recent_api_keys} this month`,
      icon: 'key',
      color: 'ecogo'
    },
    {
      title: 'Total Requests',
      value: overview.totals.total_requests,
      change: `+${overview.totals.recent_requests} this month`,
      icon: 'api',
      color: 'purple'
    },
    {
      title: 'Total Revenue',
      value: `$${overview.totals.total_revenue.toFixed(2)}`,
      change: `$${overview.totals.recent_revenue.toFixed(2)} this month`,
      icon: 'attach_money',
      color: 'green'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-${stat.color}-600 text-xl`}>{stat.icon}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.change}</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{stat.title}</h3>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="material-symbols-outlined text-eva-600 mr-2">pie_chart</span>
            Plan Distribution
          </h3>
          <div className="space-y-4">
            {overview.plan_distribution && overview.plan_distribution.length > 0 ? (
              overview.plan_distribution.map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full bg-${index === 0 ? 'eva' : index === 1 ? 'ecogo' : 'purple'}-500`}></div>
                    <span className="font-medium text-gray-900 capitalize">{plan.plan}</span>
                  </div>
                  <span className="text-gray-600">{plan.count} orgs</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">pie_chart</span>
                <p>No plan distribution data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="material-symbols-outlined text-eva-600 mr-2">donut_small</span>
            Status Distribution
          </h3>
          <div className="space-y-4">
            {overview.status_distribution && overview.status_distribution.length > 0 ? (
              overview.status_distribution.map((status, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${status.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium text-gray-900 capitalize">{status.status}</span>
                  </div>
                  <span className="text-gray-600">{status.count} orgs</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">donut_small</span>
                <p>No status distribution data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



// Analytics Tab Component
const AnalyticsTab = ({ analytics }) => {
  const { growth } = analytics || {};

  if (!growth || !growth.monthly_growth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eva-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Growth Analytics</h2>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">12-Month Growth Trend</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {growth.monthly_growth && growth.monthly_growth.length > 0 ? growth.monthly_growth.map((month, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '200px' }}>
                <div
                  className="bg-eva-500 rounded-t-lg absolute bottom-0 w-full transition-all duration-500"
                  style={{ height: `${growth.monthly_growth.length > 0 ? (month.organizations / Math.max(...growth.monthly_growth.map(m => m.organizations || 0))) * 100 : 0}%` }}
                ></div>
                <div
                  className="bg-ecogo-500 rounded-t-lg absolute bottom-0 w-1/2 transition-all duration-500"
                  style={{ height: `${growth.monthly_growth.length > 0 ? (month.api_keys / Math.max(...growth.monthly_growth.map(m => m.api_keys || 0))) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 mt-2 text-center">
                <div>{month.month}</div>
                <div className="text-eva-600">{month.organizations || 0} orgs</div>
                <div className="text-ecogo-600">{month.api_keys || 0} keys</div>
              </div>
            </div>
          )) : (
            <div className="flex-1 text-center py-8 text-gray-500">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">trending_up</span>
              <p>No growth data available</p>
            </div>
          )}
        </div>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-eva-500 rounded"></div>
            <span className="text-sm text-gray-600">Organizations</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-ecogo-500 rounded"></div>
            <span className="text-sm text-gray-600">API Keys</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Revenue Tab Component
const RevenueTab = ({ analytics }) => {
  const { revenue } = analytics || {};

  if (!revenue || !revenue.monthly_revenue) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eva-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading revenue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue by Plan</h3>
          <div className="space-y-4">
            {revenue.monthly_revenue && revenue.monthly_revenue.length > 0 ? revenue.monthly_revenue.map((plan, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    plan.plan_name === 'enterprise' ? 'bg-purple-100' :
                    plan.plan_name === 'pro' ? 'bg-ecogo-100' : 'bg-gray-100'
                  }`}>
                    <span className={`material-symbols-outlined ${
                      plan.plan_name === 'enterprise' ? 'text-purple-600' :
                      plan.plan_name === 'pro' ? 'text-ecogo-600' : 'text-gray-600'
                    }`}>
                      {plan.plan_name === 'enterprise' ? 'diamond' : plan.plan_name === 'pro' ? 'star' : 'circle'}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 capitalize">{plan.plan_name}</div>
                    <div className="text-sm text-gray-500">{plan.subscription_count} subscriptions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${(plan.total_revenue || 0).toFixed(2)}</div>
                  <div className="text-sm text-gray-500">${plan.price || 0}/month</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">attach_money</span>
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Total Revenue</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-eva-600 mb-2">${(revenue.total_revenue || 0).toFixed(2)}</div>
            <div className="text-gray-500">Monthly Recurring Revenue</div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per subscription</span>
              <span className="font-semibold">
                ${(revenue.total_revenue / revenue.revenue_by_plan.reduce((sum, plan) => sum + plan.subscription_count, 0)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total subscriptions</span>
              <span className="font-semibold">
                {revenue.revenue_by_plan.reduce((sum, plan) => sum + plan.subscription_count, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Activity Tab Component
const ActivityTab = ({ analytics }) => {
  const { recentActivity } = analytics || {};

  if (!recentActivity || !recentActivity.activities) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eva-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'organization_created': return 'business';
      case 'api_key_created': return 'key';
      case 'high_usage': return 'trending_up';
      case 'user_activity': return 'person';
      case 'system_alert': return 'warning';
      default: return 'notifications';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'organization_created': return 'eva';
      case 'api_key_created': return 'ecogo';
      case 'high_usage': return 'orange';
      case 'user_activity': return 'blue';
      case 'system_alert': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">System Activity Feed</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.activities && recentActivity.activities.length > 0 ? recentActivity.activities.map((activity, index) => (
            <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 bg-${getActivityColor(activity.type)}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-outlined text-${getActivityColor(activity.type)}-600`}>
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-4">notifications_none</span>
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
