import type { ReactNode } from "react";
import { FlaskConical, ShieldCheck, Sparkles, PenLine, FileEdit, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Content-origin labelling.
 *
 * The brief requires that official curriculum evidence, AI-generated
 * suggestions and teacher-entered content are always visually distinct, and
 * that trust comes from a visible source location rather than a confidence
 * score. These badges are the single place that mapping is defined.
 */

interface TagProps {
  className?: string;
  children?: ReactNode;
}

export function OfficialEvidenceBadge({ className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink",
        className
      )}
    >
      <ShieldCheck className="size-3" />
      Official curriculum evidence
    </span>
  );
}

export function AiBadge({ className, children = "AI-assisted" }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai",
        className
      )}
    >
      <Sparkles className="size-3" />
      {children}
    </span>
  );
}

export function TeacherInputBadge({ className, children = "Teacher input" }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700",
        className
      )}
    >
      <PenLine className="size-3" />
      {children}
    </span>
  );
}

export function PrototypeBadge({ className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-draft-surface px-3 py-1 text-xs font-medium text-draft-text",
        className
      )}
    >
      <FlaskConical className="size-3.5" />
      Prototype / Mock data
    </span>
  );
}

export function DraftBadge({ className, children = "Draft" }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-draft-soft px-2 py-0.5 text-xs font-medium text-draft-ink",
        className
      )}
    >
      <FileEdit className="size-3" />
      {children}
    </span>
  );
}

export function ConfirmedBadge({ className, children = "Confirmed" }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-text",
        className
      )}
    >
      <CheckCircle2 className="size-3" />
      {children}
    </span>
  );
}

/** Compact citation, e.g. `KICD design · Page 13`. */
export function SourceTag({ page, className }: { page: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground", className)}>
      <ShieldCheck className="size-3.5" />
      KICD design · Page {page}
    </span>
  );
}
