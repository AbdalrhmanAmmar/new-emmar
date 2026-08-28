import React from 'react';
import ReportTableView, { ReportColumn } from './ReportTableView';

interface Row {
  period_month: string; invoice_type: string; invoices_count: number;
  total_taxable: number; total_vat: number; total_with_vat: number;
}
const columns: ReportColumn<Row>[] = [
  { key: 'period_month', header: 'الشهر', render: (r) => new Date(r.period_month).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) },
  { key: 'invoice_type', header: 'نوع الفاتورة', render: (r) => r.invoice_type === 'standard' ? 'ضريبية (B2B)' : 'مبسّطة (B2C)' },
  { key: 'invoices_count', header: 'عدد الفواتير', align: 'center' },
  { key: 'total_taxable', header: 'الأساس الخاضع', isNumber: true, footerSum: true },
  { key: 'total_vat', header: 'ضريبة القيمة المضافة', isNumber: true, footerSum: true },
  { key: 'total_with_vat', header: 'الإجمالي شامل الضريبة', isNumber: true, footerSum: true },
];

const AccVatReportPage: React.FC = () => (
  <ReportTableView<Row>
    title="تقرير ضريبة القيمة المضافة"
    description="ملخص شهري للفواتير الخاضعة للضريبة."
    viewName="v_acc_vat_report"
    columns={columns}
    orderBy={{ column: 'period_month', ascending: false }}
  />
);
export default AccVatReportPage;
