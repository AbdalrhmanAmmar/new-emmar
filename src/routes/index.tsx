import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الإيمان لتجارة الأعلاف | بداية جديدة" },
      {
        name: "description",
        content: "مساحة عمل فارغة جاهزة لبناء التصميم الجديد لشركة الإيمان لتجارة الأعلاف.",
      },
      { property: "og:title", content: "الإيمان لتجارة الأعلاف | بداية جديدة" },
      {
        property: "og:description",
        content: "مساحة عمل فارغة جاهزة لبناء التصميم الجديد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg text-center space-y-3">
        <h1 className="text-3xl font-bold text-foreground">الإيمان لتجارة الأعلاف</h1>
        <p className="text-muted-foreground">
          تم حذف كل الموديولات. المشروع الآن نظيف وجاهز للبدء في التصميم الجديد.
        </p>
      </div>
    </main>
  );
}
