import "./style.css";

const scrollContainer = document.getElementById(
  "scroll-container",
) as HTMLDivElement;
const target = document.getElementById("target") as HTMLDivElement;
const log = document.getElementById("log") as HTMLPreElement;
const scrollToTargetBtn = document.getElementById(
  "scroll-to-target",
) as HTMLButtonElement;
const scrollToTopBtn = document.getElementById(
  "scroll-to-top",
) as HTMLButtonElement;
const smoothScrollToTargetBtn = document.getElementById(
  "smooth-scroll-to-target",
) as HTMLButtonElement;
const viewportTarget = document.getElementById(
  "viewport-target",
) as HTMLDivElement;
const scrollPageToViewportTargetBtn = document.getElementById(
  "scroll-page-to-viewport-target",
) as HTMLButtonElement;
const scrollPageToTopBtn = document.getElementById(
  "scroll-page-to-top",
) as HTMLButtonElement;

let callCount = 0;

function print(label: string, entries: IntersectionObserverEntry[]) {
  callCount += 1;

  const lines = entries.map((entry) => {
    const { isIntersecting, intersectionRatio, boundingClientRect, rootBounds } =
      entry;

    return [
      `  isIntersecting: ${isIntersecting}`,
      `  intersectionRatio: ${intersectionRatio.toFixed(2)}`,
      `  boundingClientRect.top: ${boundingClientRect.top.toFixed(1)}`,
      `  rootBounds.height: ${rootBounds?.height.toFixed(1)}`,
    ].join("\n");
  });

  log.textContent += `#${callCount} [${label}]\n${lines.join("\n")}\n\n`;
  log.scrollTop = log.scrollHeight;
}

const observer = new IntersectionObserver(
  (entries) => {
    print("callback", entries);
  },
  {
    root: scrollContainer,
    threshold: [0, 0.5, 1],
  },
);

// Case 01: observe 직후 callback이 발생하는가?
observer.observe(target);

scrollToTargetBtn.addEventListener("click", () => {
  target.scrollIntoView({ block: "center" });
});

scrollToTopBtn.addEventListener("click", () => {
  scrollContainer.scrollTo({ top: 0 });
});

// Case 03: threshold를 여러 개 주면 각 지점마다 callback이 발생하는가?
// smooth 스크롤로 여러 프레임에 걸쳐 이동시켜, 0 -> 0.5 -> 1 을 프레임별로 지나치게 만든다.
smoothScrollToTargetBtn.addEventListener("click", () => {
  target.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Case 04: root를 지정하지 않으면(viewport 기준) 어떻게 동작하는가?
// scroll-container(커스텀 root)가 아니라, 별도의 observer로 문서 흐름 속 요소를 관찰한다.
// options에 root를 아예 넣지 않으면 기본값은 null이며, viewport가 root로 쓰인다.
const viewportObserver = new IntersectionObserver(
  (entries) => {
    print("viewport callback (root: viewport)", entries);
  },
  {
    threshold: [0, 0.5, 1],
  },
);
viewportObserver.observe(viewportTarget);

scrollPageToViewportTargetBtn.addEventListener("click", () => {
  viewportTarget.scrollIntoView({ behavior: "smooth", block: "center" });
});

scrollPageToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
