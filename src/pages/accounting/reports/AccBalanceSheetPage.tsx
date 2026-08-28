import React from 'react';
import ReportTableView, { ReportColumn } from './ReportTableView';

interface Row {
  account_id: string; code: string; name_ar: string; account_type: string; balance: number;
}
const typeAr: Record<string, string> = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية' };

const columns: ReportColumn<Row>[] = [
  { key: 'code', header: 'رمز الحساب' },
  { key: 'name_ar', header: 'اسم الحساب' },
  { key: 'account_type', header: 'التصنيف', render: (r) => typeAr[r.account_type] ?? r.account_type },
  { key: 'balance', header: 'الرصيد', isNumber: true, footerSum: true },
];

const AccBalanceSheetPage: React.FC = () => (
  <ReportTableView<Row>
    title="الميزانية العمومية"
    description="أرصدة الأصول والخصوم وحقوق الملكية."
    viewName="v_acc_balance_sheet"
    columns={columns}
    searchKeys={['code', 'name_ar']}
    orderBy={{ column: 'code', ascending: true }}
  />
);
export default AccBalanceSheetPage;
