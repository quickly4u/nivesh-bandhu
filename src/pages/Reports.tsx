import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compliance, Task } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4caf50', '#ff9800', '#d32f2f', '#1976d2', '#9c27b0'];

export const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const [compliances, setCompliances] = useState<Compliance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id) return;
      try {
        setLoading(true);
        const [{ data: cData, error: cErr }, { data: tData, error: tErr }] = await Promise.all([
          supabase.from('compliances').select('*').eq('company_id', profile.company_id),
          supabase.from('tasks').select(`*, compliances!inner(company_id)`).eq('compliances.company_id', profile.company_id),
        ]);
        if (cErr) throw cErr;
        if (tErr) throw tErr;
        const typedC: Compliance[] = (cData || []).map((c: any) => ({
          ...c,
          regulatory_body: c.regulatory_body as Compliance['regulatory_body'],
          type: c.type as Compliance['type'],
          frequency: c.frequency as Compliance['frequency'],
          priority: c.priority as Compliance['priority'],
          status: c.status as Compliance['status'],
        }));
        const typedT: Task[] = (tData || []).map((t: any) => ({
          ...t,
          status: t.status as Task['status'],
          priority: t.priority as Task['priority'],
        }));
        setCompliances(typedC);
        setTasks(typedT);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.company_id]);

  const complianceByType = useMemo(() => {
    const map: Record<string, number> = {};
    compliances.forEach((c) => {
      map[c.type] = (map[c.type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [compliances]);

  const complianceByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    compliances.forEach((c) => {
      map[c.status] = (map[c.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [compliances]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Summary charts for compliances and tasks</p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse bg-muted rounded" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Compliances by Type</CardTitle>
              <CardDescription>Distribution across compliance types</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceByType}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Compliances by Status</CardTitle>
              <CardDescription>Pending vs In Progress vs Completed vs Overdue</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceByStatus} dataKey="value" nameKey="name" outerRadius={110} label>
                    {complianceByStatus.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-elevated md:col-span-2">
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
              <CardDescription>Task progress overview</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatus}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4caf50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
