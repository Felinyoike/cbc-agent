-- CBC Teacher Workflow Agent: Application State Schema
-- Curriculum RAG is handled by ChromaDB (separate from Postgres).

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    school_id TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Termly Schemes of Work
CREATE TABLE IF NOT EXISTS schemes_of_work (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    term INTEGER NOT NULL,
    year INTEGER NOT NULL,
    content JSONB NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Daily Lesson Plans
CREATE TABLE IF NOT EXISTS lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES schemes_of_work(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    lesson_date DATE NOT NULL,
    strand TEXT NOT NULL,
    sub_strand TEXT NOT NULL,
    learning_outcomes TEXT[] NOT NULL,
    activities TEXT[] NOT NULL,
    resources TEXT[],
    content JSONB,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Post-Lesson Evaluation Records
CREATE TABLE IF NOT EXISTS evaluation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
    teacher_evidence TEXT NOT NULL,
    achievement_status TEXT NOT NULL,
    agent_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit & Confirmation Logs
CREATE TABLE IF NOT EXISTS confirmation_logs (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schemes_updated_at
    BEFORE UPDATE ON schemes_of_work
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();