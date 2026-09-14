"""One-time metadata migration: clean up garbage `subject` values in ChromaDB.

Some chunks carry filename-derived subject strings because ingest.py's
extract_grade_subject() fell back to guessing from the filename when a source
PDF had no clean "SUBJECT GRADE N" header. This script remaps those to the
canonical subject names using collection.update(), which rewrites metadata only
-- documents and embeddings are untouched, so nothing is re-embedded.

Safe to re-run: chunks already carrying a canonical subject are skipped.
"""
import chromadb

CHROMA_DB_PATH = "kicd_chroma_db"  # top-level store only; ignore the nested duplicate
COLLECTION_NAME = "kicd_curriculum"

SUBJECT_FIXES = {
    "Agriculture 30.07.2024": "Agriculture",
    "English Updated Revised Sept": "English",
    "Final Indigenous Language Revised Oct": "Indigenous Languages",
    "Primary School Education Curriculum Design Arabic Language": "Arabic",
}

# This mapping is inferred from a messy filename-derived string, not confirmed
# against an authoritative KICD source. Flagged loudly so it is easy to spot
# and correct later if the real subject name differs.
GUESSED = "Primary School Education Curriculum Design Arabic Language"


def distinct(metadatas, field):
    return sorted({m.get(field, "") for m in metadatas})


def main():
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_collection(COLLECTION_NAME)

    data = collection.get(include=["metadatas"])
    print(f"Collection '{COLLECTION_NAME}': {collection.count()} chunk(s)\n")
    print("BEFORE")
    print("  subjects:", distinct(data["metadatas"], "subject"))
    print("  grades:  ", distinct(data["metadatas"], "grade"))

    ids_to_fix, metadatas_to_fix = [], []
    per_subject_counts = {}
    for id_, metadata in zip(data["ids"], data["metadatas"]):
        old = metadata.get("subject")
        if old in SUBJECT_FIXES:
            metadata["subject"] = SUBJECT_FIXES[old]
            ids_to_fix.append(id_)
            metadatas_to_fix.append(metadata)
            per_subject_counts[old] = per_subject_counts.get(old, 0) + 1

    print()
    if ids_to_fix:
        collection.update(ids=ids_to_fix, metadatas=metadatas_to_fix)
        print(f"Updated {len(ids_to_fix)} chunk(s) (metadata only, no re-embedding):")
        for old, count in sorted(per_subject_counts.items()):
            note = "   <-- GUESS, VERIFY THIS" if old == GUESSED else ""
            print(f"  {count:>4}  {old!r} -> {SUBJECT_FIXES[old]!r}{note}")
    else:
        print("Nothing to fix -- no chunks carry a known-bad subject value.")

    if GUESSED in per_subject_counts:
        print(
            "\n  !! NOTE: the 'Arabic' mapping is an INFERENCE from the filename-derived\n"
            "     string 'Primary School Education Curriculum Design Arabic Language'.\n"
            "     It was not confirmed against an authoritative source. If KICD names this\n"
            "     subject differently (e.g. 'Arabic Language'), correct SUBJECT_FIXES and\n"
            "     re-run. The other three mappings are unambiguous."
        )

    data = collection.get(include=["metadatas"])
    print("\nAFTER")
    print("  subjects:", distinct(data["metadatas"], "subject"))
    print("  grades:  ", distinct(data["metadatas"], "grade"))

    leftovers = [s for s in distinct(data["metadatas"], "subject") if s in SUBJECT_FIXES]
    print("\n" + ("All known-bad subject values are gone." if not leftovers
                  else f"WARNING: still present: {leftovers}"))


if __name__ == "__main__":
    main()
