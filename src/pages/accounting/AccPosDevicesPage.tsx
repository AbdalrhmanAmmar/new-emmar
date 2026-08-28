import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Monitor, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { RowActions } from "@/components/accounting/RowActions";

interface PosDevice {
  id: string;
  device_uuid: string;
  serial_number: string;
  name: string;
  branch?: string | null;
  cashier_name?: string | null;
  csid?: string | null;
  csid_status: string;
  environment: string;
  onboarded_at?: string | null;
  is_active: boolean;
  notes?: string | null;
}

const statusColors: Record<string, string> = {
  not_onboarded: 'bg-gray-100 text-gray-700',
  onboarded: 'bg-emerald-100 text-emerald-700',
  revoked: 'bg-red-100 text-red-700',
};
const statusLabels: Record<string, string> = {
  not_onboarded: 'لم يتم الربط', onboarded: 'مرتبط', revoked: 'ملغى',
};
const envLabels: Record<string, string> = {
  sandbox: 'تجريبي (Sandbox)', simulation: 'محاكاة', production: 'إنتاج',
};

const emptyForm = () => ({
  serial_number: '', name: '', branch: '', cashier_name: '',
  environment: 'sandbox', is_active: true, notes: '',
} as Partial<PosDevice>);

const AccPosDevicesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_pos' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_pos' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_pos' as any, 'delete');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<PosDevice>>(emptyForm());

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['acc_pos_devices'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_pos_devices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PosDevice[];
    },
  });

  const openNew = () => { setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (d: PosDevice) => { setForm(d); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.serial_number || !form.name) { toast.error('الرقم التسلسلي والاسم مطلوبان'); return; }
    try {
      const payload: any = {
        serial_number: form.serial_number, name: form.name, branch: form.branch,
        cashier_name: form.cashier_name, environment: form.environment,
        is_active: form.is_active, notes: form.notes,
      };
      const { error } = form.id
        ? await (supabase as any).from('acc_pos_devices').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_pos_devices').insert(payload);
      if (error) throw error;
      toast.success('تم الحفظ'); setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_pos_devices'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const handleDelete = async (d: PosDevice) => {
    if (!confirm(`حذف الجهاز "${d.name}"؟`)) return;
    try {
      const { error } = await (supabase as any).from('acc_pos_devices').delete().eq('id', d.id);
      if (error) throw error;
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['acc_pos_devices'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحذف'); }
  };

  const copyUuid = (uuid: string) => { navigator.clipboard.writeText(uuid); toast.success('تم نسخ UUID'); };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">أجهزة نقاط البيع</h1>
            <p className="text-xs text-muted-foreground">كل جهاز يُصدر فواتير يجب تسجيله بمُعرّف UUID لدى الهيئة</p>
          </div>
        </div>
        {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> جهاز جديد</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>الأجهزة المسجلة ({devices.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرقم التسلسلي</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>الفرع</TableHead>
                <TableHead>الكاشير</TableHead>
                <TableHead>البيئة</TableHead>
                <TableHead>حالة الربط</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
              ) : devices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">لا توجد أجهزة مسجلة</TableCell></TableRow>
              ) : devices.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.serial_number}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <button onClick={() => copyUuid(d.device_uuid ?? d.id)} className="flex items-center gap-1 hover:text-primary">
                      {String(d.device_uuid ?? d.id ?? '').slice(0, 8)}... <Copy className="w-3 h-3" />
                    </button>
                  </TableCell>
                  <TableCell>{d.branch || '-'}</TableCell>
                  <TableCell>{d.cashier_name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{envLabels[d.environment] || d.environment}</Badge></TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded ${statusColors[d.csid_status] || ''}`}>{statusLabels[d.csid_status] || d.csid_status}</span></TableCell>
                  <TableCell>{d.is_active ? <Badge className="bg-emerald-100 text-emerald-700">نشط</Badge> : <Badge variant="destructive">موقوف</Badge>}</TableCell>
                  <TableCell>
                    {canEdit && (
                      <RowActions>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                        {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(d)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                      </RowActions>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? 'تعديل جهاز' : 'جهاز جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>الاسم *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الرقم التسلسلي *</Label><Input value={form.serial_number || ''} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الفرع</Label><Input value={form.branch || ''} onChange={e => setForm({ ...form, branch: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الكاشير</Label><Input value={form.cashier_name || ''} onChange={e => setForm({ ...form, cashier_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>البيئة</Label>
              <Select value={form.environment || 'sandbox'} onValueChange={v => setForm({ ...form, environment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(envLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>نشط</Label></div>
            <div className="space-y-1.5 md:col-span-2"><Label>ملاحظات</Label><Input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccPosDevicesPage;
