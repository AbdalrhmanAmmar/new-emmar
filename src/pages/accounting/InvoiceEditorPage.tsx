import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { InlineFormPage } from '@/components/accounting/InlineFormPage';

const VAT_RATE = 14;

interface Props {
  mode: 'b2b' | 'b2c';
  pageTitle: string;
  pageDescription: string;
}

interface Item {
  id: string; code: string; name_ar: string; unit: string;
  sale_price: number; cost_price: number; vat_applicable: boolean;
}
interface Customer { id: string; name: string; code?: string; tax_number?: string | null; }
interface Invoice {
  id: string; invoice_number: string; buyer_name?: string; buyer_vat_number?: string | null;
  invoice_type: string; subtotal: number; vat_total: number; total: number;
  status: string; issue_date: string; currency?: string;
}
interface Line {
  key: string; item_id: string; item_code: string; description: string;
  quantity: number; unit: string; unit_price: number; discount_pct: number; vat_rate: number;
}

const money = (n: number) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const newLine = (): Line => ({
  key: Math.random().toString(36).slice(2), item_id: '', item_code: '', description: '',
  quantity: 0, unit: 'كجم', unit_price: 0, discount_pct: 0, vat_rate: VAT_RATE,
});

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  posted: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const InvoiceEditorPage: React.FC<Props> = ({ mode, pageTitle, pageDescription }) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_sales' as any, 'edit');

  const [buyerName, setBuyerName] = useState(mode === 'b2c' ? 'عميل نقدي' : '');
  const [custType, setCustType] = useState<'cash' | 'customer'>(mode === 'b2b' ? 'customer' : 'cash');
  const [buyerVat, setBuyerVat] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['acc_items'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_items').select('*');
      return (data ?? []) as Item[];
    },
  });
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['acc_warehouses'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_warehouses').select('*');
      return data ?? [];
    },
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['acc_customers'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_customers').select('*');
      return (data ?? []) as Customer[];
    },
  });
  const { data: moves = [] } = useQuery<any[]>({
    queryKey: ['acc_stock_moves'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_stock_moves').select('*');
      return data ?? [];
    },
  });
  const { data: invoices = [], refetch } = useQuery<Invoice[]>({
    queryKey: ['acc_sales_invoices', mode],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_sales_invoices').select('*');
      return ((data ?? []) as Invoice[]).filter((i) => i.invoice_type === mode);
    },
  });

  const stockOf = (itemId: string, whId: string) =>
    moves
      .filter((m: any) => m.item_id === itemId && (!whId || m.warehouse_id === whId))
      .reduce((s: number, m: any) => s + (m.move_type === 'out' ? -Number(m.quantity_kg || 0) : Number(m.quantity_kg || 0)), 0);

  const totals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    lines.forEach((l) => {
      const gross = Number(l.quantity || 0) * Number(l.unit_price || 0);
      const net = gross * (1 - Number(l.discount_pct || 0) / 100);
      subtotal += net;
      vat += net * (Number(l.vat_rate || 0) / 100);
    });
    subtotal = Math.round(subtotal * 100) / 100;
    vat = Math.round(vat * 100) / 100;
    return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 };
  }, [lines]);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickItem = (key: string, itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    if (!it) return;
    setLine(key, {
      item_id: it.id, item_code: it.code, description: it.name_ar, unit: it.unit,
      unit_price: Number(it.sale_price), vat_rate: it.vat_applicable ? VAT_RATE : 0,
    });
  };

  const save = async () => {
    if (mode === 'b2b' && !customerId) return toast.error('اختر العميل');
    if (!warehouseId) return toast.error('اختر المخزن الصادر منه');
    const filled = lines.filter((l) => l.item_id && Number(l.quantity) > 0);
    if (!filled.length) return toast.error('أضف صنفاً واحداً على الأقل بكمية صحيحة');

    // منع تكرار نفس الصنف في أكثر من سطر
    const dup = filled.map((l) => l.item_id).find((id, i, arr) => arr.indexOf(id) !== i);
    if (dup) return toast.error('لا يمكن تكرار نفس الصنف في أكثر من سطر — اجمع الكمية في سطر واحد');

    // التحقق من كفاية الرصيد المخزني
    for (const l of filled) {
      const bal = stockOf(l.item_id, warehouseId);
      if (Number(l.quantity) > bal) {
        return toast.error(`الرصيد غير كافٍ للصنف ${l.description}: المتاح ${money(bal)} كجم`);
      }
    }

    setSaving(true);
    try {
      const { data: all } = await (supabase as any).from('acc_sales_invoices').select('*');
      const seq = ((all ?? []).length as number) + 2001;
      const invoiceNumber = `INV-${seq}`;
      const cust = customers.find((c) => c.id === customerId);
      const wh = warehouses.find((w: any) => w.id === warehouseId);

      const { data: ins, error } = await (supabase as any).from('acc_sales_invoices').insert({
        user_id: user?.id ?? null,
        invoice_number: invoiceNumber,
        icv: seq,
        buyer_name: mode === 'b2b' ? cust?.name ?? buyerName : buyerName || 'عميل نقدي',
        buyer_vat_number: mode === 'b2b' ? cust?.tax_number ?? buyerVat ?? null : null,
        customer_id: mode === 'b2b' ? customerId : null,
        invoice_type: mode,
        subtotal: totals.subtotal,
        vat_total: totals.vat,
        total: totals.total,
        paid_amount: mode === 'b2c' ? totals.total : 0,
        balance: mode === 'b2c' ? 0 : totals.total,
        currency: 'EGP',
        warehouse_id: warehouseId,
        warehouse_name: wh?.name_ar ?? null,
        status: 'posted',
        issue_date: issueDate,
        due_date: issueDate,
        notes: null,
      }).select('id').single();
      if (error) throw error;

      for (let i = 0; i < filled.length; i++) {
        const l = filled[i];
        const gross = Number(l.quantity) * Number(l.unit_price);
        const net = gross * (1 - Number(l.discount_pct || 0) / 100);
        const vatAmt = Math.round(net * (Number(l.vat_rate) / 100) * 100) / 100;
        await (supabase as any).from('acc_sales_invoice_lines').insert({
          invoice_id: ins.id, line_no: i + 1, item_code: l.item_code, item_id: l.item_id,
          description: l.description, quantity: Number(l.quantity), unit: l.unit,
          unit_price: Number(l.unit_price), discount_pct: Number(l.discount_pct || 0),
          vat_rate: Number(l.vat_rate), vat_amount: vatAmt,
          line_total: Math.round((net + vatAmt) * 100) / 100,
        });
        // صرف مخزني مقابل الفاتورة
        const it = items.find((x) => x.id === l.item_id);
        await (supabase as any).from('acc_stock_moves').insert({
          move_no: `OUT-${invoiceNumber}-${i + 1}`,
          move_date: issueDate, move_type: 'out',
          item_id: l.item_id, item_code: l.item_code, item_name: l.description,
          warehouse_id: warehouseId, warehouse_name: wh?.name_ar ?? null,
          quantity_kg: Number(l.quantity), unit_cost: Number(it?.cost_price ?? 0),
          total_cost: Math.round(Number(l.quantity) * Number(it?.cost_price ?? 0) * 100) / 100,
          ref_type: 'sale', ref_no: invoiceNumber, notes: null,
        });
      }

      toast.success(`تم إصدار الفاتورة ${invoiceNumber} وصرف الكميات من المخزن`);
      setLines([newLine()]);
      if (mode === 'b2c') setBuyerName('عميل نقدي');
      qc.invalidateQueries({ queryKey: ['acc_sales_invoices'] });
      qc.invalidateQueries({ queryKey: ['acc_stock_moves'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل حفظ الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{pageDescription}</p>
        </div>
        <ExportPdfButton
          title={pageTitle}
          headers={['رقم الفاتورة', 'العميل', 'التاريخ', 'الصافي', 'ض.ق.م 14%', 'الإجمالي', 'الحالة']}
          rows={invoices.map((i) => [
            i.invoice_number,
            i.buyer_name ?? '',
            new Date(i.issue_date).toLocaleDateString('en-GB'),
            money(i.subtotal),
            money(i.vat_total),
            money(i.total),
            i.status,
          ])}
        />
      </div>

      <InlineFormPage title="فاتورة جديدة">
          <div className="grid md:grid-cols-4 gap-3">
            {mode === 'b2b' ? (
              <div>
                <Label>العميل</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>اسم العميل (اختياري)</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
            )}
            <div>
              <Label>المخزن الصادر منه</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الفاتورة</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>العملة</Label>
              <Input value="EGP — جنيه مصري" readOnly />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الرصيد المتاح (كجم)</TableHead>
                  <TableHead>الكمية (كجم)</TableHead>
                  <TableHead>سعر الكيلو</TableHead>
                  <TableHead>خصم %</TableHead>
                  <TableHead>ض.ق.م %</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const gross = Number(l.quantity || 0) * Number(l.unit_price || 0);
                  const net = gross * (1 - Number(l.discount_pct || 0) / 100);
                  const lineTotal = net * (1 + Number(l.vat_rate || 0) / 100);
                  const bal = l.item_id ? stockOf(l.item_id, warehouseId) : 0;
                  const short = l.item_id && Number(l.quantity) > bal;
                  return (
                    <TableRow key={l.key}>
                      <TableCell className="min-w-[220px]">
                        <Select value={l.item_id} onValueChange={(v) => pickItem(l.key, v)}>
                          <SelectTrigger><SelectValue placeholder="اختر صنف علف" /></SelectTrigger>
                          <SelectContent>
                            {items.map((it) => (
                              <SelectItem key={it.id} value={it.id}>{it.code} — {it.name_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={short ? 'text-red-600 font-semibold' : ''}>{money(bal)}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={l.quantity}
                          onChange={(e) => setLine(l.key, { quantity: Number(e.target.value) })} className="w-28" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step="0.01" value={l.unit_price}
                          onChange={(e) => setLine(l.key, { unit_price: Number(e.target.value) })} className="w-28" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} value={l.discount_pct}
                          onChange={(e) => setLine(l.key, { discount_pct: Number(e.target.value) })} className="w-20" />
                      </TableCell>
                      <TableCell>{l.vat_rate}%</TableCell>
                      <TableCell className="font-semibold">{money(lineTotal)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon"
                          onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : prev))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus className="h-4 w-4 me-1" /> إضافة سطر
          </Button>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الصافي</div><div className="font-bold">{money(totals.subtotal)} ج.م</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">ض.ق.م 14%</div><div className="font-bold">{money(totals.vat)} ج.م</div></div>
            <div className="p-3 rounded bg-primary/10 border border-primary/30"><div className="text-muted-foreground">الإجمالي</div><div className="font-bold text-primary">{money(totals.total)} ج.م</div></div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!canEdit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
              إصدار الفاتورة وصرف المخزون
            </Button>
          </div>

      </InlineFormPage>
      <Card>
        <CardHeader><CardTitle>سجل الفواتير</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الصافي</TableHead>
                <TableHead>الضريبة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد فواتير</TableCell></TableRow>
              ) : invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{i.buyer_name}</TableCell>
                  <TableCell>{new Date(i.issue_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{money(i.subtotal)}</TableCell>
                  <TableCell>{money(i.vat_total)}</TableCell>
                  <TableCell className="font-semibold">{money(i.total)} ج.م</TableCell>
                  <TableCell><Badge className={statusColors[i.status] ?? ''}>{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceEditorPage;
