import { coerceToObservable, flatten } from "rxfm";
import { Observable, defer, OperatorFunction, combineLatest, of } from "rxjs";
import { tap, finalize, map, pairwise, shareReplay, startWith, distinctUntilChanged, mapTo } from "rxjs/operators";

export const midiToFrequency = (midiNote: number) => Math.pow(2, (midiNote - 69) / 12) * 440;

const NOTE_ORDER = ["A", "Bb", "B", "C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#"];

export const midiToNote = (midiNote: number) => {
  const noteIndex = (midiNote - 21) % 12;
  const noteOctave = Math.floor(midiNote / 12) - 1;
  return `${NOTE_ORDER[noteIndex]}${noteOctave}`;
};

export const chainNodes = <T extends AudioNode[]>(nodes: T) => {
  nodes.reduce((node, nextNode) => node.connect(nextNode));
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

export type AudioOutput = AudioNode | AudioContext;

export const connectTo = <T extends AudioNode, U extends AudioOutput>(
  output: U | Observable<U>,
): OperatorFunction<T, U> => input => combineLatest([input, coerceToObservable(output)]).pipe(
  tap(([input, output]) => {
    input.connect(output instanceof AudioContext ? output.destination : output);
    return output;
  }),
  map(([, output]) => output),
  distinctUntilChanged(),
);

export const diff = () => <T>(source: Observable<T[]>) => source.pipe(
  startWith<T[]>([]),
  pairwise(),
  map(([previous, current]) => {
    const added = current.filter(x => !previous.includes(x));
    const removed = previous.filter(x => !current.includes(x));
    return { added, removed };
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);

export const octavate = (notes: number[], ...offsets: number[]) =>
  flatten([notes, ...offsets.map(offset => notes.map(note => note + offset * 12))]);

export const mapToNull = (source: Observable<any>) => source.pipe(mapTo(null));

export const NULL = of(null);
