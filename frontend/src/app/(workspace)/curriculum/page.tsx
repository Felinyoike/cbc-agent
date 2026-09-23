"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookMarked,
  Boxes,
  Check,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileSearch,
  GitBranch,
  Globe2,
  GraduationCap,
  Heart,
  HelpCircle,
  Inbox,
  Info,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SourceDrawer } from "@/components/SourceDrawer";
import { SourceTag } from "@/components/Provenance";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTeachingContext } from "@/context/TeachingContext";
import {
  contentCategories,
  terms,
  type ContentCategory,
  type EvidenceItem,
} from "@/data/mockData";
import {
  CurriculumApiError,
  getCurriculumOptions,
  searchCurriculum,
  type CurriculumOptions,
} from "@/lib/api";

const categoryIcons: Record<ContentCategory, typeof Target> = {
  "Specific Learning Outcomes": Target,
  "Suggested Learning Experiences": Activity,
  "Key Inquiry Questions": HelpCircle,
  "Core Competencies": Compass,
  Values: Heart,
  "Pertinent and Contemporary Issues": Globe2,
  Resources: Boxes,
  Assessment: ClipboardCheck,
};

const ALL_TYPES = "All content types";

// Why results could not be loaded. Each needs different advice: an unreachable
// backend is an ops problem, while a failed semantic search (the backend returns
// 502 when the Gemini embedding call fails) still leaves filter browsing usable.
type SearchFailure = "unreachable" | "semantic" | "server";

function classifyFailure(error: unknown): SearchFailure {
  if (!(error instanceof CurriculumApiError)) return "unreachable";
  return error.status === 502 ? "semantic" : "server";
}
const ALL_THEMES = "All themes";
const ALL_STRANDS = "All strands";
const ALL_SUB_STRANDS = "All sub-strands";

// Strand and sub-strand choices depend on grade as well as subject -- a Grade 4
// strand often has no data under Grade 5 -- so both lookups are grade-scoped.
function strandsFor(options: CurriculumOptions | null, grade: string, subject: string): string[] {
  return options?.strandsByGradeSubject[`${grade}|${subject}`] ?? [];
}

function subStrandsFor(
  options: CurriculumOptions | null,
  grade: string,
  subject: string,
  strand: string
): string[] {
  return options?.subStrandsByGradeSubjectStrand[`${grade}|${subject}|${strand}`] ?? [];
}

// English and Indigenous Languages add a Theme level above the strand. For them
// the strand list is scoped to the chosen theme ("1.1 Listening and Speaking" ...
// "1.4 Writing") instead of every theme's strands at once. Empty for other subjects.
function themesFor(options: CurriculumOptions | null, grade: string, subject: string): string[] {
  return options?.themesByGradeSubject[`${grade}|${subject}`] ?? [];
}

function strandsIn(options: CurriculumOptions | null, grade: string, subject: string, theme: string): string[] {
  return themesFor(options, grade, subject).length && theme !== ALL_THEMES
    ? options?.strandsByGradeSubjectTheme[`${grade}|${subject}|${theme}`] ?? []
    : strandsFor(options, grade, subject);
}

/** The selection to land on after the grade, subject or theme changes. */
function firstSelection(options: CurriculumOptions | null, grade: string, subject: string, theme?: string) {
  const nextTheme = theme ?? themesFor(options, grade, subject)[0] ?? "";
  const strand = strandsIn(options, grade, subject, nextTheme)[0] ?? "";
  return { theme: nextTheme, strand, subStrand: subStrandsFor(options, grade, subject, strand)[0] ?? "" };
}

export default function CurriculumPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-canvas p-8 text-sm text-muted-foreground">Loading…</div>}>
      <CurriculumExplorer />
    </Suspense>
  );
}

function CurriculumExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = useTeachingContext();
  const { selectedEvidence, toggleEvidence, addEvidence, removeEvidence, clearEvidence, isSelected } =
    useWorkspace();

  // Filter options come from ChromaDB, so the dropdowns can only ever offer
  // grade/subject/strand combinations that have real ingested data behind them.
  const [options, setOptions] = useState<CurriculumOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);

  const [grade, setGrade] = useState(context.grade);
  const [subject, setSubject] = useState(context.subject);
  const [term, setTerm] = useState(context.term);
  const [theme, setTheme] = useState("");
  const [strand, setStrand] = useState("");
  const [subStrand, setSubStrand] = useState("");
  const [contentType, setContentType] = useState<string>(ALL_TYPES);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get("q") ?? "");
  const [sourceItem, setSourceItem] = useState<EvidenceItem | null>(null);

  const [results, setResults] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFailure, setSearchFailure] = useState<SearchFailure | null>(null);

  const applySelection = (selection: { theme: string; strand: string; subStrand: string }) => {
    setTheme(selection.theme);
    setStrand(selection.strand);
    setSubStrand(selection.subStrand);
  };

  // Evidence can be browsed for any grade or subject, but only selected for the
  // teaching context's own: the workspace (and its scheme) belongs to that context.
  const outsideContext = grade !== context.grade || subject !== context.subject;

  const themeOptions = themesFor(options, grade, subject);
  const hasThemes = themeOptions.length > 0;
  const strandOptions = [ALL_STRANDS, ...strandsIn(options, grade, subject, theme)];
  const subStrandOptions =
    strand === ALL_STRANDS ? [] : [ALL_SUB_STRANDS, ...subStrandsFor(options, grade, subject, strand)];

  useEffect(() => {
    const controller = new AbortController();
    getCurriculumOptions(controller.signal)
      .then((fetched) => {
        setOptions(fetched);
        // The teaching context may name a grade/subject with no ingested data --
        // fall back to something actually searchable rather than showing nothing.
        const nextGrade = fetched.grades.includes(context.grade) ? context.grade : fetched.grades[0] ?? "";
        const nextSubject = fetched.subjects.includes(context.subject)
          ? context.subject
          : fetched.subjects[0] ?? "";
        setGrade(nextGrade);
        setSubject(nextSubject);
        applySelection(firstSelection(fetched, nextGrade, nextSubject));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setOptionsFailed(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [context.grade, context.subject]);

  useEffect(() => {
    if (!options) return;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setSearchFailure(null);
      try {
        const response = await searchCurriculum({
          grade,
          subject,
          theme: hasThemes && theme !== ALL_THEMES ? theme : undefined,
          strand: strand === ALL_STRANDS ? undefined : strand,
          subStrand: strand === ALL_STRANDS || subStrand === ALL_SUB_STRANDS ? undefined : subStrand,
          contentType: contentType === ALL_TYPES ? undefined : contentType,
          query: submittedQuery || undefined,
          signal: controller.signal,
        });
        setResults(response.results);
      } catch (error) {
        // A superseded request aborts on cleanup -- leave the newer one's state alone.
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchFailure(classifyFailure(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void run();

    return () => controller.abort();
  }, [options, grade, subject, hasThemes, theme, strand, subStrand, contentType, submittedQuery]);

  const handleGradeChange = useCallback(
    (next: string) => {
      setGrade(next);
      applySelection(firstSelection(options, next, subject));
    },
    [options, subject]
  );

  const handleSubjectChange = useCallback(
    (next: string) => {
      setSubject(next);
      applySelection(firstSelection(options, grade, next));
    },
    [options, grade]
  );

  const handleThemeChange = useCallback(
    (next: string) => {
      if (next === ALL_THEMES) {
        applySelection({ theme: next, strand: ALL_STRANDS, subStrand: ALL_SUB_STRANDS });
      } else {
        applySelection(firstSelection(options, grade, subject, next));
      }
    },
    [options, grade, subject]
  );

  const handleStrandChange = useCallback(
    (next: string) => {
      setStrand(next);
      setSubStrand(
        next === ALL_STRANDS ? ALL_SUB_STRANDS : subStrandsFor(options, grade, subject, next)[0] ?? ""
      );
    },
    [options, grade, subject]
  );

  return (
    <div className="flex min-h-0 flex-1">
      <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto bg-canvas p-4 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Curriculum Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Search and review KICD-aligned curriculum evidence, then add it to your planning workspace.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip icon={<GraduationCap className="size-3.5 text-muted-foreground" />} value={grade} onChange={handleGradeChange} options={options?.grades ?? []} label="Grade" />
            <FilterChip icon={<Layers className="size-3.5 text-muted-foreground" />} value={subject} onChange={handleSubjectChange} options={options?.subjects ?? []} label="Subject" />
            <FilterChip icon={<Tag className="size-3.5 text-muted-foreground" />} value={term} onChange={setTerm} options={terms} label="Term" />
            {hasThemes && (
              <FilterChip icon={<BookMarked className="size-3.5 text-muted-foreground" />} value={theme} onChange={handleThemeChange} options={[ALL_THEMES, ...themeOptions]} label="Theme" />
            )}
            <FilterChip icon={<Layers className="size-3.5 text-muted-foreground" />} value={strand} onChange={handleStrandChange} options={strandOptions} label="Strand" />
            <FilterChip icon={<GitBranch className="size-3.5 text-muted-foreground" />} value={subStrand} onChange={setSubStrand} options={subStrandOptions} label="Sub-strand" />
            <FilterChip
              icon={<Tag className="size-3.5 text-muted-foreground" />}
              value={contentType}
              onChange={setContentType}
              options={[ALL_TYPES, ...contentCategories]}
              label="Content type"
            />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedQuery(query);
              router.replace(query.trim() ? `/curriculum?q=${encodeURIComponent(query.trim())}` : "/curriculum");
            }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search curriculum evidence"
              className="h-12 rounded-xl pl-12 pr-28"
              placeholder="What are the learning outcomes and suggested experiences for soil conservation?"
            />
            <Button type="submit" className="absolute right-2 top-1/2 h-8 -translate-y-1/2 gap-1.5">
              <Sparkles className="size-4" />
              Search
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {grade} · {subject} ·
            </span>
            {hasThemes && theme !== ALL_THEMES && (
              <>
                <span className="font-medium">{theme}</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </>
            )}
            <span className="font-medium">{strand}</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{subStrand}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {loading
              ? "Searching…"
              : `${results.length} evidence ${results.length === 1 ? "result" : "results"}`}
          </span>
        </div>

        {outsideContext && !loading && (
          <div className="flex items-start gap-3 rounded-lg border border-info-border bg-info-soft px-4 py-3">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="text-sm text-info-ink">
              You are browsing {grade} · {subject}, but your teaching context is {context.grade} ·{" "}
              {context.subject}. You can read this evidence, but only add evidence from your teaching context.{" "}
              <Link href="/setup" className="font-medium underline underline-offset-2">
                Change teaching context
              </Link>{" "}
              to plan with it.
            </p>
          </div>
        )}

        {loading ? (
          <LoadingResults />
        ) : results.length === 0 ? (
          <EmptyResults
            failure={optionsFailed ? "unreachable" : searchFailure}
            onReset={() => { setContentType(ALL_TYPES); setQuery(""); setSubmittedQuery(""); }}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map((item) => {
              const Icon = categoryIcons[item.category];
              const selected = isSelected(item.id);
              return (
                <Card
                  key={item.id}
                  className={`gap-3 p-5 transition-colors ${
                    selected ? "border-brand-border bg-brand-softer/40" : ""
                  } ${item.category === "Assessment" ? "xl:col-span-2" : ""}`}
                >
                  <CardHeader className="gap-2 p-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleEvidence(item)}
                          disabled={outsideContext && !selected}
                          aria-label={`Select ${item.category}`}
                        />
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          <Icon className="size-3" />
                          {item.category}
                        </span>
                      </div>
                      <SourceTag page={item.page} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.theme ? `${item.theme} › ` : ""}
                      {item.strand} › {item.subStrand}
                    </span>
                  </CardHeader>

                  <CardContent className="gap-2 p-0">
                    <p className="text-sm leading-relaxed text-neutral-800">{item.content}</p>
                  </CardContent>

                  <CardFooter className="justify-between gap-2 p-0 pt-1">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSourceItem(item)}
                      className="h-7 gap-1 px-0 text-sm"
                    >
                      <FileSearch className="size-3.5" />
                      View source
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addEvidence(item)}
                      disabled={selected || outsideContext}
                      title={outsideContext ? `Only ${context.grade} · ${context.subject} evidence can be added` : undefined}
                      className="h-8 gap-1.5"
                    >
                      {selected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      {selected ? "Added" : outsideContext ? "Other context" : "Add to planning"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-neutral-50 xl:flex">
        <div className="flex flex-col gap-1 border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Inbox className="size-4" />
              Selected evidence
            </h2>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {selectedEvidence.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Curriculum items you will carry into your term or lesson plan.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {selectedEvidence.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                <Inbox className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No evidence selected yet</p>
              <p className="text-xs text-muted-foreground">
                Tick a card or use &ldquo;Add to planning&rdquo; to collect curriculum evidence here.
              </p>
            </div>
          ) : (
            selectedEvidence.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1.5 rounded-lg border border-border bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">{item.category}</span>
                  <button
                    type="button"
                    onClick={() => removeEvidence(item.id)}
                    aria-label={`Remove ${item.category}`}
                    className="shrink-0 text-muted-foreground hover:text-neutral-900"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <SourceTag page={item.page} />
                <span className="text-xs text-muted-foreground">
                  {item.grade} · {item.subject} · {item.subStrand}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-4">
          <p className="text-center text-xs text-muted-foreground">
            {selectedEvidence.length} {selectedEvidence.length === 1 ? "item" : "items"} ready to add to a plan
          </p>
          <Button
            className="w-full gap-2"
            disabled={selectedEvidence.length === 0}
            onClick={() => router.push("/term-plans?from=evidence")}
          >
            <ArrowRight className="size-4" />
            Use selected evidence
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearEvidence}
            disabled={selectedEvidence.length === 0}
            className="w-full text-muted-foreground"
          >
            Clear selection
          </Button>
        </div>
      </aside>

      {/* Mobile: selected evidence collapses into a bottom bar */}
      {selectedEvidence.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-20 flex items-center gap-3 border-t border-border bg-white p-3 shadow-lg xl:hidden">
          <span className="text-sm">
            <span className="font-semibold">{selectedEvidence.length}</span> selected
          </span>
          <Button size="sm" className="ml-auto gap-1.5" onClick={() => router.push("/term-plans?from=evidence")}>
            Use evidence
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}

      <SourceDrawer item={sourceItem} onClose={() => setSourceItem(null)} />
    </div>
  );
}

function FilterChip({
  icon,
  value,
  onChange,
  options,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
}) {
  if (options.length === 0) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 w-auto gap-2 rounded-full text-sm">
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LoadingResults() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
        <Search className="size-5 animate-pulse text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Searching curriculum designs…</p>
    </div>
  );
}

const emptyStateCopy: Record<SearchFailure | "none", { title: string; body: string }> = {
  none: {
    title: "No curriculum evidence matches these filters",
    body: "Not every sub-strand carries every content type. Try widening the content type or clearing the search.",
  },
  semantic: {
    title: "Semantic search failed",
    body: "The search service couldn\u2019t interpret your question right now. Clear the search to keep browsing by filters, or try again shortly.",
  },
  server: {
    title: "The curriculum service returned an error",
    body: "Try again in a moment. If it keeps happening, check the backend logs.",
  },
  unreachable: {
    title: "Could not reach the curriculum service",
    body: "Check that the backend is running on the port set in NEXT_PUBLIC_API_URL, then try again.",
  },
};

function EmptyResults({ failure, onReset }: { failure?: SearchFailure | null; onReset: () => void }) {
  const copy = emptyStateCopy[failure ?? "none"];
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
        <Search className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{copy.title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{copy.body}</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Reset search and content type
      </Button>
    </div>
  );
}
