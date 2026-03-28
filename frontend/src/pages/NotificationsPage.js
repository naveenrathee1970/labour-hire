import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Bell, Check, CheckCheck, MessageCircle, CreditCard,
  Shield, Briefcase, Star, Trash2, X
} from 'lucide-react';

export default function NotificationsPage() {
  const { api } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api('get', '/notifications');
      setNotifications(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await api('patch', `/notifications/${id}/read`);
      loadData();
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api('post', '/notifications/mark-all-read');
      loadData();
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcons = {
    application: Briefcase,
    payment: CreditCard,
    verification: Shield,
    review: Star,
    job_alert: Bell,
    document: Shield,
    info: MessageCircle,
  };

  const typeColors = {
    application: 'text-yellow-400 bg-yellow-500/10',
    payment: 'text-emerald-400 bg-emerald-500/10',
    verification: 'text-cyan-400 bg-cyan-500/10',
    review: 'text-purple-400 bg-purple-500/10',
    job_alert: 'text-[#00A8E8] bg-[#00A8E8]/10',
    document: 'text-cyan-400 bg-cyan-500/10',
    info: 'text-[#9BA3B5] bg-[#9BA3B5]/10',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="notifications-loading">
        <div className="w-8 h-8 border-2 border-[#00A8E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="notifications-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-sm text-[#9BA3B5] mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            data-testid="mark-all-read-btn"
            variant="outline"
            onClick={markAllRead}
            className="border-[#28385E] text-[#9BA3B5] hover:text-white hover:border-[#00A8E8] bg-transparent text-sm"
          >
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 rounded-lg bg-[#141E3A] border border-[#28385E]">
          <Bell className="w-12 h-12 text-[#28385E] mx-auto mb-4" />
          <p className="text-[#9BA3B5]">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const Icon = typeIcons[notif.type] || Bell;
            const colorCls = typeColors[notif.type] || typeColors.info;
            return (
              <div
                key={notif._id}
                data-testid={`notif-${notif._id}`}
                className={`p-4 rounded-lg border transition-colors ${
                  notif.read
                    ? 'bg-[#141E3A] border-[#28385E]'
                    : 'bg-[#141E3A] border-[#00A8E8]/30 shadow-[0_0_8px_rgba(0,168,232,0.05)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white">{notif.title}</p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-[#00A8E8] flex-shrink-0" />}
                      {notif.sms_sent && (
                        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px]">SMS</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#9BA3B5]">{notif.message}</p>
                    <p className="text-xs text-[#9BA3B5]/60 mt-1">
                      {notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  {!notif.read && (
                    <Button
                      data-testid={`mark-read-${notif._id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead(notif._id)}
                      className="text-[#9BA3B5] hover:text-[#00A8E8] p-1"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
