import { coerceToObservable } from "rxfm";
import { Observable, defer, OperatorFunction } from "rxjs";
import { tap, finalize, switchMap } from "rxjs/operators";

export const midiToFrequency = (midiNote: number) => Math.pow(2, (midiNote - 69) / 12) * 440;

const NOTE_ORDER = ["A", "Bb", "B", "C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#"];

export const midiToNote = (midiNote: number) => {
  const noteIndex = (midiNote - 21) % 12;
  const noteOctave = Math.floor(midiNote / 12) - 1;
  return `${NOTE_ORDER[noteIndex]}${noteOctave}`;
};

export const chainNodes = <T extends [...AudioNode[], AudioContext | AudioNode]>(...nodes: T) => {
  nodes.reduceRight((nextNode, node) => {
    if (nextNode instanceof AudioContext) (node as AudioNode).connect(nextNode.destination);
    else (node as AudioNode).connect(nextNode);
    return node;
  });
  return nodes;
};

export const finalizeWithValue = <T>(callback: (value: T) => void) => {
  return (source: Observable<T>) => defer(() => {
    let lastValue: T | undefined;
    return source.pipe(
      tap(value => lastValue = value),
      finalize(() => lastValue && callback(lastValue)),
    );
  });
};

export const connectNode = <T extends AudioNode, U extends AudioNode | AudioContext>(
  connectTo: U | Observable<U>,
): OperatorFunction<T, U> => source => source.pipe(
  switchMap(
    (source: T) => coerceToObservable(connectTo).pipe(
      tap(connectTo =>source.connect( connectTo instanceof AudioContext ? connectTo.destination : connectTo)),
    ),
  )
);
