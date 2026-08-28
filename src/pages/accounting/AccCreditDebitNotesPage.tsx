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
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import {
  buildUblInvoiceXml, buildZatcaQrBase64, computeInvoiceTotals,
  newUuidV4, sha256Base64, xmlToBase64,
} from '@/lib/zatca';

const REASONS = [
  { code: '1', text: 'إلغاء أو تعليق التوريدات بعد وقوعها كلياً أو جزئياً' },
  { code: '2', text: 'تغيير جوهري أو تعديل التوريدات بعد وقوعها' },
  { code: '3', text: 'تغيير المبلغ المتفق عليه بين الأطراف' },
  { code: '4', text: 'إرجاع السلع أو الخدمات كلياً أو جزئياً' },
  { code: '5', text: 'أخرى' },
];

interface Invoice {
  id: string; invoice_number: string; icv: number; buyer_name?: string; buyer_vat_number?: string;
  invoice_type: string; total: number; vat_total: number; subtotal: number; device_id: string;
  status: string; issue_date: string;
}
interface Company {
  legal_name_ar: string; vat_number: string; street?: string; city?: string; postal_code?: string; country_code?: string;
}
interface Device { id: string; name: string; last_pih?: string | null; }
interface Note {
  id: string; note_type: string; note_number: string; icv: number; total: number; vat_total: number;
  status: string; reason_code: string; reason_text: string; source_invoice_id: string; issue_date: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700',
  reported: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const AccCreditDebitNotesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = isAdmin || hasPermission('accounting_sales' as any, 'edit');

  const [noteType, setNoteType] = useState<'credit' | 'debit'>('credit');
  const [sourceInvoiceId, setSourceInvoiceId] = useState<string>('');
  const [reasonCode, setReasonCode] = useState('1');
  const [reasonText, setReasonText] = useState(REASONS[0].text);
  const [ratio, setRatio] = useState<number>(100); // % of source to reverse/add
  const [submitting, setSubmitting] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['acc_company_profile'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_company_profile').select('*').limit(1).maybeSingle();
      return data as Company | null;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['acc_sales_invoices', 'submitted'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_sales_invoices')
        .select('id,invoice_number,icv,buyer_name,buyer_vat_number,invoice_type,total,vat_total,subtotal,device_id,status,issue_date')
        .in('status', ['cleared', 'reported', 'submitted'])
        .order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });

  const { data: notes = [], refetch } = useQuery({
    queryKey: ['acc_credit_debit_notes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_credit_debit_notes').select('*')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const source = useMemo(() => invoices.find((i) => i.id === sourceInvoiceId), [invoices, sourceInvoiceId]);

  const preview = useMemo(() => {
    if (!source) return null;
    const factor = Math.min(Math.max(ratio, 0), 100) / 100;
    return {
      subtotal: source.subtotal * factor,
      vat: source.vat_total * factor,
      total: source.total * factor,
    };
  }, [source, ratio]);

  const submit = async () => {
    if (!source) return toast.error('اختر الفاتورة الأصل');
    if (!company?.vat_number) return toast.error('أكمل بيانات المنشأة أولاً');
    if (!reasonCode || !reasonText) return toast.error('حدّد سبب الإشعار');
    setSubmitting(true);
    try {
      // 1) sequential ICV on same device as source
      const { data: icvRes, error: icvErr } = await (supabase as any)
        .rpc('acc_next_device_icv', { _device_id: source.device_id });
      if (icvErr) throw icvErr;
      const icv = Number(icvRes);
      const prefix = noteType === 'credit' ? 'CN' : 'DN';
      const noteNumber = `${prefix}-${String(icv).padStart(6, '0')}`;
      const uuid = newUuidV4();
      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);
      const issueTime = now.toTimeString().slice(0, 8);

      const totals = computeInvoiceTotals([{
        description: `${noteType === 'credit' ? 'إشعار دائن' : 'إشعار مدين'} — ${source.invoice_number} (${reasonText})`,
        quantity: 1,
        unitPrice: (preview?.subtotal ?? 0),
        vatRate: 15,
        vatCategory: 'S',
      }]);

      const xml = buildUblInvoiceXml({
        invoiceNumber: noteNumber, uuid, issueDate, issueTime,
        invoiceTypeCode: noteType === 'credit' ? '381' : '383',
        isSimplified: source.invoice_type === 'simplified',
        icv,
        seller: { name: company.legal_name_ar, vat: company.vat_number, city: company.city, postal: company.postal_code, street: company.street, country: company.country_code ?? 'SA' },
        buyer: source.buyer_vat_number ? { name: source.buyer_name ?? '', vat: source.buyer_vat_number } : undefined,
        totals,
      });
      const xmlB64 = xmlToBase64(xml);
      const hashB64 = await sha256Base64(xml);
      const qrB64 = buildZatcaQrBase64({
        sellerName: company.legal_name_ar, sellerVat: company.vat_number,
        timestampIso: `${issueDate}T${issueTime}Z`,
        totalWithVat: totals.total, vatTotal: totals.vatTotal, invoiceHashBase64: hashB64,
      });

      const { data: ins, error: insErr } = await (supabase as any).from('acc_credit_debit_notes').insert({
        user_id: user!.id, device_id: source.device_id, source_invoice_id: source.id,
        note_type: noteType, note_number: noteNumber, icv, uuid, invoice_hash: hashB64,
        reason_code: reasonCode, reason_text: reasonText,
        issue_date: issueDate, issue_time: issueTime,
        subtotal: totals.subtotal, vat_total: totals.vatTotal, total: totals.total,
        status: 'draft', qr_code: qrB64, signed_xml: xmlB64,
        lines: totals.lines,
      }).select('id').single();
      if (insErr) throw insErr;

      const { data: resp, error: fnErr } = await (supabase as any).functions.invoke('zatca-submit-invoice', {
        body: {
          device_id: source.device_id, invoice_uuid: uuid,
          invoice_hash_base64: hashB64, signed_xml_base64: xmlB64,
          invoice_type: source.invoice_type,
        },
      });
      const st = resp?.status ?? 'unknown';
      await (supabase as any).from('acc_credit_debit_notes').update({
        status: st === 'success' ? (source.invoice_type === 'standard' ? 'cleared' : 'reported')
              : st === 'warning' ? 'reported' : 'rejected',
        zatca_submission_id: resp?.submission_id ?? null,
      }).eq('id', ins.id);
      if (fnErr) toast.warning(`تم الحفظ لكن الإرسال أخفق: ${fnErr.message}`);
      else toast.success(`تم إصدار الإشعار — ZATCA: ${st}`);
      qc.invalidateQueries({ queryKey: ['acc_credit_debit_notes'] });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل الإصدار');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات الدائنة والمدينة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            يجب أن يُصدَر كل إشعار مقابل فاتورة أصل — لا يمكن تعديل الفواتير بعد إرسالها للهيئة.
          </p>
        </div>
        <ExportPdfButton
          title="الإشعارات الدائنة والمدينة"
          headers={['رقم الإشعار', 'النوع', 'التاريخ', 'المبلغ', 'الضريبة', 'السبب', 'الحالة']}
          rows={notes.map(n => [
            n.note_number,
            n.note_type === 'credit' ? 'دائن' : 'مدين',
            new Date(n.issue_date).toLocaleDateString('en-GB'),
            Number(n.total).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
            Number(n.vat_total).toLocaleString('en-GB', { minimumFractionDigits: 2 }),
            n.reason_text,
            n.status,
          ])}
          kpis={[
            { label: 'عدد الإشعارات', value: notes.length },
            { label: 'إجمالي المبالغ', value: notes.reduce((s, n) => s + Number(n.total || 0), 0).toLocaleString('en-GB', { minimumFractionDigits: 2 }) },
          ]}
        />
      </div>


      <Card>
        <CardHeader><CardTitle>إصدار إشعار جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>نوع الإشعار</Label>
              <Select value={noteType} onValueChange={(v) => setNoteType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">إشعار دائن (خصم/إرجاع)</SelectItem>
                  <SelectItem value="debit">إشعار مدين (زيادة/تصحيح)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>الفاتورة الأصل</Label>
              <Select value={sourceInvoiceId} onValueChange={setSourceInvoiceId}>
                <SelectTrigger><SelectValue placeholder="اختر فاتورة سبق إرسالها للهيئة" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.invoice_number} — {Number(i.total).toFixed(2)} EGP — {i.buyer_name ?? 'B2C'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>سبب الإشعار</Label>
              <Select
                value={reasonCode}
                onValueChange={(v) => { setReasonCode(v); setReasonText(REASONS.find((r) => r.code === v)?.text ?? ''); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (<SelectItem key={r.code} value={r.code}>{r.code} — {r.text}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>نص السبب (يمكن تحريره)</Label>
              <Input value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
            </div>
            <div>
              <Label>نسبة الإشعار من الفاتورة الأصل %</Label>
              <Input type="number" min={0} max={100} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
            </div>
          </div>

          {preview && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الصافي</div><div className="font-bold">{preview.subtotal.toFixed(2)}</div></div>
              <div className="p-3 rounded bg-muted"><div className="text-muted-foreground">الضريبة</div><div className="font-bold">{preview.vat.toFixed(2)}</div></div>
              <div className="p-3 rounded bg-primary/10 border border-primary/30"><div className="text-muted-foreground">الإجمالي</div><div className="font-bold text-primary">{preview.total.toFixed(2)}</div></div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canEdit || !sourceInvoiceId || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Send className="h-4 w-4 me-1" />}
              إصدار + إرسال ZATCA
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل الإشعارات</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الإشعار</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.note_number}</TableCell>
                  <TableCell>{n.note_type === 'credit' ? 'دائن' : 'مدين'}</TableCell>
                  <TableCell>{n.issue_date}</TableCell>
                  <TableCell>{Number(n.total).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{n.reason_code} — {n.reason_text}</TableCell>
                  <TableCell><Badge className={statusColors[n.status] ?? ''}>{n.status}</Badge></TableCell>
                </TableRow>
              ))}
              {notes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد إشعارات بعد</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccCreditDebitNotesPage;
