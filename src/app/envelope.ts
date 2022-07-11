export interface Envelope {
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  releaseTime: number;
}

export const envelopeOn = (audioParam: AudioParam, envelope: Envelope, startTime: number) => {
  const { attackTime, decayTime, sustainLevel } = envelope;

  audioParam.cancelScheduledValues(startTime);
  audioParam.setValueAtTime(0, startTime);

  audioParam.linearRampToValueAtTime(1, startTime + attackTime); // Attack
  audioParam.setTargetAtTime(sustainLevel, startTime + attackTime, decayTime / 3); // Decay and Sustain
};

export const envelopeOff = (audioParam: AudioParam, { releaseTime }: Envelope, stopTime: number) => {
  audioParam.cancelAndHoldAtTime(stopTime); // NOTE: Experimental.
  audioParam.setTargetAtTime(0, stopTime, releaseTime / 3); // Release
};

export const DEFAULT_ENVELOPE: Envelope = {
  attackTime: 0.01,
  decayTime: 0.4,
  sustainLevel: 0.5,
  releaseTime: 0.8,
};
