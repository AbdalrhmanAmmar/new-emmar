import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/accounting/FormPage';
import { Plus, Save, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import RowActions from '@/components/accounting/RowActions';

const money = (n: any) => Number(n || 0).toLocaleString('en-GB');

interface Wh {
  id: string; code: string; name_ar: string; location?: string; manager?: string;
  capacity_ton?: number; is_active: boolean;
}
const empty = (): Partial<Wh> => ({ code: '', name_ar: '', location: '', manager: '', capacity_ton: 0, is_active: true });

const AccWarehousesPage: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_inventory' as any, 'edit');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Wh>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], refetch } = useQuery<Wh[]>({
    queryKey: ['acc_warehouses'],
    queryFn: async () => ((await (supabase as any).from('acc_warehouses').select('*')).data ?? []) as Wh[],
  });
  const { data: moves = [] } = useQuery<any[]>({
    queryKey: ['acc_stock_moves'],
    queryFn: async () => (await (supabase as any).from('acc_stock_moves').select('*')).data ?? [],
  });

  const stockOf = (id: string) =>
    moves.filter((m) => m.warehouse_id === id)
      .reduce((s, m) => s + Number(m.quantity_kg || 0) * (m.move_type === 'out' ? -1 : 1), 0) / 1000;

  const save = async () => {
    if (!form.code?.trim() || !form.name_ar?.trim()) return toast.error('أدخل الكود والاسم');
    setSaving(true);
    try {
      const payload = {
        code: form.code!.trim(), name_ar: form.name_ar!.trim(), location: form.location ?? null,
        manager: form.manager ?? null, capacity_ton: Number(form.capacity_ton || 0), is_active: !!form.is_active,
      };
      const q = editingId
        ? (supabase as any).from('acc_warehouses').update(payload).eq('id', editingId)
        : (supabase as any).from('acc_warehouses').insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editingId ? 'تم تحديث المخزن' : 'تم إضافة المخزن');
      setOpen(false); setForm(empty()); setEditingId(null);
      qc.invalidateQueries({ queryKey: ['acc_warehouses'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w: Wh) => {
    if (Math.abs(stockOf(w.id)) > 0.0001) return toast.error('لا يمكن حذف مخزن به أرصدة');
    const { error } = await (supabase as any).from('acc_warehouses').delete().eq('id', w.id);
    if (error) return toast.error(error.message);
    toast.success('تم حذف المخزن');
    refetch();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">المخازن والصوامع</h1>
          <p className="text-sm text-muted-foreground mt-1">مخازن الخامات والأعلاف المصنّعة وسعتها بالطن.</p>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="المخازن والصوامع"
            headers={['الكود', 'المخزن', 'الموقع', 'أمين المخزن', 'السعة (طن)', 'الرصيد (طن)']}
            rows={rows.map((w) => [w.code, w.name_ar, w.location ?? '', w.manager ?? '', money(w.capacity_ton), stockOf(w.id).toFixed(2)])}
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty()); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit}><Plus className="h-4 w-4 me-1" /> مخزن جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>{editingId ? 'تعديل مخزن' : 'مخزن جديد'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الكود</Label><Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>الاسم</Label><Input value={form.name_ar ?? ''} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></div>
                <div><Label>الموقع</Label><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>أمين المخزن</Label><Input value={form.manager ?? ''} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
                <div><Label>السعة (طن)</Label><Input type="number" value={form.capacity_ton ?? 0} onChange={(e) => setForm({ ...form, capacity_ton: Number(e.target.value) })} /></div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} حفظ
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>المخازن ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>الموقع</TableHead>
                <TableHead>أمين المخزن</TableHead>
                <TableHead>السعة (طن)</TableHead>
                <TableHead>الرصيد (طن)</TableHead>
                <TableHead>نسبة الاستغلال</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد مخازن</TableCell></TableRow>
              ) : rows.map((w) => {
                const bal = stockOf(w.id);
                const pct = Number(w.capacity_ton) > 0 ? (bal / Number(w.capacity_ton)) * 100 : 0;
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.code}</TableCell>
                    <TableCell>{w.name_ar}</TableCell>
                    <TableCell>{w.location}</TableCell>
                    <TableCell>{w.manager}</TableCell>
                    <TableCell>{money(w.capacity_ton)}</TableCell>
                    <TableCell className="font-semibold">{bal.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={pct > 95 ? 'bg-red-100 text-red-700' : pct > 75 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                        {pct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActions>
                        <Button variant="ghost" size="icon" title="تعديل" disabled={!canEdit}
                          onClick={() => { setForm(w); setEditingId(w.id); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="حذف" disabled={!canEdit} onClick={() => remove(w)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccWarehousesPage;
