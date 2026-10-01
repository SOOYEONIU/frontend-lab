export type Kind = "sync" | "micro" | "macro" | "render";
export type Action =
  | { type: "log"; line: number; text: string }
  | { type: "micro" | "timer" | "raf" | "call"; line: number; job: Job };
export interface Job {
  name: string;
  kind: Kind;
  line: number;
  body: Action[];
  next?: Job;
  delay?: number;
}
export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  lesson: string;
  code: string;
  body: Action[];
}
const log = (line: number, text: string): Action => ({ type: "log", line, text });

function job(name: string, kind: Kind, line: number, body: Action[]): Job {
  return { name, kind, line, body };
}

function schedule(type: "micro" | "timer" | "raf" | "call", line: number, task: Job): Action {
  return { type, line, job: task };
}

function timeout(line: number, text = "timeout"): Action {
  return schedule("timer", line, job(text, "macro", line, [log(line, text)]));
}

function recursiveMicro(depth: number): Job {
  return job(`recurse #${depth}`, "micro", 3, [
    log(4, `micro ${depth}`),
    ...(depth < 5 ? [schedule("micro", 5, recursiveMicro(depth + 1))] : []),
  ]);
}
function nestedTimer(depth: number): Job {
  return {
    ...job(`timer #${depth}`, "macro", 3, [
      log(4, `timer ${depth}`),
      ...(depth < 10 ? [schedule("timer", 5, nestedTimer(depth + 1))] : []),
    ]),
    delay: depth > 6 ? 4 : 0,
  };
}
const chain3 = job("then #3", "micro", 5, [log(5, "then 3")]);
const chain2 = { ...job("then #2", "micro", 4, [log(4, "then 2")]), next: chain3 };
const chain1 = { ...job("then #1", "micro", 3, [log(3, "then 1")]), next: chain2 };

export const scenarios: Scenario[] = [
  {
    id: "basic",
    title: "기본 실행 순서",
    subtitle: "Sync → Microtask → Macrotask",
    lesson: "동기 코드는 Call Stack에서 실행됩니다. 스택이 비면 microtask를 모두 처리한 후 다음 task로 넘어갑니다. Promise.then과 queueMicrotask는 등록된 순서를 따릅니다.",
    code: `console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
queueMicrotask(() => console.log("microtask"));
console.log("end");`,
    body: [
      log(1, "start"),
      timeout(2),
      schedule("micro", 3, job("Promise.then", "micro", 3, [log(3, "promise")])),
      schedule("micro", 4, job("queueMicrotask", "micro", 4, [log(4, "microtask")])),
      log(5, "end"),
    ],
  },
  {
    id: "chain",
    title: "Promise 체이닝",
    subtitle: "다음 then은 언제 큐에 들어갈까?",
    lesson: "체인의 then은 한꺼번에 큐에 들어가지 않습니다. 앞선 콜백이 끝나고 반환된 Promise가 이행되면 다음 then이 큐에 추가됩니다. 이 예제는 같은 microtask checkpoint에서 모두 처리됩니다.",
    code: `setTimeout(() => console.log("timeout"), 0);
Promise.resolve()
  .then(() => console.log("then 1"))
  .then(() => console.log("then 2"))
  .then(() => console.log("then 3"));
console.log("end");`,
    body: [timeout(1), schedule("micro", 3, chain1), log(6, "end")],
  },
  {
    id: "starvation",
    title: "Microtask 재귀",
    subtitle: "큐가 빌 때까지, 계속",
    lesson: "microtask 실행 중 추가된 microtask도 같은 checkpoint에서 처리합니다. 계속 추가하면 타이머와 렌더링이 기다리게 됩니다. 여기서는 5회로 제한합니다.",
    code: `setTimeout(() => console.log("timeout"), 0);
let depth = 0;
function recurse() {
  console.log("micro " + ++depth);
  if (depth < 5) queueMicrotask(recurse);
}
queueMicrotask(recurse);
console.log("end");`,
    body: [timeout(1), schedule("micro", 7, recursiveMicro(1)), log(8, "end")],
  },
  {
    id: "async",
    title: "Async / await",
    subtitle: "await를 경계로 나뉘는 실행",
    lesson: "async 함수도 await 이전까지는 동기 실행입니다. 이 예제의 await null 이후 코드는 microtask로 재개되고, 호출한 쪽의 동기 코드가 먼저 끝납니다.",
    code: `async function work() {
  console.log("before await");
  await null;
  console.log("after await");
}
setTimeout(() => console.log("timeout"), 0);
work();
console.log("end");`,
    body: [
      timeout(6),
      schedule("call", 7, job("work()", "sync", 1, [
        log(2, "before await"),
        schedule("micro", 3, job("work() · resume", "micro", 4, [log(4, "after await")])),
      ])),
      log(8, "end"),
    ],
  },
  {
    id: "raf",
    title: "렌더링 타이밍",
    subtitle: "requestAnimationFrame의 자리",
    lesson: "rAF는 일반 task 큐와 별도로 렌더링 기회에 실행됩니다. 아래 시뮬레이션은 rAF가 타이머보다 먼저 실행되는 한 가지 예입니다. 실제 둘의 순서는 렌더링 시점에 따라 달라질 수 있습니다.",
    code: `setTimeout(() => console.log("timeout"), 0);
requestAnimationFrame(() => console.log("rAF"));
Promise.resolve().then(() => console.log("promise"));
console.log("end");`,
    body: [
      timeout(1),
      schedule("raf", 2, job("requestAnimationFrame", "render", 2, [log(2, "rAF")])),
      schedule("micro", 3, job("Promise.then", "micro", 3, [log(3, "promise")])),
      log(4, "end"),
    ],
  },
  {
    id: "nesting",
    title: "타이머 중첩",
    subtitle: "0ms가 계속 0ms일 수 없는 이유",
    lesson: "타이머를 연속 중첩하면 nesting level이 5보다 큰 상태에서 등록하는 타이머에 최소 4ms가 적용됩니다. 표시된 시간은 최소 대기 조건이며 실제 소요 시간은 브라우저 실행에서 확인하세요.",
    code: `let count = 0;
const start = performance.now();
function nest() {
  console.log("timer " + ++count, performance.now() - start);
  if (count < 10) setTimeout(nest, 0);
}
setTimeout(nest, 0);`,
    body: [schedule("timer", 7, nestedTimer(1))],
  },
  {
    id: "checkpoint",
    title: "Task 사이의 Microtask",
    subtitle: "다음 task 전에 큐를 비우기",
    lesson: "task 하나가 끝날 때마다 microtask checkpoint가 있습니다. 타이머 A가 만든 microtask는 이미 기다리고 있던 타이머 B보다 먼저 실행됩니다.",
    code: `setTimeout(() => {
  console.log("timer A");
  queueMicrotask(() => console.log("micro from A"));
}, 0);
setTimeout(() => console.log("timer B"), 0);
console.log("end");`,
    body: [
      schedule("timer", 1, job("timer A", "macro", 1, [
        log(2, "timer A"),
        schedule("micro", 3, job("micro from A", "micro", 3, [log(3, "micro from A")])),
      ])),
      timeout(5, "timer B"),
      log(6, "end"),
    ],
  },
];
