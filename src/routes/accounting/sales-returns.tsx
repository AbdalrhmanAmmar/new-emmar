import { createFileRoute } from '@tanstack/react-router';
import AccSalesReturnsPage from '@/pages/accounting/AccSalesReturnsPage';

export const Route = createFileRoute('/accounting/sales-returns')({
  head: () => ({
    meta: [
      { title: 'مرتجعات المبيعات | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'رد الأعلاف من العملاء للمخزن وتخفيض الإيراد والضريبة والمديونية.' },
      { property: 'og:title', content: 'مرتجعات المبيعات — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'رد الأعلاف من العملاء للمخزن وتخفيض الإيراد والضريبة والمديونية.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccSalesReturnsPage,
});
