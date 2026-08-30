import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/externalClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/accounting/FormPage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import ExportPdfButton from '@/components/accounting/ExportPdfButton';
import { RowActions } from "@/components/accounting/RowActions";

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string | null;
  account_type: AccountType;
  parent_id?: string | null;
  is_group: boolean;
  is_active: boolean;
  currency: string;
  vat_applicable: boolean;
  notes?: string | null;
}

const typeLabels: Record<AccountType, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
};
const typeColors: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-orange-100 text-orange-800',
  equity: 'bg-purple-100 text-purple-800',
  revenue: 'bg-emerald-100 text-emerald-800',
  expense: 'bg-red-100 text-red-800',
};

const AccChartOfAccountsPage: React.FC = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const qc = useQueryClient();
  const canView = isAdmin || hasPermission('accounting_coa' as any, 'view');
  const canEdit = isAdmin || hasPermission('accounting_coa' as any, 'edit');
  const canDelete = isAdmin || hasPermission('accounting_coa' as any, 'delete');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [search, setSearch] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['acc_coa'],
    enabled: !!user && canView,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('acc_chart_of_accounts').select('*').order('code');
      if (error) throw error;
      return (data || []) as Account[];
    },
  });

  const childMap = useMemo(() => {
    const m = new Map<string, Account[]>();
    accounts.forEach(a => {
      const key = a.parent_id || 'ROOT';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    });
    return m;
  }, [accounts]);

  const filtered = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return accounts.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.name_ar.toLowerCase().includes(q) ||
      (a.name_en || '').toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const openNew = (parent?: Account) => {
    setEditing({
      code: '', name_ar: '', name_en: '',
      account_type: parent?.account_type || 'asset',
      parent_id: parent?.id || null,
      is_group: false, is_active: true, currency: 'EGP', vat_applicable: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (a: Account) => { setEditing({ ...a }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.code || !editing.name_ar) { toast.error('الكود والاسم مطلوبان'); return; }
    try {
      const payload: any = {
        code: editing.code, name_ar: editing.name_ar, name_en: editing.name_en,
        account_type: editing.account_type, parent_id: editing.parent_id || null,
        is_group: editing.is_group, is_active: editing.is_active,
        currency: editing.currency || 'EGP', vat_applicable: editing.vat_applicable, notes: editing.notes,
      };
      const { error } = editing.id
        ? await (supabase as any).from('acc_chart_of_accounts').update(payload).eq('id', editing.id)
        : await (supabase as any).from('acc_chart_of_accounts').insert(payload);
      if (error) throw error;
      toast.success('تم الحفظ'); setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['acc_coa'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحفظ'); }
  };

  const handleDelete = async (a: Account) => {
    if (!confirm(`حذف الحساب "${a.name_ar}"؟`)) return;
    try {
      const { error } = await (supabase as any).from('acc_chart_of_accounts').delete().eq('id', a.id);
      if (error) throw error;
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['acc_coa'] });
    } catch (e: any) { toast.error(e.message || 'فشل الحذف — تأكد أنه لا يوجد حسابات فرعية'); }
  };

  if (!canView) return <div className="p-8 text-center text-muted-foreground">لا تملك صلاحية الوصول</div>;

  const renderNode = (a: Account, depth = 0): React.ReactNode => {
    const children = childMap.get(a.id) || [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(a.id);
    return (
      <React.Fragment key={a.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 border-b hover:bg-muted/40 transition-colors"
          style={{ paddingInlineStart: `${depth * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggle(a.id)} className="p-0.5 hover:bg-muted rounded">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <span className="w-5" />}
          <span className="font-mono text-sm w-16">{a.code}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${typeColors[a.account_type]}`}>{typeLabels[a.account_type]}</span>
          <span className="flex-1 font-medium">{a.name_ar}</span>
          {a.name_en && <span className="text-xs text-muted-foreground">{a.name_en}</span>}
          {a.vat_applicable && <Badge variant="outline" className="text-xs">VAT</Badge>}
          {!a.is_active && <Badge variant="destructive" className="text-xs">غير نشط</Badge>}
          {a.is_group && <Badge variant="secondary" className="text-xs">مجموعة</Badge>}
          {canEdit && (
            <RowActions>
              <Button size="sm" variant="ghost" onClick={() => openNew(a)} title="إضافة حساب فرعي"><Plus className="w-3.5 h-3.5" /></Button>
              <Button title="تعديل" aria-label="تعديل" size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
              {canDelete && <Button title="حذف" aria-label="حذف" size="sm" variant="ghost" onClick={() => handleDelete(a)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
            </RowActions>
          )}
        </div>
        {isOpen && children.map(c => renderNode(c, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">دليل الحسابات</h1>
        </div>
        <div className="flex items-center gap-2">
          <ExportPdfButton
            title="دليل الحسابات"
            headers={['الكود', 'الاسم عربي', 'الاسم إنجليزي', 'النوع', 'العملة', 'الحالة']}
            rows={accounts.map(a => [a.code, a.name_ar, a.name_en || '', typeLabels[a.account_type], a.currency, a.is_active ? 'نشط' : 'غير نشط'])}
            kpis={[{ label: 'إجمالي الحسابات', value: accounts.length }]}
          />
          {canEdit && <Button onClick={() => openNew()}><Plus className="w-4 h-4 ml-2" /> حساب رئيسي جديد</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Input dir="rtl" placeholder="بحث بالكود أو الاسم..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <span className="text-sm text-muted-foreground">إجمالي: {accounts.length} حساب</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filtered ? (
            <div className="divide-y">
              {filtered.map(a => (
                <div key={a.id} className="flex items-center gap-2 py-2 px-4 hover:bg-muted/40">
                  <span className="font-mono text-sm w-16">{a.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${typeColors[a.account_type]}`}>{typeLabels[a.account_type]}</span>
                  <span className="flex-1">{a.name_ar}</span>
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>}
                </div>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground">لا نتائج</div>}
            </div>
          ) : (
            <div>{(childMap.get('ROOT') || []).map(a => renderNode(a))}</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? 'تعديل حساب' : 'حساب جديد'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>الكود *</Label><Input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>النوع</Label>
                <Select value={editing.account_type} onValueChange={v => setEditing({ ...editing, account_type: v as AccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>الاسم عربي *</Label><Input value={editing.name_ar || ''} onChange={e => setEditing({ ...editing, name_ar: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>الاسم إنجليزي</Label><Input value={editing.name_en || ''} onChange={e => setEditing({ ...editing, name_en: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>الحساب الأب</Label>
                <Select value={editing.parent_id || 'none'} onValueChange={v => setEditing({ ...editing, parent_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد (رئيسي)</SelectItem>
                    {accounts.filter(a => a.is_group && a.id !== editing.id).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>العملة</Label><Input value={editing.currency || 'EGP'} onChange={e => setEditing({ ...editing, currency: e.target.value })} /></div>
              <div className="flex items-center gap-3"><Switch checked={!!editing.is_group} onCheckedChange={v => setEditing({ ...editing, is_group: v })} /><Label>حساب تجميعي (لا يقبل قيود مباشرة)</Label></div>
              <div className="flex items-center gap-3"><Switch checked={!!editing.vat_applicable} onCheckedChange={v => setEditing({ ...editing, vat_applicable: v })} /><Label>خاضع للضريبة (VAT)</Label></div>
              <div className="flex items-center gap-3"><Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>نشط</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccChartOfAccountsPage;
