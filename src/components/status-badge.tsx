import { Badge } from "@/components/ui/badge";
import type { NormalizedRelease } from "@/lib/types";

const categoryStyles: Record<NormalizedRelease["statusCategory"], string> = {
  live: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  review: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  pending: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  issue: "bg-red-500/15 text-red-700 border-red-500/20",
  draft: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
};

export function StatusBadge({
  status,
  category,
}: {
  status: string;
  category: NormalizedRelease["statusCategory"];
}) {
  return (
    <Badge variant="outline" className={categoryStyles[category]}>
      {status}
    </Badge>
  );
}
