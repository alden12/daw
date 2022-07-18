import { filter } from "rxjs/operators";

export interface Event<T extends string> {
  type: T;
}

export interface Scheduled {
  /**
   * The number of ticks at which an event should occur since the beginning of the track.
   */
  ticks?: number;
}

export interface MidiNote {
  midiNote: number;
}

export interface NoteOn extends Scheduled, MidiNote, Event<"noteOn"> {
  velocity?: number;
}

export interface NoteOff extends Scheduled, MidiNote, Event<"noteOff"> {}

export type NoteEvent = NoteOn | NoteOff;

// export interface UpdateNote extends Scheduled, MidiNote, Event<"updateNote"> {
//   newTicks: number;
// }

// export interface DeleteNote extends Scheduled, MidiNote, Event<"deleteNote"> {}

export type MidiEvent = NoteEvent;

type EventOfType<T extends MidiEvent["type"]> = Extract<MidiEvent, { type: T }>;

export type ScheduledEvent = Extract<MidiEvent, { ticks?: number }>;

export const isOfType = <T extends MidiEvent["type"], E extends EventOfType<T>>(
  event: MidiEvent,
  ...types: T[]
): event is E => (types as MidiEvent["type"][]).includes(event.type);

export const filterEvents = <T extends MidiEvent["type"], E extends EventOfType<T>>(...types: T[]) =>
  filter((event: MidiEvent): event is E => (types as MidiEvent["type"][]).includes(event.type));

export const noteEvent = <T extends MidiEvent["type"], E extends EventOfType<T>>(type: T) =>
  (payload: Omit<E, "type">) => ({ type, ...payload } as E);

export const noteOn = noteEvent("noteOn");
export const noteOff = noteEvent("noteOff");

// export const updateNote = noteEvent("updateNote");
// export const deleteNote = noteEvent("deleteNote");
