"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardPen, Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiBadge, TeacherInputBadge } from "@/components/Provenance";
import { outcomeStatusLabels } from "@/data/mockData";
import { getReflectionByLesson, REFLECTION_QUESTIONS, type ReflectionRecordData } from "@/lib/api";

/** A confirmed lesson plan's post-lesson reflection, shown as part of the lesson.
 *  The reflection is written on its own page (/reflections/<lessonId>); once it is
 *  confirmed it appears here and in the lesson plan's Word download. */
export function LessonReflection({ lessonId }: { lessonId: string }) {
  const [reflection, setReflection] = useState<ReflectionRecordData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const controller = new AbortController();
    getReflectionByLesson(lessonId, controller.signal)
      .then((result) => {
        setReflection(result.reflection);
        setState("ready");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setState("failed");
      });
    return () => controller.abort();
  }, [lessonId]);

  const href = `/reflections/${lessonId}`;
  const confirmed = reflection?.status === "confirmed";

  return (
    <Card className="gap-4 p-6">
      <CardHeader className="gap-2 p-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">Reflection</CardTitle>
          {confirmed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">
              <CheckCircle2 className="size-3.5" />
              Reflection confirmed
            </span>
          ) : (
            <TeacherInputBadge />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          What happened when this lesson was taught. It becomes part of this lesson plan, and its Word download,
          once you confirm it.
        </p>
      </CardHeader>

      <CardContent className="gap-3 p-0">
        {state === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the reflection…
          </p>
        )}

        {state === "failed" && (
          <p className="text-sm text-muted-foreground">
            Could not load the reflection for this lesson. Check that the backend is running.
          </p>
        )}

        {state === "ready" && !reflection && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">No reflection yet. Add one after you teach this lesson.</p>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={href}>
                <NotebookPen className="size-3.5" />
                Add reflection
              </Link>
            </Button>
          </div>
        )}

        {state === "ready" && reflection && !confirmed && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-draft-border bg-draft-surface p-4">
            <p className="text-sm text-draft-ink">
              A reflection is in progress. It is added to this lesson plan when you confirm it.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={href}>
                <ClipboardPen className="size-3.5" />
                Continue reflection
              </Link>
            </Button>
          </div>
        )}

        {state === "ready" && reflection && confirmed && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-neutral-50 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outcome status</span>
              <p className="text-sm font-medium text-neutral-900">
                {reflection.outcomeStatus ? outcomeStatusLabels[reflection.outcomeStatus] : "Not recorded"}
              </p>
            </div>
            {REFLECTION_QUESTIONS.filter(({ key }) => reflection.evidence[key].trim()).map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1 rounded-lg border border-border bg-neutral-50 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800">
                  {reflection.evidence[key]}
                </p>
              </div>
            ))}
            {reflection.agentSummary?.trim() && (
              <div className="flex flex-col gap-2 rounded-lg border border-ai-border bg-ai-softer p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</span>
                  <AiBadge>AI-assisted</AiBadge>
                </div>
                <p className="text-sm leading-relaxed text-neutral-800">{reflection.agentSummary}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
