# CBC Teacher Workflow Agent

A planning workspace for Kenyan CBC teachers. Teachers search the official KICD
curriculum designs, build a termly scheme of work from the evidence they select,
draft daily lesson plans from a week of that scheme, record post-lesson
reflections, and confirm each piece as their own work product. Confirmed
schemes and lesson plans can be downloaded as Word documents.

Generation is grounded: the model only reorganises and rephrases the curriculum
evidence or teacher notes it is given. A field with no supporting evidence stays
empty rather than being invented, the AI never chooses a learner outcome status,
and nothing is saved as confirmed work until the teacher explicitly confirms it.

## Features

- **Curriculum Explorer:** filter or semantically search the ingested KICD designs
  and select evidence to plan from.
- **Term Plans:** generate week rows for a sub-strand from the selected evidence,
  paced by its real lesson count, then edit, review and confirm.
- **Daily Lessons:** generate a one-lesson draft from a term-plan row, edit,
  review and confirm.
- **Planning assistant:** a conversational agent on the Term Plans and Daily
  Lessons screens. It answers from the evidence on screen and searches the
  curriculum itself when it needs more. It is advisory only and never edits a
  draft.
- **Reflections:** every confirmed lesson plan needs a reflection. The teacher
  records evidence under five prompts, can generate an AI summary of those notes,
  chooses the outcome status, and confirms. A confirmed reflection becomes part
  of its lesson plan: it is shown on the lesson's review page, printed in the
  Reflection section of the lesson's Word download (which is left blank for
  handwriting until then), and marked "Included" on the lesson in My Library.
- **My Library and downloads:** confirmed schemes and lesson plans, read from
  Postgres, each downloadable as a `.docx`.

## Architecture

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, Tailwind 4, shadcn/ui (`frontend/`) | Teacher workspace UI |
| API | FastAPI (`backend/`) | Curriculum search, generation, persistence, downloads |
| Curriculum store | ChromaDB (`kicd_chroma_db/`) | Ingested KICD sub-strand chunks with embeddings |
| Application state | PostgreSQL 16 (`backend/db/`) | Schemes of work, lesson plans, reflections, confirmation logs |
| Generation | Strands Agents SDK with Gemini, or AWS Bedrock (`agent.py`) | Term-plan rows, daily lesson drafts, reflection summaries |
| Assistant | Strands agent with a curriculum search tool (`backend/assistant.py`) | Planning assistant panel |

## Project structure

```
cbc-agent/
├── agent.py                 # Generation: term-plan content, daily lessons, reflection summaries, CLI agent
├── ingest.py                # Docling JSON -> sub-strand chunks -> ChromaDB
├── gemini_embedding.py      # Chroma embedding function (Gemini)
├── bedrock_embedding.py     # Chroma embedding function (AWS Bedrock Titan)
├── models.py                # Pydantic schemas for generation output
├── doc_generator.py         # .docx export used by the CLI agent
├── docling_json/            # Docling-extracted KICD curriculum designs
├── kicd_chroma_db/          # Persistent Chroma store (created by ingest.py)
├── backend/
│   ├── main.py              # FastAPI app and all endpoints
│   ├── assistant.py         # Planning assistant agent and its search_curriculum tool
│   ├── search.py            # The single curriculum search implementation
│   ├── chroma.py            # Shared handle on the curriculum collection
│   ├── parsing.py           # Chunk -> evidence item conversion
│   ├── documents.py         # .docx scheme of work and lesson plan exports
│   ├── plain_text.py        # Markdown cleanup for plain-text model output
│   └── db/
│       ├── schema.sql       # Postgres schema
│       └── connection.py    # Connection pool, demo user seeding, migrations
└── frontend/
    └── src/
        ├── app/(workspace)/ # Dashboard, Curriculum, Term Plans, Daily Lessons, Reflections, Library
        ├── components/      # AssistantPanel, dialogs, layout, UI primitives
        ├── context/         # TeachingContext (grade/subject/term) and WorkspaceContext (drafts)
        └── lib/api.ts       # Typed client for the FastAPI backend
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for Postgres)
- A Gemini API key (required: see [Model providers](#model-providers))

### 1. Environment

Create `.env` in the project root:

```env
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=postgresql://cbc_admin:your_password@localhost:5432/cbc_curriculum
```

`.env.example` lists the optional AWS Bedrock variables. Copying it as-is
switches generation to Bedrock, so leave those lines out unless you intend to use
Bedrock.

The frontend calls the API at `http://localhost:8000` by default. Set
`NEXT_PUBLIC_API_URL` in `frontend/.env.local` to point it elsewhere.

### 2. Python dependencies

```bash
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
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
(there is no login yet). It also applies idempotent migrations, so an existing
database is brought up to date automatically:

- `lesson_plans`: `content` (the full lesson draft) and `updated_at`
- `evaluation_records`: `content`, `status`, `user_id` and `updated_at`, with
  `teacher_evidence` and `achievement_status` made nullable so a reflection draft
  can exist before they are known

> **Windows:** if a local PostgreSQL service is also installed, it can answer on
> `localhost:5432` before the container does, which shows up as password
> failures. Stop that service or map the container to a different port.

If Postgres is unavailable, curriculum search still works; the scheme, lesson,
library and reflection endpoints return 503.

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

Re-running is safe and cheap: chunks already stored unchanged are skipped, a
file's outdated chunks are removed only after its new ones are written, and
Gemini rate limits are waited out. `python ingest.py --dry-run` shows what each
file parses to without embedding anything. Subject names are normalised in
`ingest.py` (`CANONICAL_SUBJECTS`), so add a new subject there when you add its
design. Designs whose tables the standard parser cannot read (currently the
three CRE designs) go through a more tolerant parser automatically.

Ingested today: Agriculture, Creative Arts, English and Christian Religious
Education for Grades 4–6, Indigenous Languages for Grades 5–6, and Arabic for
Grade 4.

English and Indigenous Languages have a level above the strand: Theme →
Strand → Sub-strand (e.g. "1.0 The Family" → "1.1 Listening and Speaking" →
"1.1.1 Pronunciation and Vocabulary"). Their chunks carry a `theme` field and a
`Theme:` line, and the Curriculum Explorer shows a Theme filter for them only.
The theme is read from the design's contents and headings and matched to strands
by number. Arabic lists themes too, but numbers its strands independently
("2.0 Reading"), so it is left without them.

The embedding provider used here must match the one the API searches with (see
[Model providers](#model-providers)).

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
   (for example, 7 lessons gives weeks covering lessons 1-3, 4-6 and 7). Edit,
   save as a draft, review against the cited evidence, then confirm. The review
   page offers a Word download once the scheme is saved.
4. **Daily Lessons:** pick a term-plan row, optionally generate a starting draft
   from that row, edit it, save, review and confirm. The review page offers a
   Word download once the lesson is saved.
5. **Reflections:** each confirmed lesson plan appears under "Awaiting your
   evidence". Record what happened, optionally generate a summary, choose the
   outcome status yourself, and confirm. A confirmed reflection can no longer be
   edited.
6. **My Library:** browse and download confirmed schemes and lesson plans.

The planning assistant is available on the Term Plans and Daily Lessons screens
throughout.

Drafts are kept in the browser's `localStorage` between visits. Saved and
confirmed schemes, lesson plans and reflections are stored in Postgres.

## Model providers

`agent.py` picks a provider when it is first imported:

- **Gemini** (`gemini-3.1-flash-lite`) when `GEMINI_API_KEY` is set and no AWS
  configuration is present.
- **AWS Bedrock** (default model `qwen.qwen3-next-80b-a3b` in `.env.example`) when
  any of `AWS_ACCESS_KEY_ID`, `AWS_PROFILE`, `AWS_DEFAULT_REGION` or
  `BEDROCK_MODEL_ID` is set, or when there is no Gemini key.

The provider choice covers term-plan generation, daily lesson generation and
reflection summaries. The rest of the app still uses Gemini directly, so
`GEMINI_API_KEY` is required either way:

- The planning assistant (`backend/assistant.py`) always uses Gemini.
- The API's curriculum search (`backend/chroma.py`) always embeds queries with
  Gemini. A collection ingested with Bedrock Titan embeddings will not match those
  queries.

`ingest.py` makes its own choice: Bedrock embeddings when `AWS_ACCESS_KEY_ID`,
`AWS_PROFILE` or `AWS_DEFAULT_REGION` is set, otherwise Gemini.

Bedrock configuration variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_REGION` (default `us-east-1`), optional `AWS_SESSION_TOKEN`,
`BEDROCK_MODEL_ID` and `BEDROCK_EMBEDDING_MODEL_ID` (default
`amazon.titan-embed-text-v2:0`).

## Generation rules

- **Grounding:** term-plan and lesson fields come only from the matching evidence
  or row content. A field whose source is absent is returned empty, enforced in
  code as well as in the prompt.
- **Recitation retry (Gemini only):** if Gemini declines to repeat published
  curriculum text verbatim, the request is retried once, asking for a reworded
  version. Bedrock has no equivalent, so it is called once.
- **Reflection summaries:** summarise only what the teacher wrote and say plainly
  when little was recorded. Any sentence that judges achievement ("achieved",
  "met the outcome", "on track" and similar) is removed in code for both
  providers. If nothing is left, the request fails rather than returning an empty
  summary.
- **Plain text:** assistant answers and reflection summaries pass through
  `backend/plain_text.py`, which strips markdown the model still produces.
- **Failures:** generation endpoints return 502 with the reason; nothing is
  silently replaced with placeholder text.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Status and Chroma chunk count |
| GET | `/api/curriculum/options` | Grade/subject/theme/strand/sub-strand values that exist in the store |
| POST | `/api/curriculum/search` | Filter (including `theme`) and optional semantic search; returns evidence items |
| POST | `/api/generate/term-plan-rows` | Grounded week rows from selected evidence |
| POST | `/api/generate/lesson-plan` | Grounded daily lesson draft from one term-plan row |
| POST | `/api/generate/reflection-summary` | Plain-text summary of reflection evidence (400 if all fields are empty) |
| POST | `/api/assistant/ask` | Planning assistant answer (`{ prompt, grade, subject, evidence }`) |
| POST | `/api/schemes` | Create a draft scheme of work |
| GET / PATCH | `/api/schemes/{id}` | Read / update a scheme's rows |
| POST | `/api/schemes/{id}/confirm` | Confirm a scheme and write a confirmation log |
| GET | `/api/schemes/{id}/download` | Scheme of work as `.docx` |
| POST | `/api/lessons` | Create a draft lesson plan |
| GET / PATCH | `/api/lessons/{id}` | Read (with its `reflection`, or null) / update a lesson plan |
| POST | `/api/lessons/{id}/confirm` | Confirm a lesson plan and write a confirmation log |
| GET | `/api/lessons/{id}/download` | Lesson plan as `.docx` (with scheme context when linked, and its confirmed reflection) |
| GET | `/api/library` | Confirmed schemes and lesson plans (with each lesson's `reflectionStatus`), most recently updated first |
| GET | `/api/reflections` | Confirmed lesson plans with their reflection status (`not_started`, `draft`, `confirmed`) |
| GET | `/api/reflections/by-lesson/{lesson_id}` | A lesson's reflection, or `{ "reflection": null }` |
| POST | `/api/reflections` | Create a draft reflection for a confirmed lesson plan |
| PATCH | `/api/reflections/{id}` | Update a draft reflection's evidence, status and summary |
| POST | `/api/reflections/{id}/confirm` | Confirm a reflection, mark its lesson plan updated, and write a confirmation log |

Reflection rules are enforced by the server, not only the UI:

- Confirming requires at least one evidence field and an outcome status (400).
- One reflection per lesson plan (409), and only for confirmed lesson plans (400).
- A confirmed reflection cannot be edited or re-confirmed (409).
- Unknown outcome statuses are rejected (422).

## CLI agent

`agent.py` can also run on its own as an interactive agent that produces a
structured lesson plan from a free-text request, with optional `.docx` export
via `doc_generator.py`:

```bash
python agent.py
```

## Known limitations

- There is no authentication yet; all records belong to the seeded demo user.
- The Daily Lessons list screen, the sidebar, header and dashboard reflection
  counts, and the draft reflections shown in My Library still use sample data.
- Term-plan generation gives every week of a sub-strand the same content, so a
  daily lesson generated for a later week cannot yet target those specific
  lessons.
- Only one daily lesson draft is edited at a time.
- The Postgres connection pool allows 10 connections; more simultaneous requests
  than that fail with a server error.
- Bedrock support is partial (see [Model providers](#model-providers)): the
  assistant and API search are Gemini-only, and Bedrock is selected whenever
  `AWS_DEFAULT_REGION` or `BEDROCK_MODEL_ID` alone is set.
- A full ingest from an empty store hits Gemini's per-minute embedding quota;
  `ingest.py` waits and retries, so it takes a few minutes.
- The CRE designs' source tables are damaged in places, so a few CRE chunks
  carry stray words at the end of a key inquiry question, one Grade 5 outcome
  (3.2) has scrambled word order, and two learning-experience lists (Grade 5
  3.2 and 5.2) are cut short.
- Some language sub-strands are not ingested: Indigenous Languages Grade 5
  7.1 and Grade 6 1.1, 4.1, 6.1 and 9.1 (their tables have "THEME N:" merged into
  the header row), and English Grade 6 yields 29 sub-strands from 43 curriculum
  tables, one of them shifted a column (strand "8.2.1 Fluency ...").
- `docker-compose.yml` is empty; Postgres is started with the `docker run`
  command above.

## License

See [LICENSE](LICENSE).
