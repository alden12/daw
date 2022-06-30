import RxFM, { selectFrom, switchTap } from 'rxfm';
import { BehaviorSubject, combineLatest, from, of } from 'rxjs';
import { filter, mapTo, mergeAll, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { audioContext, createGainNode } from './audio-context';
import { pressedKeysDiff } from './MidiKeyboard';
import { oscillator } from './Oscillator';
import { RangeInput } from './RangeInput';
import { connectNode } from './utils';

// interface PolyphonicSynthesizerProps {
//   gain: number;
//   type: OscillatorType;
// }

export const PolyphonicSynthesizer = () => {
  const gain = new BehaviorSubject<number>(0.15);
  const type = new BehaviorSubject<OscillatorType>("sine");

  const oscillators = selectFrom(pressedKeysDiff, "added").pipe(
    mergeMap(added => from(
      added.map(
        midiNote => oscillator(
          combineLatest({ midiNote: of(midiNote), type }),
        ).pipe(
          takeUntil(
            selectFrom(pressedKeysDiff, "removed").pipe(
              filter(removed => removed.includes(midiNote)),
            ),
          ),
        ),
      ),
      ),
    ),
    mergeAll(),
    connectNode(createGainNode()),
    switchTap(gainNode => gain.pipe(
      tap(gain => gainNode.gain.value = gain),
    )),
    connectNode(audioContext),
    mapTo(null),
  );

  return <div>
    <RangeInput label="Gain" setValue={value => gain.next(value)} value={gain} max={1} step={0.05} />
    {oscillators}
  </div>;
};
