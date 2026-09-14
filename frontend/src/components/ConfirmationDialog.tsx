"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Explicit confirmation gate.
 *
 * Nothing becomes a teacher work product without passing through this dialog:
 * it states exactly what will be stored and requires an acknowledgement tick
 * before the confirm button is enabled.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  storedItems,
  acknowledgement = "I have reviewed this draft and accept it as my teacher work product.",
  confirmLabel = "Confirm and save",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  storedItems: ReactNode[];
  acknowledgement?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  // Never carry a previous acknowledgement into a new confirmation: clearing it
  // as the dialog closes means every confirm starts from an unticked box.
  const handleOpenChange = (next: boolean) => {
    if (!next) setAcknowledged(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand-strong" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1 leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-neutral-50 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What will be stored
          </span>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-neutral-800">
            {storedItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-snug text-neutral-800">{acknowledgement}</span>
        </label>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!acknowledged}
            onClick={() => {
              onConfirm();
              handleOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Destructive-action gate — used for discarding drafts with unsaved work. */
export function DiscardDialog({
  open,
  onOpenChange,
  title = "Discard this draft?",
  description,
  confirmLabel = "Discard draft",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1 leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
