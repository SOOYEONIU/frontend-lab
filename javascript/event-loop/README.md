# javascript/event-loop

> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop

## Goal

동기 코드, microtask(Promise, queueMicrotask), macrotask(setTimeout),
그리고 rendering 단계(requestAnimationFrame)가 실제로 어떤 순서로

실행되는지 브라우저에서 직접 확인한다.

## Questions

01. sync 코드, microtask, macrotask는 어떤 순서로 실행되는가?

02. Promise.then을 여러 번 체이닝하면 각 then은 한 tick에서 모두 처리되는가?

03. microtask 콜백 안에서 새로운 microtask를 계속 큐잉하면 macrotask는 계속 뒤로 밀리는가?

04. async 함수에서 await 이전/이후 코드는 각각 언제 실행되는가?

05. requestAnimationFrame은 microtask보다 먼저 실행되는가, 나중에 실행되는가?

06. setTimeout을 재귀적으로 중첩 호출하면 지연 시간이 강제로 늘어나는 시점(4ms clamping)이 있는가?

07. (추가로 확인해볼 것) 여러 macrotask가 큐에 쌓여있을 때, 하나의 macrotask 실행 후 microtask 큐는 항상 전부 비워지고 나서 다음 macrotask로 넘어가는가?

### Case 01. 기본 실행 순서

#### 예상

`setTimeout(fn, 0)`은 타이머가 걸리자마자 바로 실행될 것 같아서 `console.log`(동기 코드) 바로 다음에 실행되고, `Promise.then`/`queueMicrotask`는 그보다 뒤에 실행될 것이라고 예상했다.

#### 테스트

버튼 클릭 시 아래 순서로 코드를 등록했다.

```ts
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
```

#### 결과

```
#1 sync: script start
#2 sync: script end
#3 microtask: Promise.then
#4 microtask: queueMicrotask
#5 macrotask: setTimeout
```

예상과 달리 `setTimeout`이 가장 마지막에 실행되었다. 동기 코드(`#1`, `#2`)가 먼저 전부 끝난 뒤, `Promise.then`과 `queueMicrotask`가 등록된 순서대로 실행되고(`#3`, `#4`), `setTimeout`은 그 다음에야 실행됐다(`#5`).

#### 이유

콜 스택에 있는 동기 코드가 먼저 전부 실행된 뒤에야 이벤트 루프가 다음 작업을 꺼내온다. 이때 이벤트 루프는 매 tick마다 **microtask 큐를 macrotask보다 항상 먼저, 그리고 완전히 비운다.**

`setTimeout(fn, 0)`은 지연 시간이 0이어도 "즉시 실행"이 아니라 macrotask 큐에 작업을 등록하는 것뿐이다. 반면 `Promise.then`과 `queueMicrotask`는 microtask 큐에 등록되고, 동기 코드가 끝나자마자(콜 스택이 비자마자) macrotask보다 먼저 처리된다.

`Promise.then`이 `queueMicrotask`보다 먼저 실행된 이유는 단순히 코드에서 먼저 등록됐기 때문이다(microtask 큐는 FIFO). 두 API 사이에 우선순위 차이는 없다.

#### Learned

- `setTimeout(fn, 0)`은 "0초 뒤 즉시 실행"이 아니라 "지금 콜 스택과 microtask 큐가 다 처리된 뒤에 실행"을 의미한다.
- microtask(Promise, queueMicrotask)는 macrotask(setTimeout, setInterval)보다 항상 먼저 실행되며, 한쪽 큐가 다른 큐보다 우선순위가 낮은 게 아니라 애초에 이벤트 루프의 처리 단계가 다르다.
- Promise.then과 queueMicrotask는 같은 microtask 큐를 공유하므로, 실행 순서는 등록된 순서(FIFO)로 결정된다.
- 코드 작성 순서(setTimeout → Promise.then → queueMicrotask)와 실제 실행 순서(Promise.then → queueMicrotask → setTimeout)가 다르다는 점이 비동기 코드를 디버깅할 때 헷갈리는 지점이 될 수 있다.

### Case 02. Promise.then 체이닝

#### 예상

#### 테스트

#### 결과

#### 이유

#### Learned

### Case 03. microtask 재귀 큐잉

#### 예상

#### 테스트

#### 결과

#### 이유

#### Learned

### Case 04. async 함수 내부 순서

#### 예상

#### 테스트

#### 결과

#### 이유

#### Learned

### Case 05. requestAnimationFrame vs microtask

#### 예상

#### 테스트

#### 결과

#### 이유

#### Learned

### Case 06. setTimeout 중첩 clamping

#### 예상

#### 테스트

#### 결과

#### 이유

#### Learned
