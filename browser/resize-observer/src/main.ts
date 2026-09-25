import "./style.css";

const box = document.getElementById("box") as HTMLDivElement;
const boxContent = document.getElementById("box-content") as HTMLSpanElement;
const log = document.getElementById("log") as HTMLPreElement;
const toggleOverflowBtn = document.getElementById(
  "toggle-overflow",
) as HTMLButtonElement;
const toggleParentWidthBtn = document.getElementById(
  "toggle-parent-width",
) as HTMLButtonElement;
const toggleHiddenBoxBtn = document.getElementById(
  "toggle-hidden-box",
) as HTMLButtonElement;
const parent = document.getElementById("parent") as HTMLDivElement;
const child = document.getElementById("child") as HTMLDivElement;
const hiddenBox = document.getElementById("hidden-box") as HTMLDivElement;
const toggleVisibilityBoxBtn = document.getElementById(
  "toggle-visibility-box",
) as HTMLButtonElement;
const visibilityBox = document.getElementById(
  "visibility-box",
) as HTMLDivElement;
const [increaseWidthBtn, increaseHeightBtn] =
  document.querySelectorAll<HTMLButtonElement>("#controls button");

let callCount = 0;

function print(label: string, entries: ResizeObserverEntry[]) {
  callCount += 1;

  const lines = entries.map((entry) => {
    const { width, height } = entry.contentRect;
    const contentBox = entry.contentBoxSize?.[0];
    const borderBox = entry.borderBoxSize?.[0];

    return [
      `  contentRect: width=${width.toFixed(1)} height=${height.toFixed(1)}`,
      `  contentBoxSize: inline=${contentBox?.inlineSize.toFixed(1)} block=${contentBox?.blockSize.toFixed(1)}`,
      `  borderBoxSize: inline=${borderBox?.inlineSize.toFixed(1)} block=${borderBox?.blockSize.toFixed(1)}`,
    ].join("\n");
  });

  log.textContent += `#${callCount} [${label}]\n${lines.join("\n")}\n\n`;
  log.scrollTop = log.scrollHeight;
}

const observer = new ResizeObserver((entries) => {
  print("callback", entries);
});

// Case 01: observe 직후 callback이 발생하는가?
observer.observe(box);

increaseWidthBtn.addEventListener("click", () => {
  const current = box.getBoundingClientRect().width;
  box.style.width = `${current + 20}px`;
});

increaseHeightBtn.addEventListener("click", () => {
  const current = box.getBoundingClientRect().height;
  box.style.height = `${current + 20}px`;
});

// Case: overflow로 스크롤바가 생겼을 때도 감지되는가?
// box 자신의 width/height는 그대로 두고, 내부 콘텐츠만 넓혀서 가로 스크롤바를 유발한다.
toggleOverflowBtn.addEventListener("click", () => {
  boxContent.classList.toggle("wide");
});

// Case: 부모 width 때문에 자식(width: 100%) width가 변경돼도 감지되는가?
// child 자신은 어떤 크기도 직접 바꾸지 않는다. 오직 parent의 width만 바뀐다.
const childObserver = new ResizeObserver((entries) => {
  print("child callback (parent width changed)", entries);
});
childObserver.observe(child);

toggleParentWidthBtn.addEventListener("click", () => {
  parent.classList.toggle("narrow");
});

// Case: display:none 상태에서 observe하면 어떻게 되는가?
// hiddenBox는 처음부터 display:none이며, 이 상태 그대로 observe()를 호출한다.
const hiddenBoxObserver = new ResizeObserver((entries) => {
  print("hidden-box callback (display:none)", entries);
});
hiddenBoxObserver.observe(hiddenBox);

toggleHiddenBoxBtn.addEventListener("click", () => {
  hiddenBox.classList.toggle("shown");
});

// Case 08: visibility:hidden은 어떻게 되는가?
// display:none과 달리, visibility:hidden은 레이아웃 공간은 그대로 차지한 채 시각적으로만 감춘다.
const visibilityBoxObserver = new ResizeObserver((entries) => {
  print("visibility-box callback (visibility:hidden toggle)", entries);
});
visibilityBoxObserver.observe(visibilityBox);

toggleVisibilityBoxBtn.addEventListener("click", () => {
  visibilityBox.classList.toggle("invisible");
});
