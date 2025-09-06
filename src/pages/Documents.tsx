import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Document } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [complianceOptions, setComplianceOptions] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    file_path: '',
    file_type: 'application/pdf',
    file_size: '',
    category: 'misc' as Document['category'],
    compliance_id: '' as string | undefined,
    expiry_date: '' as string | undefined,
    is_required: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const canManage = ['owner', 'admin'].includes(((profile?.role as unknown) as string) || '');
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    file_path: '',
    file_type: 'application/pdf',
    file_size: '',
    category: 'misc' as Document['category'],
    compliance_id: '' as string | undefined,
    expiry_date: '' as string | undefined,
    is_required: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('uploaded_at', { ascending: false });
        if (error) throw error;
        setItems((data || []) as Document[]);
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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((d) => !q || d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Document library with search</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Search</CardTitle>
              <CardDescription>Find documents by name or description</CardDescription>
            </div>
            {canManage && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="btn-gradient">Add Document</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document (URL)</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Document['category'] })}>
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
                    <Input placeholder="File Type (e.g. application/pdf)" value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })} />
                    <Input placeholder="File Size (bytes)" value={form.file_size} onChange={(e) => setForm({ ...form, file_size: e.target.value })} />
                  </div>
                  <Input placeholder="File URL / Path" value={form.file_path} onChange={(e) => setForm({ ...form, file_path: e.target.value })} />
                  <Select value={form.compliance_id || ''} onValueChange={(v) => setForm({ ...form, compliance_id: v || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Linked Compliance (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {complianceOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">Expiry Date (optional)</label>
                    <Input type="date" value={form.expiry_date || ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value || undefined })} />
                  </div>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: !!v })} />
                    <span>Required Document</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                  <Button disabled={creating || !profile?.company_id || !profile?.id || !form.name || !form.file_path || !form.file_type || !form.file_size} onClick={async () => {
                    try {
                      setCreating(true);
                      const payload: any = {
                        company_id: profile!.company_id,
                        compliance_id: form.compliance_id || null,
                        name: form.name,
                        description: form.description || null,
                        file_path: form.file_path,
                        file_type: form.file_type,
                        file_size: parseInt(form.file_size || '0', 10),
                        category: form.category,
                        is_required: form.is_required,
                        expiry_date: form.expiry_date || null,
                        uploaded_by: profile!.id,
                      };
                      const { data, error } = await supabase.from('documents').insert(payload).select('*').single();
                      if (error) throw error;
                      setItems((prev) => [data as Document, ...prev]);
                      setOpenCreate(false);
                      setForm({ name: '', description: '', file_path: '', file_type: 'application/pdf', file_size: '', category: 'misc', compliance_id: undefined, expiry_date: undefined, is_required: false });
                      toast({ title: 'Document created' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to create document' });
                    } finally {
                      setCreating(false);
                    }
                  }}>{creating ? 'Uploading...' : 'Create'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {/* Edit Document Dialog */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Document</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <Textarea placeholder="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v as Document['category'] })}>
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
                    <Input placeholder="File Type (e.g. application/pdf)" value={editForm.file_type} onChange={(e) => setEditForm({ ...editForm, file_type: e.target.value })} />
                    <Input placeholder="File Size (bytes)" value={editForm.file_size} onChange={(e) => setEditForm({ ...editForm, file_size: e.target.value })} />
                  </div>
                  <Input placeholder="File URL / Path" value={editForm.file_path} onChange={(e) => setEditForm({ ...editForm, file_path: e.target.value })} />
                  <Select value={editForm.compliance_id || ''} onValueChange={(v) => setEditForm({ ...editForm, compliance_id: v || undefined })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Linked Compliance (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {complianceOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2">
                    <label className="text-sm text-muted-foreground">Expiry Date (optional)</label>
                    <Input type="date" value={editForm.expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value || undefined })} />
                  </div>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={editForm.is_required} onCheckedChange={(v) => setEditForm({ ...editForm, is_required: !!v })} />
                    <span>Required Document</span>
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                  <Button disabled={editing || !selected?.id || !editForm.name || !editForm.file_path || !editForm.file_type || !editForm.file_size} onClick={async () => {
                    if (!selected?.id) return;
                    try {
                      setEditing(true);
                      const payload: any = {
                        name: editForm.name,
                        description: editForm.description || null,
                        file_path: editForm.file_path,
                        file_type: editForm.file_type,
                        file_size: parseInt(editForm.file_size || '0', 10),
                        category: editForm.category,
                        is_required: editForm.is_required,
                        expiry_date: editForm.expiry_date || null,
                        compliance_id: editForm.compliance_id || null,
                      };
                      const { data, error } = await supabase.from('documents').update(payload).eq('id', selected.id).select('*').single();
                      if (error) throw error;
                      setItems((prev) => prev.map((x) => (x.id === selected.id ? (data as Document) : x)));
                      setOpenEdit(false);
                      setSelected(null);
                      toast({ title: 'Document updated' });
                    } catch (e) {
                      console.error(e);
                      toast({ variant: 'destructive', title: 'Failed to update document' });
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
          <Input placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} />
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
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
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="capitalize">{d.category}</TableCell>
                      <TableCell>{d.file_type}</TableCell>
                      <TableCell>{(d.file_size / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>{new Date(d.uploaded_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        {canManage && (
                        <Button size="sm" variant="secondary" onClick={() => {
                          setSelected(d);
                          setEditForm({
                            name: d.name,
                            description: d.description || '',
                            file_path: d.file_path,
                            file_type: d.file_type,
                            file_size: String(d.file_size || ''),
                            category: d.category,
                            compliance_id: d.compliance_id || undefined,
                            expiry_date: d.expiry_date ? d.expiry_date.slice(0,10) : undefined,
                            is_required: d.is_required || false,
                          });
                          setOpenEdit(true);
                        }}>Edit</Button>
                        )}
                        {canManage && (
                        <Button size="sm" variant="destructive" onClick={() => { setConfirmId(d.id); setConfirmOpen(true); }}>Delete</Button>
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
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!confirmId) return;
              try {
                const { error } = await supabase.from('documents').delete().eq('id', confirmId);
                if (error) throw error;
                setItems((prev) => prev.filter((x) => x.id !== confirmId));
                toast({ title: 'Document deleted' });
              } catch (e) {
                console.error(e);
                toast({ variant: 'destructive', title: 'Failed to delete document' });
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

export default DocumentsPage;
