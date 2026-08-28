import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Save, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import RowActions from '@/components/accounting/RowActions';

const CATEGORIES = ['خامة علفية', 'علف مصنّع', 'إضافات', 'تعبئة'];
const money = (n: any) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Item {
  id: string; code: string; name_ar: string; category: string; unit: string;
  pack_weight_kg: number; cost_price: number; sale_price: number;
  reorder_level_kg: number; vat_applicable: boolean; is_active: boolean; notes?: string | null;
}

const empty = (): Partial<Item> => ({
  code: '', name_ar: '', category: CATEGORIES[0], unit: 'كجم', pack_weight_kg: 50,
  cost_price: 0, sale_price: 0, reorder_level_kg: 0, vat_applicable: true, is_active: true,
});

const AccItemsPage: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_inventory' as any, 'edit');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Item>>(empty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { data: items = [], refetch } = useQuery<Item[]>({
    queryKey: ['acc_items'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_items').select('*');
      return (data ?? []) as Item[];
    },
  });
  const { data: moves = [] } = useQuery<any[]>({
    queryKey: ['acc_stock_moves'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_stock_moves').select('*');
      return data ?? [];
    },
  });

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    moves.forEach((m: any) => {
      const q = Number(m.quantity_kg || 0) * (m.move_type === 'out' ? -1 : 1);
      map.set(m.item_id, (map.get(m.item_id) ?? 0) + q);
    });
    return map;
  }, [moves]);

  const filtered = items.filter(
    (i) => !search || i.name_ar.includes(search) || i.code.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async () => {
    if (!form.code?.trim()) return toast.error('أدخل كود الصنف');
    if (!form.name_ar?.trim()) return toast.error('أدخل اسم الصنف');
    if (Number(form.sale_price) < Number(form.cost_price)) {
      return toast.error('سعر البيع أقل من التكلفة — راجع الأسعار لتجنب بيع بالخسارة');
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code!.trim(), name_ar: form.name_ar!.trim(), category: form.category,
        unit: form.unit ?? 'كجم', pack_weight_kg: Number(form.pack_weight_kg || 0),
        cost_price: Number(form.cost_price || 0), sale_price: Number(form.sale_price || 0),
        reorder_level_kg: Number(form.reorder_level_kg || 0),
        vat_applicable: !!form.vat_applicable, is_active: !!form.is_active, notes: form.notes ?? null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('acc_items').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الصنف');
      } else {
        const { error } = await (supabase as any).from('acc_items').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة الصنف');
      }
      setOpen(false); setForm(empty()); setEditingId(null);
      qc.invalidateQueries({ queryKey: ['acc_items'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (it: Item) => {
    if ((balances.get(it.id) ?? 0) !== 0) return toast.error('لا يمكن حذف صنف له رصيد أو حركة مخزنية');
    const { error } = await (supabase as any).from('acc_items').delete().eq('id', it.id);
    if (error) return toast.error(error.message);
    toast.success('تم حذف الصنف');
    refetch();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">أصناف الأعلاف (دليل الأصناف)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            الخامات والأعلاف المصنّعة والإضافات — الوحدة الأساسية بالكيلوجرام مع حد إعادة الطلب.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="دليل أصناف الأعلاف"
            headers={['الكود', 'الصنف', 'التصنيف', 'وزن العبوة', 'التكلفة/كجم', 'البيع/كجم', 'الرصيد كجم']}
            rows={filtered.map((i) => [
              i.code, i.name_ar, i.category, money(i.pack_weight_kg),
              money(i.cost_price), money(i.sale_price), money(balances.get(i.id) ?? 0),
            ])}
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty()); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit}><Plus className="h-4 w-4 me-1" /> صنف جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg">
              <DialogHeader><DialogTitle>{editingId ? 'تعديل صنف' : 'صنف جديد'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الكود</Label><Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>الاسم</Label><Input value={form.name_ar ?? ''} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></div>
                <div>
                  <Label>التصنيف</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>وزن العبوة (كجم)</Label><Input type="number" value={form.pack_weight_kg ?? 0} onChange={(e) => setForm({ ...form, pack_weight_kg: Number(e.target.value) })} /></div>
                <div><Label>التكلفة / كجم</Label><Input type="number" step="0.01" value={form.cost_price ?? 0} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} /></div>
                <div><Label>سعر البيع / كجم</Label><Input type="number" step="0.01" value={form.sale_price ?? 0} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} /></div>
                <div><Label>حد إعادة الطلب (كجم)</Label><Input type="number" value={form.reorder_level_kg ?? 0} onChange={(e) => setForm({ ...form, reorder_level_kg: Number(e.target.value) })} /></div>
                <div className="flex items-center justify-between pt-6">
                  <Label>خاضع للضريبة 14%</Label>
                  <Switch checked={!!form.vat_applicable} onCheckedChange={(v) => setForm({ ...form, vat_applicable: v })} />
                </div>
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
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>الأصناف ({filtered.length})</CardTitle>
          <Input placeholder="بحث بالكود أو الاسم" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>وزن العبوة</TableHead>
                <TableHead>التكلفة/كجم</TableHead>
                <TableHead>البيع/كجم</TableHead>
                <TableHead>الرصيد (كجم)</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد أصناف</TableCell></TableRow>
              ) : filtered.map((i) => {
                const bal = balances.get(i.id) ?? 0;
                const low = bal <= Number(i.reorder_level_kg);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.code}</TableCell>
                    <TableCell>{i.name_ar}</TableCell>
                    <TableCell>{i.category}</TableCell>
                    <TableCell>{money(i.pack_weight_kg)}</TableCell>
                    <TableCell>{money(i.cost_price)}</TableCell>
                    <TableCell>{money(i.sale_price)}</TableCell>
                    <TableCell className={low ? 'text-red-600 font-semibold' : ''}>{money(bal)}</TableCell>
                    <TableCell>
                      {low
                        ? <Badge className="bg-red-100 text-red-700">تحت حد الطلب</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-700">متاح</Badge>}
                    </TableCell>
                    <TableCell>
                      <RowActions>
                        <Button variant="ghost" size="icon" title="تعديل" disabled={!canEdit}
                          onClick={() => { setForm(i); setEditingId(i.id); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="حذف" disabled={!canEdit} onClick={() => remove(i)}>
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

export default AccItemsPage;
