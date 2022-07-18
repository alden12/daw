import { BehaviorSubject, combineLatest, from, Observable, of, timer } from 'rxjs';
import { MidiEvent, NoteEvent, isOfType } from './events';
import { distinctUntilChanged, map, scan, share, shareReplay, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import IntervalTree from 'node-interval-tree';
import { getTimeNow } from './audio-context';
import { log } from 'rxfm';

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

// TODO: Make this an operator which emits the current ticks range?
let previousTicks = 0;
const ticksRange = combineLatest([
  playing,
  getTimeNow,
  tempo,
  ticksOffset.pipe(tap(offset => previousTicks = offset)),
]).pipe(
  switchMap(([playing, getTimeNow, tempo, ticksOffset]) => {
    if (!playing) return of(previousTicks);
    return timer(0, noteScehdulePeriod).pipe(
      map(() => {
        const now = getTimeNow();
        const ticksNow = secondsToTicks(tempo, now) + ticksOffset;
        previousTicks = ticksNow;
        return ticksNow;
      }),
    );
  }),
);

const currentTicks = timer(0, noteScehdulePeriod).pipe(
  withLatestFrom(getTimeNow),
  map(([, now]) => now()),
  // log("timer"),
  // share(),
  shareReplay({ refCount: true, bufferSize: 1 }),
);

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

// const midiEventsToIntervalTree = () => (events: Observable<MidiEvent[]>)  => events.pipe(
//   scan((intervalTree, event) => {
//     const ticks = event.ticks ?? 0;
//     if (isOfType(event, "deleteNote", "updateNote")) {
//       const existingEvent = intervalTree.search(ticks, ticks).filter(({ midiNote }) => midiNote === event.midiNote)[0];
//       if (!existingEvent) return intervalTree;
//       intervalTree.remove(ticks, ticks, existingEvent);
//       if (event.type === "updateNote")
//         intervalTree.insert(event.newTicks, event.newTicks, { ...existingEvent, ticks: event.newTicks });
//     } else {
//       intervalTree.insert(ticks, ticks, event);
//       console.log(`${event.type} event inserted at: ${event.ticks}`);
//     }
//     return intervalTree;
//   }, new IntervalTree<NoteEvent>()),
//   distinctUntilChanged(),
// );

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
    let ticksEndRange = 0;
    return currentTicks.pipe(
      withLatestFrom(tempo),
      switchMap(([start, tempo]) => {
        const ticksStartRange = Math.max(secondsToTicks(tempo, start), ticksEndRange);
        ticksEndRange = secondsToTicks(tempo, start + (noteScehdulePeriod / 1000) * noteScheduleMargin) + 1;
        const events = intervalTree.search(ticksStartRange, ticksEndRange);
        // console.log(`${events.length} events found between ${ticksStartRange} and ${ticksEndRange} | start: ${start} end: ${start + (noteScehdulePeriod / 1000) * noteScheduleMargin}`);
        return from(events);
      }),
    );
  }),
  share(),
);
