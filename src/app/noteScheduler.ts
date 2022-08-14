import { BehaviorSubject, combineLatest, EMPTY, from, Observable, of, timer } from 'rxjs';
import { MidiEvent, NoteEvent } from './events';
import { distinctUntilChanged, map, share, switchMap, switchMapTo, withLatestFrom } from 'rxjs/operators';
import IntervalTree from 'node-interval-tree';
import { scheduleLoops } from './scheduleLoop';
import { getTimeNow, playing, getPlaybackTimeOffset } from './time';
import { getAudioContextTime } from './audio-context';

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

const scheduleTicksFrom = playing.pipe(
  switchMap(playing => playing ? timer(0, noteScehdulePeriod) : of(0)),
  switchMapTo(combineLatest([getTimeNow, tempo]).pipe(
    map(([getTimeNow, tempo]) => secondsToTicks(tempo, getTimeNow())),
  )),
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
    return scheduleTicksFrom.pipe(
      withLatestFrom(tempo, clipStartTicks, clipEndTicks, loop, getPlaybackTimeOffset, getAudioContextTime, loopTicksLength),
      switchMap(([scheduleTicksFrom, tempo, clipStart, clipEnd, loop, getPlaybackTimeOffset, getAudioContextTime]) => {
        const scheduleStart = Math.max(scheduleTicksFrom, scheduleEnd);
        scheduleEnd = scheduleTicksFrom + secondsToTicks(tempo, (noteScehdulePeriod / 1000) * noteScheduleMargin) + 1;

        const playbackTicksOffset = secondsToTicks(tempo, getPlaybackTimeOffset());

        console.log({ playbackTicksOffset, audioContextTime: secondsToTicks(tempo, getAudioContextTime()) });

        if (loop) {
          const loops = scheduleLoops({
            clipRange: [clipStart, clipEnd],
            scheduleRange: [scheduleStart, scheduleEnd],
          });
          const events = loops.flatMap(
            ({ ticksRange, offset }) => intervalTree.search(...ticksRange).map(
              event => ({ ...event, ticks: (event.ticks || 0) + offset  + playbackTicksOffset }),
            ),
          );
          return from(events);
        }

        // Return empty if outside of the clip range.
        if (clipStart > scheduleEnd || clipEnd <= scheduleStart) return EMPTY;
        // TODO: Get min and max of schedule and clip
        const events = intervalTree.search(scheduleStart, scheduleEnd);
        return from(events).pipe(
          map(event => ({ ...event, ticks: event.ticks && event.ticks + playbackTicksOffset }))
        );
      }),
    );
  }),
  share(),
);
