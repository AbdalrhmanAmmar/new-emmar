import React from 'react';
import ReportTableView, { ReportColumn } from './ReportTableView';

interface Row {
  account_id: string; account_code: string; account_name: string; account_type: string;
  total_debit: number; total_credit: number; balance: number;
}
const typeAr: Record<string, string> = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };

const columns: ReportColumn<Row>[] = [
  { key: 'account_code', header: 'رمز الحساب' },
  { key: 'account_name', header: 'اسم الحساب' },
  { key: 'account_type', header: 'النوع', render: (r) => typeAr[r.account_type] ?? r.account_type },
  { key: 'total_debit', header: 'مدين', isNumber: true, footerSum: true },
  { key: 'total_credit', header: 'دائن', isNumber: true, footerSum: true },
  { key: 'balance', header: 'الرصيد', isNumber: true, footerSum: true },
];

const AccTrialBalancePage: React.FC = () => (
  <ReportTableView<Row>
    title="ميزان المراجعة"
    description="أرصدة كل الحسابات من القيود المرحّلة."
    viewName="v_acc_trial_balance"
    columns={columns}
    searchKeys={['account_code', 'account_name']}
    orderBy={{ column: 'account_code', ascending: true }}
  />
);
export default AccTrialBalancePage;
