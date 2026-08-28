import { createFileRoute } from '@tanstack/react-router';
import AccSalesBillingPage from '@/pages/accounting/AccSalesBillingPage';

export const Route = createFileRoute('/accounting/sales-billing')({
  head: () => ({
    meta: [
      { title: 'فوترة وتحصيل المبيعات | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'إصدار فواتير البيع من إذون التسليم وتحصيلها كلياً أو جزئياً بقيود تلقائية.' },
      { property: 'og:title', content: 'فوترة وتحصيل المبيعات — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'إصدار فواتير البيع من إذون التسليم وتحصيلها كلياً أو جزئياً بقيود تلقائية.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccSalesBillingPage,
});
