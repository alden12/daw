import { BehaviorSubject, combineLatest, EMPTY, from, Observable, of, timer } from 'rxjs';
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

type TicksRange = [start: number, end: number];
type TicksRangeWithOffset = [start: number, end: number, offset: number];

// const getLoopTickIntervals = (
//   [clipStart, clipEnd]: TicksRange,
//   [rangeStart, rangeEnd]: TicksRange,
//   current: number,
// ): TicksRangeWithOffset[] => {
//   const clipLength = clipEnd - clipStart;
//   const playedDuration = rangeStart - clipStart;
//   const pointInLoop = clipStart + playedDuration % clipLength;
//   const rangeLength = rangeEnd - rangeStart;
//   const shouldWrap = (pointInLoop + rangeLength) > clipEnd;
//   const ticksSinceStart = current - clipStart;
//   const loopNumber = Math.floor(ticksSinceStart / clipLength);
//   const loopStartOffset = loopNumber * clipLength;
//   if (!shouldWrap) return [[pointInLoop, pointInLoop + rangeLength, loopStartOffset]];
//   const wrapLength = pointInLoop + rangeLength - clipEnd;
//   if (wrapLength >= pointInLoop) return [[clipStart, clipEnd, ]];
//   return [
//     [pointInLoop, clipEnd],
//     [clipStart, wrapLength],
//   ];
// };

// const getLoopStartOffset = ([clipStart, clipEnd]: TicksRange, currentTicks: number) => {
//   const clipLength = clipEnd - clipStart;
//   const ticksSinceStart = currentTicks - clipStart;
//   const loopNumber = Math.floor(ticksSinceStart / clipLength);
//   return loopNumber * clipLength;
// };

const scheduleLoop = (
  [clipStart, clipEnd]: TicksRange,
  [rangeStart, rangeEnd]: TicksRange,
  loopStartOffset = 0,
): TicksRangeWithOffset[] => {
  if (rangeEnd <= clipStart) return [];

  const clipLength = clipEnd - clipStart;
  if (clipLength <= 0) return [];

  return [
      [Math.max(clipStart, rangeStart), Math.min(clipEnd, rangeEnd), loopStartOffset],
      ...scheduleLoop([clipStart, clipEnd], [clipStart, clipStart + rangeEnd - clipEnd], loopStartOffset + clipLength),
  ];
};

interface ScheduleNotesProps {
  clipStartTicks?: Observable<number>;
  clipEndTicks?: Observable<number>;
  loop?: Observable<boolean>;
}

export const scheduleNotes = ({
  clipStartTicks = of(0),
  clipEndTicks = of(Infinity),
  loop = of(false),
}: ScheduleNotesProps = {}) => (events: Observable<MidiEvent[]>) => events.pipe(
  midiEventsToIntervalTree(),
  switchMap(intervalTree => {
    let ticksRangeEnd = 0;
    return currentTicks.pipe(
      withLatestFrom(tempo, clipStartTicks, clipEndTicks, loop),
      switchMap(([currentTicks, tempo, clipStartTicks, clipEndTicks, loop]) => {
        const ticksRangeStart = Math.max(currentTicks, ticksRangeEnd);
        ticksRangeEnd = currentTicks + secondsToTicks(tempo, (noteScehdulePeriod / 1000) * noteScheduleMargin) + 1;

        if (loop) {
          const playedDuration = ticksRangeStart - clipStartTicks;
          const pointInLoop = clipStartTicks + playedDuration % (clipEndTicks - clipStartTicks);
          const loopIntervals = scheduleLoop([clipStartTicks, clipEndTicks], [pointInLoop, pointInLoop + (ticksRangeEnd - ticksRangeStart)], currentTicks - pointInLoop);
          const events = loopIntervals.flatMap(
            ([start, end, offset]) => intervalTree.search(start, end).map(
              event => ({ ...event, ticks: event.ticks !== undefined ? event.ticks + offset : undefined }),
            ),
          );
          console.log({ events });
          return from(events);

          // // Return empty if the loop hasn't started yet.
          // if (ticksRangeStart < clipStartTicks) return EMPTY;
          // const loopIntervals = getLoopTickIntervals([clipStartTicks, clipEndTicks], [ticksRangeStart, ticksRangeEnd], currentTicks);
          // const events = loopIntervals.map(([start, end]) => intervalTree.search(start, end));
          // const loopStartOffset = getLoopStartOffset([clipStartTicks, clipEndTicks], currentTicks);
          // if (events[1]) {
          //   const clipLength = clipEndTicks - clipStartTicks;
          //   events[1][0].ticks = events[1][0].ticks && events[1][0].ticks + clipLength;
          //   events[1][1].ticks = events[1][1].ticks && events[1][1].ticks + clipLength;
          // }
          // // TODO: Wrapped events need to be one clip length offset further along.
          // return from(events.flat()).pipe(
          //   map(event => ({ ...event, ticks: event.ticks && event.ticks + loopStartOffset })),
          // );
        }

        // Return empty if outside of the clip range.
        if (clipStartTicks > ticksRangeEnd || clipEndTicks <= ticksRangeStart) return EMPTY;
        const events = intervalTree.search(ticksRangeStart, ticksRangeEnd);
        return from(events);
      }),
    );
  }),
  share(),
);
