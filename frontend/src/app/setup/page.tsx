"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Compass,
  GraduationCap,
  Info,
  Sprout,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatContext, useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { academicYears, classes, grades, subjects, terms } from "@/data/mockData";

export default function SetupPage() {
  const router = useRouter();
  const context = useTeachingContext();
  const { setContextWarning, selectedEvidence, draftCount } = useWorkspace();

  const [draft, setDraft] = useState({
    grade: context.grade,
    subject: context.subject,
    term: context.term,
    year: context.year,
    className: context.className,
  });

  const isReturning = context.isConfigured;
  const changesScope = isReturning && (draft.grade !== context.grade || draft.subject !== context.subject);
  const hasWork = selectedEvidence.length > 0 || draftCount > 0;

  const handleContinue = () => {
    context.setContext(draft, { markConfigured: true });
    // Changing grade or subject invalidates evidence and drafts gathered under
    // the previous context — warn rather than silently discarding them.
    setContextWarning(
      changesScope && hasWork
        ? `You changed the teaching context to ${draft.grade} · ${draft.subject}. Curriculum evidence and drafts collected under the previous context may no longer apply — review them before confirming anything.`
        : null
    );
    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-canvas-warm p-6 md:p-12">
      <div className="absolute left-6 top-6 flex items-center gap-2.5 md:left-8 md:top-8">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-strong">
          <Sprout className="size-5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-neutral-900">CBC Teacher Workflow</span>
          <span className="text-xs text-muted-foreground">KICD-aligned workspace</span>
        </div>
      </div>

      <Card className="w-full max-w-2xl overflow-hidden bg-white shadow-sm">
        <div className="relative flex h-32 items-end bg-gradient-to-br from-brand-strong to-brand p-6 md:h-40">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-white/90">
              <Compass className="size-4 text-brand-strong" />
            </div>
            <span className="text-sm font-medium text-white">
              {isReturning ? "Change teaching context" : "First-time setup"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-8">
          <CardHeader className="gap-2 p-0">
            <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-900">
              Set your teaching context
            </CardTitle>
            <CardDescription className="leading-relaxed">
              This context controls the curriculum results and drafts shown throughout your workspace. You can
              adjust it at any time from the top context bar.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 p-0 sm:grid-cols-2">
            <Field icon={<GraduationCap className="size-4 text-brand" />} label="Grade">
              <Select value={draft.grade} onValueChange={(grade) => setDraft((d) => ({ ...d, grade }))}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={<BookOpen className="size-4 text-brand" />} label="Subject / Learning Area">
              <Select value={draft.subject} onValueChange={(subject) => setDraft((d) => ({ ...d, subject }))}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={<CalendarRange className="size-4 text-brand" />} label="Term">
              <Select value={draft.term} onValueChange={(term) => setDraft((d) => ({ ...d, term }))}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={<CalendarDays className="size-4 text-brand" />} label="Academic Year">
              <Select value={draft.year} onValueChange={(year) => setDraft((d) => ({ ...d, year }))}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Field icon={<Users className="size-4 text-brand" />} label="Class / Stream">
                <Select
                  value={draft.className}
                  onValueChange={(className) => setDraft((d) => ({ ...d, className }))}
                >
                  <SelectTrigger className="w-full rounded-lg">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>

          <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-soft p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="text-xs leading-relaxed text-info-ink">
              You are setting up{" "}
              <span className="font-medium text-neutral-800">{formatContext(draft)}</span>. Curriculum
              evidence and drafts across the workspace will be filtered to this context.
            </p>
          </div>

          {changesScope && hasWork && (
            <div className="flex items-start gap-2.5 rounded-lg border border-draft-border bg-draft-surface p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-draft-strong" />
              <p className="text-xs leading-relaxed text-draft-text">
                Changing grade or subject means the evidence and drafts you already collected may no longer
                apply. They will be kept, but flagged for review.
              </p>
            </div>
          )}

          <CardFooter className="flex flex-col-reverse justify-between gap-3 p-0 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              className="w-full font-medium text-neutral-600 sm:w-auto"
              onClick={() => {
                context.setContext(draft, { markConfigured: true });
                router.push("/dashboard");
              }}
            >
              {isReturning ? "Cancel" : "Change context later"}
            </Button>
            <Button
              onClick={handleContinue}
              className="w-full gap-2 rounded-lg px-6 sm:w-auto"
            >
              Continue to workspace
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
