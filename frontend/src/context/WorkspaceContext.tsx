"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTeachingContext } from "@/context/TeachingContext";
import {
  confirmLesson,
  confirmScheme,
  createLesson,
  createScheme,
  generateLessonPlan,
  generateTermPlanRows,
  updateLesson,
  updateScheme,
} from "@/lib/api";
import {
  emptyLessonPlan,
  initialLessons,
  initialReflections,
  type EvidenceItem,
  type LessonPlanDraft,
  type Lesson,
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
  /** The term-plan row today's lesson is planned from; undefined until the teacher picks one. */
  selectedTermPlanRow: TermPlanRow | undefined;
  selectTermPlanRow: (id: string) => void;
  /** What generation produced, so review can tell teacher edits apart; undefined if never generated. */
  generatedLessonContent: GeneratedLessonContent | undefined;
  generateLessonFromRow: () => Promise<void>;
  currentLessonId: string | null;
  lessonPlanConfirmed: boolean;
  saveLessonPlanDraft: () => Promise<void>;
  confirmLessonPlan: () => Promise<void>;
  discardLessonPlan: () => void;

  reflections: ReflectionRecord[];
  updateReflection: (id: string, patch: Partial<ReflectionRecord>) => void;
  setReflectionEvidence: (id: string, patch: Partial<ReflectionRecord["evidence"]>) => void;
  setOutcomeStatus: (id: string, status: OutcomeStatus) => void;
  hasReflectionEvidence: (id: string) => boolean;
  confirmReflection: (id: string) => boolean;

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

export type GeneratedLessonContent = Pick<
  LessonPlanDraft,
  "keyInquiryQuestion" | "outcomes" | "resources" | "introduction" | "development" | "assessmentActivity" | "conclusion"
>;

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

const STORAGE_KEY = "cbc.workspace";

/**
 * Everything below belongs to one teaching context. A scheme of work is per
 * grade/subject/term/year in Postgres, and evidence, rows and lesson drafts are
 * all built from that context's curriculum -- so they are kept per context here
 * too. Switching context shows that context's own workspace (usually empty);
 * switching back brings the first one back untouched, and a draft for one
 * subject can never be saved over another subject's scheme.
 */
interface ContextBundle {
  selectedEvidence: EvidenceItem[];
  evidenceById: Record<string, EvidenceItem>;
  termPlanRows: TermPlanRow[];
  termPlanConfirmed: boolean;
  currentSchemeId: string | null;
  generatedRowContent: Record<string, GeneratedRowContent>;
  lessonPlan: LessonPlanDraft;
  lessonPlanConfirmed: boolean;
  selectedTermPlanRowId: string | null;
  generatedLessonContent?: GeneratedLessonContent;
  currentLessonId: string | null;
}

const emptyBundle: ContextBundle = {
  selectedEvidence: [],
  evidenceById: {},
  termPlanRows: [],
  termPlanConfirmed: false,
  currentSchemeId: null,
  generatedRowContent: {},
  lessonPlan: emptyLessonPlan,
  lessonPlanConfirmed: false,
  selectedTermPlanRowId: null,
  generatedLessonContent: undefined,
  currentLessonId: null,
};

/** The class/stream is deliberately left out: it does not change which curriculum applies. */
function contextKeyOf(teaching: { grade: string; subject: string; term: string; year: string }) {
  return `${teaching.grade}|${teaching.subject}|${teaching.term}|${teaching.year}`;
}

/** A workspace only holds evidence from its own grade and subject's curriculum design. */
export function evidenceFitsContext(item: EvidenceItem, teaching: { grade: string; subject: string }) {
  return item.grade === teaching.grade && item.subject === teaching.subject;
}

interface PersistedShape {
  version: 2;
  /** Keyed by contextKeyOf(). The current context's bundle is written on every change. */
  contexts: Record<string, ContextBundle>;
  /** Not context-specific (still prototype data). */
  reflections: ReflectionRecord[];
  lessons: Lesson[];
}

/** Workspaces saved before contexts existed: one unlabelled bundle, adopted by the context in use. */
type LegacyPersistedShape = Partial<ContextBundle> & { reflections?: ReflectionRecord[]; lessons?: Lesson[] };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const teaching = useTeachingContext();
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceById, setEvidenceById] = useState<Record<string, EvidenceItem>>({});
  const [termPlanRows, setTermPlanRows] = useState<TermPlanRow[]>([]);
  const [generatedRowContent, setGeneratedRowContent] = useState<Record<string, GeneratedRowContent>>({});
  const [termPlanConfirmed, setTermPlanConfirmed] = useState(false);
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [lessonPlan, setLessonPlan] = useState<LessonPlanDraft>(emptyLessonPlan);
  const [lessonPlanConfirmed, setLessonPlanConfirmed] = useState(false);
  const [selectedTermPlanRowId, setSelectedTermPlanRowId] = useState<string | null>(null);
  const [generatedLessonContent, setGeneratedLessonContent] = useState<GeneratedLessonContent | undefined>();
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionRecord[]>(initialReflections);
  const [contextWarning, setContextWarning] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Every context except the one in use. The current one lives in the state
  // above, and is folded back in when the context changes or on every save.
  const [otherContexts, setOtherContexts] = useState<Record<string, ContextBundle>>({});
  const contextKey = contextKeyOf(teaching);
  // Read inside effects, which must act on the context the state belongs to
  // rather than the one a later render has moved on to.
  const loadedContextKey = useRef(contextKey);

  const currentBundle = useCallback(
    (): ContextBundle => ({
      selectedEvidence,
      evidenceById,
      termPlanRows,
      termPlanConfirmed,
      currentSchemeId,
      generatedRowContent,
      lessonPlan,
      lessonPlanConfirmed,
      selectedTermPlanRowId,
      generatedLessonContent,
      currentLessonId,
    }),
    [selectedEvidence, evidenceById, termPlanRows, termPlanConfirmed, currentSchemeId, generatedRowContent,
     lessonPlan, lessonPlanConfirmed, selectedTermPlanRowId, generatedLessonContent, currentLessonId]
  );

  const applyBundle = useCallback((bundle: ContextBundle, key: string) => {
    const [grade, subject] = key.split("|");
    // Workspaces saved before selection was limited to the context can hold other
    // grades' or subjects' evidence; drop it from the selection. evidenceById is
    // left whole so rows that already cite such an item still resolve it.
    setSelectedEvidence(bundle.selectedEvidence.filter((item) => evidenceFitsContext(item, { grade, subject })));
    setEvidenceById(bundle.evidenceById);
    // Rows saved before keyInquiryQuestion existed would otherwise crash string handling.
    setTermPlanRows(bundle.termPlanRows.map((row) => ({ ...row, keyInquiryQuestion: row.keyInquiryQuestion ?? "" })));
    setTermPlanConfirmed(bundle.termPlanConfirmed);
    setCurrentSchemeId(bundle.currentSchemeId);
    setGeneratedRowContent(bundle.generatedRowContent);
    setLessonPlan(bundle.lessonPlan);
    setLessonPlanConfirmed(bundle.lessonPlanConfirmed);
    setSelectedTermPlanRowId(bundle.selectedTermPlanRowId);
    setGeneratedLessonContent(bundle.generatedLessonContent);
    setCurrentLessonId(bundle.currentLessonId);
  }, []);

  useEffect(() => {
    // Waits for the saved teaching context: hydrating before it is known would
    // file the stored workspace under the default context instead of the real one.
    if (!teaching.isLoaded || isLoaded) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedShape | LegacyPersistedShape;
        const contexts =
          "version" in parsed && parsed.version === 2
            ? parsed.contexts ?? {}
            : { [contextKey]: { ...emptyBundle, ...(parsed as LegacyPersistedShape) } };
        const { [contextKey]: mine, ...others } = contexts;
        // Hydrating from localStorage has to happen after mount, otherwise the
        // server-rendered markup and the first client render disagree.
        setOtherContexts(others);
        if (mine) applyBundle({ ...emptyBundle, ...mine }, contextKey);
        if (parsed.reflections) setReflections(parsed.reflections);
        if (parsed.lessons) setLessons(parsed.lessons);
      }
    } catch {
      // Ignore corrupt storage and start from the seeded prototype data.
    }
    loadedContextKey.current = contextKey;
    setIsLoaded(true);
  }, [teaching.isLoaded, isLoaded, contextKey, applyBundle]);

  useEffect(() => {
    if (!isLoaded || loadedContextKey.current === contextKey) return;
    // The teacher switched context: keep this context's work under its own key
    // and show the new context's workspace, which is usually empty.
    const previousKey = loadedContextKey.current;
    const previousBundle = currentBundle();
    loadedContextKey.current = contextKey;
    setOtherContexts((prev) => {
      const rest = { ...prev };
      delete rest[contextKey];  // it is the one now held in state
      return { ...rest, [previousKey]: previousBundle };
    });
    applyBundle({ ...emptyBundle, ...otherContexts[contextKey] }, contextKey);
  }, [isLoaded, contextKey, currentBundle, applyBundle, otherContexts]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const payload: PersistedShape = {
        version: 2,
        contexts: { ...otherContexts, [loadedContextKey.current]: currentBundle() },
        reflections,
        lessons,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable — the session continues in memory only.
    }
    // currentBundle changes whenever any field in it changes, so the individual
    // fields do not need listing here.
  }, [isLoaded, otherContexts, currentBundle, reflections, lessons]);

  const isSelected = useCallback(
    (id: string) => selectedEvidence.some((item) => item.id === id),
    [selectedEvidence]
  );

  const rememberEvidence = useCallback((item: EvidenceItem) => {
    setEvidenceById((prev) => (prev[item.id] === item ? prev : { ...prev, [item.id]: item }));
  }, []);

  // Enforced here rather than only in the Explorer: another grade's or subject's
  // evidence would end up in this context's term plan and scheme of work.
  const fitsContext = useCallback(
    (item: EvidenceItem) => evidenceFitsContext(item, teaching),
    [teaching]
  );

  const addEvidence = useCallback(
    (item: EvidenceItem) => {
      if (!fitsContext(item)) return;
      rememberEvidence(item);
      setSelectedEvidence((prev) => (prev.some((e) => e.id === item.id) ? prev : [...prev, item]));
    },
    [rememberEvidence, fitsContext]
  );

  const removeEvidence = useCallback((id: string) => {
    setSelectedEvidence((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleEvidence = useCallback(
    (item: EvidenceItem) => {
      // Deselecting is always allowed; selecting only within the teaching context.
      if (!selectedEvidence.some((e) => e.id === item.id) && !fitsContext(item)) return;
      rememberEvidence(item);
      setSelectedEvidence((prev) =>
        prev.some((e) => e.id === item.id) ? prev.filter((e) => e.id !== item.id) : [...prev, item]
      );
    },
    [rememberEvidence, fitsContext, selectedEvidence]
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

    // The Library reads confirmed schemes from Postgres, so nothing is recorded locally here.
    setTermPlanConfirmed(true);
    setTermPlanRows(confirmedRows);
  }, [termPlanRows, persistScheme]);

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

  const selectedTermPlanRow = useMemo(
    () => termPlanRows.find((row) => row.id === selectedTermPlanRowId),
    [termPlanRows, selectedTermPlanRowId]
  );

  const selectTermPlanRow = useCallback((id: string) => {
    setSelectedTermPlanRowId((prev) => {
      if (prev !== id) {
        // A saved lesson records its row's strand/sub-strand, so a different row is a new record.
        setCurrentLessonId(null);
        setLessonPlanConfirmed(false);
      }
      return id;
    });
  }, []);

  const generateLessonFromRow = useCallback(async () => {
    const row = selectedTermPlanRow;
    if (!row) throw new Error("No term plan row selected");
    const sourceEvidence = row.evidenceIds.map((id) => evidenceById[id]).find(Boolean);
    const generated = await generateLessonPlan({
      // Evidence carries the grade/subject the row was built from; the teaching context is a fallback.
      grade: sourceEvidence?.grade ?? teaching.grade,
      subject: sourceEvidence?.subject ?? teaching.subject,
      strand: row.strand,
      subStrand: row.subStrand,
      lessons: row.lessons,
      keyInquiryQuestion: row.keyInquiryQuestion,
      outcomes: row.outcomes,
      experiences: row.experiences,
      resources: row.resources,
      assessment: row.assessment,
    });
    setGeneratedLessonContent(generated);
    setLessonPlan((prev) => ({ ...prev, ...generated }));
    setLessonPlanConfirmed(false);
  }, [selectedTermPlanRow, evidenceById, teaching.grade, teaching.subject]);

  /** Creates the lesson on first save, updates it afterwards; resolves to its id. */
  const persistLesson = useCallback(
    async (plan: LessonPlanDraft) => {
      if (currentLessonId) {
        await updateLesson(currentLessonId, plan);
        return currentLessonId;
      }
      if (!selectedTermPlanRow) throw new Error("No term plan row selected");
      const created = await createLesson({
        schemeId: currentSchemeId,
        lessonDate: plan.date,
        strand: selectedTermPlanRow.strand,
        subStrand: selectedTermPlanRow.subStrand,
        content: plan,
      });
      setCurrentLessonId(created.id);
      return created.id;
    },
    [currentLessonId, currentSchemeId, selectedTermPlanRow]
  );

  const saveLessonPlanDraft = useCallback(async () => {
    await persistLesson(lessonPlan);
  }, [persistLesson, lessonPlan]);

  const confirmLessonPlan = useCallback(async () => {
    // Save first so the confirmed record holds exactly what the teacher reviewed.
    const lessonId = await persistLesson(lessonPlan);
    await confirmLesson(lessonId);

    // The Library reads confirmed lesson plans from Postgres, so nothing is recorded locally here.
    setLessonPlanConfirmed(true);
  }, [persistLesson, lessonPlan]);

  const discardLessonPlan = useCallback(() => {
    setLessonPlan(emptyLessonPlan);
    setGeneratedLessonContent(undefined);
    setCurrentLessonId(null);
    setLessonPlanConfirmed(false);
  }, []);

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
    selectedTermPlanRow,
    selectTermPlanRow,
    generatedLessonContent,
    generateLessonFromRow,
    currentLessonId,
    lessonPlanConfirmed,
    saveLessonPlanDraft,
    confirmLessonPlan,
    discardLessonPlan,
    reflections,
    updateReflection,
    setReflectionEvidence,
    setOutcomeStatus,
    hasReflectionEvidence,
    confirmReflection,
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
