# CBC Teacher Workflow Agent

A planning workspace for Kenyan CBC teachers. Teachers search the official KICD
curriculum designs, build a termly scheme of work from the evidence they select,
draft daily lesson plans from a week of that scheme, and confirm each piece as
their own work product.

Generation is grounded: Gemini only reorganises and rephrases the curriculum
evidence the teacher selected. A field with no supporting evidence stays empty
rather than being invented, and nothing is saved as confirmed work until the
teacher explicitly confirms it.

## Architecture

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, Tailwind, shadcn/ui (`frontend/`) | Teacher workspace UI |
| API | FastAPI (`backend/`) | Curriculum search, generation, persistence |
| Curriculum store | ChromaDB (`kicd_chroma_db/`) | Ingested KICD sub-strand chunks with Gemini embeddings |
| Application state | PostgreSQL 16 (`backend/db/`) | Schemes of work, lesson plans, confirmation logs |
| Generation | Gemini (`agent.py`) | Grounded term-plan rows and daily lesson drafts |

## Project structure

```
cbc-agent/
├── agent.py               # Gemini generation: term-plan content, daily lesson content, CLI agent
├── ingest.py              # Docling JSON -> sub-strand chunks -> ChromaDB
├── gemini_embedding.py    # Chroma embedding function (gemini-embedding-2)
├── models.py              # Pydantic schemas used by the CLI agent
├── doc_generator.py       # .docx export of lesson plans / schemes of work
├── docling_json/          # Docling-extracted KICD curriculum designs
├── kicd_chroma_db/        # Persistent Chroma store (created by ingest.py)
├── backend/
│   ├── main.py            # FastAPI app and all endpoints
│   ├── chroma.py          # Shared handle on the curriculum collection
│   ├── parsing.py         # Chunk -> evidence item conversion
│   └── db/
│       ├── schema.sql     # Postgres schema
│       └── connection.py  # Connection pool, demo user seeding, migrations
└── frontend/
    └── src/
        ├── app/(workspace)/   # Dashboard, Curriculum, Term Plans, Daily Lessons, Reflections, Library
        ├── context/           # TeachingContext (grade/subject/term) and WorkspaceContext (drafts)
        └── lib/api.ts         # Typed client for the FastAPI backend
```

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for Postgres)
- A Gemini API key

### 1. Environment

Create `.env` in the project root:

```env
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=postgresql://cbc_admin:your_password@localhost:5432/cbc_curriculum
```

The frontend calls the API at `http://localhost:8000` by default. Set
`NEXT_PUBLIC_API_URL` in `frontend/.env.local` to point it elsewhere.

### 2. Python dependencies

```bash
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt python-dotenv
```

### 3. Postgres

Run Postgres 16 (the project uses the `pgvector/pgvector:pg16` image) and apply
the schema once:

```bash
docker run -d --name cbc-postgres -p 5432:5432 \
  -e POSTGRES_USER=cbc_admin -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=cbc_curriculum \
  pgvector/pgvector:pg16

docker exec -i cbc-postgres psql -U cbc_admin -d cbc_curriculum < backend/db/schema.sql
```

On startup the API seeds a demo teacher ("Ms. A. Wanjiru") who owns every record
(there is no login yet), and applies small idempotent migrations such as
`lesson_plans.content`.

> **Windows:** if a local PostgreSQL service is also installed, it can answer on
> `localhost:5432` before the container does, which shows up as password
> failures. Stop that service or map the container to a different port.

If Postgres is unavailable, curriculum search still works; only the scheme and
lesson endpoints return 503.

### 4. Ingest the curriculum

Skip this if `kicd_chroma_db/` is already populated.

```bash
python ingest.py
```

Each KICD curriculum design in `docling_json/` is split into sub-strand chunks
(outcomes, learning experiences, key inquiry questions, resources, assessment,
lesson counts) and embedded into the `kicd_curriculum` collection. Core
competencies, values and PCIs are not present in the source tables, so they are
not ingested and are never generated.

### 5. Run

Backend, from the **project root** (not from inside `backend/`):

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Teacher workflow

1. **Setup:** choose grade, subject, term, class and year.
2. **Curriculum Explorer:** filter or semantically search KICD evidence and
   select the items to plan from.
3. **Term Plans:** generate week rows from the selected evidence. Each
   sub-strand is split into weeks of three lessons using its real lesson count
   (for example, 7 lessons gives weeks covering lessons 1-3, 4-6 and 7). Edit, save as
   a draft, review against the cited evidence, then confirm.
4. **Daily Lessons:** pick a term-plan row, optionally generate a starting draft
   from that row, edit it, save, review and confirm.
5. **Reflections and My Library:** record post-lesson evidence and browse
   confirmed work.

Drafts are kept in the browser's `localStorage` between visits. Saved and
confirmed schemes and lesson plans are stored in Postgres.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Status and Chroma chunk count |
| GET | `/api/curriculum/options` | Grade/subject/strand/sub-strand values that exist in the store |
| POST | `/api/curriculum/search` | Filter and optional semantic search; returns evidence items |
| POST | `/api/generate/term-plan-rows` | Grounded week rows from selected evidence |
| POST | `/api/generate/lesson-plan` | Grounded daily lesson draft from one term-plan row |
| POST | `/api/schemes` | Create a draft scheme of work |
| GET / PATCH | `/api/schemes/{id}` | Read / update a scheme's rows |
| POST | `/api/schemes/{id}/confirm` | Confirm a scheme and write a confirmation log |
| POST | `/api/lessons` | Create a draft lesson plan |
| GET / PATCH | `/api/lessons/{id}` | Read / update a lesson plan |
| POST | `/api/lessons/{id}/confirm` | Confirm a lesson plan and write a confirmation log |

Generation endpoints return 502 with the reason if Gemini fails. If Gemini
declines to repeat published curriculum text verbatim, the request is retried
once, asking for a reworded version.

## CLI agent

`agent.py` can also run on its own as an interactive agent that produces a
structured lesson plan from a free-text request, with optional `.docx` export
via `doc_generator.py`:

```bash
python agent.py
```

## Known limitations

- There is no authentication yet; all records belong to the seeded demo user.
- The Daily Lessons list screen and some dashboard totals still use sample
  data rather than term-plan rows.
- Term-plan generation gives every week of a sub-strand the same content, so a
  daily lesson generated for a later week cannot yet target those specific
  lessons.
- Only one daily lesson draft is edited at a time.

## License

See [LICENSE](LICENSE).
