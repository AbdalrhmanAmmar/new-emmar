import React from 'react';
import { ArrowLeft, FileText, PackageCheck, Receipt, ShoppingCart, Wallet } from 'lucide-react';

import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import StatusBadge from '@/components/accounting/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTable } from '@/hooks/useTable';
import { money, num, qty } from '@/lib/docFlow';

const STAGES = [
  { icon: FileText, label: 'طلب عرض سعر', table: 'RFQ' },
  { icon: ShoppingCart, label: 'أمر شراء', table: 'PO' },
  { icon: PackageCheck, label: 'إذن استلام', table: 'GRN' },
  { icon: Receipt, label: 'فاتورة مورد', table: 'VB' },
  { icon: Wallet, label: 'سداد', table: 'PAY' },
];

const AccPurchaseCyclePage: React.FC = () => {
  const { data: rfqs = [] } = useTable('acc_rfqs');
  const { data: pos = [] } = useTable('acc_purchase_orders');
  const { data: poLines = [] } = useTable('acc_purchase_order_lines');
  const { data: grns = [] } = useTable('acc_goods_receipts');
  const { data: bills = [] } = useTable('acc_vendor_bills');
  const { data: returns = [] } = useTable('acc_purchase_returns');

  const counts = [rfqs.length, pos.length, grns.length, bills.length, bills.filter((b: any) => num(b.balance) <= 0).length];
  const openPayables = bills.reduce((s: number, b: any) => s + num(b.balance), 0);
  const purchased = pos.reduce((s: number, p: any) => s + num(p.subtotal), 0);
  const receivedKg = poLines.reduce((s: number, l: any) => s + num(l.received_kg), 0);
  const unbilled = grns.filter((g: any) => g.status !== 'billed').length;

  const rows = pos.map((p: any) => {
    const pl = poLines.filter((l: any) => l.po_id === p.id);
    const ordered = pl.reduce((s: number, l: any) => s + num(l.quantity_kg), 0);
    const received = pl.reduce((s: number, l: any) => s + num(l.received_kg), 0);
    const g = grns.filter((x: any) => x.po_no === p.po_no);
    const b = bills.filter((x: any) => x.po_no === p.po_no);
    const paid = b.reduce((s: number, x: any) => s + num(x.paid_amount), 0);
    const due = b.reduce((s: number, x: any) => s + num(x.balance), 0);
    return { p, ordered, received, grn: g.map((x: any) => x.grn_no).join(', '), bill: b.map((x: any) => x.bill_no).join(', '), paid, due };
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">متابعة دورة المشتريات الكاملة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تتبّع كل أمر شراء من طلب عرض السعر حتى السداد، مع الكميات المستلمة والمفوترة والرصيد المستحق للمورد.
          </p>
        </div>
        <ExportPdfButton
          title="متابعة دورة المشتريات"
          headers={['أمر الشراء', 'المورد', 'المطلوب', 'المستلم', 'إذون الاستلام', 'الفواتير', 'المسدد', 'المستحق', 'الحالة']}
          rows={rows.map((r) => [r.p.po_no, r.p.vendor_name, qty(r.ordered), qty(r.received), r.grn || '—', r.bill || '—', money(r.paid), money(r.due), r.p.status])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {STAGES.map((st, i) => (
              <React.Fragment key={st.table}>
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
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">إجمالي المشتريات</div><div className="text-xl font-bold">{money(purchased)} ج.م</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">مستحقات الموردين</div><div className="text-xl font-bold text-destructive">{money(openPayables)} ج.م</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">الكميات المستلمة</div><div className="text-xl font-bold">{qty(receivedKg)} كجم</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">إذون استلام غير مفوترة</div><div className="text-xl font-bold text-amber-600">{unbilled}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سلسلة المستندات ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>أمر الشراء</TableHead>
                <TableHead>طلب العرض</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>المطلوب (كجم)</TableHead>
                <TableHead>المستلم (كجم)</TableHead>
                <TableHead>إذون الاستلام</TableHead>
                <TableHead>فواتير المورد</TableHead>
                <TableHead>المسدد</TableHead>
                <TableHead>المستحق</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد أوامر شراء</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.p.id}>
                  <TableCell className="font-medium">{r.p.po_no}</TableCell>
                  <TableCell>{r.p.rfq_no ?? '—'}</TableCell>
                  <TableCell>{r.p.vendor_name}</TableCell>
                  <TableCell>{qty(r.ordered)}</TableCell>
                  <TableCell>{qty(r.received)}</TableCell>
                  <TableCell>{r.grn || '—'}</TableCell>
                  <TableCell>{r.bill || '—'}</TableCell>
                  <TableCell>{money(r.paid)}</TableCell>
                  <TableCell className={r.due > 0 ? 'text-destructive font-semibold' : ''}>{money(r.due)}</TableCell>
                  <TableCell><StatusBadge status={r.p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">عدد مرتجعات المشتريات المسجلة: {returns.length}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccPurchaseCyclePage;
