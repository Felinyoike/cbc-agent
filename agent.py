import json
import os
import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv

from gemini_embedding import GeminiEmbeddingFunction
from models import LessonPlan, SchemeOfWork
from doc_generator import create_lesson_plan_docx, create_scheme_of_work_docx

# 1. Load environment variables
load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing. Check your .env file.")

# 2. Initialize Gemini Client
ai_client = genai.Client(api_key=api_key)

# 3. Connect to the Chroma Vector Database
CHROMA_DB_PATH = "kicd_chroma_db"
COLLECTION_NAME = "kicd_curriculum"

db_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
gemini_ef = GeminiEmbeddingFunction(api_key=api_key)
collection = db_client.get_collection(
    name=COLLECTION_NAME,
    embedding_function=gemini_ef,
)

def retrieve_context(query: str, n_results: int = 5) -> str:
    """Searches the vector database for the most relevant curriculum chunks."""
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    
    # Combine the found texts into a single context string
    if not results["documents"] or not results["documents"][0]:
        return "No relevant KICD curriculum context found."
        
    context_chunks = results["documents"][0]
    return "\n\n---\n\n".join(context_chunks)

def generate_lesson_plan(prompt: str) -> LessonPlan:
    """Generates a Lesson Plan using retrieved context and Structured Outputs."""
    print(f"\n Searching curriculum database for: '{prompt}'...")
    context = retrieve_context(prompt, n_results=4)
    
    print(" Thinking and structuring the Lesson Plan...")
    
    system_instruction = f"""You are an expert Kenyan CBC curriculum developer and teacher.
    Use the provided KICD curriculum context to generate a detailed, highly accurate Lesson Plan.
    Do NOT invent specific learning outcomes, experiences, or rubrics if they contradict the provided context.
    Fill out every field in the required schema thoughtfully.
    
    KICD CONTEXT:
    {context}
    """
    
    
    # We manually define the schema dictionary to match YOUR models.py exactly
    manual_schema = {
        "type": "OBJECT",
        "properties": {
            "grade": {"type": "STRING"},
            "subject": {"type": "STRING"},
            "strand": {"type": "STRING"},
            "sub_strand": {"type": "STRING"},
            "week": {"type": "INTEGER", "description": "Week number within the term/scheme"},
            "lesson_number": {"type": "INTEGER", "description": "Lesson number within the week"},
            "specific_learning_outcomes": {
                "type": "ARRAY", 
                "items": {"type": "STRING"},
                "description": "Verbatim or lightly adapted from the KICD sub-strand outcomes"
            },
            "key_inquiry_question": {"type": "STRING"},
            "core_competencies": {"type": "ARRAY", "items": {"type": "STRING"}},
            "pcis": {
                "type": "ARRAY", 
                "items": {"type": "STRING"},
                "description": "Pertinent and Contemporary Issues addressed"
            },
            "values": {"type": "ARRAY", "items": {"type": "STRING"}},
            "organisation_of_learning": {
                "type": "OBJECT",
                "properties": {
                    "introduction": {"type": "STRING"},
                    "lesson_development": {"type": "STRING"},
                    "conclusion": {"type": "STRING"}
                },
                "required": ["introduction", "lesson_development", "conclusion"]
            },
            "resources": {"type": "ARRAY", "items": {"type": "STRING"}},
            "assessment_methods": {"type": "ARRAY", "items": {"type": "STRING"}},
            "reflection": {"type": "STRING", "description": "Blank space/prompt for the teacher's post-lesson reflection"}
        },
        "required": [
            "grade", "subject", "strand", "sub_strand", "week", "lesson_number",
            "specific_learning_outcomes", "key_inquiry_question", "core_competencies",
            "pcis", "values", "organisation_of_learning", "resources", "assessment_methods"
        ]
    }
    
    response = ai_client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=manual_schema, 
            temperature=0.2, 
        ),
    )
    
    # We parse the pure JSON text response back into our Pydantic object
    return LessonPlan.model_validate_json(response.text)


TERM_PLAN_FIELD_SOURCES = {
    "keyInquiryQuestion": "Key Inquiry Questions",
    "outcomes": "Specific Learning Outcomes",
    "experiences": "Suggested Learning Experiences",
    "resources": "Resources",
    "assessment": "Assessment",
}


def generate_term_plan_content(grade: str, subject: str, strand: str, sub_strand: str,
                               evidence_by_category: dict[str, str]) -> dict[str, str]:
    """Organises ONLY the supplied KICD evidence for one sub-strand into scheme-of-work fields."""
    evidence_text = "\n\n".join(
        f"[{category}]\n{content}" for category, content in evidence_by_category.items()
    )

    system_instruction = f"""You are an expert Kenyan CBC curriculum developer and teacher.
    Organise the provided KICD curriculum evidence into one scheme-of-work entry for
    {grade} {subject}, strand "{strand}", sub-strand "{sub_strand}".

    HARD CONSTRAINTS:
    - Use ONLY the evidence below. You may rephrase for clarity, but never add an outcome,
      activity, resource, assessment method, fact or question that is not in the evidence.
    - Each field comes only from its matching evidence category:
      keyInquiryQuestion <- [Key Inquiry Questions]; outcomes <- [Specific Learning Outcomes];
      experiences <- [Suggested Learning Experiences]; resources <- [Resources];
      assessment <- [Assessment].
    - If a field's category is absent from the evidence, return an empty string for it.
      Never invent a key inquiry question.

    KICD EVIDENCE:
    {evidence_text}
    """

    manual_schema = {
        "type": "OBJECT",
        "properties": {field: {"type": "STRING"} for field in TERM_PLAN_FIELD_SOURCES},
        "required": list(TERM_PLAN_FIELD_SOURCES),
    }

    request = f"Organise the evidence for {sub_strand} into the scheme-of-work fields."
    # Gemini blocks near-verbatim copies of published text (finish_reason RECITATION),
    # which KICD designs are; a retry asking for rewording stays grounded but passes.
    retry_request = (request + " Rephrase each field in your own words rather than copying"
                     " the evidence verbatim, without adding anything new.")

    response = None
    for contents in (request, retry_request):
        response = ai_client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=manual_schema,
                temperature=0.2,
            ),
        )
        if response.text:
            break

    if not response.text:
        candidate = response.candidates[0] if response.candidates else None
        reason = candidate.finish_reason if candidate else response.prompt_feedback
        raise RuntimeError(f"Gemini returned no content (reason: {reason})")

    generated = json.loads(response.text)
    # Enforced here as well as in the prompt: a field with no source evidence stays empty.
    return {
        field: (str(generated.get(field) or "").strip() if category in evidence_by_category else "")
        for field, category in TERM_PLAN_FIELD_SOURCES.items()
    }


DAILY_LESSON_ROW_FIELDS = {
    "keyInquiryQuestion": "Key Inquiry Question",
    "outcomes": "Specific Learning Outcomes",
    "experiences": "Suggested Learning Experiences",
    "resources": "Resources",
    "assessment": "Assessment",
}

MAX_LESSON_STEPS = 4


def generate_daily_lesson_content(grade: str, subject: str, strand: str, sub_strand: str,
                                  lessons: str, row: dict[str, str]) -> dict:
    """Drafts ONE lesson's introduction, steps, assessment and closure from a term-plan row."""
    row = {field: str(row.get(field) or "").strip() for field in DAILY_LESSON_ROW_FIELDS}
    row_text = "\n\n".join(
        f"[{label}]\n{row[field]}" for field, label in DAILY_LESSON_ROW_FIELDS.items() if row[field]
    )
    span_note = (
        f"This row covers lessons {lessons} of the sub-strand. Plan only ONE lesson's worth of"
        " activity from it; do not compress every lesson in the range into this plan."
        if "-" in lessons else "Plan a single lesson."
    )

    system_instruction = f"""You are an expert Kenyan CBC teacher.
    Draft one daily lesson for {grade} {subject}, strand "{strand}", sub-strand "{sub_strand}",
    from the teacher's scheme-of-work row below. {span_note}

    HARD CONSTRAINTS:
    - Use ONLY the row content below. You may rephrase and sequence it, but never add an activity,
      resource, fact, assessment method or question that is not in the row.
    - introduction: a short starter drawing on [Specific Learning Outcomes] / [Key Inquiry Question].
    - development: 2 to 4 short steps, each taken from [Suggested Learning Experiences].
    - assessmentActivity: taken from [Assessment].
    - conclusion: a short closing tied to [Specific Learning Outcomes].
    - If a field's source is absent from the row, return an empty string (or an empty list for
      development) for it.

    TERM PLAN ROW:
    {row_text}
    """

    manual_schema = {
        "type": "OBJECT",
        "properties": {
            "introduction": {"type": "STRING"},
            "development": {"type": "ARRAY", "items": {"type": "STRING"}},
            "assessmentActivity": {"type": "STRING"},
            "conclusion": {"type": "STRING"},
        },
        "required": ["introduction", "development", "assessmentActivity", "conclusion"],
    }

    request = f"Draft one lesson for {sub_strand} from the term plan row."
    # Same RECITATION handling as generate_term_plan_content: retry once asking for rewording.
    retry_request = (request + " Rephrase each field in your own words rather than copying"
                     " the row verbatim, without adding anything new.")

    response = None
    for contents in (request, retry_request):
        response = ai_client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=manual_schema,
                temperature=0.2,
            ),
        )
        if response.text:
            break

    if not response.text:
        candidate = response.candidates[0] if response.candidates else None
        reason = candidate.finish_reason if candidate else response.prompt_feedback
        raise RuntimeError(f"Gemini returned no content (reason: {reason})")

    generated = json.loads(response.text)
    # Enforced here as well as in the prompt: a field with no source in the row stays empty.
    steps = [str(step).strip() for step in generated.get("development") or [] if str(step).strip()]
    return {
        "introduction": (str(generated.get("introduction") or "").strip()
                         if row["outcomes"] or row["keyInquiryQuestion"] else ""),
        "development": steps[:MAX_LESSON_STEPS] if row["experiences"] else [],
        "assessmentActivity": str(generated.get("assessmentActivity") or "").strip() if row["assessment"] else "",
        "conclusion": str(generated.get("conclusion") or "").strip() if row["outcomes"] else "",
    }



if __name__ == "__main__":
    print(" CBC Agent is ready!")
    print("Type 'exit' to quit.\n")
    
    while True:
        user_prompt = input("What would you like to create? (e.g., 'Make a lesson plan for Grade 4 Agriculture on conserving water'):\n> ")
        
        if user_prompt.lower() in ['exit', 'quit']:
            break
            
        if not user_prompt.strip():
            continue
            
        try:
            # 1. Generate the object
            lesson_plan_obj = generate_lesson_plan(user_prompt)
            
            # 2. Sanitize filename (remove spaces/special chars)
            safe_strand = "".join(c for c in lesson_plan_obj.sub_strand if c.isalnum() or c in (' ', '_')).rstrip()
            filename = f"Lesson_Plan_{safe_strand.replace(' ', '_')}.docx"
            
            # 3. Create the Word Document
            print(" Drawing the Word Document...")
            create_lesson_plan_docx(lesson_plan_obj, output_path=filename)
            
        except Exception as e:
            print(f" An error occurred: {e}")