// Pausing the running timer (decision 0027).
import { describe, expect, it } from 'vitest';
import {
  pauseTimer,
  resumeTimer,
  startTimer,
  timerStop,
  timerWorkedSeconds,
} from '../../src/core/timer';

const t = (hhmmss: string, date = '2026-10-30') => `${date}T${hhmmss}-07:00`;
const ms = (iso: string) => Date.parse(iso);

describe('the running timer', () => {
  const started = startTimer(t('09:00:00'), 'tisupp');

  it('starts running with no breaks', () => {
    expect(started).toEqual({
      start: t('09:00:00'),
      source_id: 'tisupp',
      paused_at: null,
      breaks: [],
    });
    expect(timerWorkedSeconds(started, ms(t('09:30:00')))).toBe(1800);
  });

  it('pause stops the clock; resume records the break', () => {
    const paused = pauseTimer(started, t('09:40:00'));
    expect(paused.paused_at).toBe(t('09:40:00'));
    expect(timerWorkedSeconds(paused, ms(t('11:00:00')))).toBe(2400);
    const resumed = resumeTimer(paused, t('10:00:00'));
    expect(resumed).toEqual({
      ...started,
      breaks: [{ start: t('09:40:00'), stop: t('10:00:00') }],
    });
    expect(timerWorkedSeconds(resumed, ms(t('10:30:00')))).toBe(4200);
  });

  it('pausing twice or resuming a running timer changes nothing', () => {
    const paused = pauseTimer(started, t('09:40:00'));
    expect(pauseTimer(paused, t('09:50:00'))).toBe(paused);
    expect(resumeTimer(started, t('09:50:00'))).toBe(started);
  });

  it('a resume in the same second as the pause records no break', () => {
    const paused = pauseTimer(started, t('09:40:00'));
    expect(resumeTimer(paused, t('09:40:00')).breaks).toEqual([]);
  });

  it('stop while running ends now; stop while paused ends at the pause', () => {
    const resumed = resumeTimer(pauseTimer(started, t('09:40:00')), t('10:00:00'));
    expect(timerStop(resumed, t('10:30:00'))).toEqual({
      start: t('09:00:00'),
      stop: t('10:30:00'),
      breaks: [{ start: t('09:40:00'), stop: t('10:00:00') }],
    });
    // Paused overnight: the night isn't billed.
    const paused = pauseTimer(resumed, t('11:00:00'));
    expect(timerStop(paused, t('08:00:00', '2026-10-31'))).toEqual({
      start: t('09:00:00'),
      stop: t('11:00:00'),
      breaks: [{ start: t('09:40:00'), stop: t('10:00:00') }],
    });
  });
});
