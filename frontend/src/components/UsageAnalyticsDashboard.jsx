import React, { useState, useEffect } from 'react';
import { getToken } from '../api';

const UsageAnalyticsDashboard = ({ organizationId, organizationName, showMessage }) => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [timeRange, setTimeRange] = useState('6'); // months

  useEffect(() => {
    loadAnalytics();
  }, [organizationId, selectedMonth, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, trendsRes, costRes] = await Promise.all([
        fetch(`/api/usage/analytics/${organizationId}?month=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }),
        fetch(`/api/usage/analytics/trends/${organizationId}?months=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }),
        fetch(`/api/usage/analytics/cost-breakdown/${organizationId}?month=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      } else if (analyticsRes.status === 404) {
        // No data available yet
        setAnalytics({
          total_deepseek_tokens: 0,
          total_openai_tokens: 0,
          total_cost: 0,
          incoming_messages: 0,
          bot_responses: 0,
          unique_users: 0,
          intent_analyses: 0,
          rag_queries: 0,
          style_analyses: 0,
          top_users: [],
          daily_breakdown: []
        });
      }

      if (trendsRes.ok) {
        setTrends(await trendsRes.json());
      }

      if (costRes.ok) {
        setCostBreakdown(await costRes.json());
      }
    } catch (error) {
      console.error('Analytics loading error:', error);
      showMessage('error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eva-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Usage Analytics - {organizationName}
            </h3>
            <p className="text-sm text-gray-600">
              LLM token usage, costs, and activity metrics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eva-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Trends:</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eva-500"
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Tokens"
              value={formatNumber(analytics.total_deepseek_tokens + analytics.total_openai_tokens)}
              icon="token"
              color="blue"
              subtitle={`${formatNumber(analytics.total_deepseek_tokens)} DeepSeek + ${formatNumber(analytics.total_openai_tokens)} OpenAI`}
            />
            <MetricCard
              title="Total Cost"
              value={formatCurrency(analytics.total_cost)}
              icon="attach_money"
              color="green"
              subtitle={`${selectedMonth}`}
            />
            <MetricCard
              title="Messages"
              value={formatNumber(analytics.incoming_messages)}
              icon="chat"
              color="purple"
              subtitle={`${formatNumber(analytics.bot_responses)} responses`}
            />
            <MetricCard
              title="Active Users"
              value={formatNumber(analytics.unique_users)}
              icon="people"
              color="orange"
              subtitle={`${selectedMonth}`}
            />
          </div>

          {/* Feature Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-6">Feature Usage Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                title="Intent Analysis"
                value={analytics.intent_analyses}
                icon="psychology"
                description="AI-powered intent detection"
              />
              <FeatureCard
                title="RAG Queries"
                value={analytics.rag_queries}
                icon="search"
                description="Document search & retrieval"
              />
              <FeatureCard
                title="Style Analysis"
                value={analytics.style_analyses}
                icon="edit"
                description="Writing style learning"
              />
            </div>
          </div>
        </>
      )}

      {/* Cost Breakdown */}
      {costBreakdown && costBreakdown.breakdown_by_service && costBreakdown.breakdown_by_service.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-6">Cost Breakdown by Service</h4>
          <div className="space-y-4">
            {costBreakdown.breakdown_by_service.map((service, index) => (
              <ServiceBreakdownCard key={index} service={service} />
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Cost:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(costBreakdown.total_cost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Users Table */}
      {analytics && analytics.top_users && analytics.top_users.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-6">Top Users</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.top_users.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.user_jid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(user.message_count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(user.total_tokens_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_message_at ? new Date(user.last_message_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data State */}
      {analytics && analytics.total_deepseek_tokens === 0 && analytics.total_openai_tokens === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">analytics</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Usage Data Available</h3>
          <p className="text-gray-600 mb-4">
            No LLM usage has been recorded for {organizationName} in {selectedMonth}.
          </p>
          <p className="text-sm text-gray-500">
            Usage data will appear here once the WhatsApp API starts processing messages with usage tracking enabled.
          </p>
        </div>
      )}
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, icon, color, subtitle }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-${color}-600`}>{icon}</span>
      </div>
      <div className="ml-4 flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const FeatureCard = ({ title, value, icon, description }) => {
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="text-center p-4 border border-gray-200 rounded-lg">
      <div className="w-12 h-12 bg-eva-100 rounded-lg flex items-center justify-center mx-auto mb-3">
        <span className="material-symbols-outlined text-eva-600">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(value)}</div>
      <div className="text-sm font-medium text-gray-900 mb-1">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
};

const ServiceBreakdownCard = ({ service }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">
            {service.provider.toUpperCase()} - {service.model}
          </span>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatCurrency(service.total_cost)}</div>
          <div className="text-sm text-gray-600">{formatNumber(service.total_tokens)} tokens</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {Object.entries(service.request_types).map(([type, data]) => (
          <div key={type} className="text-center p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-900">{formatNumber(data.tokens)}</div>
            <div className="text-gray-600 capitalize">{type.replace('_', ' ')}</div>
            <div className="text-xs text-gray-500">{formatCurrency(data.cost)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsageAnalyticsDashboard;
