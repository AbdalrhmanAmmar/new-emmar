import React from 'react';
import { ArrowLeft, FileText, HandCoins, Receipt, ShoppingBag, Truck } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTable } from '@/hooks/useTable';
import { money, num, qty } from '@/lib/docFlow';

const STAGES = [
  { icon: FileText, label: 'عرض سعر', key: 'qt' },
  { icon: ShoppingBag, label: 'أمر بيع', key: 'so' },
  { icon: Truck, label: 'إذن تسليم', key: 'do' },
  { icon: Receipt, label: 'فاتورة بيع', key: 'inv' },
  { icon: HandCoins, label: 'تحصيل', key: 'pay' },
];

const AccSalesCyclePage: React.FC = () => {
  const { data: quotes = [] } = useTable('acc_sales_quotations');
  const { data: orders = [] } = useTable('acc_sales_orders');
  const { data: orderLines = [] } = useTable('acc_sales_order_lines');
  const { data: dos = [] } = useTable('acc_deliveries');
  const { data: invoices = [] } = useTable('acc_sales_invoices');
  const { data: returns = [] } = useTable('acc_sales_returns');

  const counts = [quotes.length, orders.length, dos.length, invoices.length, invoices.filter((i: any) => num(i.balance) <= 0).length];
  const revenue = invoices.reduce((s: number, i: any) => s + num(i.subtotal), 0);
  const receivables = invoices.reduce((s: number, i: any) => s + num(i.balance), 0);
  const deliveredKg = orderLines.reduce((s: number, l: any) => s + num(l.delivered_kg), 0);
  const reservedKg = orderLines
    .filter((l: any) => {
      const o = orders.find((x: any) => x.id === l.so_id);
      return o && (o.status === 'confirmed' || o.status === 'partially_delivered');
    })
    .reduce((s: number, l: any) => s + Math.max(0, num(l.quantity_kg) - num(l.delivered_kg)), 0);

  const rows = orders.map((o: any) => {
    const ol = orderLines.filter((l: any) => l.so_id === o.id);
    const ordered = ol.reduce((s: number, l: any) => s + num(l.quantity_kg), 0);
    const delivered = ol.reduce((s: number, l: any) => s + num(l.delivered_kg), 0);
    const invoiced = ol.reduce((s: number, l: any) => s + num(l.invoiced_kg), 0);
    const d = dos.filter((x: any) => x.so_no === o.so_no);
    const inv = invoices.filter((x: any) => x.so_no === o.so_no);
    const collected = inv.reduce((s: number, x: any) => s + num(x.paid_amount), 0);
    const due = inv.reduce((s: number, x: any) => s + num(x.balance), 0);
    return { o, ordered, delivered, invoiced, dosNo: d.map((x: any) => x.do_no).join(', '), invNo: inv.map((x: any) => x.invoice_number).join(', '), collected, due };
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">متابعة دورة المبيعات الكاملة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            من عرض السعر حتى التحصيل: الكميات المحجوزة والمسلَّمة والمفوترة ورصيد كل عميل في شاشة واحدة.
          </p>
        </div>
        <ExportPdfButton
          title="متابعة دورة المبيعات"
          headers={['أمر البيع', 'العميل', 'المطلوب', 'المسلَّم', 'المفوتر', 'إذون التسليم', 'الفواتير', 'المحصل', 'المتأخر', 'الحالة']}
          rows={rows.map((r) => [r.o.so_no, r.o.customer_name, qty(r.ordered), qty(r.delivered), qty(r.invoiced), r.dosNo || '—', r.invNo || '—', money(r.collected), money(r.due), r.o.status])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {STAGES.map((st, i) => (
              <React.Fragment key={st.key}>
                <div className="flex-1 min-w-[130px] rounded-lg border bg-card p-4 text-center">
                  <st.icon className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-2xl font-bold">{counts[i]}</div>
                  <div className="text-xs text-muted-foreground">{st.label}</div>
                </div>
                {i < STAGES.length - 1 && <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">صافي المبيعات</div><div className="text-xl font-bold">{money(revenue)} ج.م</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">أرصدة العملاء</div><div className="text-xl font-bold text-destructive">{money(receivables)} ج.م</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">الكميات المسلَّمة</div><div className="text-xl font-bold">{qty(deliveredKg)} كجم</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">كميات محجوزة لم تُسلَّم</div><div className="text-xl font-bold text-amber-600">{qty(reservedKg)} كجم</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سلسلة المستندات ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>أمر البيع</TableHead>
                <TableHead>عرض السعر</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المطلوب (كجم)</TableHead>
                <TableHead>المسلَّم (كجم)</TableHead>
                <TableHead>المفوتر (كجم)</TableHead>
                <TableHead>إذون التسليم</TableHead>
                <TableHead>الفواتير</TableHead>
                <TableHead>المحصل</TableHead>
                <TableHead>المتأخر</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">لا توجد أوامر بيع</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.o.id}>
                  <TableCell className="font-medium">{r.o.so_no}</TableCell>
                  <TableCell>{r.o.quote_no ?? '—'}</TableCell>
                  <TableCell>{r.o.customer_name}</TableCell>
                  <TableCell>{qty(r.ordered)}</TableCell>
                  <TableCell>{qty(r.delivered)}</TableCell>
                  <TableCell>{qty(r.invoiced)}</TableCell>
                  <TableCell>{r.dosNo || '—'}</TableCell>
                  <TableCell>{r.invNo || '—'}</TableCell>
                  <TableCell>{money(r.collected)}</TableCell>
                  <TableCell className={r.due > 0 ? 'text-destructive font-semibold' : ''}>{money(r.due)}</TableCell>
                  <TableCell><StatusBadge status={r.o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">عدد مرتجعات المبيعات المسجلة: {returns.length}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccSalesCyclePage;
