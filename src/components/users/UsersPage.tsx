import { useNavigate } from "@tanstack/react-router";
import { KeyRound, Pencil, Plus, Power, ShieldCheck, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/treasury/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { RowActions } from "@/components/treasury/RowActions";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDb, type AppUser } from "@/lib/mockDb";
import { deleteUser, resetPassword, toggleUser } from "@/lib/userActions";
import { roleName, usersKpis } from "@/lib/users";

/** سجل المستخدمين: تكويد اليوزر والباسورد والدور */
export function UsersPage() {
  const data = useDb();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState("");
  const [pwUser, setPwUser] = useState<AppUser | null>(null);
  const [pw, setPw] = useState("");

  const kpis = usersKpis(data);
  const rows = data.users.filter((u) => (roleFilter ? u.roleId === roleFilter : true));

  const columns: Array<Column<AppUser>> = [
    { key: "code", header: "الكود", cell: (r) => r.code ?? "—", text: (r) => r.code ?? "" },
    { key: "name", header: "اسم المستخدم", cell: (r) => r.name, text: (r) => r.name },
    {
      key: "username",
      header: "اسم الدخول",
      cell: (r) => <span className="font-mono text-xs">{r.username ?? "—"}</span>,
      text: (r) => r.username ?? "",
    },
    {
      key: "password",
      header: "كلمة المرور",
      align: "center",
      cell: (r) => <span className="font-mono text-xs text-muted-foreground">{"•".repeat((r.password ?? "").length || 6)}</span>,
    },
    {
      key: "role",
      header: "دور الصلاحيات",
      align: "center",
      cell: (r) => <StatusBadge label={roleName(data, r)} tone="gold" />,
      text: (r) => roleName(data, r),
    },
    {
      key: "branch",
      header: "الفرع",
      cell: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "—",
      text: (r) => data.branches.find((b) => b.id === r.branchId)?.name ?? "",
    },
    { key: "phone", header: "الهاتف", cell: (r) => r.phone || "—", text: (r) => r.phone ?? "" },
    {
      key: "active",
      header: "الحالة",
      align: "center",
      cell: (r) => (
        <StatusBadge label={r.active === false ? "موقوف" : "نشط"} tone={r.active === false ? "gray" : "green"} />
      ),
      text: (r) => (r.active === false ? "موقوف" : "نشط"),
    },
  ];

  const submitPassword = () => {
    if (!pwUser) return;
    const res = resetPassword(pwUser.id, pw);
    if (!res.ok) return toast.error(res.error ?? "تعذر التغيير");
    toast.success("تم تغيير كلمة المرور");
    setPwUser(null);
    setPw("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل المستخدمين"
        description="تكويد مستخدمى النظام باسم دخول وكلمة مرور وربط كل مستخدم بدور صلاحيات تفصيلى"
        actions={
          <>
            <Button asChild className="gap-1.5">
              <a href="/users/new">
                <Plus className="size-4" />
                مستخدم جديد
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <a href="/users/permissions">
                <ShieldCheck className="size-4" />
                شاشة الصلاحيات
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد المستخدمين" value={String(kpis.users)} icon={<Users className="size-4" />} />
        <StatCard label="مستخدمون نشطون" value={String(kpis.active)} tone="accent" />
        <StatCard label="موقوفون" value={String(kpis.stopped)} tone="muted" />
        <StatCard label="أدوار الصلاحيات" value={String(kpis.roles)} icon={<ShieldCheck className="size-4" />} />
      </div>

      <div className="max-w-xs">
        <SearchSelect
          options={[{ value: "", label: "كل الأدوار" }, ...data.roles.map((r) => ({ value: r.id, label: r.name }))]}
          value={roleFilter}
          onChange={(v) => setRoleFilter(v ?? "")}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowId={(r) => r.id}
        title="المستخدمون"
        searchPlaceholder="ابحث بالاسم أو اسم الدخول أو الدور..."
        actions={(row) => (
          <RowActions
            actions={[
              {
                label: "تعديل البيانات",
                icon: <Pencil className="size-4" />,
                onSelect: () => navigate({ to: "/users/$id", params: { id: row.id } }),
              },
              {
                label: "تغيير كلمة المرور",
                icon: <KeyRound className="size-4" />,
                onSelect: () => {
                  setPwUser(row);
                  setPw("");
                },
              },
              {
                label: row.active === false ? "تنشيط المستخدم" : "إيقاف المستخدم",
                icon: <Power className="size-4" />,
                onSelect: () => {
                  const res = toggleUser(row.id);
                  if (!res.ok) toast.error(res.error ?? "تعذر التعديل");
                  else toast.success(row.active === false ? "تم تنشيط المستخدم" : "تم إيقاف المستخدم");
                },
              },
              {
                label: "حذف",
                icon: <Trash2 className="size-4" />,
                danger: true,
                onSelect: () => {
                  const res = deleteUser(row.id);
                  if (!res.ok) toast.error(res.error ?? "تعذر الحذف");
                  else toast.success("تم حذف المستخدم");
                },
              },
            ]}
          />
        )}
      />

      <Dialog open={!!pwUser} onOpenChange={(open) => !open && setPwUser(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغيير كلمة مرور {pwUser?.name}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="كلمة المرور الجديدة"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>
              إلغاء
            </Button>
            <Button onClick={submitPassword}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
