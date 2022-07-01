import { filter, map } from "rxjs/operators";
import { audioContext } from "./audio-context";

export const createNode = <T extends AudioNode>(
  creationFunction: (audioContext: AudioContext) => T,
) => audioContext.pipe(
  filter(Boolean),
  map(creationFunction),
);

export const oscillatorNode = () => createNode(audioContext => audioContext.createOscillator());
export const gainNode = () => createNode(audioContext => audioContext.createGain());
