import { BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export const audioContextSubject = new BehaviorSubject<AudioContext | undefined>(undefined);

export const audioContext = audioContextSubject.pipe(
  filter(Boolean),
);

export const getAudioContextTime = audioContext.pipe(
  map(audioContext => () => audioContext.currentTime),
);
