import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Wrench, Plus, IndianRupee, Search, X, Package } from 'lucide-react';

export default function VendorDashboard() {
  const { user, api } = useAuth();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const [form, setForm] = useState({
    name: '', description: '', category: 'power_tools',
    daily_rate: 0, weekly_rate: 0, monthly_rate: 0,
    available_quantity: 1, vendor_url: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [toolsRes, walletRes] = await Promise.all([
        api('get', `/tools?vendor_id=${user.id}`),
        api('get', '/wallet')
      ]);
      setTools(toolsRes.data.tools || []);
      setWalletBalance(walletRes.data.balance || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api('post', '/tools', {
        ...form,
        daily_rate: Number(form.daily_rate),
        weekly_rate: Number(form.weekly_rate) || null,
        monthly_rate: Number(form.monthly_rate) || null,
        available_quantity: Number(form.available_quantity),
      });
      setShowCreate(false);
      setForm({ name: '', description: '', category: 'power_tools', daily_rate: 0, weekly_rate: 0, monthly_rate: 0, available_quantity: 1, vendor_url: '' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    try {
      await api('delete', `/tools/${id}`);
      loadData();
    } catch (err) { console.error(err); }
  };

  const categoryLabels = {
    power_tools: 'Power Tools',
    heavy_machinery: 'Heavy Machinery',
    safety_equipment: 'Safety Equipment',
    hand_tools: 'Hand Tools',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="vendor-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="vendor-dashboard" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Vendor Dashboard</h1>
          <p className="text-sm text-[#9BA3B5] mt-1">Manage your tool and equipment rentals</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="add-tool-btn" className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md">
              <Plus className="w-4 h-4 mr-2" /> Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141E3A] border-[#28385E] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-white">Add New Tool</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Tool Name</Label>
                <Input data-testid="tool-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="e.g. Concrete Mixer" />
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger data-testid="tool-category-select" className="mt-1 bg-[#0B132B] border-[#28385E] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#141E3A] border-[#28385E]">
                    <SelectItem value="power_tools" className="text-white hover:bg-[#1D2A4D]">Power Tools</SelectItem>
                    <SelectItem value="heavy_machinery" className="text-white hover:bg-[#1D2A4D]">Heavy Machinery</SelectItem>
                    <SelectItem value="safety_equipment" className="text-white hover:bg-[#1D2A4D]">Safety Equipment</SelectItem>
                    <SelectItem value="hand_tools" className="text-white hover:bg-[#1D2A4D]">Hand Tools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Description</Label>
                <Textarea data-testid="tool-desc-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Daily Rate (Rs)</Label>
                  <Input data-testid="tool-daily-rate" type="number" min="0" value={form.daily_rate} onChange={e => setForm({...form, daily_rate: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Weekly Rate</Label>
                  <Input data-testid="tool-weekly-rate" type="number" min="0" value={form.weekly_rate} onChange={e => setForm({...form, weekly_rate: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Monthly Rate</Label>
                  <Input data-testid="tool-monthly-rate" type="number" min="0" value={form.monthly_rate} onChange={e => setForm({...form, monthly_rate: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Quantity</Label>
                  <Input data-testid="tool-qty-input" type="number" min="1" value={form.available_quantity} onChange={e => setForm({...form, available_quantity: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Vendor URL</Label>
                  <Input data-testid="tool-url-input" value={form.vendor_url} onChange={e => setForm({...form, vendor_url: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="https://..." />
                </div>
              </div>
              <Button data-testid="submit-tool-btn" type="submit" className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5">
                Add Tool
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Total Tools</p>
          <p className="font-heading text-2xl font-bold text-white">{tools.length}</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Available</p>
          <p className="font-heading text-2xl font-bold text-emerald-400">{tools.filter(t => t.status === 'available').length}</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Wallet Balance</p>
          <p className="font-heading text-2xl font-bold text-[#00E5FF]">Rs {walletBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Tools list */}
      {tools.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <Package className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No tools listed yet. Add your first tool!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => (
            <div key={tool._id} data-testid={`tool-card-${tool._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading text-base font-semibold text-white">{tool.name}</h3>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] mt-1">
                    {categoryLabels[tool.category] || tool.category}
                  </Badge>
                </div>
                <Button
                  data-testid={`delete-tool-${tool._id}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(tool._id)}
                  className="text-[#9BA3B5] hover:text-[#EF4444] p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-[#9BA3B5] line-clamp-2 mb-3">{tool.description}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-[#9BA3B5]">
                  <span>Daily</span>
                  <span className="text-[#00E5FF] font-medium">Rs {tool.daily_rate}</span>
                </div>
                {tool.weekly_rate > 0 && (
                  <div className="flex justify-between text-[#9BA3B5]">
                    <span>Weekly</span>
                    <span className="text-white">Rs {tool.weekly_rate}</span>
                  </div>
                )}
                {tool.monthly_rate > 0 && (
                  <div className="flex justify-between text-[#9BA3B5]">
                    <span>Monthly</span>
                    <span className="text-white">Rs {tool.monthly_rate}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#9BA3B5]">
                  <span>Quantity</span>
                  <span className="text-white">{tool.available_quantity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
