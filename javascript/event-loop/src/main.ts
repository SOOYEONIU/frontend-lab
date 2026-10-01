import "./style.css";
import { runNative, type NativeEntry } from "./native";
import { Playback } from "./playback";
import { scenarios } from "./scenarios";
import { simulate } from "./simulator";
import { createView } from "./view";

let selected = scenarios[0];
let snapshots = simulate(selected);
let cancelNative: (() => void) | undefined;

const view = createView(scenarios, selectScenario);
const playback = new Playback(state => {
  view.render(snapshots[state.cursor], state);
});

function clearNative(): void {
  cancelNative?.();
  cancelNative = undefined;
  view.resetNative();
}

function selectScenario(id: string): void {
  const scenario = scenarios.find(item => item.id === id);
  if (!scenario) return;

  clearNative();
  selected = scenario;
  snapshots = simulate(scenario);
  view.selectScenario(scenario);
  playback.load(snapshots.length);
}

function compareNative(): void {
  clearNative();
  view.startNative();
  const logs: NativeEntry[] = [];
  const expected = snapshots[snapshots.length - 1].logs;

  // Run directly in the click task to start with timer nesting level 0.
  cancelNative = runNative(selected.id, entry => {
    logs.push(entry);
    if (logs.length === expected.length) {
      // Avoid DOM work between the measured callbacks.
      view.showNativeResults(logs, expected);
    }
  });
}

const { controls } = view;
controls.play.addEventListener("click", () => playback.toggle());
controls.previous.addEventListener("click", () => playback.step(-1));
controls.next.addEventListener("click", () => playback.step(1));
controls.reset.addEventListener("click", () => {
  clearNative();
  playback.seek(0);
});
controls.progress.addEventListener("input", () => {
  playback.seek(Number(controls.progress.value));
});
controls.speed.addEventListener("change", () => {
  playback.setSpeed(Number(controls.speed.value));
});
controls.native.addEventListener("click", compareNative);
window.addEventListener("pagehide", () => {
  playback.dispose();
  clearNative();
});
window.addEventListener("pageshow", () => {
  view.render(snapshots[playback.state.cursor], playback.state);
});

selectScenario(selected.id);
