
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Database, User as UserIcon } from 'lucide-react';
import hydrangeaIcon from './assets/hydrangea-icon.jpg';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BucketDetails from './pages/BucketDetails';
import { api } from './services/api';

// ProtectedRoute component to wrap routes that require authentication
// Children are made optional in the type to prevent TypeScript from incorrectly flagging missing properties
// when used in complex JSX assignments.
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const isAuthenticated = !!localStorage.getItem('access_token');
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await api.logout();
      navigate('/login');
    } catch (e) {
      console.error(e);
      navigate('/login');
    }
  };

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div>
              <img src={hydrangeaIcon} alt="Hydrangea Icon" className="w-10 h-10" />
            </div>
            <span className="font-bold text-xl tracking-tight text-black">HydraBox</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-[#00ED64] transition-colors">Dashboard</Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-[#F9FBFA]">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <Dashboard />
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bucket/:id"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-[#F9FBFA]">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <BucketDetails />
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
