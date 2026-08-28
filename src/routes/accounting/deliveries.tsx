import { createFileRoute } from '@tanstack/react-router';
import AccDeliveriesPage from '@/pages/accounting/AccDeliveriesPage';

export const Route = createFileRoute('/accounting/deliveries')({
  head: () => ({
    meta: [
      { title: 'إذون التسليم | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'صرف الأعلاف بالوزن مع بيانات السيارة والسائق وترحيل تكلفة المبيعات.' },
      { property: 'og:title', content: 'إذون التسليم — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'صرف الأعلاف بالوزن مع بيانات السيارة والسائق وترحيل تكلفة المبيعات.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccDeliveriesPage,
});
