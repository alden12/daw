import { combineLatest, Observable, of } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, share, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { getAudioContextTime } from './audio-context';
import { gainNode, oscillatorNode } from './audio-nodes';
import { DEFAULT_ENVELOPE, Envelope, envelopeOff, envelopeOn } from './envelope';
import { MidiEvent, filterEvents } from './events';
import { tempo, ticksToSeconds } from './noteScheduler';
import { chainNodes, midiToFrequency } from './utils';

export interface OscillatorProps {
  type: Observable<OscillatorType>;
  envelope?: Observable<Envelope>;
  pan?: number; // 1- to 1
  // TODO: How would you connect an LFO to this?
  detune?: number; // midi note amount up or down
}

export const oscillator = (
  { type, envelope: envelopeProp }: OscillatorProps,
) => (events: Observable<MidiEvent>) => {
  const sharedEvents = events.pipe(
    share(),
  );

  const envelope = (envelopeProp || of(DEFAULT_ENVELOPE)).pipe(
    share(),
  );
  
  return sharedEvents.pipe(
    filterEvents("noteOn"),
    withLatestFrom(tempo),
    mergeMap(([{ midiNote, ticks }, startTempo]) => {
      const startTime = ticksToSeconds(startTempo, ticks);
      return combineLatest([oscillatorNode(), gainNode()]).pipe(
        tap(chainNodes),
        switchMap(nodes => combineLatest({ type, envelope, now: getAudioContextTime }).pipe(
          map(({ type, envelope, now }) => {
            const [oscillatorNode, gainNode] = nodes;
            // TODO: Split these into switchTap operators?
            oscillatorNode.frequency.value = midiToFrequency(midiNote);
            oscillatorNode.type = type;
            envelopeOn(gainNode.gain, envelope, startTime ?? now());
            return nodes;
          }),
          distinctUntilChanged(),
          tap(([oscillatorNode]) => oscillatorNode.start(startTime ?? 0)),
          takeUntil(sharedEvents.pipe(
            filterEvents("noteOff"),
            filter(noteOff => midiNote === noteOff.midiNote),
            withLatestFrom(envelope, getAudioContextTime, tempo),
            tap(([{ ticks }, envelope, now, endTempo]) => {
              const stopTime = ticksToSeconds(endTempo, ticks);
              const [oscillatorNode, gainNode] = nodes;
              const { attackTime, decayTime, releaseTime } = envelope;
              oscillatorNode.stop((stopTime ?? now()) + attackTime + decayTime + releaseTime);
              envelopeOff(gainNode.gain, envelope, stopTime ?? now());
            }),
          )),
          map(([, gainNode]) => gainNode),
        )),
      );
    }),
  );
};
