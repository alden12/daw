import { combineLatest, from, Observable, timer } from 'rxjs';
import { ScheduledEvent } from './events';
import { distinctUntilChanged, map, scan, share, shareReplay, startWith, switchMap } from 'rxjs/operators';
import IntervalTree from 'node-interval-tree';
import { now } from './audio-context';

// const tempo = 120;

// const quarterNoteLength = 60 / tempo;

const noteScehdulePeriod = 100; // ms

const noteScheduleMargin = 1.2;

const noteScheduler = combineLatest([now, timer(0, noteScehdulePeriod)]).pipe(
  map(([now]) => now()),
  shareReplay({ refCount: true, bufferSize: 1 }),
);

export const scheduleNotes = <T extends ScheduledEvent>() => (events: Observable<T>) => events.pipe(
  scan((intervalTree, event) => {
    intervalTree.insert(event.time ?? 0, event.time ?? 0, event);
    return intervalTree;
  }, new IntervalTree<T>()),
  distinctUntilChanged(),
  switchMap(intervalTree => noteScheduler.pipe(
    startWith(0),
    switchMap(start => {
      // TODO: Convert from querter notes to time here so only the next scheduler period is affected?
      const events = intervalTree.search(0, start + (noteScehdulePeriod / 1000) * noteScheduleMargin);
      events.forEach(event => intervalTree.remove(event.time ?? 0, event.time ?? 0, event));
      return from(events);
    }),
  )),
  share(),
);

// TODO: Create loop operator using scheduler to emit a new loop when the loop length is approached?
