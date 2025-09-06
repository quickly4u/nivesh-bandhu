import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Task, ChecklistItem } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type TaskWithCompliance = Task & { compliances?: { name: string } };

export const TasksPage: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<TaskWithCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [complianceOptions, setComplianceOptions] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    compliance_id: '',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as Task['priority'],
    assign_to_self: true,
  });
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<TaskWithCompliance | null>(null);
  const [editForm, setEditForm] = useState({
    compliance_id: '',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const canManage = ['owner', 'admin'].includes(((profile?.role as unknown) as string) || '');

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select(`*, compliances!inner(company_id, name)`) // RLS ensures company access
          .eq('compliances.company_id', profile.company_id)
          .order('due_date', { ascending: true });
        if (error) throw error;
        setItems((data || []).map((t: any) => ({
          ...t,
          status: t.status as Task['status'],
          priority: t.priority as Task['priority'],
          checklist: (t.checklist as unknown) as ChecklistItem[],
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.company_id]);

  useEffect(() => {
    const fetchCompliances = async () => {
      if (!profile?.company_id) return;
      try {
        const { data, error } = await supabase
          .from('compliances')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .order('name');
        if (error) throw error;
        setComplianceOptions((data || []) as { id: string; name: string }[]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCompliances();
  }, [profile?.company_id]);

  const filtered = useMemo(() => items.filter((t) => status === 'all' || t.status === status), [items, status]);

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'completed') {
        payload.completed_at = new Date().toISOString();
        payload.completed_by = profile?.id || null;
      }
      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) throw error;
      setItems((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: payload.completed_at, completed_by: payload.completed_by } : t)));
      toast({ title: newStatus === 'completed' ? 'Task completed' : 'Task status updated' });
    } catch (e) {
      console.error('update task status failed', e);
      toast({ variant: 'destructive', title: 'Failed to update task status' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">All compliance tasks</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Quick filter by status</CardDescription>
            </div>
            {canManage && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="btn-gradient">Add Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Select value={form.compliance_id} onValueChange={(v) => setForm({ ...form, compliance_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Compliance" />
                    </SelectTrigger>
                    <SelectContent>
                      {complianceOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-muted-foreground">Due Date</label>
                      <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                    </div>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task['priority'] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded border p-2">
                    <div>
                      <div className="font-medium text-sm">Assign to me</div>
                      <div className="text-xs text-muted-foreground">Task will be assigned to your profile</div>
                    </div>
                    <Switch checked={form.assign_to_self} onCheckedChange={(v) => setForm({ ...form, assign_to_self: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                  <Button disabled={creating || !form.title || !form.compliance_id || !form.due_date} onClick={async () => {
                    try {
                      setCreating(true);
                      const payload: any = {
                        compliance_id: form.compliance_id,
                        title: form.title,
                        description: form.description || null,
                        due_date: form.due_date,
                        assigned_to: form.assign_to_self ? profile?.id : null,
                        status: 'pending',
                        priority: form.priority,
                        checklist: [],
                      };
                      const { data, error } = await supabase.from('tasks').insert(payload).select('*').single();
                      if (error) throw error;
                      const newTask = data as any;
                      const comp = complianceOptions.find((c) => c.id === form.compliance_id);
                      const enriched: TaskWithCompliance = {
                        ...newTask,
                        status: newTask.status,
                        priority: newTask.priority,
                        checklist: (newTask.checklist as unknown) as ChecklistItem[],
                        compliances: comp ? { name: comp.name } : undefined,
                      };
                      setItems((prev) => [enriched, ...prev]);
                      setOpenCreate(false);
                      setForm({ compliance_id: '', title: '', description: '', due_date: '', priority: 'medium', assign_to_self: true });
                      toast({ title: 'Task created' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to create task' });
                    } finally {
                      setCreating(false);
                    }
                  }}>{creating ? 'Creating...' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {/* Edit Task Dialog */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Select value={editForm.compliance_id} onValueChange={(v) => setEditForm({ ...editForm, compliance_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Compliance" />
                    </SelectTrigger>
                    <SelectContent>
                      {complianceOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  <Textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <label className="text-sm text-muted-foreground">Due Date</label>
                      <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                    </div>
                    <div className="md:col-span-1">
                      <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as Task['priority'] })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as Task['status'] })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                  <Button disabled={editing || !selected?.id || !editForm.title || !editForm.compliance_id || !editForm.due_date} onClick={async () => {
                    if (!selected?.id) return;
                    try {
                      setEditing(true);
                      const payload: any = {
                        compliance_id: editForm.compliance_id,
                        title: editForm.title,
                        description: editForm.description || null,
                        due_date: editForm.due_date,
                        priority: editForm.priority,
                        status: editForm.status,
                      };
                      if (editForm.status === 'completed') {
                        payload.completed_at = new Date().toISOString();
                        payload.completed_by = profile?.id || null;
                      } else {
                        payload.completed_at = null;
                        payload.completed_by = null;
                      }
                      const { data, error } = await supabase.from('tasks').update(payload).eq('id', selected.id).select('*').single();
                      if (error) throw error;
                      const updated = data as any;
                      const comp = complianceOptions.find((c) => c.id === updated.compliance_id);
                      const enriched: TaskWithCompliance = { ...updated, compliances: comp ? { name: comp.name } : undefined } as TaskWithCompliance;
                      setItems((prev) => prev.map((t) => (t.id === selected.id ? enriched : t)));
                      setOpenEdit(false);
                      setSelected(null);
                      toast({ title: 'Task updated' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to update task' });
                    } finally {
                      setEditing(false);
                    }
                  }}>{editing ? 'Saving...' : 'Save'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{t.compliances?.name}</TableCell>
                      <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={t.status === 'completed' ? 'bg-success text-success-foreground' : t.status === 'in_progress' ? 'bg-info text-info-foreground' : 'bg-warning text-warning-foreground'}>{t.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={t.priority === 'high' ? 'bg-warning text-warning-foreground' : t.priority === 'medium' ? 'bg-info text-info-foreground' : 'bg-muted text-muted-foreground'}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManage && t.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => updateTaskStatus(t.id, 'in_progress')}>Start</Button>
                          )}
                          {canManage && t.status !== 'completed' && (
                            <Button size="sm" onClick={() => updateTaskStatus(t.id, 'completed')}>Complete</Button>
                          )}
                          {canManage && (
                          <Button size="sm" variant="secondary" onClick={() => {
                            setSelected(t);
                            setEditForm({
                              compliance_id: t.compliance_id,
                              title: t.title,
                              description: t.description || '',
                              due_date: t.due_date.slice(0,10),
                              priority: t.priority,
                              status: t.status,
                            });
                            setOpenEdit(true);
                          }}>Edit</Button>
                          )}
                          {canManage && (
                          <Button size="sm" variant="destructive" onClick={() => { setConfirmId(t.id); setConfirmOpen(true); }}>Delete</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No results</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmId) return;
              try {
                const { error } = await supabase.from('tasks').delete().eq('id', confirmId);
                if (error) throw error;
                setItems((prev) => prev.filter((x) => x.id !== confirmId));
                toast({ title: 'Task deleted' });
              } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Failed to delete task' });
              } finally {
                setConfirmOpen(false);
                setConfirmId(null);
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TasksPage;
