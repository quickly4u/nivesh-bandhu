import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data || []) as Notification[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.id]);

  const markRead = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      console.error('failed to mark read', e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Your alerts and reminders</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>Latest first</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/notifications/settings')}>Settings</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            items.map((n) => (
              <div key={n.id} className={`p-3 border rounded-lg flex items-center justify-between ${n.is_read ? '' : 'bg-muted/40'}`}>
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-muted-foreground">{n.message}</div>
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{n.type.replace('_', ' ')}</Badge>
                  {!n.is_read && <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Mark Read</Button>}
                </div>
              </div>
            ))
          )}
          {(!loading && items.length === 0) && (
            <div className="text-center text-muted-foreground py-8">No notifications</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
