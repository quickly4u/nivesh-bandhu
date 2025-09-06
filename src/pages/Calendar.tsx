import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compliance } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const CalendarPage: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Compliance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('compliances')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('next_due_date', { ascending: true });
        if (error) throw error;
        const typed: Compliance[] = (data || []).map((c: any) => ({
          ...c,
          regulatory_body: c.regulatory_body as Compliance['regulatory_body'],
          type: c.type as Compliance['type'],
          frequency: c.frequency as Compliance['frequency'],
          priority: c.priority as Compliance['priority'],
          status: c.status as Compliance['status'],
        }));
        setItems(typed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.company_id]);

  const byDate = useMemo(() => {
    const map = new Map<string, Compliance[]>();
    items.forEach((c) => {
      const key = new Date(c.next_due_date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">Upcoming compliance deadlines grouped by date</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Deadlines</CardTitle>
          <CardDescription>Color-coded by status and priority</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            byDate.map(([date, list]) => (
              <div key={date} className="space-y-2">
                <div className="text-sm text-muted-foreground">{date}</div>
                <div className="space-y-2">
                  {list.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.regulatory_body} • {c.frequency.replace('_', ' ')} • {c.type}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={c.status === 'completed' ? 'bg-success text-success-foreground' : c.status === 'in_progress' ? 'bg-info text-info-foreground' : c.status === 'overdue' ? 'bg-error text-error-foreground' : 'bg-warning text-warning-foreground'}>{c.status.replace('_', ' ')}</Badge>
                        <Badge className={c.priority === 'critical' ? 'bg-error text-error-foreground' : c.priority === 'high' ? 'bg-warning text-warning-foreground' : c.priority === 'medium' ? 'bg-info text-info-foreground' : 'bg-muted text-muted-foreground'}>{c.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
