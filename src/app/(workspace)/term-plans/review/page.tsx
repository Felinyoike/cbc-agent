"use client";

import { useTeachingContext } from "@/context/TeachingContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TriangleAlert, BookMarked, BadgeCheck, Sparkles, Bot, PencilLine, User, CornerDownRight, Pencil, Bookmark, Trash2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function DraftReviewPage() {
  const { grade, subject, className } = useTeachingContext();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmSave = () => {
    // In real app, save to db
    router.push("/term-plans");
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="font-semibold text-2xl text-neutral-950">Draft review & confirmation</h1>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-medium text-xs">
                  AI-assisted draft
                </Badge>
              </div>
              <p className="text-neutral-500 text-sm">
                Term Plan · Food Production Processes · Soil Conservation
              </p>
            </div>
            <span className="text-neutral-500 text-xs">Last edited 12 min ago</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
            <TriangleAlert className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-amber-800 text-sm">This is an AI-assisted draft.</p>
              <p className="text-amber-700 text-sm">Review it against the cited curriculum evidence before confirming. Nothing is saved as a teacher work product until you confirm.</p>
            </div>
          </div>

          <section className="rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
            <div className="bg-neutral-50/50 border-b border-neutral-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookMarked className="size-4 text-emerald-600" />
                <h2 className="font-semibold text-sm">Curriculum evidence used</h2>
              </div>
              <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50 gap-1.5 font-medium">
                <BadgeCheck className="size-3.5" /> Official evidence
              </Badge>
            </div>
            <div className="divide-y divide-neutral-200">
              <div className="p-5 flex justify-between items-start gap-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">Specific Learning Outcomes — Soil Conservation</span>
                  <span className="text-neutral-600 text-sm">Learner explains ways of conserving soil and demonstrates recovery of eroded soil in the school garden.</span>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50 text-xs font-medium">
                    KICD design · Page 13
                  </Badge>
                  <Button variant="link" size="sm" className="h-auto p-0 text-emerald-700">View source</Button>
                </div>
              </div>
              <div className="p-5 flex justify-between items-start gap-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">Suggested Learning Experiences</span>
                  <span className="text-neutral-600 text-sm">Learners use locally available devices to conserve soil and prepare organic waste pits to improve soil quality.</span>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50 text-xs font-medium">
                    KICD design · Page 14
                  </Badge>
                  <Button variant="link" size="sm" className="h-auto p-0 text-emerald-700">View source</Button>
                </div>
              </div>
              <div className="p-5 flex justify-between items-start gap-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">Key Inquiry Question</span>
                  <span className="text-neutral-600 text-sm">How can we conserve soil in our local environment?</span>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50 text-xs font-medium">
                    KICD design · Page 13
                  </Badge>
                  <Button variant="link" size="sm" className="h-auto p-0 text-emerald-700">View source</Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
            <div className="bg-neutral-50/50 border-b border-neutral-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-600" />
                <h2 className="font-semibold text-sm">AI-assisted organization</h2>
              </div>
              <Badge variant="outline" className="text-indigo-700 border-indigo-600/40 bg-indigo-50 gap-1.5 font-medium">
                <Bot className="size-3.5" /> AI generated
              </Badge>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-neutral-600">
                The assistant arranged the selected evidence into a familiar scheme-of-work structure. Review before accepting.
              </p>
              <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs font-medium">
                    <tr>
                      <th className="p-3">Week</th>
                      <th className="p-3">Sub-strand</th>
                      <th className="p-3">Learning Outcomes</th>
                      <th className="p-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 align-top font-medium">1</td>
                      <td className="p-3 align-top">Soil Conservation</td>
                      <td className="p-3 align-top text-neutral-600">Explain ways of conserving soil</td>
                      <td className="p-3 align-top text-neutral-600">Oral questions, observation</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top font-medium">2</td>
                      <td className="p-3 align-top">Soil Conservation</td>
                      <td className="p-3 align-top text-neutral-600">Recover eroded soil in garden</td>
                      <td className="p-3 align-top text-neutral-600">Practical activity, checklist</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm">
            <div className="bg-neutral-50/50 border-b border-neutral-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PencilLine className="size-4 text-neutral-600" />
                <h2 className="font-semibold text-sm">Teacher edits and notes</h2>
              </div>
              <Badge variant="outline" className="text-neutral-700 border-neutral-300 bg-neutral-100 gap-1.5 font-medium">
                <User className="size-3.5" /> Teacher input
              </Badge>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="flex gap-3 items-start">
                <CornerDownRight className="size-4 text-neutral-400 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-medium text-sm">Adjusted resources for Week 2</h4>
                  <p className="text-sm text-neutral-600">Replaced generic tools with locally available jembes and used the school compost pit for the practical.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <CornerDownRight className="size-4 text-neutral-400 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <h4 className="font-medium text-sm">Note on class {className}</h4>
                  <p className="text-sm text-neutral-600">Split practical into two small groups; garden space limits whole-class demonstration.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-neutral-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button variant="outline" className="gap-2" onClick={() => router.push("/term-plans")}>
            <Pencil className="size-4" /> Edit draft
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Bookmark className="size-4" /> Keep as draft
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-2">
              <Trash2 className="size-4" /> Discard
            </Button>
            <Button className="bg-neutral-900 text-white gap-2" onClick={() => setShowConfirmDialog(true)}>
              <Check className="size-4" /> Confirm and save
            </Button>
          </div>
        </div>
      </div>

      <ConfirmationDialog 
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmSave}
        title="Confirm Teacher Work Product"
        description={`This will save the term plan for ${grade} ${subject} to your library.`}
      />
    </div>
  );
}
