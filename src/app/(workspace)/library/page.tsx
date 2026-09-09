"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeachingContext } from "@/context/TeachingContext";
import { FileText, CalendarDays, CheckCircle2, MoreHorizontal } from "lucide-react";

export default function LibraryPage() {
  const { grade, subject } = useTeachingContext();

  const libraryItems = [
    {
      id: 1,
      type: "Scheme of Work",
      title: "Food Production Processes",
      grade: grade,
      subject: subject,
      term: "Term 1",
      updatedAt: "2 days ago",
      icon: FileText
    },
    {
      id: 2,
      type: "Lesson Plan",
      title: "Soil Conservation Methods",
      grade: grade,
      subject: subject,
      term: "Term 1, Week 1",
      updatedAt: "Yesterday",
      icon: CalendarDays
    },
    {
      id: 3,
      type: "Reflection",
      title: "Soil Conservation Methods",
      grade: grade,
      subject: subject,
      term: "Term 1, Week 1",
      updatedAt: "Today",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="flex flex-col h-full bg-neutral-50/50">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-2xl tracking-tight">My Library</h1>
            <p className="text-neutral-500 text-sm">
              Your confirmed teacher work products across all classes.
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="schemes">Schemes</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 text-xs font-medium uppercase tracking-wide">
                    <tr>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium">Document Name</th>
                      <th className="p-4 font-medium">Context</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Last Updated</th>
                      <th className="p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {libraryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50 transition-colors cursor-pointer group">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500">
                              <item.icon className="size-4" />
                            </div>
                            <span className="font-medium text-neutral-700">{item.type}</span>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-neutral-900">{item.title}</td>
                        <td className="p-4 text-neutral-500">{item.grade} · {item.subject} · {item.term}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Confirmed</Badge>
                        </td>
                        <td className="p-4 text-neutral-500">{item.updatedAt}</td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="text-center p-8 text-sm text-neutral-500">
                <p>Unconfirmed drafts appear in your Term Plans and Daily Lessons pages.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
