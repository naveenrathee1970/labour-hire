import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { HardHat, ArrowRight, Shield, Wallet, Users, Wrench, Eye, EyeOff } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'employer', phone: '' });

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await login(form.email, form.password);
      } else {
        result = await register(form.email, form.password, form.name, form.role, form.phone);
      }
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: 'Verified Labourers', desc: 'Government-verified workers with Aadhaar authentication' },
    { icon: Shield, title: 'Secure Hiring', desc: 'Licensed employers with complete credential verification' },
    { icon: Wallet, title: 'Direct Payments', desc: 'Wage transfers directly to worker accounts' },
    { icon: Wrench, title: 'Tool Rentals', desc: 'Equipment marketplace from verified vendors' },
  ];

  return (
    <div className="min-h-screen bg-[#0B132B] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("https://images.pexels.com/photos/4458205/pexels-photo-4458205.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B132B]/95 via-[#0B132B]/90 to-[#0B132B]" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <HardHat className="w-8 h-8 text-[#00A8E8]" />
          <span className="font-heading font-bold text-xl text-white tracking-tight">LabourHub</span>
        </div>
        <Button
          data-testid="get-started-btn"
          onClick={() => setShowAuth(true)}
          className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md px-6 font-medium"
        >
          Get Started <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-24">
        {!showAuth ? (
          <div className="animate-fade-in">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#00A8E8] mb-4">
                Government Registered Platform
              </p>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tighter leading-[1.1] mb-6">
                Hire Verified Labour.<br />
                <span className="text-[#00A8E8]">Build With Trust.</span>
              </h1>
              <p className="text-base text-[#9BA3B5] leading-relaxed max-w-lg mb-8">
                Connect with government-authenticated workers, manage projects, rent equipment, and process payments — all from one secure dashboard.
              </p>
              <div className="flex gap-3">
                <Button
                  data-testid="hero-get-started-btn"
                  onClick={() => setShowAuth(true)}
                  className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md px-8 py-6 text-base font-medium"
                >
                  Start Hiring <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  data-testid="hero-browse-btn"
                  variant="outline"
                  onClick={() => { setShowAuth(true); setIsLogin(false); }}
                  className="border-[#28385E] text-[#9BA3B5] hover:text-white hover:border-[#00A8E8] rounded-md px-8 py-6 text-base bg-transparent"
                >
                  Register as Labour
                </Button>
              </div>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`p-6 rounded-lg bg-[#141E3A] border border-[#28385E] hover:border-[#00A8E8] transition-all duration-200 hover:-translate-y-1 opacity-0 animate-fade-in stagger-${i + 1}`}
                >
                  <f.icon className="w-8 h-8 text-[#00A8E8] mb-4" strokeWidth={1.5} />
                  <h3 className="font-heading text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-[#9BA3B5]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Auth Form */
          <div className="flex justify-center animate-fade-in">
            <div className="w-full max-w-md p-8 rounded-lg bg-[#141E3A] border border-[#28385E]">
              <div className="flex items-center gap-3 mb-6">
                <HardHat className="w-7 h-7 text-[#00A8E8]" />
                <h2 className="font-heading text-2xl font-bold text-white tracking-tight">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
              </div>

              {error && (
                <div data-testid="auth-error" className="mb-4 p-3 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
                {!isLogin && (
                  <>
                    <div>
                      <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Full Name</Label>
                      <Input
                        data-testid="name-input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required={!isLogin}
                        className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8] focus:ring-[#00A8E8]/20"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Role</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                        <SelectTrigger data-testid="role-select" className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141E3A] border-[#28385E]">
                          <SelectItem value="employer" className="text-white hover:bg-[#1D2A4D]">Employer / Builder</SelectItem>
                          <SelectItem value="labour" className="text-white hover:bg-[#1D2A4D]">Labour / Worker</SelectItem>
                          <SelectItem value="vendor" className="text-white hover:bg-[#1D2A4D]">Vendor / Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Phone</Label>
                      <Input
                        data-testid="phone-input"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8] focus:ring-[#00A8E8]/20"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Email</Label>
                  <Input
                    data-testid="email-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8] focus:ring-[#00A8E8]/20"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Password</Label>
                  <div className="relative">
                    <Input
                      data-testid="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8] focus:ring-[#00A8E8]/20 pr-10"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9BA3B5] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  data-testid="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5 font-medium mt-2"
                >
                  {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  data-testid="toggle-auth-mode"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-sm text-[#9BA3B5] hover:text-[#00A8E8] transition-colors"
                >
                  {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
                </button>
              </div>

              <button
                onClick={() => setShowAuth(false)}
                className="mt-4 text-xs text-[#9BA3B5] hover:text-white transition-colors block mx-auto"
              >
                Back to home
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
