import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Column<T> = {
  /** عنوان العمود، اتركه فارغاً لعمود الإجراءات. */
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
};

/**
 * جدول بيانات موحّد داخل كارت: عنوان + أدوات + رسالة فراغ + ترقيم صفحات
 * (الترقيم وتغيير عرض الأعمدة مدمجان داخل مكوّن Table نفسه).
 */
export function DataTableCard<T>({
  title,
  actions,
  columns,
  rows,
  rowKey,
  empty = "لا توجد بيانات",
  footer,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: string;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          {title ? <CardTitle>{title}</CardTitle> : <span />}
          {actions}
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c, i) => (
                <TableHead key={i} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={rowKey(row, idx)}>
                  {columns.map((c, i) => (
                    <TableCell key={i} className={c.className}>
                      {c.cell(row, idx)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {footer}
      </CardContent>
    </Card>
  );
}

export default DataTableCard;
