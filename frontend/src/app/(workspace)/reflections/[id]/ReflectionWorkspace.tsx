"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { AiBadge, ConfirmedBadge, DraftBadge, OfficialEvidenceBadge, SourceTag, TeacherInputBadge } from "@/components/Provenance";
import { useWorkspace } from "@/context/WorkspaceContext";
import { outcomeStatusLabels, type OutcomeStatus } from "@/data/mockData";
import {
  CurriculumApiError,
  confirmReflectionRecord,
  createReflection,
  describeApiError,
  generateReflectionSummary,
  getLesson,
  getReflectionByLesson,
  getScheme,
  updateReflection,
  type LessonRecord,
  type ReflectionContentInput,
  type ReflectionEvidence,
  type ReflectionStatus,
  type Scheme,
} from "@/lib/api";

const emptyEvidence: ReflectionEvidence = {
  learnerActions: "",
  workEvidence: "",
  needSupport: "",
  difficulties: "",
  revisit: "",
};

const evidencePrompts: { key: keyof ReflectionEvidence; label: string; placeholder: string }[] = [
  {
    key: "learnerActions",
    label: "What did learners say or do?",
    placeholder: "e.g. Four of seven groups explained why terracing slows run-off, using their own words…",
  },
  {
    key: "workEvidence",
    label: "What learner work or assessment evidence is available?",
    placeholder: "e.g. Group observation sheets, photographs of the terraced plot, exercise-book entries…",
  },
  {
    key: "needSupport",
    label: "Which learners or groups need additional support?",
    placeholder: "e.g. Group 2 and Group 6 could not link slope to erosion rate…",
  },
  {
    key: "difficulties",
    label: "What difficulties were observed?",
    placeholder: "e.g. Limited jembes meant two groups waited; the practical ran over time…",
  },
  {
    key: "revisit",
    label: "What should be revisited next lesson?",
    placeholder: "e.g. Re-open the slope-and-erosion link using the chart before starting cover cropping…",
  },
];

const outcomeOptions: { value: OutcomeStatus; description: string; tone: string }[] = [
  {
    value: "achieved",
    description: "Evidence shows learners met the outcome.",
    tone: "peer-checked:border-brand data-[selected=true]:border-brand data-[selected=true]:bg-brand-softer",
  },
  {
    value: "partially-achieved",
    description: "Some learners met it; others need more work.",
    tone: "data-[selected=true]:border-ai-border data-[selected=true]:bg-ai-softer",
  },
  {
    value: "not-yet-achieved",
    description: "Evidence shows the outcome was not met.",
    tone: "data-[selected=true]:border-draft-border data-[selected=true]:bg-draft-surface",
  },
  {
    value: "insufficient-evidence",
    description: "You do not yet have enough evidence to judge.",
    tone: "data-[selected=true]:border-neutral-400 data-[selected=true]:bg-neutral-100",
  },
];

type LoadState = "loading" | "ready" | "not-found" | "not-confirmed" | "error";

/** `id` is the confirmed lesson plan's id; its reflection record is created on first save. */
export function ReflectionWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const { evidenceById, refreshReflections } = useWorkspace();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [scheme, setScheme] = useState<Scheme | null>(null);

  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReflectionStatus>("not_started");
  const [evidence, setEvidence] = useState<ReflectionEvidence>(emptyEvidence);
  const [outcomeStatus, setOutcomeStatus] = useState<OutcomeStatus | null>(null);
  const [agentSummary, setAgentSummary] = useState<string | null>(null);

  const [busy, setBusy] = useState<"saving" | "generating" | "confirming" | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        const lessonRow = await getLesson(id, signal);
        if (lessonRow.status !== "confirmed") {
          setLesson(lessonRow);
          setLoadState("not-confirmed");
          return;
        }
        const [schemeRow, existing] = await Promise.all([
          lessonRow.scheme_id ? getScheme(lessonRow.scheme_id, signal).catch(() => null) : Promise.resolve(null),
          getReflectionByLesson(id, signal),
        ]);
        if (signal.aborted) return;
        setLesson(lessonRow);
        setScheme(schemeRow);
        const record = existing.reflection;
        if (record) {
          setReflectionId(record.id);
          setStatus(record.status);
          setEvidence({ ...emptyEvidence, ...record.evidence });
          setOutcomeStatus(record.outcomeStatus);
          setAgentSummary(record.agentSummary);
        }
        setLoadState("ready");
      } catch (error) {
        if (signal.aborted) return;
        // A malformed id (422) or a missing lesson (404) are both "no such lesson".
        if (error instanceof CurriculumApiError && (error.status === 404 || error.status === 422)) {
          setLoadState("not-found");
        } else {
          setLoadError(describeApiError(error));
          setLoadState("error");
        }
      }
    })();
    return () => controller.abort();
  }, [id]);

  /* Best effort only: a lesson row stores no evidence ids, so show the outcome evidence only if
     this session already holds a matching item. Never fall back to a fixed id. */
  const outcomeEvidence = useMemo(
    () =>
      lesson
        ? Object.values(evidenceById).find(
            (item) =>
              item.category === "Specific Learning Outcomes" &&
              item.strand === lesson.strand &&
              item.subStrand === lesson.sub_strand
          )
        : undefined,
    [lesson, evidenceById]
  );

  if (loadState === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center gap-2 bg-canvas p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading the lesson…
      </main>
    );
  }

  if (loadState !== "ready" || !lesson) {
    const message =
      loadState === "not-confirmed"
        ? "Reflections are recorded for confirmed lesson plans. Confirm this lesson plan in Daily Lessons first."
        : loadState === "error"
          ? `Could not load this lesson. ${loadError}`
          : "That lesson plan could not be found.";
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas p-8 text-center">
        <p className="max-w-md text-sm font-medium">{message}</p>
        <Button variant="outline" asChild>
          <Link href="/reflections">Back to reflections</Link>
        </Button>
      </main>
    );
  }

  const title = lesson.content?.title?.trim() || lesson.sub_strand;
  const lessonDate = lesson.content?.date || lesson.lesson_date;
  const schemeContext = scheme ? `${scheme.grade} ${scheme.subject} · Term ${scheme.term} ${scheme.year}` : null;
  const isConfirmed = status === "confirmed";
  const hasEvidence = Object.values(evidence).some((value) => value.trim().length > 0);
  const canConfirm = hasEvidence && Boolean(outcomeStatus) && !isConfirmed;
  const editingLocked = isConfirmed || busy !== null;

  /** Creates the record on first save and updates it afterwards; resolves to the saved record. */
  const persist = async (content: ReflectionContentInput, summary?: string) => {
    const saved = reflectionId
      ? await updateReflection(reflectionId, content, summary)
      : await createReflection(id, content, summary);
    setReflectionId(saved.id);
    setStatus(saved.status);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    return saved;
  };

  const handleSave = async () => {
    setBusy("saving");
    setSaveError(null);
    try {
      await persist({ evidence, outcomeStatus });
    } catch (error) {
      setSaveError(describeApiError(error));
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    setBusy("generating");
    setSummaryError(null);
    setSaveError(null);
    const snapshot = { evidence, outcomeStatus };
    try {
      const { summary } = await generateReflectionSummary(snapshot.evidence);
      setAgentSummary(summary);
      try {
        // Saved straight away so a generated summary is never lost on reload.
        await persist(snapshot, summary);
      } catch (error) {
        setSaveError(`The summary was generated but not saved. ${describeApiError(error)}`);
      }
    } catch (error) {
      setSummaryError(describeApiError(error));
    } finally {
      setBusy(null);
    }
  };

  const handleConfirmAttempt = () => {
    if (!hasEvidence) {
      setBlockedReason("Enter at least one piece of post-lesson evidence before confirming this record.");
      return;
    }
    if (!outcomeStatus) {
      setBlockedReason("Select an outcome status based on the evidence you recorded.");
      return;
    }
    setBlockedReason(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setBusy("confirming");
    setBlockedReason(null);
    try {
      // Save first so the confirmed record holds exactly what the teacher reviewed.
      const saved = await persist({ evidence, outcomeStatus });
      const confirmed = await confirmReflectionRecord(saved.id);
      setStatus(confirmed.status);
      // This lesson no longer awaits a reflection: update the badges straight away.
      refreshReflections();
    } catch (error) {
      setBlockedReason(`Could not confirm this record. ${describeApiError(error)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" asChild className="h-auto w-fit gap-1.5 px-0 text-muted-foreground">
            <Link href="/reflections">
              <ArrowLeft className="size-4" />
              Back to reflections
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Post-lesson reflection</h1>
            {isConfirmed ? (
              <ConfirmedBadge />
            ) : (
              <DraftBadge>{status === "draft" ? "Reflection draft" : "Not started"}</DraftBadge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {[title, lessonDate ? `lesson date ${formatDate(lessonDate)}` : "", schemeContext].filter(Boolean).join(" · ")}
          </p>
        </div>

        {isConfirmed && (
          <div className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-softer px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <p className="text-sm text-brand-ink">This reflection record is confirmed and can no longer be edited.</p>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            {/* Teacher evidence */}
            <Card className="gap-4 p-6">
              <CardHeader className="gap-2 p-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Your evidence</CardTitle>
                  <TeacherInputBadge />
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe what actually happened. This is the basis for the outcome status.
                </p>
              </CardHeader>
              <CardContent className="gap-4 p-0">
                {evidencePrompts.map(({ key, label, placeholder }) => (
                  <label key={key} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-neutral-900">{label}</span>
                    <Textarea
                      value={evidence[key]}
                      onChange={(event) => setEvidence((prev) => ({ ...prev, [key]: event.target.value }))}
                      placeholder={placeholder}
                      disabled={editingLocked}
                      className="min-h-20 disabled:opacity-70"
                    />
                  </label>
                ))}
              </CardContent>
            </Card>

            {/* Outcome status */}
            <Card className="gap-4 p-6">
              <CardHeader className="gap-2 p-0">
                <CardTitle className="text-lg">Outcome status</CardTitle>
                <div className="flex items-start gap-2.5 rounded-lg border border-draft-border bg-draft-surface p-3">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-draft-strong" />
                  <p className="text-xs leading-relaxed text-draft-text">
                    Select the outcome status based on evidence. Do not mark an objective as achieved simply
                    because the lesson was delivered.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="gap-2 p-0">
                <fieldset className="flex flex-col gap-2" disabled={editingLocked}>
                  <legend className="sr-only">Outcome status</legend>
                  {outcomeOptions.map((option) => {
                    const selected = outcomeStatus === option.value;
                    return (
                      <label
                        key={option.value}
                        data-selected={selected}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-neutral-50 ${option.tone}`}
                      >
                        <input
                          type="radio"
                          name="outcome-status"
                          value={option.value}
                          checked={selected}
                          onChange={() => setOutcomeStatus(option.value)}
                          className="mt-1 size-4 accent-[var(--color-brand)]"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-neutral-950">
                            {outcomeStatusLabels[option.value]}
                          </span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                {!hasEvidence && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Record evidence above first — the status should follow from it.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Assistant summary — strictly separate from the teacher's evidence */}
            <Card className="gap-3 border-ai-border p-6">
              <CardHeader className="gap-2 p-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">Assistant summary</CardTitle>
                  <AiBadge>AI summary of your evidence</AiBadge>
                </div>
              </CardHeader>
              <CardContent className="gap-3 p-0">
                {agentSummary ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{agentSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasEvidence
                      ? "Generate a summary of the evidence you have recorded."
                      : "Record evidence first; the assistant can then summarise it."}
                  </p>
                )}
                {!isConfirmed && (
                  <div className="flex flex-col items-start gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleGenerate()}
                      disabled={!hasEvidence || busy !== null}
                      className="gap-1.5"
                    >
                      {busy === "generating" ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Generating summary…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          {agentSummary ? "Regenerate summary" : "Generate summary"}
                        </>
                      )}
                    </Button>
                    {agentSummary && (
                      <p className="text-xs text-muted-foreground">
                        Written from your evidence when you generated it. Regenerate after changing your notes.
                      </p>
                    )}
                  </div>
                )}
                {summaryError && (
                  <p role="alert" className="text-xs text-destructive">
                    Could not generate a summary. {summaryError}
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-neutral-100 p-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-snug text-muted-foreground">
                    The assistant only summarises what you wrote. It never selects or suggests the achievement
                    status — that decision stays with you.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lesson context */}
          <Card className="gap-4 p-6">
            <CardHeader className="gap-2 p-0">
              <CardTitle className="text-base">Lesson context</CardTitle>
            </CardHeader>
            <CardContent className="gap-4 p-0">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Strand › Sub-strand
                </span>
                <p className="text-sm text-neutral-800">
                  {lesson.strand} › {lesson.sub_strand}
                </p>
              </div>
              {lesson.content?.outcomes?.trim() && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lesson plan outcomes
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-800">{lesson.content.outcomes}</p>
                </div>
              )}
              {outcomeEvidence && (
                <div className="flex flex-col gap-1.5">
                  <OfficialEvidenceBadge className="self-start" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Specific Learning Outcomes
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-800">{outcomeEvidence.content}</p>
                  <SourceTag page={outcomeEvidence.page} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border bg-white px-4 py-4 md:px-8">
        <div className="flex max-w-md flex-col gap-1">
          {(blockedReason || saveError) && (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="size-3.5" />
              {blockedReason ?? `Reflection draft not saved. ${saveError}`}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {savedAt && !isConfirmed ? `Reflection draft saved at ${savedAt}. ` : ""}
            A reflection record cannot be confirmed without your evidence and a chosen outcome status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/reflections")} className="gap-2">
            {isConfirmed ? "Back to reflections" : "Continue later"}
          </Button>
          <Button variant="outline" disabled={editingLocked} onClick={() => void handleSave()} className="gap-2">
            {busy === "saving" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {busy === "saving" ? "Saving…" : "Save reflection draft"}
          </Button>
          <Button onClick={handleConfirmAttempt} disabled={editingLocked} className="gap-2">
            {busy === "confirming" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isConfirmed ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isConfirmed ? "Reflection confirmed" : busy === "confirming" ? "Confirming…" : "Confirm reflection record"}
          </Button>
        </div>
      </footer>

      <ConfirmationDialog
        open={confirmOpen && canConfirm}
        onOpenChange={setConfirmOpen}
        title="Confirm this reflection record"
        description="You are about to store this post-lesson reflection as your own teacher work product. It sets the outcome status for this lesson and can no longer be edited afterwards."
        acknowledgement="I have recorded this outcome status based on the evidence above, not on the fact that the lesson was delivered."
        confirmLabel="Confirm reflection record"
        storedItems={[
          `Your evidence for "${title}"${lessonDate ? ` (lesson date ${formatDate(lessonDate)})` : ""}`,
          `Outcome status: ${outcomeStatus ? outcomeStatusLabels[outcomeStatus] : "—"}`,
          agentSummary
            ? "The assistant's summary, stored separately and labelled as AI-assisted"
            : "No assistant summary (none was generated)",
        ]}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
