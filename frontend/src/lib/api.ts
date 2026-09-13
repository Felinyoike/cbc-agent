import type { EvidenceItem } from "@/data/mockData";

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
  contentType?: string;
  query?: string;
  signal?: AbortSignal;
}

export async function searchCurriculum({
  grade,
  subject,
  strand,
  subStrand,
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
      content_type: contentType || undefined,
      query: query || undefined,
    }),
  });

  if (!response.ok) {
    throw new CurriculumApiError(response.status, await readDetail(response));
  }
  return response.json();
}

export async function getCurriculumOptions(signal?: AbortSignal): Promise<CurriculumOptions> {
  const response = await fetch(`${BASE_URL}/api/curriculum/options`, { signal });
  if (!response.ok) {
    throw new CurriculumApiError(response.status, await readDetail(response));
  }
  return response.json();
}
