import { createFileRoute } from '@tanstack/react-router';
import AccSalesCyclePage from '@/pages/accounting/AccSalesCyclePage';

export const Route = createFileRoute('/accounting/sales-cycle')({
  head: () => ({
    meta: [
      { title: 'متابعة دورة المبيعات | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'من عرض السعر حتى التحصيل: الكميات المحجوزة والمسلَّمة والمفوترة وأرصدة العملاء.' },
      { property: 'og:title', content: 'متابعة دورة المبيعات — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'من عرض السعر حتى التحصيل: الكميات المحجوزة والمسلَّمة والمفوترة وأرصدة العملاء.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccSalesCyclePage,
});
