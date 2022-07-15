import RxFM, { conditional, log } from 'rxfm';
import { css } from '@emotion/css';
import { MidiKeyboard, midiKeyboardHandlers, midiKeyboardNoteEvents } from './MidiKeyboard';
import { Synthesizer } from './Synthesizer';
import { audioContext, audioContextSubject } from './audio-context';
import { from, merge } from 'rxjs';
import { noteOff, noteOn } from './events';
import { scheduleNotes } from './noteScheduler';

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
  noteOn({ midiNote: 62, time: 3 }),
  noteOff({ midiNote: 62, time: 4 }),
];

const noteSequence = from(testNotes).pipe(
  scheduleNotes(),
  log(),
);

const noteEvents = merge(noteSequence, midiKeyboardNoteEvents);

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
    {conditional(audioContextSubject, <Synthesizer noteEvents={noteEvents} output={audioContext} />)}
    <MidiKeyboard />
  </div>;
};
