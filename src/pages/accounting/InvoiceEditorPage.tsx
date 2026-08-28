import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Send, Save, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildUblInvoiceXml, buildZatcaQrBase64, computeInvoiceTotals,
  InvoiceLineInput, newUuidV4, sha256Base64, xmlToBase64,
} from '@/lib/zatca';

type Mode = 'b2c' | 'b2b';

interface Props {
  mode: Mode;
  pageTitle: string;
  pageDescription: string;
}

interface PosDevice {
  id: string; name: string; serial_number: string; environment: string;
  csid_status: string; production_csid?: string | null; last_icv?: number | null; last_pih?: string | null;
}

interface CompanyProfile {
  legal_name_ar: string; legal_name_en?: string; vat_number: string; cr_number: string;
  street?: string; city?: string; postal_code?: string; country_code?: string;
}

interface InvoiceRow {
  id: string; invoice_number: string; icv: number; issue_date: string;
  buyer_name?: string; buyer_vat_number?: string; total: number; vat_total: number;
  status: string; invoice_type: string; qr_code?: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700',
  reported: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
};
const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مُرسلة', cleared: 'معتمدة (Cleared)',
  reported: 'مُبلغة (Reported)', rejected: 'مرفوضة', cancelled: 'ملغاة',
};

const emptyLine = (): InvoiceLineInput => ({
  description: '', quantity: 1, unitPrice: 0, discountAmount: 0, vatRate: 15, vatCategory: 'S', unit: 'PCE',
});

const InvoiceEditorPage: React.FC<Props> = ({ mode, pageTitle, pageDescription }) => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_sales' as any, 'edit');
  const isB2B = mode === 'b2b';

  const [deviceId, setDeviceId] = useState<string>('');
  const [buyer, setBuyer] = useState({ name: '', vat: '', cr: '', street: '', city: '', postal: '', phone: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'mixed'>('cash');
  const [lines, setLines] = useState<InvoiceLineInput[]>([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: devices = [] } = useQuery({
    queryKey: ['acc_pos_devices', 'active'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_pos_devices').select('*').eq('is_active', true).order('created_at');
      if (error) throw error;
      return (data ?? []) as PosDevice[];
    },
  });

  const { data: company } = useQuery({
    queryKey: ['acc_company_profile'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_company_profile').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as CompanyProfile | null;
    },
  });

  const { data: invoices = [], refetch } = useQuery({
    queryKey: ['acc_sales_invoices', mode],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_sales_invoices').select('*')
        .eq('invoice_type', isB2B ? 'standard' : 'simplified')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  useEffect(() => {
    if (!deviceId && devices.length > 0) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId]);
  const totals = useMemo(() => computeInvoiceTotals(lines), [lines]);

  const updateLine = (i: number, patch: Partial<InvoiceLineInput>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const resetForm = () => {
    setBuyer({ name: '', vat: '', cr: '', street: '', city: '', postal: '', phone: '', email: '' });
    setLines([emptyLine()]);
    setNotes('');
    setPaymentMethod('cash');
  };

  const validate = (): string | null => {
    if (!device) return 'اختر جهاز نقاط بيع أولاً';
    if (!company?.vat_number) return 'أكمل بيانات المنشأة (VAT#) أولاً';
    if (isB2B && !buyer.name) return 'اسم العميل مطلوب في الفاتورة الضريبية (B2B)';
    if (isB2B && !buyer.vat) return 'الرقم الضريبي للعميل مطلوب في الفاتورة الضريبية (B2B)';
    if (!lines.length || lines.some((l) => !l.description || l.quantity <= 0 || l.unitPrice < 0)) {
      return 'راجع بنود الفاتورة (وصف، كمية موجبة، سعر صحيح).';
    }
    return null;
  };

  const buildAndPersist = async (finalize: boolean): Promise<{ id: string; xmlB64: string; hashB64: string; qrB64: string; uuid: string; icv: number; invoiceNumber: string; } | null> => {
    const err = validate();
    if (err) { toast.error(err); return null; }
    setSaving(true);
    try {
      // 1) Sequential ICV
      const { data: icvRes, error: icvErr } = await (supabase as any)
        .rpc('acc_next_device_icv', { _device_id: device!.id });
      if (icvErr) throw icvErr;
      const icv = Number(icvRes);
      const invoiceNumber = `${isB2B ? 'INV' : 'STR'}-${String(icv).padStart(6, '0')}`;
      const uuid = newUuidV4();
      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);
      const issueTime = now.toTimeString().slice(0, 8);

      // 2) UBL XML + hash + QR
      const xml = buildUblInvoiceXml({
        invoiceNumber, uuid, issueDate, issueTime,
        invoiceTypeCode: '388',
        isSimplified: !isB2B,
        icv,
        pih: device!.last_pih ?? undefined,
        seller: {
          name: company!.legal_name_ar, vat: company!.vat_number,
          street: company!.street, city: company!.city, postal: company!.postal_code, country: company!.country_code ?? 'SA',
        },
        buyer: isB2B ? {
          name: buyer.name, vat: buyer.vat, street: buyer.street, city: buyer.city, postal: buyer.postal, country: 'SA',
        } : undefined,
        totals,
      });
      const xmlB64 = xmlToBase64(xml);
      const hashB64 = await sha256Base64(xml);
      const qrB64 = buildZatcaQrBase64({
        sellerName: company!.legal_name_ar,
        sellerVat: company!.vat_number,
        timestampIso: `${issueDate}T${issueTime}Z`,
        totalWithVat: totals.total,
        vatTotal: totals.vatTotal,
        invoiceHashBase64: hashB64,
      });

      // 3) Insert invoice
      const { data: insInv, error: insErr } = await (supabase as any)
        .from('acc_sales_invoices').insert({
          user_id: user!.id,
          device_id: device!.id,
          invoice_number: invoiceNumber,
          icv, uuid, pih: device!.last_pih ?? null, invoice_hash: hashB64,
          invoice_type: isB2B ? 'standard' : 'simplified',
          invoice_subtype: 'invoice',
          buyer_name: buyer.name || null,
          buyer_vat_number: buyer.vat || null,
          buyer_cr_number: buyer.cr || null,
          buyer_address: isB2B ? { street: buyer.street, city: buyer.city, postal_code: buyer.postal } : null,
          buyer_phone: buyer.phone || null,
          buyer_email: buyer.email || null,
          issue_date: issueDate, issue_time: issueTime,
          currency: 'SAR',
          subtotal: totals.subtotal,
          discount_total: totals.discountTotal,
          vat_total: totals.vatTotal,
          total: totals.total,
          amount_paid: paymentMethod === 'credit' ? 0 : totals.total,
          payment_method: paymentMethod,
          status: 'draft',
          qr_code: qrB64,
          signed_xml: xmlB64, // unsigned so far — Edge Function signs on submit
          notes: notes || null,
        }).select('id').single();
      if (insErr) throw insErr;

      // 4) Insert lines
      const linesPayload = totals.lines.map((l, i) => ({
        invoice_id: insInv.id,
        line_number: i + 1,
        item_code: l.itemCode ?? null,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        discount_amount: l.discountAmount,
        vat_category: l.vatCategory,
        vat_rate: l.vatRate,
        net_amount: l.netAmount,
        vat_amount: l.vatAmount,
        total_amount: l.totalAmount,
      }));
      const { error: linesErr } = await (supabase as any)
        .from('acc_sales_invoice_lines').insert(linesPayload);
      if (linesErr) throw linesErr;

      toast.success(finalize ? 'تم إنشاء الفاتورة — جارٍ الإرسال…' : 'تم حفظ الفاتورة كمسودة');
      resetForm();
      qc.invalidateQueries({ queryKey: ['acc_sales_invoices', mode] });
      return { id: insInv.id, xmlB64, hashB64, qrB64, uuid, icv, invoiceNumber };
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الحفظ');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => { await buildAndPersist(false); };

  const submitToZatca = async () => {
    const created = await buildAndPersist(true);
    if (!created) return;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('zatca-submit-invoice', {
        body: {
          device_id: device!.id,
          invoice_uuid: created.uuid,
          invoice_hash_base64: created.hashB64,
          signed_xml_base64: created.xmlB64, // signing performed server-side in future
          invoice_type: isB2B ? 'standard' : 'simplified',
          invoice_id: created.id,
        },
      });
      if (error) throw error;
      const status = data?.status ?? 'unknown';
      await (supabase as any).from('acc_sales_invoices').update({
        status: status === 'success' ? (isB2B ? 'cleared' : 'reported') : status === 'warning' ? 'reported' : 'rejected',
        zatca_submission_id: data?.submission_id ?? null,
        zatca_cleared_xml: data?.cleared_xml_present ? '(stored in submission)' : null,
      }).eq('id', created.id);
      toast.success(`ZATCA: ${status}`);
      refetch();
    } catch (e: any) {
      toast.error(`فشل الإرسال: ${e?.message ?? 'خطأ غير معروف'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{pageDescription}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>معلومات الفاتورة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>جهاز نقاط البيع</Label>
              <Select value={deviceId} onValueChange={setDeviceId}>
                <SelectTrigger><SelectValue placeholder="اختر جهازاً" /></SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — {d.serial_number} ({d.environment})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {device && (
                <p className="text-xs text-muted-foreground mt-1">
                  آخر ICV: {device.last_icv ?? 0} · CSID: {device.production_csid ? '✓' : '✗'}
                </p>
              )}
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit">آجل</SelectItem>
                  <SelectItem value="mixed">مختلط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" />
            </div>
          </div>

          {isB2B && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div><Label>اسم العميل *</Label><Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></div>
              <div><Label>الرقم الضريبي *</Label><Input value={buyer.vat} onChange={(e) => setBuyer({ ...buyer, vat: e.target.value })} placeholder="15 رقماً" /></div>
              <div><Label>رقم السجل التجاري</Label><Input value={buyer.cr} onChange={(e) => setBuyer({ ...buyer, cr: e.target.value })} /></div>
              <div><Label>الشارع</Label><Input value={buyer.street} onChange={(e) => setBuyer({ ...buyer, street: e.target.value })} /></div>
              <div><Label>المدينة</Label><Input value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} /></div>
              <div><Label>الرمز البريدي</Label><Input value={buyer.postal} onChange={(e) => setBuyer({ ...buyer, postal: e.target.value })} /></div>
              <div><Label>الجوال</Label><Input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></div>
              <div><Label>البريد الإلكتروني</Label><Input value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>البنود</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} disabled={!canEdit}>
            <Plus className="h-4 w-4 me-1" /> إضافة بند
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الوصف</TableHead>
                <TableHead className="w-24">الكمية</TableHead>
                <TableHead className="w-28">السعر</TableHead>
                <TableHead className="w-24">الخصم</TableHead>
                <TableHead className="w-20">VAT%</TableHead>
                <TableHead className="w-28">الصافي</TableHead>
                <TableHead className="w-28">الضريبة</TableHead>
                <TableHead className="w-28">الإجمالي</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input value={lines[i].description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.001" value={lines[i].quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" value={lines[i].unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" value={lines[i].discountAmount ?? 0} onChange={(e) => updateLine(i, { discountAmount: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" step="0.01" value={lines[i].vatRate ?? 15} onChange={(e) => updateLine(i, { vatRate: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell className="text-sm">{l.netAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{l.vatAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-medium">{l.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الصافي</div><div className="font-bold">{totals.subtotal.toFixed(2)} SAR</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">إجمالي الخصم</div><div className="font-bold">{totals.discountTotal.toFixed(2)} SAR</div></div>
            <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">ضريبة القيمة المضافة</div><div className="font-bold">{totals.vatTotal.toFixed(2)} SAR</div></div>
            <div className="p-3 rounded bg-primary/10 border border-primary/30"><div className="text-muted-foreground">الإجمالي المستحق</div><div className="font-bold text-primary">{totals.total.toFixed(2)} SAR</div></div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={saveDraft} disabled={!canEdit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
              حفظ كمسودة
            </Button>
            <Button onClick={submitToZatca} disabled={!canEdit || saving || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Send className="h-4 w-4 me-1" />}
              {isB2B ? 'إرسال لاعتماد ZATCA' : 'تسجيل + إبلاغ ZATCA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>آخر الفواتير</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>ICV</TableHead>
                <TableHead>التاريخ</TableHead>
                {isB2B && <TableHead>العميل</TableHead>}
                <TableHead>الإجمالي</TableHead>
                <TableHead>الضريبة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.icv}</TableCell>
                  <TableCell>{inv.issue_date}</TableCell>
                  {isB2B && <TableCell>{inv.buyer_name ?? '-'}</TableCell>}
                  <TableCell>{Number(inv.total).toFixed(2)}</TableCell>
                  <TableCell>{Number(inv.vat_total).toFixed(2)}</TableCell>
                  <TableCell><Badge className={statusColors[inv.status] ?? ''}>{statusLabels[inv.status] ?? inv.status}</Badge></TableCell>
                  <TableCell>{inv.qr_code ? <QrCode className="h-4 w-4 text-emerald-600" /> : '-'}</TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow><TableCell colSpan={isB2B ? 8 : 7} className="text-center text-muted-foreground py-8">لا توجد فواتير بعد</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceEditorPage;
