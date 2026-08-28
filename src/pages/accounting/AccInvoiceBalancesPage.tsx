import React from 'react';
import ReportTableView, { ReportColumn } from './reports/ReportTableView';
import { Badge } from '@/components/ui/badge';

interface Row {
  invoice_id: string; invoice_no: string; issue_date: string; buyer_name: string;
  invoice_total: number; paid_amount: number; balance_due: number;
}
const columns: ReportColumn<Row>[] = [
  { key: 'invoice_no', header: 'رقم الفاتورة' },
  { key: 'issue_date', header: 'التاريخ', render: (r) => new Date(r.issue_date).toLocaleDateString('ar-EG') },
  { key: 'buyer_name', header: 'العميل' },
  { key: 'invoice_total', header: 'إجمالي الفاتورة', isNumber: true, footerSum: true },
  { key: 'paid_amount', header: 'المسدّد', isNumber: true, footerSum: true },
  { key: 'balance_due', header: 'المتبقي', isNumber: true, footerSum: true,
    render: (r) => (
      <Badge variant={Number(r.balance_due) <= 0 ? 'secondary' : 'default'} className={Number(r.balance_due) <= 0 ? 'bg-emerald-100 text-emerald-800' : ''}>
        {Number(r.balance_due).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
      </Badge>
    ) },
];

const AccInvoiceBalancesPage: React.FC = () => (
  <ReportTableView<Row>
    title="أرصدة الفواتير"
    description="حالة السداد لكل فاتورة مبيعات."
    viewName="v_acc_invoice_balances"
    columns={columns}
    searchKeys={['invoice_no', 'buyer_name']}
    orderBy={{ column: 'issue_date', ascending: false }}
  />
);
export default AccInvoiceBalancesPage;
