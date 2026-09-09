# browser/intersection-observer

> https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

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
