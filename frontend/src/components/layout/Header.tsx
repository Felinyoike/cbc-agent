"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  FileEdit,
  GraduationCap,
  LogOut,
  Search,
  Settings2,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatContext, useTeachingContext } from "@/context/TeachingContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { teacher } from "@/data/mockData";

export function Header() {
  const router = useRouter();
  const context = useTeachingContext();
  const { pendingReflectionCount, draftCount } = useWorkspace();
  const [openMenu, setOpenMenu] = useState<"none" | "notifications" | "profile">("none");
  const [query, setQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (openMenu === "none") return;
    const onPointerDown = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu("none");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu("none");
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const notificationCount = pendingReflectionCount + draftCount;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(query.trim() ? `/curriculum?q=${encodeURIComponent(query.trim())}` : "/curriculum");
  };

  return (
    <header
      ref={headerRef}
      className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-4 md:px-8"
    >
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand">
          <Sprout className="size-4 text-white" />
        </div>
      </Link>

      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <GraduationCap className="size-4 text-brand" />
        <span className="text-sm font-medium text-neutral-950">{formatContext(context)}</span>
      </div>

      <form onSubmit={submitSearch} className="ml-2 max-w-md flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about curriculum…"
            aria-label="Ask about curriculum"
            className="h-9 border-transparent bg-neutral-100/70 pl-9"
          />
        </div>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-brand-softer px-3 py-1.5 xl:flex">
          <span className="size-2 rounded-full bg-brand" />
          <span className="text-xs font-medium text-brand-text">Planning: {context.term} open</span>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label={`Notifications (${notificationCount} pending)`}
            aria-expanded={openMenu === "notifications"}
            onClick={() => setOpenMenu(openMenu === "notifications" ? "none" : "notifications")}
          >
            <Bell className="size-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-draft text-[10px] font-semibold text-white">
                {notificationCount}
              </span>
            )}
          </Button>

          {openMenu === "notifications" && (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-border bg-white p-2 shadow-lg">
              <p className="px-2 py-1.5 text-xs font-semibold text-neutral-950">Pending actions</p>
              <div className="flex flex-col gap-1">
                {draftCount > 0 && (
                  <Link
                    href="/term-plans"
                    onClick={() => setOpenMenu("none")}
                    className="flex items-start gap-2 rounded-lg p-2 hover:bg-neutral-50"
                  >
                    <FileEdit className="mt-0.5 size-4 text-draft" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-neutral-950">
                        {draftCount} scheme {draftCount === 1 ? "row" : "rows"} awaiting review
                      </span>
                      <span className="text-[11px] text-muted-foreground">Food Production Processes</span>
                    </div>
                  </Link>
                )}
                {pendingReflectionCount > 0 && (
                  <Link
                    href="/reflections"
                    onClick={() => setOpenMenu("none")}
                    className="flex items-start gap-2 rounded-lg p-2 hover:bg-neutral-50"
                  >
                    <CalendarClock className="mt-0.5 size-4 text-draft" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-neutral-950">
                        {pendingReflectionCount} {pendingReflectionCount === 1 ? "lesson" : "lessons"} awaiting
                        reflection
                      </span>
                      <span className="text-[11px] text-muted-foreground">Soil Conservation</span>
                    </div>
                  </Link>
                )}
                {notificationCount === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">Nothing needs your attention.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === "profile" ? "none" : "profile")}
            aria-expanded={openMenu === "profile"}
            className="flex items-center gap-2 border-l border-border pl-2 text-left"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
              AW
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-xs font-semibold text-neutral-950">{teacher.shortName}</span>
              <span className="text-[11px] text-muted-foreground">{teacher.role}</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>

          {openMenu === "profile" && (
            <div className="absolute right-0 top-12 z-30 w-60 rounded-xl border border-border bg-white p-2 shadow-lg">
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-neutral-950">{teacher.name}</p>
                <p className="text-xs text-muted-foreground">{teacher.school}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/setup"
                onClick={() => setOpenMenu("none")}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-50"
              >
                <Settings2 className="size-4 text-muted-foreground" />
                Change teaching context
              </Link>
              <button
                type="button"
                onClick={() => setOpenMenu("none")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-50"
              >
                <LogOut className="size-4 text-muted-foreground" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
