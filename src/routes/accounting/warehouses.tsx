import { createFileRoute } from '@tanstack/react-router';
import AccWarehousesPage from '@/pages/accounting/AccWarehousesPage';

export const Route = createFileRoute('/accounting/warehouses')({
  head: () => ({
    meta: [
      { title: 'المخازن والصوامع | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'إدارة مخازن وصوامع الأعلاف وسعتها بالطن ونسبة الاستغلال.' },
      { property: 'og:title', content: 'المخازن والصوامع' },
      { property: 'og:description', content: 'مخازن الخامات والأعلاف المصنّعة وأرصدتها بالطن.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccWarehousesPage,
});
