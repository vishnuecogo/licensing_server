import React, { useState, useEffect } from 'react';
import { getToken } from '../api';

const ApiKeyManagement = ({ organizationId, organizationName, showMessage }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  useEffect(() => {
    loadApiKeys();
  }, [organizationId]);

  const loadApiKeys = async () => {
    try {
      const response = await fetch(`/api/admin/api-keys?org_id=${organizationId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.items || []);
      } else {
        showMessage('error', 'Failed to load API keys');
      }
    } catch (error) {
      showMessage('error', 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const maskApiKey = (key) => {
    if (!key || key.length < 8) return key;
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return `${start}${'*'.repeat(Math.max(0, key.length - 12))}${end}`;
  };

  const toggleKeyVisibility = (keyId) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
      // Auto-hide after 30 seconds
      setTimeout(() => {
        setVisibleKeys(prev => {
          const updated = new Set(prev);
          updated.delete(keyId);
          return updated;
        });
      }, 30000);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage('success', 'API key copied to clipboard');
    } catch (error) {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  const handleToggleStatus = async (keyId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentStatus })
      });

      if (response.ok) {
        loadApiKeys();
        showMessage('success', `API key ${!currentStatus ? 'activated' : 'deactivated'}`);
      } else {
        showMessage('error', 'Failed to update API key status');
      }
    } catch (error) {
      showMessage('error', 'Failed to update API key status');
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/admin/api-keys/${selectedKey.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (response.ok) {
        loadApiKeys();
        setShowDeleteModal(false);
        setSelectedKey(null);
        showMessage('success', 'API key deleted successfully');
      } else {
        showMessage('error', 'Failed to delete API key');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete API key');
    }
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">API Key Management</h3>
            <p className="text-sm text-gray-500">Manage API keys for {organizationName}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-eva-600 text-white px-4 py-2 rounded-lg hover:bg-eva-700 flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Create API Key</span>
          </button>
        </div>

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-gray-400 text-4xl mb-4">key_off</span>
            <p className="text-gray-500">No API keys found</p>
            <p className="text-sm text-gray-400">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">
                        API Key #{key.id}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        key.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {key.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                        {visibleKeys.has(key.id) ? key.key_display || maskApiKey(key.key_hash) : maskApiKey(key.key_hash)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key_display || key.key_hash)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copy to clipboard"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title={visibleKeys.has(key.id) ? "Hide key" : "Show key"}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {visibleKeys.has(key.id) ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Created: {new Date(key.created_at).toLocaleDateString()}</div>
                      {key.last_used && (
                        <div>Last used: {new Date(key.last_used).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(key.id, key.active)}
                      className={`p-2 rounded-lg ${
                        key.active 
                          ? 'text-orange-600 hover:bg-orange-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={key.active ? 'Deactivate' : 'Activate'}
                    >
                      <span className="material-symbols-outlined">
                        {key.active ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKey(key);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          organizationId={organizationId}
          organizationName={organizationName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadApiKeys();
          }}
          showMessage={showMessage}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedKey && (
        <DeleteConfirmationModal
          apiKey={selectedKey}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedKey(null);
          }}
          onConfirm={handleDeleteKey}
        />
      )}
    </div>
  );
};

// Create API Key Modal Component
const CreateApiKeyModal = ({ organizationId, organizationName, onClose, onSuccess, showMessage }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    plaintext_key: '',
    generate_key: true
  });
  const [generatedKey, setGeneratedKey] = useState('');

  const generateApiKey = () => {
    const prefix = 'evakey';
    const orgPart = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${prefix}_${orgPart}_${randomPart}_${timestamp}`;
  };

  useEffect(() => {
    if (formData.generate_key) {
      const newKey = generateApiKey();
      setFormData(prev => ({ ...prev, plaintext_key: newKey }));
      setGeneratedKey(newKey);
    }
  }, [formData.generate_key, organizationName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          org_id: organizationId,
          plaintext_key: formData.plaintext_key,
          active: true
        })
      });

      if (response.ok) {
        showMessage('success', 'API key created successfully');
        onSuccess();
      } else {
        const error = await response.json();
        showMessage('error', error.detail || 'Failed to create API key');
      }
    } catch (error) {
      showMessage('error', 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create API Key</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.generate_key}
                onChange={(e) => setFormData(prev => ({ ...prev, generate_key: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Generate key automatically</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              value={formData.plaintext_key}
              onChange={(e) => setFormData(prev => ({ ...prev, plaintext_key: e.target.value }))}
              disabled={formData.generate_key}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-eva-500 focus:border-eva-500 disabled:bg-gray-100"
              placeholder="Enter custom API key or use generated one"
              required
            />
          </div>

          {generatedKey && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Generated API Key:</p>
              <code className="text-sm font-mono text-blue-800">{generatedKey}</code>
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
              className="flex-1 px-4 py-2 bg-eva-600 text-white rounded-lg hover:bg-eva-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmationModal = ({ apiKey, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delete API Key</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete API Key #{apiKey.id}? This action cannot be undone.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManagement;
