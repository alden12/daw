import { BehaviorSubject, combineLatest, EMPTY, from, Observable, of, timer } from 'rxjs';
import { MidiEvent, NoteEvent } from './events';
import { distinctUntilChanged, map, share, shareReplay, switchMap, switchScan, withLatestFrom } from 'rxjs/operators';
import IntervalTree from 'node-interval-tree';
import { getTimeNow } from './audio-context';
import { scheduleLoops } from './scheduleLoop';

const tempoSubject = new BehaviorSubject(120); // bpm
export const tempo = tempoSubject.pipe(distinctUntilChanged());
export const setTempo = (tempo: number) => tempoSubject.next(tempo);

const secondsPerQuarterNote = (tempo: number) => 60 / tempo;
const ticksPerQuarterNote = 120;

export const ticksToSeconds = <Ticks extends number | undefined>(tempo: number, ticks: Ticks): Ticks =>
  (ticks && (ticks! / ticksPerQuarterNote) * secondsPerQuarterNote(tempo)) as Ticks;
export const secondsToTicks = <Seconds extends number | undefined>(tempo: number, seconds: Seconds): Seconds =>
  (seconds && (seconds! / secondsPerQuarterNote(tempo)) * ticksPerQuarterNote) as Seconds;

export const quarterNotesToTicks = (quarterNotes: number) => quarterNotes * ticksPerQuarterNote;
export const ticksToQuareterNotes = (ticks: number) => ticks / ticksPerQuarterNote;

const noteScehdulePeriod = 100; // ms
const noteScheduleMargin = 1.2;

const ticksOffset = new BehaviorSubject(0);
const playing = new BehaviorSubject(true);

// Change ticks offset -> go there
// Start -> count from ticks offset
// Pause -> hold at value
// Play -> count from last value
// Stop -> return to zero and reset ticks offset

const currentTicks = combineLatest([ticksOffset, getTimeNow]).pipe(
  switchMap(([ticksOffset, getTimeNow]) => playing.pipe(
    switchScan((previousTicks, playing) => {
      if (!playing) return of(previousTicks);
      const startTime = getTimeNow();
      return combineLatest([tempo, timer(0, noteScehdulePeriod)]).pipe(
        // TODO: Changing tempo will scale the output, this should behave the same as ticksOffset and reset from the current position?
        map(([tempo]) => secondsToTicks(tempo, getTimeNow() - startTime) + ticksOffset),
      );
    }, ticksOffset),
  )),
  shareReplay({ refCount: true, bufferSize: 1 }),
);

// TODO: Store these as combined start and end events as an interval? Then easier to display.
const midiEventsToIntervalTree = () => (events: Observable<MidiEvent[]>)  => events.pipe(
  map((events) => {
    const intervalTree = new IntervalTree<NoteEvent>();
    events.forEach(event => {
      const ticks = event.ticks ?? 0;
      intervalTree.insert(ticks, ticks, event);
    });
    return intervalTree;
  }),
);

interface ScheduleNotesProps {
  clipStartTicks?: Observable<number>;
  clipEndTicks?: Observable<number>;
  loop?: Observable<boolean>;
  loopTicksLength?: Observable<number>;
}

export const scheduleNotes = ({
  clipStartTicks = of(0),
  clipEndTicks = of(Infinity),
  loop = of(false),
  loopTicksLength = of(Infinity),
}: ScheduleNotesProps = {}) => (events: Observable<MidiEvent[]>) => events.pipe(
  midiEventsToIntervalTree(),
  switchMap(intervalTree => {
    let scheduleEnd = 0;
    return currentTicks.pipe(
      withLatestFrom(tempo, clipStartTicks, clipEndTicks, loop, loopTicksLength),
      switchMap(([currentTicks, tempo, clipStart, clipEnd, loop]) => {
        const scheduleStart = Math.max(currentTicks, scheduleEnd);
        scheduleEnd = currentTicks + secondsToTicks(tempo, (noteScehdulePeriod / 1000) * noteScheduleMargin) + 1;

        if (loop) {
          const loops = scheduleLoops({
            clipRange: [clipStart, clipEnd],
            scheduleRange: [scheduleStart, scheduleEnd],
          });
          const events = loops.flatMap(
            ({ ticksRange, offset }) => intervalTree.search(...ticksRange).map(
              event => ({ ...event, ticks: (event.ticks || 0) + offset }),
            ),
          );
          return from(events);
        }

        // Return empty if outside of the clip range.
        if (clipStart > scheduleEnd || clipEnd <= scheduleStart) return EMPTY;
        const events = intervalTree.search(scheduleStart, scheduleEnd);
        return from(events);
      }),
    );
  }),
  share(),
);
