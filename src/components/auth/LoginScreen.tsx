import { useNavigate } from "@tanstack/react-router";
import { BarChart3, Eye, EyeOff, Headphones, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import heroAsset from "@/assets/login-hero.jpg";
import logoAsset from "@/assets/logo.jpeg.asset.json";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { landingPath, resolveUser, signIn, useSession } from "@/lib/session";

/** شاشة تسجيل الدخول المرتبطة بموديول إدارة المستخدمين */
export function LoginScreen() {
  const navigate = useNavigate();
  const session = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // المستخدم مسجل دخول بالفعل → توجيه لأول شاشة مسموحة
  useEffect(() => {
    if (!session.userId) return;
    const current = resolveUser(session.userId);
    if (current) navigate({ to: landingPath(current), replace: true });
  }, [session.userId, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = signIn(identifier, password, remember);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "تعذر تسجيل الدخول");
      return;
    }
    setError("");
    toast.success(`مرحبًا ${res.user?.name ?? ""}`);
    const current = resolveUser(res.user?.id ?? null);
    navigate({ to: landingPath(current), replace: true });
  };

  return (
    <main dir="rtl" className="relative min-h-screen bg-background lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* الجانب البصرى */}
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src={heroAsset}
          alt="حقول أعلاف خضراء وسنابل قمح عند الغروب"
          width={1024}
          height={1280}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-primary/85 via-primary/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center gap-4 p-12 text-primary-foreground">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight drop-shadow">
            إدارة أذكى.
            <br />
            تجارة أكثر كفاءة.
          </h1>
          <span className="h-1 w-24 rounded-full bg-accent" />
          <p className="max-w-sm text-sm leading-relaxed opacity-90">
            إدارة المبيعات، المخزون، العملاء والحسابات من مكان واحد.
          </p>
        </div>
        <div
          className="absolute inset-y-0 -end-10 hidden w-20 rounded-s-[50%] bg-background lg:block"
          aria-hidden="true"
        />
      </section>

      {/* نموذج الدخول */}
      <section className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <img
              src={logoAsset.url}
              alt="شعار الإيمان لتجارة الأعلاف"
              width={120}
              height={120}
              className="size-24 rounded-full border-2 border-accent/50 object-cover shadow-md"
            />
            <h2 className="text-3xl font-extrabold text-primary">مرحبًا بعودتك</h2>
            <p className="text-sm text-muted-foreground">سجّل الدخول إلى نظام الإيمان لإدارة تجارة الأعلاف</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-semibold">
                اسم المستخدم أو البريد الإلكترونى
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  autoFocus
                  autoComplete="username"
                  dir="ltr"
                  placeholder="admin"
                  className="ps-9 text-start"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  className="px-9 text-start"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                تذكرني
              </label>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => toast.info("راجع مدير النظام لإعادة تعيين كلمة المرور من إدارة المستخدمين")}
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            {error ? (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="h-11 w-full text-sm font-bold" disabled={busy}>
              تسجيل الدخول
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-accent/40" />
            أو
            <span className="h-px flex-1 bg-accent/40" />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            حسابات النظام تُدار بالكامل من موديول
            <span className="font-semibold text-foreground"> إدارة المستخدمين والصلاحيات</span>.
          </div>

          <div className="flex items-center justify-center gap-4 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5 text-accent" />
              تقارير دقيقة
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones className="size-3.5 text-accent" />
              دعم فنى متواصل
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" />
              آمن وموثوق
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
