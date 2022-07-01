import { combineLatest, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import { gainNode } from "./audio-nodes";
import { connectTo } from "./utils";

export const gain = <T extends AudioNode>(gainAmount: Observable<number>) => (source: Observable<T>) => source.pipe(
  connectTo(
    combineLatest([gainNode(), gainAmount]).pipe(
      map(([gainNode, gainAmount]) => {
        gainNode.gain.value = gainAmount;
        return gainNode;
      }),
      distinctUntilChanged(),
    ),
  ),
);
