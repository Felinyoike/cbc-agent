"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface TeachingContextValue {
  grade: string;
  subject: string;
  term: string;
  year: string;
  className: string;
}

interface TeachingContextState extends TeachingContextValue {
  /** False until the teacher has completed (or skipped) the setup screen. */
  isConfigured: boolean;
  isLoaded: boolean;
  setContext: (next: Partial<TeachingContextValue>, options?: { markConfigured?: boolean }) => void;
  resetContext: () => void;
}

const defaultContext: TeachingContextValue = {
  grade: "Grade 5",
  subject: "Agriculture",
  term: "Term 1",
  year: "2026",
  className: "5 East",
};

const STORAGE_KEY = "cbc.teachingContext";

const TeachingContext = createContext<TeachingContextState | undefined>(undefined);

export function TeachingContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<TeachingContextValue>(defaultContext);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TeachingContextValue & { isConfigured?: boolean };
        // Hydrating from localStorage has to happen after mount, otherwise the
        // server-rendered markup and the first client render disagree.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContextState({ ...defaultContext, ...parsed });
        setIsConfigured(Boolean(parsed.isConfigured));
      }
    } catch {
      // Corrupt or unavailable storage: fall back to the defaults.
    }
    setIsLoaded(true);
  }, []);

  const persist = useCallback((value: TeachingContextValue, configured: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, isConfigured: configured }));
    } catch {
      // Storage may be unavailable (private mode); the session still works.
    }
  }, []);

  const setContext = useCallback(
    (next: Partial<TeachingContextValue>, options?: { markConfigured?: boolean }) => {
      setContextState((prev) => {
        const updated = { ...prev, ...next };
        const configured = options?.markConfigured ?? true;
        setIsConfigured(configured);
        persist(updated, configured);
        return updated;
      });
    },
    [persist]
  );

  const resetContext = useCallback(() => {
    setContextState(defaultContext);
    setIsConfigured(false);
    persist(defaultContext, false);
  }, [persist]);

  return (
    <TeachingContext.Provider value={{ ...context, isConfigured, isLoaded, setContext, resetContext }}>
      {children}
    </TeachingContext.Provider>
  );
}

export function useTeachingContext() {
  const context = useContext(TeachingContext);
  if (!context) {
    throw new Error("useTeachingContext must be used within a TeachingContextProvider");
  }
  return context;
}

/** `Grade 5 · Agriculture · Term 1 · 2026 · 5 East` */
export function formatContext(value: TeachingContextValue, options?: { withYear?: boolean }) {
  const parts = [value.grade, value.subject, value.term];
  if (options?.withYear !== false) parts.push(value.year);
  parts.push(value.className);
  return parts.join(" · ");
}
