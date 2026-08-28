import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Line {
  line_id: string; entry_no: string; entry_date: string; status: string; source: string;
  account_id: string; account_code: string; account_name_ar: string; account_type: string;
  line_description: string | null; debit: number; credit: number; running_balance: number;
}

const AccGeneralLedgerPage: React.FC = () => {
  const [accountId, setAccountId] = useState<string>('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['acc_coa_min'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_chart_of_accounts')
        .select('id, code, name_ar').eq('is_group', false).eq('is_active', true).order('code');
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery<Line[]>({
    queryKey: ['acc_gl', accountId, dateFrom, dateTo],
    queryFn: async () => {
      let q: any = (supabase as any).from('v_acc_general_ledger').select('*').order('entry_date').order('entry_no');
      if (accountId !== '__all__') q = q.eq('account_id', accountId);
      if (dateFrom) q = q.gte('entry_date', dateFrom);
      if (dateTo) q = q.lte('entry_date', dateTo);
      const { data, error } = await q.limit(5000);
      if (error) throw error;
      return (data ?? []) as Line[];
    },
  });

  const totals = useMemo(() => ({
    debit: rows.reduce((s, r) => s + Number(r.debit || 0), 0),
    credit: rows.reduce((s, r) => s + Number(r.credit || 0), 0),
  }), [rows]);

  const handleExport = () => {
    const header = ['رقم القيد', 'التاريخ', 'الحساب', 'البيان', 'مدين', 'دائن', 'الرصيد'];
    const body = rows.map((r) => [r.entry_no, r.entry_date, `${r.account_code} - ${r.account_name_ar}`, r.line_description ?? '', r.debit, r.credit, r.running_balance]);
    const csv = '\uFEFF' + [header, ...body].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'general_ledger.csv'; a.click();
    URL.revokeObjectURL(url); toast.success('تم تصدير الدفتر');
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">دفتر الأستاذ العام</h1>
            <p className="text-sm text-muted-foreground">كل حركات الحسابات المرحّلة مع الرصيد التراكمي.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!rows.length}>
            <Download className="w-4 h-4 ml-2" /> تصدير CSV
          </Button>
          <ExportPdfButton
            title="دفتر الأستاذ العام"
            headers={['رقم القيد', 'التاريخ', 'الحساب', 'البيان', 'مدين', 'دائن', 'الرصيد التراكمي']}
            rows={rows.map(r => [
              r.entry_no,
              new Date(r.entry_date).toLocaleDateString('en-GB'),
              `${r.account_code} - ${r.account_name_ar}`,
              r.line_description ?? '',
              Number(r.debit || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
              Number(r.credit || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
              Number(r.running_balance || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
            ])}
            kpis={[
              { label: 'عدد الحركات', value: rows.length },
              { label: 'إجمالي مدين', value: totals.debit.toLocaleString('en-GB', { minimumFractionDigits: 2 }) },
              { label: 'إجمالي دائن', value: totals.credit.toLocaleString('en-GB', { minimumFractionDigits: 2 }) },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">فلاتر</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">الحساب</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="كل الحسابات" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">كل الحسابات</SelectItem>
                {accounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>الحركات</span>
            <span className="text-xs text-muted-foreground font-normal">{rows.length} حركة</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد حركات مطابقة</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم القيد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                    <TableHead className="text-right">الرصيد التراكمي</TableHead>
                    <TableHead>المصدر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line_id}>
                      <TableCell className="font-mono text-xs">{r.entry_no}</TableCell>
                      <TableCell>{new Date(r.entry_date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>{r.account_code} - {r.account_name_ar}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.line_description}</TableCell>
                      <TableCell className="text-right">{Number(r.debit || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{Number(r.credit || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(r.running_balance || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.source}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/50">
                    <td colSpan={4} className="p-3 text-right">الإجمالي</td>
                    <td className="p-3 text-right">{totals.debit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totals.credit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccGeneralLedgerPage;
