import RxFM, { conditional, log } from 'rxfm';
import { css } from '@emotion/css';
import { MidiKeyboard, midiKeyboardHandlers, midiKeyboardNoteEvents } from './MidiKeyboard';
import { Synthesizer } from './Synthesizer';
import { audioContext, audioContextSubject } from './audio-context';
import { merge, of } from 'rxjs';
import { noteOff, noteOn } from './events';
import { quarterNotesToTicks, scheduleNotes } from './noteScheduler';
import { playing, togglePlaying } from './time';

/**
 * TODO
 * Convert note time to beat time
 * Add loops
 * Additive, subtractive, FM, AM synths
 */

// const metronome = Array(40).fill(undefined).flatMap((_, i) => {
//   const startTime = quarterNoteLength * i;
//   return [
//     noteOn({ midiNote: 62, startTime }),
//     noteOff({ midiNote: 62, stopTime: startTime + 0.01 }),
//   ];
// });

const dawStyles = css`
  display: grid;
  grid-auto-columns: min-content;
  grid-gap: 8px;
  padding-top: 8px;
  justify-items: start;
`;

const testNotes = [
  noteOn({ midiNote: 62, ticks: quarterNotesToTicks(0) }),
  noteOff({ midiNote: 62, ticks: quarterNotesToTicks(0) + 1 }),
  noteOn({ midiNote: 62, ticks: quarterNotesToTicks(1) }),
  noteOff({ midiNote: 62, ticks: quarterNotesToTicks(1) + 1 }),
  noteOn({ midiNote: 62, ticks: quarterNotesToTicks(2) }),
  noteOff({ midiNote: 62, ticks: quarterNotesToTicks(2) + 1 }),
  noteOn({ midiNote: 74, ticks: quarterNotesToTicks(3) }),
  noteOff({ midiNote: 74, ticks: quarterNotesToTicks(3) + 1 }),
  // endOfTrack({ ticks: quarterNotesToTicks(4) }),
];

const noteSequence = of(testNotes).pipe(
  scheduleNotes({
    clipEndTicks: of(quarterNotesToTicks(4)),
    loop: of(true),
  }),
  log(),
);

const noteEvents = merge(midiKeyboardNoteEvents, noteSequence);

// const recordingSubject = new BehaviorSubject(false);

// const timedEvents = recordingSubject.pipe(
//   switchMap(recording => {
//     if (!recording) return of(null);
//     return combineLatest([midiKeyboardNoteEvents, audioContext, tempo]).pipe(
//       map(([event, audioContext, tempo]) => ({ ...event, ticks: secondsToTicks(tempo, audioContext.currentTime) })),
//       takeUntil(recordingSubject.pipe(filter(recording => !recording))),
//       reduce((events, event) => {
//         events.push(event);
//         return events;
//       }, [] as NoteEvent[]),
//       log(),
//     );
//   }),
// );

// // const time

// timedEvents.subscribe(console.log);

export const Daw = () => {
  const init = () => {
    audioContextSubject.next(new AudioContext());
    audioContextSubject.value?.resume();
  };
  
  const destroy = () => {
    audioContextSubject.value?.suspend();
    audioContextSubject.next(undefined);
  };

  return <div class={dawStyles} {...midiKeyboardHandlers}>
    <button onClick={conditional(audioContextSubject, destroy, init)}>
      {conditional(audioContextSubject, "Stop", "Start")}
    </button>
    {conditional(audioContextSubject, <div>
      <Synthesizer midiEvents={noteEvents} output={audioContext} />
      <button onClick={togglePlaying}>
        {conditional(playing, "Pause", "Play")}
      </button>
    </div>)}
    <MidiKeyboard />
  </div>;
};
