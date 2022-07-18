import { BehaviorSubject, combineLatest, from, Observable, of, timer } from 'rxjs';
import { MidiEvent, NoteEvent } from './events';
import { distinctUntilChanged, map, share, shareReplay, switchMap, switchScan, withLatestFrom } from 'rxjs/operators';
import IntervalTree from 'node-interval-tree';
import { getTimeNow } from './audio-context';

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

// const currentTicks = timer(0, noteScehdulePeriod).pipe(
//   withLatestFrom(getTimeNow),
//   map(([, now]) => now()),
//   // log("timer"),
//   // share(),
//   shareReplay({ refCount: true, bufferSize: 1 }),
// );

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
  startTicks?: Observable<number>;
  endTicks?: Observable<number>;
  loop?: Observable<boolean>;
}

// TODO: Add start end and loop observable inputs?
export const scheduleNotes = ({
  startTicks = of(0),
  endTicks = of(Infinity),
  loop = of(false),
}: ScheduleNotesProps = {}) => (events: Observable<MidiEvent[]>) => events.pipe(
  midiEventsToIntervalTree(),
  switchMap(intervalTree => {
    let ticksRangeEnd = 0;
    return currentTicks.pipe(
      withLatestFrom(tempo),
      switchMap(([ticksStart, tempo]) => {
        const ticksRangeStart = Math.max(ticksStart, ticksRangeEnd);
        ticksRangeEnd = ticksStart + secondsToTicks(tempo, (noteScehdulePeriod / 1000) * noteScheduleMargin) + 1;
        const events = intervalTree.search(ticksRangeStart, ticksRangeEnd);
        // console.log(`${events.length} events found between ${ticksStartRange} and ${ticksEndRange} | start: ${start} end: ${start + (noteScehdulePeriod / 1000) * noteScheduleMargin}`);
        return from(events);
      }),
    );
  }),
  share(),
);
