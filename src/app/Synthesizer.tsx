import { css } from '@emotion/css';
import RxFM, { equals, FC } from 'rxfm';
import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { isOfType, MidiEvent } from './events';
import { gain } from './gain';
import { oscillator } from './oscillator';
import { RangeInput } from './RangeInput';
import { AudioOutput, connectTo, mapToNull } from './utils';

interface SynthesizerProps {
  midiEvents: Observable<MidiEvent>;
  output: Observable<AudioOutput>;
}

const oscillatorTypeOptions: OscillatorType[] = ["sawtooth", "sine", "square", "triangle"];

const octavationOptions = [-2, -1, 0, 1, 2];

export const SynthesizerVoice: FC<SynthesizerProps> = ({ midiEvents, output }) => {
  const gainAmount = new BehaviorSubject<number>(0.15);
  const oscillatorType = new BehaviorSubject<OscillatorType>("triangle");
  const octavation = new BehaviorSubject<number>(0);

  const octavatedEvents = combineLatest([midiEvents, octavation]).pipe(
    mergeMap(([event, octave]) => isOfType(event, "noteOn", "noteOff") && octave ?
      from([event, { ...event, midiNote: event.midiNote + octave * 12 }]) :
      of(event),
    ),
  );

  const synthesizer = octavatedEvents.pipe(
    oscillator({ type: oscillatorType }),
    gain(gainAmount),
    connectTo(output),
  );

  return <div class={synthesizerStyles}>
    <RangeInput label="Gain" setValue={value => gainAmount.next(value)} value={gainAmount} max={1} step={0.05} />
    <select onChange={(_, host) => oscillatorType.next(host.value as OscillatorType)}>
      {oscillatorTypeOptions.map(type => <option value={type} selected={equals(oscillatorType, type)}>{type}</option>)}
    </select>
    <select onChange={(_, host) => octavation.next(Number.parseInt(host.value))}>
      {octavationOptions.map(octave => <option value={octave} selected={equals(octavation, octave)}>{octave}</option>)}
    </select>
    {mapToNull(synthesizer)}
  </div>;
};

const synthesizerStyles = css`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 16px;
  padding-bottom: 16px;
`;

export const Synthesizer: FC<SynthesizerProps> = ({ midiEvents, output }) => {
  return <div>
    <SynthesizerVoice midiEvents={midiEvents} output={output} />
    {/* <SynthesizerVoice noteEvents={noteEvents} output={output} /> */}
  </div>;
};
