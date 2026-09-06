-- 20260906120000_apm_case_model_answer_headings.sql
--
-- APM CASE `model_answer`s: PREFIX EACH SECTION LABEL WITH "## ". NOTHING ELSE CHANGES.
--
-- WHY. All 18 published APM case `model_answer`s carry their section labels on BARE LINES
-- separated from the body by a SINGLE CRLF. `MessageRenderer` follows GFM and joins consecutive
-- non-blank lines with a space, so design B — which serves these bytes VERBATIM beneath the
-- reveal wrapper — renders the label swallowed into the sentence below it, and the reveal's
-- pointer beat has no real section name to point at.
--
-- The paragraph normaliser (commit `1f32d8b`, `normaliseRevealArtefact`) already makes each of
-- those lines its own PARAGRAPH. This migration makes the 83 that are section labels
-- HEADINGS — the thing a pointer can name. The two changes are independent: the normaliser
-- needs no content edit, and this needs no code change.
--
-- WHAT IT DOES, EXACTLY. For each of the 18 rows, for each of its section labels, it rewrites
-- the standalone line `LABEL` to `## LABEL`. It touches no other field, no other row, and no
-- other character: the apply loop ASSERTS, per row, that the new text with every `## ` removed
-- is BYTE-IDENTICAL to the old text, and that the length grew by exactly 3 × (headings).
--
-- HOW A LABEL IS IDENTIFIED. Not by a heuristic — by enumeration. Every label below is a
-- LITERAL, listed per requirement id, and matched only as a WHOLE LINE that opens a block
-- (`CRLF CRLF LABEL CRLF`). The loop RAISES if a label is absent, or if it occurs more than
-- once. A silent no-op is impossible.
--
-- IDEMPOTENT. A row that already contains `## ` is skipped (verified pre-flight: none of the 18
-- contains that sequence today). Re-running after a successful run is a no-op that still passes
-- every assertion.
--
-- TRANSACTIONAL. One BEGIN/COMMIT. The assertion block runs BEFORE the COMMIT, so any mismatch
-- — a missing label, a changed body, a wrong count — RAISES and rolls the whole thing back.
--
-- REVERT (safe only because `## ` occurs nowhere else in these 18 rows, asserted below):
--   UPDATE acca_case_requirements SET model_answer = replace(model_answer, '## ', '')
--    WHERE id IN (<the 18 ids listed below>);
--
-- P-DB3 SNAPSHOT — run this FIRST and keep the output:
--   SELECT r.id, c.title, r.label, r.model_answer
--     FROM acca_case_requirements r JOIN acca_cases c ON c.id = r.case_id
--    WHERE c.paper_code = 'APM' ORDER BY c.title, r.requirement_order;
--
-- Expected: 18 rows touched, 83 headings. Per-requirement counts are in the final SELECT.

BEGIN;

-- ── APPLY ────────────────────────────────────────────────────────────────────
DO $apply$
DECLARE
  spec jsonb := $spec$
[
  { "case": "Vesla Retail", "req": "(i) The churn model output",
    "id": "83c9e788-d79a-45b7-b7bc-725288f00802",
    "headings": [
      "The accuracy claim",
      "The app-usage recommendation",
      "Training-data limitations",
      "Insights that can be acted on",
      "The \"model is complete\" claim",
      "Conclusion"
    ] },

  { "case": "Vesla Retail", "req": "(ii) Data and systems risks",
    "id": "04d353dd-cece-43df-8c52-c43b878ee730",
    "headings": [
      "Exported customer files on laptops",
      "Shared login",
      "Free online visualisation tool",
      "Stale access rights",
      "Overall"
    ] },

  { "case": "Aldermere Fitness", "req": "(i) The current board report",
    "id": "79e20a04-466e-40a0-946f-96d959a0e19b",
    "headings": [
      "Alignment with mission and objectives",
      "Needs of the users",
      "Information overload and relevance",
      "Best practice in presentation",
      "Scepticism",
      "Conclusion"
    ] },

  { "case": "Aldermere Fitness", "req": "(ii) Narrative commentary",
    "id": "d8add90f-3ba3-4b39-b218-e34810478c8b",
    "headings": [
      "Suggested narrative commentary"
    ] },

  { "case": "Bexley Grocers", "req": "(i) The big data proposal",
    "id": "184278c5-9c9d-43eb-a97a-1f9aae093a66",
    "headings": [
      "Volume",
      "Velocity",
      "Variety",
      "Veracity",
      "Assessment"
    ] },

  { "case": "Bexley Grocers", "req": "(ii) Ethical issues",
    "id": "3e5cca0a-0951-458d-9646-b91ccb9a1b05",
    "headings": [
      "Consent and the basis of collection",
      "The uninterrogable algorithm",
      "Targeting the vulnerable",
      "Advice"
    ] },

  { "case": "Halworth Hotels", "req": "(i) The benchmarking exercise",
    "id": "4cbbf311-f63e-4743-83df-b72b31441ea5",
    "headings": [
      "Calculations (Carrick; Dunmore; Elsinore)",
      "What the comparison can and cannot say",
      "The FD's design choices",
      "The alternatives the NED raises",
      "Conclusion"
    ] },

  { "case": "Halworth Hotels", "req": "(ii) The head-office measurement proposal",
    "id": "7a4f3dc3-6e45-4127-bb26-171c4f4f915a",
    "headings": [
      "Dimensions",
      "Standards",
      "Rewards",
      "Conclusion"
    ] },

  { "case": "Halworth Hotels", "req": "(iii) The budgeting proposal",
    "id": "3641cf4c-2130-42c6-8868-b2ab2f288f65",
    "headings": [
      "The problem with the current method, at Halworth specifically",
      "What rolling budgets would fix — and cost",
      "Recommendation"
    ] },

  { "case": "Keldan Foods", "req": "(i) The current board report",
    "id": "9e167905-5626-426a-adad-226e0e836193",
    "headings": [
      "Calculations (20X5; 20X4)",
      "Evaluation against the mission and objectives"
    ] },

  { "case": "Keldan Foods", "req": "(ii) The consultant's proposed scorecard measures",
    "id": "097e0e7d-99a6-44dc-935c-3b3606619a4b",
    "headings": [
      "Customer perspective",
      "Innovation and learning perspective",
      "Conclusion"
    ] },

  { "case": "Keldan Foods", "req": "(iii) The proposed reward scheme",
    "id": "72871c0d-cf65-42aa-8397-7917724c5b97",
    "headings": [
      "What the scheme would reward",
      "What gets measured gets done — and what would get done here",
      "The committee's claims",
      "Design points",
      "Conclusion"
    ] },

  { "case": "Orlen Cinemas", "req": "(i) The charts and numerical presentation",
    "id": "7314bd33-42d2-492b-94c5-8af03e44a4bc",
    "headings": [
      "Chart 1 — truncated axis",
      "Chart 2 — cumulative series",
      "Chart 3 — 3D pie",
      "Chart 4 — rolling average with no single-year figures",
      "The numbers behind the presentation",
      "Advice"
    ] },

  { "case": "Orlen Cinemas", "req": "(ii) The narrative commentary",
    "id": "dc1629bf-fdd8-459a-97ce-1dbb0bc1fa35",
    "headings": [
      "\"A record year\" and \"all-time high revenue\"",
      "\"Admissions momentum continued throughout the year\"",
      "\"Compared with 20X2, admissions are up 31%\"",
      "\"Adjusted operating profit rose to EUR 12.1m\"",
      "\"Cost pressures were entirely driven by industry-wide inflation and outside management's control\"",
      "Overall advice"
    ] },

  { "case": "Rivenor Pharma Distribution", "req": "(i) The current board report",
    "id": "4067a856-0801-4f6f-b883-783846d757c1",
    "headings": [
      "Alignment with the mission and objectives",
      "Needs of the users",
      "Information overload",
      "Best practice in presentation",
      "Scepticism",
      "Conclusion"
    ] },

  { "case": "Rivenor Pharma Distribution", "req": "(ii) The proposed dashboard",
    "id": "a3dadd58-3154-430c-8664-dbf7b631c617",
    "headings": [
      "OTIF line chart with the 96% commitment as a reference line",
      "Pie chart of revenue across 32 product categories",
      "RAG status panel per strategic objective",
      "Word cloud of complaint text",
      "Sparklines beside each KPI",
      "Overall"
    ] },

  { "case": "Torfin Build Supplies", "req": "(i) Data silos and the systems proposal",
    "id": "0374e966-ff7c-4368-93a7-b1efcecb849b",
    "headings": [
      "Problems the silos create",
      "Whether the ERPS/CRM addresses them",
      "The operations director's objection",
      "Conclusion"
    ] },

  { "case": "Torfin Build Supplies", "req": "(ii) The monthly reporting pack",
    "id": "aecf935f-02cd-4ae4-8714-705255787a33",
    "headings": [
      "Structurise (sort — keep only what is needed)",
      "Systemise (set in order — organised, easy to find and use)",
      "Sanitise (shine — remove obsolete and redundant information)",
      "Standardise (make the clean state the routine)",
      "Self-discipline (sustain — keep it lean over time)",
      "Value of the information"
    ] }
]
$spec$;
  item     jsonb;
  h        text;
  old_body text;
  body     text;
  needle   text;
  hits     int;
  n_head   int;
  n_rows   int := 0;
  n_marks  int := 0;
BEGIN
  IF jsonb_array_length(spec) <> 18 THEN
    RAISE EXCEPTION 'spec must list all 18 APM case requirements, found %', jsonb_array_length(spec);
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(spec) LOOP
    SELECT model_answer INTO old_body
      FROM acca_case_requirements
     WHERE id = (item->>'id')::uuid
     FOR UPDATE;

    IF old_body IS NULL THEN
      RAISE EXCEPTION 'requirement % (% %) not found, or its model_answer is null',
        item->>'id', item->>'case', item->>'req';
    END IF;

    n_head  := jsonb_array_length(item->'headings');
    n_marks := n_marks + n_head;

    -- Idempotent: a row already carrying a markdown heading is left exactly as it is.
    IF position('## ' in old_body) > 0 THEN
      CONTINUE;
    END IF;

    -- Prepend a synthetic block separator so the FIRST block's label matches the same
    -- whole-line anchor as every other one. Stripped again below.
    body := E'\r\n\r\n' || old_body;

    FOR h IN SELECT jsonb_array_elements_text(item->'headings') LOOP
      needle := E'\r\n\r\n' || h || E'\r\n';
      hits := (length(body) - length(replace(body, needle, ''))) / length(needle);
      IF hits <> 1 THEN
        RAISE EXCEPTION 'label "%" occurs % times as a standalone block-opening line on % (% %); expected exactly 1',
          h, hits, item->>'id', item->>'case', item->>'req';
      END IF;
      body := replace(body, needle, E'\r\n\r\n## ' || h || E'\r\n');
    END LOOP;

    body := substr(body, 5);   -- drop the synthetic separator

    -- NOTHING ELSE CHANGED. Both directions, per row, before the write.
    IF replace(body, '## ', '') <> old_body THEN
      RAISE EXCEPTION 'text other than the "## " prefixes changed on % (% %)',
        item->>'id', item->>'case', item->>'req';
    END IF;
    IF length(body) <> length(old_body) + 3 * n_head THEN
      RAISE EXCEPTION 'length moved by % on % (% %); expected exactly %',
        length(body) - length(old_body), item->>'id', item->>'case', item->>'req', 3 * n_head;
    END IF;

    UPDATE acca_case_requirements SET model_answer = body WHERE id = (item->>'id')::uuid;
    n_rows := n_rows + 1;
  END LOOP;

  RAISE NOTICE 'applied: % row(s) rewritten, % heading(s) declared across all 18', n_rows, n_marks;
END
$apply$;

-- ── ASSERT BEFORE COMMIT ─────────────────────────────────────────────────────
-- Any failure here RAISES and rolls back the block above.
DO $assert$
DECLARE
  rows_with_h2   int;
  total_h2       int;
  apm_rows       int;
  stray_h2_paper int;
BEGIN
  SELECT count(*) INTO apm_rows
    FROM acca_case_requirements r JOIN acca_cases c ON c.id = r.case_id
   WHERE c.paper_code = 'APM';
  IF apm_rows <> 18 THEN
    RAISE EXCEPTION 'expected 18 APM case requirements, found %', apm_rows;
  END IF;

  SELECT count(*) FILTER (WHERE r.model_answer LIKE '%## %'),
         coalesce(sum((length(r.model_answer) - length(replace(r.model_answer, E'\r\n## ', ''))) / 5)
                  + count(*) FILTER (WHERE r.model_answer LIKE '## %'), 0)
    INTO rows_with_h2, total_h2
    FROM acca_case_requirements r JOIN acca_cases c ON c.id = r.case_id
   WHERE c.paper_code = 'APM';

  IF rows_with_h2 <> 18 THEN
    RAISE EXCEPTION 'expected all 18 APM rows to carry a "## " heading, found %', rows_with_h2;
  END IF;
  IF total_h2 <> 83 THEN
    RAISE EXCEPTION 'expected 83 headings across the 18 rows, found %', total_h2;
  END IF;

  -- AFM case requirements are NOT in scope and must not have moved.
  SELECT count(*) INTO stray_h2_paper
    FROM acca_case_requirements r JOIN acca_cases c ON c.id = r.case_id
   WHERE c.paper_code <> 'APM' AND r.model_answer LIKE '%## %';
  IF stray_h2_paper <> 0 THEN
    RAISE EXCEPTION 'non-APM case requirements were touched: % row(s) now carry "## "', stray_h2_paper;
  END IF;

  RAISE NOTICE 'assert: 18/18 rows carry a heading, 83 headings total, 0 non-APM rows touched';
END
$assert$;

COMMIT;

-- ── VERIFICATION (read-only; this is the output to paste back) ────────────────
-- Column `headings` is the per-requirement count to eyeball against the migration's own list.
-- Column `other_text_intact` re-derives the pre-migration text by stripping every "## " and
-- confirms nothing but the prefixes moved (it compares LENGTH, the one thing recoverable
-- post-commit — the byte-exact comparison already ran inside the transaction, above).
SELECT c.title                                            AS case_title,
       r.label                                            AS requirement,
       (length(r.model_answer) - length(replace(r.model_answer, E'\r\n## ', ''))) / 5
         + (CASE WHEN r.model_answer LIKE '## %' THEN 1 ELSE 0 END)  AS headings,
       (r.model_answer LIKE '%## %')                      AS has_h2,
       length(r.model_answer)                             AS len_now,
       length(replace(r.model_answer, '## ', ''))         AS len_stripped,
       length(r.model_answer) - length(replace(r.model_answer, '## ', '')) AS bytes_added
  FROM acca_case_requirements r
  JOIN acca_cases c ON c.id = r.case_id
 WHERE c.paper_code = 'APM'
 ORDER BY c.title, r.requirement_order;

-- Expected (83 headings, 18/18 has_h2 true, bytes_added = 3 × headings on every row):
--   Aldermere Fitness            (i)   6      Orlen Cinemas                (i)   6
--   Aldermere Fitness            (ii)  1      Orlen Cinemas                (ii)  6
--   Bexley Grocers               (i)   5      Rivenor Pharma Distribution  (i)   6
--   Bexley Grocers               (ii)  4      Rivenor Pharma Distribution  (ii)  6
--   Halworth Hotels              (i)   5      Torfin Build Supplies        (i)   4
--   Halworth Hotels              (ii)  4      Torfin Build Supplies        (ii)  6
--   Halworth Hotels              (iii) 3      Vesla Retail                 (i)   6
--   Keldan Foods                 (i)   2      Vesla Retail                 (ii)  5
--   Keldan Foods                 (ii)  3
--   Keldan Foods                 (iii) 5                              TOTAL   83
