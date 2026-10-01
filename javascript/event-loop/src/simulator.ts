import type { Action, Job, Kind, Scenario } from "./scenarios";

export interface Entry {
  name: string;
  kind: Kind;
}

export interface Snapshot {
  stack: Entry[];
  timers: Entry[];
  micro: Entry[];
  macro: Entry[];
  render: Entry[];
  logs: Entry[];
  line: number | null;
  phase: Kind | "idle";
  title: string;
  explanation: string;
}

type QueueType = "micro" | "timer" | "raf";

const queueDescriptions: Record<QueueType, string> = {
  micro: "Microtask Queue의 뒤에 추가합니다. 현재 실행 중인 동기 코드를 중단하지 않습니다.",
  timer: "브라우저에 타이머를 등록합니다. 최소 지연 조건이 충족되면 콜백이 Task Queue에 들어갑니다.",
  raf: "다음 렌더링 기회를 기다립니다. rAF 콜백은 별도로 관리됩니다.",
};

function toEntry({ name, kind }: Entry): Entry {
  return { name, kind };
}

// A deterministic teaching model, not an inspector of internal browser queues.
// Snapshots are derived from a single set of queues; no DOM or real timers are used.
export function simulate(scenario: Scenario): Snapshot[] {
  const stack: Entry[] = [];
  const logs: Entry[] = [];
  const snapshots: Snapshot[] = [];
  const queues: Record<QueueType | "macro", Job[]> = {
    micro: [],
    timer: [],
    raf: [],
    macro: [],
  };
  let phase: Snapshot["phase"] = "idle";

  function capture(
    title: string,
    explanation: string,
    line: number | null = null,
    nextPhase = phase,
  ): void {
    phase = nextPhase;
    snapshots.push({
      title,
      explanation,
      line,
      phase,
      stack: stack.map(toEntry),
      logs: logs.map(toEntry),
      micro: queues.micro.map(toEntry),
      macro: queues.macro.map(toEntry),
      render: queues.raf.map(toEntry),
      timers: queues.timer.map(task => ({
        name: `${task.name} · ≥${task.delay ?? 0}ms`,
        kind: task.kind,
      })),
    });
  }

  function enqueue(task: Job, type: QueueType, line: number): void {
    queues[type].push(task);
    capture(`${task.name} 등록`, queueDescriptions[type], line);
  }

  function execute(actions: Action[]): void {
    for (const action of actions) {
      switch (action.type) {
        case "log":
          logs.push({ name: action.text, kind: stack[stack.length - 1].kind });
          capture(
            `console.log("${action.text}")`,
            "현재 스택의 코드가 실행되어 콘솔에 결과를 남깁니다.",
            action.line,
          );
          break;
        case "call":
          run(action.job, action.line);
          break;
        default:
          enqueue(action.job, action.type, action.line);
      }
    }
  }

  function run(task: Job, callLine = task.line): void {
    const previousPhase = phase;
    const explanation = task.kind === "sync"
      ? "동기 함수 호출은 곧바로 Call Stack에 쌓입니다. 마지막에 들어온 함수가 먼저 실행됩니다."
      : "대기 목록에서 콜백을 꺼내 Call Stack에서 실행합니다.";

    stack.push(toEntry(task));
    capture(`${task.name} 실행`, explanation, callLine, task.kind);
    execute(task.body);
    stack.pop();

    capture(
      `${task.name} 반환`,
      stack.length
        ? "함수 실행을 마치고 호출한 코드로 돌아갑니다."
        : "Call Stack이 비었습니다. 다음 작업 전에 microtask 큐를 확인합니다.",
      null,
      stack.length ? previousPhase : task.kind,
    );
    if (task.next) enqueue(task.next, "micro", task.next.line);
  }

  function readyTimers(): void {
    let task: Job | undefined;
    while ((task = queues.timer.shift())) {
      queues.macro.push(task);
      capture(
        `${task.name} → Task Queue`,
        `최소 ${task.delay ?? 0}ms 대기 조건이 충족된 시점을 가정합니다. 실행 가능한 상태여도 스택과 microtask 처리를 기다립니다.`,
        null,
        "macro",
      );
    }
  }

  function drainMicrotasks(): void {
    if (!queues.micro.length) return;
    capture(
      "Microtask checkpoint",
      "큐가 완전히 빌 때까지 microtask를 처리합니다. 도중에 추가되는 microtask도 포함됩니다.",
      null,
      "micro",
    );
    let task: Job | undefined;
    while ((task = queues.micro.shift())) run(task);
  }

  function renderFrame(): void {
    // This model chooses a rendering opportunity before the next timer task.
    // New rAF callbacks registered inside this frame wait for the next opportunity.
    const frameSize = queues.raf.length;
    for (let index = 0; index < frameSize; index += 1) {
      const task = queues.raf.shift();
      if (!task) break;
      run(task);
      drainMicrotasks();
    }
    capture(
      "렌더링 기회",
      "이 예제에서는 지금 화면을 갱신한다고 가정합니다. 렌더링은 매 task 뒤에 반드시 발생하지 않습니다.",
      null,
      "render",
    );
  }

  capture("실행을 기다리고 있어요", "재생 또는 다음 단계를 눌러 코드가 실행되는 과정을 살펴보세요.");
  run({ name: "script()", kind: "sync", line: 1, body: scenario.body });

  while (Object.values(queues).some(queue => queue.length > 0)) {
    readyTimers();
    drainMicrotasks();
    if (queues.raf.length) renderFrame();
    const task = queues.macro.shift();
    if (task) run(task);
  }

  capture(
    "모든 작업이 끝났어요",
    "Call Stack과 대기 목록이 모두 비었습니다. 이전 단계로 돌아가거나 다른 예제를 선택해 보세요.",
    null,
    "idle",
  );
  return snapshots;
}
