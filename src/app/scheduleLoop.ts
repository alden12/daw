export type TicksRange = [start: number, end: number];

interface Overlap {
  overlap: TicksRange;
  type: "beforeAndOverlap" | "overlap" | "afterAndOverlap" | "surround";
}

interface NoOverlap {
  type: "before" | "after" | "invalid";
}

type ScheduleOverlap = Overlap | NoOverlap;

export const getScheduleOverlap = (
  [clipStart, clipEnd ]: TicksRange,
  [scheduleStart, scheduleEnd]: TicksRange,
): ScheduleOverlap => {
  if (clipEnd - clipStart <= 0 || scheduleEnd - scheduleStart <= 0) return { type: "invalid" };
  if (scheduleEnd < clipStart) return { type: "before" }; // TODO: Should this also include equal to?
  if (scheduleStart >= clipEnd) return { type: "after" };

  const startsBefore = scheduleStart < clipStart;
  const endsAfter = scheduleEnd > clipEnd;

  const type = startsBefore ?
    endsAfter ? "surround" : "beforeAndOverlap" :
    endsAfter ? "afterAndOverlap" : "overlap";

  const overlap: TicksRange =  [Math.max(clipStart, scheduleStart), Math.min(clipEnd, scheduleEnd)];

  return { type, overlap };
};

export const getThisLoopOffset = ([clipStart, clipEnd]: TicksRange, [scheduleStart]: TicksRange): number | undefined => {
  const clipLength = clipEnd - clipStart;
  if (clipLength <= 0) return undefined;
  const playedDuration = scheduleStart - clipStart;
  const loopNumber = Math.floor(playedDuration / clipLength);
  return loopNumber * clipLength;
};

interface ScheduleLoopProps {
  clipRange: TicksRange;
  scheduleRange: TicksRange;
  loopDuration?: number;
}

interface ScheduledLoop {
  ticksRange: TicksRange;
  offset: number;
}

export const scheduleLoops = ({
  clipRange,
  scheduleRange,
  loopDuration, // TODO: Implement loop duration.
}: ScheduleLoopProps): ScheduledLoop[] => {
  const thisLoopOffset = getThisLoopOffset(clipRange, scheduleRange);
  if (thisLoopOffset === undefined) return []; // Invalid clip length.
  
  const [clipStart, clipEnd] = clipRange;
  const [scheduleStart, scheduleEnd] = scheduleRange;
  // TODO: This condition may be covered by getScheduleOverlap below.
  if (scheduleEnd <= clipStart) return []; // Schedule range is before loop starts

  // Offset schedule range into clip range if we have passed clip start.
  const offsetScheduleRange: TicksRange = scheduleStart < clipStart ? scheduleRange : [scheduleStart - thisLoopOffset, scheduleEnd - thisLoopOffset];
  const scheduleOverlap = getScheduleOverlap(clipRange, offsetScheduleRange);
  const { type } = scheduleOverlap;

  if (type === "invalid" || type === "before") return [];
  // TODO: Overlapping range and recursion can probably be used as variables to avoid duplication.
  if (type === "overlap") return [{ ticksRange: scheduleOverlap.overlap, offset: thisLoopOffset }];

  const clipLength = clipEnd - clipStart;
  const thisLoopEnd = thisLoopOffset + clipStart + clipLength;
  if (type === "beforeAndOverlap" || type === "surround") return scheduleLoops({
    clipRange,
    scheduleRange: [thisLoopEnd, scheduleEnd],
    loopDuration,
  });

  // If type is "after" or "afterAndOverlap".
  return [
    ...(type === "afterAndOverlap" ? [{ ticksRange: scheduleOverlap.overlap, offset: thisLoopOffset }] : []),
    ...scheduleLoops({
      clipRange,
      scheduleRange: [thisLoopEnd, scheduleEnd],
      loopDuration,
    }),
  ];
};
