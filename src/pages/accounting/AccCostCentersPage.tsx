import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Layers, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface CostCenter {
  id: string; code: string; name: string; name_en?: string | null;
  parent_id?: string | null; level: number;
  cc_type: 'profit' | 'cost' | 'investment' | 'service' | 'project';
  manager_name?: string | null;
  annual_budget: number; actual_ytd: number; commitments: number;
  is_active: boolean; notes?: string | null;
}

const typeLabels: Record<string, string> = {
  profit: 'مركز ربح', cost: 'مركز تكلفة', investment: 'مركز استثمار', service: 'مركز خدمة', project: 'مشروع',
};
const typeColors: Record<string, string> = {
  profit: 'bg-emerald-100 text-emerald-700', cost: 'bg-blue-100 text-blue-700',
  investment: 'bg-purple-100 text-purple-700', service: 'bg-amber-100 text-amber-700',
  project: 'bg-indigo-100 text-indigo-700',
};

const empty = (): Partial<CostCenter> => ({
  code: '', name: '', level: 1, cc_type: 'cost', annual_budget: 0, actual_ytd: 0, commitments: 0, is_active: true,
});

const fmt = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccCostCentersPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_cost_centers' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_cost_centers' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_cost_centers' as any, 'delete');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CostCenter>>(empty());
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_cost_centers'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_cost_centers').select('*').order('code');
      if (error) throw error;
      return (data || []) as CostCenter[];
    },
  });

  const parentsMap = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => {
    const active = rows.filter(r => r.is_active);
    const budget = active.reduce((s, r) => s + Number(r.annual_budget || 0), 0);
    const actual = active.reduce((s, r) => s + Number(r.actual_ytd || 0), 0);
    const commit = active.reduce((s, r) => s + Number(r.commitments || 0), 0);
    return { count: rows.length, active: active.length, budget, actual, commit, remaining: budget - actual - commit };
  }, [rows]);

  const openNew = (parent?: CostCenter) => {
    const f = empty();
    if (parent) { f.parent_id = parent.id; f.level = (parent.level || 1) + 1; }
    setForm(f); setOpen(true);
  };
  const openEdit = (r: CostCenter) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.code || !form.name) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = { ...form };
      delete payload.id;
      const { error } = form.id
        ? await (supabase as any).from('acc_cost_centers').update(payload).eq('id', form.id)
        : await (supabase as any).from('acc_cost_centers').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_cost_centers'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const del = async (r: CostCenter) => {
    const hasChildren = rows.some(x => x.parent_id === r.id);
    if (hasChildren) { toast.error('لا يمكن حذف مركز له مراكز فرعية'); return; }
    if (!confirm(`حذف ${r.code}؟`)) return;
    const { error } = await (supabase as any).from('acc_cost_centers').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_cost_centers'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">مراكز التكلفة المتقدمة (Cost Centers)</h1>
            <p className="text-xs text-muted-foreground">هيكل هرمي لمراكز التكلفة/الربح مع موازنات سنوية ومتابعة الفعلي والالتزامات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportPdfButton
            title="مراكز التكلفة"
            headers={['الكود', 'الاسم', 'النوع', 'المستوى', 'الموازنة', 'الفعلي', 'الالتزامات', 'المتبقي', 'الحالة']}
            rows={filtered.map(r => [r.code, r.name, typeLabels[r.cc_type], String(r.level), fmt(r.annual_budget), fmt(r.actual_ytd), fmt(r.commitments), fmt(Number(r.annual_budget) - Number(r.actual_ytd) - Number(r.commitments)), r.is_active ? 'نشط' : 'موقوف'])}
            kpis={[
              { label: 'الإجمالي', value: totals.count },
              { label: 'إجمالي الموازنة', value: fmt(totals.budget) },
              { label: 'الفعلي', value: fmt(totals.actual) },
              { label: 'المتبقي', value: fmt(totals.remaining) },
            ]}
          />
          {canEdit && <Button onClick={() => openNew()}><Plus className="w-4 h-4 ml-2" /> مركز جديد</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي المراكز</div><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">نشط</div><div className="text-2xl font-bold text-emerald-600">{totals.active}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الموازنة السنوية</div><div className="text-lg font-bold">{fmt(totals.budget)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الفعلي YTD</div><div className="text-lg font-bold text-blue-600">{fmt(totals.actual)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">المتبقي</div><div className={`text-lg font-bold ${totals.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(totals.remaining)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>مراكز التكلفة ({filtered.length})</CardTitle>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالكود أو الاسم..." className="w-64" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
              <TableHead>النوع</TableHead><TableHead>الأب</TableHead>
              <TableHead className="text-right">الموازنة</TableHead>
              <TableHead className="text-right">الفعلي</TableHead>
              <TableHead className="text-right">الالتزامات</TableHead>
              <TableHead className="text-right">المتبقي</TableHead>
              <TableHead className="text-right">الاستهلاك %</TableHead>
              <TableHead>الحالة</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={11} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">لا توجد مراكز</TableCell></TableRow>
                  : filtered.map(r => {
                    const budget = Number(r.annual_budget || 0);
                    const used = Number(r.actual_ytd || 0) + Number(r.commitments || 0);
                    const remaining = budget - used;
                    const pct = budget > 0 ? Math.min(999, Math.round(used / budget * 100)) : 0;
                    const parent = r.parent_id ? parentsMap.get(r.parent_id) : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs" style={{ paddingRight: `${(r.level - 1) * 16 + 12}px` }}>
                          {r.level > 1 && <ChevronRight className="w-3 h-3 inline text-muted-foreground ml-1" />}
                          {r.code}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{r.name}</TableCell>
                        <TableCell><Badge className={typeColors[r.cc_type]}>{typeLabels[r.cc_type]}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{parent ? `${parent.code} — ${parent.name}` : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(budget)}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">{fmt(r.actual_ytd)}</TableCell>
                        <TableCell className="text-right font-mono text-amber-600">{fmt(r.commitments)}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(remaining)}</TableCell>
                        <TableCell className={`text-right font-bold ${pct > 100 ? 'text-rose-600' : pct > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}%</TableCell>
                        <TableCell>{r.is_active ? <Badge className="bg-emerald-100 text-emerald-700">نشط</Badge> : <Badge variant="outline">موقوف</Badge>}</TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && <Button size="sm" variant="ghost" title="إضافة فرعي" onClick={() => openNew(r)}><Plus className="w-3.5 h-3.5 text-primary" /></Button>}
                            {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? `تعديل ${form.code}` : 'مركز تكلفة جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>الكود *</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>الاسم *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>الاسم الإنجليزي</Label><Input value={form.name_en || ''} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>النوع</Label>
              <Select value={form.cc_type || 'cost'} onValueChange={v => setForm({ ...form, cc_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2"><Label>المركز الأب</Label>
              <Select value={form.parent_id || 'none'} onValueChange={v => setForm({ ...form, parent_id: v === 'none' ? null : v, level: v === 'none' ? 1 : (parentsMap.get(v)?.level || 1) + 1 })}>
                <SelectTrigger><SelectValue placeholder="بدون أب (مستوى 1)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون أب —</SelectItem>
                  {rows.filter(r => r.id !== form.id).map(r => <SelectItem key={r.id} value={r.id}>{r.code} — {r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>المستوى</Label><Input type="number" value={form.level ?? 1} onChange={e => setForm({ ...form, level: Number(e.target.value) })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>مدير المركز</Label><Input value={form.manager_name || ''} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الموازنة السنوية</Label><Input type="number" step="0.01" value={form.annual_budget ?? 0} onChange={e => setForm({ ...form, annual_budget: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الفعلي حتى تاريخه</Label><Input type="number" step="0.01" value={form.actual_ytd ?? 0} onChange={e => setForm({ ...form, actual_ytd: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الالتزامات المفتوحة</Label><Input type="number" step="0.01" value={form.commitments ?? 0} onChange={e => setForm({ ...form, commitments: Number(e.target.value) })} /></div>
            <div className="space-y-1.5 flex items-end gap-3"><Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>نشط</Label></div>
            <div className="md:col-span-3 space-y-1.5"><Label>ملاحظات</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccCostCentersPage;
