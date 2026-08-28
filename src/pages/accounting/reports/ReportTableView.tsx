import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF } from '@/utils/pdfExport';
import { useAuth } from '@/contexts/AuthContext';

export type ReportColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  isNumber?: boolean;
  footerSum?: boolean;
};

interface Props<T extends Record<string, any>> {
  title: string;
  description?: string;
  viewName: string; // e.g. 'v_acc_trial_balance'
  columns: ReportColumn<T>[];
  searchKeys?: string[];
  orderBy?: { column: string; ascending?: boolean };
  filterRow?: React.ReactNode;
  postFilter?: (rows: T[]) => T[];
}

function toCSV<T extends Record<string, any>>(rows: T[], columns: ReportColumn<T>[]) {
  const header = columns.map((c) => `"${c.header}"`).join(',');
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const raw = (r as any)[c.key];
          const val = raw == null ? '' : String(raw).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(','),
    )
    .join('\n');
  return `\uFEFF${header}\n${body}`;
}

export function ReportTableView<T extends Record<string, any>>({
  title,
  description,
  viewName,
  columns,
  searchKeys = [],
  orderBy,
  filterRow,
  postFilter,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const { profile, userRole } = useAuth();

  const { data: rows = [], isLoading, isError } = useQuery<T[]>({
    queryKey: ['acc_report', viewName],
    queryFn: async () => {
      let q: any = (supabase as any).from(viewName).select('*');
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const filtered = useMemo(() => {
    let r = rows;
    if (postFilter) r = postFilter(r);
    if (search && searchKeys.length) {
      const s = search.toLowerCase();
      r = r.filter((row) => searchKeys.some((k) => String((row as any)[k] ?? '').toLowerCase().includes(s)));
    }
    return r;
  }, [rows, postFilter, search, searchKeys]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    columns.forEach((c) => {
      if (c.footerSum) {
        t[c.key] = filtered.reduce((sum, r) => sum + (Number((r as any)[c.key]) || 0), 0);
      }
    });
    return t;
  }, [filtered, columns]);

  const handleExport = () => {
    try {
      const csv = toCSV(filtered, columns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير التقرير');
    } catch (e) {
      toast.error('تعذّر التصدير');
    }
  };

  const handleExportPDF = async () => {
    try {
      setPdfLoading(true);
      const headers = columns.map((c) => c.header);
      const bodyRows = filtered.map((row) =>
        columns.map((c) => {
          const raw = (row as any)[c.key];
          if (c.isNumber) {
            return Number(raw ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          // If render exists and returns a primitive, use it; else stringify raw
          if (c.render) {
            const rendered = c.render(row);
            if (rendered == null) return '';
            if (typeof rendered === 'string' || typeof rendered === 'number') return rendered;
            return String(raw ?? '');
          }
          return raw == null ? '' : String(raw);
        }),
      );
      const kpis = columns
        .filter((c) => c.footerSum)
        .map((c) => ({
          label: `إجمالي ${c.header}`,
          value: totals[c.key].toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }));
      await exportToPDF({
        title,
        subtitle: description,
        headers,
        rows: bodyRows,
        kpis,
        userName: profile?.full_name || 'مستخدم',
        userRole: userRole || 'مستخدم',
        orientation: columns.length > 5 ? 'landscape' : 'portrait',
      });
      toast.success('تم تصدير PDF');
    } catch (e) {
      console.error(e);
      toast.error('تعذّر تصدير PDF');
    } finally {
      setPdfLoading(false);
    }
  };


  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 ml-2" /> تصدير CSV
          </Button>
          <Button variant="default" onClick={handleExportPDF} disabled={pdfLoading || filtered.length === 0}>
            <FileText className="w-4 h-4 ml-2" /> {pdfLoading ? 'جارٍ التصدير...' : 'تصدير PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {searchKeys.length > 0 && (
                <div className="relative w-64">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-8 text-right"
                  />
                </div>
              )}
              {filterRow}
            </div>
            <span className="text-xs text-muted-foreground font-normal">
              {filtered.length} سجل
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : isError ? (
            <div className="text-center text-destructive py-8">تعذّر تحميل البيانات</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">لا توجد بيانات</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c.key} className={c.align === 'left' ? 'text-left' : c.align === 'center' ? 'text-center' : 'text-right'}>
                        {c.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => {
                        const raw = (row as any)[c.key];
                        const val = c.render ? c.render(row) : c.isNumber ? Number(raw ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : raw;
                        return (
                          <TableCell key={c.key} className={`${c.align === 'left' ? 'text-left' : c.align === 'center' ? 'text-center' : 'text-right'} ${c.className ?? ''}`}>
                            {val}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
                {columns.some((c) => c.footerSum) && (
                  <tfoot>
                    <tr className="border-t-2 font-semibold bg-muted/50">
                      {columns.map((c, idx) => (
                        <td key={c.key} className={`p-3 ${c.align === 'left' ? 'text-left' : c.align === 'center' ? 'text-center' : 'text-right'}`}>
                          {idx === 0 && !c.footerSum ? 'الإجمالي' : c.footerSum ? totals[c.key].toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportTableView;
