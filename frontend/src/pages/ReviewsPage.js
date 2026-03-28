import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  Star, MessageCircle, User, ThumbsUp, Plus
} from 'lucide-react';

function StarRating({ rating, onRate, interactive = false, size = 'w-5 h-5' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRate && onRate(i)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={`${size} ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-[#28385E]'}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

export default function ReviewsPage() {
  const { user, api } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [myGiven, setMyGiven] = useState([]);
  const [stats, setStats] = useState({ avg_rating: 0, review_count: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [showCreate, setShowCreate] = useState(false);
  const [labours, setLabours] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  const [form, setForm] = useState({
    reviewed_user_id: '',
    reviewed_user_name: '',
    rating: 0,
    comment: '',
    job_id: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [reviewsRes, givenRes] = await Promise.all([
        api('get', `/reviews/${user.id}`),
        api('get', '/reviews/given/me'),
      ]);
      setReviews(reviewsRes.data.reviews || []);
      setStats({ avg_rating: reviewsRes.data.avg_rating || 0, review_count: reviewsRes.data.review_count || 0 });
      setMyGiven(givenRes.data || []);
      // Load users for creating reviews
      try {
        const laboursRes = await api('get', '/labours?limit=100');
        setLabours(laboursRes.data.labours || []);
      } catch {}
      try {
        if (user.role === 'admin') {
          const usersRes = await api('get', '/admin/users');
          setAllUsers(usersRes.data || []);
        }
      } catch {}
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!form.reviewed_user_id || form.rating === 0) return;
    try {
      await api('post', '/reviews', {
        reviewed_user_id: form.reviewed_user_id,
        rating: form.rating,
        comment: form.comment,
        job_id: form.job_id || null,
      });
      setShowCreate(false);
      setForm({ reviewed_user_id: '', reviewed_user_name: '', rating: 0, comment: '', job_id: '' });
      loadData();
    } catch (err) { console.error(err); }
  };

  const searchableUsers = user.role === 'admin' ? allUsers : labours;
  const filteredUsers = searchableUsers.filter(u =>
    u._id !== user.id &&
    (u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchUser.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="reviews-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="reviews-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Reviews & Ratings</h1>
          <p className="text-sm text-[#9BA3B5] mt-1">Mutual review system (1-5 scale)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="write-review-btn" className="bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md">
              <Plus className="w-4 h-4 mr-2" /> Write Review
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141E3A] border-[#28385E] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-white">Write a Review</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitReview} className="space-y-4 mt-4">
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Search User</Label>
                <Input
                  data-testid="review-search-user"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search by name..."
                  className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]"
                />
              </div>
              {searchUser && (
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {filteredUsers.slice(0, 5).map(u => (
                    <button
                      key={u._id}
                      type="button"
                      data-testid={`review-select-${u._id}`}
                      onClick={() => {
                        setForm({ ...form, reviewed_user_id: u._id, reviewed_user_name: u.name });
                        setSearchUser(u.name);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        form.reviewed_user_id === u._id
                          ? 'bg-[#00A8E8]/10 text-[#00A8E8] border border-[#00A8E8]/20'
                          : 'text-[#9BA3B5] hover:text-white hover:bg-[#1D2A4D]'
                      }`}
                    >
                      {u.name} — {u.role}
                    </button>
                  ))}
                </div>
              )}
              {form.reviewed_user_name && (
                <p className="text-sm text-[#00A8E8]">Reviewing: {form.reviewed_user_name}</p>
              )}
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em] mb-2 block">Rating</Label>
                <div className="flex items-center gap-3">
                  <StarRating rating={form.rating} onRate={(r) => setForm({ ...form, rating: r })} interactive size="w-7 h-7" />
                  {form.rating > 0 && (
                    <span className="text-sm text-yellow-400 font-medium">{ratingLabels[form.rating]}</span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-[#9BA3B5] text-xs uppercase tracking-[0.15em]">Comment</Label>
                <Textarea
                  data-testid="review-comment"
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  className="mt-1 bg-[#0B132B] border-[#28385E] text-white focus:border-[#00A8E8]"
                  rows={3}
                  placeholder="Share your experience..."
                />
              </div>
              <Button
                data-testid="submit-review-btn"
                type="submit"
                disabled={!form.reviewed_user_id || form.rating === 0}
                className="w-full bg-[#00A8E8] hover:bg-[#38BDF8] text-white rounded-md py-5"
              >
                Submit Review
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E] text-center">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Average Rating</p>
          <div className="flex items-center justify-center gap-2">
            <p className="font-heading text-3xl font-bold text-yellow-400">{stats.avg_rating}</p>
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </div>
          <p className="text-xs text-[#9BA3B5] mt-1">out of 5.0</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E] text-center">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Reviews Received</p>
          <p className="font-heading text-3xl font-bold text-white">{stats.review_count}</p>
        </div>
        <div className="stat-card p-5 rounded-lg bg-[#141E3A] border border-[#28385E] text-center">
          <p className="text-xs uppercase tracking-[0.15em] text-[#9BA3B5] font-semibold mb-2">Reviews Given</p>
          <p className="font-heading text-3xl font-bold text-[#00A8E8]">{myGiven.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#141E3A] rounded-lg border border-[#28385E] w-fit">
        {[
          { id: 'received', label: `Received (${reviews.length})` },
          { id: 'given', label: `Given (${myGiven.length})` },
        ].map(t => (
          <button
            key={t.id}
            data-testid={`review-tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              activeTab === t.id ? 'bg-[#00A8E8]/10 text-[#00A8E8] font-medium' : 'text-[#9BA3B5] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {(activeTab === 'received' ? reviews : myGiven).length === 0 ? (
          <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
            <Star className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
            <p className="text-[#9BA3B5]">No reviews yet.</p>
          </div>
        ) : (
          (activeTab === 'received' ? reviews : myGiven).map(review => (
            <div key={review._id} data-testid={`review-${review._id}`} className="p-5 rounded-lg bg-[#141E3A] border border-[#28385E]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1D2A4D] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#00A8E8]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {activeTab === 'received' ? review.reviewer_name : review.reviewed_user_name}
                    </p>
                    <p className="text-xs text-[#9BA3B5]">
                      {activeTab === 'received' ? review.reviewer_role : 'You reviewed'} | {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="w-4 h-4" />
                  <Badge className={`text-xs ${
                    review.rating >= 4 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    review.rating >= 3 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  } border`}>
                    {ratingLabels[review.rating]}
                  </Badge>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-[#9BA3B5] ml-12 italic">"{review.comment}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
