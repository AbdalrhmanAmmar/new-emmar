import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Truck } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRefresh, useTable } from '@/hooks/useTable';
import { supabase } from '@/integrations/supabase/externalClient';
import { GL, money, nextDocNo, num, postJournal, qty, todayStr } from '@/lib/docFlow';

const COST_TYPES = ['نولون نقل', 'تحميل وتنزيل', 'رسوم ميزان', 'تأمين', 'مصاريف جمركية', 'أخرى'];

const AccLandedCostsPage: React.FC = () => {
  const refresh = useRefresh();
  const { data: costs = [] } = useTable('acc_landed_costs');
  const { data: grns = [] } = useTable('acc_goods_receipts');
  const { data: grnLines = [] } = useTable('acc_goods_receipt_lines');
  const { data: vendors = [] } = useTable('acc_vendors');

  const [grnId, setGrnId] = useState('');
  const [costType, setCostType] = useState(COST_TYPES[0]);
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState(0);
  const [costDate, setCostDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const grn = grns.find((g: any) => g.id === grnId);
  const targetLines = useMemo(() => grnLines.filter((l: any) => l.grn_id === grnId), [grnLines, grnId]);
  const totalKg = targetLines.reduce((s: number, l: any) => s + num(l.received_kg), 0);

  const save = async () => {
    if (!grn) return toast.error('اختر إذن الاستلام');
    if (num(amount) <= 0) return toast.error('أدخل قيمة المصروف');
    if (!targetLines.length) return toast.error('لا توجد أصناف على هذا الإذن');
    setSaving(true);
    try {
      const cost_no = nextDocNo('acc_landed_costs', 'cost_no', 'LC');
      const vendor = vendors.find((v: any) => v.id === vendorId);
      // توزيع المصروف على الأصناف بنسبة الوزن وتحديث تكلفة الوحدة الواصلة
      for (const l of targetLines) {
        const share = totalKg > 0 ? (num(amount) * num(l.received_kg)) / totalKg : 0;
        const perKg = num(l.received_kg) > 0 ? share / num(l.received_kg) : 0;
        await (supabase as any).from('acc_goods_receipt_lines')
          .update({ landed_unit_cost: Math.round((num(l.landed_unit_cost || l.unit_cost) + perKg) * 10000) / 10000 })
          .eq('id', l.id);
        const move = ((await (supabase as any).from('acc_stock_moves').select('*')).data ?? [])
          .find((m: any) => m.ref_no === grn.grn_no && m.item_id === l.item_id);
        if (move) {
          const newUnit = Math.round((num(move.unit_cost) + perKg) * 10000) / 10000;
          await (supabase as any).from('acc_stock_moves')
            .update({ unit_cost: newUnit, total_cost: Math.round(newUnit * num(move.quantity_kg) * 100) / 100 })
            .eq('id', move.id);
        }
      }
      const journal_no = await postJournal({
        date: costDate,
        description: `مصاريف وصول ${cost_no} — ${costType} على ${grn.grn_no}`,
        source: 'landed_cost',
        ref_no: cost_no,
        lines: [
          { code: GL.inventory, description: `تحميل ${costType} على المخزون`, debit: num(amount) },
          { code: GL.payable, description: `مستحق ${vendor?.name_ar ?? 'مورد خدمات'}`, credit: num(amount) },
        ],
      });
      await (supabase as any).from('acc_landed_costs').insert({
        cost_no, cost_date: costDate, grn_id: grn.id, grn_no: grn.grn_no, cost_type: costType,
        vendor_id: vendorId || null, vendor_name: vendor?.name_ar ?? null,
        amount: num(amount), allocation: 'weight', status: 'posted', journal_no, notes: notes || null,
      });
      await (supabase as any).from('acc_goods_receipts')
        .update({ landed_cost_total: num(grn.landed_cost_total) + num(amount) }).eq('id', grn.id);
      toast.success(`تم تحميل المصروف على تكلفة الأصناف (${journal_no})`);
      setAmount(0); setNotes('');
      refresh('acc_landed_costs', 'acc_goods_receipts', 'acc_goods_receipt_lines', 'acc_stock_moves', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">مصاريف الوصول (النولون والتحميل)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            توزيع النولون ومصاريف النقل على أصناف إذن الاستلام بنسبة الوزن — تكلفة الطن تصبح واقعية وتظهر في تقييم المخزون فوراً.
          </p>
        </div>
        <ExportPdfButton
          title="مصاريف الوصول"
          headers={['رقم المصروف', 'التاريخ', 'إذن الاستلام', 'النوع', 'المورد', 'القيمة']}
          rows={costs.map((c: any) => [c.cost_no, c.cost_date, c.grn_no, c.cost_type, c.vendor_name ?? '', money(c.amount)])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>تحميل مصروف جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <Label>إذن الاستلام</Label>
              <Select value={grnId} onValueChange={setGrnId}>
                <SelectTrigger><SelectValue placeholder="اختر الإذن" /></SelectTrigger>
                <SelectContent>{grns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.grn_no} — {g.vendor_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>نوع المصروف</Label>
              <Select value={costType} onValueChange={setCostType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>مورد الخدمة</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>القيمة (ج.م)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
            <div><Label>التاريخ</Label><Input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} /></div>
          </div>
          <div><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          {!!targetLines.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الكمية (كجم)</TableHead>
                  <TableHead>تكلفة الكيلو الحالية</TableHead>
                  <TableHead>نصيبه من المصروف</TableHead>
                  <TableHead>تكلفة الكيلو بعد التحميل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetLines.map((l: any) => {
                  const share = totalKg > 0 ? (num(amount) * num(l.received_kg)) / totalKg : 0;
                  const perKg = num(l.received_kg) > 0 ? share / num(l.received_kg) : 0;
                  const current = num(l.landed_unit_cost || l.unit_cost);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.item_name}</TableCell>
                      <TableCell>{qty(l.received_kg)}</TableCell>
                      <TableCell>{money(current)}</TableCell>
                      <TableCell>{money(share)} ج.م</TableCell>
                      <TableCell className="font-semibold text-primary">{money(current + perKg)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !grnId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} تحميل وترحيل
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>المصاريف المحمّلة ({costs.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المصروف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إذن الاستلام</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>القيمة</TableHead>
                <TableHead>القيد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد مصاريف محمّلة</TableCell></TableRow>
              ) : costs.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.cost_no}</TableCell>
                  <TableCell>{new Date(c.cost_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{c.grn_no}</TableCell>
                  <TableCell className="flex items-center gap-1"><Truck className="h-3 w-3 text-muted-foreground" /> {c.cost_type}</TableCell>
                  <TableCell>{c.vendor_name ?? '—'}</TableCell>
                  <TableCell className="font-semibold">{money(c.amount)} ج.م</TableCell>
                  <TableCell>{c.journal_no ?? '—'}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccLandedCostsPage;
