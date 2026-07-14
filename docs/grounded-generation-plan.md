# Grounded Generation — Future Plan

**Goal**: Reduce AI hallucination in lesson notes without requiring textbook uploads or RAG infra.

## Concept
Instead of RAG over uploaded PDFs, bake structured knowledge into the curriculum data itself. Each topic gets a rich JSON entry that grounds the AI prompt:

```json
{
  "className": "Pry 3", "subject": "Mathematics", "topic": "Addition of 3-Digit Numbers",
  "definition": "...",
  "procedure": ["...", "..."],
  "formulas": ["..."],
  "examples": ["342 + 256 = 598"],
  "commonMistakes": ["Forgetting to carry over"],
  "realWorldApplications": ["Adding prices"],
  "diagramDescriptions": ["Draw H T U columns"]
}
```

## Why this instead of RAG
- NERDC curriculum is standardized — one knowledge base covers all schools
- No PDF parsing, no vector DB, no new infra
- Prompt stays fully grounded in curated data
- Teachers don't need to hold phones AND textbooks

## For calculations / illustrations
- Formulas stored as plain text (Unicode superscript/subscript)
- Diagram descriptions tell the teacher what to draw on the board
- No images in the response — the AI generates the *teaching script*

## Status
- [ ] Design schema for topic knowledge entries
- [ ] Populate for high-priority subjects (Math, Basic Science, English)
- [ ] Wire into generateLessonNote prompt injection
- [ ] Remove fallback to generic GEN_SUBJECT_TOPICS
