import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compliance, Task, ChecklistItem, Document } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export const ComplianceDetailPage: React.FC = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = ['owner', 'admin'].includes(((profile?.role as unknown) as string) || '');
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    regulatory_body: 'MCA' as Compliance['regulatory_body'],
    type: 'tax' as Compliance['type'],
    frequency: 'monthly' as Compliance['frequency'],
    priority: 'medium' as Compliance['priority'],
    status: 'pending' as Compliance['status'],
    next_due_date: '',
  });
  const [confirmTaskOpen, setConfirmTaskOpen] = useState(false);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [confirmDocOpen, setConfirmDocOpen] = useState(false);
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);
  const [openTask, setOpenTask] = useState(false);
  const [taskCreating, setTaskCreating] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as Task['priority'],
    assign_to_self: true,
  });
  const [openDoc, setOpenDoc] = useState(false);
  const [docCreating, setDocCreating] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    description: '',
    file_path: '',
    file_type: 'application/pdf',
    file_size: '',
    category: 'misc' as Document['category'],
    expiry_date: '' as string | undefined,
    is_required: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data: c, error: cErr } = await supabase.from('compliances').select('*').eq('id', id).single();
        if (cErr) throw cErr;
        const typedC: Compliance = {
          ...c,
          regulatory_body: c.regulatory_body as Compliance['regulatory_body'],
          type: c.type as Compliance['type'],
          frequency: c.frequency as Compliance['frequency'],
          priority: c.priority as Compliance['priority'],
          status: c.status as Compliance['status'],
        };
        setCompliance(typedC);

        const { data: t, error: tErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('compliance_id', id)
          .order('due_date', { ascending: true });
        if (tErr) throw tErr;
        setTasks((t || []).map((x: any) => ({
          ...x,
          status: x.status as Task['status'],
          priority: x.priority as Task['priority'],
          checklist: (x.checklist as unknown) as ChecklistItem[],
        })));

        const { data: d, error: dErr } = await supabase
          .from('documents')
          .select('*')
          .eq('compliance_id', id)
          .order('uploaded_at', { ascending: false });
        if (dErr) throw dErr;
        setDocuments((d || []) as Document[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const statusColor = useMemo(() => {
    switch (compliance?.status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-info text-info-foreground';
      case 'overdue': return 'bg-error text-error-foreground';
      default: return 'bg-warning text-warning-foreground';
    }
  }, [compliance?.status]);

  const priorityColor = useMemo(() => {
    switch (compliance?.priority) {
      case 'critical': return 'bg-error text-error-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  }, [compliance?.priority]);

  const markTaskCompleted = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: profile?.id })
        .eq('id', taskId);
      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'completed', completed_at: new Date().toISOString(), completed_by: profile?.id } : t)));
      toast({ title: 'Task marked as complete' });
    } catch (e) {
      console.error('Failed to complete task', e);
      toast({ variant: 'destructive', title: 'Failed to mark task complete' });
    }
  };

  if (loading) {
    return <div className="h-32 animate-pulse bg-muted rounded" />;
  }

  if (!compliance) {
    return <div className="text-muted-foreground">Compliance not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{compliance.name}</h1>
          <p className="text-muted-foreground">{compliance.description}</p>
        </div>
        {canManage && (
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogTrigger asChild>
            <Button variant="outline">Edit Compliance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Compliance</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <Textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={editForm.regulatory_body} onValueChange={(v) => setEditForm({ ...editForm, regulatory_body: v as Compliance['regulatory_body'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Regulatory Body" />
                  </SelectTrigger>
                  <SelectContent>
                    {['MCA','CBDT','CBIC','EPFO','ESIC','STATE'].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v as Compliance['type'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {['tax','corporate','labor','environment'].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editForm.frequency} onValueChange={(v) => setEditForm({ ...editForm, frequency: v as Compliance['frequency'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {['weekly','monthly','quarterly','half_yearly','annual'].map((v) => (
                      <SelectItem key={v} value={v}>{v.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as Compliance['priority'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','critical'].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as Compliance['status'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {['pending','in_progress','completed','overdue'].map((v) => (
                      <SelectItem key={v} value={v}>{v.replace('_',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Next Due Date</label>
                <Input type="date" value={editForm.next_due_date} onChange={(e) => setEditForm({ ...editForm, next_due_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
              <Button disabled={editing || !editForm.name || !editForm.next_due_date} onClick={async () => {
                try {
                  setEditing(true);
                  const payload = {
                    name: editForm.name,
                    description: editForm.description || null,
                    regulatory_body: editForm.regulatory_body,
                    type: editForm.type,
                    frequency: editForm.frequency,
                    priority: editForm.priority,
                    status: editForm.status,
                    next_due_date: editForm.next_due_date,
                  };
                  const { data, error } = await supabase.from('compliances').update(payload).eq('id', compliance!.id).select('*').single();
                  if (error) throw error;
                  const updated = data as any as Compliance;
                  setCompliance(updated);
                  setOpenEdit(false);
                  toast({ title: 'Compliance updated' });
                } catch (e) {
                  console.error(e);
                  toast({ variant: 'destructive', title: 'Failed to update compliance' });
                } finally {
                  setEditing(false);
                }
              }}>{editing ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Key details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Regulatory Body</span>
              <span className="font-medium">{compliance.regulatory_body}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Frequency</span>
              <span className="font-medium capitalize">{compliance.frequency.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Due</span>
              <span className="font-medium">{format(new Date(compliance.next_due_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={statusColor}>{compliance.status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority</span>
              <Badge className={priorityColor}>{compliance.priority}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Checklist for this compliance</CardDescription>
              </div>
              {canManage && (
              <Dialog open={openTask} onOpenChange={setOpenTask}>
                <DialogTrigger asChild>
                  <Button className="btn-gradient">Add Task</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Task</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Input placeholder="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                    <Textarea placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Due Date</label>
                        <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                      </div>
                      <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as Task['priority'] })}>
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
                      <Switch checked={taskForm.assign_to_self} onCheckedChange={(v) => setTaskForm({ ...taskForm, assign_to_self: v })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenTask(false)}>Cancel</Button>
                    <Button disabled={taskCreating || !taskForm.title || !taskForm.due_date} onClick={async () => {
                      try {
                        setTaskCreating(true);
                        const payload: any = {
                          compliance_id: id,
                          title: taskForm.title,
                          description: taskForm.description || null,
                          due_date: taskForm.due_date,
                          assigned_to: taskForm.assign_to_self ? profile?.id : null,
                          status: 'pending',
                          priority: taskForm.priority,
                          checklist: [],
                        };
                        const { data, error } = await supabase.from('tasks').insert(payload).select('*').single();
                        if (error) throw error;
                        const t = data as any;
                        const newTask: Task = {
                          ...t,
                          status: t.status as Task['status'],
                          priority: t.priority as Task['priority'],
                          checklist: (t.checklist as unknown) as ChecklistItem[],
                        };
                        setTasks((prev) => [newTask, ...prev]);
                        setOpenTask(false);
                        setTaskForm({ title: '', description: '', due_date: '', priority: 'medium', assign_to_self: true });
                        toast({ title: 'Task created' });
                      } catch (e) {
                        console.error(e);
                        toast({ variant: 'destructive', title: 'Failed to create task' });
                      } finally {
                        setTaskCreating(false);
                      }
                    }}>{taskCreating ? 'Creating...' : 'Create'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{format(new Date(t.due_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={t.status === 'completed' ? 'bg-success text-success-foreground' : t.status === 'in_progress' ? 'bg-info text-info-foreground' : 'bg-warning text-warning-foreground'}>
                          {t.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && t.status !== 'completed' && (
                          <Button size="sm" onClick={() => markTaskCompleted(t.id)}>Mark Complete</Button>
                        )}
                        {canManage && (
                          <Button size="sm" variant="destructive" className="ml-2" onClick={() => { setConfirmTaskId(t.id); setConfirmTaskOpen(true); }}>Delete</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tasks</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Files linked to this compliance</CardDescription>
            </div>
            {canManage && (
            <Dialog open={openDoc} onOpenChange={setOpenDoc}>
              <DialogTrigger asChild>
                <Button className="btn-gradient">Add Document</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document (URL)</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input placeholder="Name" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} />
                  <Textarea placeholder="Description" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
                  <Select value={docForm.category} onValueChange={(v) => setDocForm({ ...docForm, category: v as Document['category'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {['certificate','return','register','correspondence','misc'].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="File Type (e.g. application/pdf)" value={docForm.file_type} onChange={(e) => setDocForm({ ...docForm, file_type: e.target.value })} />
                    <Input placeholder="File Size (bytes)" value={docForm.file_size} onChange={(e) => setDocForm({ ...docForm, file_size: e.target.value })} />
                  </div>
                  <Input placeholder="File URL / Path" value={docForm.file_path} onChange={(e) => setDocForm({ ...docForm, file_path: e.target.value })} />
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">Expiry Date (optional)</label>
                    <Input type="date" value={docForm.expiry_date || ''} onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value || undefined })} />
                  </div>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={docForm.is_required} onCheckedChange={(v) => setDocForm({ ...docForm, is_required: !!v })} />
                    <span>Required Document</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenDoc(false)}>Cancel</Button>
                  <Button disabled={docCreating || !compliance?.company_id || !profile?.id || !docForm.name || !docForm.file_path || !docForm.file_type || !docForm.file_size} onClick={async () => {
                    try {
                      setDocCreating(true);
                      const payload: any = {
                        company_id: compliance!.company_id,
                        compliance_id: id,
                        name: docForm.name,
                        description: docForm.description || null,
                        file_path: docForm.file_path,
                        file_type: docForm.file_type,
                        file_size: parseInt(docForm.file_size || '0', 10),
                        category: docForm.category,
                        is_required: docForm.is_required,
                        expiry_date: docForm.expiry_date || null,
                        uploaded_by: profile!.id,
                      };
                      const { data, error } = await supabase.from('documents').insert(payload).select('*').single();
                      if (error) throw error;
                      setDocuments((prev) => [data as Document, ...prev]);
                      setOpenDoc(false);
                      setDocForm({ name: '', description: '', file_path: '', file_type: 'application/pdf', file_size: '', category: 'misc', expiry_date: undefined, is_required: false });
                      toast({ title: 'Document created' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to create document' });
                    } finally {
                      setDocCreating(false);
                    }
                  }}>{docCreating ? 'Uploading...' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="capitalize">{d.category}</TableCell>
                    <TableCell>{d.file_type}</TableCell>
                    <TableCell>{format(new Date(d.uploaded_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button size="sm" variant="destructive" onClick={() => { setConfirmDocId(d.id); setConfirmDocOpen(true); }}>Delete</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {documents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No documents</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmations */}
      <AlertDialog open={confirmTaskOpen} onOpenChange={setConfirmTaskOpen}>
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
              if (!confirmTaskId) return;
              try {
                const { error } = await supabase.from('tasks').delete().eq('id', confirmTaskId);
                if (error) throw error;
                setTasks((prev) => prev.filter((x) => x.id !== confirmTaskId));
                toast({ title: 'Task deleted' });
              } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Failed to delete task' });
              } finally {
                setConfirmTaskOpen(false);
                setConfirmTaskId(null);
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDocOpen} onOpenChange={setConfirmDocOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmDocId) return;
              try {
                const { error } = await supabase.from('documents').delete().eq('id', confirmDocId);
                if (error) throw error;
                setDocuments((prev) => prev.filter((x) => x.id !== confirmDocId));
                toast({ title: 'Document deleted' });
              } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Failed to delete document' });
              } finally {
                setConfirmDocOpen(false);
                setConfirmDocId(null);
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplianceDetailPage;
