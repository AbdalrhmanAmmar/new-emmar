import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

const money = (n: any) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AccStockBalancePage: React.FC = () => {
  const [warehouse, setWarehouse] = useState('all');
  const [search, setSearch] = useState('');

  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['acc_items'],
    queryFn: async () => (await (supabase as any).from('acc_items').select('*')).data ?? [],
  });
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['acc_warehouses'],
    queryFn: async () => (await (supabase as any).from('acc_warehouses').select('*')).data ?? [],
  });
  const { data: moves = [] } = useQuery<any[]>({
    queryKey: ['acc_stock_moves'],
    queryFn: async () => (await (supabase as any).from('acc_stock_moves').select('*')).data ?? [],
  });

  const rows = useMemo(() => {
    const scoped = moves.filter((m) => warehouse === 'all' || m.warehouse_id === warehouse);
    return items
      .map((it) => {
        const ms = scoped.filter((m) => m.item_id === it.id);
        const inQty = ms.filter((m) => m.move_type !== 'out').reduce((s, m) => s + Number(m.quantity_kg || 0), 0);
        const outQty = ms.filter((m) => m.move_type === 'out').reduce((s, m) => s + Number(m.quantity_kg || 0), 0);
        const inVal = ms.filter((m) => m.move_type !== 'out').reduce((s, m) => s + Number(m.total_cost || 0), 0);
        const qty = inQty - outQty;
        const avgCost = inQty > 0 ? inVal / inQty : Number(it.cost_price || 0);
        return {
          id: it.id, code: it.code, name: it.name_ar, category: it.category,
          inQty, outQty, qty, avgCost, value: qty * avgCost,
          reorder: Number(it.reorder_level_kg || 0),
          tons: qty / 1000,
        };
      })
      .filter((r) => !search || r.name.includes(search) || r.code.toLowerCase().includes(search.toLowerCase()));
  }, [items, moves, warehouse, search]);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const lowCount = rows.filter((r) => r.qty <= r.reorder).length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">أرصدة المخزون وتقييمه</h1>
          <p className="text-sm text-muted-foreground mt-1">
            التقييم بالمتوسط المرجح للتكلفة — تنبيه تلقائي للأصناف تحت حد إعادة الطلب.
          </p>
        </div>
        <ExportPdfButton
          title="أرصدة المخزون وتقييمه"
          headers={['الكود', 'الصنف', 'وارد كجم', 'منصرف كجم', 'الرصيد كجم', 'بالطن', 'متوسط التكلفة', 'قيمة المخزون']}
          rows={rows.map((r) => [
            r.code, r.name, money(r.inQty), money(r.outQty), money(r.qty),
            money(r.tons), money(r.avgCost), money(r.value),
          ])}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">قيمة المخزون</div><div className="text-2xl font-bold text-primary">{money(totalValue)} ج.م</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">إجمالي الكميات</div><div className="text-2xl font-bold">{money(rows.reduce((s, r) => s + r.tons, 0))} طن</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">أصناف تحت حد الطلب</div><div className="text-2xl font-bold text-red-600">{lowCount}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle>الأرصدة ({rows.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={warehouse} onValueChange={setWarehouse}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المخازن</SelectItem>
                {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input dir="rtl" placeholder="بحث" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[180px]" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الكود</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>وارد (كجم)</TableHead>
                <TableHead>منصرف (كجم)</TableHead>
                <TableHead>الرصيد (كجم)</TableHead>
                <TableHead>بالطن</TableHead>
                <TableHead>متوسط التكلفة</TableHead>
                <TableHead>قيمة المخزون</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{money(r.inQty)}</TableCell>
                  <TableCell>{money(r.outQty)}</TableCell>
                  <TableCell className={r.qty <= r.reorder ? 'text-red-600 font-semibold' : 'font-semibold'}>{money(r.qty)}</TableCell>
                  <TableCell>{money(r.tons)}</TableCell>
                  <TableCell>{money(r.avgCost)}</TableCell>
                  <TableCell className="font-semibold">{money(r.value)} ج.م</TableCell>
                  <TableCell>
                    {r.qty < 0
                      ? <Badge className="bg-red-100 text-red-700">رصيد سالب</Badge>
                      : r.qty <= r.reorder
                        ? <Badge className="bg-amber-100 text-amber-700">أعد الطلب</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-700">سليم</Badge>}
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

export default AccStockBalancePage;
