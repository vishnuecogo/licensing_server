import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <div className="flex items-center mb-6">
              <span className="material-symbols-outlined text-red-500 text-3xl mr-3">error</span>
              <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error Details:</h2>
              <p className="text-red-700 font-mono text-sm mb-2">
                {this.state.error && this.state.error.toString()}
              </p>
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-red-800 font-semibold cursor-pointer">
                    Stack Trace (click to expand)
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-64 bg-red-100 p-2 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Troubleshooting Steps:</h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• Check the browser console for additional error details</li>
                <li>• Verify that the backend server is running on port 8888</li>
                <li>• Ensure you're logged in with valid admin credentials</li>
                <li>• Try refreshing the page</li>
                <li>• Clear browser cache and localStorage</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-eva-600 text-white px-4 py-2 rounded-lg hover:bg-eva-700 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Data & Login
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Try Again
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                If the problem persists, please check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
