import React, { useState, useEffect } from 'react';
import { getToken } from '../api';

const PlanManagement = ({ onRefresh }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
    loadOrganizations();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const plansResponse = await fetch('/api/admin/plans?global_only=true', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      const plansData = await plansResponse.json();
      setPlans(plansData.items || []);
    } catch (error) {
      console.error('Failed to load global plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/orgs', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setOrganizations(data.items || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleDeletePlan = async (plan) => {
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('success', result.message);
        loadData();
        onRefresh?.();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to delete plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete plan');
    }
  };

  const getPlanTypeColor = (plan) => {
    if (plan.is_custom) return 'bg-purple-100 text-purple-800';
    switch (plan.name) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'pro': return 'bg-ecogo-100 text-ecogo-800';
      case 'free': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global Plan Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage global plans (Free & Pro). Custom/Enterprise plans are created per organization.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-eva-500 hover:bg-eva-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Create Global Plan</span>
          </button>
        </div>
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

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPlanTypeColor(plan)}`}>
                {plan.is_custom ? 'Custom' : plan.name}
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => { setSelectedPlan(plan); setShowEditModal(true); }}
                  className="text-eva-600 hover:text-eva-900 p-1 rounded"
                  title="Edit Plan"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  onClick={() => { setSelectedPlan(plan); setShowAssignModal(true); }}
                  className="text-ecogo-600 hover:text-ecogo-900 p-1 rounded"
                  title="Assign to Organization"
                >
                  <span className="material-symbols-outlined text-lg">assignment</span>
                </button>
                <button
                  onClick={() => { setSelectedPlan(plan); setShowDeleteModal(true); }}
                  className="text-red-600 hover:text-red-900 p-1 rounded"
                  title="Delete Plan"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold text-gray-900">${plan.price}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Quota:</span>
                <span className="font-semibold text-gray-900">
                  {plan.monthly_quota ? plan.monthly_quota.toLocaleString() : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subscriptions:</span>
                <span className="font-semibold text-gray-900">{plan.subscription_count}</span>
              </div>
            </div>

            {plan.description && (
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
            )}

            {plan.features && (
              <div className="text-xs text-gray-500">
                <strong>Features:</strong> {plan.features}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}

      {showEditModal && selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => { setShowEditModal(false); setSelectedPlan(null); }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
            loadData();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}



      {showAssignModal && selectedPlan && (
        <AssignPlanModal
          plan={selectedPlan}
          organizations={organizations}
          onClose={() => { setShowAssignModal(false); setSelectedPlan(null); }}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedPlan(null);
            loadData();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}

      {showDeleteModal && selectedPlan && (
        <DeletePlanModal
          plan={selectedPlan}
          onClose={() => { setShowDeleteModal(false); setSelectedPlan(null); }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedPlan(null);
            loadData();
            onRefresh?.();
          }}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};

// Create Plan Modal
const CreatePlanModal = ({ onClose, onSuccess, showMessage }) => {
  const [formData, setFormData] = useState({
    name: '',
    monthly_quota: '',
    price: '',
    description: '',
    features: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        monthly_quota: formData.monthly_quota ? parseInt(formData.monthly_quota) : null,
        price: parseFloat(formData.price)
      };

      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showMessage('success', 'Plan created successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to create plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Create Plan</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Quota</label>
              <input
                type="number"
                value={formData.monthly_quota}
                onChange={(e) => setFormData({...formData, monthly_quota: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($/month)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({...formData, features: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500"
                rows="2"
                placeholder="Feature 1, Feature 2, Feature 3"
              />
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
                {loading ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};



// Simple modals for Edit, Assign, and Delete
const EditPlanModal = ({ plan, onClose, onSuccess, showMessage }) => {
  const [formData, setFormData] = useState({
    name: plan.name || '',
    monthly_quota: plan.monthly_quota || '',
    price: plan.price || '',
    description: plan.description || '',
    features: plan.features || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        monthly_quota: formData.monthly_quota ? parseInt(formData.monthly_quota) : null,
        price: parseFloat(formData.price)
      };

      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showMessage('success', 'Plan updated successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to update plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Plan</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Quota</label>
            <input
              type="number"
              value={formData.monthly_quota}
              onChange={(e) => setFormData(prev => ({ ...prev, monthly_quota: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              rows="2"
              placeholder="Comma-separated features"
            />
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
              {loading ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssignPlanModal = ({ plan, organizations, onClose, onSuccess, showMessage }) => {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedOrgId) {
      showMessage('error', 'Please select an organization');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plan-management/organization/${selectedOrgId}/assign/${plan.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        showMessage('success', `Plan "${plan.name}" assigned successfully`);
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to assign plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to assign plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Plan to Organization</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Plan: <strong>{plan.name}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Price: <strong>${plan.price}</strong></p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Organization
          </label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
          >
            <option value="">Choose an organization...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} (Current: {org.plan_tier})
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedOrgId}
            className="flex-1 px-4 py-2 bg-eva-600 text-white rounded-lg hover:bg-eva-700 disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeletePlanModal = ({ plan, onClose, onSuccess, showMessage }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        showMessage('success', `Plan "${plan.name}" deleted successfully`);
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to delete plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Plan</h3>

        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            Are you sure you want to delete the plan <strong>"{plan.name}"</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone. Organizations using this plan will need to be reassigned.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanManagement;
