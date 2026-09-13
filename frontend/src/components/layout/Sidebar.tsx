"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  FlaskConical,
  Home,
  Library,
  Sprout,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/WorkspaceContext";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/curriculum", label: "Curriculum Explorer", icon: BookOpen },
  { href: "/term-plans", label: "Term Plans", icon: FileText },
  { href: "/daily-lessons", label: "Daily Lessons", icon: Calendar },
  { href: "/reflections", label: "Reflections", icon: CheckCircle },
  { href: "/library", label: "My Library", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  const { pendingReflectionCount } = useWorkspace();

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-neutral-50 p-4 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2 p-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand">
          <Sprout className="size-5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-neutral-950">CBC Teacher</span>
          <span className="text-xs text-muted-foreground">Workflow Agent</span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border border-brand-border bg-brand-soft text-brand-ink"
                  : "border border-transparent text-neutral-950 hover:bg-neutral-100"
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span>{label}</span>
              {label === "Reflections" && pendingReflectionCount > 0 && (
                <span className="ml-auto rounded-full bg-draft-soft px-1.5 text-xs font-semibold text-draft-text">
                  {pendingReflectionCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 rounded-lg border border-border bg-white p-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-neutral-950">Prototype · Mock data</span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Screens are not connected to live KICD data.
        </p>
      </div>
    </aside>
  );
}
