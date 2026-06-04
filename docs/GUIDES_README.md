# Subject Guides — Required for Content Audits

The official examining-body subject guides are REQUIRED for all content-accuracy audits but are NOT committed to this repo (copyright — they are gitignored via `docs/*.pdf`).

**Guides must be downloaded locally into `docs/` on each working machine before running any content audit.**

Files needed:
- IB Economics guide (first assessment 2022) — `new_economics_guide_first_assessment_2022.pdf`
- IB Business Management guide (2024) — `Business_Management_Subject_Guide.pdf`

Do NOT commit these PDFs (copyright; gitignore is correct — leave it). They vanish on fresh clone / other machine by design — re-download them locally.

See the "Official guide = single source of truth" rule in GRADD_BUILD_HARDENING.md.

## Where the guides live (do not duplicate)

The subject guide PDFs live in exactly TWO places, each for one purpose. Do not put them anywhere else.

1. LOCAL DISK `docs/` — read by Claude Code during content audits. Gitignored (copyright), so re-download to docs/ on each machine. Currently present: IB Economics 2022, IB Business Management, ACCA APM (apm_s26_j27).

2. CLAUDE PROJECT KNOWLEDGE — read by chat sessions (any chat in the project sees them automatically). Do NOT re-upload guides into individual chats — they are already project files. Re-uploading wastes the per-chat file limit.

NOT in git (gitignored, copyright — correct, leave the .gitignore).
NOT uploaded per-chat (redundant — they are project files).

Rule: a new chat reads guides from PROJECT KNOWLEDGE. Claude Code reads them from LOCAL DISK. Neither requires any upload or file-moving.
