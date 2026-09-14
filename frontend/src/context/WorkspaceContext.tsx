"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTeachingContext } from "@/context/TeachingContext";
import { confirmScheme, createScheme, generateTermPlanRows, updateScheme } from "@/lib/api";
import {
  initialLessonPlan,
  initialLessons,
  initialReflections,
  libraryItems as seedLibrary,
  type EvidenceItem,
  type LessonPlanDraft,
  type Lesson,
  type LibraryItem,
  type OutcomeStatus,
  type ReflectionRecord,
  type TermPlanRow,
} from "@/data/mockData";

/**
 * Everything the teacher builds during a session lives here.
 *
 * Two rules from the product brief are enforced by this store rather than by
 * the individual screens, so no screen can accidentally bypass them:
 *   1. Nothing enters the library without an explicit confirm call.
 *   2. A reflection cannot be confirmed without teacher-entered evidence.
 */
interface WorkspaceState {
  selectedEvidence: EvidenceItem[];
  isSelected: (id: string) => boolean;
  toggleEvidence: (item: EvidenceItem) => void;
  addEvidence: (item: EvidenceItem) => void;
  removeEvidence: (id: string) => void;
  clearEvidence: () => void;
  /** Every evidence item selected this session, kept after deselection so citations still resolve. */
  evidenceById: Record<string, EvidenceItem>;

  termPlanRows: TermPlanRow[];
  /** The generated text of each row, keyed by row id, so review can tell teacher edits apart. */
  generatedRowContent: Record<string, GeneratedRowContent>;
  updateTermPlanRow: (id: string, patch: Partial<TermPlanRow>) => void;
  /** Generates week rows from the selected evidence; resolves to the number of rows added. */
  addTermPlanRowFromEvidence: () => Promise<number>;
  removeTermPlanRow: (id: string) => void;
  termPlanConfirmed: boolean;
  currentSchemeId: string | null;
  saveTermPlanDraft: () => Promise<void>;
  confirmTermPlan: () => Promise<void>;
  discardTermPlan: () => void;

  lessons: Lesson[];
  lessonPlan: LessonPlanDraft;
  updateLessonPlan: (patch: Partial<LessonPlanDraft>) => void;
  lessonPlanConfirmed: boolean;
  confirmLessonPlan: () => void;

  reflections: ReflectionRecord[];
  updateReflection: (id: string, patch: Partial<ReflectionRecord>) => void;
  setReflectionEvidence: (id: string, patch: Partial<ReflectionRecord["evidence"]>) => void;
  setOutcomeStatus: (id: string, status: OutcomeStatus) => void;
  hasReflectionEvidence: (id: string) => boolean;
  confirmReflection: (id: string) => boolean;

  library: LibraryItem[];
  pendingReflectionCount: number;
  draftCount: number;

  /** Raised when the teacher changes grade/subject while drafts exist. */
  contextWarning: string | null;
  setContextWarning: (message: string | null) => void;
}

export type GeneratedRowContent = Pick<
  TermPlanRow,
  "keyInquiryQuestion" | "outcomes" | "experiences" | "resources" | "assessment"
>;

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

const STORAGE_KEY = "cbc.workspace";

interface PersistedShape {
  selectedEvidence: EvidenceItem[];
  evidenceById: Record<string, EvidenceItem>;
  termPlanRows: TermPlanRow[];
  termPlanConfirmed: boolean;
  currentSchemeId: string | null;
  generatedRowContent: Record<string, GeneratedRowContent>;
  lessonPlan: LessonPlanDraft;
  lessonPlanConfirmed: boolean;
  reflections: ReflectionRecord[];
  library: LibraryItem[];
  lessons: Lesson[];
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const teaching = useTeachingContext();
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceById, setEvidenceById] = useState<Record<string, EvidenceItem>>({});
  const [termPlanRows, setTermPlanRows] = useState<TermPlanRow[]>([]);
  const [generatedRowContent, setGeneratedRowContent] = useState<Record<string, GeneratedRowContent>>({});
  const [termPlanConfirmed, setTermPlanConfirmed] = useState(false);
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanDraft>(initialLessonPlan);
  const [lessonPlanConfirmed, setLessonPlanConfirmed] = useState(false);
  const [reflections, setReflections] = useState<ReflectionRecord[]>(initialReflections);
  const [library, setLibrary] = useState<LibraryItem[]>(seedLibrary);
  const [contextWarning, setContextWarning] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PersistedShape>;
        // Hydrating from localStorage has to happen after mount, otherwise the
        // server-rendered markup and the first client render disagree.
        /* eslint-disable react-hooks/set-state-in-effect */
        if (parsed.selectedEvidence) setSelectedEvidence(parsed.selectedEvidence);
        if (parsed.evidenceById) setEvidenceById(parsed.evidenceById);
        if (parsed.termPlanRows) {
          // Rows saved before keyInquiryQuestion existed would otherwise crash string handling.
          setTermPlanRows(parsed.termPlanRows.map((row) => ({ ...row, keyInquiryQuestion: row.keyInquiryQuestion ?? "" })));
        }
        if (parsed.termPlanConfirmed !== undefined) setTermPlanConfirmed(parsed.termPlanConfirmed);
        if (parsed.currentSchemeId !== undefined) setCurrentSchemeId(parsed.currentSchemeId);
        if (parsed.generatedRowContent) setGeneratedRowContent(parsed.generatedRowContent);
        if (parsed.lessonPlan) setLessonPlan(parsed.lessonPlan);
        if (parsed.lessonPlanConfirmed !== undefined) setLessonPlanConfirmed(parsed.lessonPlanConfirmed);
        if (parsed.reflections) setReflections(parsed.reflections);
        if (parsed.library) setLibrary(parsed.library);
        if (parsed.lessons) setLessons(parsed.lessons);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // Ignore corrupt storage and start from the seeded prototype data.
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const payload: PersistedShape = {
        selectedEvidence,
        evidenceById,
        termPlanRows,
        termPlanConfirmed,
        currentSchemeId,
        generatedRowContent,
        lessonPlan,
        lessonPlanConfirmed,
        reflections,
        library,
        lessons,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable — the session continues in memory only.
    }
  }, [
    isLoaded,
    selectedEvidence,
    evidenceById,
    termPlanRows,
    termPlanConfirmed,
    currentSchemeId,
    generatedRowContent,
    lessonPlan,
    lessonPlanConfirmed,
    reflections,
    library,
    lessons,
  ]);

  const isSelected = useCallback(
    (id: string) => selectedEvidence.some((item) => item.id === id),
    [selectedEvidence]
  );

  const rememberEvidence = useCallback((item: EvidenceItem) => {
    setEvidenceById((prev) => (prev[item.id] === item ? prev : { ...prev, [item.id]: item }));
  }, []);

  const addEvidence = useCallback(
    (item: EvidenceItem) => {
      rememberEvidence(item);
      setSelectedEvidence((prev) => (prev.some((e) => e.id === item.id) ? prev : [...prev, item]));
    },
    [rememberEvidence]
  );

  const removeEvidence = useCallback((id: string) => {
    setSelectedEvidence((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleEvidence = useCallback(
    (item: EvidenceItem) => {
      rememberEvidence(item);
      setSelectedEvidence((prev) =>
        prev.some((e) => e.id === item.id) ? prev.filter((e) => e.id !== item.id) : [...prev, item]
      );
    },
    [rememberEvidence]
  );

  const clearEvidence = useCallback(() => setSelectedEvidence([]), []);

  const updateTermPlanRow = useCallback((id: string, patch: Partial<TermPlanRow>) => {
    setTermPlanRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, status: patch.status ?? "draft" } : row))
    );
    setTermPlanConfirmed(false);
  }, []);

  const addTermPlanRowFromEvidence = useCallback(async () => {
    const { rows } = await generateTermPlanRows(selectedEvidence, teaching.grade, teaching.subject);
    const stamp = Date.now();
    setGeneratedRowContent((prev) => {
      const next = { ...prev };
      rows.forEach((row, index) => {
        next[`row-${stamp}-${index}`] = {
          keyInquiryQuestion: row.keyInquiryQuestion,
          outcomes: row.outcomes,
          experiences: row.experiences,
          resources: row.resources,
          assessment: row.assessment,
        };
      });
      return next;
    });
    setTermPlanRows((prev) => {
      const maxWeek = prev.reduce((max, row) => Math.max(max, Number.parseInt(row.week, 10) || 0), 0);
      return [
        ...prev,
        ...rows.map((row, index) => ({
          ...row,
          id: `row-${stamp}-${index}`,
          week: String(maxWeek + index + 1),
          reflection: "",
          status: "draft" as const,
        })),
      ];
    });
    setTermPlanConfirmed(false);
    return rows.length;
  }, [selectedEvidence, teaching.grade, teaching.subject]);

  const removeTermPlanRow = useCallback((id: string) => {
    setTermPlanRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  /** Creates the scheme on first save, updates it afterwards; resolves to its id. */
  const persistScheme = useCallback(
    async (rows: TermPlanRow[]) => {
      if (currentSchemeId) {
        await updateScheme(currentSchemeId, rows);
        return currentSchemeId;
      }
      const created = await createScheme({
        grade: teaching.grade,
        subject: teaching.subject,
        term: teaching.term,
        year: teaching.year,
        rows,
      });
      setCurrentSchemeId(created.id);
      return created.id;
    },
    [currentSchemeId, teaching.grade, teaching.subject, teaching.term, teaching.year]
  );

  const saveTermPlanDraft = useCallback(async () => {
    await persistScheme(termPlanRows);
  }, [persistScheme, termPlanRows]);

  const confirmTermPlan = useCallback(async () => {
    const confirmedRows = termPlanRows.map((row) => ({ ...row, status: "confirmed" as const }));
    // Save first so the confirmed record holds exactly what the teacher reviewed.
    const schemeId = await persistScheme(confirmedRows);
    await confirmScheme(schemeId);

    setTermPlanConfirmed(true);
    setTermPlanRows(confirmedRows);
    const citedIds = new Set(confirmedRows.flatMap((row) => row.evidenceIds));
    setLibrary((prev) => [
      {
        id: `lib-${Date.now()}`,
        type: "Scheme of Work",
        title: `${teaching.subject} — ${teaching.term} scheme of work`,
        grade: teaching.grade,
        subject: teaching.subject,
        term: teaching.term,
        className: teaching.className,
        updated: new Date().toISOString().slice(0, 10),
        version: "v1",
        evidenceCount: citedIds.size,
        pages: Array.from(
          new Set(
            Array.from(citedIds)
              .map((id) => evidenceById[id]?.page)
              .filter((page): page is number => typeof page === "number")
          )
        ).sort((a, b) => a - b),
      },
      ...prev,
    ]);
  }, [
    termPlanRows,
    persistScheme,
    evidenceById,
    teaching.grade,
    teaching.subject,
    teaching.term,
    teaching.className,
  ]);

  const discardTermPlan = useCallback(() => {
    setTermPlanRows([]);
    setGeneratedRowContent({});
    setTermPlanConfirmed(false);
    setCurrentSchemeId(null);
  }, []);

  const updateLessonPlan = useCallback((patch: Partial<LessonPlanDraft>) => {
    setLessonPlan((prev) => ({ ...prev, ...patch }));
    setLessonPlanConfirmed(false);
  }, []);

  const confirmLessonPlan = useCallback(() => {
    setLessonPlanConfirmed(true);
    setLessons((prev) =>
      prev.map((lesson) => (lesson.id === "lesson-4" ? { ...lesson, status: "ready" as const } : lesson))
    );
    setLibrary((prev) => [
      {
        id: `lib-${Date.now()}`,
        type: "Lesson Plan",
        title: lessonPlan.title,
        grade: "Grade 5",
        subject: "Agriculture",
        term: "Term 1",
        className: "5 East",
        updated: new Date().toISOString().slice(0, 10),
        version: "v1",
        evidenceCount: 3,
        pages: [13],
      },
      ...prev,
    ]);
  }, [lessonPlan.title]);

  const updateReflection = useCallback((id: string, patch: Partial<ReflectionRecord>) => {
    setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const setReflectionEvidence = useCallback(
    (id: string, patch: Partial<ReflectionRecord["evidence"]>) => {
      setReflections((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, evidence: { ...r.evidence, ...patch }, status: r.status === "confirmed" ? r.status : "draft" }
            : r
        )
      );
    },
    []
  );

  const setOutcomeStatus = useCallback((id: string, status: OutcomeStatus) => {
    setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, outcomeStatus: status } : r)));
  }, []);

  const hasReflectionEvidence = useCallback(
    (id: string) => {
      const record = reflections.find((r) => r.id === id);
      if (!record) return false;
      return Object.values(record.evidence).some((value) => value.trim().length > 0);
    },
    [reflections]
  );

  /**
   * Returns false — and records nothing — when the teacher has not entered
   * evidence or chosen an outcome status. The screen surfaces the reason.
   */
  const confirmReflection = useCallback(
    (id: string) => {
      const record = reflections.find((r) => r.id === id);
      if (!record) return false;
      const hasEvidence = Object.values(record.evidence).some((value) => value.trim().length > 0);
      if (!hasEvidence || !record.outcomeStatus) return false;

      setReflections((prev) => prev.map((r) => (r.id === id ? { ...r, status: "confirmed" } : r)));
      setLessons((prev) =>
        prev.map((lesson) => (lesson.id === record.lessonId ? { ...lesson, status: "reflected" } : lesson))
      );
      setLibrary((prev) => [
        {
          id: `lib-${Date.now()}`,
          type: "Reflection",
          title: `Reflection — ${record.lessonTitle}`,
          grade: "Grade 5",
          subject: "Agriculture",
          term: "Term 1",
          className: "5 East",
          updated: new Date().toISOString().slice(0, 10),
          version: "v1",
          evidenceCount: 1,
          pages: [13],
        },
        ...prev,
      ]);
      return true;
    },
    [reflections]
  );

  const pendingReflectionCount = useMemo(
    () => reflections.filter((r) => r.status !== "confirmed").length,
    [reflections]
  );

  const draftCount = useMemo(
    () => termPlanRows.filter((row) => row.status === "draft").length,
    [termPlanRows]
  );

  const value: WorkspaceState = {
    selectedEvidence,
    isSelected,
    toggleEvidence,
    addEvidence,
    removeEvidence,
    clearEvidence,
    evidenceById,
    termPlanRows,
    generatedRowContent,
    updateTermPlanRow,
    addTermPlanRowFromEvidence,
    removeTermPlanRow,
    termPlanConfirmed,
    currentSchemeId,
    saveTermPlanDraft,
    confirmTermPlan,
    discardTermPlan,
    lessons,
    lessonPlan,
    updateLessonPlan,
    lessonPlanConfirmed,
    confirmLessonPlan,
    reflections,
    updateReflection,
    setReflectionEvidence,
    setOutcomeStatus,
    hasReflectionEvidence,
    confirmReflection,
    library,
    pendingReflectionCount,
    draftCount,
    contextWarning,
    setContextWarning,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
