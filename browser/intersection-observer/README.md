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
