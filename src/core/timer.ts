// The running timer and its pauses (SPEC §5, decision 0027). Stored as plain data, so it survives
// closing the app; these functions only move it from one state to the next.
import { parseIso, pausedSeconds, type Break } from './time';

export interface RunningTimer {
  /** ISO 8601 with offset. */
  start: string;
  source_id: string;
  /** Set while paused: when the pause began. */
  paused_at: string | null;
  /** Finished pauses, oldest first. */
  breaks: Break[];
}

export function startTimer(now: string, sourceId: string): RunningTimer {
  return { start: now, source_id: sourceId, paused_at: null, breaks: [] };
}

export function pauseTimer(timer: RunningTimer, now: string): RunningTimer {
  return timer.paused_at === null ? { ...timer, paused_at: now } : timer;
}

/** A resume in the same second as the pause records no break. */
export function resumeTimer(timer: RunningTimer, now: string): RunningTimer {
  if (timer.paused_at === null) return timer;
  const pausedMs = parseIso(timer.paused_at).epochMs;
  const breaks =
    parseIso(now).epochMs > pausedMs
      ? [...timer.breaks, { start: timer.paused_at, stop: now }]
      : timer.breaks;
  return { ...timer, paused_at: null, breaks };
}

/** What Stop saves. Stopped while paused, the entry ends at the pause, not now. */
export function timerStop(
  timer: RunningTimer,
  now: string,
): { start: string; stop: string; breaks: Break[] } {
  return { start: timer.start, stop: timer.paused_at ?? now, breaks: [...timer.breaks] };
}

/** Worked seconds so far, for the clock: frozen while paused. */
export function timerWorkedSeconds(timer: RunningTimer, nowMs: number): number {
  const end = timer.paused_at === null ? nowMs : parseIso(timer.paused_at).epochMs;
  const span = Math.floor((end - parseIso(timer.start).epochMs) / 1000);
  return Math.max(0, span - pausedSeconds(timer.breaks));
}
