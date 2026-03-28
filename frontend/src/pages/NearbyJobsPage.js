import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import {
  MapPin, Navigation, Briefcase, IndianRupee, Clock,
  Users, Shield, Search, Send, Loader2, Crosshair,
  MapPinned, Radar, AlertCircle
} from 'lucide-react';

export default function NearbyJobsPage() {
  const { user, api } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applyingTo, setApplyingTo] = useState(null);
  const [applyMsg, setApplyMsg] = useState('');

  // Location state
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [radiusKm, setRadiusKm] = useState(50);
  const [projectType, setProjectType] = useState('all');
  const [locationSet, setLocationSet] = useState(false);

  // Load user's saved location on mount
  useEffect(() => {
    loadProfile();
    loadApplications();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api('get', `/profile/${user.id}`);
      const p = res.data;
      if (p.latitude && p.longitude) {
        setLat(p.latitude);
        setLng(p.longitude);
        setRadiusKm(p.preferred_radius_km || 50);
        setLocationName(p.address || 'Saved location');
        setLocationSet(true);
      }
    } catch (err) { console.error(err); }
  };

  const loadApplications = async () => {
    try {
      const res = await api('get', '/applications');
      setApplications(res.data || []);
    } catch {}
  };

  const searchNearby = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        radius_km: String(radiusKm),
      });
      if (projectType && projectType !== 'all') params.append('project_type', projectType);
      const res = await api('get', `/jobs/nearby?${params.toString()}`);
      setJobs(res.data.jobs || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [lat, lng, radiusKm, projectType, api]);

  useEffect(() => {
    if (locationSet && lat && lng) {
      searchNearby();
    }
  }, [locationSet, lat, lng, radiusKm, projectType, searchNearby]);

  const handleGeocode = async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true);
    try {
      const res = await api('get', `/geocode?address=${encodeURIComponent(addressInput)}`);
      setLat(res.data.lat);
      setLng(res.data.lng);
      setLocationName(res.data.display_name || addressInput);
      setLocationSet(true);
      // Save to profile
      await api('put', '/profile', {
        latitude: res.data.lat,
        longitude: res.data.lng,
        preferred_radius_km: radiusKm,
        address: addressInput,
      });
    } catch (err) {
      alert('Could not find that location. Try a more specific address.');
    } finally { setGeocoding(false); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        setLocationName(`${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
        setLocationSet(true);
        setDetectingLoc(false);
        // Save to profile
        try {
          await api('put', '/profile', {
            latitude: newLat,
            longitude: newLng,
            preferred_radius_km: radiusKm,
          });
        } catch {}
      },
      () => {
        alert('Unable to detect location. Please enter your address manually.');
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRadiusChange = async (value) => {
    const newRadius = value[0];
    setRadiusKm(newRadius);
    if (lat && lng) {
      try {
        await api('put', '/profile', { preferred_radius_km: newRadius });
      } catch {}
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api('post', '/applications', { job_id: jobId, message: applyMsg });
      setApplyingTo(null);
      setApplyMsg('');
      loadApplications();
    } catch (err) { console.error(err); }
  };

  const appliedJobIds = applications.map(a => a.job_id);

  const distanceColor = (km) => {
    if (km <= 5) return 'text-emerald-400';
    if (km <= 15) return 'text-[#00E5FF]';
    if (km <= 30) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const distanceLabel = (km) => {
    if (km <= 5) return 'Very Close';
    if (km <= 15) return 'Nearby';
    if (km <= 30) return 'Moderate';
    return 'Far';
  };

  return (
    <div data-testid="nearby-jobs-page" className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Nearby Jobs
        </h1>
        <p className="text-sm text-[#9BA3B5] mt-1">
          Find jobs matching your location and preferences
        </p>
      </div>

      {/* Location Setup Card */}
      <div className="p-6 rounded-lg bg-[#141E3A] border border-[#28385E]">
        <div className="flex items-center gap-2 mb-4">
          <MapPinned className="w-5 h-5 text-[#00A8E8]" />
          <h3 className="font-heading text-lg font-semibold text-white">Your Location</h3>
        </div>

        {locationSet && locationName && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-[#00A8E8]/5 border border-[#00A8E8]/20">
            <MapPin className="w-4 h-4 text-[#00A8E8] flex-shrink-0" />
            <p className="text-sm text-[#00A8E8] truncate">{locationName}</p>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] ml-auto flex-shrink-0">
              Active
            </Badge>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Enter Address / City</Label>
            <div className="flex gap-2 mt-1">
              <Input
                data-testid="location-address-input"
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGeocode()}
                placeholder="e.g. Mumbai, Maharashtra"
                className="bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]"
              />
              <Button
                data-testid="geocode-btn"
                onClick={handleGeocode}
                disabled={geocoding || !addressInput.trim()}
                className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md px-4"
              >
                {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="text-[#9BA3B5] text-sm">or</div>
          <Button
            data-testid="detect-location-btn"
            onClick={handleDetectLocation}
            disabled={detectingLoc}
            variant="outline"
            className="border-[#28385E] text-[#9BA3B5] hover:text-white hover:border-[#00A8E8] bg-transparent"
          >
            {detectingLoc ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Detecting...</>
            ) : (
              <><Crosshair className="w-4 h-4 mr-2" /> Use My Location</>
            )}
          </Button>
        </div>

        {/* Radius Slider */}
        {locationSet && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-[#00A8E8]" />
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Search Radius</Label>
              </div>
              <span className="text-sm font-heading font-bold text-[#00A8E8]">{radiusKm} km</span>
            </div>
            <Slider
              data-testid="radius-slider"
              value={[radiusKm]}
              onValueChange={handleRadiusChange}
              min={5}
              max={200}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-[#9BA3B5]">
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
              <span>200 km</span>
            </div>
          </div>
        )}

        {/* Project Type Filter */}
        {locationSet && (
          <div className="mt-4 flex items-center gap-3">
            <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em] flex-shrink-0">Filter</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger data-testid="nearby-project-filter" className="w-48 bg-[#0B132B] border-[#28385E] text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-[#141E3A] border-[#28385E]">
                <SelectItem value="all" className="text-white hover:bg-[#1D2A4D]">All Types</SelectItem>
                <SelectItem value="residential" className="text-white hover:bg-[#1D2A4D]">Residential</SelectItem>
                <SelectItem value="commercial" className="text-white hover:bg-[#1D2A4D]">Commercial</SelectItem>
                <SelectItem value="industrial" className="text-white hover:bg-[#1D2A4D]">Industrial</SelectItem>
                <SelectItem value="infrastructure" className="text-white hover:bg-[#1D2A4D]">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
            <Button
              data-testid="refresh-nearby-btn"
              onClick={searchNearby}
              variant="outline"
              className="border-[#28385E] text-[#9BA3B5] hover:text-white hover:border-[#00A8E8] bg-transparent text-xs"
            >
              <Search className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {!locationSet ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <Navigation className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5] text-lg mb-2">Set your location to find nearby jobs</p>
          <p className="text-[#9BA3B5] text-sm">Enter an address or use your current location above</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48" data-testid="nearby-loading">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#9BA3B5]">Searching within {radiusKm} km...</p>
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <AlertCircle className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5] text-lg mb-2">No jobs found within {radiusKm} km</p>
          <p className="text-[#9BA3B5] text-sm">Try increasing your search radius or changing location</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#9BA3B5]">
              <span className="text-[#00A8E8] font-semibold">{total}</span> job(s) within <span className="text-[#00A8E8] font-semibold">{radiusKm} km</span>
            </p>
          </div>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job._id} data-testid={`nearby-job-${job._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8]/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading text-lg font-semibold text-white">{job.title}</h3>
                      {job.distance_km !== undefined && (
                        <Badge className={`${distanceColor(job.distance_km)} bg-transparent border border-current/20 text-xs font-mono`}>
                          <MapPin className="w-3 h-3 mr-1" />
                          {job.distance_km} km — {distanceLabel(job.distance_km)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#9BA3B5] mb-1">{job.employer_name} {job.company_name ? `- ${job.company_name}` : ''}</p>
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
                    {user?.role === 'labour' && (
                      appliedJobIds.includes(job._id) ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Applied</Badge>
                      ) : applyingTo === job._id ? (
                        <div className="space-y-2 w-48">
                          <Textarea
                            data-testid={`nearby-apply-msg-${job._id}`}
                            value={applyMsg}
                            onChange={e => setApplyMsg(e.target.value)}
                            placeholder="Why are you a fit?"
                            className="bg-[#0B132B] border-[#28385E] text-white text-xs"
                            rows={2}
                          />
                          <div className="flex gap-1">
                            <Button data-testid={`nearby-confirm-apply-${job._id}`} size="sm" onClick={() => handleApply(job._id)} className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white text-xs flex-1">Apply</Button>
                            <Button size="sm" variant="outline" onClick={() => setApplyingTo(null)} className="border-[#28385E] text-[#9BA3B5] bg-transparent text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button data-testid={`nearby-apply-btn-${job._id}`} size="sm" onClick={() => setApplyingTo(job._id)} className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white text-xs">
                          <Send className="w-3 h-3 mr-1" /> Apply
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
