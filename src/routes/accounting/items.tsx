import { createFileRoute } from '@tanstack/react-router';
import AccItemsPage from '@/pages/accounting/AccItemsPage';

export const Route = createFileRoute('/accounting/items')({
  head: () => ({
    meta: [
      { title: 'دليل أصناف الأعلاف | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'إدارة أصناف الأعلاف والخامات والإضافات مع الأسعار وحدود إعادة الطلب.' },
      { property: 'og:title', content: 'دليل أصناف الأعلاف' },
      { property: 'og:description', content: 'أصناف الأعلاف والخامات مع التكلفة وسعر البيع لكل كيلو.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccItemsPage,
});
