import type { Kind } from "./scenarios";

export interface NativeEntry {
  name: string;
  kind: Kind;
  elapsed: number;
}

export function runNative(id: string, emit: (entry: NativeEntry) => void): () => void {
  let cancelled = false;
  const timers: number[] = [];
  const frames: number[] = [];
  const start = performance.now();
  const print = (name: string, kind: Kind) => {
    if (!cancelled) emit({ name, kind, elapsed: performance.now() - start });
  };
  const timer = (callback: () => void) => {
    const id = window.setTimeout(() => {
      if (!cancelled) callback();
    }, 0);
    timers.push(id);
  };
  const timeout = () => timer(() => print("timeout", "macro"));
  switch (id) {
    case "basic":
      print("start", "sync");
      timeout();
      Promise.resolve().then(() => print("promise", "micro"));
      queueMicrotask(() => print("microtask", "micro"));
      print("end", "sync");
      break;
    case "chain":
      timeout();
      Promise.resolve()
        .then(() => print("then 1", "micro"))
        .then(() => print("then 2", "micro"))
        .then(() => print("then 3", "micro"));
      print("end", "sync");
      break;
    case "starvation": {
      timeout();
      let depth = 0;
      const recurse = () => {
        if (cancelled) return;
        print(`micro ${++depth}`, "micro");
        if (depth < 5) queueMicrotask(recurse);
      };
      queueMicrotask(recurse);
      print("end", "sync");
      break;
    }
    case "async": {
      const work = async () => {
        print("before await", "sync");
        await null;
        print("after await", "micro");
      };
      timeout();
      void work();
      print("end", "sync");
      break;
    }
    case "raf":
      timeout();
      frames.push(requestAnimationFrame(() => print("rAF", "render")));
      Promise.resolve().then(() => print("promise", "micro"));
      print("end", "sync");
      break;
    case "nesting": {
      let count = 0;
      const nest = () => {
        print(`timer ${++count}`, "macro");
        if (count < 10) timer(nest);
      };
      timer(nest);
      break;
    }
    case "checkpoint":
      timer(() => {
        print("timer A", "macro");
        queueMicrotask(() => print("micro from A", "micro"));
      });
      timer(() => print("timer B", "macro"));
      print("end", "sync");
      break;
  }
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    frames.forEach(cancelAnimationFrame);
  };
}
