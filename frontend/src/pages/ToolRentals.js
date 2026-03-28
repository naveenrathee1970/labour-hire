import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Search, Wrench, IndianRupee, Package, ExternalLink
} from 'lucide-react';

export default function ToolRentals() {
  const { api } = useAuth();
  const [tools, setTools] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => { loadTools(); }, [category]);

  const loadTools = async () => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (searchTerm) params.append('search', searchTerm);
      const res = await api('get', `/tools?${params.toString()}`);
      setTools(res.data.tools || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = () => { loadTools(); };

  const categoryLabels = {
    power_tools: 'Power Tools',
    heavy_machinery: 'Heavy Machinery',
    safety_equipment: 'Safety Equipment',
    hand_tools: 'Hand Tools',
  };

  const categoryColors = {
    power_tools: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    heavy_machinery: 'bg-red-500/10 text-red-400 border-red-500/20',
    safety_equipment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    hand_tools: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="tools-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="tool-rentals-page" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Tool Rental Marketplace</h1>
        <p className="text-sm text-[#9BA3B5] mt-1">{total} tools available from verified vendors</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA3B5]" />
          <Input
            data-testid="tools-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search tools..."
            className="pl-9 bg-[#141E3A] border-[#28385E] text-white focus:border-[#00A8E8] text-sm"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="tools-category-filter" className="w-48 bg-[#141E3A] border-[#28385E] text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-[#141E3A] border-[#28385E]">
            <SelectItem value="all" className="text-white hover:bg-[#1D2A4D]">All Categories</SelectItem>
            <SelectItem value="power_tools" className="text-white hover:bg-[#1D2A4D]">Power Tools</SelectItem>
            <SelectItem value="heavy_machinery" className="text-white hover:bg-[#1D2A4D]">Heavy Machinery</SelectItem>
            <SelectItem value="safety_equipment" className="text-white hover:bg-[#1D2A4D]">Safety Equipment</SelectItem>
            <SelectItem value="hand_tools" className="text-white hover:bg-[#1D2A4D]">Hand Tools</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tools Grid */}
      {tools.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <Package className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No tools found. Try different filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => (
            <div key={tool._id} data-testid={`rental-tool-${tool._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading text-base font-semibold text-white">{tool.name}</h3>
                  <Badge className={`${categoryColors[tool.category]} border text-[10px] mt-1`}>
                    {categoryLabels[tool.category] || tool.category}
                  </Badge>
                </div>
                <Wrench className="w-5 h-5 text-[#00A8E8]" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-[#9BA3B5] line-clamp-2 mb-3">{tool.description}</p>
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-[#9BA3B5]">Daily Rate</span>
                  <span className="text-[#00E5FF] font-medium flex items-center gap-1"><IndianRupee className="w-3 h-3" />Rs {tool.daily_rate}</span>
                </div>
                {tool.weekly_rate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B5]">Weekly</span>
                    <span className="text-white">Rs {tool.weekly_rate}</span>
                  </div>
                )}
                {tool.monthly_rate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B5]">Monthly</span>
                    <span className="text-white">Rs {tool.monthly_rate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#9BA3B5]">Available</span>
                  <span className="text-white">{tool.available_quantity} unit(s)</span>
                </div>
              </div>
              <p className="text-xs text-[#9BA3B5]">Vendor: {tool.vendor_name}</p>
              {tool.vendor_url && (
                <a href={tool.vendor_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00A8E8] hover:text-[#38BDF8] flex items-center gap-1 mt-1">
                  Visit vendor <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
