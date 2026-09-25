import "./style.css";

const log = document.getElementById("log") as HTMLPreElement;
const runBasicOrderBtn = document.getElementById(
  "run-basic-order",
) as HTMLButtonElement;
const runMicrotaskChainBtn = document.getElementById(
  "run-microtask-chain",
) as HTMLButtonElement;
const runMicrotaskStarvationBtn = document.getElementById(
  "run-microtask-starvation",
) as HTMLButtonElement;
const runAsyncFunctionBtn = document.getElementById(
  "run-async-function",
) as HTMLButtonElement;
const runRafVsMicrotaskBtn = document.getElementById(
  "run-raf-vs-microtask",
) as HTMLButtonElement;
const runSetTimeoutNestingBtn = document.getElementById(
  "run-settimeout-nesting",
) as HTMLButtonElement;
const clearLogBtn = document.getElementById("clear-log") as HTMLButtonElement;

let callCount = 0;

function print(label: string) {
  callCount += 1;
  log.textContent += `#${callCount} ${label}\n`;
  log.scrollTop = log.scrollHeight;
}

function printSection(title: string) {
  log.textContent += `\n=== ${title} ===\n`;
  log.scrollTop = log.scrollHeight;
}

// Case 01: console.log / setTimeout / Promise.then / queueMicrotask는
// 어떤 순서로 실행되는가?
runBasicOrderBtn.addEventListener("click", () => {
  printSection("Case 01. 기본 실행 순서");

  print("sync: script start");

  setTimeout(() => {
    print("macrotask: setTimeout");
  }, 0);

  Promise.resolve().then(() => {
    print("microtask: Promise.then");
  });

  queueMicrotask(() => {
    print("microtask: queueMicrotask");
  });

  print("sync: script end");
});

// Case 02: Promise.then을 여러 번 체이닝하면 각 then은
// 같은 tick에서 처리되는가, 아니면 매크로태스크 사이사이에 끼어드는가?
runMicrotaskChainBtn.addEventListener("click", () => {
  printSection("Case 02. Promise.then 체이닝");

  setTimeout(() => {
    print("macrotask: setTimeout");
  }, 0);

  Promise.resolve()
    .then(() => print("microtask chain: 1"))
    .then(() => print("microtask chain: 2"))
    .then(() => print("microtask chain: 3"));

  print("sync: script end");
});

// Case 03: microtask 콜백 안에서 다시 queueMicrotask를 호출하면
// 큐가 계속 늘어나면서 macrotask(setTimeout)를 굶길 수 있는가?
runMicrotaskStarvationBtn.addEventListener("click", () => {
  printSection("Case 03. microtask 재귀 큐잉 (5회로 제한)");

  setTimeout(() => {
    print("macrotask: setTimeout (microtask 큐가 다 비워진 뒤 실행됨)");
  }, 0);

  let depth = 0;
  function recurse() {
    depth += 1;
    print(`microtask recursion depth: ${depth}`);
    if (depth < 5) {
      queueMicrotask(recurse);
    }
  }
  queueMicrotask(recurse);

  print("sync: script end");
});

// Case 04: async 함수 내부에서 await 이전 코드는 동기적으로 실행되는가?
// await 이후 코드는 microtask로 스케줄링되는가?
runAsyncFunctionBtn.addEventListener("click", () => {
  printSection("Case 04. async 함수 내부 순서");

  async function asyncTask() {
    print("async fn: await 이전 (동기 실행)");
    await null;
    print("async fn: await 이후 (microtask로 재개)");
  }

  setTimeout(() => {
    print("macrotask: setTimeout");
  }, 0);

  asyncTask();

  print("sync: asyncTask() 호출 이후");
});

// Case 05: requestAnimationFrame은 microtask보다 먼저 실행되는가,
// 아니면 나중에 실행되는가? setTimeout(0)과 비교하면 어떤가?
runRafVsMicrotaskBtn.addEventListener("click", () => {
  printSection("Case 05. requestAnimationFrame vs microtask vs setTimeout");

  setTimeout(() => {
    print("macrotask: setTimeout(0)");
  }, 0);

  requestAnimationFrame(() => {
    print("rAF: requestAnimationFrame");
  });

  Promise.resolve().then(() => {
    print("microtask: Promise.then");
  });

  print("sync: script end");
});

// Case 06: setTimeout을 재귀적으로 중첩 호출하면 브라우저가
// 지연 시간을 강제로 늘리는(4ms clamping) 시점이 있는가?
runSetTimeoutNestingBtn.addEventListener("click", () => {
  printSection("Case 06. setTimeout 중첩 clamping (10회)");

  let count = 0;
  const start = performance.now();

  function nest() {
    const elapsed = (performance.now() - start).toFixed(2);
    print(`nested setTimeout #${count} at +${elapsed}ms`);
    count += 1;
    if (count < 10) {
      setTimeout(nest, 0);
    }
  }
  setTimeout(nest, 0);
});

clearLogBtn.addEventListener("click", () => {
  log.textContent = "";
  callCount = 0;
});
