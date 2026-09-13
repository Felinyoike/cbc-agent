"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSearch, PenLine, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog, DiscardDialog } from "@/components/ConfirmationDialog";
import { SourceDrawer } from "@/components/SourceDrawer";
import { AiBadge, DraftBadge, OfficialEvidenceBadge, SourceTag, TeacherInputBadge } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { evidenceItems, initialLessonPlan, type EvidenceItem } from "@/data/mockData";

export default function LessonReviewPage() {
  const router = useRouter();
  const context = useTeachingContext();
  const { lessonPlan, confirmLessonPlan, lessonPlanConfirmed, updateLessonPlan } = useWorkspace();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [sourceItem, setSourceItem] = useState<EvidenceItem | null>(null);

  const citedEvidence = evidenceItems.filter((item) =>
    ["ev-agri-slo-13", "ev-agri-sle-13", "ev-agri-kiq-13"].includes(item.id)
  );

  /* Anything the teacher changed from the starting draft is reported as their
     own input rather than folded into the AI-organised section. */
  const teacherEdits = useMemo(() => {
    const labels: Record<string, string> = {
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

    const edits = Object.entries(labels)
      .filter(([key]) => {
        const current = lessonPlan[key as keyof typeof lessonPlan];
        const original = initialLessonPlan[key as keyof typeof initialLessonPlan];
        return typeof current === "string" && current !== original && current.trim().length > 0;
      })
      .map(([key, label]) => ({ label, value: lessonPlan[key as keyof typeof lessonPlan] as string }));

    const stepsChanged =
      JSON.stringify(lessonPlan.development) !== JSON.stringify(initialLessonPlan.development);
    if (stepsChanged) {
      edits.push({ label: "Main learning activities", value: `${lessonPlan.development.length} steps, edited` });
    }

    // The seeded teacher notes are genuine teacher input, so always surface them.
    if (!edits.some((edit) => edit.label === "Teacher notes") && lessonPlan.teacherNotes.trim()) {
      edits.push({ label: "Teacher notes", value: lessonPlan.teacherNotes });
    }
    return edits;
  }, [lessonPlan]);

  const stepMinutes = ["8 min", "15 min", "5 min", "5 min", "5 min", "5 min"];

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
              <DraftBadge>AI-assisted draft</DraftBadge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Daily Lesson · Food Production Processes · Soil Conservation · {lessonPlan.title} · {context.grade}{" "}
            {context.subject} · {context.className}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-draft-border bg-draft-surface px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-draft-strong" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-draft-ink">
              This is an AI-assisted draft. Review it against the cited curriculum evidence before confirming.
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
            {citedEvidence.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-softer/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-950">{item.category}</span>
                  <SourceTag page={item.page} />
                </div>
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
              <CardTitle className="text-lg">AI-assisted organization</CardTitle>
              <AiBadge>AI generated</AiBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              How the assistant structured your lesson steps. Timings are suggestions — adjust them for your
              class.
            </p>
          </CardHeader>
          <CardContent className="gap-0 p-0">
            <div className="custom-scrollbar overflow-x-auto rounded-lg border border-ai-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ai-softer text-left">
                    {["Step", "Activity", "Time", "Notes"].map((heading) => (
                      <th key={heading} scope="col" className="border-b border-ai-border px-3 py-2 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">Intro</td>
                    <td className="px-3 py-2">{lessonPlan.introduction}</td>
                    <td className="px-3 py-2 text-muted-foreground">5 min</td>
                    <td className="px-3 py-2 text-muted-foreground">Recalls Lesson 3</td>
                  </tr>
                  {lessonPlan.development.map((step, index) => (
                    <tr key={index} className="border-b border-border">
                      <td className="px-3 py-2 font-medium">{index + 1}</td>
                      <td className="px-3 py-2">{step}</td>
                      <td className="px-3 py-2 text-muted-foreground">{stepMinutes[index] ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {index === 1 ? "Practical — supervise tool use" : "Group work"}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-3 py-2 font-medium">Close</td>
                    <td className="px-3 py-2">{lessonPlan.conclusion}</td>
                    <td className="px-3 py-2 text-muted-foreground">2 min</td>
                    <td className="px-3 py-2 text-muted-foreground">Written record</td>
                  </tr>
                </tbody>
              </table>
            </div>
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

        {lessonPlanConfirmed && (
          <div className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-softer px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <p className="text-sm text-brand-ink">
              Confirmed and saved to{" "}
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
          <Button
            variant="outline"
            onClick={() => setDiscardOpen(true)}
            className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Discard
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={lessonPlanConfirmed} className="gap-2">
            <Sparkles className="size-4" />
            {lessonPlanConfirmed ? "Confirmed" : "Confirm and save"}
          </Button>
        </div>
      </footer>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm this lesson plan"
        description="You are about to store this daily lesson plan as your own teacher work product. It will appear in My Library and the lesson will be marked ready to teach."
        storedItems={[
          `Lesson plan "${lessonPlan.title}" for ${lessonPlan.date} (${lessonPlan.duration})`,
          `${lessonPlan.development.length} main learning activities, plus introduction, assessment and closure`,
          `Citations to ${citedEvidence.length} curriculum evidence items (KICD design page ${citedEvidence[0]?.page})`,
          "Your teacher notes, labelled as teacher input",
        ]}
        onConfirm={confirmLessonPlan}
      />

      <DiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        description="This lesson draft has unsaved work. Discarding resets every field and nothing will be recorded in your library."
        onConfirm={() => {
          updateLessonPlan(initialLessonPlan);
          router.push("/daily-lessons");
        }}
      />

      <SourceDrawer item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}
