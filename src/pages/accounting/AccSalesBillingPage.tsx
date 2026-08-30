import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Loader2, Pencil, Printer, Save, Trash2 } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import RowActions from '@/components/accounting/RowActions';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/accounting/FormPage';
import { useRefresh, useTable } from '@/hooks/useTable';
import { printSalesInvoice } from '@/lib/invoicePrint';
import { supabase } from '@/integrations/supabase/externalClient';
import { GL, addDays, calcTotals, getSettings, money, nextDocNo, num, postJournal, qty, todayStr } from '@/lib/docFlow';

type Line = { do_line_id: string; item_code: string; item_name: string; delivered_kg: number; remaining_kg: number; quantity_kg: number; unit_price: number; vat_rate: number };

const AccSalesBillingPage: React.FC = () => {
  const refresh = useRefresh();
  const s = getSettings();
  const { data: invoices = [] } = useTable('acc_sales_invoices');
  const { data: dos = [] } = useTable('acc_deliveries');
  const { data: doLines = [] } = useTable('acc_delivery_lines');
  const { data: orders = [] } = useTable('acc_sales_orders');
  const { data: banks = [] } = useTable('acc_bank_accounts');

  const [doId, setDoId] = useState('');
  const [invDate, setInvDate] = useState(todayStr());
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [collectId, setCollectId] = useState('');
  const [collectAmount, setCollectAmount] = useState(0);

  const openDos = useMemo(() => dos.filter((d: any) => d.status !== 'invoiced' && d.status !== 'cancelled'), [dos]);
  const del = dos.find((d: any) => d.id === doId);

  useEffect(() => {
    if (!doId) return setLines([]);
    setLines(doLines.filter((l: any) => l.do_id === doId).map((l: any) => {
      const remaining = Math.max(0, num(l.delivered_kg) - num(l.invoiced_kg));
      return {
        do_line_id: l.id, item_code: l.item_code, item_name: l.item_name,
        delivered_kg: num(l.delivered_kg), remaining_kg: remaining, quantity_kg: remaining,
        unit_price: num(l.unit_price), vat_rate: num(l.vat_rate),
      };
    }));
  }, [doId, doLines]);

  const totals = useMemo(
    () => calcTotals(lines.map((l) => ({ quantity_kg: l.quantity_kg, unit_price: l.unit_price, vat_rate: l.vat_rate })), { wht_pct: s.wht_sales_pct }),
    [lines, s.wht_sales_pct],
  );

  const setLine = (id: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.do_line_id === id ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!del) return toast.error('اختر إذن التسليم');
    const filled = lines.filter((l) => num(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('لا توجد كميات غير مفوترة على هذا الإذن');
    const over = filled.find((l) => num(l.quantity_kg) > l.remaining_kg + 0.001);
    if (over) return toast.error(`كمية ${over.item_name} أكبر من المسلَّم غير المفوتر`);
    setSaving(true);
    try {
      const so = orders.find((o: any) => o.id === del.so_id);
      const invoice_number = nextDocNo('acc_sales_invoices', 'invoice_number', 'INV');
      const due_date = addDays(invDate, num(so?.payment_terms_days) || 30);
      const journal_no = await postJournal({
        date: invDate,
        description: `فاتورة بيع ${invoice_number} — ${del.customer_name} — ${del.do_no}`,
        source: 'sales_invoice',
        ref_no: invoice_number,
        lines: [
          { code: GL.receivable, description: `مدينون — ${del.customer_name}`, debit: totals.total },
          { code: GL.revenue, description: `إيراد بيع أعلاف ${invoice_number}`, credit: totals.subtotal },
          { code: GL.vatOutput, description: 'ض.ق.م مبيعات مستحقة', credit: totals.vat_total },
        ],
      });
      const { data: ins, error } = await (supabase as any).from('acc_sales_invoices').insert({
        invoice_number, icv: invoices.length + 100, so_no: del.so_no, do_no: del.do_no,
        buyer_name: del.customer_name, buyer_vat_number: so?.customer_vat ?? null, invoice_type: 'b2b',
        subtotal: totals.subtotal, vat_total: totals.vat_total, total: totals.total,
        paid_amount: 0, balance: totals.total, currency: 'EGP', device_id: null,
        status: 'posted', issue_date: invDate, due_date, journal_no, notes: null,
      }).select('*').single();
      if (error) throw error;

      let i = 1;
      for (const l of filled) {
        const net = num(l.quantity_kg) * num(l.unit_price);
        await (supabase as any).from('acc_sales_invoice_lines').insert({
          invoice_id: ins.id, line_no: i++, item_code: l.item_code, description: l.item_name,
          quantity: num(l.quantity_kg), unit: 'كجم', unit_price: num(l.unit_price), vat_rate: l.vat_rate,
          vat_amount: Math.round((net * l.vat_rate) / 100 * 100) / 100,
          line_total: Math.round(net * (1 + l.vat_rate / 100) * 100) / 100,
        });
        const src = doLines.find((x: any) => x.id === l.do_line_id);
        await (supabase as any).from('acc_delivery_lines')
          .update({ invoiced_kg: num(src?.invoiced_kg) + num(l.quantity_kg) }).eq('id', l.do_line_id);
        if (src?.so_line_id) {
          const sol = ((await (supabase as any).from('acc_sales_order_lines').select('*')).data ?? [])
            .find((x: any) => x.id === src.so_line_id);
          if (sol) {
            await (supabase as any).from('acc_sales_order_lines')
              .update({ invoiced_kg: num(sol.invoiced_kg) + num(l.quantity_kg) }).eq('id', sol.id);
          }
        }
      }
      const fully = lines.every((l) => num(l.quantity_kg) >= l.remaining_kg - 0.001);
      await (supabase as any).from('acc_deliveries').update({ status: fully ? 'invoiced' : 'partially_billed' }).eq('id', del.id);
      if (fully && so) await (supabase as any).from('acc_sales_orders').update({ status: 'invoiced' }).eq('id', so.id);

      toast.success(`تم إصدار الفاتورة ${invoice_number} وترحيلها (${journal_no})`);
      setDoId('');
      refresh('acc_sales_invoices', 'acc_sales_invoice_lines', 'acc_deliveries', 'acc_delivery_lines', 'acc_sales_orders', 'acc_sales_order_lines', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const collect = async (inv: any, amount: number) => {
    const due = num(inv.balance);
    if (due <= 0) return toast.error('الفاتورة محصلة بالكامل — لا يمكن تكرار التحصيل');
    const value = amount > 0 ? Math.min(amount, due) : due;
    try {
      const bank = banks[0];
      const journal_no = await postJournal({
        date: todayStr(),
        description: `تحصيل من ${inv.buyer_name} — فاتورة ${inv.invoice_number}`,
        source: 'collection',
        ref_no: inv.invoice_number,
        lines: [
          { code: bank ? GL.bank : GL.cash, description: bank ? `إيداع ${bank.bank_name ?? 'بنكي'}` : 'توريد للخزينة', debit: value },
          { code: GL.receivable, description: `تحصيل من ${inv.buyer_name}`, credit: value },
        ],
      });
      const paid = num(inv.paid_amount) + value;
      const balance = Math.round((num(inv.total) - paid) * 100) / 100;
      await (supabase as any).from('acc_sales_invoices')
        .update({ paid_amount: paid, balance, status: balance <= 0 ? 'paid' : 'partially_paid' }).eq('id', inv.id);
      toast.success(`تم تحصيل ${money(value)} ج.م (${journal_no})`);
      setCollectId(''); setCollectAmount(0);
      refresh('acc_sales_invoices', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل التحصيل');
    }
  };

  /* ===== تعديل / حذف / طباعة فاتورة ===== */
  const { data: invLines = [] } = useTable('acc_sales_invoice_lines');
  const [editInv, setEditInv] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLines, setEditLines] = useState<any[]>([]);

  const editTotals = useMemo(() => {
    const sub = editLines.reduce((t, l) => t + num(l.quantity) * num(l.unit_price), 0);
    const vat = editLines.reduce((t, l) => t + (num(l.quantity) * num(l.unit_price) * num(l.vat_rate)) / 100, 0);
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return { subtotal: r2(sub), vat_total: r2(vat), total: r2(sub + vat) };
  }, [editLines]);

  const openEdit = (inv: any) => {
    setEditInv(inv);
    setEditDate(String(inv.issue_date ?? todayStr()).slice(0, 10));
    setEditDue(inv.due_date ? String(inv.due_date).slice(0, 10) : '');
    setEditNotes(inv.notes ?? '');
    setEditLines(invLines.filter((l: any) => l.invoice_id === inv.id).map((l: any) => ({ ...l })));
    setEditOpen(true);
  };

  const setEditLine = (id: string, patch: any) =>
    setEditLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeJournalOf = async (refNo: string) => {
    await (supabase as any).from('acc_ledger_lines').delete().eq('ref_no', refNo);
    await (supabase as any).from('acc_journal_entries').delete().eq('ref_no', refNo);
  };

  const saveEdit = async () => {
    if (!editInv) return;
    if (!editLines.length) return toast.error('لا توجد أسطر في الفاتورة');
    if (editTotals.total < num(editInv.paid_amount)) return toast.error('إجمالي الفاتورة أقل من المبلغ المحصل بالفعل');
    setSaving(true);
    try {
      for (const l of editLines) {
        const net = num(l.quantity) * num(l.unit_price);
        await (supabase as any).from('acc_sales_invoice_lines').update({
          quantity: num(l.quantity), unit_price: num(l.unit_price), vat_rate: num(l.vat_rate),
          vat_amount: Math.round((net * num(l.vat_rate)) / 100 * 100) / 100,
          line_total: Math.round(net * (1 + num(l.vat_rate) / 100) * 100) / 100,
        }).eq('id', l.id);
      }
      // إعادة ترحيل القيد بالقيم الجديدة (منعاً لتضارب الأرصدة)
      await removeJournalOf(editInv.invoice_number);
      const journal_no = await postJournal({
        date: editDate,
        description: `فاتورة بيع ${editInv.invoice_number} — ${editInv.buyer_name} (معدّلة)`,
        source: 'sales_invoice',
        ref_no: editInv.invoice_number,
        lines: [
          { code: GL.receivable, description: `مدينون — ${editInv.buyer_name}`, debit: editTotals.total },
          { code: GL.revenue, description: `إيراد بيع أعلاف ${editInv.invoice_number}`, credit: editTotals.subtotal },
          { code: GL.vatOutput, description: 'ض.ق.م مبيعات مستحقة', credit: editTotals.vat_total },
        ],
      });
      const paid = num(editInv.paid_amount);
      const balance = Math.round((editTotals.total - paid) * 100) / 100;
      await (supabase as any).from('acc_sales_invoices').update({
        issue_date: editDate, due_date: editDue || null, notes: editNotes || null,
        subtotal: editTotals.subtotal, vat_total: editTotals.vat_total, total: editTotals.total,
        balance, status: balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'posted', journal_no,
      }).eq('id', editInv.id);
      toast.success(`تم تعديل الفاتورة ${editInv.invoice_number} وإعادة ترحيل قيدها`);
      setEditOpen(false);
      setEditInv(null);
      refresh('acc_sales_invoices', 'acc_sales_invoice_lines', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل التعديل');
    } finally {
      setSaving(false);
    }
  };

  const removeInvoice = async (inv: any) => {
    if (num(inv.paid_amount) > 0) return toast.error('لا يمكن حذف فاتورة عليها تحصيلات — اعمل إشعار دائن بدلاً من الحذف');
    if (!window.confirm(`حذف الفاتورة ${inv.invoice_number} نهائياً وإرجاع الكميات لإذن التسليم؟`)) return;
    try {
      const lines = invLines.filter((l: any) => l.invoice_id === inv.id);
      // إرجاع الكميات المفوترة على أسطر إذن التسليم وأمر البيع
      const dl = doLines.filter((l: any) => dos.find((d: any) => d.id === l.do_id)?.do_no === inv.do_no);
      for (const l of lines) {
        const src = dl.find((x: any) => x.item_code === l.item_code);
        if (!src) continue;
        await (supabase as any).from('acc_delivery_lines')
          .update({ invoiced_kg: Math.max(0, num(src.invoiced_kg) - num(l.quantity)) }).eq('id', src.id);
        if (src.so_line_id) {
          const sol = ((await (supabase as any).from('acc_sales_order_lines').select('*')).data ?? [])
            .find((x: any) => x.id === src.so_line_id);
          if (sol) {
            await (supabase as any).from('acc_sales_order_lines')
              .update({ invoiced_kg: Math.max(0, num(sol.invoiced_kg) - num(l.quantity)) }).eq('id', sol.id);
          }
        }
      }
      await (supabase as any).from('acc_sales_invoice_lines').delete().eq('invoice_id', inv.id);
      await removeJournalOf(inv.invoice_number);
      await (supabase as any).from('acc_sales_invoices').delete().eq('id', inv.id);
      const d = dos.find((x: any) => x.do_no === inv.do_no);
      if (d) await (supabase as any).from('acc_deliveries').update({ status: 'delivered' }).eq('id', d.id);
      toast.success(`تم حذف الفاتورة ${inv.invoice_number}`);
      refresh('acc_sales_invoices', 'acc_sales_invoice_lines', 'acc_deliveries', 'acc_delivery_lines', 'acc_sales_orders', 'acc_sales_order_lines', 'acc_journal_entries', 'acc_ledger_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحذف');
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">فوترة وتحصيل المبيعات (المرحلة 4 و5 من دورة البيع)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            الفاتورة تُبنى من إذن التسليم فلا تُفوتر كمية لم تُسلَّم ولا تُفوتر مرتين — بضريبة {s.vat_rate}% وقيد إيراد ومدينين تلقائي.
          </p>
        </div>
        <ExportPdfButton
          title="فواتير المبيعات"
          headers={['رقم الفاتورة', 'التاريخ', 'العميل', 'إذن التسليم', 'الصافي', 'الضريبة', 'الإجمالي', 'المحصل', 'الرصيد']}
          rows={invoices.map((i: any) => [i.invoice_number, i.issue_date, i.buyer_name, i.do_no ?? '', money(i.subtotal), money(i.vat_total), money(i.total), money(i.paid_amount), money(i.balance)])}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>إصدار فاتورة من إذن تسليم</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>إذن التسليم</Label>
              <Select value={doId} onValueChange={setDoId}>
                <SelectTrigger><SelectValue placeholder="إذون غير مفوترة" /></SelectTrigger>
                <SelectContent>{openDos.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.do_no} — {d.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ الفاتورة</Label><Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} /></div>
            <div className="p-3 rounded bg-muted text-sm">
              <div className="text-muted-foreground">العميل</div>
              <div className="font-semibold">{del?.customer_name ?? '—'}</div>
            </div>
          </div>

          {!!lines.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المسلَّم</TableHead>
                  <TableHead>غير المفوتر</TableHead>
                  <TableHead>الكمية المفوترة</TableHead>
                  <TableHead>سعر الكيلو</TableHead>
                  <TableHead>ض.ق.م %</TableHead>
                  <TableHead>القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.do_line_id}>
                    <TableCell className="font-medium">{l.item_name}</TableCell>
                    <TableCell>{qty(l.delivered_kg)}</TableCell>
                    <TableCell>{qty(l.remaining_kg)}</TableCell>
                    <TableCell><Input type="number" className="w-32" value={l.quantity_kg} onChange={(e) => setLine(l.do_line_id, { quantity_kg: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setLine(l.do_line_id, { unit_price: Number(e.target.value) })} /></TableCell>
                    <TableCell>{l.vat_rate}%</TableCell>
                    <TableCell className="font-semibold">{money(num(l.quantity_kg) * num(l.unit_price))} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-3 text-sm">
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">الصافي </span><b>{money(totals.subtotal)}</b></div>
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">ض.ق.م </span><b>{money(totals.vat_total)}</b></div>
              <div className="p-3 rounded bg-primary/10 border border-primary/30"><span className="text-muted-foreground">الإجمالي </span><b className="text-primary">{money(totals.total)} ج.م</b></div>
            </div>
            <Button onClick={save} disabled={saving || !doId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} إصدار وترحيل الفاتورة
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>تحصيل جزئي</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>الفاتورة</Label>
            <Select value={collectId} onValueChange={setCollectId}>
              <SelectTrigger><SelectValue placeholder="فواتير عليها رصيد" /></SelectTrigger>
              <SelectContent>
                {invoices.filter((i: any) => num(i.balance) > 0).map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.invoice_number} — {i.buyer_name} ({money(i.balance)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>المبلغ المحصل (ج.م)</Label><Input type="number" step="0.01" value={collectAmount} onChange={(e) => setCollectAmount(Number(e.target.value))} /></div>
          <Button onClick={() => {
            const inv = invoices.find((i: any) => i.id === collectId);
            if (!inv) return toast.error('اختر الفاتورة');
            if (num(collectAmount) <= 0) return toast.error('أدخل المبلغ');
            collect(inv, num(collectAmount));
          }}>
            <Banknote className="h-4 w-4 me-1" /> تسجيل التحصيل
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>فواتير المبيعات ({invoices.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الاستحقاق</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>إذن التسليم</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>المحصل</TableHead>
                <TableHead>الرصيد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
              ) : invoices.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{new Date(i.issue_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{i.due_date ? new Date(i.due_date).toLocaleDateString('en-GB') : '—'}</TableCell>
                  <TableCell>{i.buyer_name}</TableCell>
                  <TableCell>{i.do_no ?? '—'}</TableCell>
                  <TableCell className="font-semibold">{money(i.total)} ج.م</TableCell>
                  <TableCell>{money(i.paid_amount)}</TableCell>
                  <TableCell className={num(i.balance) > 0 ? 'text-destructive font-semibold' : ''}>{money(i.balance)}</TableCell>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell>
                    <RowActions>
                      <Button variant="ghost" size="icon" title="طباعة الفاتورة" onClick={() => printSalesInvoice(i.id)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="تعديل الفاتورة" onClick={() => openEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="تحصيل كامل الرصيد" onClick={() => collect(i, 0)}>
                        <Banknote className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="حذف الفاتورة" onClick={() => removeInvoice(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditInv(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الفاتورة {editInv?.invoice_number}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label>تاريخ الفاتورة</Label><Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></div>
              <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} /></div>
              <div><Label>ملاحظات</Label><Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="ملاحظات على الفاتورة" /></div>
            </div>

            <Table paginate={false} searchable={false}>
              <TableHeader>
                <TableRow>
                  <TableHead>البيان</TableHead>
                  <TableHead>الكمية (كجم)</TableHead>
                  <TableHead>سعر الكيلو</TableHead>
                  <TableHead>ض.ق.م %</TableHead>
                  <TableHead>الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editLines.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.description ?? l.item_code}</TableCell>
                    <TableCell><Input type="number" className="w-32" value={l.quantity} onChange={(e) => setEditLine(l.id, { quantity: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setEditLine(l.id, { unit_price: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" className="w-20" value={l.vat_rate} onChange={(e) => setEditLine(l.id, { vat_rate: Number(e.target.value) })} /></TableCell>
                    <TableCell className="font-semibold">{money(num(l.quantity) * num(l.unit_price) * (1 + num(l.vat_rate) / 100))} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-3 text-sm flex-wrap">
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">الصافي </span><b>{money(editTotals.subtotal)}</b></div>
              <div className="p-3 rounded bg-muted"><span className="text-muted-foreground">ض.ق.م </span><b>{money(editTotals.vat_total)}</b></div>
              <div className="p-3 rounded bg-primary/10 border border-primary/30"><span className="text-muted-foreground">الإجمالي </span><b className="text-primary">{money(editTotals.total)} ج.م</b></div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} حفظ التعديلات
            </Button>
            <Button variant="outline" onClick={() => printSalesInvoice(editInv?.id)}>
              <Printer className="h-4 w-4 me-1" /> طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccSalesBillingPage;
