"use client";

import { useTeachingContext } from "@/context/TeachingContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockCurriculum } from "@/data/mockData";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermPlansPage() {
  const { grade, subject, term, year, className } = useTeachingContext();
  const router = useRouter();

  const handleReview = () => {
    router.push("/term-plans/review");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        <div className="flex justify-between items-start gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-2xl tracking-tight">Draft term plan</h1>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none font-medium">
                Draft
              </Badge>
            </div>
            <p className="text-neutral-500 text-sm">
              {grade} · {subject} · {term} · {className} · Academic Year {year}
            </p>
          </div>
          <div className="min-w-56 flex flex-col items-end gap-2">
            <span className="font-medium text-sm">2 of 10 planning units reviewed</span>
            <div className="w-56 bg-neutral-100 rounded-full h-2 overflow-hidden">
              <div className="bg-neutral-900 h-full rounded-full" style={{ width: '20%' }}></div>
            </div>
            <span className="text-xs text-neutral-500">Workflow progress, not learner achievement</span>
          </div>
        </div>

        <div className="grid grid-cols-[380px_1fr] gap-6 items-start">
          {/* Left Column - KICD Evidence */}
          <Card className="p-6 sticky top-0 shadow-sm border-neutral-200">
            <CardHeader className="p-0 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50 gap-1.5">
                  <ShieldCheck className="size-3.5" /> Official curriculum evidence
                </Badge>
              </div>
              <div className="text-sm flex items-center gap-1.5">
                <span className="font-medium text-neutral-900">{mockCurriculum.strand}</span>
                <ChevronRight className="size-3.5 text-neutral-400" />
                <span className="font-medium text-neutral-900">{mockCurriculum.subStrand}</span>
              </div>
              <span className="text-xs text-neutral-500">KICD design · Page 13</span>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Specific Learning Outcomes</span>
                <ul className="list-disc pl-4 text-sm flex flex-col gap-1 text-neutral-800">
                  {mockCurriculum.outcomes.map((outcome, i) => (
                    <li key={i}>{outcome}</li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Suggested Learning Experiences</span>
                <ul className="list-disc pl-4 text-sm flex flex-col gap-1 text-neutral-800">
                  {mockCurriculum.experiences.map((exp, i) => (
                    <li key={i}>{exp}</li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Key Inquiry Questions</span>
                <ul className="list-disc pl-4 text-sm flex flex-col gap-1 text-neutral-800">
                  {mockCurriculum.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Core Competencies</span>
                <div className="flex flex-wrap gap-2">
                  {mockCurriculum.competencies.map((comp, i) => (
                    <Badge key={i} variant="secondary" className="bg-neutral-100 font-normal">{comp}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Values</span>
                <div className="flex flex-wrap gap-2">
                  {mockCurriculum.values.map((v, i) => (
                    <Badge key={i} variant="secondary" className="bg-neutral-100 font-normal">{v}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-neutral-500 tracking-wide">Resources</span>
                <p className="text-sm text-neutral-800">{mockCurriculum.resources.join(", ")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Scheme of Work Table */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Scheme of work</h2>
              <span className="text-sm text-neutral-500 italic">Click a cell to edit</span>
            </div>
            
            <div className="rounded-xl border border-neutral-200 overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-700 text-xs font-semibold">
                  <tr>
                    <th className="p-3 min-w-[60px]">Week</th>
                    <th className="p-3 min-w-[120px]">Strand</th>
                    <th className="p-3 min-w-[120px]">Sub-strand</th>
                    <th className="p-3 min-w-[200px]">Specific Learning Outcomes</th>
                    <th className="p-3 min-w-[200px]">Suggested Learning Experiences</th>
                    <th className="p-3 min-w-[150px]">Resources</th>
                    <th className="p-3 min-w-[150px]">Assessment</th>
                    <th className="p-3 min-w-[150px]">Reflection/Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {/* Row 1 */}
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-medium mb-2">1</div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0">draft</Badge>
                    </td>
                    <td className="p-3 align-top text-neutral-600">Food Production Processes</td>
                    <td className="p-3 align-top text-neutral-600">Soil Conservation</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Identify methods of soil conservation</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Learners discuss and identify local methods</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Soil samples, hoes, charts</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Observation, oral questions</td>
                    <td className="p-3 align-top italic text-neutral-400">To be completed after lesson</td>
                  </tr>
                  {/* Row 2 */}
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-medium mb-2">2</div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0">draft</Badge>
                    </td>
                    <td className="p-3 align-top text-neutral-600">Food Production Processes</td>
                    <td className="p-3 align-top text-neutral-600">Soil Conservation</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Explain the importance of conserving soil</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Demonstrate terracing on a model plot</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Soil model, learner&apos;s book pg 24</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Practical checklist</td>
                    <td className="p-3 align-top italic text-neutral-400">To be completed after lesson</td>
                  </tr>
                  {/* Row 3 */}
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-medium mb-2">3</div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-1.5 py-0">draft</Badge>
                    </td>
                    <td className="p-3 align-top text-neutral-600">Food Production Processes</td>
                    <td className="p-3 align-top text-neutral-600">Soil Conservation</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Practise a soil conservation method at home</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Home-based project on gully control</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Watering can, hoe, notebook</td>
                    <td className="p-3 align-top" contentEditable suppressContentEditableWarning>Project report rubric</td>
                    <td className="p-3 align-top italic text-neutral-400">To be completed after lesson</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer sticky bar */}
      <div className="fixed bottom-0 right-0 left-64 bg-white border-t border-neutral-200 p-4 z-10 flex justify-between items-center px-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <p className="text-xs text-neutral-500 max-w-lg">
          This is a teacher draft, not official KICD content. Review it against the cited curriculum evidence before confirming.
        </p>
        <div className="flex gap-3">
          <Button variant="outline">Save as draft</Button>
          <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">Discard draft</Button>
          <Button className="bg-neutral-900 text-white" onClick={handleReview}>Review before confirmation</Button>
        </div>
      </div>
    </div>
  );
}
