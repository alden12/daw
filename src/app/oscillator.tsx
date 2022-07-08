import { combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { oscillatorNode } from './audio-nodes';
import { Envelope } from './envelope';
import { isOfType, midiToFrequency, NoteEvent } from './utils';

export interface OscillatorProps {
  type: Observable<OscillatorType>;
  envelope?: Observable<Envelope | undefined>;
}

export const oscillator = (
  { type, envelope = of(undefined) }: OscillatorProps,
) => (noteEvents: Observable<NoteEvent>) => noteEvents.pipe(
  isOfType("noteOn"),
  mergeMap(({ midiNote, startTime }) => oscillatorNode().pipe(
    switchMap(oscillatorNode => combineLatest({ type, envelope }).pipe(
      map(({ type }) => {
        oscillatorNode.frequency.value = midiToFrequency(midiNote);
        oscillatorNode.type = type;
        return oscillatorNode;
      }),
      distinctUntilChanged(),
      tap(oscillatorNode => oscillatorNode.start(startTime ?? 0)),
      takeUntil(noteEvents.pipe(
        isOfType("noteOff"),
        filter(noteOff => midiNote === noteOff.midiNote),
        tap(({ stopTime }) => oscillatorNode.stop(stopTime)),
      )),
    )),
  ))
);
