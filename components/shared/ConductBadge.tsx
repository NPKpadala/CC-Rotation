import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export function ConductBadge({ totalPending, heldBy }: { totalPending: number; heldBy?: string | null }) {
  if (totalPending <= 0.01) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Good Standing
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <Clock className="mr-1 h-3 w-3" /> {formatCurrency(totalPending)} Pending
      {heldBy && <span className="ml-1 text-[10px] opacity-75">({heldBy})</span>}
    </Badge>
  );
}
