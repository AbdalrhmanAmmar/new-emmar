import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, FormPage, FormSection } from "@/components/treasury/FormPage";
import { SearchSelect } from "@/components/treasury/SearchSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PERM_ACTION_LABEL, useDb } from "@/lib/mockDb";
import { saveUser } from "@/lib/userActions";
import { passwordHint, screensByModule } from "@/lib/users";

/** إضافة أو تعديل مستخدم: اسم دخول + كلمة مرور + دور صلاحيات */
export function UserForm({ userId }: { userId?: string }) {
  const data = useDb();
  const navigate = useNavigate();
  const existing = userId ? data.users.find((u) => u.id === userId) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [password, setPassword] = useState(existing?.password ?? "");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [branchId, setBranchId] = useState(existing?.branchId ?? data.branches[0]?.id ?? "");
  const [roleId, setRoleId] = useState(existing?.roleId ?? data.roles[0]?.id ?? "");
  const [active, setActive] = useState(existing?.active !== false);
  const [note, setNote] = useState(existing?.note ?? "");

  const role = data.roles.find((r) => r.id === roleId);
  const hint = passwordHint(password);

  const submit = () => {
    const res = saveUser({
      id: existing?.id,
      name,
      code,
      username,
      password,
      phone,
      email,
      branchId,
      roleId,
      active,
      note,
    });
    if (!res.ok) return toast.error(res.error ?? "تعذر الحفظ");
    toast.success(existing ? "تم تعديل بيانات المستخدم" : "تم إضافة المستخدم");
    navigate({ to: "/users" });
  };

  return (
    <FormPage
      title={existing ? `تعديل المستخدم — ${existing.name}` : "مستخدم جديد"}
      subtitle="بيانات الدخول والفرع ودور الصلاحيات المرتبط بالمستخدم"
      onCancel={() => navigate({ to: "/users" })}
      onSubmit={submit}
      submitLabel={existing ? "حفظ التعديلات" : "إضافة المستخدم"}
      extraActions={
        <Button type="button" variant="ghost" className="gap-1.5" onClick={() => navigate({ to: "/users/permissions" })}>
          <ShieldCheck className="size-4" />
          إدارة الصلاحيات
        </Button>
      }
    >
      <FormSection title="بيانات المستخدم">
        <Field label="اسم المستخدم">
          <Input dir="rtl" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="الكود" hint="يتولد تلقائياً لو تركته فارغاً">
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="الفرع">
          <SearchSelect
            options={data.branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={(v) => setBranchId(v ?? "")}
          />
        </Field>
        <Field label="الهاتف">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="البريد الإلكترونى">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="الحالة">
          <div className="flex h-9 items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <span className="text-sm">{active ? "نشط ويمكنه الدخول" : "موقوف"}</span>
          </div>
        </Field>
      </FormSection>

      <FormSection title="بيانات الدخول">
        <Field label="اسم الدخول (Username)" hint="بدون مسافات — لا يتكرر بين المستخدمين">
          <Input className="font-mono" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="كلمة المرور" hint={hint.text}>
          <div className="flex gap-2">
            <Input
              className="font-mono"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="button" size="icon" variant="outline" onClick={() => setShowPw((v) => !v)}>
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </Field>
        <Field label="دور الصلاحيات">
          <SearchSelect
            options={data.roles.map((r) => ({ value: r.id, label: r.name, hint: r.description }))}
            value={roleId}
            onChange={(v) => setRoleId(v ?? "")}
          />
        </Field>
      </FormSection>

      {role ? (
        <section className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <h3 className="text-sm font-semibold text-primary">صلاحيات الدور «{role.name}»</h3>
          {role.superAdmin ? (
            <p className="text-sm">كل الشاشات والإجراءات مفتوحة (مدير النظام).</p>
          ) : (
            <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {screensByModule().flatMap((group) =>
                group.screens
                  .filter((screen) => (role.permissions?.[screen.key] ?? []).length > 0)
                  .map((screen) => (
                    <div key={screen.key} className="rounded border border-border/60 bg-card p-2">
                      <div className="font-semibold">{screen.label}</div>
                      <div className="text-muted-foreground">
                        {(role.permissions?.[screen.key] ?? []).map((a) => PERM_ACTION_LABEL[a]).join(" • ")}
                      </div>
                    </div>
                  )),
              )}
            </div>
          )}
        </section>
      ) : null}

      <FormSection title="ملاحظات">
        <Field label="ملاحظات" className="sm:col-span-2 lg:col-span-3">
          <Textarea dir="rtl" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </FormSection>
    </FormPage>
  );
}
