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
const displayTarget = document.getElementById(
  "display-target",
) as HTMLDivElement;
const toggleDisplayTargetBtn = document.getElementById(
  "toggle-display-target",
) as HTMLButtonElement;
const unobserveTargetBtn = document.getElementById(
  "unobserve-target",
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

// Case 05: rootMargin을 주면 교차 판정 범위가 어떻게 달라지는가?
// 같은 target을 rootMargin: "100px"로 관찰해, root(scroll-container)의 판정 범위를
// 상하좌우 100px씩 확장시킨 상태에서 기본 observer와 동시에 비교한다.
const marginObserver = new IntersectionObserver(
  (entries) => {
    print("margin callback (rootMargin: 100px)", entries);
  },
  {
    root: scrollContainer,
    rootMargin: "100px",
    threshold: [0, 0.5, 1],
  },
);
marginObserver.observe(target);

// Case 06: target이 display:none이 되면 어떻게 되는가?
// displayTarget은 처음부터 viewport 안에서 보이는 상태로 시작한다.
const displayObserver = new IntersectionObserver(
  (entries) => {
    print("display callback (display:none toggle)", entries);
  },
  {
    threshold: [0, 1],
  },
);
displayObserver.observe(displayTarget);

toggleDisplayTargetBtn.addEventListener("click", () => {
  displayTarget.classList.toggle("hidden");
});

// Case 07: unobserve하면 어떻게 되는가?
// 같은 target을 관찰하는 두 observer(observer, marginObserver) 중 하나만 unobserve해서,
// 이후 스크롤에서 한쪽은 callback이 멈추고 다른 한쪽은 계속 발생하는지 비교한다.
unobserveTargetBtn.addEventListener("click", () => {
  observer.unobserve(target);
});
