import { createFileRoute } from '@tanstack/react-router';
import AccRfqsPage from '@/pages/accounting/AccRfqsPage';

export const Route = createFileRoute('/accounting/rfqs')({
  head: () => ({
    meta: [
      { title: 'طلبات عروض الأسعار | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'تسجيل احتياج المخازن، جمع عروض الموردين ومقارنتها، والترسية لإنشاء أمر شراء تلقائياً.' },
      { property: 'og:title', content: 'طلبات عروض الأسعار — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'تسجيل احتياج المخازن، جمع عروض الموردين ومقارنتها، والترسية لإنشاء أمر شراء تلقائياً.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccRfqsPage,
});
