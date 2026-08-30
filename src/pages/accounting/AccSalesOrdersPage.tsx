import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Trash2, XCircle } from 'lucide-react';

import {
  DataTableCard,
  DateField,
  ExportPdfButton,
  FieldGrid,
  NumberField,
  PageHeader,
  RowActions,
  SelectField,
  StatusBadge,
  TotalsBar,
  type Column,
} from '@/components/accounting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRefresh, useTable } from '@/hooks/useTable';
import { supabase } from '@/integrations/supabase/externalClient';
import { availableKg, calcTotals, customerBalance, getSettings, money, nextDocNo, num, qty, todayStr } from '@/lib/docFlow';
import { InlineFormPage } from '@/components/accounting/InlineFormPage';

type Line = { key: string; item_id: string; quantity_kg: number; unit_price: number; discount_pct: number; vat_rate: number };
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2), item_id: '', quantity_kg: 0, unit_price: 0, discount_pct: 0, vat_rate: getSettings().vat_rate });

const AccSalesOrdersPage: React.FC = () => {
  const refresh = useRefresh();
  const s = getSettings();
  const { data: orders = [] } = useTable('acc_sales_orders');
  const { data: orderLines = [] } = useTable('acc_sales_order_lines');
  const { data: customers = [] } = useTable('acc_customers');
  const { data: items = [] } = useTable('acc_items');
  const { data: warehouses = [] } = useTable('acc_warehouses');

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [soDate, setSoDate] = useState(todayStr());
  const [terms, setTerms] = useState(30);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => calcTotals(lines), [lines]);
  const customer = customers.find((c: any) => c.id === customerId);
  const balance = customer ? customerBalance(customer.name_ar) : 0;
  const creditLimit = num(customer?.credit_limit);
  const overLimit = s.enforce_credit_limit && creditLimit > 0 && balance + totals.total > creditLimit;

  const setLine = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickItem = (key: string, id: string) => {
    const it = items.find((i: any) => i.id === id);
    if (!it) return;
    setLine(key, { item_id: id, unit_price: num(it.sale_price), vat_rate: it.vat_applicable ? s.vat_rate : 0 });
  };

  const save = async () => {
    if (!customer) return toast.error('اختر العميل');
    if (!warehouseId) return toast.error('اختر المخزن');
    const filled = lines.filter((l) => l.item_id && num(l.quantity_kg) > 0);
    if (!filled.length) return toast.error('أضف صنفاً واحداً على الأقل');
    if (new Set(filled.map((l) => l.item_id)).size !== filled.length) return toast.error('لا يمكن تكرار نفس الصنف في أكثر من سطر');
    const short = filled.find((l) => availableKg(l.item_id, warehouseId) < num(l.quantity_kg));
    if (short) {
      const it = items.find((i: any) => i.id === short.item_id);
      return toast.error(`المتاح من ${it?.name_ar} هو ${qty(availableKg(short.item_id, warehouseId))} كجم فقط (بعد استبعاد المحجوز)`);
    }
    if (overLimit) return toast.error(`الأمر يتجاوز حد ائتمان العميل (${money(creditLimit)} ج.م) — الرصيد الحالي ${money(balance)} ج.م`);
    setSaving(true);
    try {
      const wh = warehouses.find((w: any) => w.id === warehouseId);
      const so_no = nextDocNo('acc_sales_orders', 'so_no', 'SO');
      const { data: ins, error } = await (supabase as any).from('acc_sales_orders').insert({
        so_no, so_date: soDate, quote_no: null,
        customer_id: customer.id, customer_name: customer.name_ar, customer_vat: customer.vat_number ?? null,
        warehouse_id: warehouseId, warehouse_name: wh?.name_ar,
        payment_terms_days: num(terms), delivery_date: soDate,
        subtotal: totals.subtotal, discount_total: totals.discount_total, vat_total: totals.vat_total, total: totals.total,
        status: 'confirmed', notes: null,
      }).select('*').single();
      if (error) throw error;
      let i = 1;
      for (const l of filled) {
        const it = items.find((x: any) => x.id === l.item_id);
        await (supabase as any).from('acc_sales_order_lines').insert({
          so_id: ins.id, so_no, line_no: i++, item_id: l.item_id, item_code: it?.code, item_name: it?.name_ar, unit: 'كجم',
          warehouse_id: warehouseId, warehouse_name: wh?.name_ar,
          quantity_kg: num(l.quantity_kg), unit_price: num(l.unit_price), discount_pct: num(l.discount_pct), vat_rate: num(l.vat_rate),
          line_total: Math.round(num(l.quantity_kg) * num(l.unit_price) * (1 - num(l.discount_pct) / 100) * (1 + num(l.vat_rate) / 100) * 100) / 100,
          delivered_kg: 0, invoiced_kg: 0,
        });
      }
      toast.success(`تم تأكيد أمر البيع ${so_no} وحجز الكميات بالمخزن`);
      setLines([newLine()]);
      refresh('acc_sales_orders', 'acc_sales_order_lines');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (so: any) => {
    if (so.status !== 'confirmed') return toast.error('لا يمكن إلغاء أمر بدأ تسليمه أو تمت فوترته');
    await (supabase as any).from('acc_sales_orders').update({ status: 'cancelled' }).eq('id', so.id);
    toast.success('تم إلغاء الأمر وفك حجز الكميات');
    refresh('acc_sales_orders');
  };

  const sumLines = (o: any, field: string) =>
    orderLines.filter((l: any) => l.so_id === o.id).reduce((s2: number, l: any) => s2 + num(l[field]), 0);

  const orderColumns: Column<any>[] = [
    { header: 'رقم الأمر', cell: (o) => <span className="font-medium">{o.so_no}</span> },
    { header: 'التاريخ', cell: (o) => new Date(o.so_date).toLocaleDateString('en-GB') },
    { header: 'العميل', cell: (o) => o.customer_name },
    { header: 'المخزن', cell: (o) => o.warehouse_name },
    { header: 'الكمية', cell: (o) => `${qty(sumLines(o, 'quantity_kg'))} كجم` },
    { header: 'المسلَّم', cell: (o) => `${qty(sumLines(o, 'delivered_kg'))} كجم` },
    { header: 'الإجمالي', cell: (o) => <span className="font-semibold">{money(o.total)} ج.م</span> },
    { header: 'الحالة', cell: (o) => <StatusBadge status={o.status} /> },
    {
      header: 'إجراءات',
      cell: (o) => (
        <RowActions>
          <Button variant="ghost" size="icon" title="إلغاء الأمر" onClick={() => cancel(o)}>
            <XCircle className="h-4 w-4 text-destructive" />
          </Button>
        </RowActions>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <PageHeader
        title="أوامر البيع (المرحلة 2 من دورة البيع)"
        subtitle="تأكيد الأمر يحجز الكميات فلا تُباع مرتين، ويتحقق من حد ائتمان العميل قبل الحفظ."
        actions={
          <ExportPdfButton
            title="أوامر البيع"
            headers={['رقم الأمر', 'التاريخ', 'العميل', 'المخزن', 'الصافي', 'الضريبة', 'الإجمالي', 'الحالة']}
            rows={orders.map((o: any) => [o.so_no, o.so_date, o.customer_name, o.warehouse_name, money(o.subtotal), money(o.vat_total), money(o.total), o.status])}
          />
        }
      />

      <InlineFormPage title="أمر بيع جديد">
          <FieldGrid cols={4}>
            <SelectField
              label="العميل"
              placeholder="اختر العميل"
              value={customerId}
              onChange={setCustomerId}
              options={customers.map((c: any) => ({ value: c.id, label: c.name_ar }))}
            />
            <SelectField
              label="المخزن"
              placeholder="اختر المخزن"
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouses.map((w: any) => ({ value: w.id, label: w.name_ar }))}
            />
            <DateField label="تاريخ الأمر" value={soDate} onChange={setSoDate} />
            <NumberField label="مدة السداد (يوم)" value={terms} onChange={setTerms} />
          </FieldGrid>

          {customer && (
            <div className={`flex items-center gap-2 rounded border p-3 text-sm ${overLimit ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-muted'}`}>
              {overLimit ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              رصيد العميل {money(balance)} ج.م — حد الائتمان {creditLimit > 0 ? `${money(creditLimit)} ج.م` : 'غير محدد'} — قيمة الأمر {money(totals.total)} ج.م
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الصنف</TableHead>
                <TableHead>المتاح (كجم)</TableHead>
                <TableHead>الكمية (كجم)</TableHead>
                <TableHead>سعر الكيلو</TableHead>
                <TableHead>خصم %</TableHead>
                <TableHead>ض.ق.م %</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.key}>
                  <TableCell className="min-w-[220px]">
                    <Select value={l.item_id} onValueChange={(v) => pickItem(l.key, v)}>
                      <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                      <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{l.item_id ? qty(availableKg(l.item_id, warehouseId || null)) : '—'}</TableCell>
                  <TableCell><Input type="number" className="w-28" value={l.quantity_kg} onChange={(e) => setLine(l.key, { quantity_kg: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" step="0.01" className="w-28" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: Number(e.target.value) })} /></TableCell>
                  <TableCell><Input type="number" step="0.1" className="w-20" value={l.discount_pct} onChange={(e) => setLine(l.key, { discount_pct: Number(e.target.value) })} /></TableCell>
                  <TableCell>{l.vat_rate}%</TableCell>
                  <TableCell className="font-semibold">
                    {money(num(l.quantity_kg) * num(l.unit_price) * (1 - num(l.discount_pct) / 100) * (1 + num(l.vat_rate) / 100))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.key !== l.key) : p))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}><Plus className="h-4 w-4 me-1" /> إضافة سطر</Button>
            <TotalsBar
              items={[
                { label: 'الصافي', value: totals.subtotal },
                { label: 'ض.ق.م', value: totals.vat_total },
                { label: 'الإجمالي', value: totals.total, primary: true },
              ]}
            />
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />} تأكيد أمر البيع
            </Button>
          </div>

      </InlineFormPage>
      <DataTableCard<any>
        title={`أوامر البيع (${orders.length})`}
        rows={orders}
        rowKey={(o) => o.id}
        empty="لا توجد أوامر بيع"
        columns={orderColumns}
      />
    </div>
  );
};

export default AccSalesOrdersPage;
