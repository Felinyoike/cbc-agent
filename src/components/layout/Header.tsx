"use client";

import { GraduationCap, Search, FlaskConical, Bell, ChevronDown } from "lucide-react";
import { useTeachingContext } from "@/context/TeachingContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Header() {
  const { grade, subject, term, year, className } = useTeachingContext();

  return (
    <header className="shrink-0 bg-white border-b border-neutral-200 flex px-8 justify-between items-center h-16">
      <div className="font-medium text-sm flex items-center gap-2">
        <GraduationCap className="size-4 text-[#2f725b]" />
        <span>{grade}</span>
        <span className="text-neutral-500">·</span>
        <span>{subject}</span>
        <span className="text-neutral-500">·</span>
        <span>{term}</span>
        <span className="text-neutral-500">·</span>
        <span>{year}</span>
        <span className="text-neutral-500">·</span>
        <span>{className}</span>
        <Button variant="ghost" size="sm" asChild className="ml-1 h-7 text-xs text-neutral-500">
          <Link href="/setup">Change</Link>
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-neutral-100/30 border border-neutral-200 flex px-3 items-center gap-2 w-72 h-10">
          <Search className="size-4 text-neutral-500" />
          <input
            placeholder="Ask about curriculum…"
            className="bg-transparent text-sm border-none outline-none flex-1 h-8"
          />
        </div>
        <div className="font-medium rounded-full bg-[#fff3d8] text-[#87641e] text-xs flex px-3 py-1.5 items-center gap-1.5">
          <FlaskConical className="size-3.5" />
          Prototype / Mock data
        </div>
        <button className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors">
          <Bell className="size-[18px] text-neutral-500" />
          <span className="size-1.5 rounded-full bg-[#e7000b] absolute right-2 top-1" />
        </button>
        <div className="text-sm border-l border-neutral-200 flex pl-4 items-center gap-2">
          <div className="size-8 font-semibold rounded-full bg-[#d9eee6] text-[#21634e] text-xs flex justify-center items-center">
            AW
          </div>
          <span className="font-medium">A. Wanjiru</span>
          <ChevronDown className="size-4 text-neutral-500" />
        </div>
      </div>
    </header>
  );
}
