import { css } from "@emotion/css";
import RxFM, { mapToComponents } from "rxfm";
import { Observable, Subject } from "rxjs";
import { map } from "rxjs/operators";
import { midiToNote, NoteEvent } from "./utils";

const pressedNoteSet = new Set<number>();

const noteEventsSubject = new Subject<NoteEvent>();
export const midiKeyboardNoteEvents = noteEventsSubject.asObservable();

const DEFAULT_VELOCITY = 1;

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
    if (pressedNoteSet.has(midiNote)) return;
    pressedNoteSet.add(midiNote);
    noteEventsSubject.next({ type: "noteOn", midiNote, velocity: DEFAULT_VELOCITY });
  },
  onKeyUp: (event: KeyboardEvent) => {
    const code = event.code;
    if (!isValidKey(code)) return;
    const midiNote = KEYCODE_MIDI_MAP[code];
    if (!pressedNoteSet.has(midiNote)) return;
    pressedNoteSet.delete(midiNote);
    noteEventsSubject.next({ type: "noteOff", midiNote });
  },
  // event: FocusEvent, host: ElementType
  onFocusOut: () => {
    if (!pressedNoteSet.size) return;
    // if (event.target instanceof HTMLElement && host !== event.target && host.contains(event.target)) return;
    pressedNoteSet.clear();
    [...pressedNoteSet.values()].forEach(midiNote => noteEventsSubject.next({ type: "noteOff", midiNote }));
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
  {noteEventsSubject.pipe(
    map(() => [...pressedNoteSet.values()]),
    mapToComponents(midiNote => <MidiKey midiNote={midiNote} />, midiNote => midiNote)
  )}
</div>;
