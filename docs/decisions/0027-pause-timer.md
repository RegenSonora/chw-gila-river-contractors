# 0027 — Pause and Resume on the running timer

- **Status:** Accepted by Chris, November 16, 2026
- **Spec:** SPEC §5 (timer, rounding, editing), §7 (entry log, fingerprint); data version 4, fingerprint canonical form v3

## Decision

1. **Pausing.** The timer screen gets **Pause**, and **Resume** while paused.
   - The clock shows worked time and stops while paused.
   - A pause can last any length, even overnight. The paused timer survives closing the app, like the running timer does.
2. **One entry minus its breaks.** On Stop, one entry is saved with:
   - its real start and stop
   - each break, as a start and stop

   Billed hours are the worked time (stop − start − breaks), rounded to the nearest 0.25 hr once. "Too short" checks worked time.
3. **Stop while paused** ends the entry at the moment of pausing, so a pause left open overnight doesn't bill the night.
4. **Overlap** is still checked on the entry's start and stop, so a paused block stays reserved. To log other work during a pause, stop the timer instead.
5. **Edit entry** shows the breaks as "· 20 min paused".
   - Changing the times clips the breaks to the new start and stop, and drops breaks that fall outside.
   - **Remove breaks** clears them.
   - Hand-entered entries have no breaks.
6. **Entry log CSV.**
   - `raw_duration` is the worked time before rounding.
   - A new `paused` column (h:mm:ss) follows it.
   - Start and stop stay the real times.
7. **Fingerprint canonical form v3** adds each entry's breaks. Older invoices keep their form and still verify.
8. **Data version 4.** The upgrade gives every entry, draft, frozen invoice entry and running timer an empty list of breaks.

## Why

CHWs step away during a block of work. Stopping and starting again splits one visit into two entries and rounds it twice. Keeping one entry with its breaks keeps the real times, and bills only the time worked.
