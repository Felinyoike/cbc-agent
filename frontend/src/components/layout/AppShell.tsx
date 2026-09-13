"use client";

import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useWorkspace } from "@/context/WorkspaceContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { contextWarning, setContextWarning } = useWorkspace();

  return (
    <div className="flex h-dvh w-full bg-white text-neutral-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        {contextWarning && (
          <div className="flex items-start gap-3 border-b border-draft-border bg-draft-surface px-4 py-3 md:px-8">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-draft-strong" />
            <p className="flex-1 text-sm text-draft-text">{contextWarning}</p>
            <button
              type="button"
              onClick={() => setContextWarning(null)}
              aria-label="Dismiss warning"
              className="shrink-0 text-draft-text hover:text-draft-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}
