import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export const audioContextSubject = new BehaviorSubject<AudioContext | undefined>(undefined);

export const audioContext = audioContextSubject.pipe(
  filter(Boolean),
);

export const createNode = <T extends AudioNode>(
  creationFunction: (audioContext: AudioContext) => T,
) => audioContext.pipe(
  filter(Boolean),
  map(creationFunction),
);

export const createOscillatorNode = () => createNode(audioContext => audioContext.createOscillator());
export const createGainNode = () => createNode(audioContext => audioContext.createGain());
