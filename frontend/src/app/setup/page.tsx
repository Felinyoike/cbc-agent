"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Compass,
  GraduationCap,
  Info,
  Loader2,
  RotateCw,
  Sprout,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatContext, useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { academicYears, classes, terms } from "@/data/mockData";
import { getCurriculumOptions, subjectsForGrade, type CurriculumOptions } from "@/lib/api";

export default function SetupPage() {
  const context = useTeachingContext();
  // The form seeds its draft from the teaching context once, on mount -- so it
  // must not mount until the saved context has been read from storage, or it
  // shows the built-in defaults instead of what the teacher chose last time.
  if (!context.isLoaded) {
    return <div className="min-h-dvh w-full bg-canvas-warm" />;
  }
  return <SetupForm />;
}

function SetupForm() {
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

  // Grade and subject come from the curriculum that is actually ingested, so a
  // teacher can never pick a combination with nothing behind it.
  const [options, setOptions] = useState<CurriculumOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getCurriculumOptions(controller.signal)
      .then((fetched) => {
        setOptions(fetched);
        setOptionsFailed(false);
        // A saved context may name a grade or subject with no data (from an
        // older list, or a design since removed): move it to one that exists.
        setDraft((d) => {
          const grade = fetched.grades.includes(d.grade) ? d.grade : fetched.grades[0] ?? "";
          const available = subjectsForGrade(fetched, grade);
          return { ...d, grade, subject: available.includes(d.subject) ? d.subject : available[0] ?? "" };
        });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setOptionsFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const gradeOptions = options?.grades ?? [];
  const subjectOptions = options ? subjectsForGrade(options, draft.grade) : [];
  const optionsReady = options !== null && Boolean(draft.grade) && Boolean(draft.subject);

  const handleGradeChange = (grade: string) => {
    setDraft((d) => {
      const available = options ? subjectsForGrade(options, grade) : [];
      return { ...d, grade, subject: available.includes(d.subject) ? d.subject : available[0] ?? "" };
    });
  };

  const isReturning = context.isConfigured;
  const changesScope = isReturning && (draft.grade !== context.grade || draft.subject !== context.subject);
  const hasWork = selectedEvidence.length > 0 || draftCount > 0;

  const handleContinue = () => {
    context.setContext(draft, { markConfigured: true });
    // Each context keeps its own evidence and drafts, so nothing is lost — but
    // say where the previous context's work went, since this one starts empty.
    setContextWarning(
      changesScope && hasWork
        ? `You are now working in ${draft.grade} · ${draft.subject}, which has its own workspace. The evidence and drafts you collected under ${context.grade} · ${context.subject} are kept with that context and come back when you switch to it.`
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
              <Select value={options ? draft.grade : ""} onValueChange={handleGradeChange} disabled={!options}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder={options ? "Select grade" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={<BookOpen className="size-4 text-brand" />} label="Subject / Learning Area">
              <Select
                value={options ? draft.subject : ""}
                onValueChange={(subject) => setDraft((d) => ({ ...d, subject }))}
                disabled={!options}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder={options ? "Select subject" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((subject) => (
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

          {optionsFailed ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-draft-border bg-draft-surface p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-draft-strong" />
              <div className="flex flex-1 flex-col items-start gap-2">
                <p className="text-xs leading-relaxed text-draft-text">
                  Could not load the list of available grades and subjects. Check that the backend is running,
                  then try again.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAttempt((n) => n + 1)}>
                  <RotateCw className="size-3.5" />
                  Try again
                </Button>
              </div>
            </div>
          ) : !options ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-info-border bg-info-soft p-4">
              <Loader2 className="size-4 shrink-0 animate-spin text-info" />
              <p className="text-xs leading-relaxed text-info-ink">Loading the grades and subjects with curriculum data…</p>
            </div>
          ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-info-border bg-info-soft p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="text-xs leading-relaxed text-info-ink">
              You are setting up{" "}
              <span className="font-medium text-neutral-800">{formatContext(draft)}</span>. Curriculum
              evidence and drafts across the workspace will be filtered to this context. Only grades and
              subjects with KICD curriculum designs loaded are listed.
            </p>
          </div>
          )}

          {changesScope && hasWork && (
            <div className="flex items-start gap-2.5 rounded-lg border border-draft-border bg-draft-surface p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-draft-strong" />
              <p className="text-xs leading-relaxed text-draft-text">
                Each grade and subject has its own workspace. Your current evidence and drafts stay with{" "}
                {context.grade} · {context.subject}, and the context you are switching to starts with its own.
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
              disabled={!optionsReady}
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
