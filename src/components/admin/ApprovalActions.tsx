import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ApprovalActionsProps {
  onApprove: () => void;
  onReject: () => void;
  onCancel?: () => void;
  isPending?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  cancelLabel?: string;
  approveVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  rejectVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
}

export function ApprovalActions({
  onApprove,
  onReject,
  onCancel,
  isPending = false,
  approveLabel = "Setujui",
  rejectLabel = "Tolak",
  cancelLabel = "Batal",
  approveVariant = "default",
  rejectVariant = "destructive",
}: ApprovalActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={onApprove}
        disabled={isPending}
        variant={approveVariant}
        size="sm"
      >
        <CheckCircle2 className="mr-1.5 size-4" />
        {approveLabel}
      </Button>
      <Button
        onClick={onReject}
        variant={rejectVariant}
        disabled={isPending}
        size="sm"
      >
        <XCircle className="mr-1.5 size-4" />
        {rejectLabel}
      </Button>
      {onCancel && (
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isPending}
          size="sm"
        >
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
