"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSearch,
  Loader2,
  PenLine,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog, DiscardDialog } from "@/components/ConfirmationDialog";
import { SourceDrawer } from "@/components/SourceDrawer";
import { AiBadge, DraftBadge, OfficialEvidenceBadge, SourceTag, TeacherInputBadge } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { EvidenceItem, LessonPlanDraft } from "@/data/mockData";
import { describeApiError, lessonDownloadUrl } from "@/lib/api";

type TextField = Exclude<keyof LessonPlanDraft, "development" | "date">;

const FIELD_LABELS: Record<TextField, string> = {
  title: "Lesson title",
  duration: "Time allocation",
  roll: "Roll",
  outcomes: "Specific learning outcomes",
  keyInquiryQuestion: "Key inquiry question",
  competencies: "Core competencies",
  valuesAndPcis: "Values and PCIs",
  resources: "Learning resources",
  introduction: "Introduction / starter",
  assessmentActivity: "Assessment activity",
  conclusion: "Lesson closure",
  teacherNotes: "Teacher notes",
};

export default function LessonReviewPage() {
  const router = useRouter();
  const context = useTeachingContext();
  const {
    lessonPlan,
    confirmLessonPlan,
    lessonPlanConfirmed,
    discardLessonPlan,
    selectedTermPlanRow: sourceRow,
    generatedLessonContent,
    evidenceById,
    currentLessonId,
  } = useWorkspace();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [sourceItem, setSourceItem] = useState<EvidenceItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const citedEvidence = useMemo(
    () =>
      (sourceRow?.evidenceIds ?? [])
        .map((id) => evidenceById[id])
        .filter((item): item is EvidenceItem => Boolean(item)),
    [sourceRow, evidenceById]
  );
  const citedPages = Array.from(new Set(citedEvidence.map((item) => item.page))).sort((a, b) => a - b);

  /* Text that differs from what generation produced. Fields generation never fills — and every
     field, if the teacher never generated — are compared against empty, so typed text counts as
     the teacher's own input. */
  const teacherEdits = useMemo(() => {
    const edits = (Object.keys(FIELD_LABELS) as TextField[])
      .filter((key) => {
        const baseline = generatedLessonContent?.[key as keyof typeof generatedLessonContent] ?? "";
        const current = lessonPlan[key];
        return current !== baseline && current.trim().length > 0;
      })
      .map((key) => ({ label: FIELD_LABELS[key], value: lessonPlan[key] }));

    const steps = lessonPlan.development.filter((step) => step.trim());
    const stepsChanged =
      JSON.stringify(lessonPlan.development) !== JSON.stringify(generatedLessonContent?.development ?? []);
    if (stepsChanged && steps.length > 0) {
      edits.push({
        label: "Main learning activities",
        value: generatedLessonContent
          ? `${lessonPlan.development.length} steps, edited`
          : `${steps.length} steps, entered by you`,
      });
    }
    return edits;
  }, [lessonPlan, generatedLessonContent]);

  /* Only what is actually in the plan: no invented timings or notes. */
  const structureRows = [
    { step: "Intro", activity: lessonPlan.introduction },
    ...lessonPlan.development.map((activity, index) => ({ step: String(index + 1), activity })),
    { step: "Close", activity: lessonPlan.conclusion },
  ].filter((row) => row.activity.trim());

  const handleConfirm = async () => {
    setConfirmError(null);
    if (!lessonPlan.date) {
      setConfirmError("Set the lesson date on the plan before confirming.");
      return;
    }
    setConfirming(true);
    try {
      await confirmLessonPlan();
    } catch (error) {
      setConfirmError(describeApiError(error));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" asChild className="h-auto w-fit gap-1.5 px-0 text-muted-foreground">
            <Link href="/daily-lessons/plan">
              <ArrowLeft className="size-4" />
              Back to lesson workspace
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Draft review &amp; confirmation
            </h1>
            {lessonPlanConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">
                <CheckCircle2 className="size-3.5" />
                Confirmed
              </span>
            ) : (
              <DraftBadge>{generatedLessonContent ? "AI-assisted draft" : "Teacher draft"}</DraftBadge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Daily Lesson
            {sourceRow ? ` · ${sourceRow.strand} · ${sourceRow.subStrand} · Week ${sourceRow.week}` : ""}
            {lessonPlan.title ? ` · ${lessonPlan.title}` : ""} · {context.grade} {context.subject} ·{" "}
            {context.className}
          </p>
        </div>

        {!sourceRow && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-draft-border bg-draft-surface px-4 py-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-draft-strong" />
            <p className="text-sm text-draft-ink">
              No term plan row is selected for this lesson.{" "}
              <Link href="/daily-lessons/plan" className="font-medium underline underline-offset-2">
                Choose one in the lesson workspace
              </Link>{" "}
              before confirming.
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-draft-border bg-draft-surface px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-draft-strong" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-draft-ink">
              Review this draft against the cited curriculum evidence before confirming.
            </p>
            <p className="text-xs text-draft-text">
              Nothing is saved as a teacher work product until you confirm it below.
            </p>
          </div>
        </div>

        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Curriculum evidence used</CardTitle>
              <OfficialEvidenceBadge />
            </div>
          </CardHeader>
          <CardContent className="gap-3 p-0">
            {citedEvidence.length === 0 && (
              <p className="text-sm text-muted-foreground">No curriculum evidence is cited by this lesson&apos;s row.</p>
            )}
            {citedEvidence.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-softer/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-950">{item.category}</span>
                  <SourceTag page={item.page} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.strand} › {item.subStrand}
                </span>
                <p className="text-sm leading-relaxed text-neutral-800">{item.content}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSourceItem(item)}
                  className="h-auto w-fit gap-1 px-0 text-sm"
                >
                  <FileSearch className="size-3.5" />
                  View source
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Lesson structure</CardTitle>
              {generatedLessonContent && <AiBadge>AI-assisted</AiBadge>}
            </div>
            <p className="text-sm text-muted-foreground">
              The lesson steps as they currently stand in your plan.
            </p>
          </CardHeader>
          <CardContent className="gap-0 p-0">
            {structureRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                This plan has no introduction, activities or closure yet. Go back to the lesson workspace to add
                them or generate a starting draft from the term plan row.
              </p>
            ) : (
              <div className="custom-scrollbar overflow-x-auto rounded-lg border border-ai-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-ai-softer text-left">
                      {["Step", "Activity"].map((heading) => (
                        <th key={heading} scope="col" className="border-b border-ai-border px-3 py-2 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {structureRows.map((row, index) => (
                      <tr key={`${row.step}-${index}`} className="border-b border-border last:border-b-0">
                        <td className="w-20 px-3 py-2 font-medium">{row.step}</td>
                        <td className="px-3 py-2">{row.activity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Teacher edits and notes</CardTitle>
              <TeacherInputBadge />
            </div>
          </CardHeader>
          <CardContent className="gap-3 p-0">
            {teacherEdits.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-4">
                <PenLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You have not adjusted this draft yet. Go back and change anything that does not fit your class
                  before confirming.
                </p>
              </div>
            ) : (
              teacherEdits.map((edit) => (
                <div key={edit.label} className="flex flex-col gap-1 rounded-lg border border-border bg-neutral-50 p-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {edit.label}
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-800">{edit.value}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {confirmError && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">Could not confirm this lesson plan. {confirmError}</p>
          </div>
        )}

        {lessonPlanConfirmed && (
          <div className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-softer px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <p className="text-sm text-brand-ink">
              Confirmed — view it in{" "}
              <Link href="/library" className="font-medium underline underline-offset-2">
                My Library
              </Link>
              . Record post-lesson evidence in{" "}
              <Link href="/reflections" className="font-medium underline underline-offset-2">
                Reflections
              </Link>{" "}
              after you teach it.
            </p>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-white px-4 py-4 md:px-8">
        <p className="max-w-md text-xs text-muted-foreground">
          Confirming records this as your own teacher work product — not as official KICD content.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/daily-lessons/plan">
              <PenLine className="size-4" />
              Edit draft
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => router.push("/daily-lessons")} className="gap-2">
            <Save className="size-4" />
            Keep as draft
          </Button>
          {/* Only a saved lesson exists on the server to download. */}
          {currentLessonId ? (
            <Button variant="outline" asChild className="gap-2">
              <a href={lessonDownloadUrl(currentLessonId)}>
                <Download className="size-4" />
                Download
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2" title="Save or confirm the lesson plan first">
              <Download className="size-4" />
              Download
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setDiscardOpen(true)}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Discard
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={lessonPlanConfirmed || confirming || !sourceRow}
            className="gap-2"
          >
            {confirming ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {lessonPlanConfirmed ? "Confirmed" : confirming ? "Saving…" : "Confirm and save"}
          </Button>
        </div>
      </footer>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm this lesson plan"
        description="You are about to store this daily lesson plan as your own teacher work product. It will appear in My Library."
        storedItems={[
          `Lesson plan "${lessonPlan.title || "Untitled"}" for ${lessonPlan.date || "no date set"}${lessonPlan.duration ? ` (${lessonPlan.duration})` : ""}`,
          `${lessonPlan.development.length} main learning ${lessonPlan.development.length === 1 ? "activity" : "activities"}, plus introduction, assessment and closure`,
          `Citations to ${citedEvidence.length} curriculum evidence ${citedEvidence.length === 1 ? "item" : "items"} (KICD design ${citedPages.length ? `pages ${citedPages.join(", ")}` : "—"})`,
          "Your edits and notes, labelled as teacher input",
        ]}
        onConfirm={() => void handleConfirm()}
      />

      <DiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        description="This lesson draft has unsaved work. Discarding clears every field and nothing will be recorded in your library."
        onConfirm={() => {
          discardLessonPlan();
          router.push("/daily-lessons");
        }}
      />

      <SourceDrawer item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}
