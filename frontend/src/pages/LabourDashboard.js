import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Briefcase, MapPin, IndianRupee, Clock, Users, Shield,
  Search, Send, CheckCircle, XCircle, User
} from 'lucide-react';

export default function LabourDashboard() {
  const { user, api } = useAuth();
  const [activeTab, setActiveTab] = useState('browse');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applyingTo, setApplyingTo] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', aadhaar_number: '', address: '',
    skills: [], experience_years: 0, daily_rate: 0, bio: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [jobsRes, appsRes, walletRes, profileRes] = await Promise.all([
        api('get', '/jobs?status=open'),
        api('get', '/applications'),
        api('get', '/wallet'),
        api('get', `/profile/${user.id}`)
      ]);
      setJobs(jobsRes.data.jobs || []);
      setApplications(appsRes.data || []);
      setWalletBalance(walletRes.data.balance || 0);
      const p = profileRes.data;
      setProfile(p);
      setProfileForm({
        name: p.name || '', phone: p.phone || '', aadhaar_number: p.aadhaar_number || '',
        address: p.address || '', skills: p.skills || [], experience_years: p.experience_years || 0,
        daily_rate: p.daily_rate || 0, bio: p.bio || ''
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApply = async (jobId) => {
    try {
      await api('post', '/applications', { job_id: jobId, message: applyMsg });
      setApplyingTo(null);
      setApplyMsg('');
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...profileForm,
        experience_years: Number(profileForm.experience_years),
        daily_rate: Number(profileForm.daily_rate),
        skills: typeof profileForm.skills === 'string' ? profileForm.skills.split(',').map(s => s.trim()) : profileForm.skills,
      };
      await api('put', '/profile', data);
      loadData();
    } catch (err) { console.error(err); }
  };

  const appliedJobIds = applications.map(a => a.job_id);
  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="labour-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'browse', label: 'Browse Jobs', icon: Briefcase },
    { id: 'applications', label: 'My Applications', icon: Send },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div data-testid="labour-dashboard" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Labour Dashboard
          </h1>
          <p className="text-sm text-[#9BA3B5] mt-1">
            {user?.verified ? (
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Verified Worker</span>
            ) : (
              <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-yellow-400" /> Verification Pending</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9BA3B5] uppercase tracking-widest">Wallet</p>
          <p className="font-heading text-xl font-bold text-[#00E5FF]">Rs {walletBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Available Jobs</p>
          <p className="font-heading text-2xl font-bold text-white">{jobs.length}</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Applications</p>
          <p className="font-heading text-2xl font-bold text-white">{applications.length}</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Accepted</p>
          <p className="font-heading text-2xl font-bold text-emerald-400">{applications.filter(a => a.status === 'accepted').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#141E3A] rounded-lg border border-[#28385E] w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === t.id
                ? 'bg-[#00A8E8]/10 text-[#00A8E8] font-medium'
                : 'text-[#9BA3B5] hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Browse Jobs */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA3B5]" />
            <Input
              data-testid="browse-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search jobs by title or location..."
              className="pl-9 bg-[#141E3A] border-[#28385E] text-white focus:border-[#00A8E8] text-sm"
            />
          </div>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
              <Briefcase className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
              <p className="text-[#9BA3B5]">No jobs available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map(job => (
                <div key={job._id} data-testid={`browse-job-${job._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold text-white mb-1">{job.title}</h3>
                      <p className="text-sm text-[#9BA3B5] mb-3">{job.employer_name} {job.company_name ? `- ${job.company_name}` : ''}</p>
                      <p className="text-sm text-[#9BA3B5] line-clamp-2 mb-3">{job.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-[#9BA3B5]">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.labours_needed} needed</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.duration_days} days</span>
                        <span className="flex items-center gap-1 text-[#00E5FF]"><IndianRupee className="w-3.5 h-3.5" />Rs {job.pay_amount}/{job.pay_type}</span>
                        <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{job.project_type}</span>
                      </div>
                      {job.safety_precautions && (
                        <p className="text-xs text-[#9BA3B5] mt-2 italic">Safety: {job.safety_precautions}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      {appliedJobIds.includes(job._id) ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Applied</Badge>
                      ) : applyingTo === job._id ? (
                        <div className="space-y-2 w-48">
                          <Textarea
                            data-testid={`apply-msg-${job._id}`}
                            value={applyMsg}
                            onChange={e => setApplyMsg(e.target.value)}
                            placeholder="Why are you a fit?"
                            className="bg-[#0B132B] border-[#28385E] text-white text-xs"
                            rows={2}
                          />
                          <div className="flex gap-1">
                            <Button data-testid={`confirm-apply-${job._id}`} size="sm" onClick={() => handleApply(job._id)} className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white text-xs flex-1">Apply</Button>
                            <Button size="sm" variant="outline" onClick={() => setApplyingTo(null)} className="border-[#28385E] text-[#9BA3B5] bg-transparent text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button data-testid={`apply-btn-${job._id}`} size="sm" onClick={() => setApplyingTo(job._id)} className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white text-xs">
                          <Send className="w-3 h-3 mr-1" /> Apply
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
              <Send className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
              <p className="text-[#9BA3B5]">No applications yet. Browse jobs and apply!</p>
            </div>
          ) : (
            applications.map(app => (
              <div key={app._id} data-testid={`application-${app._id}`} className="p-4 rounded-lg bg-[#141E3A] border border-[#28385E]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{app.job_title}</h3>
                    <p className="text-sm text-[#9BA3B5] mt-1">{app.message || 'No message'}</p>
                  </div>
                  <Badge className={`${statusColors[app.status]} border text-xs`}>{app.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-xl">
          <div className="p-6 rounded-lg bg-[#141E3A] border border-[#28385E] space-y-4">
            <h3 className="font-heading text-lg font-semibold text-white">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Full Name</Label>
                <Input data-testid="profile-name" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Phone</Label>
                <Input data-testid="profile-phone" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
              </div>
            </div>
            <div>
              <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Aadhaar Number</Label>
              <Input data-testid="profile-aadhaar" value={profileForm.aadhaar_number} onChange={e => setProfileForm({...profileForm, aadhaar_number: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="XXXX XXXX XXXX" />
            </div>
            <div>
              <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Address</Label>
              <Input data-testid="profile-address" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Experience (Years)</Label>
                <Input data-testid="profile-exp" type="number" value={profileForm.experience_years} onChange={e => setProfileForm({...profileForm, experience_years: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Expected Daily Rate (Rs)</Label>
                <Input data-testid="profile-rate" type="number" value={profileForm.daily_rate} onChange={e => setProfileForm({...profileForm, daily_rate: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
              </div>
            </div>
            <div>
              <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Skills (comma separated)</Label>
              <Input data-testid="profile-skills" value={Array.isArray(profileForm.skills) ? profileForm.skills.join(', ') : profileForm.skills} onChange={e => setProfileForm({...profileForm, skills: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="Masonry, Plumbing, Painting" />
            </div>
            <div>
              <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Bio</Label>
              <Textarea data-testid="profile-bio" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" rows={3} />
            </div>
            <Button data-testid="save-profile-btn" type="submit" className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md">
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
