import { css } from '@emotion/css';
import RxFM, { equals, FC } from 'rxfm';
import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { gain } from './gain';
import { oscillator } from './oscillator';
import { RangeInput } from './RangeInput';
import { AudioOutput, connectTo, mapToNull, NoteEvent } from './utils';

interface SynthesizerProps {
  noteEvents: Observable<NoteEvent>;
  output: Observable<AudioOutput>;
}

const oscillatorTypeOptions: OscillatorType[] = ["sawtooth", "sine", "square", "triangle"];

const octavationOptions = [-2, -1, 0, 1, 2];

export const SynthesizerVoice: FC<SynthesizerProps> = ({ noteEvents, output }) => {
  const gainAmount = new BehaviorSubject<number>(0.15);
  const oscillatorType = new BehaviorSubject<OscillatorType>("sawtooth");
  const octavation = new BehaviorSubject<number>(1);

  const octavatedNoteEvents = combineLatest([noteEvents, octavation]).pipe(
    mergeMap(([noteEvent, octave]) => octave ?
      from([noteEvent, { ...noteEvent, midiNote: noteEvent.midiNote + octave * 12 }]) :
      of(noteEvent),
    ),
  );

  const synthesizer = octavatedNoteEvents.pipe(
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

export const Synthesizer: FC<SynthesizerProps> = ({ noteEvents, output }) => {
  return <div>
    <SynthesizerVoice noteEvents={noteEvents} output={output} />
    <SynthesizerVoice noteEvents={noteEvents} output={output} />
  </div>;
};
