import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import ReportTableView, { ReportColumn } from './ReportTableView';
import { Card, CardContent } from '@/components/ui/card';

interface Row {
  account_id: string; code: string; name_ar: string; account_type: string; amount: number;
}
const columns: ReportColumn<Row>[] = [
  { key: 'code', header: 'رمز الحساب' },
  { key: 'name_ar', header: 'اسم الحساب' },
  { key: 'account_type', header: 'النوع', render: (r) => (r.account_type === 'revenue' ? 'إيرادات' : 'مصروفات') },
  { key: 'amount', header: 'المبلغ', isNumber: true, footerSum: true },
];

const AccProfitLossPage: React.FC = () => {
  const { data = [] } = useQuery<Row[]>({
    queryKey: ['acc_report_pl_summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('v_acc_profit_loss').select('*');
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const summary = useMemo(() => {
    const rev = data.filter((r) => r.account_type === 'revenue').reduce((s, r) => s + Number(r.amount || 0), 0);
    const exp = data.filter((r) => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount || 0), 0);
    return { rev, exp, net: rev - exp };
  }, [data]);

  return (
    <div>
      <ReportTableView<Row>
        title="قائمة الدخل (الربح والخسارة)"
        description="مقارنة الإيرادات والمصروفات خلال الفترة."
        viewName="v_acc_profit_loss"
        columns={columns}
        searchKeys={['code', 'name_ar']}
        orderBy={{ column: 'code', ascending: true }}
      />
      <div className="px-6 pb-6">
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="text-xs text-muted-foreground">إجمالي الإيرادات</div>
              <div className="text-xl font-bold text-emerald-600">{summary.rev.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
              <div className="text-xs text-muted-foreground">إجمالي المصروفات</div>
              <div className="text-xl font-bold text-red-600">{summary.exp.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${summary.net >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
              <div className="text-xs text-muted-foreground">صافي الربح/الخسارة</div>
              <div className={`text-xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {summary.net.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default AccProfitLossPage;
