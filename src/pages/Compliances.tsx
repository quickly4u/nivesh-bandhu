import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Compliance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<Compliance['status'], string> = {
  pending: 'bg-warning text-warning-foreground',
  in_progress: 'bg-info text-info-foreground',
  completed: 'bg-success text-success-foreground',
  overdue: 'bg-error text-error-foreground',
};

const priorityColors: Record<Compliance['priority'], string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info text-info-foreground',
  high: 'bg-warning text-warning-foreground',
  critical: 'bg-error text-error-foreground',
};

export const CompliancesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Compliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [regBody, setRegBody] = useState<string>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    regulatory_body: 'MCA' as Compliance['regulatory_body'],
    type: 'tax' as Compliance['type'],
    frequency: 'monthly' as Compliance['frequency'],
    priority: 'medium' as Compliance['priority'],
    next_due_date: '',
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const canManage = ['owner', 'admin'].includes(((profile?.role as unknown) as string) || '');
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Compliance | null>(null);
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

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const q = query.toLowerCase();
      const matchesQuery = !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || c.status === status;
      const matchesType = type === 'all' || c.type === type;
      const matchesReg = regBody === 'all' || c.regulatory_body === regBody;
      return matchesQuery && matchesStatus && matchesType && matchesReg;
    });
  }, [items, query, status, type, regBody]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliances</h1>
        <p className="text-muted-foreground">All compliance requirements with filters and search</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Search and refine results</CardDescription>
            </div>
            {canManage && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="btn-gradient">Add Compliance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Compliance</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Select value={form.regulatory_body} onValueChange={(v) => setForm({ ...form, regulatory_body: v as Compliance['regulatory_body'] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Regulatory Body" />
                      </SelectTrigger>
                      <SelectContent>
                        {['MCA','CBDT','CBIC','EPFO','ESIC','STATE'].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Compliance['type'] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {['tax','corporate','labor','environment'].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Compliance['frequency'] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {['weekly','monthly','quarterly','half_yearly','annual'].map((v) => (
                          <SelectItem key={v} value={v}>{v.replace('_',' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Compliance['priority'] })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {['low','medium','high','critical'].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Next Due Date</label>
                    <Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                  <Button disabled={creating || !profile?.company_id || !form.name || !form.next_due_date} onClick={async () => {
                    if (!profile?.company_id) return;
                    try {
                      setCreating(true);
                      const payload = {
                        company_id: profile.company_id,
                        name: form.name,
                        description: form.description || null,
                        regulatory_body: form.regulatory_body,
                        type: form.type,
                        frequency: form.frequency,
                        priority: form.priority,
                        next_due_date: form.next_due_date,
                        status: 'pending',
                      };
                      const { data, error } = await supabase.from('compliances').insert(payload).select('*').single();
                      if (error) throw error;
                      const c = data as any;
                      const typed: Compliance = {
                        ...c,
                        regulatory_body: c.regulatory_body,
                        type: c.type,
                        frequency: c.frequency,
                        priority: c.priority,
                        status: c.status,
                      };
                      setItems((prev) => [typed, ...prev]);
                      toast({ title: 'Compliance created' });
                      setOpenCreate(false);
                      setForm({ name: '', description: '', regulatory_body: 'MCA', type: 'tax', frequency: 'monthly', priority: 'medium', next_due_date: '' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to create compliance' });
                    } finally {
                      setCreating(false);
                    }
                  }}>{creating ? 'Creating...' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {/* Edit Compliance Dialog */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
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
                  <Button disabled={editing || !selected?.id || !editForm.name || !editForm.next_due_date} onClick={async () => {
                    if (!selected?.id) return;
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
                      const { data, error } = await supabase.from('compliances').update(payload).eq('id', selected.id).select('*').single();
                      if (error) throw error;
                      const updated = data as any as Compliance;
                      setItems((prev) => prev.map((x) => (x.id === selected.id ? { ...x, ...updated } : x)));
                      setOpenEdit(false);
                      setSelected(null);
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Input placeholder="Search by name or description" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regBody} onValueChange={setRegBody}>
              <SelectTrigger>
                <SelectValue placeholder="Regulatory Body" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bodies</SelectItem>
                <SelectItem value="MCA">MCA</SelectItem>
                <SelectItem value="CBDT">CBDT</SelectItem>
                <SelectItem value="CBIC">CBIC</SelectItem>
                <SelectItem value="EPFO">EPFO</SelectItem>
                <SelectItem value="ESIC">ESIC</SelectItem>
                <SelectItem value="STATE">STATE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>All Compliances</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Regulatory Body</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/compliances/${c.id}`)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.regulatory_body}</TableCell>
                      <TableCell className="capitalize">{c.type}</TableCell>
                      <TableCell className="capitalize">{c.frequency.replace('_', ' ')}</TableCell>
                      <TableCell>{new Date(c.next_due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[c.status]}>{c.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[c.priority]}>{c.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/compliances/${c.id}`); }}>View</Button>
                          {canManage && (
                          <Button size="sm" variant="secondary" onClick={(e) => { 
                            e.stopPropagation();
                            setSelected(c);
                            setEditForm({
                              name: c.name,
                              description: c.description || '',
                              regulatory_body: c.regulatory_body,
                              type: c.type,
                              frequency: c.frequency,
                              priority: c.priority,
                              status: c.status,
                              next_due_date: c.next_due_date.slice(0,10),
                            });
                            setOpenEdit(true);
                          }}>Edit</Button>
                          )}
                          {canManage && (
                          <Button size="sm" variant="destructive" onClick={(e) => {
                            e.stopPropagation();
                            setConfirmId(c.id);
                            setConfirmOpen(true);
                          }}>Delete</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No results</TableCell>
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
            <AlertDialogTitle>Delete this compliance?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the compliance and related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmId) return;
              try {
                const { error } = await supabase.from('compliances').delete().eq('id', confirmId);
                if (error) throw error;
                setItems((prev) => prev.filter((x) => x.id !== confirmId));
                toast({ title: 'Compliance deleted' });
              } catch (err) {
                console.error(err);
                toast({ variant: 'destructive', title: 'Failed to delete compliance' });
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

export default CompliancesPage;
