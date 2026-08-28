import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface PnlRow {
  project_code: string;
  project_name: string;
  contract_value: number;
  earned_revenue: number;
  actual_cost: number;
  gross_profit: number;
  gross_margin_pct: number;
  billed: number;
  collected: number;
  wip: number;
  overbilling: number;
  status: 'profit' | 'loss' | 'break_even';
}

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const now = new Date();

const AccProjectPnlPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const canView = isAdmin || hasPermission('accounting_project_pnl' as any, 'view');

  const [year, setYear] = useState<number>(now.getFullYear());
  const [monthFrom, setMonthFrom] = useState<number>(1);
  const [monthTo, setMonthTo] = useState<number>(now.getMonth() + 1);
  const [search, setSearch] = useState('');

  const { data: wipRows = [], isLoading } = useQuery({
    queryKey: ['acc_wip_poc_pnl', year, monthFrom, monthTo],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_wip_poc').select('*')
        .eq('period_year', year)
        .gte('period_month', monthFrom).lte('period_month', monthTo);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Aggregate by project — take latest month values as cumulative snapshot
  const rows: PnlRow[] = useMemo(() => {
    const map = new Map<string, any>();
    // sort by month asc so latest wins
    [...wipRows].sort((a, b) => a.period_month - b.period_month).forEach(r => {
      map.set(r.project_code, r);
    });
    const out: PnlRow[] = [];
    map.forEach((r) => {
      const contract = Number(r.contract_value || 0);
      const earned = Number(r.earned_revenue || 0);
      const cost = Number(r.cost_to_date || 0);
      const gp = +(earned - cost).toFixed(2);
      const gm = earned > 0 ? +(gp / earned * 100).toFixed(2) : 0;
      out.push({
        project_code: r.project_code,
        project_name: r.project_name,
        contract_value: contract,
        earned_revenue: earned,
        actual_cost: cost,
        gross_profit: gp,
        gross_margin_pct: gm,
        billed: Number(r.billed_to_date || 0),
        collected: Number(r.collected_to_date || 0),
        wip: Number(r.wip_amount || 0),
        overbilling: Number(r.overbilling || 0),
        status: gp > 0 ? 'profit' : gp < 0 ? 'loss' : 'break_even',
      });
    });
    return out;
  }, [wipRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.project_code.toLowerCase().includes(q) || r.project_name.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({
    contract: a.contract + r.contract_value,
    earned: a.earned + r.earned_revenue,
    cost: a.cost + r.actual_cost,
    gp: a.gp + r.gross_profit,
    billed: a.billed + r.billed,
    collected: a.collected + r.collected,
    wip: a.wip + r.wip,
    over: a.over + r.overbilling,
    profitable: a.profitable + (r.status === 'profit' ? 1 : 0),
    losing: a.losing + (r.status === 'loss' ? 1 : 0),
  }), { contract: 0, earned: 0, cost: 0, gp: 0, billed: 0, collected: 0, wip: 0, over: 0, profitable: 0, losing: 0 }), [filtered]);

  const overallMargin = totals.earned > 0 ? +(totals.gp / totals.earned * 100).toFixed(2) : 0;

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">أرباح وخسائر المشاريع (Project P&L)</h1>
            <p className="text-xs text-muted-foreground">تحليل ربحية كل مشروع بناءً على الإيراد المكتسب والتكلفة الفعلية</p>
          </div>
        </div>
        <ExportPdfButton
          title={`Project P&L — ${year} (${monthFrom}-${monthTo})`}
          headers={['كود', 'المشروع', 'العقد', 'الإيراد المكتسب', 'التكلفة', 'الربح', 'الهامش %', 'المفوتر', 'المحصّل', 'WIP', 'Over']}
          rows={filtered.map(r => [r.project_code, r.project_name, fmt(r.contract_value), fmt(r.earned_revenue), fmt(r.actual_cost), fmt(r.gross_profit), `${r.gross_margin_pct}%`, fmt(r.billed), fmt(r.collected), fmt(r.wip), fmt(r.overbilling)])}
          kpis={[
            { label: 'إجمالي الإيراد المكتسب', value: fmt(totals.earned) },
            { label: 'إجمالي التكلفة', value: fmt(totals.cost) },
            { label: 'إجمالي الربح', value: fmt(totals.gp) },
            { label: 'هامش عام %', value: `${overallMargin}%` },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1.5"><Label>السنة</Label>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>من شهر</Label>
            <Select value={String(monthFrom)} onValueChange={v => setMonthFrom(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>إلى شهر</Label>
            <Select value={String(monthTo)} onValueChange={v => setMonthTo(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{monthOptions.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2"><Label>بحث</Label><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="كود أو اسم المشروع..." /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">عدد المشاريع</div><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">رابحة</div><div className="text-2xl font-bold text-emerald-600">{totals.profitable}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">خاسرة</div><div className="text-2xl font-bold text-rose-600">{totals.losing}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الإيراد المكتسب</div><div className="text-lg font-bold">{fmt(totals.earned)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">الربح الإجمالي</div><div className={`text-lg font-bold ${totals.gp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(totals.gp)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">هامش الربح</div><div className={`text-lg font-bold ${overallMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{overallMargin}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>تفاصيل المشاريع ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>كود</TableHead><TableHead>المشروع</TableHead>
              <TableHead className="text-right">العقد</TableHead>
              <TableHead className="text-right">الإيراد المكتسب</TableHead>
              <TableHead className="text-right">التكلفة الفعلية</TableHead>
              <TableHead className="text-right">الربح</TableHead>
              <TableHead className="text-right">الهامش %</TableHead>
              <TableHead className="text-right">المفوتر</TableHead>
              <TableHead className="text-right">المحصّل</TableHead>
              <TableHead className="text-right">WIP</TableHead>
              <TableHead className="text-right">Over</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={12} className="text-center py-6">جاري التحميل...</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={12} className="text-center py-6 text-muted-foreground">لا توجد بيانات — تأكد من إدخال WIP/POC للفترة</TableCell></TableRow>
                  : filtered.map(r => (
                    <TableRow key={r.project_code}>
                      <TableCell className="font-mono text-xs">{r.project_code}</TableCell>
                      <TableCell className="text-sm">{r.project_name}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.contract_value)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.earned_revenue)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.actual_cost)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${r.gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(r.gross_profit)}</TableCell>
                      <TableCell className={`text-right font-bold ${r.gross_margin_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.gross_margin_pct}%</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.billed)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.collected)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">{fmt(r.wip)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{fmt(r.overbilling)}</TableCell>
                      <TableCell>
                        {r.status === 'profit' ? <Badge className="bg-emerald-100 text-emerald-700"><TrendingUp className="w-3 h-3 ml-1" /> رابح</Badge>
                          : r.status === 'loss' ? <Badge className="bg-rose-100 text-rose-700"><TrendingDown className="w-3 h-3 ml-1" /> خاسر</Badge>
                            : <Badge className="bg-slate-100 text-slate-700">متعادل</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccProjectPnlPage;
