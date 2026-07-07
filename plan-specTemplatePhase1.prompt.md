Proceed with Phase 1 only.

## Goal
Make the initial spec-template and job index bridge changes without touching the later persistence work.

## Phase 1 Scope
- Rename `spec-template.html` if needed in future notes only; the actual Phase 1 file rename is already complete.
- Leave `spec_template.restore-*.html` files unchanged as historical artifacts.
- Update `scripts/manifests/client.txt` so the client bundle points to `spec-template.html`.
- Update any documentation references that still mention `spec-template.html` only if they are stale.
- In `spec-template.html`, update only the visible labels and placeholders listed below.

## Phase 1 Changes in spec-template.html
1. In the Spec. Details section:
- Rename the visible field header `Department` to `Category`.
- Change the prompt `Select Department` to `Select Category`.

2. In the `To be done by` field:
- Replace `Department/Contractor` with `Yard / Crew / Contractor`.
- Treat the field concept as `Responsibility` for the job-index bridge later.

3. In the `Job ID` field:
- Change the placeholder from `e.g., EL007` to `e.g., EL-007`.

4. In the repeat / copied header block:
- Rename the visible `Department` label to `Category` there as well.

## Notes
- Keep internal IDs and JS variable names unchanged unless a later linking phase requires a focused change.
- Do not introduce the persistence/linking logic yet.
- Do not create a Standard Template file yet.
- Do not merge Phase 2 or Phase 3 into this change.

## Architecture direction for later phases
- Phase 2 should be separate from Phase 3.
- Phase 2 is the link contract between `job-index.html` and `spec-template.html`.
- Phase 3 is the persistence and file-generation problem.
- The Standard Template should be treated as a static resource such as `resources/spec-standard.html` in a later phase, not now.

## Current understanding of job-index.html
- Job IDs are auto-generated in the HTML logic.
- The table already has `Section`, `Job ID`, `Timing`, and `Responsibility` columns.
- The later bridge should map:
  - Job Index Section -> Spec Category
  - Job Index Responsibility -> Spec Responsibility
  - Job Index Timing -> Spec Timing
  - Job Index Job ID -> Spec Job ID

## Suggested later phase behavior
- Clicking a Job ID should eventually open or create a unique spec instance.
- That spec instance should be derived from the blank spec template or a standard template when implemented later.

## Open decisions already resolved
- Leave restore files as historical artifacts.
- Do Phase 2 and Phase 3 separately.
- Defer Phase 3 persistence and standard-template generation.
