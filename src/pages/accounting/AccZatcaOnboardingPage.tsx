import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Device {
  id: string;
  name: string;
  serial_number: string;
  environment: string;
  csid_status: string;
  compliance_csid?: string | null;
  production_csid?: string | null;
  certificate_expiry?: string | null;
  onboarded_at?: string | null;
}

export default function AccZatcaOnboardingPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Device | null>(null);
  const [stage, setStage] = useState<'compliance' | 'production'>('compliance');
  const [otp, setOtp] = useState('');
  const [csr, setCsr] = useState('');
  const [complianceRequestId, setComplianceRequestId] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['acc_pos_devices_zatca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acc_pos_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Device[];
    },
  });

  const open = (d: Device, s: 'compliance' | 'production') => {
    setTarget(d);
    setStage(s);
    setOtp('');
    setCsr('');
    setComplianceRequestId('');
  };

  const submit = async () => {
    if (!target) return;
    if (!csr.trim()) return toast.error('أدخل CSR (base64)');
    if (stage === 'compliance' && !otp.trim()) return toast.error('أدخل OTP');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('zatca-onboard-device', {
        body: {
          device_id: target.id,
          stage,
          otp: otp.trim(),
          csr_base64: csr.trim(),
          compliance_request_id: complianceRequestId.trim() || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || 'فشل الربط مع ZATCA');
      } else {
        toast.success(stage === 'compliance' ? 'تم إصدار Compliance CSID' : 'تم إصدار Production CSID');
        setTarget(null);
        qc.invalidateQueries({ queryKey: ['acc_pos_devices_zatca'] });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">ربط الأجهزة بـ ZATCA فاتورة</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>الأجهزة</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرقم التسلسلي</TableHead>
                <TableHead>البيئة</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Production</TableHead>
                <TableHead>انتهاء الشهادة</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-6">...جاري التحميل</TableCell></TableRow>
              )}
              {!isLoading && devices.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  لا توجد أجهزة. أضفها من صفحة "أجهزة نقاط البيع".
                </TableCell></TableRow>
              )}
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.serial_number}</TableCell>
                  <TableCell><Badge variant="outline">{d.environment}</Badge></TableCell>
                  <TableCell>
                    {d.compliance_csid
                      ? <Badge className="bg-emerald-100 text-emerald-700">صادر</Badge>
                      : <Badge variant="outline">لا يوجد</Badge>}
                  </TableCell>
                  <TableCell>
                    {d.production_csid
                      ? <Badge className="bg-emerald-100 text-emerald-700">مرتبط</Badge>
                      : <Badge variant="outline">لا يوجد</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.certificate_expiry ? new Date(d.certificate_expiry).toLocaleDateString('ar-SA') : '—'}
                  </TableCell>
                  <TableCell className="space-x-1 rtl:space-x-reverse">
                    <Button size="sm" variant="outline" onClick={() => open(d, 'compliance')}>
                      <KeyRound className="h-3 w-3 ml-1" /> Compliance
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!d.compliance_csid}
                      onClick={() => open(d, 'production')}
                    >
                      Production
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {stage === 'compliance' ? 'إصدار Compliance CSID' : 'إصدار Production CSID'} — {target?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {stage === 'compliance' && (
              <div>
                <Label>OTP من بوابة فاتورة</Label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" />
              </div>
            )}
            {stage === 'production' && (
              <div>
                <Label>Compliance Request ID</Label>
                <Input
                  value={complianceRequestId}
                  onChange={(e) => setComplianceRequestId(e.target.value)}
                  placeholder="requestID الصادر من مرحلة Compliance"
                  dir="ltr"
                />
              </div>
            )}
            <div>
              <Label>CSR (Base64)</Label>
              <Textarea
                value={csr}
                onChange={(e) => setCsr(e.target.value)}
                rows={6}
                placeholder="Base64-encoded CSR generated for this device"
                className="font-mono text-xs"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                يُولَّد الـ CSR والمفتاح الخاص محليًا (خارج الخادم) وفق مواصفات ZATCA.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>إلغاء</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إرسال إلى ZATCA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
