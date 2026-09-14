"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  FileText,
  Info,
  Link2,
  PenLine,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { OfficialEvidenceBadge } from "@/components/Provenance";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { EvidenceItem } from "@/data/mockData";

/**
 * Slide-in source drawer (Screen 4).
 *
 * Deliberately shows no numerical confidence score: trust comes from the
 * visible curriculum location, the page citation, and the separation between
 * official evidence, the AI summary, and the teacher's own notes.
 */
export function SourceDrawer({
  item,
  onClose,
}: {
  item: EvidenceItem | null;
  onClose: () => void;
}) {
  const { addEvidence, isSelected } = useWorkspace();
  const [note, setNote] = useState("");

  if (!item) return null;

  const selected = isSelected(item.id);
  const excerptLines = item.sourceExcerpt.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close source drawer"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-950/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Source for ${item.category}`}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <OfficialEvidenceBadge />
            </div>
            <h2 className="text-lg font-semibold leading-snug text-neutral-950">{item.designTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {item.grade} · {item.subject} (Learning Area)
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg">
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Source page</span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" />
              Page {item.page}
            </span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Curriculum section</span>
            <span className="truncate text-sm font-medium">
              {item.strand} › {item.subStrand}
            </span>
          </div>
        </div>

        <Tabs defaultValue="official" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="official">Official evidence</TabsTrigger>
              <TabsTrigger value="summary">AI summary</TabsTrigger>
              <TabsTrigger value="teacher">Teacher input</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <TabsContent value="official" className="mt-0 flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-softer px-3 py-2">
                <Info className="size-4 shrink-0 text-brand-strong" />
                <span className="text-xs text-brand-ink">
                  {item.sourceRendering === "reconstructed-table"
                    ? "Shown as a reconstructed table excerpt, not raw extracted text."
                    : "Shown as raw extracted text from the curriculum design."}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-neutral-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
                  {item.category}
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {excerptLines.map((line, index) => (
                    <p
                      key={index}
                      className={`px-3 py-2 text-sm ${
                        line.startsWith("  ") ? "pl-6 text-neutral-700" : "font-medium text-neutral-950"
                      }`}
                    >
                      {line.trim() || " "}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-border bg-neutral-100 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Extracted content
                </span>
                <p className="text-sm leading-relaxed text-neutral-800">{item.content}</p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Official-source links
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  <Link2 className="size-4" />
                  Official KICD portal link (placeholder)
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  <Download className="size-4" />
                  Download source PDF (placeholder)
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-0 flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-ai-border bg-ai-softer px-3 py-2">
                <Sparkles className="size-4 text-ai" />
                <span className="text-xs font-medium text-ai">AI summary</span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-800">
                This sub-strand focuses on helping learners recognise and practise soil conservation methods
                available in their locality. Suggested experiences include field visits, discussions, and simple
                demonstrations of terracing, mulching and cover cropping.
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-neutral-100 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-draft" />
                <p className="text-xs text-muted-foreground">
                  This is an AI-assisted summary of the cited evidence. Review it against Page {item.page}{" "}
                  before using it in a plan.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="teacher" className="mt-0 flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-neutral-100 px-3 py-2">
                <PenLine className="size-4" />
                <span className="text-xs font-medium text-neutral-950">Teacher input</span>
              </div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-32"
                placeholder="Add your own notes about this evidence (e.g. local resources, class adaptations)…"
              />
              <p className="text-xs text-muted-foreground">
                Your notes stay separate from the official curriculum evidence and AI summary.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-3 border-t border-border p-6">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <ArrowLeft className="size-4" />
            Close
          </Button>
          <Button
            onClick={() => addEvidence(item)}
            disabled={selected}
            className="gap-2"
          >
            {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
            {selected ? "In planning workspace" : "Add to planning workspace"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
