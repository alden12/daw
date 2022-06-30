import { combineLatest, Observable } from 'rxjs';
import { map, mapTo, tap } from 'rxjs/operators';
import { createOscillatorNode } from './audio-context';
import { finalizeWithValue, midiToFrequency } from './utils';

export interface OscillatorProps {
  midiNote: number;
  type: OscillatorType;
  gain?: number;
}

export const oscillator = (props: Observable<OscillatorProps>) => combineLatest([
  createOscillatorNode(),
  props,
]).pipe(
  map(([oscillatorNode, { midiNote, type }]) => {
    oscillatorNode.frequency.value = midiToFrequency(midiNote);
    oscillatorNode.type = type;
    return oscillatorNode;
  }),
  tap(oscillatorNode => oscillatorNode.start(0)),
  finalizeWithValue(oscillatorNode => oscillatorNode.stop()),
);

export const Oscillator = ({ oscillatorProps }: { oscillatorProps: Observable<OscillatorProps> }) => oscillator(oscillatorProps).pipe(
  mapTo(null),
);
