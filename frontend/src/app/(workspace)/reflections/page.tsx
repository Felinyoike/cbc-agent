"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmedBadge, DraftBadge } from "@/components/Provenance";
import { outcomeStatusLabels, type OutcomeStatus } from "@/data/mockData";
import { describeApiError, getReflections, type ReflectionListItem } from "@/lib/api";

const outcomeStyles: Record<OutcomeStatus, string> = {
  achieved: "bg-brand-soft text-brand-text",
  "partially-achieved": "bg-ai-soft text-ai",
  "not-yet-achieved": "bg-draft-soft text-draft-ink",
  "insufficient-evidence": "bg-neutral-100 text-neutral-700",
};

export default function ReflectionsPage() {
  const [items, setItems] = useState<ReflectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Which lessons need a reflection comes from confirmed lesson plans in Postgres. */
  useEffect(() => {
    const controller = new AbortController();
    getReflections(controller.signal)
      .then(({ items }) => setItems(items))
      .catch((err) => {
        if (!controller.signal.aborted) setError(describeApiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const pending = items.filter((item) => item.status !== "confirmed");
  const confirmed = items.filter((item) => item.status === "confirmed");

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Reflections</h1>
        <p className="text-sm text-muted-foreground">Post-lesson evidence for your confirmed lesson plans.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-soft p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p className="text-xs leading-relaxed text-info-ink">
          Outcome status is set from the evidence you record — a lesson being delivered is not by itself
          evidence that learners achieved the outcome.
        </p>
      </div>

      {loading ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your reflections…
        </div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">Could not load your reflections. {error}</p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-950">Awaiting your evidence</h2>
              <span className="text-sm text-muted-foreground">{pending.length} pending</span>
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-white py-12 text-center">
                <CheckCircle2 className="size-6 text-brand" />
                <p className="text-sm font-medium">No lessons are waiting for reflection</p>
                <p className="text-xs text-muted-foreground">
                  Lesson plans appear here once you confirm them in Daily Lessons.
                </p>
              </div>
            ) : (
              pending.map((item) => (
                <Card key={item.lessonId} className="gap-4 border-draft-border bg-draft-surface/60 p-5">
                  <CardContent className="flex flex-col items-start gap-4 p-0 md:flex-row md:items-center">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-draft-soft">
                      <ClipboardCheck className="size-5 text-draft-strong" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-950">{item.lessonTitle}</span>
                        <DraftBadge>{item.status === "draft" ? "Reflection draft" : "Awaiting evidence"}</DraftBadge>
                      </div>
                      <span className="text-xs text-draft-text">{lessonMeta(item)}</span>
                    </div>
                    <Button asChild className="w-full gap-2 md:w-auto">
                      <Link href={`/reflections/${item.lessonId}`}>
                        {item.status === "draft" ? "Continue reflection" : "Record evidence"}
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
              confirmed.map((item) => (
                <Card key={item.lessonId} className="gap-3 p-5">
                  <CardContent className="flex flex-col gap-3 p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-neutral-950">{item.lessonTitle}</span>
                      <div className="flex items-center gap-2">
                        {item.outcomeStatus && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeStyles[item.outcomeStatus]}`}>
                            {outcomeStatusLabels[item.outcomeStatus]}
                          </span>
                        )}
                        <ConfirmedBadge />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{lessonMeta(item)}</p>
                    {item.evidence?.learnerActions && (
                      <p className="text-sm leading-relaxed text-neutral-800">{item.evidence.learnerActions}</p>
                    )}
                    <Button variant="outline" size="sm" asChild className="w-fit gap-1.5">
                      <Link href={`/reflections/${item.lessonId}`}>
                        View record
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

function lessonMeta(item: ReflectionListItem) {
  return [
    item.lessonDate ? `Lesson date ${formatDate(item.lessonDate)}` : "",
    item.subStrand,
    [item.grade, item.subject].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
