# CBC Teacher Workflow Agent - UI Screens

This folder contains React/TSX component files for the CBC (Competency-Based Curriculum) Teacher Workflow Agent interface. All screens are designed for a Kenyan education context, aligned with KICD (Kenya Institute for Curriculum Development) standards.

## Screens Overview

### Screen 1: Teaching Context Setup
**File:** `Screen1-TeachingContextSetup.tsx`

First-time onboarding screen where teachers configure their teaching context:
- Grade level selection (Grade 4-7)
- Subject/Learning Area (Agriculture, Mathematics, English, Science & Technology)
- Term selection (Term 1-3)
- Academic Year selection
- Class/Stream designation (e.g., 5 East)

**Purpose:** Filters all curriculum evidence and drafts throughout the workspace to match the selected context.

---

### Screen 2: Teacher Dashboard
**File:** `Screen2-TeacherDashboard.tsx`

Main home/dashboard screen showing:
- Persistent left sidebar navigation (Home, Curriculum Explorer, Term Plans, Daily Lessons, Reflections, My Library)
- Top context bar with Grade 5 · Agriculture · Term 1 · 2026 · 5 East
- Global search for curriculum queries
- Three action cards: Explore curriculum, Prepare term plan, Prepare today's lesson
- Amber "Reflect on a lesson" action panel (alerts to pending reflections)
- Continue working section showing unfinished drafts and pending reflections
- Recent curriculum access history
- Term plan progress indicator (workflow progress, not learner achievement)

**Purpose:** Central hub for all teacher planning activities and quick access to pending work.

---

### Screen 3: Curriculum Explorer
**File:** `Screen3-CurriculumExplorer.tsx`

Search and discovery interface for KICD curriculum evidence:
- Structured filters: Grade, Subject/Learning Area, Term, Strand, Sub-strand, Content type
- Natural language search box with AI-powered semantic search
- Evidence cards showing different content types:
  - Specific Learning Outcomes
  - Suggested Learning Experiences
  - Key Inquiry Questions
  - Core Competencies
  - Values
  - Resources
  - Assessment Guidance
- Source attribution (KICD design · Page X)
- Right-side "Selected evidence" drawer for collected items
- "Use selected evidence" action button

**Purpose:** Teachers discover and collect official curriculum evidence to use in planning.

---

### Screen 4: Source and Evidence Drawer
**File:** (Content retrieved but file save encountered error - requires separate handling)

Expandable drawer showing detailed curriculum evidence:
- Official KICD document title and metadata
- Source page numbers
- Curriculum section hierarchy
- Reconstructed table excerpts or raw text
- Clear labeling of "Official curriculum evidence" vs "AI summary" vs "Teacher input"
- No AI confidence scores displayed
- "View source" and close controls

**Purpose:** Deep inspection of curriculum evidence sources for teacher verification.

---

### Screen 5: Term Plan Workspace
**File:** `Screen5-TermPlanWorkspace.tsx`

Two-column planning interface:

**Left column - Official Curriculum Evidence:**
- Strand and Sub-strand navigation
- Specific Learning Outcomes (bulleted list)
- Suggested Learning Experiences (bulleted list)
- Key Inquiry Questions (bulleted list)
- Core Competencies (badge pills)
- Values (badge pills)
- Pertinent & Contemporary Issues (badge pills)
- Resources (text description)
- Assessment Guidance (text description)
- "Ask assistant" button for contextual help

**Right column - Scheme of Work Table:**
- Editable table with columns: Week, Strand, Sub-strand, Specific Learning Outcomes, Suggested Learning Experiences, Resources, Assessment, Reflection/Remarks
- Example data for Grade 5 Agriculture (Soil Conservation)
- Inline-editable cells with pencil icons
- Amber "draft" badge indicating unsaved work

**Purpose:** Teachers combine official curriculum evidence with structured planning (scheme of work).

---

### Screen 6: Draft Review & Confirmation
**File:** `Screen6-DraftReviewConfirmation.tsx`

Multi-section review screen before final confirmation:

**Top Alert Banner:**
- Prominent amber warning: "This is an AI-assisted draft. Review it against the cited curriculum evidence before confirming."

**Section 1 - Curriculum Evidence Used:**
- Lists all official KICD sources cited
- Source page references
- Green "Official evidence" badge
- "View source" links for verification

**Section 2 - AI-Assisted Organization:**
- Shows how the assistant arranged evidence into scheme-of-work format
- Blue "AI generated" badge
- Sample table preview
- Explanatory text about the arrangement

**Section 3 - Teacher Edits and Notes:**
- Displays teacher modifications and contextual notes
- Example: "Adjusted resources for Week 2" with explanation
- Neutral "Teacher input" badge

**Action Buttons:**
- Edit draft (secondary)
- Keep as draft (secondary)
- Discard (destructive/red)
- Confirm and save (primary/dark)

**Purpose:** Final quality gate before saving as official teacher work product. Ensures transparency about AI involvement and curriculum evidence used.

---

## Design System

### Colors
- Primary accent: Green/Teal `oklch(0.45_0.07_165)` - education, growth
- Secondary accent: Navy/Charcoal `oklch(0.25_0.02_240)` - professional
- Amber/Warning: `oklch(0.55_0.13_65)` - action needed, drafts
- Green/Official: `oklch(0.42_0.09_180)` - trusted curriculum evidence
- Blue/AI: `oklch(0.45_0.13_255)` - AI-generated content

### Typography
- Headings: Semibold, tracking-tight
- Body: Regular leading-relaxed
- Labels: Medium text-xs
- Button text: Medium

### Layout
- Desktop-medium breakpoint: 1440x1024px
- Persistent 256px left sidebar
- Max-content width: 4xl (56rem)
- Card shadows: subtle (shadow-sm)
- Border radius: rounded-lg (0.5rem) for cards, rounded-xl (0.75rem) for major sections

### Icons
- Lucide React icons throughout
- Size modifiers: size-3, size-3.5, size-4, size-4.5, size-5, size-5.5, size-6
- Color: Inherit from text color or explicit oklch values

---

## Implementation Notes

### Dependencies
- React/TSX
- shadcn/ui components (Card, Button, Badge, Select, Input, etc.)
- Lucide React icons
- Tailwind CSS (OKLCH color space)

### Accessibility
- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast colors for readability
- Clear focus states

### Mock Data
All screens display "Prototype / Mock data" labels indicating they are not connected to live KICD databases. Content is representative but not from actual KICD curriculum.

---

## File Structure

```
screens/
├── Screen1-TeachingContextSetup.tsx
├── Screen2-TeacherDashboard.tsx
├── Screen3-CurriculumExplorer.tsx
├── Screen5-TermPlanWorkspace.tsx
├── Screen6-DraftReviewConfirmation.tsx
├── Screen4-SourceAndEvidenceDrawer.tsx (To be created)
└── README.md (this file)
```

---

## Next Steps

1. **Connect to Backend:** Replace mock data with actual KICD curriculum evidence API calls
2. **Implement Navigation:** Wire up sidebar links and action buttons to route between screens
3. **Add State Management:** Implement context selection persistence across screens
4. **Integrate Forms:** Make editable table cells functional with save/validation
5. **Add AI Assistant:** Connect to agent for curriculum evidence retrieval and organization
6. **User Testing:** Validate with Kenyan teachers for usability and context relevance

---

## Design References

- KICD Competency-Based Curriculum framework
- Kenyan primary education standards (Grades 4-7)
- Professional SaaS education tools (e.g., curriculum planning platforms)
- Material Design accessibility guidelines
