"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  FileText,
  CalendarDays,
  CircleCheck,
  Library,
  Sprout,
  FlaskConical,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/curriculum", icon: BookOpen, label: "Curriculum Explorer" },
  { href: "/term-plans", icon: FileText, label: "Term Plans" },
  { href: "/daily-lessons", icon: CalendarDays, label: "Daily Lessons" },
  { href: "/reflections", icon: CircleCheck, label: "Reflections", badge: 2 },
  { href: "/library", icon: Library, label: "My Library" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="shrink-0 bg-white border-r border-neutral-200 flex flex-col w-64 p-4">
      <div className="flex px-2 pt-1 pb-8 items-center gap-2">
        <div className="size-9 rounded-lg bg-[#2f725b] text-neutral-50 flex justify-center items-center">
          <Sprout className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight">CBC Teacher</span>
          <span className="text-neutral-500 text-xs">Workflow Agent</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg text-sm flex px-3 py-2.5 items-center gap-3 transition-colors ${
                isActive
                  ? "font-medium bg-[#d9eee6] text-[#21634e]"
                  : "text-neutral-950 hover:bg-neutral-100"
              }`}
            >
              <Icon className="size-[18px]" />
              <span>{label}</span>
              {badge && (
                <span className="rounded-md bg-[#f8dfad] text-[#805b16] text-[11px] ml-auto px-1.5 py-0.5 font-medium">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-xl bg-neutral-100/40 border border-neutral-200 p-3">
          <div className="font-medium text-xs flex items-center gap-2">
            <FlaskConical className="size-3.5 text-[#8a651d]" />
            Prototype · Mock data
          </div>
          <p className="text-neutral-500 text-[11px] mt-1">
            Not connected to live KICD data.
          </p>
        </div>
        <div className="flex px-2 items-center gap-3">
          <div className="size-8 font-semibold rounded-full bg-[#293d35] text-white text-xs flex justify-center items-center">
            AW
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">A. Wanjiru</span>
            <span className="text-neutral-500 text-xs">Teacher</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
