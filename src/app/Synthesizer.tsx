import { css } from '@emotion/css';
import RxFM, { equals, FC } from 'rxfm';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { gain } from './gain';
import { polyphonicOscillator } from './oscillator';
import { RangeInput } from './RangeInput';
import { AudioOutput, connectTo, mapToNull, octavate } from './utils';

interface SynthesizerProps {
  input: Observable<number[]>;
  output: Observable<AudioOutput>;
}

const oscillatorTypeOptions: OscillatorType[] = ["sawtooth", "sine", "square", "triangle"];

const octaves = [-2, -1, 0, 1, 2];

export const SynthesizerVoice: FC<SynthesizerProps> = ({ input, output }) => {
  const gainAmount = new BehaviorSubject<number>(0.15);
  const oscillatorType = new BehaviorSubject<OscillatorType>("sawtooth");
  const octavation = new BehaviorSubject<number>(1);

  const notes = combineLatest([input, octavation]).pipe(
    map(([midiNotes, octave]) => octave ? octavate(midiNotes, octave) : midiNotes),
  );

  const synthesizer = notes.pipe(
    map(keys => octavate(keys, 1)),
    polyphonicOscillator({ type: oscillatorType }),
    gain(gainAmount),
    connectTo(output),
  );

  return <div class={synthesizerStyles}>
    <RangeInput label="Gain" setValue={value => gainAmount.next(value)} value={gainAmount} max={1} step={0.05} />
    <select onChange={(_, host) => oscillatorType.next(host.value as OscillatorType)}>
      {oscillatorTypeOptions.map(type => <option value={type} selected={equals(oscillatorType, type)}>{type}</option>)}
    </select>
    <select onChange={(_, host) => octavation.next(Number.parseInt(host.value))}>
      {octaves.map(octave => <option value={octave} selected={equals(octavation, octave)}>{octave}</option>)}
    </select>
    {mapToNull(synthesizer)}
  </div>;
};

const synthesizerStyles = css`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 16px;
`;

export const Synthesizer: FC<SynthesizerProps> = ({ input, output }) => {
  return <div>
    <SynthesizerVoice input={input} output={output} />
    <SynthesizerVoice input={input} output={output} />
  </div>;
};
