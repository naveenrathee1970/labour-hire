import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Users, Search, CheckCircle, MapPin, Star, IndianRupee
} from 'lucide-react';

export default function LaboursPage() {
  const { api } = useAuth();
  const [labours, setLabours] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => { loadLabours(); }, [verifiedOnly]);

  const loadLabours = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (verifiedOnly) params.append('verified', 'true');
      const res = await api('get', `/labours?${params.toString()}`);
      setLabours(res.data.labours || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const labourAvatars = [
    'https://images.unsplash.com/photo-1646227655588-b44f246c04fb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwzfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzQ3MTEzOTF8MA&ixlib=rb-4.1.0&q=85&w=100&h=100',
    'https://images.pexels.com/photos/8960995/pexels-photo-8960995.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100',
    'https://images.unsplash.com/photo-1672748341520-6a839e6c05bb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzQ3MTEzOTF8MA&ixlib=rb-4.1.0&q=85&w=100&h=100',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="labours-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="labours-page" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Find Labour</h1>
        <p className="text-sm text-[#9BA3B5] mt-1">{total} registered worker(s)</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BA3B5]" />
          <Input
            data-testid="labours-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadLabours()}
            placeholder="Search by name or skills..."
            className="pl-9 bg-[#141E3A] border-[#28385E] text-white focus:border-[#00A8E8] text-sm"
          />
        </div>
        <button
          data-testid="verified-filter"
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
            verifiedOnly
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'text-[#9BA3B5] bg-[#141E3A] border border-[#28385E] hover:text-white'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" /> Verified Only
        </button>
      </div>

      {/* Labour Cards */}
      {labours.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <Users className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No workers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {labours.map((labour, idx) => (
            <div key={labour._id} data-testid={`labour-card-${labour._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-all hover:-translate-y-1">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={labourAvatars[idx % labourAvatars.length]}
                  alt={labour.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#28385E]"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-semibold text-white">{labour.name}</h3>
                    {labour.verified && (
                      <span className="flex items-center gap-0.5 text-emerald-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9BA3B5]">{labour.email}</p>
                </div>
              </div>
              {labour.bio && <p className="text-sm text-[#9BA3B5] mb-3 line-clamp-2">{labour.bio}</p>}
              <div className="space-y-1.5 text-sm">
                {labour.experience_years > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B5]">Experience</span>
                    <span className="text-white">{labour.experience_years} years</span>
                  </div>
                )}
                {labour.daily_rate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#9BA3B5]">Daily Rate</span>
                    <span className="text-[#00E5FF] font-medium">Rs {labour.daily_rate}</span>
                  </div>
                )}
                {labour.address && (
                  <div className="flex items-center gap-1 text-[#9BA3B5] text-xs">
                    <MapPin className="w-3 h-3" /> {labour.address}
                  </div>
                )}
              </div>
              {labour.skills && labour.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {labour.skills.map(skill => (
                    <Badge key={skill} className="bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20 text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
