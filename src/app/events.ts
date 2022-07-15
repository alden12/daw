import { filter } from "rxjs/operators";

export interface Event<T extends string> {
  type: T;
}

// TODO: Use quarter notes instead of absolute time to allow tempo changes?

export interface ScheduledEvent {
  time?: number;
}

export interface MidiNoteEvent {
  midiNote: number;
}

export interface NoteOn extends ScheduledEvent, MidiNoteEvent, Event<"noteOn"> {
  velocity?: number;
}

export interface NoteOff extends ScheduledEvent, MidiNoteEvent, Event<"noteOff"> {}

export type NoteEvent = NoteOn | NoteOff;

type NoteEventOfType<T extends NoteEvent["type"]> = Extract<NoteEvent, { type: T }>;

export const isOfType = <T extends NoteEvent["type"], E extends NoteEventOfType<T>>(type: T) => filter((event: NoteEvent): event is E => event.type === type);

export const noteEvent = <T extends NoteEvent["type"], E extends NoteEventOfType<T>>(type: T) => (payload: Omit<E, "type">) => ({ type, ...payload } as E);

export const noteOn = noteEvent("noteOn");
export const noteOff = noteEvent("noteOff");
