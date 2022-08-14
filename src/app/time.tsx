import { switchTap } from "rxfm";
import { BehaviorSubject, Subject } from "rxjs";
import { distinctUntilChanged, map, pluck, shareReplay, switchMap, tap,  } from "rxjs/operators";
import { getAudioContextTime } from './audio-context';

export class Time {
  private playingSubject = new BehaviorSubject(false);
  private playbackTimeOffset = 0;
  private holdTime = 0;

  public playing = this.playingSubject.asObservable();

  constructor(private getAudioContextTime: () => number) {
    this.play();
  }

  public now = () => {
    if (this.playingSubject.value) return this.getAudioContextTime() - this.playbackTimeOffset;
    return this.holdTime;
  };

  public getPlaybackTimeOffset = () => this.playbackTimeOffset;

  public play = () => {
    if (this.playingSubject.value) return;
    this.playbackTimeOffset = this.getAudioContextTime() - this.holdTime;
    this.playingSubject.next(true);
  };

  public pause = () => {
    if (!this.playingSubject.value) return;
    this.holdTime = this.getAudioContextTime() - this.playbackTimeOffset;
    this.playingSubject.next(false);
  };

  public togglePlaying = () => {
    this.playingSubject.value ? this.pause() : this.play();
  };

  public stop = () => {
    this.holdTime = 0;
    this.playbackTimeOffset = 0;
    this.playingSubject.next(false);
  };
}

type PlaybackEvent = "play" | "pause" | "togglePlaying" | "stop";

const playbackEventSubject = new Subject<PlaybackEvent>();

export const play = () => playbackEventSubject.next("play");
export const pause = () => playbackEventSubject.next("pause");
export const togglePlaying = () => playbackEventSubject.next("togglePlaying");
export const stop = () => playbackEventSubject.next("stop");

const time = getAudioContextTime.pipe(
  map(getAudioContextTime => new Time(getAudioContextTime)),
  switchTap(time => playbackEventSubject.pipe(
    tap(playbackEvent => time[playbackEvent]()),
  )),
  shareReplay({ refCount: true, bufferSize: 1 }),
);

export const getTimeNow = time.pipe(
  pluck("now"),
);

export const playing = time.pipe(
  switchMap(time => time.playing),
  distinctUntilChanged(),
);

export const getPlaybackTimeOffset = time.pipe(
  map(time => time.getPlaybackTimeOffset),
);
