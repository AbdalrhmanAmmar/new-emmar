import React from 'react';
import ReportTableView, { ReportColumn } from './ReportTableView';
import { Badge } from '@/components/ui/badge';

interface Row {
  invoice_id: string; invoice_no: string; buyer_name: string; issue_date: string;
  invoice_total: number; paid_amount: number; balance_due: number; days_outstanding: number; bucket: string;
}
const bucketClass: Record<string, string> = {
  '0-30': 'bg-emerald-100 text-emerald-800',
  '31-60': 'bg-amber-100 text-amber-800',
  '61-90': 'bg-orange-100 text-orange-800',
  '91-120': 'bg-red-100 text-red-800',
  '120+': 'bg-red-200 text-red-900',
};
const columns: ReportColumn<Row>[] = [
  { key: 'invoice_no', header: 'رقم الفاتورة' },
  { key: 'buyer_name', header: 'العميل' },
  { key: 'issue_date', header: 'تاريخ الإصدار', render: (r) => new Date(r.issue_date).toLocaleDateString('en-GB') },
  { key: 'invoice_total', header: 'قيمة الفاتورة', isNumber: true, footerSum: true },
  { key: 'paid_amount', header: 'المدفوع', isNumber: true, footerSum: true },
  { key: 'balance_due', header: 'المتبقي', isNumber: true, footerSum: true },
  { key: 'days_outstanding', header: 'أيام', align: 'center' },
  { key: 'bucket', header: 'شريحة العمر', align: 'center', render: (r) => <Badge className={bucketClass[r.bucket] ?? ''}>{r.bucket}</Badge> },
];

const AccArAgingPage: React.FC = () => (
  <ReportTableView<Row>
    title="أعمار الديون (المدينون)"
    description="الفواتير غير المسدّدة مصنّفة حسب فترات التأخير."
    viewName="v_acc_ar_aging"
    columns={columns}
    searchKeys={['invoice_no', 'buyer_name']}
    orderBy={{ column: 'days_outstanding', ascending: false }}
  />
);
export default AccArAgingPage;
