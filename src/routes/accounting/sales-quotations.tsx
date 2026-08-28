import { createFileRoute } from '@tanstack/react-router';
import AccSalesQuotationsPage from '@/pages/accounting/AccSalesQuotationsPage';

export const Route = createFileRoute('/accounting/sales-quotations')({
  head: () => ({
    meta: [
      { title: 'عروض أسعار العملاء | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'عروض بيع بصلاحية زمنية وخصومات تتحول إلى أوامر بيع مع حجز المخزون.' },
      { property: 'og:title', content: 'عروض أسعار العملاء — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'عروض بيع بصلاحية زمنية وخصومات تتحول إلى أوامر بيع مع حجز المخزون.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccSalesQuotationsPage,
});
