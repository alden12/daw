import { getScheduleOverlap, getThisLoopOffset, scheduleLoops } from  "./scheduleLoop";

describe("getScheduleOverlap", () => {
  it("should give the correct note overlap", () => {
    expect(getScheduleOverlap([0, 100], [25, 75])).toEqual({ type: "overlap", overlap: [25, 75] });
    expect(getScheduleOverlap([0, 100], [100, 200])).toEqual({ type: "after" });
    expect(getScheduleOverlap([0, 100], [150, 200])).toEqual({ type: "after" });
    expect(getScheduleOverlap([0, 100], [-100, 0])).toEqual({ type: "beforeAndOverlap", overlap: [0, 0] });
    expect(getScheduleOverlap([0, 100], [-100, -50])).toEqual({ type: "before" });
    expect(getScheduleOverlap([0, 0], [27, 75])).toEqual({ type: "invalid" });
    expect(getScheduleOverlap([0, 100], [0, 0])).toEqual({ type: "invalid" });
    expect(getScheduleOverlap([0, 0], [0, 0])).toEqual({ type: "invalid" });
    expect(getScheduleOverlap([0, 100], [50, 150])).toEqual({ type: "afterAndOverlap", overlap: [50, 100] });
    expect(getScheduleOverlap([0, 100], [-50, 50])).toEqual({ type: "beforeAndOverlap", overlap: [0, 50] });
  });
});

describe("getThisLoopOffset", () => {
  it("should give the correct loop start", () => {
    // Invalid clip length
    expect(getThisLoopOffset([0, 0], [25, 75])).toEqual(undefined);
    expect(getThisLoopOffset([0, -100], [25, 75])).toEqual(undefined);
    // Positive loop number
    expect(getThisLoopOffset([0, 100], [25, 75])).toEqual(0);
    expect(getThisLoopOffset([0, 100], [100, 150])).toEqual(100);
    expect(getThisLoopOffset([0, 100], [125, 150])).toEqual(100);
    expect(getThisLoopOffset([0, 100], [200, 250])).toEqual(200);
    expect(getThisLoopOffset([0, 100], [225, 250])).toEqual(200);
    expect(getThisLoopOffset([100, 200], [225, 250])).toEqual(100);
    expect(getThisLoopOffset([100, 200], [225, 500])).toEqual(100);
    expect(getThisLoopOffset([200, 300], [725, 775])).toEqual(500);
    // Negative loop number
    expect(getThisLoopOffset([100, 200], [0, 50])).toEqual(-100);
    expect(getThisLoopOffset([100, 200], [25, 75])).toEqual(-100);
    expect(getThisLoopOffset([300, 400], [125, 175])).toEqual(-200);
    expect(getThisLoopOffset([300, 400], [-125, -75])).toEqual(-500);
    expect(getThisLoopOffset([300, 400], [-125, -75])).toEqual(-500);
    expect(getThisLoopOffset([300, 400], [-125, 500])).toEqual(-500);
  });
});

describe("scheduleLoops", () => {
  it("should return an empty array for invalid loop conditions or if the clip has not yet started", () => {
    expect(scheduleLoops({ clipRange: [0, 0], scheduleRange: [25, 75] })).toEqual([]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [0, 0] })).toEqual([]);
    expect(scheduleLoops({ clipRange: [0, 0], scheduleRange: [0, 0] })).toEqual([]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [-75, -25] })).toEqual([]);
    expect(scheduleLoops({ clipRange: [100, 200], scheduleRange: [25, 75] })).toEqual([]);
  });

  it("should return the given schedule range if fully overlapped by the clipRange", () => {
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [25, 75] })).toEqual([{ ticksRange: [25, 75], offset: 0 }]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [125, 175] })).toEqual([{ ticksRange: [25, 75], offset: 100 }]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [100, 200] })).toEqual([{ ticksRange: [0, 100], offset: 100 }]);
    expect(scheduleLoops({ clipRange: [200, 300], scheduleRange: [725, 775] })).toEqual([{ ticksRange: [225, 275], offset: 500 }]);
  });

  it("should interate into the clip range if the schedule range starts before the clip range", () => {
    expect(scheduleLoops({ clipRange: [100, 200], scheduleRange: [50, 150] })).toEqual([{ ticksRange: [100, 150], offset: 0 }]);
    expect(scheduleLoops({ clipRange: [400, 800], scheduleRange: [50, 401] })).toEqual([{ ticksRange: [400, 401], offset: 0 }]);
  });

  it("should create the correct scheduling intervals if the schedule range starts after clip start", () => {
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [125, 175] })).toEqual([{ ticksRange: [25, 75], offset: 100 }]);
  });

  it("should recursively add scheduling intervals to the output if the scheduling range overlaps the clip range multiple times", () => {
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [50, 150] })).toEqual([
      { ticksRange: [50, 100], offset: 0 },
      { ticksRange: [0, 50], offset: 100 },
    ]);
    expect(scheduleLoops({ clipRange: [100, 200], scheduleRange: [50, 250] })).toEqual([
      { ticksRange: [100, 200], offset: 0 },
      { ticksRange: [100, 150], offset: 100 },
    ]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [125, 175] })).toEqual([
      { ticksRange: [25, 75], offset: 100 },
    ]);

    expect(scheduleLoops({ clipRange: [100, 200], scheduleRange: [150, 450] })).toEqual([
      { ticksRange: [150, 200], offset: 0 },
      { ticksRange: [100, 200], offset: 100 },
      { ticksRange: [100, 200], offset: 200 },
      { ticksRange: [100, 150], offset: 300 },
    ]);
    expect(scheduleLoops({ clipRange: [100, 200], scheduleRange: [50, 350] })).toEqual([
      { ticksRange: [100, 200], offset: 0 },
      { ticksRange: [100, 200], offset: 100 },
      { ticksRange: [100, 150], offset: 200 },
    ]);
    expect(scheduleLoops({ clipRange: [0, 100], scheduleRange: [125, 475] })).toEqual([
      { ticksRange: [25, 100], offset: 100 },
      { ticksRange: [0, 100], offset: 200 },
      { ticksRange: [0, 100], offset: 300 },
      { ticksRange: [0, 75], offset: 400 },
    ]);
  });
});
