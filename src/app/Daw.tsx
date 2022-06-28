import RxFM, { conditional } from 'rxfm';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/css';
import { Oscillator } from './Oscillator';

const audioContextSubject = new BehaviorSubject<AudioContext | undefined>(undefined);
export const audioContext = audioContextSubject.asObservable();

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

  return <div class={dawStyles}>
    <button onClick={conditional(audioContext, destroy, init)}>
      {conditional(audioContext, "Stop", "Start")}
    </button>
    {conditional(audioContext, <Oscillator />)}
  </div>;
};
