import { createFileRoute } from '@tanstack/react-router';
import AccSalesOrdersPage from '@/pages/accounting/AccSalesOrdersPage';

export const Route = createFileRoute('/accounting/sales-orders')({
  head: () => ({
    meta: [
      { title: 'أوامر البيع | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'تأكيد أوامر البيع بحجز الكميات والتحقق من حد ائتمان العميل قبل الحفظ.' },
      { property: 'og:title', content: 'أوامر البيع — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'تأكيد أوامر البيع بحجز الكميات والتحقق من حد ائتمان العميل قبل الحفظ.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccSalesOrdersPage,
});
