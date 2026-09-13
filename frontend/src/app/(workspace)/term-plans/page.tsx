"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ClipboardCheck,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AssistantPanel } from "@/components/AssistantPanel";
import { DiscardDialog } from "@/components/ConfirmationDialog";
import { ConfirmedBadge, DraftBadge, OfficialEvidenceBadge } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { evidenceItems, type ContentCategory, type EvidenceItem, type TermPlanRow } from "@/data/mockData";

const TOTAL_PLANNING_UNITS = 10;

export default function TermPlansPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-canvas p-8 text-sm text-muted-foreground">Loading…</div>}>
      <TermPlanWorkspace />
    </Suspense>
  );
}

function TermPlanWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = useTeachingContext();
  const {
    termPlanRows,
    updateTermPlanRow,
    addTermPlanRowFromEvidence,
    removeTermPlanRow,
    discardTermPlan,
    termPlanConfirmed,
    selectedEvidence,
  } = useWorkspace();

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const cameFromExplorer = searchParams.get("from") === "evidence";

  /* The evidence panel shows what the teacher selected; if they have not been
     to the explorer yet, fall back to the sub-strand this plan is built on. */
  const panelEvidence = useMemo(() => {
    if (selectedEvidence.length > 0) return selectedEvidence;
    return evidenceItems.filter(
      (item) => item.subject === "Agriculture" && item.subStrand === "Soil Conservation"
    );
  }, [selectedEvidence]);

  const grouped = useMemo(() => {
    const map = new Map<ContentCategory, EvidenceItem[]>();
    panelEvidence.forEach((item) => {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [panelEvidence]);

  const reviewedCount = termPlanRows.filter((row) => row.status !== "draft").length;
  const progressPercent = Math.round((reviewedCount / TOTAL_PLANNING_UNITS) * 100);
  const headEvidence = panelEvidence[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Draft term plan</h1>
              {termPlanConfirmed ? <ConfirmedBadge /> : <DraftBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              {context.grade} · {context.subject} · {context.term} · {context.className} · Academic Year{" "}
              {context.year}
            </p>
          </div>

          <div className="flex min-w-56 flex-col items-start gap-2 md:items-end">
            <span className="text-sm font-medium">
              {reviewedCount} of {TOTAL_PLANNING_UNITS} planning units reviewed
            </span>
            <div className="h-2 w-56 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Workflow progress, not learner achievement
            </span>
          </div>
        </div>

        {cameFromExplorer && selectedEvidence.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-border bg-brand-softer px-4 py-3">
            <OfficialEvidenceBadge />
            <p className="flex-1 text-sm text-brand-ink">
              {selectedEvidence.length} evidence {selectedEvidence.length === 1 ? "item" : "items"} carried in
              from the Curriculum Explorer. Add a planning row to use {selectedEvidence.length === 1 ? "it" : "them"}.
            </p>
            <Button size="sm" onClick={addTermPlanRowFromEvidence} className="gap-1.5">
              <Plus className="size-3.5" />
              Add planning row
            </Button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
          {/* Left column — official curriculum evidence */}
          <Card className="gap-4 p-6">
            <CardHeader className="gap-2 p-0">
              <OfficialEvidenceBadge className="self-start" />
              <div className="flex flex-wrap items-center gap-1 pt-1 text-sm text-muted-foreground">
                <span className="font-medium text-neutral-950">{headEvidence?.strand}</span>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-neutral-950">{headEvidence?.subStrand}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                KICD design · Page {headEvidence?.page}
              </span>
            </CardHeader>

            <CardContent className="gap-4 p-0">
              {grouped.map(([category, items], index) => (
                <div key={category} className="flex flex-col gap-1.5">
                  {index > 0 && <Separator className="mb-2.5" />}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </span>
                  {category === "Core Competencies" || category === "Values" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {items[0].content
                        .split(/[.;]/)
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((part) => (
                          <span
                            key={part}
                            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                          >
                            {part.split("—")[0].trim()}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-neutral-800">
                      {items.map((item) => item.content).join(" ")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>

            <CardFooter className="flex-col items-stretch gap-2 p-0">
              <AssistantPanel
                open={assistantOpen}
                onOpenChange={setAssistantOpen}
                context={`${headEvidence?.subStrand} · KICD design page ${headEvidence?.page}`}
              />
            </CardFooter>
          </Card>

          {/* Right column — the teacher-facing scheme of work */}
          <Card className="gap-4 p-4 md:p-6">
            <CardHeader className="gap-1 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Scheme of work</h2>
                <span className="text-xs text-muted-foreground">Click a cell to edit · Teacher draft</span>
              </div>
            </CardHeader>

            <CardContent className="gap-0 p-0">
              {/* Desktop: the familiar wide scheme table */}
              <div className="custom-scrollbar hidden overflow-x-auto rounded-lg border border-border lg:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-neutral-100 text-left">
                      {[
                        "Week",
                        "Strand",
                        "Sub-strand",
                        "Specific Learning Outcomes",
                        "Suggested Learning Experiences",
                        "Resources",
                        "Assessment",
                        "Reflection/Remarks",
                      ].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="border-b border-border px-2 py-2 font-medium first:w-16"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {termPlanRows.map((row) => (
                      <SchemeRow key={row.id} row={row} onChange={updateTermPlanRow} onRemove={removeTermPlanRow} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: the same rows as readable cards */}
              <div className="flex flex-col gap-3 lg:hidden">
                {termPlanRows.map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Week {row.week}</span>
                      {row.status === "draft" ? <DraftBadge>draft</DraftBadge> : <ConfirmedBadge>reviewed</ConfirmedBadge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.strand} › {row.subStrand}
                    </p>
                    <MobileField label="Specific Learning Outcomes" value={row.outcomes} onChange={(outcomes) => updateTermPlanRow(row.id, { outcomes })} />
                    <MobileField label="Suggested Learning Experiences" value={row.experiences} onChange={(experiences) => updateTermPlanRow(row.id, { experiences })} />
                    <MobileField label="Resources" value={row.resources} onChange={(resources) => updateTermPlanRow(row.id, { resources })} />
                    <MobileField label="Assessment" value={row.assessment} onChange={(assessment) => updateTermPlanRow(row.id, { assessment })} />
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addTermPlanRowFromEvidence}
                disabled={selectedEvidence.length === 0}
                className="mt-4 gap-1.5 self-start"
              >
                <Plus className="size-3.5" />
                Add row from selected evidence
              </Button>
              {selectedEvidence.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Select evidence in the{" "}
                  <Link href="/curriculum" className="text-brand-strong underline underline-offset-2">
                    Curriculum Explorer
                  </Link>{" "}
                  to add a new planning row.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-white px-4 py-4 md:px-8">
        <p className="max-w-md text-xs text-muted-foreground">
          {savedAt
            ? `Draft saved at ${savedAt}. `
            : ""}
          This is a teacher draft, not official KICD content. Review it against the cited curriculum evidence
          before confirming.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}
          >
            <Save className="size-4" />
            Save as draft
          </Button>
          <Button className="gap-2" onClick={() => router.push("/term-plans/review")}>
            <ClipboardCheck className="size-4" />
            Review before confirmation
          </Button>
          <Button
            variant="outline"
            onClick={() => setDiscardOpen(true)}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Discard draft
          </Button>
        </div>
      </footer>

      <DiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        description="You have unsaved work in this term plan. Discarding will reset all edited rows back to the starting draft. Selected curriculum evidence is kept."
        onConfirm={discardTermPlan}
      />
    </div>
  );
}

function SchemeRow({
  row,
  onChange,
  onRemove,
}: {
  row: TermPlanRow;
  onChange: (id: string, patch: Partial<TermPlanRow>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="border-r border-border px-2 py-2">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.week}</span>
          {row.status === "draft" ? (
            <span className="w-fit rounded-full bg-draft-soft px-1.5 py-0.5 text-[10px] font-medium text-draft-ink">
              draft
            </span>
          ) : (
            <span className="w-fit rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand-text">
              {row.status}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            aria-label={`Remove week ${row.week}`}
            className="mt-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </td>
      <EditableCell value={row.strand} onChange={(strand) => onChange(row.id, { strand })} muted />
      <EditableCell value={row.subStrand} onChange={(subStrand) => onChange(row.id, { subStrand })} muted />
      <EditableCell value={row.outcomes} onChange={(outcomes) => onChange(row.id, { outcomes })} multiline />
      <EditableCell
        value={row.experiences}
        onChange={(experiences) => onChange(row.id, { experiences })}
        multiline
      />
      <EditableCell value={row.resources} onChange={(resources) => onChange(row.id, { resources })} multiline muted />
      <EditableCell value={row.assessment} onChange={(assessment) => onChange(row.id, { assessment })} multiline muted />
      <td className="px-2 py-2">
        <textarea
          value={row.reflection}
          onChange={(event) => onChange(row.id, { reflection: event.target.value })}
          placeholder="To be completed after lesson"
          aria-label="Reflection or remarks"
          className="editable-cell h-16 w-full resize-none rounded bg-transparent px-1 py-0.5 text-sm italic text-muted-foreground outline-none placeholder:italic"
        />
      </td>
    </tr>
  );
}

function EditableCell({
  value,
  onChange,
  multiline,
  muted,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  muted?: boolean;
}) {
  const className = `editable-cell w-full rounded bg-transparent px-1 py-0.5 outline-none ${
    muted ? "text-muted-foreground" : "text-neutral-900"
  }`;

  return (
    <td className="border-r border-border px-2 py-2">
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} h-20 resize-none text-sm`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} text-sm`}
        />
      )}
    </td>
  );
}

function MobileField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-16 w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}
