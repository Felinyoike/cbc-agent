"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FileEdit,
  FileText,
  Info,
  Layers,
  PencilLine,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraftBadge } from "@/components/Provenance";
import { formatContext, useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { teacher } from "@/data/mockData";

const actionCards = [
  {
    href: "/curriculum",
    title: "Explore curriculum",
    description: "Search KICD-aligned strands, outcomes, and learning experiences.",
    cta: "Open explorer",
    icon: BookOpen,
    tone: "brand" as const,
  },
  {
    href: "/term-plans",
    title: "Prepare term plan",
    description: "Build a termly scheme of work from selected evidence.",
    cta: "Start planning",
    icon: FileText,
    tone: "ai" as const,
  },
  {
    href: "/daily-lessons/plan",
    title: "Prepare today's lesson",
    description: "Draft a daily lesson plan from a term-plan row.",
    cta: "Plan lesson",
    icon: CalendarCheck,
    tone: "brand" as const,
  },
];

const recentCurriculum = [
  {
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    meta: "Grade 5 Agriculture · KICD design · Page 13",
    tone: "brand" as const,
  },
  {
    strand: "Food Production Processes",
    subStrand: "Crop Farming Practices",
    meta: "Grade 5 Agriculture · KICD design · Page 15",
    tone: "brand" as const,
  },
  {
    strand: "Numbers",
    subStrand: "Whole Numbers (Mathematics)",
    meta: "Grade 5 Mathematics · KICD design · Page 8",
    tone: "ai" as const,
  },
];

export default function DashboardPage() {
  const context = useTeachingContext();
  const { termPlanRows, pendingReflections, pendingReflectionCount, lessons } = useWorkspace();

  const reviewedRows = termPlanRows.filter((row) => row.status !== "draft").length;
  const reviewedPercent = termPlanRows.length
    ? Math.round((reviewedRows / termPlanRows.length) * 100)
    : 0;
  const draftedLessons = lessons.filter((lesson) => lesson.status !== "reflected").length;
  /* Real data from the reflections API: confirmed lesson plans still awaiting a confirmed reflection. */
  const nextReflection = pendingReflections[0];
  const reflectionCount = pendingReflectionCount ?? 0;

  return (
    <main className="flex flex-1 flex-col gap-8 overflow-y-auto bg-canvas p-4 md:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Welcome back, {teacher.name.replace("Ms. A. ", "Ms. ")}
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re working on{" "}
            <span className="font-medium text-neutral-950">
              {formatContext(context, { withYear: false })}
            </span>
            . Here&apos;s what needs your attention.
          </p>
        </div>
        <Button variant="outline" className="shrink-0 gap-2" asChild>
          <Link href="/setup">
            <Settings2 className="size-4" />
            Change context
          </Link>
        </Button>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {actionCards.map(({ href, title, description, cta, icon: Icon, tone }) => (
          <Card
            key={href}
            className="gap-4 p-6 transition-shadow hover:shadow-md focus-within:shadow-md"
          >
            <CardHeader className="gap-3 p-0">
              <div
                className={`flex size-11 items-center justify-center rounded-xl ${
                  tone === "brand" ? "bg-brand-soft" : "bg-ai-soft"
                }`}
              >
                <Icon className={`size-[22px] ${tone === "brand" ? "text-brand-strong" : "text-ai"}`} />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="gap-3 p-0">
              <p className="text-sm leading-snug text-muted-foreground">{description}</p>
              <Button
                variant="ghost"
                asChild
                className={`h-auto self-start gap-1.5 px-0 hover:bg-transparent ${
                  tone === "brand" ? "text-brand-strong" : "text-ai"
                }`}
              >
                <Link href={href}>
                  {cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      {reflectionCount > 0 && (
        <section>
          <Card className="gap-4 border-draft-border bg-draft-surface p-6">
            <CardContent className="flex flex-col items-start gap-5 p-0 md:flex-row md:items-center">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-draft-soft">
                <ClipboardCheck className="size-6 text-draft-strong" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-neutral-950">Reflect on a lesson</h3>
                  <span className="rounded-full bg-draft-soft px-2 py-0.5 text-xs font-medium text-draft-ink">
                    Action needed
                  </span>
                </div>
                <p className="text-sm leading-snug text-draft-text">
                  {reflectionCount} confirmed {reflectionCount === 1 ? "lesson plan is" : "lesson plans are"}{" "}
                  awaiting your post-lesson evidence. Record outcomes based on what learners said or did.
                </p>
              </div>
              <Button asChild className="shrink-0 gap-2 bg-draft-strong text-white hover:bg-draft-strong/90">
                <Link href="/reflections">
                  <PencilLine className="size-4" />
                  Reflect now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="flex flex-col gap-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-950">Continue working</h2>
            <span className="text-sm text-muted-foreground">Unfinished items</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="gap-3 p-5">
              <CardHeader className="gap-2 p-0">
                <div className="flex items-center justify-between">
                  <DraftBadge>Draft scheme</DraftBadge>
                  <span className="text-xs text-muted-foreground">Edited 2h ago</span>
                </div>
                <CardTitle className="text-sm leading-snug">
                  Food Production Processes — {context.term} scheme
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-3 p-0">
                <p className="text-xs text-muted-foreground">
                  {reviewedRows} of {termPlanRows.length} planning units reviewed · Not yet confirmed
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-draft transition-all"
                    style={{ width: `${reviewedPercent}%` }}
                  />
                </div>
                <Button variant="outline" size="sm" asChild className="mt-1 gap-1.5 self-start">
                  <Link href="/term-plans">
                    Resume draft
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="gap-3 p-5">
              <CardHeader className="gap-2 p-0">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-text">
                    <CalendarClock className="size-3" />
                    Awaiting reflection
                  </span>
                  {nextReflection && (
                    <span className="text-xs text-muted-foreground">
                      {nextReflection.status === "draft"
                        ? "Reflection draft"
                        : nextReflection.lessonDate
                          ? `Lesson date ${formatDate(nextReflection.lessonDate)}`
                          : ""}
                    </span>
                  )}
                </div>
                <CardTitle className="text-sm leading-snug">
                  {nextReflection?.lessonTitle ??
                    (pendingReflectionCount === null
                      ? "Reflections could not be loaded"
                      : "No lesson awaiting reflection")}
                </CardTitle>
              </CardHeader>
              <CardContent className="gap-3 p-0">
                <p className="text-xs text-muted-foreground">
                  Record post-lesson evidence to set outcome status.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-1 gap-1.5 self-start">
                  <Link href="/reflections">
                    Add reflection
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-950">Recent curriculum</h2>
            <Button variant="ghost" size="sm" asChild className="h-auto gap-1 px-0 text-muted-foreground">
              <Link href="/curriculum">View all</Link>
            </Button>
          </div>

          <Card className="gap-0 p-2">
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {recentCurriculum.map((item) => (
                <Link
                  key={`${item.strand}-${item.subStrand}`}
                  href="/curriculum"
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-neutral-50"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      item.tone === "brand" ? "bg-brand-softer" : "bg-ai-softer"
                    }`}
                  >
                    <Layers
                      className={`size-4 ${item.tone === "brand" ? "text-brand" : "text-ai-strong"}`}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-neutral-950">
                      {item.strand} <span className="font-normal text-muted-foreground">›</span>{" "}
                      {item.subStrand}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.meta}</span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-950">Progress summary</h2>
          <Card className="gap-4 p-6">
            <CardContent className="gap-4 p-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-950">Term plan reviewed</span>
                <span className="text-2xl font-semibold text-brand-strong">{reviewedPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${reviewedPercent}%` }}
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-neutral-100/60 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-snug text-muted-foreground">
                  This shows your <span className="font-medium text-neutral-950">planning workflow progress</span>{" "}
                  — not learner achievement. Outcome status is set from post-lesson evidence.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <SummaryRow label="Weeks planned" value={`${termPlanRows.length} / 10`} />
                <SummaryRow label="Lessons drafted" value={String(draftedLessons)} />
                <SummaryRow
                  label="Reflections pending"
                  value={pendingReflectionCount === null ? "—" : String(pendingReflectionCount)}
                  emphasis={reflectionCount > 0}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex h-24 items-center gap-3 bg-gradient-to-br from-brand-soft to-brand-softer px-5">
              <FileEdit className="size-6 text-brand-strong" />
              <span className="text-sm font-semibold text-brand-ink">Cite your evidence</span>
            </div>
            <CardContent className="gap-1.5 p-4">
              <span className="text-sm font-semibold text-neutral-950">Tip</span>
              <p className="text-xs leading-snug text-muted-foreground">
                Every draft links back to the KICD design page it came from. Review before confirming.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasis ? "font-medium text-draft-strong" : "font-medium text-neutral-950"}>
        {value}
      </span>
    </div>
  );
}
