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
import { evidenceItems, initialTermPlanRows, type EvidenceItem } from "@/data/mockData";

export default function TermPlanReviewPage() {
  const router = useRouter();
  const context = useTeachingContext();
  const { termPlanRows, confirmTermPlan, discardTermPlan, termPlanConfirmed } = useWorkspace();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [sourceItem, setSourceItem] = useState<EvidenceItem | null>(null);

  /* Evidence actually cited by the rows in this draft. */
  const citedEvidence = useMemo(() => {
    const ids = new Set(termPlanRows.flatMap((row) => row.evidenceIds));
    return evidenceItems.filter((item) => ids.has(item.id));
  }, [termPlanRows]);

  /* Rows whose text the teacher changed from the seeded draft. */
  const teacherEdits = useMemo(
    () =>
      termPlanRows.flatMap((row) => {
        const original = initialTermPlanRows.find((seed) => seed.id === row.id);
        if (!original) {
          return [{ rowId: row.id, week: row.week, field: "New planning row", value: row.outcomes }];
        }
        const changed: { rowId: string; week: string; field: string; value: string }[] = [];
        (["outcomes", "experiences", "resources", "assessment", "reflection"] as const).forEach((field) => {
          if (row[field] !== original[field] && row[field].trim()) {
            changed.push({ rowId: row.id, week: row.week, field, value: row[field] });
          }
        });
        return changed;
      }),
    [termPlanRows]
  );

  const fieldLabels: Record<string, string> = {
    outcomes: "Specific Learning Outcomes",
    experiences: "Suggested Learning Experiences",
    resources: "Resources",
    assessment: "Assessment",
    reflection: "Reflection / Remarks",
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" asChild className="h-auto w-fit gap-1.5 px-0 text-muted-foreground">
            <Link href="/term-plans">
              <ArrowLeft className="size-4" />
              Back to term plan workspace
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Draft review &amp; confirmation
            </h1>
            {termPlanConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">
                <CheckCircle2 className="size-3.5" />
                Confirmed
              </span>
            ) : (
              <DraftBadge>AI-assisted draft</DraftBadge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Term plan · {context.grade} · {context.subject} · {context.term} · {context.className}
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

        {/* 1. Curriculum evidence used */}
        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">1. Curriculum evidence used</CardTitle>
              <OfficialEvidenceBadge />
            </div>
            <p className="text-sm text-muted-foreground">
              Source pages and selected evidence this draft was built from.
            </p>
          </CardHeader>
          <CardContent className="gap-3 p-0">
            {citedEvidence.length === 0 && (
              <p className="text-sm text-muted-foreground">No curriculum evidence is cited by this draft yet.</p>
            )}
            {citedEvidence.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-softer/40 p-4"
              >
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

        {/* 2. AI-assisted organization */}
        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">2. AI-assisted organization</CardTitle>
              <AiBadge>AI generated</AiBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              How the assistant arranged the cited evidence into weekly planning units. Wording may differ from
              the source — check it against section 1.
            </p>
          </CardHeader>
          <CardContent className="gap-0 p-0">
            <div className="custom-scrollbar overflow-x-auto rounded-lg border border-ai-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ai-softer text-left">
                    {["Week", "Sub-strand", "Specific Learning Outcomes", "Suggested Learning Experiences", "Assessment"].map(
                      (heading) => (
                        <th key={heading} scope="col" className="border-b border-ai-border px-3 py-2 font-medium">
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="align-top">
                  {termPlanRows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 font-medium">{row.week}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.subStrand}</td>
                      <td className="px-3 py-2">{row.outcomes}</td>
                      <td className="px-3 py-2">{row.experiences}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.assessment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Teacher edits and notes */}
        <Card className="gap-4 p-6">
          <CardHeader className="gap-2 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">3. Teacher edits and notes</CardTitle>
              <TeacherInputBadge />
            </div>
            <p className="text-sm text-muted-foreground">Content you entered or changed yourself.</p>
          </CardHeader>
          <CardContent className="gap-3 p-0">
            {teacherEdits.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-4">
                <PenLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You have not edited this draft yet. Everything below section 2 is as the assistant organised
                  it — go back and adjust anything that does not fit your class.
                </p>
              </div>
            ) : (
              teacherEdits.map((edit, index) => (
                <div key={`${edit.rowId}-${edit.field}-${index}`} className="flex flex-col gap-1 rounded-lg border border-border bg-neutral-50 p-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Week {edit.week} · {fieldLabels[edit.field] ?? edit.field}
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-800">{edit.value}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {termPlanConfirmed && (
          <div className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-softer px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <p className="text-sm text-brand-ink">
              Confirmed and saved to{" "}
              <Link href="/library" className="font-medium underline underline-offset-2">
                My Library
              </Link>{" "}
              as your teacher work product.
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
            <Link href="/term-plans">
              <PenLine className="size-4" />
              Edit draft
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard")} className="gap-2">
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
          <Button onClick={() => setConfirmOpen(true)} disabled={termPlanConfirmed} className="gap-2">
            <Sparkles className="size-4" />
            {termPlanConfirmed ? "Confirmed" : "Confirm and save"}
          </Button>
        </div>
      </footer>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm this term plan"
        description="You are about to store this scheme of work as your own teacher work product. It will appear in My Library and can be revised later as a new version."
        storedItems={[
          `${termPlanRows.length} weekly planning ${termPlanRows.length === 1 ? "row" : "rows"} for ${context.grade} ${context.subject}, ${context.term}, ${context.className}`,
          `Citations to ${citedEvidence.length} curriculum evidence ${citedEvidence.length === 1 ? "item" : "items"} (KICD design ${citedEvidence.length ? `pages ${Array.from(new Set(citedEvidence.map((item) => item.page))).join(", ")}` : "—"})`,
          "Your edits and notes, labelled as teacher input",
          "A record that this draft was AI-assisted and reviewed by you",
        ]}
        onConfirm={confirmTermPlan}
      />

      <DiscardDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        description="This draft has unsaved work. Discarding resets the term plan to its starting state and nothing will be recorded in your library."
        onConfirm={() => {
          discardTermPlan();
          router.push("/dashboard");
        }}
      />

      <SourceDrawer item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}
