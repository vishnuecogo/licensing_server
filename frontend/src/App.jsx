import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminDashboard from './pages/AdminDashboard'
import AdminTestPage from './pages/AdminTestPage'
import OrganizationDashboard from './pages/OrganizationDashboard'
import OrganizationDetailPage from './pages/OrganizationDetailPage'
import LoginPage from './pages/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

export default function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
            <Route path="/admin/test" element={<ErrorBoundary><AdminTestPage /></ErrorBoundary>} />
            <Route path="/admin/organization/:id" element={<ErrorBoundary><OrganizationDetailPage /></ErrorBoundary>} />
            <Route path="/organization" element={<ErrorBoundary><OrganizationDashboard /></ErrorBoundary>} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}
