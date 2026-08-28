import { createFileRoute } from '@tanstack/react-router';
import AccPurchaseOrdersPage from '@/pages/accounting/AccPurchaseOrdersPage';

export const Route = createFileRoute('/accounting/purchase-orders')({
  head: () => ({
    meta: [
      { title: 'أوامر الشراء | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'أوامر شراء خامات وأعلاف من الموردين واستلامها في المخازن مع الضريبة 14%.' },
      { property: 'og:title', content: 'أوامر شراء الأعلاف' },
      { property: 'og:description', content: 'شراء الخامات من الموردين واستلامها مخزنياً بشكل تلقائي.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccPurchaseOrdersPage,
});
