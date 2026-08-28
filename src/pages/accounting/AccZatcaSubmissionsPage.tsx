import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Eye } from 'lucide-react';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';

interface Submission {
  id: string;
  submission_type: string;
  environment: string;
  status: string;
  http_status?: number | null;
  request_uuid?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  response_body?: any;
  request_body?: any;
  cleared_xml?: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-700',
};

const typeLabels: Record<string, string> = {
  compliance_csr: 'Compliance CSR',
  compliance_invoice: 'Compliance Invoice',
  production_csid: 'Production CSID',
  clearance: 'مقاصة (Standard)',
  reporting: 'إبلاغ (Simplified)',
  renewal: 'تجديد شهادة',
};

export default function AccZatcaSubmissionsPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewing, setViewing] = useState<Submission | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['acc_zatca_submissions', typeFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('acc_zatca_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (typeFilter !== 'all') q = q.eq('submission_type', typeFilter);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">سجل إرسالات ZATCA</h1>
        </div>
        <ExportPdfButton
          title="سجل إرسالات ZATCA"
          headers={['التاريخ', 'النوع', 'البيئة', 'الحالة', 'HTTP', 'المدة (ms)', 'UUID', 'رسالة الخطأ']}
          rows={rows.map(r => [
            new Date(r.created_at).toLocaleString('en-GB'),
            typeLabels[r.submission_type] ?? r.submission_type,
            r.environment,
            r.status,
            r.http_status ?? '',
            r.duration_ms ?? '',
            r.request_uuid ?? '',
            r.error_message ?? '',
          ])}
          kpis={[
            { label: 'إجمالي الإرسالات', value: rows.length },
            { label: 'الناجحة', value: rows.filter(r => r.status === 'success').length },
            { label: 'الفاشلة', value: rows.filter(r => r.status === 'failed').length },
          ]}
        />
      </div>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>الإرسالات ({rows.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="success">نجح</SelectItem>
                <SelectItem value="warning">تحذير</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="pending">قيد التنفيذ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>البيئة</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>مدة (ms)</TableHead>
                <TableHead>خطأ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-6">...جاري التحميل</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  لا توجد إرسالات بعد.
                </TableCell></TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleString('en-GB')}</TableCell>
                  <TableCell>{typeLabels[s.submission_type] || s.submission_type}</TableCell>
                  <TableCell><Badge variant="outline">{s.environment}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{s.http_status ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[s.status] || ''}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.duration_ms ?? '—'}</TableCell>
                  <TableCell className="text-xs text-red-600 max-w-xs truncate">{s.error_message || '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setViewing(s)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل الإرسال</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-semibold mb-1">Request</div>
                <pre className="bg-muted p-2 rounded overflow-x-auto" dir="ltr">
                  {JSON.stringify(viewing.request_body, null, 2)}
                </pre>
              </div>
              <div>
                <div className="font-semibold mb-1">Response</div>
                <pre className="bg-muted p-2 rounded overflow-x-auto" dir="ltr">
                  {JSON.stringify(viewing.response_body, null, 2)}
                </pre>
              </div>
              {viewing.cleared_xml && (
                <div>
                  <div className="font-semibold mb-1">Cleared XML (Base64)</div>
                  <pre className="bg-muted p-2 rounded overflow-x-auto break-all whitespace-pre-wrap" dir="ltr">
                    {viewing.cleared_xml}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
