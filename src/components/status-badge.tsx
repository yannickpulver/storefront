import { Check, CircleArrowUp, CircleDashed, CircleX, Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toneStyles, toneText } from "@/components/tone";
import type { StatusCategory } from "@/lib/types";

export const categoryStyles: Record<StatusCategory, string> = {
  live: toneStyles.green,
  review: toneStyles.amber,
  pending: toneStyles.blue,
  issue: toneStyles.red,
  draft: toneStyles.mut,
};

export const categoryText: Record<StatusCategory, string> = {
  live: toneText.green,
  review: toneText.amber,
  pending: toneText.blue,
  issue: toneText.red,
  draft: toneText.mut,
};

const categoryIcons: Record<StatusCategory, LucideIcon> = {
  live: Check,
  review: Clock,
  pending: CircleArrowUp,
  issue: CircleX,
  draft: CircleDashed,
};

/** Status as a coloured icon, for places too narrow for a badge. */
export function StatusIcon({ category, className }: { category: StatusCategory; className?: string }) {
  const Icon = categoryIcons[category];
  return <Icon className={cn("h-3 w-3 shrink-0", categoryText[category], className)} aria-hidden />;
}

// Named after the states App Store Connect and the Play Console show, in plain words.
const displayNames: Record<string, string> = {
  // App Store
  READY_FOR_SALE: "Live",
  READY_FOR_DISTRIBUTION: "Live",
  PREORDER_READY_FOR_SALE: "Ready for Pre-Order",
  IN_REVIEW: "In Review",
  WAITING_FOR_REVIEW: "Waiting for Review",
  READY_FOR_REVIEW: "Ready for Review",
  ACCEPTED: "Accepted",
  WAITING_FOR_EXPORT_COMPLIANCE: "Waiting for Export Compliance",
  PENDING_DEVELOPER_RELEASE: "Pending Publication",
  PENDING_APPLE_RELEASE: "Pending Apple Release",
  PENDING_CONTRACT: "Pending Contract",
  PROCESSING_FOR_APP_STORE: "Processing",
  PROCESSING_FOR_DISTRIBUTION: "Processing",
  PREPARE_FOR_SUBMISSION: "Draft",
  REJECTED: "Rejected",
  METADATA_REJECTED: "Metadata Rejected",
  INVALID_BINARY: "Invalid Build",
  DEVELOPER_REJECTED: "Removed from Review",
  REMOVED_FROM_SALE: "Removed from Sale",
  DEVELOPER_REMOVED_FROM_SALE: "Removed from Sale",
  REPLACED_WITH_NEW_VERSION: "Replaced by New Version",
  // TestFlight
  IN_BETA_TESTING: "Testing",
  IN_BETA_REVIEW: "In Review",
  WAITING_FOR_BETA_REVIEW: "Waiting for Review",
  READY_FOR_BETA_TESTING: "Ready for Testing",
  READY_FOR_BETA_SUBMISSION: "Ready to Submit",
  BETA_APPROVED: "Ready for Testing",
  BETA_REJECTED: "Rejected",
  IN_EXPORT_COMPLIANCE_REVIEW: "Export Compliance Review",
  MISSING_EXPORT_COMPLIANCE: "Missing Export Compliance",
  PROCESSING: "Processing",
  PROCESSING_EXCEPTION: "Processing Error",
  EXPIRED: "Expired",
  // Google Play (release status; review states override it while a release is in review)
  completed: "Live",
  inProgress: "Rolling Out",
  halted: "Halted",
  draft: "Draft",
  APPROVED_NOT_PUBLISHED: "Pending Publication",
  NOT_SENT_FOR_REVIEW: "Not Sent for Review",
  NOT_APPROVED: "Rejected",
};

export const statusLabel = (status: string) => displayNames[status] ?? status;

export function StatusBadge({ status, category }: { status: string; category: StatusCategory }) {
  return (
    <Badge variant="outline" className={categoryStyles[category]}>
      {statusLabel(status)}
    </Badge>
  );
}
