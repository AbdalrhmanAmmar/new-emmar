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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Building2, Combine } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Entity {
  id: string; code: string; name: string; name_en?: string | null;
  base_currency: string; ownership_percent: number;
  parent_entity_id?: string | null;
  is_consolidated: boolean; is_active: boolean; notes?: string | null;
}

interface Balance {
  id: string; period_year: number; period_month: number;
  entity_id: string; entity_code: string;
  total_assets: number; total_liabilities: number; total_equity: number;
  total_revenue: number; total_expenses: number; net_profit: number;
  intercompany_eliminations: number;
  currency: string; fx_rate_to_base: number;
  status: string;
}

const emptyE = (): Partial<Entity> => ({ code: '', name: '', base_currency: 'EGP', ownership_percent: 100, is_consolidated: true, is_active: true });
const emptyB = (): Partial<Balance> => ({
  period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1,
  entity_id: '', entity_code: '', total_assets: 0, total_liabilities: 0, total_equity: 0,
  total_revenue: 0, total_expenses: 0, intercompany_eliminations: 0,
  currency: 'EGP', fx_rate_to_base: 1, status: 'draft',
});

const statusLabels: Record<string, string> = { draft: 'مسودة', posted: 'مرحّل', consolidated: 'مُدمج' };
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', posted: 'bg-accent text-accent-foreground', consolidated: 'bg-primary/10 text-primary',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccConsolidationPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_consolidation' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_consolidation' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_consolidation' as any, 'delete');

  const [eOpen, setEOpen] = useState(false);
  const [eForm, setEForm] = useState<Partial<Entity>>(emptyE());
  const [bOpen, setBOpen] = useState(false);
  const [bForm, setBForm] = useState<Partial<Balance>>(emptyB());
  const [fYear, setFYear] = useState<number>(new Date().getFullYear());
  const [fMonth, setFMonth] = useState<number>(new Date().getMonth() + 1);

  const { data: entities = [] } = useQuery({
    queryKey: ['acc_entities'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_entities').select('*').order('code');
      if (error) throw error;
      return (data || []) as Entity[];
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['acc_consolidation_balances', fYear, fMonth],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_consolidation_balances').select('*')
        .eq('period_year', fYear).eq('period_month', fMonth).order('entity_code');
      if (error) throw error;
      return (data || []) as Balance[];
    },
  });

  const entMap = useMemo(() => new Map(entities.map(e => [e.id, e])), [entities]);

  // Consolidated totals (translate to base by fx_rate, apply ownership_percent, subtract intercompany)
  const consolidated = useMemo(() => {
    let assets = 0, liab = 0, equity = 0, rev = 0, exp = 0, elim = 0;
    balances.filter(b => {
      const e = entMap.get(b.entity_id);
      return e?.is_consolidated;
    }).forEach(b => {
      const e = entMap.get(b.entity_id);
      const own = (Number(e?.ownership_percent || 100)) / 100;
      const fx = Number(b.fx_rate_to_base || 1);
      assets += Number(b.total_assets || 0) * fx * own;
      liab += Number(b.total_liabilities || 0) * fx * own;
      equity += Number(b.total_equity || 0) * fx * own;
      rev += Number(b.total_revenue || 0) * fx * own;
      exp += Number(b.total_expenses || 0) * fx * own;
      elim += Number(b.intercompany_eliminations || 0) * fx;
    });
    const netProfit = rev - exp;
    return { assets, liab, equity, rev, exp, netProfit, elim, count: balances.length };
  }, [balances, entMap]);

  const saveE = async () => {
    if (!eForm.code || !eForm.name) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = { ...eForm };
      delete payload.id;
      const { error } = eForm.id
        ? await (supabase as any).from('acc_entities').update(payload).eq('id', eForm.id)
        : await (supabase as any).from('acc_entities').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setEOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_entities'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const saveB = async () => {
    if (!bForm.entity_id) { toast.error('اختر الجهة'); return; }
    try {
      const netProfit = Number(bForm.total_revenue || 0) - Number(bForm.total_expenses || 0);
      const ent = entMap.get(bForm.entity_id!);
      const payload: any = { ...bForm, net_profit: netProfit, entity_code: ent?.code || bForm.entity_code };
      delete payload.id;
      const { error } = bForm.id
        ? await (supabase as any).from('acc_consolidation_balances').update(payload).eq('id', bForm.id)
        : await (supabase as any).from('acc_consolidation_balances').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setBOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_consolidation_balances'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const delE = async (r: Entity) => {
    if (!confirm(`حذف الجهة ${r.code}؟`)) return;
    const { error } = await (supabase as any).from('acc_entities').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['acc_entities'] });
  };

  const delB = async (r: Balance) => {
    if (!confirm(`حذف رصيد ${r.entity_code} - ${r.period_year}/${r.period_month}؟`)) return;
    const { error } = await (supabase as any).from('acc_consolidation_balances').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['acc_consolidation_balances'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Combine className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">توحيد القوائم المالية (Consolidation)</h1>
            <p className="text-xs text-muted-foreground">توحيد أرصدة الشركات التابعة مع تحويل العملات وتطبيق نسبة الملكية واستبعاد المعاملات البينية</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="consolidated">
        <TabsList>
          <TabsTrigger value="consolidated">القوائم الموحدة</TabsTrigger>
          <TabsTrigger value="balances">أرصدة الجهات ({balances.length})</TabsTrigger>
          <TabsTrigger value="entities">الجهات ({entities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="consolidated" className="space-y-3">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5"><Label>السنة</Label>
              <Select value={String(fYear)} onValueChange={v => setFYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>الشهر</Label>
              <Select value={String(fMonth)} onValueChange={v => setFMonth(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <ExportPdfButton
                title={`القوائم الموحدة — ${fYear}/${fMonth}`}
                headers={['البند', 'القيمة (بالعملة الأساسية)']}
                rows={[
                  ['إجمالي الأصول', fmt(consolidated.assets)],
                  ['إجمالي الخصوم', fmt(consolidated.liab)],
                  ['إجمالي حقوق الملكية', fmt(consolidated.equity)],
                  ['إجمالي الإيرادات', fmt(consolidated.rev)],
                  ['إجمالي المصروفات', fmt(consolidated.exp)],
                  ['صافي الربح', fmt(consolidated.netProfit)],
                  ['استبعادات المعاملات البينية', fmt(consolidated.elim)],
                ]}
                kpis={[{ label: 'الجهات المدرجة', value: consolidated.count }]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">قائمة المركز المالي الموحدة</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>إجمالي الأصول</span><span className="font-mono font-bold text-emerald-600">{fmt(consolidated.assets)}</span></div>
                <div className="flex justify-between"><span>إجمالي الخصوم</span><span className="font-mono font-bold text-rose-600">{fmt(consolidated.liab)}</span></div>
                <div className="flex justify-between border-t pt-2"><span>حقوق الملكية</span><span className="font-mono font-bold text-primary">{fmt(consolidated.equity)}</span></div>
              </CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">قائمة الدخل الموحدة</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>الإيرادات</span><span className="font-mono font-bold text-emerald-600">{fmt(consolidated.rev)}</span></div>
                <div className="flex justify-between"><span>المصروفات</span><span className="font-mono font-bold text-rose-600">{fmt(consolidated.exp)}</span></div>
                <div className="flex justify-between border-t pt-2"><span>صافي الربح</span><span className={`font-mono font-bold ${consolidated.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(consolidated.netProfit)}</span></div>
              </CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">التسويات البينية</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>استبعادات معاملات بينية</span><span className="font-mono font-bold text-amber-600">{fmt(consolidated.elim)}</span></div>
                <div className="flex justify-between"><span>عدد الجهات</span><span className="font-mono font-bold">{consolidated.count}</span></div>
                <div className="text-xs text-muted-foreground pt-2">يتم التحويل تلقائياً للعملة الأساسية وتطبيق نسبة الملكية.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balances" className="space-y-3">
          <div className="flex justify-between gap-2 flex-wrap">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="space-y-1.5"><Label>السنة</Label>
                <Select value={String(fYear)} onValueChange={v => setFYear(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>الشهر</Label>
                <Select value={String(fMonth)} onValueChange={v => setFMonth(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {canEdit && <Button onClick={() => { setBForm({ ...emptyB(), period_year: fYear, period_month: fMonth }); setBOpen(true); }}><Plus className="w-4 h-4 ml-2" /> رصيد جديد</Button>}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الجهة</TableHead><TableHead>العملة</TableHead>
                <TableHead className="text-right">سعر التحويل</TableHead>
                <TableHead className="text-right">الأصول</TableHead>
                <TableHead className="text-right">الخصوم</TableHead>
                <TableHead className="text-right">حقوق الملكية</TableHead>
                <TableHead className="text-right">الإيرادات</TableHead>
                <TableHead className="text-right">المصروفات</TableHead>
                <TableHead className="text-right">صافي الربح</TableHead>
                <TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {balances.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">لا توجد أرصدة لهذه الفترة</TableCell></TableRow>
                  : balances.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.entity_code}</TableCell>
                      <TableCell className="font-mono">{b.currency}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(b.fx_rate_to_base)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(b.total_assets)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(b.total_liabilities)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(b.total_equity)}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">{fmt(b.total_revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-rose-600">{fmt(b.total_expenses)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${Number(b.net_profit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(b.net_profit)}</TableCell>
                      <TableCell><Badge className={statusColors[b.status]}>{statusLabels[b.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => { setBForm(b); setBOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && <Button size="sm" variant="ghost" onClick={() => delB(b)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-3">
          <div className="flex justify-end">
            {canEdit && <Button onClick={() => { setEForm(emptyE()); setEOpen(true); }}><Plus className="w-4 h-4 ml-2" /> جهة جديدة</Button>}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                <TableHead>العملة الأساسية</TableHead>
                <TableHead className="text-right">نسبة الملكية %</TableHead>
                <TableHead>الأم</TableHead><TableHead>مُدرجة</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entities.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">لا توجد جهات</TableCell></TableRow>
                  : entities.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono font-bold">{e.code}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="font-mono">{e.base_currency}</TableCell>
                      <TableCell className="text-right font-bold">{e.ownership_percent}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.parent_entity_id ? entMap.get(e.parent_entity_id)?.code || '-' : '-'}</TableCell>
                      <TableCell>{e.is_consolidated ? <Badge className="bg-primary/10 text-primary">نعم</Badge> : <Badge variant="outline">لا</Badge>}</TableCell>
                      <TableCell>{e.is_active ? <Badge className="bg-accent text-accent-foreground">نشطة</Badge> : <Badge className="bg-muted text-muted-foreground">موقوفة</Badge>}</TableCell>
                      <TableCell>
                        <RowActions>
                          {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEForm(e); setEOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                          {canDelete && <Button size="sm" variant="ghost" onClick={() => delE(e)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Entity Dialog */}
      <Dialog open={eOpen} onOpenChange={setEOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{eForm.id ? `تعديل ${eForm.code}` : 'جهة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الكود *</Label><Input value={eForm.code || ''} onChange={e => setEForm({ ...eForm, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>العملة الأساسية</Label><Input value={eForm.base_currency || 'EGP'} onChange={e => setEForm({ ...eForm, base_currency: e.target.value.toUpperCase() })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>الاسم *</Label><Input value={eForm.name || ''} onChange={e => setEForm({ ...eForm, name: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>الاسم الإنجليزي</Label><Input value={eForm.name_en || ''} onChange={e => setEForm({ ...eForm, name_en: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>نسبة الملكية %</Label><Input type="number" step="0.01" value={eForm.ownership_percent ?? 100} onChange={e => setEForm({ ...eForm, ownership_percent: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الجهة الأم</Label>
              <Select value={eForm.parent_entity_id || 'none'} onValueChange={v => setEForm({ ...eForm, parent_entity_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— بدون —</SelectItem>
                  {entities.filter(x => x.id !== eForm.id).map(x => <SelectItem key={x.id} value={x.id}>{x.code} — {x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3"><Switch checked={!!eForm.is_consolidated} onCheckedChange={v => setEForm({ ...eForm, is_consolidated: v })} /><Label>ضمن التوحيد</Label></div>
            <div className="flex items-end gap-3"><Switch checked={!!eForm.is_active} onCheckedChange={v => setEForm({ ...eForm, is_active: v })} /><Label>نشطة</Label></div>
            <div className="col-span-2 space-y-1.5"><Label>ملاحظات</Label><Textarea value={eForm.notes || ''} onChange={e => setEForm({ ...eForm, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEOpen(false)}>إلغاء</Button>
            <Button onClick={saveE}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={bOpen} onOpenChange={setBOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bForm.id ? 'تعديل رصيد جهة' : 'رصيد جهة جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>السنة</Label><Input type="number" value={bForm.period_year ?? fYear} onChange={e => setBForm({ ...bForm, period_year: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الشهر</Label><Input type="number" min="1" max="12" value={bForm.period_month ?? fMonth} onChange={e => setBForm({ ...bForm, period_month: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الجهة *</Label>
              <Select value={bForm.entity_id || ''} onValueChange={v => setBForm({ ...bForm, entity_id: v, entity_code: entMap.get(v)?.code || '', currency: entMap.get(v)?.base_currency || 'EGP' })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.code} — {e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>العملة</Label><Input value={bForm.currency || 'EGP'} onChange={e => setBForm({ ...bForm, currency: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5"><Label>سعر التحويل للعملة الأساسية</Label><Input type="number" step="0.000001" value={bForm.fx_rate_to_base ?? 1} onChange={e => setBForm({ ...bForm, fx_rate_to_base: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>الحالة</Label>
              <Select value={bForm.status || 'draft'} onValueChange={v => setBForm({ ...bForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>إجمالي الأصول</Label><Input type="number" step="0.01" value={bForm.total_assets ?? 0} onChange={e => setBForm({ ...bForm, total_assets: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>إجمالي الخصوم</Label><Input type="number" step="0.01" value={bForm.total_liabilities ?? 0} onChange={e => setBForm({ ...bForm, total_liabilities: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>حقوق الملكية</Label><Input type="number" step="0.01" value={bForm.total_equity ?? 0} onChange={e => setBForm({ ...bForm, total_equity: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>إجمالي الإيرادات</Label><Input type="number" step="0.01" value={bForm.total_revenue ?? 0} onChange={e => setBForm({ ...bForm, total_revenue: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>إجمالي المصروفات</Label><Input type="number" step="0.01" value={bForm.total_expenses ?? 0} onChange={e => setBForm({ ...bForm, total_expenses: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>استبعادات معاملات بينية</Label><Input type="number" step="0.01" value={bForm.intercompany_eliminations ?? 0} onChange={e => setBForm({ ...bForm, intercompany_eliminations: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBOpen(false)}>إلغاء</Button>
            <Button onClick={saveB}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccConsolidationPage;
