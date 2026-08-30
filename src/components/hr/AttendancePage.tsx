import { CalendarCheck, CheckCheck, Clock, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { money, today } from "@/lib/format";
import { ATTENDANCE_TONE, activeEmployees, dayRate } from "@/lib/hr";
import { markAllAttendance, markAttendance } from "@/lib/hrActions";
import { ATTENDANCE_LABEL, useDb, type Attendance, type AttendanceStatus } from "@/lib/mockDb";
import { cn } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["present", "late", "absent", "leave", "holiday"];

/** تحضير الموظفين اليومى: حاضر / تأخير / غياب / إجازة */
export function AttendancePage() {
  const data = useDb();
  const [date, setDate] = useState(today());
  const employees = activeEmployees(data);

  const rowFor = (employeeId: string): Attendance | undefined =>
    data.attendance.find((a) => a.date === date && a.employeeId === employeeId);

  const setStatus = (employeeId: string, status: AttendanceStatus) => {
    const existing = rowFor(employeeId);
    const res = markAttendance({
      id: existing?.id,
      date,
      employeeId,
      status,
      lateMinutes: status === "late" ? existing?.lateMinutes || 30 : 0,
      overtimeHours: existing?.overtimeHours ?? 0,
      note: existing?.note ?? "",
    });
    if (!res.ok) toast.error(res.error ?? "تعذر التحضير");
  };

  const setNumber = (employeeId: string, field: "lateMinutes" | "overtimeHours", value: number) => {
    const existing = rowFor(employeeId);
    const res = markAttendance({
      id: existing?.id,
      date,
      employeeId,
      status: existing?.status ?? "present",
      lateMinutes: field === "lateMinutes" ? value : (existing?.lateMinutes ?? 0),
      overtimeHours: field === "overtimeHours" ? value : (existing?.overtimeHours ?? 0),
      note: existing?.note ?? "",
    });
    if (!res.ok) toast.error(res.error ?? "تعذر التعديل");
  };

  const dayRows = data.attendance.filter((a) => a.date === date);
  const count = (status: AttendanceStatus) => dayRows.filter((a) => a.status === status).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="تحضير الموظفين"
        description="تحضير يومى سريع بالحضور والتأخير والغياب والساعات الإضافية"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                markAllAttendance(date, "present");
                toast.success("تم تحضير الجميع");
              }}
            >
              <CheckCheck className="size-4" />
              تحضير الجميع
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="حاضر" value={String(count("present"))} icon={<CalendarCheck className="size-4" />} />
        <StatCard label="تأخير" value={String(count("late"))} tone="accent" icon={<Clock className="size-4" />} />
        <StatCard label="غياب" value={String(count("absent"))} tone="danger" icon={<UserX className="size-4" />} />
        <StatCard label="لم يتم تحضيرهم" value={String(Math.max(0, employees.length - dayRows.length))} tone="muted" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">كشف التحضير — {date}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {employees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد موظفون نشطون</p>
          ) : null}
          {employees.map((emp) => {
            const row = rowFor(emp.id);
            return (
              <div
                key={emp.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-48">
                  <p className="text-sm font-semibold">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {emp.code} • {emp.jobTitle} • أجر اليوم {money(dayRate(emp))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={row?.status === s ? "default" : "outline"}
                      className={cn("h-8 text-xs", row?.status === s && "shadow-sm")}
                      onClick={() => setStatus(emp.id, s)}
                    >
                      {ATTENDANCE_LABEL[s]}
                    </Button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    تأخير (دقيقة)
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={row?.lateMinutes ?? 0}
                      onChange={(e) => setNumber(emp.id, "lateMinutes", Number(e.target.value || 0))}
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    إضافى (ساعة)
                    <Input
                      type="number"
                      className="h-8 w-20"
                      value={row?.overtimeHours ?? 0}
                      onChange={(e) => setNumber(emp.id, "overtimeHours", Number(e.target.value || 0))}
                    />
                  </label>
                  <StatusBadge
                    label={row ? ATTENDANCE_LABEL[row.status] : "لم يُحضّر"}
                    tone={row ? ATTENDANCE_TONE[row.status] : "gray"}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
