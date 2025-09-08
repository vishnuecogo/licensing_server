import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getToken } from '../api';
import ApiKeyManagement from '../components/ApiKeyManagement';
import CustomPlanManagement from '../components/CustomPlanManagement';
import UsageAnalyticsDashboard from '../components/UsageAnalyticsDashboard';

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadOrganization();
  }, [id]);

  const loadOrganization = async () => {
    try {
      // Use the working /admin/orgs endpoint and filter by ID
      const response = await fetch(`/api/admin/orgs?page_size=100`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        const org = data.items.find(item => item.id === parseInt(id));
        if (org) {
          setOrganization(org);
        } else {
          showMessage('error', 'Organization not found');
          navigate('/admin');
        }
      } else {
        showMessage('error', 'Failed to load organization details');
        navigate('/admin');
      }
    } catch (error) {
      showMessage('error', 'Failed to load organization details');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleOrganizationUpdate = (updatedOrg) => {
    setOrganization(updatedOrg);
    showMessage('success', 'Organization updated successfully');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'apikeys', label: 'API Keys', icon: 'key' },
    { id: 'plans', label: 'Plans', icon: 'workspace_premium' },
    { id: 'analytics', label: 'Usage Analytics', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eva-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organization details...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Organization not found</p>
          <Link to="/admin" className="mt-4 text-eva-600 hover:text-eva-700">
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/admin" 
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-eva-100 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-eva-600 text-xl">business</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                  <p className="text-gray-500">{organization.contact_email}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(organization.status)}`}>
                {organization.status}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPlanColor(organization.plan_tier)}`}>
                {organization.plan_tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-eva-500 text-eva-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <OrganizationOverview 
            organization={organization} 
            onUpdate={handleOrganizationUpdate}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'apikeys' && (
          <ApiKeyManagement 
            organizationId={organization.id}
            organizationName={organization.name}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'plans' && (
          <CustomPlanManagement
            organization={organization}
            onUpdate={handleOrganizationUpdate}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'analytics' && (
          <UsageAnalyticsDashboard
            organizationId={organization.id}
            organizationName={organization.name}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'settings' && (
          <OrganizationSettings
            organization={organization}
            onUpdate={handleOrganizationUpdate}
            showMessage={showMessage}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OrganizationOverview = ({ organization, onUpdate, showMessage }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Email</label>
            <p className="mt-1 text-sm text-gray-900">{organization.contact_email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Login Email</label>
            <p className="mt-1 text-sm text-gray-900">{organization.login_email || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(organization.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const OrganizationSettings = ({ organization, onUpdate, showMessage }) => {
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  return (
    <div className="space-y-6">
      {/* Login Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Login Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
            <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
              {organization.login_email || 'Not configured'}
            </p>
          </div>

          {organization.login_email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password Management</label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="inline-flex items-center px-4 py-2 bg-ecogo-600 text-white text-sm font-medium rounded-lg hover:bg-ecogo-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg mr-2">key</span>
                  Reset Password
                </button>
                <p className="text-sm text-gray-500">
                  Generate a new password or set a custom one
                </p>
              </div>
            </div>
          )}

          {!organization.login_email && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-yellow-600 mr-2">warning</span>
                <p className="text-sm text-yellow-800">
                  No login email configured. Organization cannot access the dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              organization.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {organization.status}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
            <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-eva-100 text-eva-800 capitalize">
              {organization.plan_tier}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Reset Allowed</label>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              organization.can_reset_password
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {organization.can_reset_password ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <PasswordResetModal
          organization={organization}
          onClose={() => setShowPasswordReset(false)}
          onSuccess={() => {
            setShowPasswordReset(false);
            onUpdate?.();
          }}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};



// Password Reset Modal Component
const PasswordResetModal = ({ organization, onClose, onSuccess, showMessage }) => {
  const [formData, setFormData] = useState({
    generate_password: true,
    custom_password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', `Password reset successfully! ${result.new_password !== 'Custom password set' ? `New password: ${result.new_password}` : 'Custom password has been set.'}`);
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to reset password');
      }
    } catch (error) {
      showMessage('error', 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Reset login password for <strong>{organization.name}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Login Email: {organization.login_email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.generate_password}
                  onChange={(e) => setFormData({...formData, generate_password: e.target.checked})}
                  className="rounded border-gray-300 text-eva-600 focus:ring-eva-500"
                />
                <span className="text-sm text-gray-700">Generate secure password</span>
              </label>
            </div>

            {!formData.generate_password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={formData.custom_password}
                  onChange={(e) => setFormData({...formData, custom_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                  minLength="6"
                  required={!formData.generate_password}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-ecogo-500 text-white rounded-lg hover:bg-ecogo-600 disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailPage;
