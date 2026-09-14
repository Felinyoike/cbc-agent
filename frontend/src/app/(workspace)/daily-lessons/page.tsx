"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import type { Lesson, LessonStatus } from "@/data/mockData";

const ALL = "All";

const statusLabels: Record<LessonStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  taught: "Taught",
  "awaiting-reflection": "Awaiting reflection",
  reflected: "Reflected",
};

/** Amber for anything still needing the teacher; green once it is settled. */
const statusStyles: Record<LessonStatus, string> = {
  draft: "bg-draft-soft text-draft-ink",
  ready: "bg-brand-soft text-brand-text",
  taught: "bg-ai-soft text-ai",
  "awaiting-reflection": "bg-draft-soft text-draft-ink",
  reflected: "bg-brand-soft text-brand-text",
};

export default function DailyLessonsPage() {
  const context = useTeachingContext();
  const { lessons, termPlanRows } = useWorkspace();

  const [week, setWeek] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const weeks = useMemo(() => [ALL, ...Array.from(new Set(lessons.map((lesson) => lesson.week)))], [lessons]);

  const filtered = useMemo(
    () =>
      lessons.filter((lesson) => {
        if (week !== ALL && lesson.week !== week) return false;
        if (status !== ALL && statusLabels[lesson.status] !== status) return false;
        return true;
      }),
    [lessons, week, status]
  );

  return (
    <main className="flex flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Daily Lessons</h1>
          <p className="text-sm text-muted-foreground">
            Lessons drawn from your {context.term} term plan for {context.grade} {context.subject} ·{" "}
            {context.className}.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/daily-lessons/plan">
            <Plus className="size-4" />
            Plan new lesson
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger aria-label="Filter by week" className="h-9 w-auto gap-2 rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((option) => (
              <SelectItem key={option} value={option}>
                {option === ALL ? "All weeks" : `Week ${option}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="h-9 w-auto gap-2 rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[ALL, ...Object.values(statusLabels)].map((option) => (
              <SelectItem key={option} value={option}>
                {option === ALL ? "All statuses" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {lessons.length} lessons · {termPlanRows.length} planning rows
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
            <CalendarDays className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No lessons match these filters</p>
          <Button variant="outline" size="sm" onClick={() => { setWeek(ALL); setStatus(ALL); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden gap-0 overflow-hidden p-0 lg:flex">
            <CardContent className="gap-0 p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-100 text-left">
                    {["Week", "Date", "Strand / Sub-strand", "Lesson title", "Status", ""].map((heading) => (
                      <th key={heading} scope="col" className="border-b border-border px-4 py-2.5 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lesson) => (
                    <tr key={lesson.id} className="border-b border-border last:border-b-0 hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium">{lesson.week}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(lesson.date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lesson.strand} › {lesson.subStrand}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-950">{lesson.title}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={lesson.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                          <Link href={lessonHref(lesson)}>
                            {lesson.status === "draft" ? "Plan lesson" : "Open lesson"}
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((lesson) => (
              <Card key={lesson.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Week {lesson.week} · {formatDate(lesson.date)}
                    </span>
                    <span className="text-sm font-medium text-neutral-950">{lesson.title}</span>
                  </div>
                  <StatusPill status={lesson.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {lesson.strand} › {lesson.subStrand}
                </p>
                <Button variant="outline" size="sm" asChild className="w-full gap-1.5">
                  <Link href={lessonHref(lesson)}>
                    {lesson.status === "draft" ? "Plan lesson" : "Open lesson"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function lessonHref(lesson: Lesson) {
  return lesson.status === "awaiting-reflection" ? "/reflections" : "/daily-lessons/plan";
}

function StatusPill({ status }: { status: LessonStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
