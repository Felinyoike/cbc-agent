/**
 * Prototype data for the CBC Teacher Workflow Agent.
 *
 * IMPORTANT: none of this is live KICD data. It is hand-written mock content
 * shaped like the official Grade 5 curriculum designs so the workflow can be
 * validated. Every screen that renders it must keep the "Prototype / Mock data"
 * label visible, and nothing here may be presented as an official KICD document.
 */

export type ContentCategory =
  | "Specific Learning Outcomes"
  | "Suggested Learning Experiences"
  | "Key Inquiry Questions"
  | "Core Competencies"
  | "Values"
  | "Pertinent and Contemporary Issues"
  | "Resources"
  | "Assessment";

/** Where a piece of content came from — drives the labelling rules across the UI. */
export type ProvenanceKind = "official" | "ai" | "teacher";

export interface EvidenceItem {
  id: string;
  category: ContentCategory;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  page: number;
  designTitle: string;
  content: string;
  /** How the source drawer should describe the excerpt it shows. */
  sourceRendering: "reconstructed-table" | "raw-text";
  sourceExcerpt: string;
}

const AGRICULTURE_DESIGN = "KICD Grade 5 Agriculture Curriculum Design";
const MATHEMATICS_DESIGN = "KICD Grade 5 Mathematics Curriculum Design";

export const evidenceItems: EvidenceItem[] = [
  {
    id: "ev-agri-slo-13",
    category: "Specific Learning Outcomes",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "By the end of the sub-strand, the learner should be able to: a) identify methods of soil conservation in the locality; b) practise appropriate methods of conserving soil in the school farm; c) appreciate the importance of conserving soil for food production.",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Strand 2.0 Food Production Processes | Sub-strand 2.3 Soil Conservation (4 lessons)\nSpecific Learning Outcomes:\nBy the end of the sub-strand, the learner should be able to:\n  a) identify methods of soil conservation in the locality,\n  b) practise appropriate methods of conserving soil in the school farm,\n  c) appreciate the importance of conserving soil for food production.",
  },
  {
    id: "ev-agri-sle-13",
    category: "Suggested Learning Experiences",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "Learners are guided to: walk around the school compound to observe signs of soil erosion; discuss methods of conserving soil (mulching, cover cropping, terracing); make terraces or plant cover crops on the school farm; share experiences on soil conservation at home.",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Suggested Learning Experiences\nLearners are guided to:\n  • walk around the school compound to observe signs of soil erosion,\n  • discuss methods of conserving soil (mulching, cover cropping, terracing),\n  • make terraces or plant cover crops on the school farm,\n  • share experiences on soil conservation at home.",
  },
  {
    id: "ev-agri-kiq-13",
    category: "Key Inquiry Questions",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "1. Why is it important to conserve soil? 2. What methods can be used to conserve soil in our locality?",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Key Inquiry Question(s)\n  1. Why is it important to conserve soil?\n  2. What methods can be used to conserve soil in our locality?",
  },
  {
    id: "ev-agri-comp-13",
    category: "Core Competencies",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "Communication and collaboration — as learners discuss and work together on the school farm. Learning to learn — as they observe and practise soil conservation methods in their environment.",
    sourceRendering: "raw-text",
    sourceExcerpt:
      "Core Competencies to be developed:\n  • Communication and collaboration: learners discuss and work together on the school farm.\n  • Learning to learn: learners observe and practise soil conservation methods in their environment.",
  },
  {
    id: "ev-agri-values-13",
    category: "Values",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "Responsibility — as learners take care of the soil and school environment. Unity — as they cooperate while working together on soil conservation activities.",
    sourceRendering: "raw-text",
    sourceExcerpt:
      "Values:\n  • Responsibility: learners take care of the soil and the school environment.\n  • Unity: learners cooperate while working together on soil conservation activities.",
  },
  {
    id: "ev-agri-pci-14",
    category: "Pertinent and Contemporary Issues",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 14,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "Environmental conservation — learners appreciate the link between soil care and a healthy environment. Food security — learners connect conserved soil to reliable food production in the community.",
    sourceRendering: "raw-text",
    sourceExcerpt:
      "Pertinent and Contemporary Issues (PCIs):\n  • Environmental conservation and protection.\n  • Food security and sustainable agriculture.",
  },
  {
    id: "ev-agri-res-13",
    category: "Resources",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "School farm, jembes and rakes, digital devices, charts on soil erosion, resource persons from the community, KICD approved course books.",
    sourceRendering: "raw-text",
    sourceExcerpt:
      "Suggested Learning Resources: school farm, jembes and rakes, digital devices, charts showing soil erosion, resource persons from the community, KICD approved course books.",
  },
  {
    id: "ev-agri-assess-13",
    category: "Assessment",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    page: 13,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "Assess the learner's ability to identify methods of soil conservation and to practise appropriate conservation methods on the school farm. Use observation schedules, oral questions, and a rubric on level of participation in conservation activities (Exceeds / Meets / Approaches / Below expectation).",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Suggested Assessment | Observation schedule, oral questions, practical work on the school farm.\nRubric levels: Exceeds expectation | Meets expectation | Approaches expectation | Below expectation.",
  },
  {
    id: "ev-agri-slo-15",
    category: "Specific Learning Outcomes",
    grade: "Grade 5",
    subject: "Agriculture",
    strand: "Food Production Processes",
    subStrand: "Crop Farming Practices",
    page: 15,
    designTitle: AGRICULTURE_DESIGN,
    content:
      "By the end of the sub-strand, the learner should be able to: a) identify crop farming practices carried out in the locality; b) carry out selected crop farming practices in the school farm; c) value crop farming as a source of food and income.",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Strand 2.0 Food Production Processes | Sub-strand 2.4 Crop Farming Practices (5 lessons)\nSpecific Learning Outcomes:\n  a) identify crop farming practices carried out in the locality,\n  b) carry out selected crop farming practices in the school farm,\n  c) value crop farming as a source of food and income.",
  },
  {
    id: "ev-math-slo-8",
    category: "Specific Learning Outcomes",
    grade: "Grade 5",
    subject: "Mathematics",
    strand: "Numbers",
    subStrand: "Whole Numbers",
    page: 8,
    designTitle: MATHEMATICS_DESIGN,
    content:
      "By the end of the sub-strand, the learner should be able to: a) read and write numbers up to 1,000,000 in symbols and words; b) order and compare whole numbers up to 1,000,000; c) appreciate the use of large numbers in real life.",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Strand 1.0 Numbers | Sub-strand 1.1 Whole Numbers (12 lessons)\nSpecific Learning Outcomes:\n  a) read and write numbers up to 1,000,000 in symbols and in words,\n  b) order and compare whole numbers up to 1,000,000,\n  c) appreciate the use of large numbers in real life situations.",
  },
  {
    id: "ev-math-sle-8",
    category: "Suggested Learning Experiences",
    grade: "Grade 5",
    subject: "Mathematics",
    strand: "Numbers",
    subStrand: "Whole Numbers",
    page: 8,
    designTitle: MATHEMATICS_DESIGN,
    content:
      "Learners are guided to: use place value charts to read and write numbers up to 1,000,000; play number games in groups; use digital devices to practise ordering numbers; relate large numbers to prices and populations in their county.",
    sourceRendering: "reconstructed-table",
    sourceExcerpt:
      "Suggested Learning Experiences\nLearners are guided to:\n  • use place value charts to read and write numbers up to 1,000,000,\n  • play number games in groups,\n  • use digital devices to practise ordering numbers,\n  • relate large numbers to prices and populations in their county.",
  },
];

export const contentCategories: ContentCategory[] = [
  "Specific Learning Outcomes",
  "Suggested Learning Experiences",
  "Key Inquiry Questions",
  "Core Competencies",
  "Values",
  "Pertinent and Contemporary Issues",
  "Resources",
  "Assessment",
];

export const grades = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];
export const subjects = ["Agriculture", "Mathematics", "English", "Science & Technology"];
export const terms = ["Term 1", "Term 2", "Term 3"];
export const academicYears = ["2025", "2026", "2027"];
export const classes = ["5 East", "5 West", "5 North", "5 South"];

export const strandsBySubject: Record<string, string[]> = {
  Agriculture: ["Food Production Processes", "Conserving Resources", "Crop Production"],
  Mathematics: ["Numbers", "Measurement", "Geometry"],
  English: ["Listening and Speaking", "Reading", "Writing"],
  "Science & Technology": ["Living Things", "Force and Energy", "Digital Technology"],
};

export const subStrandsByStrand: Record<string, string[]> = {
  "Food Production Processes": ["Soil Conservation", "Crop Farming Practices", "Water Conservation"],
  "Conserving Resources": ["Soil Improvement", "Water Harvesting"],
  "Crop Production": ["Vegetable Growing", "Fruit Growing"],
  Numbers: ["Whole Numbers", "Fractions", "Decimals"],
  Measurement: ["Length", "Mass", "Capacity"],
  Geometry: ["Lines", "Angles"],
};

/* ------------------------------------------------------------------ */
/* Term plan (scheme of work)                                          */
/* ------------------------------------------------------------------ */

export type RowStatus = "draft" | "reviewed" | "confirmed";

export interface TermPlanRow {
  id: string;
  week: string;
  lessons: string;
  strand: string;
  subStrand: string;
  keyInquiryQuestion: string;
  outcomes: string;
  experiences: string;
  resources: string;
  assessment: string;
  reflection: string;
  status: RowStatus;
  /** Evidence ids the row was built from — drives the citations on review. */
  evidenceIds: string[];
}

/* ------------------------------------------------------------------ */
/* Daily lessons                                                       */
/* ------------------------------------------------------------------ */

export type LessonStatus = "draft" | "ready" | "taught" | "awaiting-reflection" | "reflected";

export interface Lesson {
  id: string;
  week: string;
  date: string;
  strand: string;
  subStrand: string;
  title: string;
  status: LessonStatus;
  termPlanRowId: string;
}

export const initialLessons: Lesson[] = [
  {
    id: "lesson-1",
    week: "3",
    date: "2026-01-19",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    title: "Signs of soil erosion around the school — Lesson 1",
    status: "reflected",
    termPlanRowId: "row-w3",
  },
  {
    id: "lesson-2",
    week: "3",
    date: "2026-01-21",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    title: "Methods of conserving soil — Lesson 2",
    status: "taught",
    termPlanRowId: "row-w3",
  },
  {
    id: "lesson-3",
    week: "4",
    date: "2026-01-26",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    title: "Making terraces on the school farm — Lesson 3",
    status: "awaiting-reflection",
    termPlanRowId: "row-w4",
  },
  {
    id: "lesson-4",
    week: "4",
    date: "2026-01-28",
    strand: "Food Production Processes",
    subStrand: "Soil Conservation",
    title: "Soil Conservation — Lesson 4",
    status: "awaiting-reflection",
    termPlanRowId: "row-w4",
  },
  {
    id: "lesson-5",
    week: "5",
    date: "2026-02-02",
    strand: "Food Production Processes",
    subStrand: "Crop Farming Practices",
    title: "Crop farming practices in our locality — Lesson 5",
    status: "draft",
    termPlanRowId: "row-w5",
  },
  {
    id: "lesson-6",
    week: "5",
    date: "2026-02-04",
    strand: "Food Production Processes",
    subStrand: "Crop Farming Practices",
    title: "Interviewing a local farmer — Lesson 6",
    status: "ready",
    termPlanRowId: "row-w5",
  },
];

export interface LessonPlanDraft {
  title: string;
  date: string;
  duration: string;
  roll: string;
  outcomes: string;
  keyInquiryQuestion: string;
  competencies: string;
  valuesAndPcis: string;
  resources: string;
  introduction: string;
  development: string[];
  assessmentActivity: string;
  conclusion: string;
  teacherNotes: string;
}

/** A genuinely empty draft: new and discarded lesson plans start here, not from sample content. */
export const emptyLessonPlan: LessonPlanDraft = {
  title: "",
  date: "",
  duration: "",
  roll: "",
  outcomes: "",
  keyInquiryQuestion: "",
  competencies: "",
  valuesAndPcis: "",
  resources: "",
  introduction: "",
  development: [],
  assessmentActivity: "",
  conclusion: "",
  teacherNotes: "",
};

/* ------------------------------------------------------------------ */
/* Reflections                                                         */
/* ------------------------------------------------------------------ */

export type OutcomeStatus =
  | "achieved"
  | "partially-achieved"
  | "not-yet-achieved"
  | "insufficient-evidence";

export const outcomeStatusLabels: Record<OutcomeStatus, string> = {
  achieved: "Achieved",
  "partially-achieved": "Partially achieved",
  "not-yet-achieved": "Not yet achieved",
  "insufficient-evidence": "Insufficient evidence",
};

export interface ReflectionRecord {
  id: string;
  lessonId: string;
  lessonTitle: string;
  date: string;
  status: "pending" | "draft" | "confirmed";
  outcomeStatus: OutcomeStatus | null;
  evidence: {
    learnerActions: string;
    workEvidence: string;
    needSupport: string;
    difficulties: string;
    revisit: string;
  };
}

export const initialReflections: ReflectionRecord[] = [
  {
    id: "ref-1",
    lessonId: "lesson-1",
    lessonTitle: "Signs of soil erosion around the school — Lesson 1",
    date: "2026-01-19",
    status: "confirmed",
    outcomeStatus: "partially-achieved",
    evidence: {
      learnerActions:
        "Most groups pointed out rills near the football pitch and named running water as the cause. Two groups could not explain why the slope eroded faster.",
      workEvidence:
        "Group observation sheets collected; 5 of 7 sheets listed at least three signs of erosion.",
      needSupport: "Group 2 and Group 6 — struggled to link slope to erosion rate.",
      difficulties: "The walk took longer than planned, so the discussion was rushed.",
      revisit: "Re-open the slope-and-erosion link at the start of Lesson 2 using the chart.",
    },
  },
  {
    id: "ref-2",
    lessonId: "lesson-3",
    lessonTitle: "Making terraces on the school farm — Lesson 3",
    date: "2026-01-26",
    status: "pending",
    outcomeStatus: null,
    evidence: {
      learnerActions: "",
      workEvidence: "",
      needSupport: "",
      difficulties: "",
      revisit: "",
    },
  },
  {
    id: "ref-3",
    lessonId: "lesson-4",
    lessonTitle: "Soil Conservation — Lesson 4",
    date: "2026-01-28",
    status: "pending",
    outcomeStatus: null,
    evidence: {
      learnerActions: "",
      workEvidence: "",
      needSupport: "",
      difficulties: "",
      revisit: "",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Assistant                                                           */
/* ------------------------------------------------------------------ */

export const assistantSuggestedPrompts = [
  "Explain this learning outcome in simpler language.",
  "Suggest an activity using locally available resources.",
  "Show which curriculum evidence supports this section.",
  "Help me identify what I still need to decide.",
];

export const teacher = {
  name: "Ms. A. Wanjiru",
  shortName: "A. Wanjiru",
  role: "Class Teacher",
  school: "Kiambu Primary School",
};
