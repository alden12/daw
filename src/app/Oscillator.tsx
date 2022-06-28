import RxFM, { selectFrom } from 'rxfm';
import { BehaviorSubject, Observable } from 'rxjs';
import { combineLatestWith, filter, map, mapTo, tap } from 'rxjs/operators';
import { audioContext } from './Daw';
import { RangeInput } from './RangeInput';

const midiToFrequency = (midiNote: number) => Math.pow(2, (midiNote - 69) / 12) * 440;

interface OscillatorProps {
  midiNote: number;
}

const oscillator = (props: Observable<OscillatorProps>) => audioContext.pipe(
  filter(Boolean),
  map((audioContext) => {
    const oscillatorNode = audioContext.createOscillator();
    oscillatorNode.connect(audioContext.destination);
    oscillatorNode.start(0);
    return oscillatorNode;
  }),
  combineLatestWith(props),
  tap(([oscillatorNode, { midiNote }]) => oscillatorNode.frequency.value = midiToFrequency(midiNote)),
  mapTo(null),
);

interface OscillatorProps {
  midiNote: number;
}

export const Oscillator = () => {
  const props = new BehaviorSubject<OscillatorProps>({ midiNote: 60 });
  const setProp = <K extends keyof OscillatorProps>(key: K) => (value: OscillatorProps[K]) => props.next({ ...props.value, [key]: value });

  return <div>
    <RangeInput label="MIDI Note" setValue={setProp("midiNote")} value={selectFrom(props, "midiNote")} min={30} max={80} />
    {oscillator(props)}
  </div>;
};
