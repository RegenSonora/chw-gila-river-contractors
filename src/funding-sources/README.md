# src/funding-sources

One JSON file per funding source (CLAUDE.md rule 6), validated against `schemas/funding-source.schema.json` at build time.

Task lists and certification text here are licensed CC BY 4.0 (see `NOTICE`).

Files: `tisupp.json` (code `TISUPP`), the only source in this app: one budget line, a prefilled NTE and a rate step at 240 hours (decision 0023). The split-point TISUPP and Regen General Operating files live on as test fixtures in `tests/core/fixtures/sources/`. A file is named `<id>.json`; ids never change once released. Bump `version` when tasks, budget lines or text change.
