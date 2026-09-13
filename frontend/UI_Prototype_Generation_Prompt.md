# UI Prototype Generation Prompt: CBC Teacher Workflow Agent

Copy and paste the following prompt into the UI-prototyping tool of your choice.

---

## Prompt

Design a high-fidelity UI prototype for a **KICD-grounded CBC Teacher Workflow Agent** for Kenyan schools.

The product helps teachers work with the Competency-Based Curriculum by connecting official KICD curriculum designs to the planning formats teachers already understand: termly schemes of work, daily lesson plans, and post-lesson evaluation records.

### Product direction

Create a **workflow-first teacher workspace**, not a generic chatbot. The teacher should move through a clear sequence:

> **Set teaching context → Explore curriculum → Select curriculum content → Prepare term plan → Prepare daily lesson → Teach → Record post-lesson evidence → Review and plan follow-up**

The product should eventually support an entire school, with multiple teachers and school-level administration. However, this prototype is an **MVP for one teacher**. Show enough school-ready structure that the product can grow later, but do not make school administration the center of the experience.

Use a **desktop-first planning workspace**, optimized for a 1440px-wide desktop screen. Also create responsive mobile states intended primarily for reviewing plans, checking lesson details, and recording quick post-lesson notes. Do not make the mobile version a full replacement for the desktop planning workspace.

Use a calm, professional, education-oriented visual language. The interface should feel practical, trustworthy, organized, and suitable for everyday use by Kenyan CBC teachers. Avoid a futuristic or overly decorative AI aesthetic.

### Important design principles

1. Use familiar structures and terminology from official KICD curriculum designs and the sample scheme-of-work and lesson-plan formats that Kenyan CBC teachers currently use.
2. Use the following curriculum terms visibly and consistently: **Grade, Learning Area/Subject, Term, Strand, Sub-strand, Specific Learning Outcomes, Suggested Learning Experiences, Key Inquiry Questions, Core Competencies, Values, Pertinent and Contemporary Issues, Resources, Assessment, Reflection, and Follow-up Action**.
3. Make the workflow easier than manually preparing documents, but do not hide the teacher’s decisions behind one large “Generate” button.
4. The AI assistant should support the teacher inside the workflow. It should not dominate the interface.
5. Distinguish clearly between official curriculum content, AI-generated suggestions, and teacher-entered content.
6. Use realistic mock content for Grade 5 Agriculture and one additional subject such as Grade 5 Mathematics. The mock content should be visibly labelled as prototype data and should not claim to be an official KICD document unless a source citation is shown.
7. Do not implement data acquisition, web scraping, vector databases, or live model calls in this prototype. Use mock data and simulated interactions.
8. Do not add automatic saving of generated schemes, lesson plans, or evaluation records. The prototype must demonstrate a confirmation step before anything becomes a confirmed teacher artifact.
9. Do not infer that learners achieved an objective simply because a lesson was delivered. Post-lesson evaluation must be based on teacher-provided evidence.
10. Do not describe generated content as an official KICD template. Label it as a teacher draft or AI-assisted draft.

### Main application shell

Create a persistent application shell with:

- A compact left navigation rail or sidebar.
- A top context bar showing the active **Grade, Subject, Term, Academic Year, and Class**.
- A global search or “Ask about curriculum” action.
- A visible status indicator for the current planning period.
- A profile menu for the current teacher.
- A notification area for drafts awaiting review, lessons awaiting reflection, or incomplete actions.

The main navigation should include:

| Navigation item | Purpose |
|---|---|
| Home | Current teaching context, active work, recent activity, and pending actions |
| Curriculum Explorer | Search and review KICD-aligned curriculum evidence |
| Term Plans | Create, review, and manage termly scheme drafts |
| Daily Lessons | Prepare and review daily lesson plans |
| Reflections | Record post-lesson evidence and review outcome status |
| My Library | View teacher-confirmed plans and reusable teacher notes |

Include a small “Prototype” or “Mock data” label so users understand that the screens are not connected to live KICD data.

### Screen 1: Teaching context setup

Design a first-use context setup screen where the teacher selects:

- Grade: Grade 5
- Subject/Learning Area: Agriculture
- Term: Term 1
- Academic year: 2026
- Class or stream: 5 East

Include a short explanation that this context controls the curriculum results and drafts shown throughout the workspace.

Use a clear primary button labelled **Continue to workspace**. Include a secondary option to change context later.

### Screen 2: Teacher dashboard

Design a dashboard that immediately answers:

- What am I working on?
- What needs my attention?
- What can I do next?

Include:

1. A welcome area showing the active context: `Grade 5 · Agriculture · Term 1 · 5 East`.
2. Three prominent action cards:
   - **Explore curriculum**
   - **Prepare term plan**
   - **Prepare today’s lesson**
3. A fourth card or pending-action panel:
   - **Reflect on a lesson**
4. A “Continue working” section showing an unfinished scheme draft and a lesson awaiting reflection.
5. A “Recent curriculum” section showing recently viewed strands and sub-strands.
6. A small progress summary such as `Term plan: 40% reviewed`, but make clear that this is workflow progress, not learner achievement.

Use concise helper text and avoid making the dashboard look like an analytics product.

### Screen 3: Curriculum Explorer

Design the curriculum explorer as the core discovery screen. It should combine structured filters with natural-language search.

Place the following filters near the top:

- Grade
- Subject/Learning Area
- Term or planning period
- Strand
- Sub-strand
- Content type

Include a prominent search field with an example placeholder:

> “What are the learning outcomes and suggested experiences for soil conservation?”

Use realistic mock results for Grade 5 Agriculture, including a result for:

- Strand: Food Production Processes
- Sub-strand: Soil Conservation
- Content types: Specific Learning Outcomes, Suggested Learning Experiences, Key Inquiry Questions, Core Competencies, Values, Resources, and Assessment

Display results as evidence cards rather than a single generated paragraph. Each card should contain:

- Curriculum location.
- Content category.
- Readable extracted content.
- Source page number.
- A compact source status such as `KICD design · Page 13`.
- A link or button labelled **View source**.
- A button labelled **Add to planning workspace**.
- A selection control for adding multiple evidence items.

Use a right-side **Selected evidence** drawer or panel. When the teacher selects content, show the selected items there and provide a button labelled **Use selected evidence**.

### Screen 4: Source and evidence drawer

Design an expandable source drawer that appears when the teacher clicks **View source**.

The drawer should show:

- Design title.
- Grade and subject.
- Source page number.
- Curriculum section.
- The source text or reconstructed table excerpt.
- Official-source link placeholders.
- A note stating whether the content is shown as a reconstructed table or raw extracted text.

Use clear labels:

- **Official curriculum evidence**
- **AI summary**
- **Teacher input**
- **Prototype data**

Do not use an opaque numerical AI-confidence score. Trust should come from visible source location, evidence type, and review controls.

### Screen 5: Term plan workspace

Design a two-column term-planning workspace.

The left column should contain:

- Selected KICD curriculum evidence.
- Strand and sub-strand navigation.
- Specific learning outcomes.
- Suggested learning experiences.
- Key inquiry questions.
- Competencies, values, PCIs, resources, and assessment guidance.
- A button to ask the assistant about the selected evidence.

The right column should show a familiar teacher-facing scheme-of-work table. Use these suggested columns:

| Week | Strand | Sub-strand | Specific Learning Outcomes | Suggested Learning Experiences | Resources | Assessment | Reflection/Remarks |
|---|---|---|---|---|---|---|---|

Populate two or three example rows using prototype Grade 5 Agriculture content. Allow inline editing of the rows.

At the top of the workspace show:

- `Draft term plan`
- Active grade, subject, term, class, and academic year.
- A progress indicator such as `2 of 10 planning units reviewed`.

At the bottom, include three clear actions:

- **Save as draft**
- **Review before confirmation**
- **Discard draft**

The save and confirmation interaction must not imply that the content is official KICD content.

### Screen 6: Draft review and teacher confirmation

Design a review screen that appears before a scheme or lesson plan is confirmed.

Show three clearly separated sections:

1. **Curriculum evidence used** — source pages and selected evidence.
2. **AI-assisted organization** — generated or rearranged planning content.
3. **Teacher edits and notes** — content entered or changed by the teacher.

Include a prominent status banner:

> `This is an AI-assisted draft. Review it against the cited curriculum evidence before confirming.`

Provide the actions:

- **Edit draft**
- **Confirm and save**
- **Keep as draft**
- **Discard**

When the teacher selects **Confirm and save**, show a confirmation dialog explaining exactly what will be stored. Include a checkbox or acknowledgement such as:

> `I have reviewed this draft and accept it as my teacher work product.`

Do not include an automatic save path that bypasses this step.

### Screen 7: Daily lesson plan workspace

Design a daily lesson screen that can be opened from a selected term-plan row.

Use a familiar lesson-plan structure containing:

- Date.
- Grade and class.
- Subject/Learning Area.
- Strand.
- Sub-strand.
- Specific learning outcomes.
- Key inquiry question.
- Core competencies.
- Values and PCIs.
- Learning resources.
- Introduction or starter activity.
- Main learning activities.
- Assessment or checking for understanding.
- Lesson closure.
- Teacher notes.

Show the selected KICD evidence in a collapsible panel on the left and the lesson-plan draft on the right. The assistant may suggest ways to organize the activities, but the teacher must be able to edit every section.

Include a small optional chat panel titled **Planning assistant**. Suggested prompts may include:

- `Explain this learning outcome in simpler language.`
- `Suggest an activity using locally available resources.`
- `Show which curriculum evidence supports this section.`
- `Help me identify what I still need to decide.`

The chat panel should be secondary, collapsible, and never replace the structured lesson-plan form.

### Screen 8: Post-lesson reflection

Design a reflection screen that becomes available after the lesson date.

The screen should show the lesson context and selected learning outcomes, then ask the teacher to enter evidence.

Include an evidence-entry area with prompts such as:

- What did learners say or do?
- What learner work or assessment evidence is available?
- Which learners or groups need additional support?
- What difficulties were observed?
- What should be revisited next lesson?

Include explicit outcome-status controls:

- Achieved
- Partially achieved
- Not yet achieved
- Insufficient evidence

Add a visible rule near the status controls:

> `Select the outcome status based on evidence. Do not mark an objective as achieved simply because the lesson was delivered.`

The assistant may summarize teacher evidence or suggest a follow-up action, but it must not choose the achievement status automatically. Show the teacher’s evidence and the assistant’s summary as separate sections.

Include actions:

- **Save reflection draft**
- **Confirm reflection record**
- **Continue later**

### Optional screen: My Library

Design a simple library showing confirmed teacher work products. Each item should show:

- Artifact type: Scheme, Lesson Plan, or Reflection.
- Grade, subject, term, and class.
- Status.
- Last updated date.
- Curriculum evidence used.
- Version number.

Use only teacher-confirmed artifacts in the library. Keep unconfirmed drafts in a separate drafts area.

### Interaction requirements

Prototype the following interactions:

1. Changing the grade or subject in the context bar shows a warning that the current evidence and drafts may no longer apply.
2. Selecting a curriculum evidence card adds it to the selected-evidence drawer.
3. Clicking **View source** opens the source drawer without navigating away from the workflow.
4. Clicking **Add to planning workspace** carries selected evidence into the term-plan or lesson-plan workspace.
5. Clicking the assistant opens a secondary side panel with contextual prompts.
6. Clicking **Generate suggestions** changes only the draft area and does not alter the official evidence area.
7. Clicking **Confirm and save** always opens an explicit confirmation dialog.
8. Clicking **Discard** requires a clear warning if unsaved work exists.
9. Submitting a post-lesson reflection requires teacher evidence before confirmation.
10. The system never automatically marks an outcome as achieved.

### Visual design direction

Use a clean professional interface with:

- Warm off-white or very light neutral background.
- Deep navy, charcoal, or dark green primary text.
- Muted green, blue, or teal accents for navigation and confirmed states.
- Amber for drafts or review-required states.
- Red only for destructive actions or serious warnings.
- Moderate corner radius and subtle borders.
- Comfortable spacing for long planning tables.
- Strong typography hierarchy.
- Accessible contrast.
- Clear empty, loading, no-results, and error states.

The visual design should feel closer to a high-quality education productivity workspace than to a social-media application or consumer chatbot.

### Responsive behavior

For desktop, prioritize:

- Two-column planning layouts.
- Wide curriculum tables.
- Persistent evidence panels.
- Side-by-side source and draft comparison.

For mobile, prioritize:

- Reviewing a selected lesson plan.
- Checking the day’s lesson context.
- Recording quick post-lesson evidence.
- Viewing citations and source pages.
- Collapsing the assistant and evidence panels into bottom sheets or accordions.

Do not force the full term-plan table into an unreadable mobile layout. Provide a card or row-detail view on small screens.

### Prototype deliverables

Produce:

1. A clickable high-fidelity desktop prototype at a 1440px primary frame.
2. Responsive mobile review states.
3. A clear navigation flow between all MVP screens.
4. Realistic prototype content for Grade 5 Agriculture and one additional subject.
5. Visible draft, confirmed, evidence, and teacher-input states.
6. The confirmation dialog and post-lesson evidence workflow.
7. A short design note explaining the main user-flow decisions.

Do not build the backend, connect to live KICD data, implement data acquisition, add a real database, or invoke a live foundation model. The goal is to validate the UI and teacher workflow before implementation begins.

---

## End of prompt
