"use client";

import { useTeachingContext } from "@/context/TeachingContext";
import { Settings2, BookOpen, FileText, CalendarCheck, ClipboardCheck, PencilLine, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { grade, subject, term, className } = useTeachingContext();
  const router = useRouter();

  return (
    <div className="overflow-y-auto bg-[oklch(0.985_0.005_120)] flex p-8 flex-col flex-1 gap-8 h-full">
      <section className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-semibold text-neutral-950 text-2xl leading-8">
            Welcome back, Ms. Wanjiru
          </h1>
          <p className="text-neutral-500 text-sm leading-5">
            You&apos;re working on{" "}
            <span className="font-medium text-neutral-950">
              {grade} · {subject} · {term} · {className}
            </span>
            . Here&apos;s what needs your attention.
          </p>
        </div>
        <Button variant="outline" className="shrink-0 gap-2" onClick={() => router.push("/setup")}>
          <Settings2 className="size-4" />
          Change context
        </Button>
      </section>

      <section className="grid grid-cols-3 gap-6">
        <Card onClick={() => router.push("/curriculum")} className="transition-shadow hover:shadow-md cursor-pointer border-neutral-200 border-0 p-6 gap-4 h-full">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-[oklch(0.93_0.03_165)] rounded-xl flex justify-center items-center">
              <BookOpen className="size-5 text-[oklch(0.45_0.09_165)]" />
            </div>
            <CardTitle className="text-base leading-6">
              Explore curriculum
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3 mt-3">
            <p className="leading-snug text-neutral-500 text-sm">
              Search KICD-aligned strands, outcomes, and learning experiences.
            </p>
            <Button variant="ghost" className="text-[oklch(0.45_0.09_165)] px-0 self-start gap-1.5 hover:bg-transparent mt-auto">
              Open explorer
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
        <Card onClick={() => router.push("/term-plans")} className="transition-shadow hover:shadow-md cursor-pointer border-neutral-200 border-0 p-6 gap-4 h-full">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-blue-100 rounded-xl flex justify-center items-center">
              <FileText className="size-5 text-blue-700" />
            </div>
            <CardTitle className="text-base leading-6">
              Prepare term plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3 mt-3">
            <p className="leading-snug text-neutral-500 text-sm">
              Build a termly scheme of work from selected evidence.
            </p>
            <Button variant="ghost" className="text-blue-700 px-0 self-start gap-1.5 hover:bg-transparent mt-auto">
              Start planning
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
        <Card onClick={() => router.push("/daily-lessons")} className="transition-shadow hover:shadow-md cursor-pointer border-neutral-200 border-0 p-6 gap-4 h-full">
          <CardHeader className="p-0 gap-3">
            <div className="size-11 bg-[oklch(0.93_0.03_165)] rounded-xl flex justify-center items-center">
              <CalendarCheck className="size-5 text-[oklch(0.45_0.09_165)]" />
            </div>
            <CardTitle className="text-base leading-6">
              Prepare today&apos;s lesson
            </CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-3 mt-3">
            <p className="leading-snug text-neutral-500 text-sm">
              Draft a daily lesson plan from a term-plan row.
            </p>
            <Button variant="ghost" className="text-[oklch(0.45_0.09_165)] px-0 self-start gap-1.5 hover:bg-transparent mt-auto">
              Plan lesson
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-[oklch(0.85_0.07_75)] bg-[oklch(0.97_0.03_80)] p-6">
          <CardContent className="flex p-0 items-center gap-5">
            <div className="size-12 bg-[oklch(0.9_0.08_75)] shrink-0 rounded-xl flex justify-center items-center">
              <ClipboardCheck className="size-6 text-[oklch(0.5_0.12_65)]" />
            </div>
            <div className="flex flex-col flex-1 gap-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-950 text-base">
                  Reflect on a lesson
                </h3>
                <Badge className="bg-[oklch(0.88_0.09_75)] text-[oklch(0.42_0.1_65)] border-transparent text-xs hover:bg-[oklch(0.88_0.09_75)]">
                  Action needed
                </Badge>
              </div>
              <p className="text-[oklch(0.45_0.05_75)] text-sm">
                2 delivered lessons are awaiting your post-lesson evidence.
                Record outcomes based on what learners said or did.
              </p>
            </div>
            <Button asChild className="bg-[oklch(0.55_0.13_65)] hover:bg-[#a67c00] text-white gap-2">
              <Link href="/reflections">
                <PencilLine className="size-4" />
                Reflect now
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h3 className="font-semibold text-lg">Continue working</h3>
            <span className="text-xs text-neutral-500">Unfinished items</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-5 border-neutral-200 cursor-pointer hover:border-neutral-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-medium text-xs">
                  <FileText className="size-3 mr-1" />
                  Draft scheme
                </Badge>
                <span className="text-xs text-neutral-500">Edited 2h ago</span>
              </div>
              <h4 className="font-semibold text-sm mb-1">Food Production Processes — Term 1 scheme</h4>
              <p className="text-xs text-neutral-500 mb-4">3 of 8 weeks drafted · Not yet confirmed</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/term-plans">Resume draft <ArrowRight className="size-3 ml-1" /></Link>
              </Button>
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <h3 className="font-semibold text-lg">Progress summary</h3>
          </div>
          <Card className="p-6 border-neutral-200">
            <div className="flex justify-between items-end mb-2">
              <span className="font-medium text-sm">Term plan reviewed</span>
              <span className="text-2xl font-bold text-[#2f725b]">40%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2.5 mb-6 overflow-hidden">
              <div className="bg-[#2f725b] h-2.5 rounded-full" style={{ width: '40%' }}></div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-3 text-xs text-neutral-500 mb-6 flex items-start gap-2">
              <Info className="size-4 shrink-0 mt-0.5" />
              <p>This shows your <strong>planning workflow progress</strong> — not learner achievement. Outcome status is set from post-lesson evidence.</p>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Weeks planned</span>
                <span className="font-medium">4 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Lessons drafted</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Reflections pending</span>
                <span className="font-medium text-amber-600">2</span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
