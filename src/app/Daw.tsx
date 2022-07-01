import RxFM, { conditional } from 'rxfm';
import { css } from '@emotion/css';
import { MidiKeyboard, midiKeyboardHandlers, pressedKeys } from './MidiKeyboard';
import { Synthesizer } from './Synthesizer';
import { audioContext, audioContextSubject } from './audio-context';

const dawStyles = css`
  display: grid;
  grid-auto-columns: min-content;
  grid-gap: 8px;
  padding-top: 8px;
  justify-items: start;
`;

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
    {conditional(audioContextSubject, <Synthesizer input={pressedKeys} output={audioContext} />)}
    <MidiKeyboard />
  </div>;
};