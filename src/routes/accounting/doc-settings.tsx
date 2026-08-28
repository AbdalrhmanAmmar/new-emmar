import { createFileRoute } from '@tanstack/react-router';
import AccDocSettingsPage from '@/pages/accounting/AccDocSettingsPage';

export const Route = createFileRoute('/accounting/doc-settings')({
  head: () => ({
    meta: [
      { title: 'إعدادات دورتي الشراء والبيع | برنامج إعمار المحاسبي' },
      { name: 'description', content: 'الضوابط الضريبية المصرية ونسب السماح وقواعد منع تجاوز الائتمان والاستلام.' },
      { property: 'og:title', content: 'إعدادات دورتي الشراء والبيع — إعمار لتجارة الأعلاف' },
      { property: 'og:description', content: 'الضوابط الضريبية المصرية ونسب السماح وقواعد منع تجاوز الائتمان والاستلام.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AccDocSettingsPage,
});
