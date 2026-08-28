import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { flushOutbox, isOnline, pendingOps, subscribeOutbox } from "@/lib/offline";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = () => setPending(pendingOps().length);

  useEffect(() => {
    setOnline(isOnline());
    refresh();
    const unsub = subscribeOutbox(refresh);
    const up = () => {
      setOnline(true);
      const n = flushOutbox();
      refresh();
      if (n > 0) toast.success(`تمت مزامنة ${n} عملية سُجلت بدون إنترنت`);
    };
    const down = () => {
      setOnline(false);
      toast.warning("لا يوجد اتصال بالإنترنت — البرنامج يعمل بوضع الأوفلاين وسيتم المزامنة تلقائيًا");
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    if (isOnline()) flushOutbox();
    return () => {
      unsub();
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const syncNow = () => {
    if (!isOnline()) {
      toast.error("لا يزال الاتصال مفقودًا — العمليات محفوظة محليًا");
      return;
    }
    setSyncing(true);
    const n = flushOutbox();
    refresh();
    setSyncing(false);
    toast.success(n > 0 ? `تمت مزامنة ${n} عملية` : "كل البيانات متزامنة");
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          online ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}
        title={online ? "متصل بالإنترنت" : "غير متصل — العمل مستمر محليًا"}
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
        {online ? "متصل" : "أوفلاين"}
      </span>
      {pending > 0 && (
        <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing}>
          <RefreshCw className={`me-1 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {pending} بانتظار المزامنة
        </Button>
      )}
    </div>
  );
}

export default OfflineIndicator;
