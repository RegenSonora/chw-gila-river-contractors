# 0023 — Gila River contractors: TISUPP only, one budget line, a reminder at 240 hours

- **Status:** Accepted, November 2, 2026
- **Spec:** SPEC §3 (funding sources), §4 (settings and rate changes), §5 (entry flow); changes decisions 0006, 0008 and 0010 for this app

## Decision

The two Gila River contractors each have the same agreement:

| | |
|---|---|
| Funding source | TISUPP only |
| Budget line | CHW experience hours, for every hour tracked and billed |
| Rate | $20.00 for the first 240 hours, then $23.00 for the next 240 |
| Not-to-exceed | $10,320.00 (240 × $20.00 + 240 × $23.00) |

1. **TISUPP is the only source the app ships.** Regen General Operating is dropped from the app; its file is kept as a test fixture only.
2. **TISUPP has one budget line, CHW experience hours** (id `chw-experience-hours`). The source file goes to version 3.
3. **A choice with one option is not asked.** It is picked for the CHW and hidden. This covers the entry flow's source and budget line rows, the Home source chip, the setup checkbox and "Add a funding source" in Settings. Entries still store a source and a budget line, so storage, invoices, files and the fingerprint are unchanged. A row shows again if a draft ever holds a pick that doesn't match.
4. **The NTE is prefilled** from the source file (`default_nte_cents`) at setup. The CHW can still change it in Settings.
5. **The raise is a reminder, not a calculation.** The source file names the step (`rate_step`: after 960 quarter-hours, $23.00). The app keeps one rate per source (SPEC §4) and never changes it on its own. Once the hours billed plus the hours waiting reach 240, Home says:
   - while those hours are still waiting: "You've reached 240 hours. Generate your TISUPP invoice now, then change your rate to $23.00 in Settings."
   - once they are invoiced: "You've billed 240 hours. Your rate goes up to $23.00. Change it in Settings before your next invoice."
   The reminder stops when the rate is $23.00 or more. The rate field's hint also names the raise.

## Why

The contractors bill one funding source on one budget line, so asking either question adds taps and chances for mistakes. Hiding the choices and keeping the data model keeps the change small. Splitting an invoice's hours across two rates automatically would change invoice lines, both CSVs and the timesheet header. Chris chose the reminder instead.

## Known limit

An invoice that crosses 240 hours bills every entry on it at one rate: whichever rate is set when it is generated. The reminder asks the CHW to generate an invoice as soon as 240 hours are reached, which keeps the overlap small. Any difference is settled by the office outside the app, as SPEC §4 already says for retroactive raises. Hours count only invoices on this phone, the same as the NTE tracker.
