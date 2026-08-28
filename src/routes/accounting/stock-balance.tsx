import { createFileRoute } from '@tanstack/react-router';
import AccStockBalancePage from '@/pages/accounting/AccStockBalancePage';

export const Route = createFileRoute('/accounting/stock-balance')({
  head: () => ({
    meta: [
      { title: 'أرصدة المخزون وتقييمه | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'أرصدة أصناف الأعلاف بالكيلو والطن وتقييم المخزون بالمتوسط المرجح وتنبيهات إعادة الطلب.' },
      { property: 'og:title', content: 'أرصدة المخزون وتقييمه' },
      { property: 'og:description', content: 'تقييم مخزون الأعلاف بالمتوسط المرجح مع تنبيهات النواقص.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccStockBalancePage,
});
