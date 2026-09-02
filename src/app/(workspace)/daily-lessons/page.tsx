"use client";

import { useTeachingContext } from "@/context/TeachingContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { mockCurriculum } from "@/data/mockData";
import { ShieldCheck, ChevronRight, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function DailyLessonPage() {
  const { grade, subject, className } = useTeachingContext();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-8 pb-24 pr-80">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="font-semibold text-2xl tracking-tight">Draft daily lesson plan</h1>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-medium">
                  Draft
                </Badge>
              </div>
              <p className="text-neutral-500 text-sm">
                Derived from Term Plan Week 1 · Scheduled for tomorrow
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_250px] gap-8">
            <div className="flex flex-col gap-6">
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-200 py-3 px-5">
                  <h3 className="font-semibold text-sm">Lesson Context</h3>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Date & Time</label>
                    <Input defaultValue="Oct 12, 2026, 8:30 AM" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Grade & Class</label>
                    <Input defaultValue={`${grade} ${className}`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Subject</label>
                    <Input defaultValue={subject} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Strand</label>
                    <Input defaultValue={mockCurriculum.strand} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-200 py-3 px-5">
                  <h3 className="font-semibold text-sm">Objectives & Competencies</h3>
                </CardHeader>
                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Specific Learning Outcomes</label>
                    <Textarea defaultValue="Identify methods of soil conservation in the locality." className="min-h-16 resize-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Key Inquiry Question</label>
                    <Textarea defaultValue="Why is soil conservation important in farming?" className="min-h-16 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500 uppercase">Core Competencies</label>
                      <Textarea defaultValue="Communication and Collaboration" className="min-h-16 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500 uppercase">Values & PCIs</label>
                      <Textarea defaultValue="Responsibility, Environmental conservation" className="min-h-16 resize-none" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-200 py-3 px-5">
                  <h3 className="font-semibold text-sm">Lesson Delivery</h3>
                </CardHeader>
                <CardContent className="p-5 flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Introduction (5 mins)</label>
                    <Textarea placeholder="How will you start the lesson?" defaultValue="Ask learners if they have seen soil being washed away by rain." className="min-h-20" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Main Activities (25 mins)</label>
                    <Textarea placeholder="Detail the step-by-step activities..." defaultValue="1. Group discussion on local methods of soil conservation.&#10;2. Groups present their findings.&#10;3. Teacher demonstrates terracing using a soil model." className="min-h-32" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Conclusion (5 mins)</label>
                    <Textarea placeholder="How will you wrap up?" defaultValue="Recap the main points. Ask the key inquiry question again." className="min-h-20" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-200 py-3 px-5">
                  <h3 className="font-semibold text-sm">Assessment & Resources</h3>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Assessment Methods</label>
                    <Textarea defaultValue="Observation of group discussions, oral questioning." className="min-h-20 resize-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase">Learning Resources</label>
                    <Textarea defaultValue="Soil model, watering can, charts showing soil erosion." className="min-h-20 resize-none" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
               <Card className="p-4 shadow-sm border-emerald-200 bg-emerald-50/30 sticky top-0">
                 <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-emerald-800">
                    <ShieldCheck className="size-4" /> Curriculum Evidence
                 </h4>
                 <div className="flex flex-col gap-3 text-sm">
                    <div>
                      <span className="text-xs text-neutral-500 block mb-1">Strand</span>
                      <span className="font-medium">{mockCurriculum.strand}</span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500 block mb-1">Sub-strand</span>
                      <span className="font-medium">{mockCurriculum.subStrand}</span>
                    </div>
                 </div>
               </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Right Fixed Panel for Planning Assistant */}
      <div className="w-80 border-l border-neutral-200 bg-neutral-50 absolute right-0 inset-y-0 flex flex-col z-20">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-indigo-700">
            <MessageSquareText className="size-4" />
            Planning Assistant
          </h3>
        </div>
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-800">
            I can help you flesh out this lesson plan. Try asking:
          </div>
          <Button variant="outline" className="justify-start h-auto py-3 text-left whitespace-normal text-sm font-normal text-neutral-700 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
            Suggest a starter activity for 5th graders to introduce soil erosion.
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3 text-left whitespace-normal text-sm font-normal text-neutral-700 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
            How can I assess if they understand the importance of conservation?
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3 text-left whitespace-normal text-sm font-normal text-neutral-700 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
            What are some locally available resources for this lesson?
          </Button>
        </div>
        <div className="p-4 bg-white border-t border-neutral-200">
           <div className="relative">
             <Input placeholder="Ask assistant..." className="pr-10" disabled />
             <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7 text-neutral-400" disabled>
               <ChevronRight className="size-4" />
             </Button>
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-80 left-64 bg-white border-t border-neutral-200 p-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
           <Button variant="outline">Save as draft</Button>
           <div className="flex gap-3">
             <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">Discard</Button>
             <Button className="bg-neutral-900 text-white" onClick={() => setShowConfirmDialog(true)}>Confirm and save plan</Button>
           </div>
        </div>
      </div>

      <ConfirmationDialog 
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={() => router.push('/dashboard')}
        title="Confirm Lesson Plan"
        description="This will save the lesson plan to your library."
      />
    </div>
  );
}
