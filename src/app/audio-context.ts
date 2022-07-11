import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export const audioContextSubject = new BehaviorSubject<AudioContext | undefined>(undefined);

export const audioContext = audioContextSubject.pipe(
  filter(Boolean),
);

export const now = audioContext.pipe(
  map(audioContext => () => audioContext.currentTime),
);
