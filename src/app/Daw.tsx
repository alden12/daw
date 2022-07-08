import RxFM, { conditional } from 'rxfm';
import { css } from '@emotion/css';
import { MidiKeyboard, midiKeyboardHandlers, noteEvents } from './MidiKeyboard';
import { Synthesizer } from './Synthesizer';
import { audioContext, audioContextSubject } from './audio-context';
import { from, merge } from 'rxjs';
import { noteOff, noteOn } from './utils';
import { delay } from 'rxjs/operators';

const dawStyles = css`
  display: grid;
  grid-auto-columns: min-content;
  grid-gap: 8px;
  padding-top: 8px;
  justify-items: start;
`;

const noteSequence = from([
  noteOn({ midiNote: 62, startTime: 3 }),
  noteOff({ midiNote: 62, stopTime: 4 }),
]).pipe(
  delay(100),
);

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
    {conditional(audioContextSubject, <Synthesizer noteEvents={merge(noteSequence, noteEvents)} output={audioContext} />)}
    <MidiKeyboard />
  </div>;
};
