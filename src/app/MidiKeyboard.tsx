import { css } from "@emotion/css";
import RxFM, { mapToComponents } from "rxfm";
import { BehaviorSubject, Observable } from "rxjs";
import { map, pairwise, shareReplay, startWith } from "rxjs/operators";
import { midiToNote } from "./utils";

const pressedKeysSet = new Set<number>();
const pressedKeysSubject = new BehaviorSubject<number[]>([]);
export const pressedKeys = pressedKeysSubject.asObservable();

export const pressedKeysDiff = pressedKeys.pipe(
  startWith<number[]>([]),
  pairwise(),
  map(([previousKeys, currentKeys]) => {
    const added = currentKeys.filter(x => !previousKeys.includes(x));
    const removed = previousKeys.filter(x => !currentKeys.includes(x));
    return { added, removed };
  }),
  shareReplay({ bufferSize: 1, refCount: true }),
);

const KEYCODE_MIDI_MAP = {
  KeyQ: 56,
  KeyA: 57,
  KeyW: 58,
  KeyS: 59,
  KeyD: 60,
  KeyR: 61,
  KeyF: 62,
  KeyT: 63,
  KeyG: 64,
  KeyH: 65,
  KeyU: 66,
  KeyJ: 67,
  KeyI: 68,
  KeyK: 69,
  KeyO: 70,
  KeyL: 71,
  Semicolon: 72,
};

const isValidKey = (code: string): code is keyof typeof KEYCODE_MIDI_MAP => code in KEYCODE_MIDI_MAP;

export const midiKeyboardHandlers = {
  onKeyDown: (event: KeyboardEvent) => {
    const code = event.code;
    if (!isValidKey(code)) return;
    const midiNote = KEYCODE_MIDI_MAP[code];
    if (pressedKeysSet.has(midiNote)) return;
    pressedKeysSet.add(midiNote);
    pressedKeysSubject.next(Array.from(pressedKeysSet.values()));
  },
  onKeyUp: (event: KeyboardEvent) => {
    const code = event.code;
    if (!isValidKey(code)) return;
    const midiNote = KEYCODE_MIDI_MAP[code];
    if (!pressedKeysSet.has(midiNote)) return;
    pressedKeysSet.delete(midiNote);
    pressedKeysSubject.next(Array.from(pressedKeysSet.values()));
  },
  onFocusOut: () => {
    if (!pressedKeysSet.size) return;
    pressedKeysSet.clear();
    pressedKeysSubject.next([]);
  },
  tabindex: "0",
};

const MidiKey = ({ midiNote }: { midiNote: Observable<number> }) => <span>
  {midiNote.pipe(map(midiToNote))}
</span>;

const midiKeyboardStyles = css`
  display: grid;
  grid-auto-flow: column;
  grid-gap: 4px;
`;

export const MidiKeyboard = () => <div class={midiKeyboardStyles}>
  {pressedKeys.pipe(
    mapToComponents(midiNote => <MidiKey midiNote={midiNote} />, midiNote => midiNote)
  )}
</div>;
