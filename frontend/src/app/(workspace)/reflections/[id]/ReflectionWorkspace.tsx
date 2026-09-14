"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { AiBadge, ConfirmedBadge, DraftBadge, OfficialEvidenceBadge, SourceTag, TeacherInputBadge } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  evidenceItems,
  outcomeStatusLabels,
  type OutcomeStatus,
  type ReflectionRecord,
} from "@/data/mockData";

const evidencePrompts: {
  key: keyof ReflectionRecord["evidence"];
  label: string;
  placeholder: string;
}[] = [
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

export function ReflectionWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const context = useTeachingContext();
  const { reflections, setReflectionEvidence, setOutcomeStatus, confirmReflection, hasReflectionEvidence } =
    useWorkspace();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const record = reflections.find((item) => item.id === id);

  const outcomeEvidence = evidenceItems.find((item) => item.id === "ev-agri-slo-13");

  /* The assistant may summarise what the teacher wrote — it never proposes or
     selects an achievement status. */
  const assistantSummary = useMemo(() => {
    if (!record) return null;
    const filled = evidencePrompts
      .map(({ key, label }) => ({ label, value: record.evidence[key].trim() }))
      .filter((entry) => entry.value.length > 0);
    if (filled.length === 0) return null;
    return `You recorded evidence under ${filled.length} of ${evidencePrompts.length} prompts. Your notes mention ${filled
      .map((entry) => entry.label.replace(/\?$/, "").toLowerCase())
      .join("; ")}. Consider whether this is enough to judge the outcome, and which of it you would show a colleague as proof.`;
  }, [record]);

  if (!record) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas p-8 text-center">
        <p className="text-sm font-medium">That reflection record could not be found.</p>
        <Button variant="outline" asChild>
          <Link href="/reflections">Back to reflections</Link>
        </Button>
      </main>
    );
  }

  const hasEvidence = hasReflectionEvidence(record.id);
  const isConfirmed = record.status === "confirmed";
  const canConfirm = hasEvidence && Boolean(record.outcomeStatus) && !isConfirmed;

  const handleConfirmAttempt = () => {
    if (!hasEvidence) {
      setBlockedReason("Enter at least one piece of post-lesson evidence before confirming this record.");
      return;
    }
    if (!record.outcomeStatus) {
      setBlockedReason("Select an outcome status based on the evidence you recorded.");
      return;
    }
    setBlockedReason(null);
    setConfirmOpen(true);
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
            {isConfirmed ? <ConfirmedBadge /> : <DraftBadge>{record.status === "draft" ? "Reflection draft" : "Not started"}</DraftBadge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {record.lessonTitle} · taught {formatDate(record.date)} · {context.grade} {context.subject} ·{" "}
            {context.className}
          </p>
        </div>

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
                      value={record.evidence[key]}
                      onChange={(event) => setReflectionEvidence(record.id, { [key]: event.target.value })}
                      placeholder={placeholder}
                      disabled={isConfirmed}
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
                <fieldset className="flex flex-col gap-2" disabled={isConfirmed}>
                  <legend className="sr-only">Outcome status</legend>
                  {outcomeOptions.map((option) => {
                    const selected = record.outcomeStatus === option.value;
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
                          onChange={() => setOutcomeStatus(record.id, option.value)}
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
                {assistantSummary ? (
                  <p className="text-sm leading-relaxed text-neutral-800">{assistantSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Once you record evidence, the assistant will summarise it here.
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-neutral-100 p-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-snug text-muted-foreground">
                    The assistant summarises and suggests follow-up only. It never selects the achievement
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
              <OfficialEvidenceBadge className="self-start" />
            </CardHeader>
            <CardContent className="gap-4 p-0">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sub-strand
                </span>
                <p className="text-sm text-neutral-800">Food Production Processes › Soil Conservation</p>
              </div>
              {outcomeEvidence && (
                <div className="flex flex-col gap-1.5">
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
          {blockedReason && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="size-3.5" />
              {blockedReason}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {savedAt ? `Reflection draft saved at ${savedAt}. ` : ""}
            A reflection record cannot be confirmed without your evidence and a chosen outcome status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/reflections")} className="gap-2">
            Continue later
          </Button>
          <Button
            variant="outline"
            disabled={isConfirmed}
            onClick={() => setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}
            className="gap-2"
          >
            <Save className="size-4" />
            Save reflection draft
          </Button>
          <Button onClick={handleConfirmAttempt} disabled={isConfirmed} className="gap-2">
            {isConfirmed ? <CheckCircle2 className="size-4" /> : <Sparkles className="size-4" />}
            {isConfirmed ? "Reflection confirmed" : "Confirm reflection record"}
          </Button>
        </div>
      </footer>

      <ConfirmationDialog
        open={confirmOpen && canConfirm}
        onOpenChange={setConfirmOpen}
        title="Confirm this reflection record"
        description="You are about to store this post-lesson reflection as your own teacher work product. It will appear in My Library and set the outcome status for this lesson."
        acknowledgement="I have recorded this outcome status based on the evidence above, not on the fact that the lesson was delivered."
        confirmLabel="Confirm reflection record"
        storedItems={[
          `Your evidence for "${record.lessonTitle}" (taught ${formatDate(record.date)})`,
          `Outcome status: ${record.outcomeStatus ? outcomeStatusLabels[record.outcomeStatus] : "—"}`,
          "A citation to the specific learning outcome this lesson addressed (KICD design page 13)",
          "The assistant's summary, stored separately and labelled as AI-assisted",
        ]}
        onConfirm={() => {
          const ok = confirmReflection(record.id);
          if (!ok) setBlockedReason("Evidence and an outcome status are both required before confirming.");
        }}
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
