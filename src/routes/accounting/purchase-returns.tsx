import { createFileRoute } from '@tanstack/react-router';
import AccPurchaseReturnsPage from '@/pages/accounting/AccPurchaseReturnsPage';

export const Route = createFileRoute('/accounting/purchase-returns')({
  head: () => ({
    meta: [
      { title: 'مرتجعات المشتريات | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'رد الخامات غير المطابقة للمورد وتخفيض المخزون ومستحقات المورد بقيد واحد.' },
      { property: 'og:title', content: 'مرتجعات المشتريات — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'رد الخامات غير المطابقة للمورد وتخفيض المخزون ومستحقات المورد بقيد واحد.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccPurchaseReturnsPage,
});
