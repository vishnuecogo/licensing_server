import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../api';

const OrganizationManagement = ({ analytics, onRefresh }) => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orgs', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setOrganizations(data.items || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSuspend = async (org) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/organizations/${org.id}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      showMessage('success', result.message);
      loadOrganizations();
      onRefresh?.();
    } catch (error) {
      showMessage('error', 'Failed to suspend organization');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (org) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/organizations/${org.id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const result = await response.json();
      showMessage('success', result.message);
      loadOrganizations();
      onRefresh?.();
    } catch (error) {
      showMessage('error', 'Failed to activate organization');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'pro': return 'bg-ecogo-100 text-ecogo-800';
      case 'free': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-eva-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Organizations Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-eva-500 hover:bg-eva-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Create Organization</span>
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-eva-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="material-symbols-outlined text-eva-600">business</span>
                      </div>
                      <div>
                        <button
                          onClick={() => navigate(`/admin/organization/${org.id}`)}
                          className="text-left hover:text-eva-600"
                        >
                          <div className="text-sm font-medium text-gray-900 hover:text-eva-600">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.contact_email}</div>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanColor(org.plan_tier)}`}>
                      {org.plan_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.status)}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {org.login_email || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/admin/organization/${org.id}`)}
                        className="text-eva-600 hover:text-eva-900 p-1 rounded"
                        title="Manage Organization"
                      >
                        <span className="material-symbols-outlined text-lg">settings</span>
                      </button>
                      {org.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(org)}
                          disabled={actionLoading}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded disabled:opacity-50"
                          title="Suspend"
                        >
                          <span className="material-symbols-outlined text-lg">pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(org)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                          title="Activate"
                        >
                          <span className="material-symbols-outlined text-lg">play_arrow</span>
                        </button>
                      )}
                      {org.login_email && (
                        <button
                          onClick={() => { setSelectedOrg(org); setShowPasswordResetModal(true); }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Reset Password"
                        >
                          <span className="material-symbols-outlined text-lg">key</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedOrg(org); setShowDeleteModal(true); }}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrganizations();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}



      {showDeleteModal && selectedOrg && (
        <DeleteOrganizationModal
          organization={selectedOrg}
          onClose={() => { setShowDeleteModal(false); setSelectedOrg(null); }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedOrg(null);
            loadOrganizations();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}

      {showPasswordResetModal && selectedOrg && (
        <PasswordResetModal
          organization={selectedOrg}
          onClose={() => { setShowPasswordResetModal(false); setSelectedOrg(null); }}
          onSuccess={() => {
            setShowPasswordResetModal(false);
            setSelectedOrg(null);
            loadOrganizations();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};

// Create Organization Modal
const CreateOrganizationModal = ({ onClose, onSuccess, showMessage }) => {
  const [formData, setFormData] = useState({
    name: '',
    plan_tier: 'free',
    contact_email: '',
    login_email: '',
    generate_password: true,
    custom_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load available global plans (free and pro only)
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch('/api/admin/plans?global_only=true', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPlans(data.items || []);
          // Set default plan to first available plan
          if (data.items && data.items.length > 0) {
            setFormData(prev => ({ ...prev, plan_tier: data.items[0].name }));
          }
        }
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', `Organization created successfully! ${result.generated_password ? `Password: ${result.generated_password}` : ''}`);
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to create organization');
      }
    } catch (error) {
      showMessage('error', 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Create Organization</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
              <select
                value={formData.plan_tier}
                onChange={(e) => setFormData({...formData, plan_tier: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                disabled={loadingPlans}
              >
                {loadingPlans ? (
                  <option value="">Loading plans...</option>
                ) : plans.length === 0 ? (
                  <option value="">No plans available</option>
                ) : (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.name}>
                      {plan.name} - ${plan.price}/month
                      {plan.monthly_quota ? ` (${plan.monthly_quota.toLocaleString()} requests)` : ' (Unlimited)'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
              <input
                type="email"
                value={formData.login_email}
                onChange={(e) => setFormData({...formData, login_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Password</label>
                <input
                  type="password"
                  value={formData.custom_password}
                  onChange={(e) => setFormData({...formData, custom_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                  minLength="6"
                  required={!formData.generate_password}
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
                className="flex-1 px-4 py-2 bg-eva-500 text-white rounded-lg hover:bg-eva-600 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Organization Modal
const EditOrganizationModal = ({ organization, onClose, onSuccess, showMessage }) => {
  const [formData, setFormData] = useState({
    name: organization.name,
    plan_tier: organization.plan_tier,
    contact_email: organization.contact_email,
    status: organization.status
  });
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Load available global plans (free and pro only)
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch('/api/admin/plans?global_only=true', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPlans(data.items || []);
        }
      } catch (error) {
        console.error('Failed to load plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showMessage('success', 'Organization updated successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update organization');
      }
    } catch (error) {
      showMessage('error', 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Edit Organization</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
              <select
                value={formData.plan_tier}
                onChange={(e) => setFormData({...formData, plan_tier: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                disabled={loadingPlans}
              >
                {loadingPlans ? (
                  <option value="">Loading plans...</option>
                ) : plans.length === 0 ? (
                  <option value="">No plans available</option>
                ) : (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.name}>
                      {plan.name} - ${plan.price}/month
                      {plan.monthly_quota ? ` (${plan.monthly_quota.toLocaleString()} requests)` : ' (Unlimited)'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

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
                className="flex-1 px-4 py-2 bg-eva-500 text-white rounded-lg hover:bg-eva-600 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Password Reset Modal
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

// Delete Organization Modal
const DeleteOrganizationModal = ({ organization, onClose, onSuccess, showMessage }) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      showMessage('error', 'Please type the organization name to confirm deletion');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', result.message);
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to delete organization');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-red-600">Delete Organization</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-red-600 mr-2">warning</span>
                <span className="text-red-800 font-medium">This action cannot be undone!</span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete <strong>{organization.name}</strong> and all associated data including:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 mb-4">
              <li>All API keys</li>
              <li>All subscriptions</li>
              <li>All usage data</li>
              <li>Login credentials</li>
            </ul>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <strong>{organization.name}</strong> to confirm deletion:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={organization.name}
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== organization.name}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete Organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationManagement;
