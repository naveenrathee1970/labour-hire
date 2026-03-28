import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Briefcase, Users, Wrench, Wallet,
  LogOut, Shield, ClipboardList, User, ChevronLeft, ChevronRight, HardHat,
  Bell, Star, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

const navItems = {
  employer: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/jobs', label: 'My Jobs', icon: Briefcase },
    { path: '/applications', label: 'Applications', icon: ClipboardList },
    { path: '/labours', label: 'Find Labour', icon: Users },
    { path: '/tools', label: 'Tool Rentals', icon: Wrench },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ],
  labour: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/browse-jobs', label: 'Browse Jobs', icon: Briefcase },
    { path: '/my-applications', label: 'My Applications', icon: ClipboardList },
    { path: '/profile', label: 'My Profile', icon: User },
    { path: '/tools', label: 'Tool Rentals', icon: Wrench },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ],
  admin: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Manage Users', icon: Users },
    { path: '/admin/verification', label: 'Verification', icon: Shield },
    { path: '/browse-jobs', label: 'All Jobs', icon: Briefcase },
    { path: '/tools', label: 'Tool Rentals', icon: Wrench },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/admin/documents', label: 'Documents', icon: FileText },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ],
  vendor: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/my-tools', label: 'My Tools', icon: Wrench },
    { path: '/tools', label: 'Marketplace', icon: Wrench },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/reviews', label: 'Reviews', icon: Star },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ],
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItems[user?.role] || navItems.labour;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside
      data-testid="sidebar-nav"
      className={`fixed left-0 top-0 h-screen bg-[#141E3A] border-r border-[#28385E] z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#28385E]">
        <HardHat className="w-7 h-7 text-[#00A8E8] flex-shrink-0" />
        {!collapsed && (
          <span className="font-heading font-bold text-lg text-white tracking-tight">
            LabourHub
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                isActive
                  ? 'bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20'
                  : 'text-[#9BA3B5] hover:text-white hover:bg-[#1D2A4D]'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-[#28385E]" />

      {/* User info + logout */}
      <div className="p-3 space-y-2">
        {!collapsed && (
          <div className="px-2 py-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-[#9BA3B5] truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20">
              {user?.role}
            </span>
          </div>
        )}
        <Button
          data-testid="logout-button"
          variant="ghost"
          onClick={handleLogout}
          className={`w-full text-[#9BA3B5] hover:text-white hover:bg-[#1D2A4D] ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
          {!collapsed && 'Logout'}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        data-testid="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#141E3A] border border-[#28385E] flex items-center justify-center text-[#9BA3B5] hover:text-[#00A8E8] hover:border-[#00A8E8] transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
