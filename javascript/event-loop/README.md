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

#### 테스트

#### 결과

#### 이유

#### Learned

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
