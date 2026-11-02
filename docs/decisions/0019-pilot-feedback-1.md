# 0019 — First user feedback: step headers, Past invoices on Home, task rename

- **Status:** Accepted by Chris, November 1, 2026
- **Spec:** SPEC §3 (tasks), §5 (entry flow), §6, §9 (screens); changes decision 0012

## Decision

1. **Entry step headers name the step.** Step 1 is "What did you do?" (the task list under it is labeled "Task"); step 2 is "Counts and notes". "Step 1 of 2" and "Step 2 of 2" stay.
2. **Past invoices is on Home**, as a row under the "Not yet invoiced" list showing how many invoices there are. It is no longer in Settings. What it opens is unchanged (decision 0012).
3. **The task "Planning and conducting surveys" is now "Individual and community assessment"** in both funding sources, keeping its id. Both source files go to version 2. Entries not yet invoiced show the new name; past invoices keep the name they were made with, so their fingerprints still verify.

## Deferred

The request for five more counts (Screenings conducted, Client goals achieved, Health plans made, Quick wins, Contracts signed) is set aside for now. Adding fixed counts needs a data upgrade, new entry log CSV columns and fingerprint form v2; it gets its own plan.

## Why

Users said "New entry" didn't tell them where they were, Past invoices was hard to find in Settings, and the task name didn't match how CHWs describe the work.
