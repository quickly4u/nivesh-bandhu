import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyStats, Compliance, Task, ChecklistItem } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [upcomingCompliances, setUpcomingCompliances] = useState<Compliance[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);

      // Fetch compliances
      const { data: compliances, error: complianceError } = await supabase
        .from('compliances')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('next_due_date', { ascending: true });

      if (complianceError) throw complianceError;

      // Fetch tasks
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          compliances!inner(
            company_id,
            name
          )
        `)
        .eq('compliances.company_id', profile.company_id)
        .order('due_date', { ascending: true })
        .limit(5);

      if (taskError) throw taskError;

      // Convert database responses to proper types
      const typedCompliances: Compliance[] = (compliances || []).map(c => ({
        ...c,
        regulatory_body: c.regulatory_body as Compliance['regulatory_body'],
        type: c.type as Compliance['type'],
        frequency: c.frequency as Compliance['frequency'],
        priority: c.priority as Compliance['priority'],
        status: c.status as Compliance['status'],
      }));

      const typedTasks: Task[] = (tasks || []).map(t => ({
        ...t,
        status: t.status as Task['status'],
        priority: t.priority as Task['priority'],
        checklist: (t.checklist as unknown) as ChecklistItem[],
      }));

      // Calculate stats
      const totalCompliances = typedCompliances.length;
      const overdueCompliances = typedCompliances.filter(c => 
        new Date(c.next_due_date) < new Date() && c.status !== 'completed'
      ).length;
      
      const dueThisWeek = typedCompliances.filter(c => {
        const dueDate = new Date(c.next_due_date);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return dueDate <= weekFromNow && dueDate >= new Date() && c.status !== 'completed';
      }).length;

      const completedCompliances = typedCompliances.filter(c => c.status === 'completed').length;
      const completionRate = totalCompliances > 0 ? (completedCompliances / totalCompliances) * 100 : 0;

      const upcomingDeadlines = typedCompliances.slice(0, 5);

      setStats({
        total_compliances: totalCompliances,
        due_this_week: dueThisWeek,
        overdue: overdueCompliances,
        completion_rate: Math.round(completionRate),
        upcoming_deadlines: upcomingDeadlines,
      });

      setUpcomingCompliances(upcomingDeadlines);
      setRecentTasks(typedTasks);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-error text-error-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-info text-info-foreground';
      case 'overdue': return 'bg-error text-error-foreground';
      default: return 'bg-warning text-warning-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your compliance status and upcoming deadlines
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compliances</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_compliances || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active compliance requirements
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.due_this_week || 0}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming deadlines
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-error" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{stats?.overdue || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.completion_rate || 0}%</div>
            <Progress value={stats?.completion_rate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>
              Next 5 compliance deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingCompliances.length > 0 ? (
              upcomingCompliances.map((compliance) => (
                <div key={compliance.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{compliance.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {compliance.regulatory_body} • Due {format(new Date(compliance.next_due_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(compliance.priority)}>
                      {compliance.priority}
                    </Badge>
                    <Badge className={getStatusColor(compliance.status)}>
                      {compliance.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No upcoming deadlines
              </p>
            )}
            <Button variant="outline" className="w-full">
              View All Compliances
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Tasks
            </CardTitle>
            <CardDescription>
              Latest task activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No recent tasks
              </p>
            )}
            <Button variant="outline" className="w-full">
              View All Tasks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="btn-gradient justify-start h-auto p-4">
              <FileText className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Upload Document</div>
                <div className="text-sm opacity-80">Add compliance documents</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <Calendar className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">View Calendar</div>
                <div className="text-sm text-muted-foreground">See all deadlines</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <Bell className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Notifications</div>
                <div className="text-sm text-muted-foreground">Manage alerts</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};