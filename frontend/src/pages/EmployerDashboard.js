import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  Briefcase, Plus, Users, IndianRupee, MapPin, Clock, Shield,
  ChevronDown, Search, X, Loader2, Navigation
} from 'lucide-react';

export default function EmployerDashboard() {
  const { user, api } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', project_type: 'residential', location: '',
    labours_needed: 1, duration_days: 30, pay_type: 'daily', pay_amount: 0,
    safety_precautions: '', skills_required: [], licence_number: '',
    latitude: null, longitude: null
  });
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsRes, walletRes] = await Promise.all([
        api('get', `/jobs?employer_id=${user.id}`),
        api('get', '/wallet')
      ]);
      setJobs(jobsRes.data.jobs || []);
      setStats({
        total_jobs: jobsRes.data.total || 0,
        open_jobs: (jobsRes.data.jobs || []).filter(j => j.status === 'open').length,
        wallet_balance: walletRes.data.balance || 0,
        total_applications: (jobsRes.data.jobs || []).reduce((s, j) => s + (j.applications_count || 0), 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeLocation = async () => {
    if (!form.location.trim()) return;
    setGeocoding(true);
    setGeoStatus('');
    try {
      const res = await api('get', `/geocode?address=${encodeURIComponent(form.location)}`);
      setForm({ ...form, latitude: res.data.lat, longitude: res.data.lng });
      setGeoStatus(`Located: ${res.data.lat.toFixed(4)}, ${res.data.lng.toFixed(4)}`);
    } catch {
      setGeoStatus('Could not locate. Job will auto-geocode on creation.');
    } finally { setGeocoding(false); }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await api('post', '/jobs', {
        ...form,
        pay_amount: Number(form.pay_amount),
        labours_needed: Number(form.labours_needed),
        duration_days: Number(form.duration_days),
      });
      setShowCreate(false);
      setForm({
        title: '', description: '', project_type: 'residential', location: '',
        labours_needed: 1, duration_days: 30, pay_type: 'daily', pay_amount: 0,
        safety_precautions: '', skills_required: [], licence_number: '',
        latitude: null, longitude: null
      });
      setGeoStatus('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await api('delete', `/jobs/${jobId}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (jobId, status) => {
    try {
      await api('patch', `/jobs/${jobId}/status`, { status });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statCards = [
    { label: 'Total Jobs', value: stats.total_jobs || 0, icon: Briefcase, color: '#00A8E8' },
    { label: 'Open Positions', value: stats.open_jobs || 0, icon: Users, color: '#10B981' },
    { label: 'Applications', value: stats.total_applications || 0, icon: ChevronDown, color: '#F59E0B' },
    { label: 'Wallet Balance', value: `Rs ${(stats.wallet_balance || 0).toLocaleString()}`, icon: IndianRupee, color: '#00E5FF' },
  ];

  const statusColors = {
    open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-red-500/10 text-red-400 border-red-500/20',
    in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="employer-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="employer-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Employer Dashboard
          </h1>
          <p className="text-sm text-[#9BA3B5] mt-1">Welcome back, {user?.name}</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-job-btn" className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md">
              <Plus className="w-4 h-4 mr-2" /> Post Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141E3A] border-[#28385E] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-white">Post a New Job</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateJob} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Job Title</Label>
                  <Input data-testid="job-title-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="e.g. Mason for Building Project" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Project Type</Label>
                  <Select value={form.project_type} onValueChange={v => setForm({...form, project_type: v})}>
                    <SelectTrigger data-testid="project-type-select" className="mt-1 bg-[#0B132B] border-[#28385E] text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#141E3A] border-[#28385E]">
                      <SelectItem value="residential" className="text-white hover:bg-[#1D2A4D]">Residential</SelectItem>
                      <SelectItem value="commercial" className="text-white hover:bg-[#1D2A4D]">Commercial</SelectItem>
                      <SelectItem value="industrial" className="text-white hover:bg-[#1D2A4D]">Industrial</SelectItem>
                      <SelectItem value="infrastructure" className="text-white hover:bg-[#1D2A4D]">Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Description</Label>
                <Textarea data-testid="job-desc-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="Describe the job requirements..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Location</Label>
                  <div className="flex gap-2 mt-1">
                    <Input data-testid="job-location-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} required className="bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="City, State" />
                    <Button type="button" data-testid="job-geocode-btn" onClick={handleGeocodeLocation} disabled={geocoding || !form.location.trim()} variant="outline" className="border-[#28385E] text-[#9BA3B5] hover:text-[#00A8E8] hover:border-[#00A8E8] bg-transparent px-3 flex-shrink-0">
                      {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    </Button>
                  </div>
                  {geoStatus && <p className="text-[10px] text-[#00A8E8] mt-1">{geoStatus}</p>}
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Licence Number</Label>
                  <Input data-testid="job-licence-input" value={form.licence_number} onChange={e => setForm({...form, licence_number: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="REG-XXXXX" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Labours Needed</Label>
                  <Input data-testid="labours-needed-input" type="number" min="1" value={form.labours_needed} onChange={e => setForm({...form, labours_needed: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Duration (Days)</Label>
                  <Input data-testid="duration-input" type="number" min="1" value={form.duration_days} onChange={e => setForm({...form, duration_days: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Pay Amount (Rs)</Label>
                  <Input data-testid="pay-amount-input" type="number" min="0" value={form.pay_amount} onChange={e => setForm({...form, pay_amount: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Pay Type</Label>
                <Select value={form.pay_type} onValueChange={v => setForm({...form, pay_type: v})}>
                  <SelectTrigger data-testid="pay-type-select" className="mt-1 bg-[#0B132B] border-[#28385E] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#141E3A] border-[#28385E]">
                    <SelectItem value="daily" className="text-white hover:bg-[#1D2A4D]">Daily</SelectItem>
                    <SelectItem value="weekly" className="text-white hover:bg-[#1D2A4D]">Weekly</SelectItem>
                    <SelectItem value="monthly" className="text-white hover:bg-[#1D2A4D]">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Safety Precautions</Label>
                <Textarea data-testid="safety-input" value={form.safety_precautions} onChange={e => setForm({...form, safety_precautions: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="List safety measures provided..." rows={2} />
              </div>
              <Button data-testid="submit-job-btn" type="submit" className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5">
                Post Job
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold">{s.label}</span>
              <s.icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={1.5} />
            </div>
            <p className="font-heading text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-white">Your Jobs</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA3B5]" />
            <Input
              data-testid="job-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search jobs..."
              className="pl-9 bg-[#141E3A] border-[#28385E] text-white focus:border-[#00A8E8] text-sm"
            />
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
            <Briefcase className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
            <p className="text-[#9BA3B5]">No jobs posted yet. Create your first job listing!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job._id} data-testid={`job-card-${job._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading text-lg font-semibold text-white">{job.title}</h3>
                      <Badge className={`${statusColors[job.status]} border text-xs`}>{job.status}</Badge>
                    </div>
                    <p className="text-sm text-[#9BA3B5] line-clamp-2 mb-3">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-[#9BA3B5]">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{job.labours_needed} needed</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.duration_days} days</span>
                      <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Rs {job.pay_amount}/{job.pay_type}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{job.project_type}</span>
                      {job.applications_count > 0 && (
                        <span className="text-[#00A8E8]">{job.applications_count} applicant(s)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {job.status === 'open' && (
                      <Button
                        data-testid={`close-job-${job._id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(job._id, 'closed')}
                        className="border-[#28385E] text-[#9BA3B5] hover:text-white hover:border-[#F59E0B] bg-transparent text-xs"
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      data-testid={`delete-job-${job._id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteJob(job._id)}
                      className="border-[#28385E] text-[#9BA3B5] hover:text-[#EF4444] hover:border-[#EF4444] bg-transparent text-xs"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
