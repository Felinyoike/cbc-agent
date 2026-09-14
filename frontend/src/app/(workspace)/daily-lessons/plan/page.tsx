"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssistantPanel } from "@/components/AssistantPanel";
import { DiscardDialog } from "@/components/ConfirmationDialog";
import { SourceDrawer } from "@/components/SourceDrawer";
import { ConfirmedBadge, DraftBadge, OfficialEvidenceBadge, SourceTag } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { EvidenceItem } from "@/data/mockData";
import { describeApiError } from "@/lib/api";

export default function LessonPlanPage() {
  const router = useRouter();
  const context = useTeachingContext();
  const {
    lessonPlan,
    updateLessonPlan,
    lessonPlanConfirmed,
    termPlanRows,
    evidenceById,
    selectedTermPlanRow: sourceRow,
    selectTermPlanRow,
    generateLessonFromRow,
    saveLessonPlanDraft,
    discardLessonPlan,
  } = useWorkspace();

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [sourceItem, setSourceItem] = useState<EvidenceItem | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  /* Evidence cited by the selected row, resolved from what was selected in the Curriculum Explorer. */
  const lessonEvidence = useMemo(
    () =>
      (sourceRow?.evidenceIds ?? [])
        .map((id) => evidenceById[id])
        .filter((item): item is EvidenceItem => Boolean(item)),
    [sourceRow, evidenceById]
  );
  const unresolvedEvidenceCount = (sourceRow?.evidenceIds.length ?? 0) - lessonEvidence.length;

  const updateStep = (index: number, value: string) => {
    const development = [...lessonPlan.development];
    development[index] = value;
    updateLessonPlan({ development });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await generateLessonFromRow();
    } catch (error) {
      setGenerateError(describeApiError(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!sourceRow) {
      setSaveError("Choose the term plan row this lesson comes from.");
      return;
    }
    if (!lessonPlan.date) {
      setSaveError("Set the lesson date first.");
      return;
    }
    setSaving(true);
    try {
      await saveLessonPlanDraft();
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      setSaveError(describeApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" asChild className="h-auto w-fit gap-1.5 px-0 text-muted-foreground">
        <Link href="/daily-lessons">
          <ArrowLeft className="size-4" />
          Back to daily lessons
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Daily lesson plan</h1>
        {lessonPlanConfirmed ? <ConfirmedBadge /> : <DraftBadge />}
      </div>
      <p className="text-sm text-muted-foreground">
        {context.grade} · {context.subject} · {context.term} · {context.className} · Week {sourceRow?.week ?? "—"}
      </p>
    </div>
  );

  if (termPlanRows.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        {header}
        <Card className="gap-3 p-6">
          <div className="flex items-start gap-2">
            <FileSearch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No term plan rows yet — build one in{" "}
              <Link href="/term-plans" className="text-brand-strong underline underline-offset-2">
                Term Plans
              </Link>{" "}
              first. Each daily lesson is planned from one week of your term plan.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        {header}

        <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
          {/* Left — the term plan row this lesson is planned from, and its evidence */}
          <Card className="gap-4 p-6">
            <CardHeader className="gap-3 p-0">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-neutral-900">Term plan row</span>
                <Select value={sourceRow?.id ?? ""} onValueChange={selectTermPlanRow}>
                  <SelectTrigger aria-label="Term plan row" className="w-full">
                    <SelectValue placeholder="Choose a week from your term plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {termPlanRows.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        Week {row.week} · {row.subStrand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {sourceRow && (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      Source: Term plan — Week {sourceRow.week}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        Lessons {sourceRow.lessons}
                      </span>
                    </CardTitle>
                    <button
                      type="button"
                      onClick={() => setEvidenceOpen((open) => !open)}
                      aria-expanded={evidenceOpen}
                      aria-label={evidenceOpen ? "Collapse evidence" : "Expand evidence"}
                      className="shrink-0 text-muted-foreground hover:text-neutral-900"
                    >
                      <ChevronDown className={`size-4 transition-transform ${evidenceOpen ? "" : "-rotate-90"}`} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                    <span className="font-medium text-neutral-950">{sourceRow.strand}</span>
                    <ChevronRight className="size-3.5" />
                    <span className="font-medium text-neutral-950">{sourceRow.subStrand}</span>
                  </div>
                </>
              )}
            </CardHeader>

            {!sourceRow ? (
              <p className="text-sm text-muted-foreground">
                Choose the week you are teaching to see its curriculum evidence and draft a lesson from it.
              </p>
            ) : (
              evidenceOpen && (
                <CardContent className="gap-4 p-0">
                  {lessonEvidence.length === 0 && (
                    <p className="text-sm text-muted-foreground">No curriculum evidence is cited by this row.</p>
                  )}
                  {lessonEvidence.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-softer/40 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
                          {item.category}
                        </span>
                        <OfficialEvidenceBadge className="text-[10px]" />
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-800">{item.content}</p>
                      <div className="flex items-center justify-between gap-2">
                        <SourceTag page={item.page} />
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setSourceItem(item)}
                          className="h-auto gap-1 px-0 text-xs"
                        >
                          <FileSearch className="size-3" />
                          View source
                        </Button>
                      </div>
                    </div>
                  ))}
                  {unresolvedEvidenceCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unresolvedEvidenceCount} cited evidence {unresolvedEvidenceCount === 1 ? "item is" : "items are"}{" "}
                      no longer available in this browser.
                    </p>
                  )}
                </CardContent>
              )
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleGenerate} disabled={!sourceRow || generating} className="gap-1.5">
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating lesson draft…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate from this row
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Fills a starting draft of the outcomes, inquiry question, resources, introduction, activities,
                assessment and closure from this row only. It replaces those fields.
              </p>
              {generateError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">Could not generate a lesson draft. {generateError}</p>
                </div>
              )}
              <AssistantPanel
                open={assistantOpen}
                onOpenChange={setAssistantOpen}
                context={sourceRow ? `${sourceRow.subStrand} · Week ${sourceRow.week}` : "No term plan row selected"}
                evidence={lessonEvidence}
              />
            </div>
          </Card>

          {/* Right — the structured lesson plan form */}
          <Card className="gap-5 p-4 md:p-6">
            <CardHeader className="gap-1 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">Today&apos;s lesson plan</CardTitle>
                {lessonPlanConfirmed ? <ConfirmedBadge /> : <DraftBadge>draft</DraftBadge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Every field is yours to edit. Generation only gives you a starting draft from the selected term
                plan row — it never confirms anything for you.
              </p>
            </CardHeader>

            <CardContent className="gap-5 p-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lesson title">
                  <Input value={lessonPlan.title} onChange={(e) => updateLessonPlan({ title: e.target.value })} />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={lessonPlan.date}
                    onChange={(e) => updateLessonPlan({ date: e.target.value })}
                  />
                </Field>
                <Field label="Time allocation">
                  <Input
                    value={lessonPlan.duration}
                    onChange={(e) => updateLessonPlan({ duration: e.target.value })}
                  />
                </Field>
                <Field label="Roll">
                  <Input value={lessonPlan.roll} onChange={(e) => updateLessonPlan({ roll: e.target.value })} />
                </Field>
              </div>

              <Field label="Specific learning outcomes">
                <Textarea
                  value={lessonPlan.outcomes}
                  onChange={(e) => updateLessonPlan({ outcomes: e.target.value })}
                  className="min-h-20"
                />
              </Field>

              <Field label="Key inquiry question">
                <Input
                  value={lessonPlan.keyInquiryQuestion}
                  onChange={(e) => updateLessonPlan({ keyInquiryQuestion: e.target.value })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Core competencies" hint="Teacher-entered; not generated.">
                  <Input
                    value={lessonPlan.competencies}
                    onChange={(e) => updateLessonPlan({ competencies: e.target.value })}
                  />
                </Field>
                <Field label="Values and PCIs" hint="Teacher-entered; not generated.">
                  <Input
                    value={lessonPlan.valuesAndPcis}
                    onChange={(e) => updateLessonPlan({ valuesAndPcis: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Learning resources">
                <Textarea
                  value={lessonPlan.resources}
                  onChange={(e) => updateLessonPlan({ resources: e.target.value })}
                  className="min-h-16"
                />
              </Field>

              <Field label="Introduction / starter activity">
                <Textarea
                  value={lessonPlan.introduction}
                  onChange={(e) => updateLessonPlan({ introduction: e.target.value })}
                  className="min-h-20"
                />
              </Field>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-900">Main learning activities</span>
                {lessonPlan.development.length === 0 && (
                  <p className="text-xs text-muted-foreground">No activities yet.</p>
                )}
                {lessonPlan.development.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                      {index + 1}
                    </span>
                    <Textarea
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      aria-label={`Learning activity ${index + 1}`}
                      className="min-h-16 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateLessonPlan({
                          development: lessonPlan.development.filter((_, i) => i !== index),
                        })
                      }
                      aria-label={`Remove activity ${index + 1}`}
                      className="mt-2.5 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLessonPlan({ development: [...lessonPlan.development, ""] })}
                  className="w-fit gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Add activity
                </Button>
              </div>

              <Field label="Assessment / checking for understanding">
                <Textarea
                  value={lessonPlan.assessmentActivity}
                  onChange={(e) => updateLessonPlan({ assessmentActivity: e.target.value })}
                  className="min-h-20"
                />
              </Field>

              <Field label="Lesson closure">
                <Textarea
                  value={lessonPlan.conclusion}
                  onChange={(e) => updateLessonPlan({ conclusion: e.target.value })}
                  className="min-h-16"
                />
              </Field>

              <Field label="Teacher notes" hint="Kept separate from curriculum evidence and AI suggestions.">
                <Textarea
                  value={lessonPlan.teacherNotes}
                  onChange={(e) => updateLessonPlan({ teacherNotes: e.target.value })}
                  className="min-h-20"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-white px-4 py-4 md:px-8">
        <p className="max-w-md text-xs text-muted-foreground">
          {saveError ? (
            <span role="alert" className="text-destructive">Draft not saved. {saveError} </span>
          ) : savedAt ? (
            `Draft saved at ${savedAt}. `
          ) : (
            ""
          )}
          This is an AI-assisted teacher draft, not official KICD content. Review it against the cited evidence
          before confirming.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : "Save as draft"}
          </Button>
          <Button className="gap-2" onClick={() => router.push("/daily-lessons/review")}>
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
        description="You have unsaved work in this lesson plan. Discarding clears every field. Your term plan row selection is kept."
        onConfirm={() => {
          discardLessonPlan();
          setSavedAt(null);
        }}
      />

      <SourceDrawer item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-900">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
