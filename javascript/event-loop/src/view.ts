import { cloneTemplate, createTextElement, query, setText } from "./dom";
import type { NativeEntry } from "./native";
import type { PlaybackState } from "./playback";
import type { Kind, Scenario } from "./scenarios";
import type { Entry, Snapshot } from "./simulator";

const labels: Record<Kind | "idle", string> = {
  sync: "Sync",
  micro: "Microtask",
  macro: "Macrotask",
  render: "Rendering",
  idle: "대기",
};
const twoDigits = (value: number) => String(value).padStart(2, "0");
const tokenPattern = /("[^"\n]*"|\b(?:const|let|function|async|await|if|console|Promise|setTimeout|queueMicrotask|requestAnimationFrame|return)\b|\b\d+\b)/g;

function highlightCode(source: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const token of source.split(tokenPattern)) {
    let className = "";
    if (token.startsWith('"')) className = "token-string";
    else if (/^(const|let|function|async|await|if|return)$/.test(token)) className = "token-keyword";
    else if (/^(console|Promise|setTimeout|queueMicrotask|requestAnimationFrame)$/.test(token)) className = "token-api";
    else if (/^\d+$/.test(token)) className = "token-number";

    fragment.append(className ? createTextElement("span", className, token) : token);
  }
  return fragment;
}

function createTaskCard(entry: Entry, position: string): HTMLElement {
  const card = cloneTemplate("task-template");
  card.classList.add(entry.kind);
  setText(query(".task-position", card), position);
  setText(query(".task-name", card), entry.name);
  return card;
}

function createLogRow(entry: Entry, index: number): HTMLElement {
  const row = cloneTemplate("log-template");
  const kind = query(".log-kind", row);
  kind.classList.add(entry.kind);
  setText(kind, labels[entry.kind]);
  setText(query(".log-number", row), twoDigits(index + 1));
  setText(query("code", row), entry.name);
  return row;
}

/** Static markup lives in index.html. Only changed lists and text are updated. */
export function createView(scenarios: Scenario[], onSelect: (id: string) => void) {
  const controls = {
    play: query<HTMLButtonElement>("#play"),
    previous: query<HTMLButtonElement>("#previous"),
    next: query<HTMLButtonElement>("#next"),
    reset: query<HTMLButtonElement>("#reset"),
    speed: query<HTMLSelectElement>("#speed"),
    progress: query<HTMLInputElement>("#progress"),
    native: query<HTMLButtonElement>("#native-run"),
  };
  const elements = {
    code: query("#code"),
    codeTitle: query("#code-title"),
    lineLabel: query("#line-label"),
    phase: query("#phase"),
    stepCount: query("#step-count"),
    stack: query("#stack"),
    timers: query("#timers"),
    micro: query("#micro"),
    macro: query("#macro"),
    render: query("#render"),
    microCount: query("#micro-count"),
    macroCount: query("#macro-count"),
    eventIndex: query("#event-index"),
    eventTitle: query("#event-title"),
    eventDescription: query("#event-description"),
    logCount: query("#log-count"),
    logs: query("#logs"),
    lessonTitle: query("#lesson-title"),
    lesson: query("#lesson"),
    nativeStatus: query("#native-status"),
    nativeLogs: query("#native-logs"),
  };
  const previousEntries = new WeakMap<HTMLElement, readonly Entry[]>();
  let codeLines: HTMLElement[] = [];
  let activeLine: HTMLElement | undefined;

  const scenarioButtons = scenarios.map((scenario, index) => {
    const button = cloneTemplate<HTMLButtonElement>("scenario-template");
    button.dataset.scenario = scenario.id;
    setText(query(".scenario-number", button), twoDigits(index + 1));
    setText(query("strong", button), scenario.title);
    setText(query("small", button), scenario.subtitle);
    button.addEventListener("click", () => onSelect(scenario.id));
    return button;
  });
  query("#scenarios").replaceChildren(...scenarioButtons);
  setText(query("#scenario-count"), twoDigits(scenarios.length));

  function updateList(
    container: HTMLElement,
    entries: readonly Entry[],
    createRow: (entry: Entry, index: number) => HTMLElement,
    emptyText: string,
  ): void {
    const previous = previousEntries.get(container);
    const unchanged = previous?.length === entries.length && previous.every(
      (entry, index) => entry.name === entries[index].name && entry.kind === entries[index].kind,
    );
    if (unchanged) return;

    const rows = entries.map(createRow);
    if (!rows.length) rows.push(createTextElement("div", "empty-state", emptyText));
    container.replaceChildren(...rows);
    previousEntries.set(container, entries);
  }

  function updateQueue(id: "timers" | "micro" | "macro" | "render", entries: Entry[], emptyText: string): void {
    updateList(elements[id], entries, (entry, index) => createTaskCard(entry, twoDigits(index + 1)), emptyText);
  }

  function selectScenario(scenario: Scenario): void {
    for (const button of scenarioButtons) {
      const selected = button.dataset.scenario === scenario.id;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    activeLine = undefined;
    codeLines = scenario.code.split("\n").map((source, index) => {
      const line = cloneTemplate("code-line-template");
      setText(query(".line-number", line), String(index + 1));
      query("code", line).append(highlightCode(source));
      return line;
    });
    elements.code.replaceChildren(...codeLines);
    setText(elements.codeTitle, `${scenario.id}.js`);
    setText(elements.lessonTitle, scenario.title);
    setText(elements.lesson, scenario.lesson);
  }

  function render(snapshot: Snapshot, playback: PlaybackState): void {
    const { cursor, lastIndex, playing } = playback;
    const finished = cursor === lastIndex;
    setText(controls.play, playing ? "Ⅱ 일시정지" : finished ? "↻ 다시 재생" : "▶ 재생");
    controls.previous.disabled = cursor === 0;
    controls.next.disabled = finished;
    controls.progress.max = String(lastIndex);
    controls.progress.value = String(cursor);
    controls.progress.setAttribute("aria-valuetext", `${cursor}단계: ${snapshot.title}`);
    controls.progress.style.setProperty("--progress", `${lastIndex ? cursor / lastIndex * 100 : 0}%`);
    setText(elements.stepCount, `${twoDigits(cursor)} / ${lastIndex}`);

    activeLine?.classList.remove("active");
    activeLine?.removeAttribute("aria-current");
    activeLine = snapshot.line === null ? undefined : codeLines[snapshot.line - 1];
    activeLine?.classList.add("active");
    activeLine?.setAttribute("aria-current", "step");
    setText(elements.lineLabel, snapshot.line ? `Line ${snapshot.line} · 현재 실행 중` : finished ? "실행 완료" : "다음 작업 확인 중");
    setText(elements.phase, finished ? "완료" : labels[snapshot.phase]);
    elements.phase.className = `phase ${snapshot.phase}`;

    updateList(elements.stack, [...snapshot.stack].reverse(), (entry, index) => createTaskCard(entry, index === 0 ? "TOP" : ""), "스택이 비어 있어요");
    updateQueue("timers", snapshot.timers, "대기 중인 타이머 없음");
    updateQueue("micro", snapshot.micro, "대기 중인 작업 없음");
    updateQueue("macro", snapshot.macro, "대기 중인 작업 없음");
    updateQueue("render", snapshot.render, "예약된 프레임 없음");
    setText(elements.microCount, `${snapshot.micro.length} 대기 · FIFO →`);
    setText(elements.macroCount, `${snapshot.macro.length} 대기 · FIFO →`);
    setText(elements.eventIndex, twoDigits(cursor));
    setText(elements.eventTitle, snapshot.title);
    setText(elements.eventDescription, snapshot.explanation);
    setText(elements.logCount, String(snapshot.logs.length));
    updateList(elements.logs, snapshot.logs, createLogRow, "console.log 결과가 이곳에 쌓입니다.");
    elements.logs.scrollTop = elements.logs.scrollHeight;
  }

  function resetNative(): void {
    controls.native.disabled = false;
    setText(elements.nativeStatus, "");
    elements.nativeLogs.replaceChildren();
  }

  function startNative(): void {
    resetNative();
    controls.native.disabled = true;
    setText(elements.nativeStatus, "실행 중…");
  }

  function showNativeResults(logs: NativeEntry[], expected: Entry[]): void {
    const rows = logs.map(entry => {
      const row = cloneTemplate("native-log-template");
      query(".dot", row).classList.add(entry.kind);
      setText(query("code", row), entry.name);
      setText(query(".elapsed", row), `+${entry.elapsed.toFixed(2)}ms`);
      return row;
    });
    elements.nativeLogs.replaceChildren(...rows);
    controls.native.disabled = false;
    const matches = logs.every((entry, index) => entry.name === expected[index].name);
    setText(elements.nativeStatus, matches
      ? "✓ 시뮬레이션과 실행 순서가 같아요"
      : "↔ 이번 실행에서는 rAF와 타이머의 순서가 달라요");
  }

  return { controls, selectScenario, render, resetNative, startNative, showNativeResults };
}
