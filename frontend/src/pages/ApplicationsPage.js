import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ClipboardList, CheckCircle, XCircle, User, IndianRupee
} from 'lucide-react';

export default function ApplicationsPage() {
  const { user, api } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api('get', '/applications');
      setApplications(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatus = async (appId, status) => {
    try {
      await api('patch', `/applications/${appId}/status`, { status });
      loadData();
    } catch (err) { console.error(err); }
  };

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="apps-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="applications-page" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {user?.role === 'employer' ? 'Job Applications' : 'My Applications'}
        </h1>
        <p className="text-sm text-[#9BA3B5] mt-1">{applications.length} application(s)</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <ClipboardList className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <div key={app._id} data-testid={`app-row-${app._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading text-lg font-semibold text-white">{app.job_title}</h3>
                    <Badge className={`${statusColors[app.status]} border text-xs`}>{app.status}</Badge>
                  </div>
                  {user?.role === 'employer' && (
                    <p className="text-sm text-[#9BA3B5] flex items-center gap-1 mb-1">
                      <User className="w-3.5 h-3.5" /> Applicant: {app.labour_name}
                    </p>
                  )}
                  {app.message && <p className="text-sm text-[#9BA3B5] italic">"{app.message}"</p>}
                  <p className="text-xs text-[#9BA3B5] mt-1">Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                {user?.role === 'employer' && app.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button
                      data-testid={`accept-app-${app._id}`}
                      size="sm"
                      onClick={() => handleStatus(app._id, 'accepted')}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button
                      data-testid={`reject-app-${app._id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus(app._id, 'rejected')}
                      className="border-[#28385E] text-[#9BA3B5] hover:text-[#EF4444] hover:border-[#EF4444] bg-transparent text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
