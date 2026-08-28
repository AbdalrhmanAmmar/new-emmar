import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ClipboardList, CheckCircle2, XCircle, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

interface Line { id?: string; line_no: number; account_id: string; account_code?: string; description?: string; debit: number; credit: number; }
interface Entry {
  id: string; entry_no: string; entry_date: string; description: string | null;
  status: string; source: string; total_debit: number; total_credit: number;
}
const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800',
  posted: 'bg-emerald-100 text-emerald-800',
  reversed: 'bg-red-100 text-red-800',
};
const statusAr: Record<string, string> = { draft: 'مسوّدة', posted: 'مرحّل', reversed: 'مُعكوس' };

const AccJournalEntriesPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_journals' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_journals' as any, 'edit');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ entry_date: string; description: string; lines: Line[] }>({
    entry_date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [{ line_no: 1, account_id: '', description: '', debit: 0, credit: 0 }, { line_no: 2, account_id: '', description: '', debit: 0, credit: 0 }],
  });

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ['acc_journal_entries'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('acc_journal_entries')
        .select('*').order('entry_date', { ascending: false }).order('entry_no', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['acc_coa_leaf'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('acc_chart_of_accounts')
        .select('id, code, name_ar').eq('is_group', false).eq('is_active', true).order('code');
      return data ?? [];
    },
  });

  const { data: entryLines = [] } = useQuery({
    queryKey: ['acc_ledger_lines', viewEntry?.id ?? editingId],
    enabled: !!(viewEntry?.id || editingId),
    queryFn: async () => {
      const id = viewEntry?.id ?? editingId!;
      const { data } = await (supabase as any).from('acc_ledger_lines')
        .select('*').eq('journal_entry_id', id).order('line_no');
      return data ?? [];
    },
  });

  React.useEffect(() => {
    if (editingId && entryLines.length) {
      setForm((f) => ({
        ...f,
        lines: entryLines.map((l: any) => ({
          id: l.id, line_no: l.line_no, account_id: l.account_id, account_code: l.account_code,
          description: l.description ?? '', debit: Number(l.debit || 0), credit: Number(l.credit || 0),
        })),
      }));
    }
  }, [editingId, entryLines]);

  const totals = useMemo(() => ({
    debit: form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
    credit: form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0),
  }), [form.lines]);
  const balanced = Math.abs(totals.debit - totals.credit) < 0.005 && totals.debit > 0;

  const resetForm = () => {
    setEditingId(null);
    setForm({
      entry_date: new Date().toISOString().slice(0, 10),
      description: '',
      lines: [{ line_no: 1, account_id: '', description: '', debit: 0, credit: 0 }, { line_no: 2, account_id: '', description: '', debit: 0, credit: 0 }],
    });
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = async (e: Entry) => {
    if (e.status !== 'draft') { toast.error('لا يمكن تعديل قيد مرحّل'); return; }
    setEditingId(e.id);
    setForm({ entry_date: e.entry_date, description: e.description ?? '', lines: [] });
    setDialogOpen(true);
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { line_no: f.lines.length + 1, account_id: '', description: '', debit: 0, credit: 0 }] }));
  const removeLine = (i: number) => setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_no: idx + 1 })) }));
  const updateLine = (i: number, patch: Partial<Line>) => setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));

  const save = async (postAfter: boolean) => {
    if (!balanced) { toast.error('القيد غير متوازن — إجمالي المدين يجب أن يساوي إجمالي الدائن'); return; }
    if (form.lines.some((l) => !l.account_id)) { toast.error('اختر الحساب لكل سطر'); return; }
    try {
      let entryId = editingId;
      if (editingId) {
        const { error } = await (supabase as any).from('acc_journal_entries')
          .update({ entry_date: form.entry_date, description: form.description, total_debit: totals.debit, total_credit: totals.credit })
          .eq('id', editingId);
        if (error) throw error;
        await (supabase as any).from('acc_ledger_lines').delete().eq('journal_entry_id', editingId);
      } else {
        const { data: nextNo } = await (supabase as any).rpc('acc_next_journal_no');
        const { data: ins, error } = await (supabase as any).from('acc_journal_entries').insert({
          entry_no: nextNo, entry_date: form.entry_date, description: form.description,
          source: 'manual', status: 'draft',
          total_debit: totals.debit, total_credit: totals.credit, created_by: user?.id,
        }).select('id').single();
        if (error) throw error;
        entryId = ins.id;
      }
      const lines = form.lines.map((l) => {
        const acc = accounts.find((a: any) => a.id === l.account_id);
        return {
          journal_entry_id: entryId, line_no: l.line_no, account_id: l.account_id,
          account_code: acc?.code ?? '', description: l.description ?? null,
          debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
        };
      });
      const { error: lerr } = await (supabase as any).from('acc_ledger_lines').insert(lines);
      if (lerr) throw lerr;

      if (postAfter) {
        const { error: perr } = await (supabase as any).from('acc_journal_entries')
          .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: user?.id })
          .eq('id', entryId);
        if (perr) throw perr;
      }
      toast.success(postAfter ? 'تم حفظ وترحيل القيد' : 'تم حفظ المسوّدة');
      setDialogOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['acc_journal_entries'] });
    } catch (e: any) {
      toast.error(e.message ?? 'تعذّر الحفظ');
    }
  };

  const postEntry = async (e: Entry) => {
    if (!balanced && e.status === 'draft') {
      const drOk = Math.abs(Number(e.total_debit) - Number(e.total_credit)) < 0.005 && Number(e.total_debit) > 0;
      if (!drOk) { toast.error('القيد غير متوازن'); return; }
    }
    const { error } = await (supabase as any).from('acc_journal_entries')
      .update({ status: 'posted', posted_at: new Date().toISOString(), posted_by: user?.id }).eq('id', e.id);
    if (error) return toast.error(error.message);
    toast.success('تم ترحيل القيد');
    qc.invalidateQueries({ queryKey: ['acc_journal_entries'] });
  };

  const deleteEntry = async (e: Entry) => {
    if (e.status !== 'draft') return toast.error('لا يمكن حذف قيد مرحّل');
    if (!confirm(`حذف القيد ${e.entry_no}؟`)) return;
    const { error } = await (supabase as any).from('acc_journal_entries').delete().eq('id', e.id);
    if (error) return toast.error(error.message);
    toast.success('تم الحذف');
    qc.invalidateQueries({ queryKey: ['acc_journal_entries'] });
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية عرض القيود اليومية.</div>;

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">القيود اليومية</h1>
            <p className="text-sm text-muted-foreground">إنشاء وترحيل القيود المحاسبية إلى دفتر الأستاذ.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportPdfButton
            title="القيود اليومية"
            headers={['رقم القيد', 'التاريخ', 'البيان', 'المصدر', 'مدين', 'دائن', 'الحالة']}
            rows={entries.map(e => [
              e.entry_no,
              new Date(e.entry_date).toLocaleDateString('ar-EG'),
              e.description || '',
              e.source,
              Number(e.total_debit).toLocaleString('ar-EG', { minimumFractionDigits: 2 }),
              Number(e.total_credit).toLocaleString('ar-EG', { minimumFractionDigits: 2 }),
              statusAr[e.status] ?? e.status,
            ])}
            kpis={[
              { label: 'عدد القيود', value: entries.length },
              { label: 'إجمالي المدين', value: entries.reduce((s, e) => s + Number(e.total_debit || 0), 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) },
              { label: 'إجمالي الدائن', value: entries.reduce((s, e) => s + Number(e.total_credit || 0), 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 }) },
            ]}
          />
          {canEdit && <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" /> قيد جديد</Button>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">القائمة ({entries.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد قيود</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القيد</TableHead><TableHead>التاريخ</TableHead>
                  <TableHead>البيان</TableHead><TableHead>المصدر</TableHead>
                  <TableHead className="text-right">مدين</TableHead>
                  <TableHead className="text-right">دائن</TableHead>
                  <TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.entry_no}</TableCell>
                    <TableCell>{new Date(e.entry_date).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{e.source}</Badge></TableCell>
                    <TableCell className="text-right">{Number(e.total_debit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{Number(e.total_credit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge className={statusColor[e.status]}>{statusAr[e.status] ?? e.status}</Badge></TableCell>
                    <TableCell>
                      <RowActions>
                        <Button size="icon" variant="ghost" onClick={() => setViewEntry(e)}><Eye className="w-4 h-4" /></Button>
                        {canEdit && e.status === 'draft' && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => postEntry(e)} title="ترحيل"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteEntry(e)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                          </>
                        )}
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editingId ? 'تعديل القيد' : 'قيد يومية جديد'}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">التاريخ</Label>
              <Input type="date" value={form.entry_date} onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">البيان</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="بيان القيد..." />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>سطور القيد</Label>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 ml-1" /> سطر</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>الحساب</TableHead>
                    <TableHead>البيان</TableHead>
                    <TableHead className="w-32 text-right">مدين</TableHead>
                    <TableHead className="w-32 text-right">دائن</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.line_no}</TableCell>
                      <TableCell>
                        <Select value={l.account_id} onValueChange={(v) => updateLine(i, { account_id: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {accounts.map((a: any) => (<SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input className="h-9" value={l.description ?? ''} onChange={(e) => updateLine(i, { description: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="h-9 text-right" value={l.debit || ''} onChange={(e) => updateLine(i, { debit: Number(e.target.value) || 0, credit: 0 })} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="h-9 text-right" value={l.credit || ''} onChange={(e) => updateLine(i, { credit: Number(e.target.value) || 0, debit: 0 })} /></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={form.lines.length <= 2}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="bg-muted/60 font-semibold">
                    <td colSpan={3} className="p-3 text-right">الإجمالي</td>
                    <td className="p-3 text-right">{totals.debit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totals.credit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            </div>

            <div className={`text-sm rounded-md px-3 py-2 ${balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {balanced ? '✓ القيد متوازن' : `الفرق: ${(totals.debit - totals.credit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} — أدخل مبالغ متساوية على الطرفين`}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={!balanced}>حفظ كمسوّدة</Button>
            <Button onClick={() => save(true)} disabled={!balanced}>حفظ وترحيل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer */}
      <Dialog open={!!viewEntry} onOpenChange={(o) => !o && setViewEntry(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader><DialogTitle>القيد {viewEntry?.entry_no}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-muted-foreground text-xs">التاريخ</div><div>{viewEntry && new Date(viewEntry.entry_date).toLocaleDateString('ar-EG')}</div></div>
            <div><div className="text-muted-foreground text-xs">الحالة</div><Badge className={statusColor[viewEntry?.status ?? 'draft']}>{statusAr[viewEntry?.status ?? ''] ?? viewEntry?.status}</Badge></div>
            <div><div className="text-muted-foreground text-xs">المصدر</div><div>{viewEntry?.source}</div></div>
            <div className="col-span-3"><div className="text-muted-foreground text-xs">البيان</div><div>{viewEntry?.description}</div></div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>الحساب</TableHead><TableHead>البيان</TableHead>
              <TableHead className="text-right">مدين</TableHead><TableHead className="text-right">دائن</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entryLines.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.line_no}</TableCell>
                  <TableCell>{l.account_code}</TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-right">{Number(l.debit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{Number(l.credit).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccJournalEntriesPage;
