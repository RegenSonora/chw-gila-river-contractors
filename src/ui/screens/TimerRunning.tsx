// Timer running (SPEC §5, decisions 0009, 0027): large clock of worked time, Pause or Resume,
// largest Stop, Discard with confirmation.
import { useEffect, useState } from 'preact/hooks';
import { timerWorkedSeconds } from '../../core';
import { Confirm, Page } from '../components';
import {
  clockLabel,
  dateLabel,
  localDateTime,
  shortDateLabel,
  timeLabel,
  timeRangeLabel,
} from '../format';
import { useApp, type StopResult } from '../store';
import { entryNames } from '../components';
import { HomeHeaderAside } from './Home';

type Asking = null | 'discard' | Exclude<StopResult, { kind: 'ok' }>;

export function TimerRunning() {
  const { data, selectedSource, actions } = useApp();
  const timer = data.app.running_timer;
  const [now, setNow] = useState(() => Date.now());
  const [asking, setAsking] = useState<Asking>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  if (!timer || !selectedSource) return null;
  const paused = timer.paused_at !== null;
  const elapsed = timerWorkedSeconds(timer, now);
  const startDate = localDateTime(timer.start).date;

  const stop = async () => {
    const result = await actions.stopTimer();
    if (result.kind !== 'ok') setAsking(result);
  };

  return (
    <Page
      title="CHW Gila River Contractors"
      aside={
        <HomeHeaderAside
          onChip={() => {
            // Locked while the timer runs.
          }}
        />
      }
      mainClass="content timer"
      footer={
        <>
          {paused ? (
            <button type="button" class="btn btn-pause" onClick={() => void actions.resumeTimer()}>
              Resume
            </button>
          ) : (
            <button type="button" class="btn2 btn-pause" onClick={() => void actions.pauseTimer()}>
              Pause
            </button>
          )}
          <button type="button" class="btn-stop" onClick={() => void stop()}>
            <span class="stop-square" aria-hidden="true" />
            Stop
          </button>
          <button
            type="button"
            class="txt"
            onClick={() => {
              setAsking('discard');
            }}
          >
            Discard timer
          </button>
        </>
      }
    >
      <p class={paused ? 'timer-label timer-paused' : 'timer-label'} aria-live="polite">
        <span class="dot" aria-hidden="true" />
        {paused ? 'Paused' : 'Timer running'} · {selectedSource.code}
      </p>
      <p class="clock" role="timer" aria-label="Worked time">
        {clockLabel(elapsed)}
      </p>
      <p class="timer-started">
        Started {timeLabel(timer.start)}, {dateLabel(startDate)}
      </p>
      {timer.paused_at !== null && (
        <p class="timer-started">Paused since {timeLabel(timer.paused_at)}</p>
      )}
      <p class="hint timer-note">
        {paused
          ? 'You can close the app. Tap Resume when you start again; paused time is not billed.'
          : 'You can close the app. The timer keeps counting.'}
      </p>

      {asking === 'discard' && (
        <Confirm
          title="Discard this timer?"
          body={<p>The time won't be saved.</p>}
          confirm="Discard timer"
          cancel="Keep timing"
          onConfirm={() => {
            setAsking(null);
            void actions.discardTimer();
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking !== null && asking !== 'discard' && asking.kind === 'too_short' && (
        <Confirm
          title="Too short to bill"
          body={<p>That's under 8 minutes, too short to bill. Nothing has been saved.</p>}
          confirm="Keep timing"
          second={{
            label: 'Discard',
            onClick: () => {
              setAsking(null);
              void actions.discardTimer();
            },
          }}
          onConfirm={() => {
            setAsking(null);
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking !== null && asking !== 'discard' && asking.kind === 'overlap' && (
        <Confirm
          title="This time overlaps another entry"
          body={
            <p>
              This timer overlaps your {timeRangeLabel(asking.other.start, asking.other.stop)} entry
              on {shortDateLabel(asking.other.entry_date)} ({entryNames(asking.other).task}). Fix
              the times to save it.
            </p>
          }
          confirm="Fix the times"
          cancel="Keep timing"
          onConfirm={() => {
            setAsking(null);
            void actions.fixTimerTimes();
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
    </Page>
  );
}
