"use client";

import { useTeachingContext } from "@/context/TeachingContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { mockCurriculum } from "@/data/mockData";
import { Info, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function ReflectionsPage() {
  const { grade, subject, className } = useTeachingContext();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [outcomeStatus, setOutcomeStatus] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-neutral-50 relative">
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2 mb-2">
            <h1 className="font-semibold text-2xl tracking-tight">Post-lesson reflection</h1>
            <p className="text-neutral-500 text-sm">
              Record evidence and determine outcome status based on learner performance.
            </p>
          </div>

          <Card className="border-neutral-200 shadow-sm overflow-hidden">
            <div className="bg-emerald-50/50 border-b border-emerald-100 p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-emerald-800/70 font-medium tracking-wide uppercase">
                <span>Lesson Context</span>
                <span>Yesterday, 8:30 AM</span>
              </div>
              <h2 className="text-lg font-semibold text-emerald-900">{grade} {className} · {subject}</h2>
              <div className="text-sm text-emerald-800 mt-1">
                <span className="font-medium">{mockCurriculum.strand}</span> › {mockCurriculum.subStrand}
              </div>
              <div className="mt-3 text-sm text-emerald-900/80 bg-white/60 p-3 rounded-lg border border-emerald-100">
                <span className="font-semibold block mb-1">Target Outcome:</span>
                Identify methods of soil conservation in the locality.
              </div>
            </div>
            <CardContent className="p-6 flex flex-col gap-8">
              
              <div className="flex flex-col gap-4">
                <h3 className="font-semibold">Teacher Evidence</h3>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-700">What did learners say or do that demonstrated learning?</label>
                  <Textarea placeholder="Record specific observations, quotes, or actions from learners..." className="min-h-24 bg-white" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-700">What challenges did learners face?</label>
                  <Textarea placeholder="Note any misconceptions or difficulties encountered..." className="min-h-24 bg-white" />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-2 items-start text-amber-800">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <strong>Important:</strong> Select the outcome status based on the evidence you recorded above. Do not mark an objective as achieved simply because the lesson was delivered.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-semibold">Outcome Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Achieved', 'Partially achieved', 'Not yet achieved', 'Insufficient evidence'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setOutcomeStatus(status)}
                      className={`p-3 border rounded-lg text-left transition-colors text-sm font-medium ${
                        outcomeStatus === status 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl overflow-hidden mt-2">
                <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-900 uppercase">AI Reflection Summary</span>
                </div>
                <div className="p-4 text-sm text-indigo-900/70 italic text-center">
                  Fill out your evidence above, and the AI will help synthesize a summary for your records. (Simulated)
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-neutral-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
           <Button variant="ghost">Continue later</Button>
           <div className="flex gap-3">
             <Button variant="outline">Save reflection draft</Button>
             <Button className="bg-neutral-900 text-white gap-2" onClick={() => setShowConfirmDialog(true)}>
               <Check className="size-4" /> Confirm reflection record
             </Button>
           </div>
        </div>
      </div>

      <ConfirmationDialog 
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={() => router.push('/dashboard')}
        title="Confirm Reflection"
        description="This will lock the reflection as part of your official teacher records."
      />
    </div>
  );
}
