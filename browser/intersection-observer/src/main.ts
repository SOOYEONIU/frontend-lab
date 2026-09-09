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
  target.scrollIntoView({ behavior: "smooth", block: "center" });
});

scrollToTopBtn.addEventListener("click", () => {
  scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
});
