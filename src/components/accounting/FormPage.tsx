import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * بديل عن الـ Dialog: يفتح الفورم كصفحة فرعية متفرعة من الصفحة الحالية
 * (يتغيّر الرابط ?form=1 ويعمل زر الرجوع في المتصفح) بنفس واجهة Dialog.
 */

type Ctx = { close: () => void; open: () => void };
const FormPageCtx = createContext<Ctx>({ close: () => {}, open: () => {} });

const SEARCH_KEY = "form";

export const Dialog: React.FC<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}> = ({ open = false, onOpenChange, children }) => {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const urlOpen = String(search?.[SEARCH_KEY] ?? "") === "1";
  const syncedRef = useRef(false);

  // مزامنة الحالة مع الرابط
  useEffect(() => {
    if (open && !urlOpen) {
      navigate({ to: ".", search: (prev: any) => ({ ...prev, [SEARCH_KEY]: 1 }), replace: false });
    } else if (!open && urlOpen) {
      navigate({
        to: ".",
        search: (prev: any) => {
          const next = { ...prev };
          delete next[SEARCH_KEY];
          return next;
        },
        replace: true,
      });
      syncedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // زر الرجوع في المتصفح يقفل الفورم
  useEffect(() => {
    if (open && urlOpen) syncedRef.current = true;
    if (open && !urlOpen && syncedRef.current) {
      syncedRef.current = false;
      onOpenChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOpen, open]);

  const ctx = useMemo<Ctx>(
    () => ({ close: () => onOpenChange?.(false), open: () => onOpenChange?.(true) }),
    [onOpenChange],
  );

  return (
    <FormPageCtx.Provider value={ctx}>
      {React.Children.toArray(children).filter(
        (child: any) => child?.type !== DialogContent,
      )}
      {open
        ? React.Children.toArray(children).filter((child: any) => child?.type === DialogContent)
        : null}
    </FormPageCtx.Provider>
  );
};

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({
  children,
}) => {
  const { open } = useContext(FormPageCtx);
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props?.onClick?.(e);
      open();
    },
  });
};

export const DialogContent: React.FC<{
  children?: React.ReactNode;
  className?: string;
  dir?: string;
}> = ({ children }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const outlet = document.getElementById("acc-form-outlet");
    const main = document.getElementById("acc-main");
    if (main) main.dataset.formOpen = "true";
    setHost(outlet ?? document.body);
    window.scrollTo({ top: 0 });
    return () => {
      if (main) main.dataset.formOpen = "false";
    };
  }, []);

  const header = React.Children.toArray(children).filter((c: any) => c?.type === DialogHeader);
  const footer = React.Children.toArray(children).filter((c: any) => c?.type === DialogFooter);
  const body = React.Children.toArray(children).filter(
    (c: any) => c?.type !== DialogHeader && c?.type !== DialogFooter,
  );

  if (!host) return null;

  return createPortal(
    <section dir="rtl" className="form-page-enter">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-l from-primary/10 via-card to-card px-4 py-4 sm:px-6">
          <FormBackBar />
          <div className="mt-3 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="size-5" />
            </span>
            <div className="min-w-0">{header}</div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6">{body}</div>

        {footer.length > 0 && (
          <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </section>,
    host,
  );
};

const FormBackBar: React.FC = () => {
  const { close } = useContext(FormPageCtx);
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={close} className="gap-1.5 px-2 text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        رجوع للقائمة
      </Button>
      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        القائمة
        <ChevronLeft className="size-3.5" />
        <span className="font-medium text-foreground">نموذج البيانات</span>
      </span>
    </div>
  );
};

export const DialogHeader: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`space-y-1 ${className}`}>{children}</div>;

export const DialogTitle: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <h2 className={`text-lg font-semibold leading-tight sm:text-xl ${className}`}>{children}</h2>;

export const DialogDescription: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;

export const DialogFooter: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`flex flex-col-reverse gap-2 sm:flex-row sm:justify-start ${className}`}>
    {children}
  </div>
);

export const DialogClose: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({
  children,
}) => {
  const { close } = useContext(FormPageCtx);
  const child = React.Children.only(children) as React.ReactElement<any>;
  return React.cloneElement(child, {
    onClick: (e: React.MouseEvent) => {
      child.props?.onClick?.(e);
      close();
    },
  });
};
