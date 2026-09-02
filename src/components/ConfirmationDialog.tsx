"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: ConfirmationDialogProps) {
  const [checked, setChecked] = useState(false);

  const handleConfirm = () => {
    if (checked) {
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-lg flex items-start gap-3">
            <Checkbox 
              id="confirm-terms" 
              checked={checked} 
              onCheckedChange={(c) => setChecked(c as boolean)} 
              className="mt-1"
            />
            <label htmlFor="confirm-terms" className="text-sm font-medium leading-relaxed text-neutral-700 cursor-pointer">
              I have reviewed this draft and accept it as my teacher work product.
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!checked} className="bg-neutral-900 text-white" onClick={handleConfirm}>
            Confirm and Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
