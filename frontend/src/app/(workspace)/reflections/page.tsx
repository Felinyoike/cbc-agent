"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmedBadge, DraftBadge } from "@/components/Provenance";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { outcomeStatusLabels, type OutcomeStatus } from "@/data/mockData";

const outcomeStyles: Record<OutcomeStatus, string> = {
  achieved: "bg-brand-soft text-brand-text",
  "partially-achieved": "bg-ai-soft text-ai",
  "not-yet-achieved": "bg-draft-soft text-draft-ink",
  "insufficient-evidence": "bg-neutral-100 text-neutral-700",
};

export default function ReflectionsPage() {
  const context = useTeachingContext();
  const { reflections, pendingReflectionCount } = useWorkspace();

  const pending = reflections.filter((record) => record.status !== "confirmed");
  const confirmed = reflections.filter((record) => record.status === "confirmed");

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Reflections</h1>
        <p className="text-sm text-muted-foreground">
          Post-lesson evidence for {context.grade} {context.subject} · {context.term} · {context.className}.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-soft p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-xs leading-relaxed text-info-ink">
          Outcome status is set from the evidence you record — a lesson being delivered is not by itself
          evidence that learners achieved the outcome.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-950">Awaiting your evidence</h2>
          <span className="text-sm text-muted-foreground">
            {pendingReflectionCount} pending
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white py-12 text-center">
            <CheckCircle2 className="size-6 text-brand" />
            <p className="text-sm font-medium">No lessons are waiting for reflection</p>
            <p className="text-xs text-muted-foreground">
              Reflections appear here after a lesson&apos;s date has passed.
            </p>
          </div>
        ) : (
          pending.map((record) => (
            <Card key={record.id} className="gap-4 border-draft-border bg-draft-surface/60 p-5">
              <CardContent className="flex flex-col items-start gap-4 p-0 md:flex-row md:items-center">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-draft-soft">
                  <ClipboardCheck className="size-5 text-draft-strong" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-950">{record.lessonTitle}</span>
                    <DraftBadge>{record.status === "draft" ? "Reflection draft" : "Awaiting evidence"}</DraftBadge>
                  </div>
                  <span className="text-xs text-draft-text">Taught {formatDate(record.date)}</span>
                </div>
                <Button asChild className="w-full gap-2 md:w-auto">
                  <Link href={`/reflections/${record.id}`}>
                    Record evidence
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-950">Confirmed reflection records</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reflections confirmed yet.</p>
        ) : (
          confirmed.map((record) => (
            <Card key={record.id} className="gap-3 p-5">
              <CardContent className="flex flex-col gap-3 p-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-950">{record.lessonTitle}</span>
                  <div className="flex items-center gap-2">
                    {record.outcomeStatus && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeStyles[record.outcomeStatus]}`}
                      >
                        {outcomeStatusLabels[record.outcomeStatus]}
                      </span>
                    )}
                    <ConfirmedBadge />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Taught {formatDate(record.date)}</p>
                {record.evidence.learnerActions && (
                  <p className="text-sm leading-relaxed text-neutral-800">{record.evidence.learnerActions}</p>
                )}
                <Button variant="outline" size="sm" asChild className="w-fit gap-1.5">
                  <Link href={`/reflections/${record.id}`}>
                    View record
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
