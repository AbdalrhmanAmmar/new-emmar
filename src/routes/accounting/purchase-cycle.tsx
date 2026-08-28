import { createFileRoute } from '@tanstack/react-router';
import AccPurchaseCyclePage from '@/pages/accounting/AccPurchaseCyclePage';

export const Route = createFileRoute('/accounting/purchase-cycle')({
  head: () => ({
    meta: [
      { title: 'متابعة دورة المشتريات | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'تتبع كل أمر شراء من طلب عرض السعر حتى السداد بالكميات والأرصدة.' },
      { property: 'og:title', content: 'متابعة دورة المشتريات — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'تتبع كل أمر شراء من طلب عرض السعر حتى السداد بالكميات والأرصدة.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccPurchaseCyclePage,
});
