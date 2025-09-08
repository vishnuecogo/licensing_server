import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminAPI, setToken, getToken, getClaims } from '../api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const token = getToken();
    const claims = getClaims();
    
    if (token && claims) {
      // Redirect based on user type
      if (claims.role === 'admin') {
        window.location.href = '/admin';
      } else if (claims.role === 'organization') {
        window.location.href = '/organization';
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await AdminAPI.login(email, password);
      
      if (response.access_token) {
        setToken(response.access_token);
        
        // Redirect based on user type
        if (response.user_type === 'admin') {
          window.location.href = '/admin';
        } else if (response.user_type === 'organization') {
          window.location.href = '/organization';
        }
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eva-50 to-eva-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-eva-500 to-eva-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your EVA Licensing account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eva-500 focus:border-eva-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-eva-500 hover:bg-eva-600 disabled:bg-eva-300 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Demo Credentials:</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900">Admin Access</div>
                <div className="text-gray-600">admin@eva.local / admin123</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900">Organization Access</div>
                <div className="text-gray-600">demo@eva.local / demo123</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-900">Enterprise Org</div>
                <div className="text-gray-600">techcorp@eva.local / tech123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-eva-600 hover:text-eva-700 font-medium text-sm flex items-center justify-center space-x-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Back to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
