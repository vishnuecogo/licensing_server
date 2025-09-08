import React, { useState, useEffect } from 'react';
import { getToken, getClaims } from '../api';

const AdminTestPage = () => {
  const [status, setStatus] = useState('Initializing...');
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    testAdminFlow();
  }, []);

  const testAdminFlow = async () => {
    try {
      addLog('🔍 Starting admin flow test...', 'info');
      
      // Test 1: Check token and claims
      const token = getToken();
      const claims = getClaims();
      
      addLog(`Token exists: ${!!token}`, token ? 'success' : 'error');
      addLog(`Claims: ${JSON.stringify(claims)}`, claims ? 'success' : 'error');
      
      if (!token || !claims) {
        setStatus('❌ No valid authentication');
        addLog('Redirecting to login...', 'error');
        setTimeout(() => window.location.href = '/login', 2000);
        return;
      }
      
      if (claims.role !== 'admin') {
        setStatus('❌ Not an admin user');
        addLog('User role is not admin', 'error');
        return;
      }
      
      setStatus('✅ Authentication valid');
      addLog('User is authenticated as admin', 'success');
      
      // Test 2: Test analytics endpoints
      await testAnalyticsEndpoints(token);
      
    } catch (error) {
      addLog(`❌ Error in admin flow: ${error.message}`, 'error');
      setStatus('❌ Error occurred');
    }
  };

  const testAnalyticsEndpoints = async (token) => {
    addLog('🔍 Testing analytics endpoints...', 'info');
    
    const endpoints = [
      { name: 'Overview', url: '/api/admin/analytics/overview' },
      { name: 'Growth', url: '/api/admin/analytics/growth' },
      { name: 'Top Organizations', url: '/api/admin/analytics/top-organizations' },
      { name: 'Revenue', url: '/api/admin/analytics/revenue' },
      { name: 'Recent Activity', url: '/api/admin/analytics/recent-activity' }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        addLog(`Testing ${endpoint.name}...`, 'info');
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          results[endpoint.name.toLowerCase()] = data;
          addLog(`✅ ${endpoint.name}: Success`, 'success');
        } else {
          addLog(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`, 'error');
        }
      } catch (error) {
        addLog(`❌ ${endpoint.name}: ${error.message}`, 'error');
      }
    }
    
    setAnalytics(results);
    addLog('🎉 Analytics test completed', 'success');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard Test</h1>
          <div className="text-lg font-semibold mb-4">
            Status: <span className={status.includes('✅') ? 'text-green-600' : status.includes('❌') ? 'text-red-600' : 'text-yellow-600'}>
              {status}
            </span>
          </div>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={testAdminFlow}
              className="bg-eva-600 text-white px-4 py-2 rounded-lg hover:bg-eva-700 transition-colors"
            >
              Re-run Test
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="bg-ecogo-600 text-white px-4 py-2 rounded-lg hover:bg-ecogo-700 transition-colors"
            >
              Go to Admin Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear & Login
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Logs</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className={`text-sm font-mono ${getLogColor(log.type)} mb-1`}>
                <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-500 text-sm">No logs yet...</div>
            )}
          </div>
        </div>

        {analytics && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics Data</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 overflow-auto max-h-96">
                {JSON.stringify(analytics, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTestPage;
