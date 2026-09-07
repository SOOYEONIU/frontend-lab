import "./style.css";

const box = document.getElementById("box") as HTMLDivElement;
const boxContent = document.getElementById("box-content") as HTMLSpanElement;
const log = document.getElementById("log") as HTMLPreElement;
const toggleOverflowBtn = document.getElementById(
  "toggle-overflow",
) as HTMLButtonElement;
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
