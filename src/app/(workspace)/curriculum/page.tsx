"use client";

import { useState } from "react";
import { GraduationCap, BookOpen, CalendarRange, Layers, GitBranch, Tag, Search, Sparkles, MapPin, ChevronRight, Target, ShieldCheck, FileSearch, Plus, ArrowRight, X } from "lucide-react";
import { useTeachingContext } from "@/context/TeachingContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { mockCurriculum } from "@/data/mockData";
import SourceDrawer from "@/components/SourceDrawer";

export default function CurriculumExplorerPage() {
  const { grade, subject, term } = useTeachingContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedDrawerEvidence, setSelectedDrawerEvidence] = useState<any>(null);
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full min-h-0 relative">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto gap-6 pr-80"> {/* Padding right to accommodate fixed panel */}
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight">Curriculum Explorer</h1>
          <p className="text-neutral-500 text-sm">
            Search and review KICD-aligned curriculum evidence, then add it to your planning workspace.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select defaultValue={grade}>
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <GraduationCap className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Grade 4">Grade 4</SelectItem>
                <SelectItem value="Grade 5">Grade 5</SelectItem>
                <SelectItem value="Grade 6">Grade 6</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={subject}>
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <BookOpen className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Agriculture">Agriculture</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={term}>
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <CalendarRange className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={mockCurriculum.strand}>
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <Layers className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={mockCurriculum.strand}>{mockCurriculum.strand}</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={mockCurriculum.subStrand}>
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <GitBranch className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={mockCurriculum.subStrand}>{mockCurriculum.subStrand}</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="All content types">
              <SelectTrigger className="rounded-full w-auto gap-2 bg-white">
                <Tag className="size-3.5 text-neutral-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All content types">All content types</SelectItem>
                <SelectItem value="Specific Learning Outcomes">Specific Learning Outcomes</SelectItem>
                <SelectItem value="Suggested Learning Experiences">Suggested Learning Experiences</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="size-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input 
              className="rounded-xl h-12 pl-12 pr-28 text-sm bg-white"
              defaultValue="What are the learning outcomes and suggested experiences for soil conservation?"
            />
            <Button className="absolute right-2 top-1/2 -translate-y-1/2 h-8 bg-neutral-900 text-white gap-1.5 rounded-lg px-4">
              <Sparkles className="size-4" />
              Search
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <MapPin className="size-4" />
            <span>{grade} · {subject} ·</span>
            <span className="font-medium text-neutral-900">{mockCurriculum.strand}</span>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-neutral-900">{mockCurriculum.subStrand}</span>
          </div>
          <span className="text-sm text-neutral-500">2 evidence results</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-12">
          {/* Card 1 */}
          <Card className={`p-5 flex flex-col gap-3 transition-colors ${selectedItems.includes('item1') ? 'ring-2 ring-neutral-900 border-transparent' : ''}`}>
            <CardHeader className="p-0 gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedItems.includes('item1')} 
                    onCheckedChange={() => toggleSelection('item1')} 
                    className="mt-0.5"
                  />
                  <Badge variant="secondary" className="gap-1 bg-neutral-100 text-neutral-700 hover:bg-neutral-100">
                    <Target className="size-3" />
                    Specific Learning Outcomes
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <ShieldCheck className="size-3.5" />
                  KICD design · Page 13
                </div>
              </div>
              <span className="text-xs text-neutral-500 mt-1">
                {mockCurriculum.strand} › {mockCurriculum.subStrand}
              </span>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <p className="text-sm leading-relaxed">
                By the end of the sub-strand, the learner should be able to: a) identify methods of soil conservation in the locality; b) practise appropriate methods of conserving soil in the school farm; c) appreciate the importance of conserving soil for food production.
              </p>
            </CardContent>
            <CardFooter className="p-0 pt-2 flex justify-between items-center">
              <Button variant="link" size="sm" className="px-0 text-neutral-600 gap-1 h-auto" onClick={() => setSelectedDrawerEvidence(mockCurriculum)}>
                <FileSearch className="size-3.5" />
                View source
              </Button>
              <Button 
                size="sm" 
                variant={selectedItems.includes('item1') ? 'secondary' : 'default'}
                className={selectedItems.includes('item1') ? '' : 'bg-neutral-900 text-white'}
                onClick={() => toggleSelection('item1')}
              >
                {selectedItems.includes('item1') ? 'Added' : <><Plus className="size-3.5 mr-1" /> Add to planning</>}
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2 */}
          <Card className={`p-5 flex flex-col gap-3 transition-colors ${selectedItems.includes('item2') ? 'ring-2 ring-neutral-900 border-transparent' : ''}`}>
            <CardHeader className="p-0 gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedItems.includes('item2')} 
                    onCheckedChange={() => toggleSelection('item2')} 
                    className="mt-0.5"
                  />
                  <Badge variant="secondary" className="gap-1 bg-neutral-100 text-neutral-700 hover:bg-neutral-100">
                    <Target className="size-3" />
                    Suggested Learning Experiences
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <ShieldCheck className="size-3.5" />
                  KICD design · Page 14
                </div>
              </div>
              <span className="text-xs text-neutral-500 mt-1">
                {mockCurriculum.strand} › {mockCurriculum.subStrand}
              </span>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <p className="text-sm leading-relaxed">
                Learners are guided to: walk around the school compound to observe signs of soil erosion; discuss methods of conserving soil (mulching, cover cropping, terracing); make terraces or plant cover crops on the school farm; share experiences on soil conservation at home.
              </p>
            </CardContent>
            <CardFooter className="p-0 pt-2 flex justify-between items-center">
              <Button variant="link" size="sm" className="px-0 text-neutral-600 gap-1 h-auto" onClick={() => setSelectedDrawerEvidence(mockCurriculum)}>
                <FileSearch className="size-3.5" />
                View source
              </Button>
              <Button 
                size="sm" 
                variant={selectedItems.includes('item2') ? 'secondary' : 'default'}
                className={selectedItems.includes('item2') ? '' : 'bg-neutral-900 text-white'}
                onClick={() => toggleSelection('item2')}
              >
                {selectedItems.includes('item2') ? 'Added' : <><Plus className="size-3.5 mr-1" /> Add to planning</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right Fixed Panel for Selected Evidence */}
      <div className="w-80 border-l border-neutral-200 bg-neutral-50 absolute right-0 inset-y-0 flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Target className="size-4" />
            Selected evidence
          </h3>
          <Badge className="bg-neutral-900 hover:bg-neutral-900 rounded-full w-5 h-5 p-0 flex justify-center items-center">
            {selectedItems.length}
          </Badge>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedItems.length === 0 ? (
            <div className="text-center text-sm text-neutral-500 mt-10">
              Curriculum items you will carry into your term or lesson plan will appear here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedItems.includes('item1') && (
                <Card className="p-3 shadow-sm border-neutral-200 relative">
                  <button onClick={() => toggleSelection('item1')} className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700">
                    <X className="size-3.5" />
                  </button>
                  <h4 className="text-xs font-semibold mb-1 pr-6">Specific Learning Outcomes</h4>
                  <div className="text-[10px] text-neutral-500 flex items-center gap-1 mb-2">
                    <ShieldCheck className="size-3" /> KICD design · Page 13
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2">
                    By the end of the sub-strand, the learner should be able to...
                  </p>
                </Card>
              )}
              {selectedItems.includes('item2') && (
                <Card className="p-3 shadow-sm border-neutral-200 relative">
                  <button onClick={() => toggleSelection('item2')} className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700">
                    <X className="size-3.5" />
                  </button>
                  <h4 className="text-xs font-semibold mb-1 pr-6">Suggested Learning Experiences</h4>
                  <div className="text-[10px] text-neutral-500 flex items-center gap-1 mb-2">
                    <ShieldCheck className="size-3" /> KICD design · Page 14
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-2">
                    Learners are guided to: walk around the school compound to observe...
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-neutral-200 bg-white flex flex-col gap-2">
          <div className="text-xs text-neutral-500 text-center mb-1">
            {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} ready to add to a plan
          </div>
          <Button 
            className="w-full bg-neutral-900 text-white gap-2"
            disabled={selectedItems.length === 0}
          >
            <ArrowRight className="size-4" /> Use selected evidence
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-sm"
            onClick={() => setSelectedItems([])}
            disabled={selectedItems.length === 0}
          >
            Clear selection
          </Button>
        </div>
      </div>

      <SourceDrawer 
        open={!!selectedDrawerEvidence} 
        onClose={() => setSelectedDrawerEvidence(null)}
        evidence={selectedDrawerEvidence}
      />
    </div>
  );
}
