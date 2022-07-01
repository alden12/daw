import { coerceToObservable, selectFrom, TypeOrObservable } from 'rxfm';
import { combineLatest, merge, Observable, of } from 'rxjs';
import { filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import { oscillatorNode } from './audio-nodes';
import { diff, finalizeWithValue, midiToFrequency } from './utils';

export interface OscillatorProps {
  type: TypeOrObservable<OscillatorType>;
}

export const oscillator = ({ type }: OscillatorProps) => (midiNote: Observable<number>) => combineLatest([
  oscillatorNode(),
  midiNote,
  coerceToObservable(type),
]).pipe(
  map(([oscillatorNode, midiNote, type]) => {
    oscillatorNode.frequency.value = midiToFrequency(midiNote);
    oscillatorNode.type = type;
    oscillatorNode.start(0);
    return oscillatorNode;
  }),
  finalizeWithValue(oscillatorNode => oscillatorNode.stop()),
);

export interface PolyphonicOscillatorProps {
  type: TypeOrObservable<OscillatorType>;
}

export const polyphonicOscillator = ({ type }: PolyphonicOscillatorProps) => (notes: Observable<number[]>) => {
  const notesDiff = notes.pipe(
    diff(),
  );

  const oscillatorFromMidiNote = (midiNote: number) => of(midiNote).pipe(
    oscillator({ type }),
    takeUntil(
      selectFrom(notesDiff, "removed").pipe(
        filter(removed => removed.includes(midiNote)),
      ),
    ),
  );

  return selectFrom(notesDiff, "added").pipe(
    mergeMap(added => merge(...added.map(oscillatorFromMidiNote))),
  );
};
