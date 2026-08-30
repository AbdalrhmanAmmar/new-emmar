import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/treasury/PageHeader";
import { REPORTS_MODULE } from "@/components/layout/navConfig";

/** مركز التقارير: كل تقارير البرنامج (خزينة + مبيعات) فى مكان واحد */
export function ReportsHub() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="التقارير"
        subtitle="كل تقارير البرنامج مجمّعة فى موديول واحد — تقارير الخزينة والمبيعات بالجنيه المصري"
      />

      {REPORTS_MODULE.groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            {group.icon}
            <span>{group.label}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </span>
                  {item.label}
                </span>
                <ArrowLeft className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
