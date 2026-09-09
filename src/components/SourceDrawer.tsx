"use client";

import { X, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SourceDrawerProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evidence: any;
}

export default function SourceDrawer({ open, onClose, evidence }: SourceDrawerProps) {
  if (!open || !evidence) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-neutral-200">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-700 border-emerald-600/40 bg-emerald-50">
                Official curriculum evidence
              </Badge>
              <Badge variant="outline" className="text-neutral-500 border-neutral-200 bg-neutral-100">
                Prototype data
              </Badge>
            </div>
            <h2 className="text-xl font-semibold mt-2">KICD {evidence.grade} {evidence.subject} Curriculum Design</h2>
            <span className="text-sm text-neutral-500">{evidence.grade} · {evidence.subject} (Learning Area)</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="self-start">
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex gap-8 px-6 py-4 border-b border-neutral-200 bg-neutral-50 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-500 uppercase font-semibold">Source Page</span>
            <span className="font-medium flex items-center gap-1.5"><FileText className="size-3.5" /> Page {evidence.page || 13}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-neutral-500 uppercase font-semibold">Curriculum Section</span>
            <span className="font-medium">{evidence.strand} &gt; {evidence.subStrand}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="official">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="official">Official evidence</TabsTrigger>
              <TabsTrigger value="ai">AI summary</TabsTrigger>
              <TabsTrigger value="teacher">Teacher input</TabsTrigger>
            </TabsList>
            
            <TabsContent value="official" className="flex flex-col gap-6 mt-0">
              <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs p-3 rounded-lg flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5" />
                <p>Shown as a reconstructed table excerpt, not raw extracted text.</p>
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-hidden text-sm">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left font-medium p-3">Sub-strand</th>
                      <th className="text-left font-medium p-3">Specific Learning Outcomes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {evidence.outcomes?.map((outcome: string, i: number) => (
                      <tr key={i}>
                        <td className="p-3 align-top">{evidence.subStrand}</td>
                        <td className="p-3 align-top">{outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {evidence.questions && (
                <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">Key Inquiry Questions</h4>
                  <p className="text-sm">{evidence.questions.join(" ")}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase">Official-source links</h4>
                <Button variant="outline" className="w-full justify-start text-neutral-600 font-normal border-dashed" disabled>
                  <ExternalLink className="size-4 mr-2" />
                  Official KICD portal link (placeholder)
                </Button>
                <Button variant="outline" className="w-full justify-start text-neutral-600 font-normal border-dashed" disabled>
                  <Download className="size-4 mr-2" />
                  Download source PDF (placeholder)
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="ai" className="mt-0">
              <div className="text-sm text-neutral-500 italic p-4 text-center">
                AI summary is not available for this prototype data.
              </div>
            </TabsContent>
            
            <TabsContent value="teacher" className="mt-0">
              <div className="text-sm text-neutral-500 italic p-4 text-center">
                No teacher input recorded for this source.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 border-t border-neutral-200 flex justify-between bg-white">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-neutral-900 text-white">Add to planning workspace</Button>
        </div>
      </div>
    </>
  );
}

// Ensure icon imports for the file since I used them inline
import { FileText, Info } from "lucide-react";
