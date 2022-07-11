import { combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, share, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { now } from './audio-context';
import { gainNode, oscillatorNode } from './audio-nodes';
import { DEFAULT_ENVELOPE, Envelope, envelopeOff, envelopeOn } from './envelope';
import { chainNodes, isOfType, midiToFrequency, NoteEvent } from './utils';

export interface OscillatorProps {
  type: Observable<OscillatorType>;
  envelope?: Observable<Envelope>;
}

export const oscillator = (
  { type, envelope: envelopeProp }: OscillatorProps,
) => (noteEvents: Observable<NoteEvent>) => {
  const sharedNoteEvents = noteEvents.pipe(
    share(),
  );

  const envelope = (envelopeProp || of(DEFAULT_ENVELOPE)).pipe(
    share(),
  );
  
  return sharedNoteEvents.pipe(
    isOfType("noteOn"),
    mergeMap(({ midiNote, startTime }) => combineLatest([oscillatorNode(), gainNode()]).pipe(
      tap(chainNodes),
      switchMap(nodes => combineLatest({ type, envelope, now }).pipe(
        map(({ type, envelope, now }) => {
          const [oscillatorNode, gainNode] = nodes;
          oscillatorNode.frequency.value = midiToFrequency(midiNote);
          oscillatorNode.type = type;
          envelopeOn(gainNode.gain, envelope, startTime ?? now());
          return nodes;
        }),
        distinctUntilChanged(),
        tap(([oscillatorNode]) => oscillatorNode.start(startTime ?? 0)),
        takeUntil(sharedNoteEvents.pipe(
          isOfType("noteOff"),
          withLatestFrom(envelope, now),
          filter(([noteOff]) => midiNote === noteOff.midiNote),
          tap(([{ stopTime }, envelope, now]) => {
            const [oscillatorNode, gainNode] = nodes;
            const { attackTime, decayTime, releaseTime } = envelope;
            oscillatorNode.stop((stopTime ?? now()) + attackTime + decayTime + releaseTime);
            envelopeOff(gainNode.gain, envelope, stopTime ?? now());
          }),
        )),
        map(([, gainNode]) => gainNode),
      )),
    )),
  );
};
