# browser/intersection-observer

> https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

### intersection

사전적으로 "교차, 교차점"이라는 뜻.
수학의 집합 연산에서 "교집합"을 뜻하는 단어이기도 함.

즉 target요소의 영역과 관찰 기준이 되는 뷰포트 또는 특정 컨테이너의 영역이 얼마나 겹치는지 뜻함.

## Goal

Element가 viewport(또는 지정한 root)와

언제, 어떤 기준으로 교차(intersect)하는지 ResizeObserver가 아닌 IntersectionObserver로 확인한다.

## Questions

01. observe 직후 callback은 발생하는가?

02. scroll로 target이 root 안으로 들어오면 감지되는가?

03. threshold를 여러 개([0, 0.5, 1]) 주면 각 지점마다 callback이 발생하는가?

04. root를 지정하지 않으면(viewport 기준) 어떻게 동작하는가?

05. rootMargin을 주면 교차 판정 범위가 어떻게 달라지는가?

06. target이 display:none이 되면 어떻게 되는가?

07. unobserve하면 어떻게 되는가?

08. 여러 target을 하나의 observer로 관찰하면 entries는 어떻게 오는가?

### Case 01. observe 직후 callback이 발생하는가?

#### 예상

ResizeObserver와 마찬가지로, observe 시점의 초기 교차 상태도 하나의 notification으로 전달될 것이라 예상했다.

#### 테스트

`#scroll-container`(height 300px, overflow-y auto)를 root로 하는 IntersectionObserver를 생성하고, 컨테이너 안 스크롤 없이 보이지 않는 위치에 있는 `#target`을 바로 observe()했다.

#### 결과

observe() 호출 직후 callback이 1회 발생했다. 이때 `isIntersecting`은 `false`, `intersectionRatio`는 `0`이었다 (target이 spacer에 가려져 초기에는 root 밖에 있기 때문).

#### 이유

IntersectionObserver도 ResizeObserver처럼 observe() 호출 시점의 현재 교차 상태를 최초 callback으로 전달한다. 실제로 스크롤이 일어나지 않아도, "관찰을 시작한 시점의 상태"를 알려주기 위한 최초 notification이 발생하는 것이다.

#### Learned

- observe()를 호출하면 현재 교차 상태에 대한 callback이 최초 1회 발생한다.
- 이 최초 callback만으로는 "사용자가 스크롤했다"는 것을 의미하지 않으므로, callback 내부 로직 작성 시 최초 호출도 고려해야 한다.
- `isIntersecting`/`intersectionRatio`가 0이어도 callback 자체는 발생할 수 있다 (교차하지 않는 상태도 하나의 notification).

### Case 02. scroll로 target이 root 안으로 들어오면 감지되는가?

#### 예상

target이 스크롤에 의해 root(`#scroll-container`)의 보이는 영역 안으로 들어오면 `isIntersecting`이 `false → true`로 바뀌면서 callback이 발생할 것이라 예상했다.

#### 테스트

`Scroll to Target` 버튼을 눌러 `target.scrollIntoView({ block: "center" })`로 target을 컨테이너 중앙에 오도록 스크롤한 뒤 로그를 확인했다. 이어서 `Scroll to Top` 버튼으로 `scrollContainer.scrollTo({ top: 0 })`를 호출해 다시 밖으로 내보낸 뒤의 로그도 비교했다. 

#### 결과

- 페이지 로드 직후(Case 01): `#1 isIntersecting=false, intersectionRatio=0.00, boundingClientRect.top=642.0`
- `Scroll to Target` 클릭 후: `#2 isIntersecting=true, intersectionRatio=1.00, boundingClientRect.top=142.0`
- `Scroll to Top` 클릭 후: `#3 isIntersecting=false, intersectionRatio=0.00, boundingClientRect.top=642.0`

target이 root 안으로 들어오고 나갈 때마다 callback이 정확히 1번씩 추가로 발생했다.

흥미로운 점은, threshold를 `[0, 0.5, 1]`로 지정했음에도 `intersectionRatio`가 `0.5`인 시점의 callback은 로그에 없었다는 것이다. `scrollIntoView`/`scrollTo`가 애니메이션 없이 즉시(jump) 스크롤되다 보니, 브라우저가 다음 프레임에 확인했을 때 이미 완전히 교차(`1.00`)한 상태였고 그 사이의 `0.5` 지점은 별도 프레임으로 그려지지 않아 감지되지 않은 것으로 보인다.

#### 이유

IntersectionObserver는 스크롤 자체를 감지하는 것이 아니라, 매 프레임(정확히는 브라우저의 유휴 시점)마다 target과 root의 교차 영역을 다시 계산해서 지정한 threshold 지점을 지나쳤는지를 판단한다. 스크롤로 인해 target의 위치가 바뀌어 교차 비율이 threshold를 통과하면 그 시점의 값으로 callback이 발생한다.

Case 01의 이유와 이어지는 부분인데, "무엇이 크기/위치를 바꿨는가(버튼 클릭, 스크롤, 애니메이션)"는 중요하지 않고 오직 "실제로 화면에 그려진 교차 상태가 바뀌었는가"만 본다는 점에서 ResizeObserver의 동작 방식과 동일한 철학을 공유한다.

#### Learned

- scroll에 의한 위치 변화도 IntersectionObserver가 정상적으로 감지하며, 이때도 별도의 scroll 이벤트 리스너 없이 target/root의 교차 상태 변화만으로 callback이 호출된다.
- threshold를 여러 개 지정해도, 스크롤이 프레임 사이를 건너뛰면(에니메이션 없는 즉시 이동) 중간 threshold 지점은 감지되지 않고 최종 상태만 반영된 callback이 올 수 있다. (Case 03에서 애니메이션이 있는 스크롤과 비교해 더 검증 필요)
- `boundingClientRect.top` 값을 함께 보면 "root 기준으로 target이 실제로 어디에 있는지"까지 알 수 있어 디버깅에 유용하다.

### Case 03. threshold를 여러 개([0, 0.5, 1]) 주면 각 지점마다 callback이 발생하는가?

#### 예상

Case 02에서는 즉시 점프하는 스크롤이라 프레임이 생략돼 `0.5` 지점을 못 잡은 것이라 보고, `scrollIntoView`에 `behavior: "smooth"`를 줘서 여러 프레임에 걸쳐 이동시키면 `0 → 0.5 → 1`을 순서대로 다 잡을 수 있을 것이라 예상했다.

#### 테스트

`Smooth Scroll to Target` 버튼을 추가해 `target.scrollIntoView({ behavior: "smooth", block: "center" })`로 부드럽게 스크롤한 뒤 로그를 확인했다. 두 가지 환경에서 비교했다: (1) Playwright(headless Chromium)로 클릭 후 1.5초 대기, (2) 실제 브라우저에서 버튼을 직접 클릭.

#### 결과

**(1) headless Chromium (Playwright)**

- `#1 isIntersecting=false, intersectionRatio=0.00` (초기)
- `#2 isIntersecting=true, intersectionRatio=0.04`
- `#3 isIntersecting=true, intersectionRatio=1.00`

`0.5` 지점 없이 `0`(≈0.04)과 `1` 두 지점만 잡혔다.

**(2) 실제 브라우저**

- `#1 isIntersecting=false, intersectionRatio=0.00`
- `#2 isIntersecting=true, intersectionRatio=0.08`
- `#3 isIntersecting=true, intersectionRatio=0.54`
- `#4 isIntersecting=true, intersectionRatio=1.00`

같은 코드, 같은 버튼인데도 이번에는 `0.54`(≈0.5) 지점이 정확히 잡혔다.

즉 같은 threshold 설정이라도 실행 환경에 따라 중간 지점이 잡히기도, 건너뛰어지기도 하는 것을 확인했다.

#### 이유

IntersectionObserver의 교차 비율 계산은 스크롤 이벤트나 애니메이션 프레임 하나하나에 동기적으로 반응하지 않는다. 브라우저는 자체적인 주기(대략 메인 스레드가 여유로운 시점, 문서상 "a rendering opportunity" 단위)로 교차 비율을 다시 계산하며, 이 체크 시점에 계산된 비율이 이전 체크와 비교해 어떤 threshold들을 사이에 두고 있는지를 확인해 notification을 보낸다.

문제는 이 "체크 시점"의 빈도와 타이밍이 디스플레이 리프레시 레이트, CPU 부하, headless 여부 등 실행 환경에 따라 달라진다는 것이다. headless Chromium은 실제 화면을 그리지 않기 때문에 체크 시점이 더 드문드문 발생했고, 그 사이 비율이 `0.04`에서 `1.00`까지 한 번에 건너뛰어 버렸다. 반면 실제 브라우저에서는 체크가 더 촘촘하게 일어나서 `0.5` 근방(`0.54`)의 스냅샷을 잡아낼 기회가 있었던 것으로 보인다.

즉 threshold는 "이 값에 정확히 도달하면 반드시 잡아준다"는 보장이 아니라, "체크 시점마다 계산된 비율이 이전 체크와 비교해 이 값을 사이에 두고 있었으면 알려준다"는 방식에 가깝다. 체크 빈도가 스크롤/애니메이션 속도를 따라가지 못하면 중간 threshold는 언제든 건너뛰어질 수 있다.

#### Learned

- threshold를 여러 개 등록해도 모든 지점이 항상 콜백으로 보장되는 것은 아니다. 체크 시점 사이에 비율이 여러 threshold를 한 번에 건너뛰면 중간 지점은 누락될 수 있다.
- 이 누락 여부는 코드가 아니라 **실행 환경(리프레시 레이트, CPU 부하, headless/실브라우저 등)에 따라 달라질 수 있다** — 같은 코드를 두 번 실행해도 결과가 다를 수 있다는 뜻이므로, "특정 threshold가 항상 잡힌다"고 가정하고 로직을 짜면 안 된다.
- 따라서 "정확히 50% 노출된 시점"처럼 특정 비율에 의존하는 로직이 필요하면 threshold 하나만 믿지 말고, 콜백마다 `intersectionRatio` 값을 직접 확인해서 원하는 범위(예: `>= 0.5`)를 스스로 판단하는 방식이 더 안전하다.
- 반대로 Case 01/02처럼 `isIntersecting`(0 ↔ 0 초과 경계)만 필요한 경우는 threshold 기본값(`[0]`)만으로도 안정적으로 감지된다 — 문제가 되는 건 중간값 정밀도가 필요한 경우다.

### Case 04. root를 지정하지 않으면(viewport 기준) 어떻게 동작하는가?

#### 예상

`root` 옵션을 아예 생략하면(또는 `null`) 기본값으로 브라우저의 viewport가 root로 쓰일 것이라 예상했다. 즉 커스텀 스크롤 컨테이너가 아니라 "페이지 자체를 스크롤"할 때 감지될 것이다.

#### 테스트

기존 `#scroll-container`/`#target`과는 별개로, 문서의 일반적인 흐름 속에 `#viewport-target`을 배치했다(위아래로 1000px짜리 `#page-spacer`를 둬서 처음엔 화면 밖에 있도록 함). 이 target을 관찰하는 `viewportObserver`는 options에 `root`를 아예 넣지 않았다.

```ts
// root를 지정하지 않으면 기본값은 null이며, viewport가 root로 쓰인다.
const viewportObserver = new IntersectionObserver(
  (entries) => {
    print("viewport callback (root: viewport)", entries);
  },
  {
    threshold: [0, 0.5, 1],
  },
);
viewportObserver.observe(viewportTarget);
```

`Scroll Page to Viewport Target` 버튼으로 `viewportTarget.scrollIntoView({ behavior: "smooth", block: "center" })`를 호출해 페이지 자체를 스크롤시키고, `Scroll Page to Top` 버튼으로 `window.scrollTo(...)`를 호출해 되돌렸다. Playwright에서 뷰포트 크기를 800x600으로 고정하고 로그를 확인했다.

#### 결과

- 페이지 로드 직후: `isIntersecting=false, intersectionRatio=0.00, rootBounds.height=600.0`
- `Scroll Page to Viewport Target` 클릭 후: `isIntersecting=true`로 바뀌며 `intersectionRatio`가 `0.18 → 0.65 → 1.00`처럼 여러 단계를 거쳐 올라가는 callback들이 연속으로 발생
- `Scroll Page to Top` 클릭 후: 다시 `isIntersecting=false`로 돌아오는 callback 발생

가장 중요한 확인 포인트는 `rootBounds.height`가 `600.0`이었다는 것이다. 이는 Playwright에서 설정한 브라우저 뷰포트 높이(800x600)와 정확히 일치한다. `#scroll-container`를 root로 쓴 기존 observer의 `rootBounds.height`가 `300.0`(컨테이너 자체 높이)이었던 것과 비교하면 차이가 명확하다.

#### 이유

`IntersectionObserver` 생성자의 `root` 옵션은 기본값이 `null`이며, 스펙상 `root`가 `null`이면 "the observer's target's nearest scrollable ancestor... falls back to the top-level document's viewport"로 정의되어 있다. 즉 별도로 지정하지 않으면 브라우저 창(viewport) 자체가 교차 판정의 기준 영역이 된다.

이 때문에 `rootBounds`도 viewport의 크기(`800x600`)를 그대로 반영했고, `#viewport-target`이 페이지 스크롤에 의해 화면(viewport) 안으로 들어오고 나가는 것을 정확히 감지했다. 반면 `root: scrollContainer`로 지정한 기존 observer는 window가 아니라 그 컨테이너 내부 스크롤만 기준으로 삼기 때문에, 페이지 자체를 스크롤해도 반응하지 않고 `#scroll-container` 내부 스크롤에만 반응한다.

#### Learned

- `root`를 생략(또는 `null`)하면 브라우저 viewport가 기준이 되며, 이때는 `window.scroll`이나 `element.scrollIntoView()` 같은 "페이지 스크롤"이 교차 판정의 트리거가 된다.
- `rootBounds`를 확인하면 지금 어떤 영역을 기준으로 교차를 계산하고 있는지 바로 알 수 있다 — viewport 기준이면 브라우저 창 크기와, 커스텀 root면 그 요소의 크기와 일치한다.
- "무한 스크롤"이나 "화면에 요소가 노출됐는지" 같은 전형적인 lazy-loading 용도로는 대부분 `root`를 생략해 viewport 기준으로 쓰는 경우가 많고, 특정 스크롤 컨테이너 내부에서만 노출 여부를 판단해야 할 때(예: 모달, 사이드 패널 리스트)만 커스텀 `root`를 지정하면 된다.
- target이 root(커스텀이든 viewport든)의 스크롤 가능한 후손(ancestor)이 아니면 애초에 교차가 성립하지 않는다는 점도 유의해야 한다 (지금 예제는 `#viewport-target`이 `#scroll-container` 밖, 일반 문서 흐름에 있어 viewport와는 정상적으로 교차하지만 `#scroll-container`를 root로 관찰했다면 애초에 감지되지 않았을 것이다).

### Case 05. rootMargin을 주면 교차 판정 범위가 어떻게 달라지는가?

#### 예상

`rootMargin`은 CSS의 `margin`처럼 root의 판정 범위를 상하좌우로 확장하거나 축소시킬 것이라 예상했다. 양수 값(`"100px"`)을 주면 root가 실제 크기보다 더 넓은 것처럼 취급되어, target이 실제 root 안으로 들어오기 전(더 멀리 있을 때)부터 `isIntersecting=true`로 잡힐 것이라 예상했다.

#### 테스트

기존 `#target`을 관찰하는 `marginObserver`를 추가로 만들어 `root: scrollContainer`, `rootMargin: "100px"`, `threshold: [0, 0.5, 1]`로 설정했다. 기본 `observer`(rootMargin 없음)와 `marginObserver`가 같은 target을 동시에 관찰하도록 하고, `Smooth Scroll to Target` 버튼으로 한 번의 스크롤 동안 두 observer의 callback을 함께 비교했다.

```ts
// root(scroll-container)의 판정 범위를 상하좌우 100px씩 확장시킨 상태에서
// rootMargin이 없는 기본 observer와 동시에 비교한다.
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
```

#### 결과

페이지 로드 시점에 이미 `rootBounds.height` 차이가 보였다: 기본 observer는 `300.0`(`#scroll-container`의 실제 높이), `marginObserver`는 `500.0`(`300 + 100(위) + 100(아래)`). rootMargin이 root의 판정 범위 자체를 실제로 확장시킨다는 것을 바로 확인할 수 있었다.

스크롤 도중 `isIntersecting`이 `true`로 바뀐 시점도 달랐다:
- `marginObserver` (rootMargin 100px): `boundingClientRect.top=511.0`에서 먼저 `isIntersecting=true`로 전환
- 기본 `observer` (rootMargin 없음): `boundingClientRect.top=446.0`이 되어서야(즉 target이 더 가까이 와서야) `isIntersecting=true`로 전환

target이 같은 위치(`top=511`)에 있을 때, margin을 준 observer만 먼저 반응하고 기본 observer는 아직 반응하지 않은 것이다.

#### 이유

`rootMargin`은 실제 CSS margin처럼 root(여기서는 `#scroll-container`)의 판정용 경계 상자를 지정한 값만큼 안쪽/바깥쪽으로 늘리거나 줄인다. 양수 값(`"100px"`)을 주면 root의 상하좌우 경계가 각각 100px씩 바깥으로 확장된 것처럼 교차 계산이 이루어진다. 그래서 target이 실제 `#scroll-container`의 눈에 보이는 영역 밖에 있어도, 확장된 100px 여유 범위 안에만 들어오면 `isIntersecting=true`로 판정된다.

이 때문에 `rootBounds`도 `300`이 아니라 `500`으로 보고되며(위아래 각 100px씩 늘어난 값), 같은 target·같은 스크롤 위치에서도 rootMargin이 있는 쪽이 항상 먼저(또는 더 늦게, 음수를 주면) 반응하게 된다.

#### Learned

- `rootMargin`은 root의 실제 크기가 아니라, "교차를 판정할 때 사용하는 가상의 경계"를 늘리거나 줄이는 옵션이다. 실제 레이아웃(root의 실제 크기나 스크롤 가능 영역)은 전혀 바뀌지 않는다.
- 양수 값을 주면 target이 화면 안으로 실제 들어오기 "전에" 미리 감지할 수 있어, 무한 스크롤에서 "리스트 끝에 도달하기 조금 전에 다음 페이지를 미리 불러오는" 패턴(예: `rootMargin: "0px 0px 200px 0px"`로 아래쪽만 확장)에 흔히 쓰인다.
- `rootBounds` 값을 찍어보면 rootMargin이 실제로 얼마나 반영됐는지 바로 검증할 수 있다 (root 실제 크기 + margin 합).
- 음수 값을 주면 반대로 root 안쪽으로 판정 범위가 줄어들어, target이 화면에 완전히 들어오고도 일정 여유(margin만큼)가 지난 뒤에야 감지되게 만들 수도 있다 (이번 테스트에서는 직접 확인하지 않았지만, 양수와 대칭적으로 동작할 것으로 예상된다).

### Case 06. target이 display:none이 되면 어떻게 되는가?

#### 예상

ResizeObserver 실험([browser/resize-observer](../resize-observer/README.md) Case 05)에서 `display:none`이 되면 content box가 0이 되는 것을 확인했었다. IntersectionObserver도 마찬가지로 target이 `display:none`이 되면 레이아웃 박스 자체가 사라지므로 `isIntersecting=false`, `intersectionRatio=0`이 되는 callback이 발생할 것이라 예상했다.

#### 테스트

처음부터 화면에 보이는 위치에 `#display-target`을 배치해(viewport 기준으로 이미 `isIntersecting=true`인 상태로 시작) 별도의 `displayObserver`(`threshold: [0, 1]`)로 관찰했다. `Toggle Display Target` 버튼으로 `.hidden` 클래스(`display:none`)를 토글하며 로그를 비교했다.

#### 결과

- 초기 상태(보이는 상태): `isIntersecting=true, intersectionRatio=1.00, boundingClientRect.top=62.0, rootBounds.height=600.0`
- `display:none`으로 전환한 후: `isIntersecting=false, intersectionRatio=0.00, boundingClientRect.top=0.0, rootBounds.height=0.0`
- 다시 `display:block`으로 전환한 후: `isIntersecting=true, intersectionRatio=1.00, boundingClientRect.top=57.0, rootBounds.height=600.0`

예상대로 `isIntersecting`이 `false`로 바뀌었는데, `rootBounds.height`까지 `0.0`으로 찍힌 것은 예상 밖이었다. root(viewport) 자체는 전혀 바뀌지 않았는데도, target이 `display:none`이 되는 순간에는 `rootBounds`를 포함한 entry 전체가 "빈 사각형"으로 보고됐다.

#### 이유

`display:none`인 요소는 레이아웃 트리에서 제외되어 자체 경계 상자(`boundingClientRect`)가 없다. 스펙상 target이 레이아웃 박스를 갖지 않게 되면 해당 target은 교차하지 않는 것으로 간주되어 `isIntersecting=false`, `intersectionRatio=0`으로 보고되는데, 구현체(Chromium)는 이 상태의 entry를 "완전히 빈 사각형" 형태로 만들면서 `rootBounds`까지 함께 0으로 채워 보고하는 것으로 보인다. 즉 이 순간의 `rootBounds`는 실제 root의 현재 크기를 신뢰성 있게 반영하지 않는다.

다시 `display:block`으로 돌아오면 target이 레이아웃에 복귀하며 정상적인 `boundingClientRect`/`rootBounds`가 다시 계산되어, 원래의 viewport 크기(`600.0`)가 그대로 돌아왔다.

#### Learned

- target이 `display:none`이 되면 `isIntersecting=false`, `intersectionRatio=0`인 callback이 발생한다 — ResizeObserver의 `display:none` 케이스와 같은 방향의 결론이다.
- 다만 이 시점의 entry는 `boundingClientRect`뿐 아니라 `rootBounds`까지 모두 0으로 보고될 수 있으므로, callback 로직에서 `rootBounds`를 "현재 root의 실제 크기"로 신뢰해 계산에 쓰면 `display:none` 순간에 잘못된 값(0)을 근거로 동작할 위험이 있다.
- `isIntersecting` 하나만 보고 분기하는 것이 `rootBounds`/`boundingClientRect`의 세부 값까지 믿고 계산하는 것보다 더 안전하다.
- lazy-loading 등에서 `display:none`으로 요소를 감췄다가 다시 보이게 하는 패턴을 쓴다면, 다시 보일 때 교차 상태가 정상적으로 재계산되어 callback이 다시 발생한다는 것도 함께 확인했다 (unobserve/disconnect 없이도 계속 관찰이 유지됨).

### Case 07. unobserve하면 어떻게 되는가?

#### 예상

`unobserve(target)`을 호출하면 그 순간부터 해당 target에 대한 callback이 더 이상 발생하지 않을 것이라 예상했다. 다만 같은 target을 다른 observer 인스턴스가 관찰 중이라면, 그 observer에는 영향이 없을 것이라 예상했다 (unobserve는 "observer 인스턴스와 target의 관계"를 끊는 것이지, target 자체에 무언가를 하는 게 아니므로).

#### 테스트

같은 `#target`을 관찰하는 두 observer가 이미 있었다 — 기본 `observer`(rootMargin 없음)와 Case 05의 `marginObserver`(rootMargin: 100px). `Unobserve Target` 버튼을 눌러 `observer.unobserve(target)`만 호출하고, `marginObserver`는 그대로 뒀다.

```ts
// 같은 target을 관찰하는 두 observer 중 하나만 unobserve해서
// 이후 스크롤에서 한쪽은 멈추고 다른 한쪽은 계속되는지 비교한다.
unobserveTargetBtn.addEventListener("click", () => {
  observer.unobserve(target);
});
```

unobserve 직후 로그를 한 번 확인하고, 이어서 `Smooth Scroll to Target` 버튼으로 target을 다시 스크롤시킨 뒤 로그를 비교했다.

#### 결과

`unobserve` 호출 자체는 아무 callback도 발생시키지 않았다 (호출 직후 로그에 새 항목 없음).

이후 스크롤을 실행하자:
- `[margin callback (rootMargin: 100px)]` — `isIntersecting: true`로 전환되는 callback이 2번(`0.39`, `1.00`) 정상적으로 발생
- `[callback]`(unobserve한 기본 observer) — 스크롤 이후 로그에 **단 한 번도 다시 나타나지 않음**

같은 target, 같은 스크롤인데도 unobserve하지 않은 쪽만 계속 반응하고, unobserve한 쪽은 완전히 조용해졌다.

#### 이유

`unobserve(target)`은 "그 IntersectionObserver 인스턴스가 그 target을 더 이상 관찰하지 않도록" 관계를 끊는 메서드다. observer 자체가 사라지는 것도 아니고 target에 어떤 변화가 생기는 것도 아니며, 오직 "이 observer-target 쌍"에 대한 구독만 취소된다.

그래서 같은 target을 다른 observer(`marginObserver`)가 별도로 구독하고 있다면 그쪽은 전혀 영향을 받지 않고 독립적으로 계속 동작한다. IntersectionObserver의 관찰 관계는 (observer 인스턴스, target) 쌍 단위로 관리된다는 것을 확인할 수 있었다.

#### Learned

- `unobserve(target)`은 해당 observer 인스턴스에서 그 target 하나만 관찰 목록에서 제거한다. 같은 observer가 관찰하는 다른 target이나, 같은 target을 관찰하는 다른 observer에는 영향이 없다.
- unobserve 호출 자체는 callback을 트리거하지 않는다 (조용히 구독을 끊을 뿐, "마지막 상태" 같은 걸 알려주지 않는다).
- 컴포넌트 unmount, 무한 스크롤에서 특정 아이템 로드 완료 후 더 이상 볼 필요 없어진 경우처럼 "이 요소는 더 이상 관찰할 필요 없다"는 상황에 `unobserve`를 쓰면 메모리 누수 없이 딱 그 관계만 정리할 수 있다.
- 반대로 observer 자체를 더 이상 쓰지 않을 거라면(모든 target을 다 끊거나) `disconnect()`로 한 번에 정리하는 편이 낫다 (Case 08 이후에서 비교해볼 부분).