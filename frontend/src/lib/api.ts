import type { EvidenceItem, LessonPlanDraft, OutcomeStatus, TermPlanRow } from "@/data/mockData";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** A response from the curriculum API that was not OK. Network failures (backend
 *  down, CORS) never produce one of these -- fetch rejects with a TypeError instead. */
export class CurriculumApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail?: string
  ) {
    super(detail ? `Curriculum API error (${status}): ${detail}` : `Curriculum API error (${status})`);
    this.name = "CurriculumApiError";
  }
}

async function readDetail(response: Response): Promise<string | undefined> {
  try {
    const body = await response.json();
    return typeof body?.detail === "string" ? body.detail : undefined;
  } catch {
    return undefined;
  }
}

export interface CurriculumOptions {
  grades: string[];
  subjects: string[];
  strandsBySubject: Record<string, string[]>;
  subStrandsByStrand: Record<string, string[]>;
  /** Keyed `"<grade>|<subject>"`. Grade-scoped, so unlike `strandsBySubject` it
   *  never offers a strand that has no data under the selected grade. */
  strandsByGradeSubject: Record<string, string[]>;
  /** Keyed `"<grade>|<subject>|<strand>"`. */
  subStrandsByGradeSubjectStrand: Record<string, string[]>;
  /** Keyed `"<grade>|<subject>"`; present only for the theme-based language designs
   *  (English, Indigenous Languages), which go Theme -> Strand -> Sub-strand. */
  themesByGradeSubject: Record<string, string[]>;
  /** Keyed `"<grade>|<subject>|<theme>"`. */
  strandsByGradeSubjectTheme: Record<string, string[]>;
}

export interface SearchResponse {
  results: EvidenceItem[];
  total: number;
  /** Set when a `query` was sent but the backend could not embed it (no GEMINI_API_KEY),
   *  so the results are plain metadata matches rather than semantically ranked ones. */
  semanticUnavailable?: boolean;
}

export interface SearchParams {
  grade: string;
  subject: string;
  strand?: string;
  subStrand?: string;
  theme?: string;
  contentType?: string;
  query?: string;
  signal?: AbortSignal;
}

export async function searchCurriculum({
  grade,
  subject,
  strand,
  subStrand,
  theme,
  contentType,
  query,
  signal,
}: SearchParams): Promise<SearchResponse> {
  const response = await fetch(`${BASE_URL}/api/curriculum/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    // The API speaks snake_case; the EvidenceItem payload it returns is camelCase.
    body: JSON.stringify({
      grade,
      subject,
      strand: strand || undefined,
      sub_strand: subStrand || undefined,
      theme: theme || undefined,
      content_type: contentType || undefined,
      query: query || undefined,
    }),
  });

  if (!response.ok) {
    throw new CurriculumApiError(response.status, await readDetail(response));
  }
  return response.json();
}

/** Subjects with ingested curriculum for this grade (Arabic, say, exists only for Grade 4). */
export function subjectsForGrade(options: CurriculumOptions, grade: string): string[] {
  return options.subjects.filter((subject) => `${grade}|${subject}` in options.strandsByGradeSubject);
}

export async function getCurriculumOptions(signal?: AbortSignal): Promise<CurriculumOptions> {
  const response = await fetch(`${BASE_URL}/api/curriculum/options`, { signal });
  if (!response.ok) {
    throw new CurriculumApiError(response.status, await readDetail(response));
  }
  return response.json();
}

/** A teacher-readable reason for a failed planning/scheme request. */
export function describeApiError(error: unknown) {
  if (error instanceof CurriculumApiError) {
    return error.detail ?? `The planning service returned an error (${error.status}).`;
  }
  return "Could not reach the planning service. Check that the backend is running.";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new CurriculumApiError(response.status, await readDetail(response));
  }
  return response.json();
}

/** A generated row: content and pacing only. id, week and status stay frontend-assigned. */
export type GeneratedTermPlanRow = Pick<
  TermPlanRow,
  | "strand"
  | "subStrand"
  | "keyInquiryQuestion"
  | "outcomes"
  | "experiences"
  | "resources"
  | "assessment"
  | "evidenceIds"
  | "lessons"
>;

export function generateTermPlanRows(evidence: EvidenceItem[], grade: string, subject: string) {
  return requestJson<{ rows: GeneratedTermPlanRow[] }>("/api/generate/term-plan-rows", {
    method: "POST",
    body: JSON.stringify({ evidence, grade, subject }),
  });
}

/** Ask the planning assistant. Advisory text only -- the caller never writes it into a draft. */
export function askAssistant(prompt: string, grade: string, subject: string, evidence: EvidenceItem[]) {
  return requestJson<{ answer: string }>("/api/assistant/ask", {
    method: "POST",
    body: JSON.stringify({ prompt, grade, subject, evidence }),
  });
}

/** A confirmed scheme or lesson plan, as stored in Postgres. */
export interface LibraryEntry {
  id: string;
  type: "Scheme of Work" | "Lesson Plan";
  title: string;
  /** Null for a lesson plan that was never linked to a saved scheme. */
  grade: string | null;
  subject: string | null;
  term: number | null;
  year: number | null;
  updatedAt: string;
  /** Distinct evidence cited by a scheme's rows; null for lesson plans, which carry no evidence ids. */
  evidenceCount: number | null;
  /** Lesson plans only (null for schemes): how far the post-lesson reflection has got. */
  reflectionStatus: ReflectionStatus | null;
}

export function getLibrary(signal?: AbortSignal) {
  return requestJson<{ items: LibraryEntry[] }>("/api/library", { signal });
}

/** Plain URLs for `<a href>`: the API streams the .docx with a download filename. */
export function schemeDownloadUrl(id: string) {
  return `${BASE_URL}/api/schemes/${id}/download`;
}

export function lessonDownloadUrl(id: string) {
  return `${BASE_URL}/api/lessons/${id}/download`;
}

export interface Scheme {
  id: string;
  user_id: string;
  grade: string;
  subject: string;
  term: number;
  year: number;
  content: { rows: TermPlanRow[] };
  status: "draft" | "confirmed";
  created_at: string;
  updated_at: string;
}

export interface SchemeCreateInput {
  grade: string;
  subject: string;
  /** Teaching context strings such as "Term 1" / "2026"; the API stores integers. */
  term: string;
  year: string;
  rows: TermPlanRow[];
}

function leadingInteger(value: string) {
  return Number.parseInt(value.replace(/\D+/g, " ").trim().split(" ")[0] ?? "", 10);
}

export function createScheme({ grade, subject, term, year, rows }: SchemeCreateInput) {
  return requestJson<Scheme>("/api/schemes", {
    method: "POST",
    body: JSON.stringify({
      grade,
      subject,
      term: leadingInteger(term),
      year: leadingInteger(year),
      content: { rows },
    }),
  });
}

export function updateScheme(id: string, rows: TermPlanRow[]) {
  return requestJson<Scheme>(`/api/schemes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content: { rows } }),
  });
}

export function getScheme(id: string, signal?: AbortSignal) {
  return requestJson<Scheme>(`/api/schemes/${id}`, { signal });
}

export function confirmScheme(id: string) {
  return requestJson<Scheme>(`/api/schemes/${id}/confirm`, { method: "POST" });
}

/** The term-plan row fields a lesson is generated from, plus the teaching context. */
export type GenerateLessonInput = Pick<
  TermPlanRow,
  "strand" | "subStrand" | "lessons" | "keyInquiryQuestion" | "outcomes" | "experiences" | "resources" | "assessment"
> & { grade: string; subject: string };

export type GeneratedLessonPlan = Pick<
  LessonPlanDraft,
  "keyInquiryQuestion" | "outcomes" | "resources" | "introduction" | "development" | "assessmentActivity" | "conclusion"
>;

export function generateLessonPlan(input: GenerateLessonInput) {
  return requestJson<GeneratedLessonPlan>("/api/generate/lesson-plan", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface LessonRecord {
  id: string;
  scheme_id: string | null;
  user_id: string;
  lesson_date: string;
  strand: string;
  sub_strand: string;
  content: LessonPlanDraft;
  status: "draft" | "confirmed";
  created_at: string;
  /** Returned by GET /api/lessons/{id} only: the lesson's reflection, null until one is started. */
  reflection?: ReflectionRecordData | null;
}

export interface LessonCreateInput {
  schemeId: string | null;
  /** ISO date (yyyy-mm-dd); the column is required. */
  lessonDate: string;
  strand: string;
  subStrand: string;
  content: LessonPlanDraft;
}

export function createLesson({ schemeId, lessonDate, strand, subStrand, content }: LessonCreateInput) {
  return requestJson<LessonRecord>("/api/lessons", {
    method: "POST",
    body: JSON.stringify({ scheme_id: schemeId, lesson_date: lessonDate, strand, sub_strand: subStrand, content }),
  });
}

export function updateLesson(id: string, content: LessonPlanDraft) {
  return requestJson<LessonRecord>(`/api/lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content, lesson_date: content.date || undefined }),
  });
}

export function getLesson(id: string, signal?: AbortSignal) {
  return requestJson<LessonRecord>(`/api/lessons/${id}`, { signal });
}

export function confirmLesson(id: string) {
  return requestJson<LessonRecord>(`/api/lessons/${id}/confirm`, { method: "POST" });
}

/* Post-lesson reflections: one record per confirmed lesson plan. */

export interface ReflectionEvidence {
  learnerActions: string;
  workEvidence: string;
  needSupport: string;
  difficulties: string;
  revisit: string;
}

/** The questions a reflection answers, in order. The lesson plan's Word download
 *  prints the same wording (REFLECTION_QUESTIONS in backend/documents.py). */
export const REFLECTION_QUESTIONS: { key: keyof ReflectionEvidence; label: string }[] = [
  { key: "learnerActions", label: "What did learners say or do?" },
  { key: "workEvidence", label: "What learner work or assessment evidence is available?" },
  { key: "needSupport", label: "Which learners or groups need additional support?" },
  { key: "difficulties", label: "What difficulties were observed?" },
  { key: "revisit", label: "What should be revisited next lesson?" },
];

/** "not_started" means the confirmed lesson has no reflection record at all yet. */
export type ReflectionStatus = "not_started" | "draft" | "confirmed";

export interface ReflectionListItem {
  lessonId: string;
  lessonTitle: string;
  lessonDate: string;
  strand: string;
  subStrand: string;
  /** Null for a lesson plan that was never linked to a saved scheme. */
  grade: string | null;
  subject: string | null;
  reflectionId: string | null;
  status: ReflectionStatus;
  evidence: ReflectionEvidence | null;
  outcomeStatus: OutcomeStatus | null;
  agentSummary: string | null;
}

export interface ReflectionRecordData {
  id: string;
  lessonId: string;
  status: "draft" | "confirmed";
  evidence: ReflectionEvidence;
  outcomeStatus: OutcomeStatus | null;
  agentSummary: string | null;
  updatedAt: string;
}

export interface ReflectionContentInput {
  evidence: ReflectionEvidence;
  outcomeStatus: OutcomeStatus | null;
}

export function getReflections(signal?: AbortSignal) {
  return requestJson<{ items: ReflectionListItem[] }>("/api/reflections", { signal });
}

export function getReflectionByLesson(lessonId: string, signal?: AbortSignal) {
  return requestJson<{ reflection: ReflectionRecordData | null }>(`/api/reflections/by-lesson/${lessonId}`, { signal });
}

export function createReflection(lessonId: string, content: ReflectionContentInput, agentSummary?: string) {
  return requestJson<ReflectionRecordData>("/api/reflections", {
    method: "POST",
    body: JSON.stringify({ lesson_id: lessonId, content, agent_summary: agentSummary }),
  });
}

/** An omitted summary keeps the stored one. */
export function updateReflection(id: string, content: ReflectionContentInput, agentSummary?: string) {
  return requestJson<ReflectionRecordData>(`/api/reflections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content, agent_summary: agentSummary }),
  });
}

/** The server re-checks evidence and outcome status and rejects with 400 if either is missing. */
export function confirmReflectionRecord(id: string) {
  return requestJson<ReflectionRecordData>(`/api/reflections/${id}/confirm`, { method: "POST" });
}

export function generateReflectionSummary(evidence: ReflectionEvidence) {
  return requestJson<{ summary: string }>("/api/generate/reflection-summary", {
    method: "POST",
    body: JSON.stringify({ evidence }),
  });
}
