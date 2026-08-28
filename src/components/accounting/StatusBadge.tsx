import { Badge } from "@/components/ui/badge";
import { docStatusColor, docStatusLabel } from "@/lib/docFlow";

export default function StatusBadge({ status }: { status?: string | null }) {
  const key = String(status ?? "draft");
  return <Badge className={docStatusColor[key] ?? "bg-muted text-muted-foreground"}>{docStatusLabel[key] ?? key}</Badge>;
}
