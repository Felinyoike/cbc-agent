"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TeachingContextType {
  grade: string;
  subject: string;
  term: string;
  year: string;
  className: string;
  setContext: (context: Partial<Omit<TeachingContextType, "setContext">>) => void;
}

const defaultContext = {
  grade: "Grade 5",
  subject: "Agriculture",
  term: "Term 1",
  year: "2026",
  className: "5 East",
};

const TeachingContext = createContext<TeachingContextType | undefined>(undefined);

export function TeachingContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState(defaultContext);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("teachingContext");
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContextState(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    setIsLoaded(true);
  }, []);

  const setContext = (newContext: Partial<Omit<TeachingContextType, "setContext">>) => {
    setContextState((prev) => {
      const updated = { ...prev, ...newContext };
      localStorage.setItem("teachingContext", JSON.stringify(updated));
      return updated;
    });
  };

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <TeachingContext.Provider value={{ ...context, setContext }}>
      {children}
    </TeachingContext.Provider>
  );
}

export function useTeachingContext() {
  const context = useContext(TeachingContext);
  if (context === undefined) {
    throw new Error("useTeachingContext must be used within a TeachingContextProvider");
  }
  return context;
}
