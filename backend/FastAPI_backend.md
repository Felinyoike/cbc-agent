Build a FastAPI backend in `backend/` that connects my existing Next.js frontend to my existing ChromaDB curriculum RAG pipeline and PostgreSQL application state database.

## What already exists (do NOT recreate these)

### 1. ChromaDB curriculum store
- Location: `./kicd_chroma_db` (persistent ChromaDB)
- Collection name: `kicd_curriculum`
- Embedding function: Gemini `text-embedding-004` via `gemini_embedding.py` (import `GeminiEmbeddingFunction` from it)
- Each document is one sub-strand chunk with labeled sections in the text like:
  ```
  Grade: Grade 5
  Subject: Agriculture
  Strand: Food Production Processes
  Sub-strand: Soil Conservation
  Specific Learning Outcomes: ...
  Suggested Learning Experiences: ...
  Key Inquiry Question: ...
  Suggested Assessment Methods: ...
  Suggested Learning Resources: ...
  Assessment Rubric: ...
  ```
- Metadata per chunk: `grade`, `subject`, `strand`, `sub_strand`, `num_lessons`, `source_page`, `source_file`, `has_rubric`, `has_assessment_info`, `pcis`, `core_competencies`
- Existing retrieval code is in `agent.py` — see `retrieve_context()` and `generate_lesson_plan()` functions. The agent uses Gemini (`gemini-3.1-flash-lite`) for generation with structured output.

### 2. PostgreSQL application state
- Container: `cbc-postgres`
- Connection: `postgresql://cbc_admin:your_secure_password@localhost:5432/cbc_curriculum`
- Tables already created:
  - `users` (id UUID, email, full_name, school_id, role)
  - `schemes_of_work` (id UUID, user_id FK, grade, subject, term, year, content JSONB, status)
  - `lesson_plans` (id UUID, scheme_id FK, user_id FK, lesson_date, strand, sub_strand, learning_outcomes TEXT[], activities TEXT[], resources TEXT[], status)
  - `evaluation_records` (id UUID, lesson_id FK, teacher_evidence, achievement_status, agent_summary)
  - `confirmation_logs` (id SERIAL, entity_type, entity_id UUID, user_id FK, action, timestamp)

### 3. Next.js frontend
- Location: `frontend/`
- Runs on port 3000
- Currently uses static mock data from `frontend/src/data/mockData.ts`
- The frontend expects data shaped as `EvidenceItem[]` for curriculum search:

```typescript
interface EvidenceItem {
  id: string;
  category: ContentCategory; // "Specific Learning Outcomes" | "Suggested Learning Experiences" | "Key Inquiry Questions" | "Core Competencies" | "Values" | "Pertinent and Contemporary Issues" | "Resources" | "Assessment"
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  page: number;
  designTitle: string;
  content: string;
  sourceRendering: "reconstructed-table" | "raw-text";
  sourceExcerpt: string;
}
```

- The curriculum page (`frontend/src/app/(workspace)/curriculum/page.tsx`) currently imports `evidenceItems` directly from mockData and filters client-side by grade, subject, strand, subStrand, and contentType.
- Other data types the frontend uses: `TermPlanRow`, `Lesson`, `LessonPlanDraft`, `ReflectionRecord`, `LibraryItem` — all defined in `mockData.ts`.
- Context providers: `TeachingContext.tsx` (grade/subject/term selection) and `WorkspaceContext.tsx` (selected evidence state).

## What to build

### FastAPI app (`backend/main.py`)

**CORS:** allow `http://localhost:3000`

**Endpoints needed:**

1. `GET /health` — returns `{"status": "ok"}`

2. `POST /api/curriculum/search` — THE CRITICAL ENDPOINT
   - Accepts: `{ grade: string, subject: string, strand?: string, sub_strand?: string, content_type?: string, query?: string }`
   - Queries ChromaDB collection `kicd_curriculum` with:
     - `where` metadata filter on grade and subject (and strand/sub_strand if provided)
     - `query_texts` using the query string for semantic search (or a constructed query from the filters if no free-text query)
   - Each ChromaDB result is ONE chunk per sub-strand. The API must SPLIT each chunk into multiple `EvidenceItem` objects — one per category (Specific Learning Outcomes, Suggested Learning Experiences, Key Inquiry Questions, etc.) by parsing the labeled sections in the chunk text.
   - If `content_type` filter is provided, only return items matching that category.
   - Returns: `{ results: EvidenceItem[], total: number }`

3. `POST /api/curriculum/explore` — calls the Strands agent
   - Accepts: `{ prompt: string, grade: string, subject: string }`
   - Uses the existing `retrieve_context()` from `agent.py` to get curriculum evidence, then calls Gemini to generate a response grounded in that evidence
   - Returns: `{ answer: string, evidence_ids: string[], citations: [...] }`

4. `POST /api/schemes` — create a new scheme of work
   - Accepts: `{ user_id: string, grade: string, subject: string, term: int, year: int, content: object }`
   - Inserts into `schemes_of_work` table with status 'draft'
   - Returns the created scheme

5. `GET /api/schemes/{id}` — get a scheme by ID

6. `POST /api/schemes/{id}/confirm` — confirm a scheme
   - Updates status to 'confirmed'
   - Creates a `confirmation_logs` entry
   - Returns updated scheme

7. `POST /api/lessons` — create a lesson plan
   - Accepts lesson plan fields matching the `lesson_plans` table
   - Inserts with status 'draft'

8. `GET /api/lessons/{id}` — get a lesson plan

9. `POST /api/lessons/{id}/confirm` — confirm a lesson plan

10. `POST /api/evaluations` — create a post-lesson evaluation
    - Accepts: `{ lesson_id, teacher_evidence, achievement_status }`
    - Inserts into `evaluation_records`

11. `POST /api/generate/lesson-plan` — AI-powered lesson plan generation
    - Accepts: `{ grade, subject, strand, sub_strand, week, lesson_number }`
    - Retrieves curriculum context from ChromaDB
    - Calls Gemini via the existing agent pattern to generate a structured lesson plan
    - Returns the generated plan as JSON (NOT saved — teacher must confirm separately)

12. `POST /api/generate/scheme` — AI-powered scheme generation
    - Similar pattern: retrieve context, generate structured scheme, return without saving

### Database connection (`backend/db/connection.py`)
- Use `psycopg2` or `asyncpg` with connection pooling
- Load DATABASE_URL from environment / `.env`

### ChromaDB connection (`backend/chroma.py`)
- Initialize `chromadb.PersistentClient(path="kicd_chroma_db")`
- Import `GeminiEmbeddingFunction` from the existing `gemini_embedding.py`
- Expose the collection for use by the search endpoint

## Key transformation logic for `/api/curriculum/search`

Each ChromaDB chunk text looks like:
```
Grade: Grade 5
Subject: Agriculture
Strand: Food Production Processes
Sub-strand: Soil Conservation
Specific Learning Outcomes: By the end of the sub-strand...
Suggested Learning Experiences: Learners are guided to...
Key Inquiry Question: Why is it important...
Suggested Assessment Methods: Observation schedule...
Suggested Learning Resources: School farm, jembes...
```

This single chunk must be split into separate EvidenceItem objects:
- Parse each labeled section (split on "Specific Learning Outcomes:", "Suggested Learning Experiences:", etc.)
- Create one EvidenceItem per non-empty section
- Use the chunk's metadata for grade, subject, strand, sub_strand, source_page
- Generate a stable `id` per item (e.g. hash of grade+subject+strand+sub_strand+category)
- Set `designTitle` to `f"KICD {grade} {subject} Curriculum Design"`
- Set `sourceRendering` to "reconstructed-table" for outcomes/experiences/assessment, "raw-text" for others
- Set `sourceExcerpt` to the raw section text

## Important constraints

- Do NOT modify any frontend files — the API must return data matching the existing TypeScript interfaces exactly
- Do NOT modify `agent.py`, `ingest.py`, `gemini_embedding.py`, or `models.py` — import from them
- Use `python-dotenv` to load `.env` for GEMINI_API_KEY and DATABASE_URL
- Add proper error handling — if ChromaDB has no data, return empty results, don't crash
- The backend must run from the project root (`cbc-agent/`) not from inside `backend/`, since it needs to access `kicd_chroma_db/` and `gemini_embedding.py` at the project root
- Start command: `python -m uvicorn backend.main:app --reload --port 8000`