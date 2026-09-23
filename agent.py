import os
import re
import json
import warnings
import chromadb
import boto3
from dotenv import load_dotenv
from strands import Agent
from strands.models.gemini import GeminiModel

from backend.plain_text import to_plain_text
from backend.retry import retry_transient
from bedrock_embedding import BedrockEmbeddingFunction
from gemini_embedding import GeminiEmbeddingFunction
from models import DailyLessonContent, LessonPlan, SchemeOfWork, TermPlanContent
from doc_generator import create_lesson_plan_docx, create_scheme_of_work_docx

# 1. Load environment variables
load_dotenv()
gemini_key = os.environ.get("GEMINI_API_KEY")
aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
aws_region = os.environ.get("AWS_REGION", "us-east-1")
bedrock_model_id = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")
aws_configured = (
    aws_access_key
    or os.environ.get("AWS_PROFILE")
    or os.environ.get("AWS_DEFAULT_REGION")
    or os.environ.get("BEDROCK_MODEL_ID")
)
use_bedrock = bool(aws_configured or not gemini_key)

# Agent.structured_output is deprecated in favour of structured_output_model on a normal
# invocation, but that path runs the agent loop with an output tool. These functions must
# stay single, tool-free calls, so the deprecated method is kept deliberately.
warnings.filterwarnings("ignore", message=r"Agent\.structured_output(_async)? method is deprecated",
                        category=DeprecationWarning)


class GeminiNoContentError(RuntimeError):
    """Gemini returned no content; finish_reason says why (e.g. RECITATION)."""

    def __init__(self, finish_reason):
        super().__init__(f"Gemini returned no content (reason: {finish_reason})")
        self.finish_reason = finish_reason


class GroundedGeminiModel(GeminiModel):
    """GeminiModel whose structured output keeps the finish reason when Gemini returns nothing.

    Strands' own implementation validates response.parsed directly, so a RECITATION refusal
    surfaces as a generic pydantic ValidationError, indistinguishable from other failures.
    """

    async def structured_output(self, output_model, prompt, system_prompt=None, **kwargs):
        params = {
            **(self.config.get("params") or {}),
            "response_mime_type": "application/json",
            "response_schema": output_model.model_json_schema(),
        }
        request = self._format_request(prompt, None, system_prompt, params)
        # Hold the Client for the whole call: a temporary one is garbage-collected mid-request,
        # closing its aiohttp session (AssertionError: self._connector is not None).
        client = self._get_client()
        try:
            response = await client.aio.models.generate_content(**request)
        finally:
            await client.aio.aclose()
        if not response.text:
            candidate = response.candidates[0] if response.candidates else None
            finish_reason = candidate.finish_reason if candidate else response.prompt_feedback
            raise GeminiNoContentError(finish_reason)
        yield {"output": output_model.model_validate_json(response.text)}


# 2. Initialize selected provider
if use_bedrock:
    print(f"Using AWS Bedrock provider (Region: {aws_region}, Model: {bedrock_model_id})")
    bedrock_client = boto3.client(
        service_name="bedrock-runtime",
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key,
        aws_session_token=os.environ.get("AWS_SESSION_TOKEN"),
    )
    gemini_model = None
else:
    gemini_model = GroundedGeminiModel(
        client_args={"api_key": gemini_key},
        model_id="gemini-3.1-flash-lite",
        params={"temperature": 0.2},
    )


def _structured_output(output_model, system_instruction: str, contents: str):
    # Each attempt starts from scratch, so a retry never inherits a failed call's state.
    return retry_transient(lambda: _structured_output_once(output_model, system_instruction, contents),
                           what=f"{output_model.__name__} generation")


def _structured_output_once(output_model, system_instruction: str, contents: str):
    if use_bedrock:
        json_system_prompt = f"""{system_instruction}

CRITICAL: Return ONLY valid JSON matching this exact JSON schema:
{json.dumps(output_model.model_json_schema(), indent=2)}

Do NOT include any introduction, conversational text, or markdown code block markers (like ```json).
"""
        response = bedrock_client.converse(
            modelId=bedrock_model_id,
            messages=[{"role": "user", "content": [{"text": contents}]}],
            system=[{"text": json_system_prompt}],
            inferenceConfig={
                "temperature": 0.2,
                "maxTokens": 4096,
            },
        )
        raw_text = response["output"]["message"]["content"][0]["text"]
        cleaned_text = re.sub(r"^```json\s*", "", raw_text.strip(), flags=re.MULTILINE)
        cleaned_text = re.sub(r"^```\s*", "", cleaned_text.strip(), flags=re.MULTILINE)
        cleaned_text = cleaned_text.rstrip("`").strip()
        return output_model.model_validate_json(cleaned_text)

    # A fresh Agent per call: the system prompt differs per request, and a shared Agent's
    # prompt would race between concurrent API requests. No tools are ever registered.
    agent = Agent(model=gemini_model, system_prompt=system_instruction, callback_handler=None)
    return agent.structured_output(output_model, contents)


def _is_recitation(exc: GeminiNoContentError) -> bool:
    return "RECITATION" in str(exc.finish_reason)


def _structured_output_with_recitation_retry(output_model, system_instruction: str,
                                             request: str, retry_request: str):
    if use_bedrock:
        return _structured_output(output_model, system_instruction, request)

    # Gemini blocks near-verbatim copies of published text (finish_reason RECITATION),
    # which KICD designs are; a retry asking for rewording stays grounded but passes.
    try:
        return _structured_output(output_model, system_instruction, request)
    except GeminiNoContentError as exc:
        if not _is_recitation(exc):
            raise
    return _structured_output(output_model, system_instruction, retry_request)


# 3. Connect to the Chroma Vector Database
CHROMA_DB_PATH = "kicd_chroma_db"
COLLECTION_NAME = "kicd_curriculum"

db_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
if use_bedrock:
    gemini_ef = BedrockEmbeddingFunction(region_name=aws_region)
else:
    gemini_ef = GeminiEmbeddingFunction(api_key=gemini_key)
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
    

    return _structured_output(LessonPlan, system_instruction, prompt)


TERM_PLAN_FIELD_SOURCES = {
    "keyInquiryQuestion": "Key Inquiry Questions",
    "outcomes": "Specific Learning Outcomes",
    "experiences": "Suggested Learning Experiences",
    "resources": "Resources",
    "assessment": "Assessment",
}


# KICD writes each design in the language it teaches through: the Kiswahili designs are in
# Kiswahili, every other design (Arabic and Indigenous Languages included) in English. Drafts
# follow the evidence's language, so a Kiswahili teacher gets a Kiswahili plan and nothing
# is translated -- a translation would no longer be the KICD wording the draft cites.
SAME_LANGUAGE_RULE = (
    "- Write every field in the same language as the evidence (Kiswahili evidence gives a\n"
    "      Kiswahili plan, English evidence an English one). Never translate it."
)


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
    {SAME_LANGUAGE_RULE}

    KICD EVIDENCE:
    {evidence_text}
    """

    request = f"Organise the evidence for {sub_strand} into the scheme-of-work fields."
    retry_request = (request + " Rephrase each field in your own words rather than copying"
                     " the evidence verbatim, without adding anything new.")

    generated = _structured_output_with_recitation_retry(
        TermPlanContent, system_instruction, request, retry_request
    ).model_dump()
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
    {SAME_LANGUAGE_RULE.replace("evidence", "row")}

    TERM PLAN ROW:
    {row_text}
    """

    request = f"Draft one lesson for {sub_strand} from the term plan row."
    retry_request = (request + " Rephrase each field in your own words rather than copying"
                     " the row verbatim, without adding anything new.")

    generated = _structured_output_with_recitation_retry(
        DailyLessonContent, system_instruction, request, retry_request
    ).model_dump()
    # Enforced here as well as in the prompt: a field with no source in the row stays empty.
    steps = [str(step).strip() for step in generated.get("development") or [] if str(step).strip()]
    return {
        "introduction": (str(generated.get("introduction") or "").strip()
                         if row["outcomes"] or row["keyInquiryQuestion"] else ""),
        "development": steps[:MAX_LESSON_STEPS] if row["experiences"] else [],
        "assessmentActivity": str(generated.get("assessmentActivity") or "").strip() if row["assessment"] else "",
        "conclusion": str(generated.get("conclusion") or "").strip() if row["outcomes"] else "",
    }


REFLECTION_EVIDENCE_LABELS = {
    "learnerActions": "What learners said or did",
    "workEvidence": "Learner work or assessment evidence available",
    "needSupport": "Learners or groups needing additional support",
    "difficulties": "Difficulties observed",
    "revisit": "What to revisit next lesson",
}

REFLECTION_SUMMARY_PERSONA = """You summarise a Kenyan CBC teacher's own post-lesson reflection notes back to them.

HARD RULES:
- Use ONLY what the teacher wrote. Never add a claim about learners, their work, their
  understanding or their progress that the teacher did not state.
- Never state, suggest, imply or hint at whether the learning outcome was achieved, partly
  achieved or not achieved, or whether there is enough evidence to judge it. Do not use words
  such as achieved, attained, mastered, met the outcome or on track. That decision belongs to
  the teacher alone.
- If the teacher recorded little, say plainly that limited evidence was recorded and name the
  prompts left blank. Do not pad the summary or speculate about what the gaps might mean.
- Keep it short: two to four sentences.
- Write in the same language as the teacher's notes. Notes in English get an English summary;
  only notes written in Kiswahili get a Kiswahili summary.
- Plain text only: no markdown, asterisks or headings."""

# The outcome decision is the teacher's alone. Any sentence using judgement language is dropped
# here in code, not just discouraged in the prompt: when in doubt, the sentence is left out.
_STATUS_LANGUAGE = re.compile(
    r"\b(achiev\w*|attain\w*|master(ed|y|ing)?|insufficient evidence|on track|"
    r"(met|meets?|meeting) (the |this |their |its )?(specific )?(learning )?(outcomes?|objectives?)|"
    r"(outcomes?|objectives?) (was|were|is|are|has been|have been) (not )?met|"
    r"(exceeds?|meets?|approach(es|ing)?|below) expectations|"
    r"matarajio|\w*faulu\w*)\b",
    re.IGNORECASE,
)


def _drop_status_sentences(text: str) -> str:
    kept_lines = []
    for line in text.splitlines():
        kept = [s for s in re.split(r"(?<=[.!?])\s+", line) if s.strip() and not _STATUS_LANGUAGE.search(s)]
        if kept or not line.strip():
            kept_lines.append(" ".join(kept))
    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept_lines)).strip()


def generate_reflection_summary(evidence: dict[str, str]) -> str:
    """Summarises ONLY the teacher's own reflection notes, in plain text; never judges achievement."""
    notes = {field: str(evidence.get(field) or "").strip() for field in REFLECTION_EVIDENCE_LABELS}
    notes_text = "\n\n".join(
        f"[{label}]\n{notes[field] or '(left blank)'}" for field, label in REFLECTION_EVIDENCE_LABELS.items()
    )

    request = f"Summarise these reflection notes for the teacher.\n\n{notes_text}"
    raw_summary = retry_transient(lambda: _summarise_once(request), what="reflection summary")

    # Applied whichever provider answered: the achievement-language rule is never provider-specific.
    summary = _drop_status_sentences(to_plain_text(raw_summary))
    if not summary:
        raise RuntimeError("Every sentence of the summary judged the outcome, so none of it was kept.")
    return summary


def _summarise_once(request: str) -> str:
    if use_bedrock:
        # Plain-text counterpart of _structured_output's Bedrock path: the persona is the system
        # prompt and the text comes back as-is, with no JSON schema wrapping.
        response = bedrock_client.converse(
            modelId=bedrock_model_id,
            messages=[{"role": "user", "content": [{"text": request}]}],
            system=[{"text": REFLECTION_SUMMARY_PERSONA}],
            inferenceConfig={"temperature": 0.2, "maxTokens": 1024},
        )
        return response["output"]["message"]["content"][0]["text"]
    # A fresh tool-free Agent per call on the shared model, like the other generation functions.
    agent = Agent(model=gemini_model, system_prompt=REFLECTION_SUMMARY_PERSONA, callback_handler=None)
    return str(agent(request))



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