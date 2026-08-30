import { Check, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatCard, StatusBadge } from "@/components/treasury/PageHeader";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PERM_ACTIONS,
  PERM_ACTION_LABEL,
  useDb,
  type PermAction,
} from "@/lib/mockDb";
import {
  deleteRole,
  saveRole,
  setAllPermissions,
  toggleAction,
  togglePermission,
  toggleScreen,
} from "@/lib/userActions";
import { roleScore, screensByModule } from "@/lib/users";

/** مصفوفة صلاحيات تفصيلية: كل شاشة × (عرض/إضافة/تعديل/حذف/ترحيل/طباعة) */
export function PermissionsPage() {
  const data = useDb();
  const [roleId, setRoleId] = useState(data.roles[0]?.id ?? "");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const role = data.roles.find((r) => r.id === roleId) ?? data.roles[0];
  const groups = useMemo(() => screensByModule(), []);
  const score = role ? roleScore(role) : { allowed: 0, total: 0, screens: 0 };
  const locked = !role || role.superAdmin;

  const has = (screen: string, action: PermAction) =>
    role?.superAdmin ? true : (role?.permissions?.[screen] ?? []).includes(action);

  const guard = (res: { ok: boolean; error?: string }) => {
    if (!res.ok) toast.error(res.error ?? "تعذر التعديل");
  };

  const createRole = () => {
    const res = saveRole({ name: form.name, description: form.description });
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success("تم إضافة الدور");
    setRoleId(res.id ?? roleId);
    setForm({ name: "", description: "" });
    setNewOpen(false);
  };

  const removeRole = () => {
    if (!role) return;
    const res = deleteRole(role.id);
    if (!res.ok) return toast.error(res.error ?? "تعذر الحذف");
    toast.success("تم حذف الدور");
    setRoleId(data.roles.find((r) => r.id !== role.id)?.id ?? "");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="الصلاحيات"
        description="حدد لكل دور من يقدر يشوف ويضيف ويعدل ويحذف ويرحّل ويطبع فى كل شاشة على حدة"
        actions={
          <>
            <Button className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" />
              دور جديد
            </Button>
            {role && !role.system ? (
              <Button variant="outline" className="gap-1.5 text-destructive" onClick={removeRole}>
                <Trash2 className="size-4" />
                حذف الدور
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الأدوار" value={String(data.roles.length)} icon={<ShieldCheck className="size-4" />} />
        <StatCard label="شاشات مسموحة" value={`${score.screens}`} tone="accent" />
        <StatCard label="صلاحيات مفعّلة" value={`${score.allowed} / ${score.total}`} />
        <StatCard
          label="مستخدمو الدور"
          value={String(data.users.filter((u) => u.roleId === role?.id).length)}
          tone="muted"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-card p-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <span className="text-xs text-muted-foreground">الدور</span>
          <SearchSelect
            options={data.roles.map((r) => ({ value: r.id, label: r.name, hint: r.description }))}
            value={role?.id ?? ""}
            onChange={(v) => setRoleId(v ?? "")}
          />
        </div>
        {role?.superAdmin ? (
          <StatusBadge label="مدير النظام — كل الصلاحيات مفتوحة" tone="green" />
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={locked}
              onClick={() => role && guard(setAllPermissions(role.id, true))}
            >
              <Check className="size-4" />
              فتح الكل
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={locked}
              onClick={() => role && guard(setAllPermissions(role.id, false))}
            >
              <X className="size-4" />
              إلغاء الكل
            </Button>
          </div>
        )}
      </div>

      {role ? (
        <div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-primary/5">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold">الشاشة</th>
                {PERM_ACTIONS.map((action) => (
                  <th key={action} className="px-2 py-2 text-center text-xs font-semibold">
                    <button
                      type="button"
                      className="hover:text-primary disabled:cursor-not-allowed"
                      disabled={locked}
                      onClick={() => guard(toggleAction(role.id, action, true))}
                      title="تفعيل هذا الإجراء لكل الشاشات"
                    >
                      {PERM_ACTION_LABEL[action]}
                    </button>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-semibold">الكل</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.module}>
                  <tr className="bg-muted/50">
                    <td colSpan={PERM_ACTIONS.length + 2} className="px-3 py-1.5 text-xs font-bold text-primary">
                      {group.module}
                    </td>
                  </tr>
                  {group.screens.map((screen) => {
                    const actions = role.superAdmin ? PERM_ACTIONS : role.permissions?.[screen.key] ?? [];
                    const all = actions.length === PERM_ACTIONS.length;
                    return (
                      <tr key={screen.key} className={cn("border-t border-border/50", all && "bg-accent/5")}>
                        <td className="px-3 py-2 text-right">{screen.label}</td>
                        {PERM_ACTIONS.map((action) => (
                          <td key={action} className="px-2 py-2 text-center">
                            <Checkbox
                              checked={has(screen.key, action)}
                              disabled={locked}
                              onCheckedChange={() => guard(togglePermission(role.id, screen.key, action))}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center">
                          <Checkbox
                            checked={all}
                            disabled={locked}
                            onCheckedChange={(v) => guard(toggleScreen(role.id, screen.key, v === true))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>دور صلاحيات جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              dir="rtl"
              placeholder="اسم الدور (مثال: مشرف مخازن)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Textarea
              dir="rtl"
              rows={2}
              placeholder="وصف مختصر للدور"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={createRole}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
