import { Time } from "./time";

describe(Time, () => {
  it("should initally refect the current time", () => {
    let currentTime = 0;
    const time = new Time(() => currentTime);
    expect(time.now()).toEqual(0);
    currentTime = 1;
    expect(time.now()).toEqual(1);
  });

  it("should hold at the same time when paused", () => {
    let currentTime = 0;
    const time = new Time(() => currentTime);
    expect(time.now()).toEqual(0);
    time.pause();
    currentTime = 1;
    expect(time.now()).toEqual(0);
  });

  it("should count from the hold time on play resume", () => {
    let currentTime = 0;
    const time = new Time(() => currentTime);
    expect(time.now()).toEqual(currentTime);
    time.pause();
    currentTime = 1;
    time.play();
    currentTime = 2;
    expect(time.now()).toEqual(1);
  });

  it("should start playing from the pause point on resume", () => {
    let currentTime = 0;
    const time = new Time(() => currentTime);
    currentTime = 1;
    time.pause();
    expect(time.now()).toEqual(1);
    currentTime = 2;
    time.play();
    expect(time.now()).toEqual(1);
    currentTime = 3;
    expect(time.now()).toEqual(2);
  });

  it("should start at delayed current time", () => {
    let currentTime = 5;
    const time = new Time(() => currentTime);
    expect(time.now()).toEqual(0);
    currentTime = 6;
    expect(time.now()).toEqual(1);
  });

  it("should start counting from the beginning after stop", () => {
    let currentTime = 0;
    const time = new Time(() => currentTime);
    currentTime = 1;
    expect(time.now()).toEqual(1);
    time.stop();
    currentTime = 5;
    expect(time.now()).toEqual(0);
    time.play();
    currentTime = 6;
    expect(time.now()).toEqual(1);
  });
});
