"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, CheckCircle, FileText, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/context/WorkspaceContext";

/**
 * Mobile is a review surface, not a full planning workspace — so the bar only
 * carries the sections that make sense on a phone.
 */
const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/term-plans", label: "Term plan", icon: FileText },
  { href: "/daily-lessons", label: "Lessons", icon: Calendar },
  { href: "/reflections", label: "Reflect", icon: CheckCircle },
];

export function MobileNav() {
  const pathname = usePathname();
  const { pendingReflectionCount } = useWorkspace();

  return (
    <nav className="sticky bottom-0 z-20 flex shrink-0 border-t border-border bg-white lg:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
              active ? "text-brand-ink" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
            {label === "Reflect" && pendingReflectionCount > 0 && (
              <span className="absolute right-1/4 top-1 size-2 rounded-full bg-draft" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
