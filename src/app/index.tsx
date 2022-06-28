import RxFM, { conditional } from 'rxfm';
import { BehaviorSubject, Observable } from 'rxjs';
// import { css } from 'glamor';
import { css } from '@emotion/css';

import './styles.css';
import { mapTo, tap } from 'rxjs/operators';

// const fancyText = css({
//   color: 'red',
//   ':hover': {
//     color: 'pink'
//   },
// });

// type FcWithSource<T, P = Record<string, never>> = FC<P> & { source: Observable<T> };

// function block<T, P = Record<string, never>>(
//   source: Observable<T>,
//   componentFunction: (source: Observable<T>) => FC<P> = () => () => <div />,
// ): FcWithSource<T, P> {
//   const sharedSource = reuse(source);
//   const fcWithSource = componentFunction(sharedSource) as FcWithSource<T, P>;
//   fcWithSource.source = sharedSource;
//   return fcWithSource;
// }

const audioContext = new AudioContext();

// let oscillator: OscillatorNode | undefined = undefined;

const oscillator = (props: Observable<{ frequency: number }>) => {
  const oscillatorNode = audioContext.createOscillator();
  oscillatorNode.connect(audioContext.destination);
  oscillatorNode.start(0);

  return props.pipe(
    tap(({ frequency }) => oscillatorNode.frequency.value = frequency),
    mapTo(null),
  );
};

// const Osiclator: FC<{ frequency: Observable<number> }> = ({ frequency }) => {
//   const oscillator = audioContext.createOscillator();
//   oscillator.connect(audioContext.destination);
//   oscillator.start(0);

//   return (<div />).pipe(
//     switchTap(() => frequency.pipe(
//       tap(frequency => oscillator.frequency.value = frequency)
//     )),
//   );
// };

// const init = () => {
//   createOscilator();
// };

const StartButton = () => {
  const started = new BehaviorSubject(false);

  const start = () => {
    started.next(true);
    // init();
    audioContext.resume();
  };
  
  const stop = () => {
    started.next(false);
    audioContext.suspend();
  };

  return <button onClick={conditional(started, stop, start)}>
    {conditional(started, "Stop", "Start")}
  </button>;
};

// m  =  12*log2(fm/440 Hz) + 69     and    fm  =  2(m−69)/12(440 Hz).

const midiToFrequency = (midiNote: number) => Math.pow(2, (midiNote - 69) / 12) * 440;

const MidiInput = ({ setFrequency }: { setFrequency: (frequency: number) => void }) => {
  return <input type="numeric" onChange={event => {
    const frequency =  midiToFrequency(Number(event.target.value));
    setFrequency(frequency);
  }} />;
};

// const Foo = block(
//   timer(0, 1000),
//   source => ({ name }: { name: string }) => <div>{name}: {source}</div>,
// );

const dawStyles = css({
  display: "grid",
  gridAutoColumns: "min-content",
  gridGap: "8px",
});

const Daw = () => {
  const oscillatorProps = new BehaviorSubject({ frequency: 440 });

  return <div class={dawStyles}>
    <StartButton />
    <MidiInput setFrequency={(frequency => oscillatorProps.next({ ...oscillatorProps.value, frequency }))} />
    {/* <Osiclator frequency={frequency} /> */}
    {oscillator(oscillatorProps)}
  </div>;
};

const fancyText = css`
  color: red;
  &:hover {
    color: pink;
  }
`;

const App = () => <div id="app">
  <span class={fancyText}>DAW</span>
  <Daw />
  {/* <Foo name="hello" /> */}
</div>;

App().subscribe(element => document.body.appendChild(element));
