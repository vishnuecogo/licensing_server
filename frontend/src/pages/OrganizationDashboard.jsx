import React, { useState, useEffect } from 'react';
import { getToken, getClaims } from '../api';
import ApiKeyManagement from '../components/ApiKeyManagement';
import CustomPlanManagement from '../components/CustomPlanManagement';

const OrganizationDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = getToken();
    const claims = getClaims();

    if (!token || !claims) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    // Check if user is organization, if not redirect to admin dashboard
    if (claims.role !== 'organization') {
      window.location.href = '/admin';
      return;
    }

    setUser(claims);
    loadOrganizationProfile();
  }, []);

  const loadOrganizationProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organization/profile', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
      } else {
        showMessage('error', 'Failed to load organization profile');
      }
    } catch (error) {
      console.error('Failed to load organization profile:', error);
      showMessage('error', 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('adm_token');
    window.location.href = '/';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'apikeys', label: 'API Keys', icon: 'key' },
    { id: 'plans', label: 'Custom Plans', icon: 'workspace_premium' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  if (loading || !organization) {
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
                <span className="material-symbols-outlined text-white text-2xl">business</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
                <p className="text-sm text-gray-600">{organization?.name || 'Organization Portal'}</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{organization?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{organization?.plan_tier} Plan</p>
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

      {/* Message Display */}
      {message.text && (
        <div className={`max-w-7xl mx-auto px-4 py-2`}>
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <OrganizationOverview
            organization={organization}
            onUpdate={loadOrganizationProfile}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'apikeys' && (
          <OrganizationApiKeys
            organization={organization}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'plans' && (
          <OrganizationCustomPlans
            organization={organization}
            showMessage={showMessage}
          />
        )}
        {activeTab === 'settings' && (
          <OrganizationSettings
            organization={organization}
            onUpdate={loadOrganizationProfile}
            showMessage={showMessage}
          />
        )}

      </main>
    </div>
  );
};

// Overview Tab Component
const OrganizationOverview = ({ organization, onUpdate, showMessage }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/organization/subscription', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to {organization?.name}
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Manage your API usage, view analytics, and control your licensing settings
          </p>
          <div className="flex justify-center space-x-4">
            <div className="bg-eva-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-eva-600 capitalize">{organization?.plan_tier}</div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
            <div className="bg-ecogo-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-ecogo-600 capitalize">{organization?.status}</div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{organization?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Email</label>
            <p className="mt-1 text-sm text-gray-900">{organization?.contact_email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Login Email</label>
            <p className="mt-1 text-sm text-gray-900">{organization?.login_email || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(organization?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      {subscription && subscription.plan_name && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subscription</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan</label>
              <p className="mt-1 text-sm text-gray-900">{subscription.plan_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Quota</label>
              <p className="mt-1 text-sm text-gray-900">
                {subscription.monthly_quota ? subscription.monthly_quota.toLocaleString() : 'Unlimited'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <p className="mt-1 text-sm text-gray-900">${subscription.price}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{subscription.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// API Keys Tab Component
const OrganizationApiKeys = ({ organization, showMessage }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/organization/api-keys', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.items || []);
      } else {
        showMessage('error', 'Failed to load API keys');
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      showMessage('error', 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newApiKey.trim()) {
      showMessage('error', 'Please enter an API key');
      return;
    }

    try {
      const response = await fetch('/api/organization/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          plaintext_key: newApiKey,
          active: true
        })
      });

      if (response.ok) {
        showMessage('success', 'API key created successfully');
        setNewApiKey('');
        setShowCreateForm(false);
        loadApiKeys();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      showMessage('error', 'Failed to create API key');
    }
  };

  const toggleApiKey = async (keyId, active) => {
    try {
      const response = await fetch(`/api/organization/api-keys/${keyId}?active=${!active}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        showMessage('success', `API key ${!active ? 'activated' : 'deactivated'} successfully`);
        loadApiKeys();
      } else {
        showMessage('error', 'Failed to update API key');
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
      showMessage('error', 'Failed to update API key');
    }
  };

  const deleteApiKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/organization/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        showMessage('success', 'API key deleted successfully');
        loadApiKeys();
      } else {
        showMessage('error', 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      showMessage('error', 'Failed to delete API key');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-eva-500 hover:bg-eva-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showCreateForm ? 'Cancel' : 'Add API Key'}
          </button>
        </div>

        {showCreateForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter your API key (e.g., evakey_your_key_123)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={createApiKey}
                  className="bg-eva-500 hover:bg-eva-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Create API Key
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-eva-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-gray-400 text-4xl mb-4">key_off</span>
              <p className="text-gray-500">No API keys found</p>
              <p className="text-sm text-gray-400 mt-2">Create your first API key to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="material-symbols-outlined text-gray-400">key</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{key.key_hash}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      key.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {key.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleApiKey(key.id, key.active)}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        key.active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {key.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteApiKey(key.id)}
                      className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom Plans Tab Component
const OrganizationCustomPlans = ({ organization, showMessage }) => {
  const [customPlans, setCustomPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomPlans();
  }, []);

  const loadCustomPlans = async () => {
    try {
      const response = await fetch('/api/organization/custom-plans', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomPlans(data.items || []);
      } else {
        showMessage('error', 'Failed to load custom plans');
      }
    } catch (error) {
      console.error('Failed to load custom plans:', error);
      showMessage('error', 'Failed to load custom plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Custom Enterprise Plans</h3>
          <p className="text-sm text-gray-600 mt-1">Organization-specific custom plans</p>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-eva-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : customPlans.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-gray-400 text-4xl mb-4">workspace_premium</span>
              <p className="text-gray-500">No custom plans created</p>
              <p className="text-sm text-gray-400 mt-2">Create a custom enterprise plan tailored for this organization</p>
              <button
                onClick={() => showMessage('info', 'Contact support to create custom plans')}
                className="mt-4 bg-eva-500 hover:bg-eva-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Request Custom Plan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {customPlans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Monthly Quota:</span>
                          <span className="ml-2 text-sm text-gray-900">
                            {plan.monthly_quota ? plan.monthly_quota.toLocaleString() : 'Unlimited'}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Price:</span>
                          <span className="ml-2 text-sm text-gray-900">${plan.price}/month</span>
                        </div>
                      </div>
                      {plan.features && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-700">Features:</span>
                          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                            {plan.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const OrganizationSettings = ({ organization, onUpdate, showMessage }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_email: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        contact_email: organization.contact_email || ''
      });
    }
  }, [organization]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage('success', 'Profile updated successfully');
        onUpdate();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showMessage('error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      showMessage('error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organization/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        showMessage('success', 'Password updated successfully');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update password');
      }
    } catch (error) {
      console.error('Failed to update password:', error);
      showMessage('error', 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
        </div>
        <form onSubmit={updateProfile} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-eva-500 hover:bg-eva-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Password Management */}
      {organization?.can_reset_password && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Password Management</h3>
          </div>
          <form onSubmit={resetPassword} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        </div>
      )}

      {/* Account Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Status</label>
              <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                organization?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {organization?.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Tier</label>
              <p className="mt-1 text-sm text-gray-900 capitalize">{organization?.plan_tier}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Reset Allowed</label>
              <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                organization?.can_reset_password ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {organization?.can_reset_password ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDashboard;
