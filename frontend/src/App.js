import React, { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import EmployerDashboard from './pages/EmployerDashboard';
import LabourDashboard from './pages/LabourDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VendorDashboard from './pages/VendorDashboard';
import WalletPage from './pages/WalletPage';
import ToolRentals from './pages/ToolRentals';
import ApplicationsPage from './pages/ApplicationsPage';
import LaboursPage from './pages/LaboursPage';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  switch (user.role) {
    case 'employer': return <EmployerDashboard />;
    case 'labour': return <LabourDashboard />;
    case 'admin': return <AdminDashboard />;
    case 'vendor': return <VendorDashboard />;
    default: return <LabourDashboard />;
  }
}

function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen bg-[#0B132B]">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'} p-6 sm:p-8`}>
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout><DashboardRouter /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/jobs" element={
        <ProtectedRoute roles={['employer']}>
          <DashboardLayout><EmployerDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/browse-jobs" element={
        <ProtectedRoute>
          <DashboardLayout><LabourDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-applications" element={
        <ProtectedRoute roles={['labour']}>
          <DashboardLayout><ApplicationsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/applications" element={
        <ProtectedRoute roles={['employer']}>
          <DashboardLayout><ApplicationsPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/labours" element={
        <ProtectedRoute roles={['employer', 'admin']}>
          <DashboardLayout><LaboursPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/tools" element={
        <ProtectedRoute>
          <DashboardLayout><ToolRentals /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-tools" element={
        <ProtectedRoute roles={['vendor']}>
          <DashboardLayout><VendorDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute>
          <DashboardLayout><WalletPage /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute roles={['labour']}>
          <DashboardLayout><LabourDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/verification" element={
        <ProtectedRoute roles={['admin']}>
          <DashboardLayout><AdminDashboard /></DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
