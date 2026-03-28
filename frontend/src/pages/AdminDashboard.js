import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Users, Briefcase, Wrench, IndianRupee, Shield,
  CheckCircle, XCircle, UserCheck, Building2, HardHat
} from 'lucide-react';

export default function AdminDashboard() {
  const { api } = useAuth();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api('get', '/admin/stats'),
        api('get', '/admin/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleVerify = async (userId, verified) => {
    try {
      await api('post', '/admin/verify', { user_id: userId, verified });
      loadData();
    } catch (err) { console.error(err); }
  };

  const filteredUsers = filterRole ? users.filter(u => u.role === filterRole) : users;
  const pendingVerification = users.filter(u => !u.verified && u.role !== 'admin');

  const statCards = [
    { label: 'Total Users', value: stats.total_users || 0, icon: Users, color: '#00A8E8' },
    { label: 'Employers', value: stats.total_employers || 0, icon: Building2, color: '#F59E0B' },
    { label: 'Labourers', value: stats.total_labours || 0, icon: HardHat, color: '#10B981' },
    { label: 'Vendors', value: stats.total_vendors || 0, icon: Wrench, color: '#00E5FF' },
    { label: 'Total Jobs', value: stats.total_jobs || 0, icon: Briefcase, color: '#8B5CF6' },
    { label: 'Open Jobs', value: stats.open_jobs || 0, icon: Briefcase, color: '#10B981' },
    { label: 'Verified Users', value: stats.verified_users || 0, icon: Shield, color: '#10B981' },
    { label: 'Transactions', value: stats.total_transactions || 0, icon: IndianRupee, color: '#F59E0B' },
  ];

  const roleIcons = { employer: Building2, labour: HardHat, vendor: Wrench, admin: Shield };
  const roleColors = {
    employer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    labour: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    vendor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-[#9BA3B5] mt-1">Platform management and verification</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="stat-card p-4 rounded-lg bg-[#141E3A] border border-[#28385E]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold">{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
            </div>
            <p className="font-heading text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#141E3A] rounded-lg border border-[#28385E] w-fit">
        {[
          { id: 'overview', label: 'All Users' },
          { id: 'pending', label: `Pending Verification (${pendingVerification.length})` },
        ].map(t => (
          <button
            key={t.id}
            data-testid={`admin-tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === t.id ? 'bg-[#00A8E8]/10 text-[#00A8E8] font-medium' : 'text-[#9BA3B5] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Role filter for all users */}
      {activeTab === 'overview' && (
        <div className="flex gap-2">
          {['', 'employer', 'labour', 'vendor', 'admin'].map(role => (
            <button
              key={role}
              data-testid={`filter-${role || 'all'}`}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                filterRole === role ? 'bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20' : 'text-[#9BA3B5] bg-[#141E3A] border border-[#28385E] hover:text-white'
              }`}
            >
              {role || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Users list */}
      <div className="space-y-2">
        {(activeTab === 'pending' ? pendingVerification : filteredUsers).map(u => {
          const RoleIcon = roleIcons[u.role] || Users;
          return (
            <div key={u._id} data-testid={`user-row-${u._id}`} className="p-4 rounded-lg bg-[#141E3A] border border-[#28385E] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1D2A4D] flex items-center justify-center">
                  <RoleIcon className="w-5 h-5 text-[#00A8E8]" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{u.name}</p>
                    <Badge className={`${roleColors[u.role]} border text-[10px]`}>{u.role}</Badge>
                    {u.verified && (
                      <span className="flex items-center gap-0.5 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" />Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-[#9BA3B5]">{u.email} {u.phone ? `| ${u.phone}` : ''}</p>
                  {u.aadhaar_number && <p className="text-xs text-[#9BA3B5]">Aadhaar: {u.aadhaar_number}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!u.verified && u.role !== 'admin' && (
                  <Button
                    data-testid={`verify-btn-${u._id}`}
                    size="sm"
                    onClick={() => handleVerify(u._id, true)}
                    className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs"
                  >
                    <UserCheck className="w-3 h-3 mr-1" /> Verify
                  </Button>
                )}
                {u.verified && u.role !== 'admin' && (
                  <Button
                    data-testid={`unverify-btn-${u._id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerify(u._id, false)}
                    className="border-[#28385E] text-[#9BA3B5] hover:text-[#EF4444] hover:border-[#EF4444] bg-transparent text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Unverify
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
