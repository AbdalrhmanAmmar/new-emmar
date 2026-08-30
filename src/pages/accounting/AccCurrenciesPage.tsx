import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/accounting/FormPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Coins, Star } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Currency {
  id: string; code: string; name: string; symbol?: string | null;
  decimals: number; is_base: boolean; is_active: boolean;
}
interface FxRate {
  id: string; rate_date: string;
  from_currency: string; to_currency: string;
  rate: number; source?: string | null; notes?: string | null;
}

const emptyC = (): Partial<Currency> => ({ code: '', name: '', symbol: '', decimals: 2, is_base: false, is_active: true });
const emptyR = (): Partial<FxRate> => ({
  rate_date: new Date().toISOString().slice(0, 10),
  from_currency: 'USD', to_currency: 'EGP', rate: 0, source: 'SAMA',
});

const fmt = (n: number, d = 6) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: d });

const AccCurrenciesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_currencies' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_currencies' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_currencies' as any, 'delete');

  const [cOpen, setCOpen] = useState(false);
  const [cForm, setCForm] = useState<Partial<Currency>>(emptyC());
  const [rOpen, setROpen] = useState(false);
  const [rForm, setRForm] = useState<Partial<FxRate>>(emptyR());
  const [rDate, setRDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const { data: currencies = [], isLoading: loadingC } = useQuery({
    queryKey: ['acc_currencies'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_currencies').select('*').order('code');
      if (error) throw error;
      return (data || []) as Currency[];
    },
  });

  const { data: rates = [], isLoading: loadingR } = useQuery({
    queryKey: ['acc_fx_rates', rDate],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_fx_rates').select('*')
        .lte('rate_date', rDate).order('rate_date', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as FxRate[];
    },
  });

  const baseCurr = useMemo(() => currencies.find(c => c.is_base), [currencies]);

  const saveC = async () => {
    if (!cForm.code || !cForm.name) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = { ...cForm, code: (cForm.code || '').toUpperCase() };
      delete payload.id;
      // Ensure single base
      if (cForm.is_base) {
        await (supabase as any).from('acc_currencies').update({ is_base: false }).neq('id', cForm.id || '00000000-0000-0000-0000-000000000000');
      }
      const { error } = cForm.id
        ? await (supabase as any).from('acc_currencies').update(payload).eq('id', cForm.id)
        : await (supabase as any).from('acc_currencies').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setCOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_currencies'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const saveR = async () => {
    if (!rForm.from_currency || !rForm.to_currency) { toast.error('اختر العملات'); return; }
    if (!Number(rForm.rate)) { toast.error('السعر مطلوب'); return; }
    try {
      const payload: any = { ...rForm };
      delete payload.id;
      const { error } = rForm.id
        ? await (supabase as any).from('acc_fx_rates').update(payload).eq('id', rForm.id)
        : await (supabase as any).from('acc_fx_rates').insert({ ...payload, created_by: user?.id });
      if (error) throw error;
      toast.success('تم الحفظ'); setROpen(false);
      qc.invalidateQueries({ queryKey: ['acc_fx_rates'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const delC = async (r: Currency) => {
    if (r.is_base) { toast.error('لا يمكن حذف العملة الأساسية'); return; }
    if (!confirm(`حذف ${r.code}؟`)) return;
    const { error } = await (supabase as any).from('acc_currencies').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['acc_currencies'] });
  };

  const delR = async (r: FxRate) => {
    if (!confirm(`حذف سعر ${r.from_currency}/${r.to_currency} بتاريخ ${r.rate_date}؟`)) return;
    const { error } = await (supabase as any).from('acc_fx_rates').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['acc_fx_rates'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Coins className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">تعدد العملات (Multi-Currency)</h1>
            <p className="text-xs text-muted-foreground">إدارة العملات المستخدمة وأسعار الصرف اليومية {baseCurr && <>— العملة الأساسية: <span className="font-bold text-primary">{baseCurr.code}</span></>}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies">العملات ({currencies.length})</TabsTrigger>
          <TabsTrigger value="rates">أسعار الصرف ({rates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="currencies" className="space-y-3">
          <div className="flex justify-end gap-2">
            <ExportPdfButton
              title="العملات"
              headers={['الكود', 'الاسم', 'الرمز', 'الخانات', 'أساسية', 'الحالة']}
              rows={currencies.map(c => [c.code, c.name, c.symbol || '-', String(c.decimals), c.is_base ? 'نعم' : '-', c.is_active ? 'نشطة' : 'موقوفة'])}
              kpis={[{ label: 'الإجمالي', value: currencies.length }, { label: 'الأساسية', value: baseCurr?.code || '-' }]}
            />
            {canEdit && <Button onClick={() => { setCForm(emptyC()); setCOpen(true); }}><Plus className="w-4 h-4 ml-2" /> عملة جديدة</Button>}
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                <TableHead>الرمز</TableHead><TableHead>الخانات العشرية</TableHead>
                <TableHead>أساسية</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingC ? <TableRow><TableCell colSpan={7} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                  : currencies.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد عملات — أضف أول عملة</TableCell></TableRow>
                    : currencies.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold">{c.code}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell className="font-mono">{c.symbol || '-'}</TableCell>
                        <TableCell>{c.decimals}</TableCell>
                        <TableCell>{c.is_base ? <Badge className="bg-amber-100 text-amber-700"><Star className="w-3 h-3 ml-1" /> أساسية</Badge> : '-'}</TableCell>
                        <TableCell>{c.is_active ? <Badge className="bg-emerald-100 text-emerald-700">نشطة</Badge> : <Badge variant="outline">موقوفة</Badge>}</TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && <Button size="sm" variant="ghost" onClick={() => { setCForm(c); setCOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => delC(c)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-3">
          <div className="flex justify-between gap-2 flex-wrap items-end">
            <div className="space-y-1.5">
              <Label>حتى تاريخ</Label>
              <Input type="date" value={rDate} onChange={e => setRDate(e.target.value)} className="w-48" />
            </div>
            <div className="flex gap-2">
              <ExportPdfButton
                title="أسعار الصرف"
                headers={['التاريخ', 'من', 'إلى', 'السعر', 'المصدر']}
                rows={rates.map(r => [r.rate_date, r.from_currency, r.to_currency, fmt(r.rate), r.source || '-'])}
                kpis={[{ label: 'عدد الأسعار', value: rates.length }]}
              />
              {canEdit && <Button onClick={() => { setRForm(emptyR()); setROpen(true); }}><Plus className="w-4 h-4 ml-2" /> سعر جديد</Button>}
            </div>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>التاريخ</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead>
                <TableHead className="text-right">السعر</TableHead><TableHead>المصدر</TableHead><TableHead>ملاحظات</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loadingR ? <TableRow><TableCell colSpan={7} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                  : rates.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">لا توجد أسعار</TableCell></TableRow>
                    : rates.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.rate_date}</TableCell>
                        <TableCell className="font-mono font-bold">{r.from_currency}</TableCell>
                        <TableCell className="font-mono font-bold">{r.to_currency}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.rate)}</TableCell>
                        <TableCell className="text-xs">{r.source || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.notes || '-'}</TableCell>
                        <TableCell>
                          <RowActions>
                            {canEdit && <Button size="sm" variant="ghost" onClick={() => { setRForm(r); setROpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                            {canDelete && <Button size="sm" variant="ghost" onClick={() => delR(r)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Currency dialog */}
      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{cForm.id ? `تعديل ${cForm.code}` : 'عملة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>الكود (ISO) *</Label><Input value={cForm.code || ''} onChange={e => setCForm({ ...cForm, code: e.target.value.toUpperCase() })} placeholder="USD, EUR, EGP..." /></div>
            <div className="space-y-1.5"><Label>الرمز</Label><Input value={cForm.symbol || ''} onChange={e => setCForm({ ...cForm, symbol: e.target.value })} placeholder="$, €, ج.م" /></div>
            <div className="col-span-2 space-y-1.5"><Label>الاسم *</Label><Input value={cForm.name || ''} onChange={e => setCForm({ ...cForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>الخانات العشرية</Label><Input type="number" value={cForm.decimals ?? 2} onChange={e => setCForm({ ...cForm, decimals: Number(e.target.value) })} /></div>
            <div className="space-y-1.5 flex items-end gap-3"><Switch checked={!!cForm.is_active} onCheckedChange={v => setCForm({ ...cForm, is_active: v })} /><Label>نشطة</Label></div>
            <div className="col-span-2 space-y-1.5 flex items-center gap-3 border rounded-md p-3 bg-amber-50/40"><Switch checked={!!cForm.is_base} onCheckedChange={v => setCForm({ ...cForm, is_base: v })} /><Label className="cursor-pointer">اعتبارها العملة الأساسية للنظام (Base Currency)</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCOpen(false)}>إلغاء</Button>
            <Button onClick={saveC}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FX Rate dialog */}
      <Dialog open={rOpen} onOpenChange={setROpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{rForm.id ? 'تعديل سعر صرف' : 'سعر صرف جديد'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>التاريخ</Label><Input type="date" value={rForm.rate_date || ''} onChange={e => setRForm({ ...rForm, rate_date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>السعر *</Label><Input type="number" step="0.000001" value={rForm.rate ?? 0} onChange={e => setRForm({ ...rForm, rate: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>من عملة</Label>
              <Select value={rForm.from_currency || 'USD'} onValueChange={v => setRForm({ ...rForm, from_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>إلى عملة</Label>
              <Select value={rForm.to_currency || 'EGP'} onValueChange={v => setRForm({ ...rForm, to_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>المصدر</Label><Input value={rForm.source || ''} onChange={e => setRForm({ ...rForm, source: e.target.value })} placeholder="SAMA, ECB, يدوي..." /></div>
            <div className="col-span-2 space-y-1.5"><Label>ملاحظات</Label><Input value={rForm.notes || ''} onChange={e => setRForm({ ...rForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setROpen(false)}>إلغاء</Button>
            <Button onClick={saveR}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccCurrenciesPage;
