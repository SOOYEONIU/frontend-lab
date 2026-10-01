import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function loadTypeScript(name) {
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { scenarios } = await loadTypeScript("scenarios");
const { simulate } = await loadTypeScript("simulator");
const { runNative } = await loadTypeScript("native");
const { Playback } = await loadTypeScript("playback");
const expected = {
  basic: ["start", "end", "promise", "microtask", "timeout"],
  chain: ["end", "then 1", "then 2", "then 3", "timeout"],
  starvation: ["end", "micro 1", "micro 2", "micro 3", "micro 4", "micro 5", "timeout"],
  async: ["before await", "end", "after await", "timeout"],
  raf: ["end", "promise", "rAF", "timeout"],
  nesting: Array.from({ length: 10 }, (_, i) => `timer ${i + 1}`),
  checkpoint: ["end", "timer A", "micro from A", "timer B"],
};
const trace = id => simulate(scenarios.find(scenario => scenario.id === id));

for (const scenario of scenarios) {
  test(`${scenario.id}: execution order and empty final queues`, () => {
    const states = simulate(scenario);
    const last = states.at(-1);
    assert.deepEqual(last.logs.map(entry => entry.name), expected[scenario.id]);
    for (const key of ["stack", "timers", "micro", "macro", "render"]) assert.equal(last[key].length, 0, key);
    for (const state of states) {
      if (state.line !== null) assert.ok(state.line >= 1 && state.line <= scenario.code.split("\n").length);
      if (state.stack.some(entry => entry.kind === "macro") && state.title.endsWith(" 실행")) assert.equal(state.micro.length, 0, "microtasks must drain before the next task starts");
    }
  });

  if (scenario.id === "raf") continue; // rAF ordering requires a browser, and isn't deterministic.
  test(`${scenario.id}: displayed source agrees with the simulation`, async () => {
    const output = [];
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error("example did not finish")), 2000);
      vm.runInNewContext(scenario.code, {
        console: { log: name => { output.push(name); if (output.length === expected[scenario.id].length) { clearTimeout(deadline); resolve(); } } },
        setTimeout, queueMicrotask, performance,
      });
    });
    assert.deepEqual(output, expected[scenario.id]);
  });
}

test("registration leaves callbacks waiting while synchronous code continues", () => {
  const state = trace("basic").find(state => state.logs.at(-1)?.name === "end");
  assert.deepEqual(state.stack.map(entry => entry.name), ["script()"]);
  assert.deepEqual(state.micro.map(entry => entry.name), ["Promise.then", "queueMicrotask"]);
  assert.equal(state.timers.length, 1);
  assert.equal(state.macro.length, 0);
});
test("Promise chain queues only the next ready reaction", () => {
  for (const state of trace("chain")) assert.ok(state.micro.length <= 1);
  const states = trace("chain");
  assert.ok(states.findIndex(state => state.logs.some(entry => entry.name === "then 1")) < states.findIndex(state => state.micro.some(entry => entry.name === "then #2")));
});
test("await runs in a nested synchronous frame then resumes without script", () => {
  const states = trace("async");
  assert.ok(states.some(state => state.stack.map(entry => entry.name).join(",") === "script(),work()"));
  const resumed = states.find(state => state.stack.some(entry => entry.name === "work() · resume"));
  assert.equal(resumed.stack.length, 1);
});
test("task A's microtask runs while task B waits", () => {
  const state = trace("checkpoint").find(state => state.stack.some(entry => entry.name === "micro from A"));
  assert.deepEqual(state.macro.map(entry => entry.name), ["timer B"]);
});
test("rewinding snapshots cannot mutate earlier state", () => {
  const states = trace("basic");
  states.at(-1).logs[0].name = "changed";
  assert.equal(states.find(state => state.logs.length > 0).logs[0].name, "start");
  assert.equal(states[0].logs.length, 0);
});

test("native execution matches displayed examples and cancellation suppresses pending output", async () => {
  globalThis.window = { setTimeout };
  for (const scenario of scenarios.filter(scenario => scenario.id !== "raf")) {
    const output = [];
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error("native execution did not finish")), 2000);
      runNative(scenario.id, entry => {
        output.push(entry.name);
        if (output.length === expected[scenario.id].length) { clearTimeout(deadline); resolve(); }
      });
    });
    assert.deepEqual(output, expected[scenario.id]);
  }
  globalThis.cancelAnimationFrame = () => {};
  const output = [];
  const cancel = runNative("basic", entry => output.push(entry.name));
  cancel();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(output, ["start", "end"]);
  delete globalThis.window;
  delete globalThis.cancelAnimationFrame;
});

test("playback clamps navigation, pauses on seek, and resets when a scenario changes", () => {
  let state;
  const playback = new Playback(value => { state = value; });
  playback.load(5);
  playback.step(-1);
  assert.equal(state.cursor, 0);
  playback.seek(100);
  assert.equal(state.cursor, 4);
  playback.toggle();
  assert.deepEqual(state, { cursor: 0, lastIndex: 4, playing: true });
  playback.seek(2);
  assert.deepEqual(state, { cursor: 2, lastIndex: 4, playing: false });
  playback.load(3);
  assert.deepEqual(state, { cursor: 0, lastIndex: 2, playing: false });
  playback.dispose();
});

test("playback finishes automatically and cancels pending ticks on reset", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const playback = new Playback(() => {});
  playback.load(3);
  playback.setSpeed(2);
  playback.toggle();
  t.mock.timers.tick(550);
  assert.equal(playback.state.cursor, 1);
  t.mock.timers.tick(550);
  assert.deepEqual(playback.state, { cursor: 2, lastIndex: 2, playing: false });
  playback.toggle();
  playback.seek(0);
  t.mock.timers.tick(5000);
  assert.deepEqual(playback.state, { cursor: 0, lastIndex: 2, playing: false });
  playback.dispose();
});
