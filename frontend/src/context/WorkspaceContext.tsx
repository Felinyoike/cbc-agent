"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  evidenceItems,
  initialLessonPlan,
  initialLessons,
  initialReflections,
  initialTermPlanRows,
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

  termPlanRows: TermPlanRow[];
  updateTermPlanRow: (id: string, patch: Partial<TermPlanRow>) => void;
  addTermPlanRowFromEvidence: () => void;
  removeTermPlanRow: (id: string) => void;
  termPlanConfirmed: boolean;
  confirmTermPlan: () => void;
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

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

const STORAGE_KEY = "cbc.workspace";

interface PersistedShape {
  selectedEvidenceIds: string[];
  termPlanRows: TermPlanRow[];
  termPlanConfirmed: boolean;
  lessonPlan: LessonPlanDraft;
  lessonPlanConfirmed: boolean;
  reflections: ReflectionRecord[];
  library: LibraryItem[];
  lessons: Lesson[];
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem[]>([]);
  const [termPlanRows, setTermPlanRows] = useState<TermPlanRow[]>(initialTermPlanRows);
  const [termPlanConfirmed, setTermPlanConfirmed] = useState(false);
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
        if (parsed.selectedEvidenceIds) {
          setSelectedEvidence(
            parsed.selectedEvidenceIds
              .map((id) => evidenceItems.find((item) => item.id === id))
              .filter((item): item is EvidenceItem => Boolean(item))
          );
        }
        if (parsed.termPlanRows) setTermPlanRows(parsed.termPlanRows);
        if (parsed.termPlanConfirmed !== undefined) setTermPlanConfirmed(parsed.termPlanConfirmed);
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
        selectedEvidenceIds: selectedEvidence.map((item) => item.id),
        termPlanRows,
        termPlanConfirmed,
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
    termPlanRows,
    termPlanConfirmed,
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

  const addEvidence = useCallback((item: EvidenceItem) => {
    setSelectedEvidence((prev) => (prev.some((e) => e.id === item.id) ? prev : [...prev, item]));
  }, []);

  const removeEvidence = useCallback((id: string) => {
    setSelectedEvidence((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleEvidence = useCallback((item: EvidenceItem) => {
    setSelectedEvidence((prev) =>
      prev.some((e) => e.id === item.id) ? prev.filter((e) => e.id !== item.id) : [...prev, item]
    );
  }, []);

  const clearEvidence = useCallback(() => setSelectedEvidence([]), []);

  const updateTermPlanRow = useCallback((id: string, patch: Partial<TermPlanRow>) => {
    setTermPlanRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch, status: patch.status ?? "draft" } : row))
    );
    setTermPlanConfirmed(false);
  }, []);

  const addTermPlanRowFromEvidence = useCallback(() => {
    setTermPlanRows((prev) => {
      const first = selectedEvidence[0];
      const nextWeek = String(prev.length + 3);
      const byCategory = (category: string) =>
        selectedEvidence
          .filter((item) => item.category === category)
          .map((item) => item.content)
          .join(" ");

      const row: TermPlanRow = {
        id: `row-${Date.now()}`,
        week: nextWeek,
        lessons: "—",
        strand: first?.strand ?? "",
        subStrand: first?.subStrand ?? "",
        outcomes: byCategory("Specific Learning Outcomes"),
        experiences: byCategory("Suggested Learning Experiences"),
        resources: byCategory("Resources"),
        assessment: byCategory("Assessment"),
        reflection: "",
        status: "draft",
        evidenceIds: selectedEvidence.map((item) => item.id),
      };
      return [...prev, row];
    });
    setTermPlanConfirmed(false);
  }, [selectedEvidence]);

  const removeTermPlanRow = useCallback((id: string) => {
    setTermPlanRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const confirmTermPlan = useCallback(() => {
    setTermPlanConfirmed(true);
    setTermPlanRows((prev) => prev.map((row) => ({ ...row, status: "confirmed" as const })));
    setLibrary((prev) => [
      {
        id: `lib-${Date.now()}`,
        type: "Scheme of Work",
        title: "Food Production Processes — Term 1 scheme",
        grade: "Grade 5",
        subject: "Agriculture",
        term: "Term 1",
        className: "5 East",
        updated: new Date().toISOString().slice(0, 10),
        version: "v1",
        evidenceCount: new Set(termPlanRows.flatMap((row) => row.evidenceIds)).size,
        pages: Array.from(
          new Set(
            termPlanRows
              .flatMap((row) => row.evidenceIds)
              .map((id) => evidenceItems.find((item) => item.id === id)?.page)
              .filter((page): page is number => typeof page === "number")
          )
        ).sort((a, b) => a - b),
      },
      ...prev,
    ]);
  }, [termPlanRows]);

  const discardTermPlan = useCallback(() => {
    setTermPlanRows(initialTermPlanRows);
    setTermPlanConfirmed(false);
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
    termPlanRows,
    updateTermPlanRow,
    addTermPlanRowFromEvidence,
    removeTermPlanRow,
    termPlanConfirmed,
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
