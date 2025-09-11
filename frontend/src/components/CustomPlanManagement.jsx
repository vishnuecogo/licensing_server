import React, { useState, useEffect } from 'react';
import { getToken } from '../api';

// Build timestamp: 2025-08-27-15:30

const CustomPlanManagement = ({ organization, onUpdate, showMessage }) => {
  const [customPlans, setCustomPlans] = useState([]);
  const [globalPlans, setGlobalPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadCustomPlans();
    loadCurrentPlan();
    loadGlobalPlans();
  }, [organization.id]);

  const loadCustomPlans = async () => {
    try {
      const response = await fetch(`/api/admin/plans?organization_id=${organization.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter custom plans for this organization
        const orgCustomPlans = data.items?.filter(plan =>
          plan.name.startsWith(`Custom-${organization.name}`)
        ).map(plan => ({
          ...plan,
          // Parse features JSON string back to array
          features: plan.features ? (() => {
            try {
              return JSON.parse(plan.features);
            } catch (e) {
              console.warn('Failed to parse features for plan:', plan.name, e);
              return [];
            }
          })() : []
        })) || [];
        setCustomPlans(orgCustomPlans);
      }
    } catch (error) {
      console.error('Failed to load custom plans:', error);
    }
  };

  const loadCurrentPlan = async () => {
    try {
      // Use the existing subs endpoint to get subscription info
      const response = await fetch(`/api/admin/subs?org_id=${organization.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const subscription = data.items[0];
          // Get plan details
          const planResponse = await fetch(`/api/admin/plans`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if (planResponse.ok) {
            const planData = await planResponse.json();
            const plan = planData.items.find(p => p.id === subscription.plan_id);
            if (plan) {
              setCurrentPlan({
                subscription_id: subscription.id,
                plan_id: plan.id,
                plan_name: plan.name,
                monthly_quota: plan.monthly_quota,
                price: plan.price,
                description: plan.description,
                features: plan.features,
                status: subscription.status,
                period_reset_date: subscription.period_reset_date
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load current plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans?global_only=true', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGlobalPlans(data.items || []);
      }
    } catch (error) {
      console.error('Failed to load global plans:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatQuota = (quota) => {
    if (quota === null || quota === undefined) {
      return 'Unlimited';
    }
    if (quota >= 1000000) {
      return `${(quota / 1000000).toFixed(1)}M`;
    } else if (quota >= 1000) {
      return `${(quota / 1000).toFixed(0)}K`;
    }
    return quota.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
          <button
            onClick={() => setShowChangePlanModal(true)}
            className="bg-eva-600 text-white px-4 py-2 rounded-lg hover:bg-eva-700 flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
            <span>Change Plan</span>
          </button>
        </div>
        {currentPlan ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{currentPlan.plan_name}</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                organization.plan_tier === 'custom'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {organization.plan_tier}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Monthly Quota:</span> {formatQuota(currentPlan.monthly_quota)}
              </div>
              <div>
                <span className="font-medium">Price:</span> {formatPrice(currentPlan.price)}
              </div>
            </div>
            {currentPlan.description && (
              <p className="text-sm text-gray-600 mt-2">{currentPlan.description}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No active plan found</p>
        )}
      </div>

      {/* Custom Plans */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Custom Enterprise Plans</h3>
            <p className="text-sm text-gray-500">Organization-specific custom plans</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-eva-600 text-white px-4 py-2 rounded-lg hover:bg-eva-700 flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Create Custom Plan</span>
          </button>
        </div>

        {customPlans.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-gray-400 text-4xl mb-4">workspace_premium</span>
            <p className="text-gray-500">No custom plans created</p>
            <p className="text-sm text-gray-400">Create a custom enterprise plan tailored for this organization</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customPlans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{plan.name}</h4>
                  <div className="flex items-center space-x-2">
                    {currentPlan?.plan_id === plan.id && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                    <button
                      onClick={() => setShowAssignModal(plan)}
                      className="text-eva-600 hover:text-eva-700 text-sm"
                    >
                      {currentPlan?.plan_id === plan.id ? 'Current' : 'Assign'}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Monthly Quota:</span>
                    <span className="font-medium">{formatQuota(plan.monthly_quota)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium">{formatPrice(plan.price)}</span>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                )}

                {plan.features && plan.features.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {plan.features.map((feature, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-3">
                  Created: {new Date(plan.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Custom Plan Modal */}
      {showCreateModal && (
        <CreateCustomPlanModal
          organization={organization}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCustomPlans();
            loadCurrentPlan();
          }}
          showMessage={showMessage}
        />
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <AssignPlanModal
          organization={organization}
          plan={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            loadCurrentPlan();
            onUpdate({ ...organization, plan_tier: 'custom' });
          }}
          showMessage={showMessage}
        />
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && (
        <ChangePlanModal
          organization={organization}
          globalPlans={globalPlans}
          currentPlan={currentPlan}
          onClose={() => setShowChangePlanModal(false)}
          onSuccess={(updatedOrg) => {
            setShowChangePlanModal(false);
            loadCurrentPlan();
            // Pass the updated organization data to parent
            if (updatedOrg) {
              onUpdate(updatedOrg);
            } else {
              onUpdate();
            }
          }}
          showMessage={showMessage}
        />
      )}
    </div>
  );
};

// Create Custom Plan Modal
const CreateCustomPlanModal = ({ organization, onClose, onSuccess, showMessage }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: `Plan-${Date.now()}`, // Backend will prefix with Custom-{org.name}-
    monthly_quota: 100000,
    price: 99.99,
    description: '',
    features: []
  });
  const [featureInput, setFeatureInput] = useState('');

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  const removeFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert features array to JSON string for backend
      const payload = {
        organization_id: organization.id,
        name: formData.name,
        monthly_quota: formData.monthly_quota,
        price: formData.price,
        description: formData.description,
        features: formData.features.length > 0 ? JSON.stringify(formData.features) : null
      };

      const response = await fetch('/api/admin/plan-management/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showMessage('success', 'Custom plan created successfully');
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to create custom plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to create custom plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Custom Enterprise Plan</h3>
        
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Quota</label>
              <input
                type="number"
                value={formData.monthly_quota}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_quota: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
              rows="3"
              placeholder="Describe this custom plan..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
                placeholder="Add a feature..."
              />
              <button
                type="button"
                onClick={addFeature}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            {formData.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 text-sm bg-eva-100 text-eva-800 rounded">
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(feature)}
                      className="ml-1 text-eva-600 hover:text-eva-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              className="flex-1 px-4 py-2 bg-eva-600 text-white rounded-lg hover:bg-eva-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Plan Modal
const AssignPlanModal = ({ organization, plan, onClose, onSuccess, showMessage }) => {
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/plan-management/organization/${organization.id}/assign/${plan.id}`, {
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Custom Plan</h3>
        <p className="text-gray-600 mb-6">
          Assign "{plan.name}" to {organization.name}? This will replace their current plan.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-eva-600 text-white rounded-lg hover:bg-eva-700 disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Change Plan Modal
const ChangePlanModal = ({ organization, globalPlans, currentPlan, onClose, onSuccess, showMessage }) => {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePlan = async () => {
    if (!selectedPlanId) {
      showMessage('error', 'Please select a plan');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/plan-management/organization/${organization.id}/assign/${selectedPlanId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const result = await response.json();
        const selectedPlan = globalPlans.find(p => p.id === parseInt(selectedPlanId));
        showMessage('success', `Plan changed to "${selectedPlan.name}" successfully`);
        // Pass the updated organization data to the parent
        onSuccess(result.organization);
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to change plan');
      }
    } catch (error) {
      showMessage('error', 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Plan</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Organization: <strong>{organization.name}</strong></p>
          <p className="text-sm text-gray-600 mb-4">Current Plan: <strong>{currentPlan?.plan_name || 'None'}</strong></p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select New Plan
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500"
          >
            <option value="">Choose a plan...</option>
            {globalPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - ${plan.price}/month ({plan.monthly_quota ? `${plan.monthly_quota.toLocaleString()} calls` : 'Unlimited'})
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
            onClick={handleChangePlan}
            disabled={loading || !selectedPlanId}
            className="flex-1 px-4 py-2 bg-eva-600 text-white rounded-lg hover:bg-eva-700 disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPlanManagement;
