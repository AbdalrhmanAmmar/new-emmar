import * as React from "react";

/** رأس صفحة موحّد لكل شاشات البرنامج: أيقونة + عنوان + وصف + أدوات على اليسار. */
export const PageHeader = ({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 flex-wrap">
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        {icon}
        {title}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export default PageHeader;
