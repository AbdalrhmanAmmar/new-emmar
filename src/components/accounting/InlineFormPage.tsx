import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./FormPage";

/**
 * يحوّل أي فورم كان مدمجاً داخل الصفحة إلى صفحة فرعية:
 * الصفحة تعرض زر إضافة فقط، وعند الضغط يفتح الفورم بنفس تصميم صفحات النماذج.
 */
export const InlineFormPage: React.FC<{
  title: string;
  description?: string;
  triggerLabel?: string;
  children?: React.ReactNode;
}> = ({ title, description, triggerLabel, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <div className="flex justify-start">
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            {triggerLabel ?? title}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="space-y-4">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InlineFormPage;
