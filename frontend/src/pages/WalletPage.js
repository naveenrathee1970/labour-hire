import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, IndianRupee,
  CreditCard, Send, Plus, Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';

export default function WalletPage() {
  const { user, api } = useAuth();
  const [wallet, setWallet] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [transferForm, setTransferForm] = useState({ to_user_id: '', amount: '', description: '' });
  const [labours, setLabours] = useState([]);
  const [searchLabour, setSearchLabour] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [walletRes, txnRes, laboursRes] = await Promise.all([
        api('get', '/wallet'),
        api('get', '/transactions'),
        api('get', '/labours?limit=100'),
      ]);
      setWallet(walletRes.data);
      setTransactions(txnRes.data);
      setLabours(laboursRes.data.labours || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleTopup = async () => {
    if (!topupAmount || Number(topupAmount) <= 0) return;
    try {
      await api('post', '/wallet/topup', { amount: Number(topupAmount) });
      setTopupAmount('');
      setShowTopup(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleTransfer = async () => {
    if (!transferForm.to_user_id || !transferForm.amount || Number(transferForm.amount) <= 0) return;
    try {
      await api('post', '/wallet/transfer', {
        to_user_id: transferForm.to_user_id,
        amount: Number(transferForm.amount),
        description: transferForm.description,
      });
      setTransferForm({ to_user_id: '', amount: '', description: '' });
      setShowTransfer(false);
      loadData();
    } catch (err) { console.error(err); }
  };

  const filteredLabours = labours.filter(l =>
    l.name?.toLowerCase().includes(searchLabour.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchLabour.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="wallet-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="wallet-page" className="space-y-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Wallet & Transactions</h1>

      {/* Balance Card */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-[#141E3A] to-[#1D2A4D] border border-[#28385E] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A8E8]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#9BA3B5] font-semibold mb-2">Available Balance</p>
        <p className="font-heading text-4xl font-bold text-white mb-4">
          <span className="text-[#00A8E8]">Rs</span> {(wallet.balance || 0).toLocaleString()}
        </p>
        <div className="flex gap-3">
          <Dialog open={showTopup} onOpenChange={setShowTopup}>
            <DialogTrigger asChild>
              <Button data-testid="topup-btn" className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md">
                <Plus className="w-4 h-4 mr-2" /> Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141E3A] border-[#28385E] text-white max-w-sm">
              <DialogHeader><DialogTitle className="font-heading text-xl text-white">Add Funds</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Amount (Rs)</Label>
                  <Input data-testid="topup-amount" type="number" min="1" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="Enter amount" />
                </div>
                <div className="flex gap-2">
                  {[500, 1000, 5000, 10000].map(amt => (
                    <button key={amt} onClick={() => setTopupAmount(String(amt))} className="px-3 py-1.5 rounded-md text-xs bg-[#0B132B] border border-[#28385E] text-[#9BA3B5] hover:text-[#00A8E8] hover:border-[#00A8E8] transition-colors">
                      Rs {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Button data-testid="confirm-topup" onClick={handleTopup} className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5">
                  Add Rs {topupAmount || '0'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {(user?.role === 'employer' || user?.role === 'admin') && (
            <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
              <DialogTrigger asChild>
                <Button data-testid="transfer-btn" variant="outline" className="border-[#28385E] text-white hover:border-[#00A8E8] bg-transparent">
                  <Send className="w-4 h-4 mr-2" /> Pay Wages
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#141E3A] border-[#28385E] text-white max-w-md">
                <DialogHeader><DialogTitle className="font-heading text-xl text-white">Transfer to Worker</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Search Worker</Label>
                    <Input data-testid="search-worker" value={searchLabour} onChange={e => setSearchLabour(e.target.value)} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="Search by name or email" />
                  </div>
                  {searchLabour && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredLabours.map(l => (
                        <button
                          key={l._id}
                          data-testid={`select-worker-${l._id}`}
                          onClick={() => { setTransferForm({...transferForm, to_user_id: l._id}); setSearchLabour(l.name); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            transferForm.to_user_id === l._id
                              ? 'bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20'
                              : 'text-[#9BA3B5] hover:text-white hover:bg-[#1D2A4D]'
                          }`}
                        >
                          {l.name} — {l.email}
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Amount (Rs)</Label>
                    <Input data-testid="transfer-amount" type="number" min="1" value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" />
                  </div>
                  <div>
                    <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Description</Label>
                    <Input data-testid="transfer-desc" value={transferForm.description} onChange={e => setTransferForm({...transferForm, description: e.target.value})} className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]" placeholder="e.g. Daily wage payment" />
                  </div>
                  <Button data-testid="confirm-transfer" onClick={handleTransfer} className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5">
                    Transfer Rs {transferForm.amount || '0'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-heading text-xl font-semibold text-white mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
            <CreditCard className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
            <p className="text-[#9BA3B5]">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(txn => {
              const isIncoming = txn.to_user_id === user.id;
              return (
                <div key={txn._id} data-testid={`txn-${txn._id}`} className="p-4 rounded-lg bg-[#141E3A] border border-[#28385E] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isIncoming ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {isIncoming ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {txn.type === 'topup' ? 'Wallet Top-up' : isIncoming ? `From ${txn.from_user_name || 'System'}` : `To ${txn.to_user_name || 'User'}`}
                      </p>
                      <p className="text-xs text-[#9BA3B5]">{txn.description} {txn.created_at ? `| ${new Date(txn.created_at).toLocaleDateString()}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-heading font-bold ${isIncoming ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isIncoming ? '+' : '-'}Rs {txn.amount?.toLocaleString()}
                    </p>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">{txn.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
