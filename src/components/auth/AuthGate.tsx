import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Lock, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { hasPerm, screenForPath, signOut, useCurrentUser } from "@/lib/session";

/** بوابة الأوثنتكيشن + الأوثورايزيشن لكل الشاشات المحمية */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = useCurrentUser();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (ready && !current) navigate({ to: "/login", replace: true });
  }, [ready, current, navigate]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        جارٍ التحقق من الجلسة…
      </div>
    );
  }

  if (!current) {
    return (
      <div className="grid min-h-screen place-items-center gap-3 bg-background p-6 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">يجب تسجيل الدخول للوصول إلى النظام</p>
        <Button asChild>
          <Link to="/login">الانتقال لتسجيل الدخول</Link>
        </Button>
      </div>
    );
  }

  const screen = screenForPath(pathname);
  if (screen && !hasPerm(current, screen, "view")) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-sm space-y-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h1 className="text-lg font-bold">لا تمتلك صلاحية عرض هذه الشاشة</h1>
          <p className="text-xs text-muted-foreground">
            المستخدم: {current.user.name} — الدور: {current.role?.name ?? "بدون دور"}
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">الرئيسية</Link>
            </Button>
            <Button size="sm" variant="destructive" onClick={signOut}>
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
