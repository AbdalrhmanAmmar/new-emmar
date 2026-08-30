import { createFileRoute } from "@tanstack/react-router";

import { AttendancePage } from "@/components/hr/AttendancePage";

export const Route = createFileRoute("/hr/attendance/")({
  head: () => ({
    meta: [
      { title: "تحضير الموظفين — الإيمان لتجارة الأعلاف" },
      { name: "description", content: "تحضير يومى سريع: حاضر، تأخير، غياب، إجازة، وساعات إضافية." },
      { property: "og:title", content: "تحضير الموظفين اليومى" },
      { property: "og:description", content: "تحضير الجميع بضغطة واحدة وتسجيل دقائق التأخير." },
    ],
  }),
  component: AttendancePage,
});
