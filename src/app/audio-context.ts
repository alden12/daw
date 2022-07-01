import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

export const audioContextSubject = new BehaviorSubject<AudioContext | undefined>(undefined);

export const audioContext = audioContextSubject.pipe(
  filter(Boolean),
);
