# browser/resize-observer

> https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver

## Goal

Element의 크기 변화를 ResizeObserver가

언제, 어떤 기준으로 감지하는지 확인한다.

## Questions

01. observe 직후 callback은 발생하는가?

02. width 변경은 감지되는가?

03. height 변경은 감지되는가?

04. 부모 width 때문에 자식 width가 변경돼도 감지되는가?

05. display:none 상태에서 observe하면 어떻게 되는가?

06. display:none → block이면 어떻게 되는가?

07. block → none이면 어떻게 되는가?

08. visibility:hidden은 어떻게 되는가?

09. contentRect에는 어떤 값이 들어오는가?

10. contentBoxSize와 borderBoxSize는 어떻게 다른가?

11. padding/border를 추가하면 값이 어떻게 달라지는가?

12. window.resize와 어떤 차이가 있는가?

13. unobserve하면 어떻게 되는가?

14. disconnect하면 어떻게 되는가?

15. callback 안에서 자기 자신의 width를 변경하면 어떻게 되는가?

16. scroll이 생겼을 떄도 감지가 되는지?

### Case 01. observe 직후 callback이 발생하는가?

#### 예상

발생할 것이라고 예상했다.

#### 테스트

ResizeObserver를 생성한 뒤 별도의 크기 변경 없이 바로 observe()를 호출하도록 작성

#### 결과

observer() 실행되었을 떄 print 함수가 실행되도록 하여 logs를 기록하도록 하였는데,
observe 직후 바로 callback이 발생했다.

observe() 호출 이후 대상 요소의 크기를 별도로 변경하지 않았음에도 callback이 1회 호출되었다.

callback의 entries에는 현재 관찰 중인 요소가 포함되어 있었고, 현재 요소의 크기 정보도 확인할 수 있었다.

#### 이유

ResizeObserver는 단순히 observe() 이후에 발생하는 크기 변경만 감지하는 방식이 아니다.

관찰을 시작하면 브라우저가 대상 요소의 현재 크기를 확인하고, 초기 크기 정보 역시 ResizeObserver notification으로 전달한다.

따라서 observe()를 호출한 직후에는 실제 resize 작업을 하지 않았더라도 최초 callback이 발생할 수 있다.

#### Learned

- observe()를 호출하면 최초 크기 정보에 대한 callback이 발생한다.
- ResizeObserver callback이 호출됐다고 해서 반드시 사용자가 요소의 크기를 변경했다는 의미는 아니다.
- callback 내부 로직을 작성할 때 최초 실행도 고려해야 한다.
- ResizeObserver를 컴포넌트 초기화 용도로 사용할 경우, 이 최초 callback을 활용할 수도 있다.

### Case 02/03. width/Height 변경은 감지되는가?

#### 예상

- 상자의 크기 변경에 대해 감지하는 observer이기 때문에 변경은 감지될 것 같음. 

#### 테스트

- Increase Width/Height 버튼을 생성하여 해당 버튼을 누를 떄 observer가 실행되는지 확인

#### 결과

Increase Width 버튼을 클릭하면 box의 width가 20px씩 증가했고, 그때마다 observer callback이 호출되었다.
Increase Height 버튼을 클릭한 경우에도 마찬가지로 height가 20px씩 증가할 때마다 callback이 호출되었다.

Case 01의 최초 callback(#1) 이후, 버튼을 누를 때마다 #2, #3, ... 순서로 callback이 한 번씩 추가로 발생했다.
contentRect의 width(또는 height) 값이 클릭 횟수에 비례해서 20씩 증가하는 것을 로그에서 확인할 수 있었다.

#### 이유

ResizeObserver는 대상 요소의 content box 크기가 실제로 변경될 때마다 이를 감지해 callback을 호출한다.
버튼 클릭 → 인라인 style로 width/height를 직접 변경 → 레이아웃 반영 → ResizeObserver가 다음 프레임에서 변경된 크기를 감지 → callback 실행의 흐름으로 동작한다.

width만 변경했을 때는 height 값이, height만 변경했을 때는 width 값이 로그상 이전과 동일하게 유지되는 것으로 보아, ResizeObserver는 width/height를 구분하지 않고 요소의 전체 크기(box) 변경 여부만을 기준으로 감지한다는 것을 알 수 있었다.

#### Learned

- style을 통한 명시적인 크기 변경은 ResizeObserver가 곧바로 감지한다.
- width/height 중 하나만 변경해도 하나의 resize 이벤트(entry)로 통합되어 전달되며, observer는 두 값을 개별적으로 구분해서 통지하지 않고 변경 시점의 전체 contentRect를 함께 전달한다.
- 짧은 시간 내에 여러 번 클릭해 크기를 연속으로 변경하면, 각 변경이 개별 callback으로 오는지 혹은 batching(coalescing)되어 한 번에 전달되는지는 별도로 확인이 필요하다.

### Case 16. overflow로 스크롤바가 생겼을 때도 감지되는가?

#### 예상

- box 자체의 width/height는 그대로 두고 내부 콘텐츠만 넘치게 만들면, 스크롤바가 생기면서 content box 영역이 줄어들 것이고 이 변화도 감지될 것이라 예상했다.

#### 테스트

box(width/height 100px 고정)는 그대로 두고, 내부에 `#box-content`(300px 고정, `white-space: nowrap`)를 토글로 삽입해 가로로 넘치게 만들었다. `Toggle Overflow Content` 버튼으로 on/off.

#### 결과

버튼을 클릭해 콘텐츠가 넘치는 상태(`scrollWidth(300) > clientWidth(100)`)가 되었지만, `box.clientHeight`는 클릭 전후 100으로 동일했다.

ResizeObserver callback도 추가로 발생하지 않았다 (최초 observe 시의 callback 이후 변화 없음).

#### 이유

크롬(그리고 macOS 환경)은 기본적으로 콘텐츠 위에 떠 있는 **overlay 스크롤바**를 사용한다. overlay 스크롤바는 나타나도 content box 자체의 크기를 줄이지 않기 때문에, ResizeObserver 입장에서는 실제로 감지할 크기 변화가 없다.

즉, "스크롤바가 시각적으로 보이는가"와 "content box 크기가 변했는가"는 별개이며, ResizeObserver는 후자만을 기준으로 동작한다.

#### Learned

- overflow로 스크롤바가 생겼다고 해서 항상 ResizeObserver가 반응하는 것은 아니다.
- overlay 스크롤바(콘텐츠 위에 떠서 공간을 차지하지 않는 방식) 환경에서는 스크롤바 등장이 content box 크기에 영향을 주지 않아 감지되지 않는다.
- 만약 OS/브라우저 설정이 고전 스크롤바(항상 표시, 공간을 차지하는 방식)라면 content box가 스크롤바 두께만큼 줄어들어 ResizeObserver도 이를 감지할 것으로 예상된다. (환경에 따라 결과가 달라질 수 있는 케이스)

### Case 04. 부모 width 때문에 자식 width가 변경돼도 감지되는가?

#### 예상

- observe 대상(child)이 아니라 그 부모의 크기가 바뀐 것이므로, child 입장에서는 "간접적인" 크기 변화다. 그래도 결과적으로 child의 content box가 실제로 줄어드는 것이므로 감지될 것이라 예상했다.

#### 테스트

`#parent`(width 300px)와 그 안에 `width: 100%`인 `#child`를 배치했다. `child`에는 어떤 스타일 변경 코드도 두지 않았고, `Toggle Parent Width` 버튼을 누르면 오직 `parent`에 `.narrow` 클래스(width 150px)만 토글되도록 했다. `child`에는 별도의 ResizeObserver(`childObserver`)를 붙여 관찰했다.

#### 결과

버튼을 클릭해 `parent`의 width가 300px → 150px로 줄어들자, `child`도 `width: 100%`를 따라 300px → 150px로 줄어들었고, `childObserver`의 callback이 호출되었다.

처음에는 `#parent`에 `transition: width 0.2s`를 걸어뒀는데, 이 상태에서는 버튼 한 번 클릭에 callback이 여러 번(프레임 수만큼) 발생했다. `transition`을 제거하고 다시 테스트하니 클릭 한 번에 callback이 정확히 1번만 발생했다.

#### 이유

ResizeObserver는 "누가/왜 크기를 바꿨는지"가 아니라 observe 중인 요소의 content box가 실제로 달라졌는지만 본다. `child` 자신에게는 어떤 스타일 변경도 가하지 않았지만, 부모의 width 변경이 `width: 100%`를 통해 `child`의 실제 렌더링 크기에 그대로 전파되었고, ResizeObserver는 이 최종 결과(레이아웃에 실제로 반영된 크기 변화)만을 기준으로 감지한다.

transition이 있을 때 callback이 여러 번 발생한 이유도 같은 원리다. transition은 최종 값으로 한 번에 점프하는 게 아니라 0.2초 동안 매 애니메이션 프레임마다 중간값(300 → 290 → ... → 150)을 실제로 레이아웃에 반영한다. 즉 브라우저 입장에서는 크기가 여러 번 연속으로 "실제 변경"된 것이므로, ResizeObserver도 프레임마다 이를 감지해 callback을 여러 번 호출한 것이다.

#### Learned

- ResizeObserver는 크기 변화의 원인이 요소 자신의 스타일 변경이든, 부모발 간접 변화(예: `width: 100%` 상속)든 구분하지 않고, 최종적으로 렌더링된 content box 크기 변화만을 기준으로 감지한다.
- CSS `transition`이 걸린 상태에서 크기를 바꾸면, 애니메이션이 진행되는 동안 프레임마다 실제 크기가 바뀌므로 ResizeObserver callback도 애니메이션 프레임 수만큼 여러 번 호출될 수 있다.
- transition이 없으면 크기 변경이 레이아웃에 한 번에 반영되므로 callback도 1회만 발생한다.
- 즉 콜백 호출 횟수는 "몇 번의 상태 변경을 트리거했는가"가 아니라 "실제로 화면에 몇 번 다른 크기로 그려졌는가"에 좌우된다.

### Case 05. display:none 상태에서 observe하면 어떻게 되는가?

#### 예상

`display:none`인 요소는 레이아웃에서 아예 제외되어 크기 자체가 없는 상태이므로, observe()를 호출해도 callback이 발생하지 않을 것이라 예상했다.

#### 테스트

`#hidden-box`를 처음부터 `display:none`으로 두고, 페이지 로드 시점에 바로 `hiddenBoxObserver.observe(hiddenBox)`를 호출했다. 이후 `Toggle Hidden Box Display` 버튼으로 `.shown` 클래스(`display:block`)를 토글해 실제로 보이게 만들었을 때의 로그도 함께 비교했다. Playwright로 클릭 전/후 로그를 확인했다.

#### 결과

`display:none` 상태 그대로 observe()했을 때도 callback이 1회 발생했다. 다만 `contentRect`/`contentBoxSize`/`borderBoxSize` 모두 `width=0, height=0`이었다.

이후 버튼을 클릭해 `display:block`으로 바꾸자 callback이 다시 한 번 발생했고, 이번에는 실제 크기인 `width=120, height=80`이 전달되었다.

#### 이유

`display:none`인 요소는 레이아웃 트리에서 제외되어 content box 자체가 존재하지 않는다(크기 0으로 취급). ResizeObserver는 observe() 시점의 크기를 무조건 최초 notification으로 전달하기 때문에, 크기가 0이어도 "0이라는 크기의 최초 상태"를 알리는 callback은 발생한다.

이후 `display:block`으로 바뀌면 요소가 다시 레이아웃에 포함되면서 content box 크기가 0 → 120x80으로 실제로 변경되므로, 이 변화 역시 정상적으로 감지되어 두 번째 callback이 발생한다.

#### Learned

- `display:none` 상태에서 observe()해도 예외 없이 최초 callback은 발생하며, 이때 크기 값은 모두 0이다.
- ResizeObserver는 "요소가 화면에 실제로 보이는가"가 아니라 "content box 크기가 얼마인가"를 기준으로 동작하고, `display:none`은 그 크기를 0으로 만드는 하나의 상태일 뿐이다.
- 크기가 0인 콜백도 유효한 notification이므로, callback 로직에서 `width`/`height`가 0인 경우를 별도로 처리해야 할 수 있다 (예: 렌더링 로직에서 0으로 나누는 계산 등).
- `display:none` → `display:block`으로 전환되면 크기가 0에서 실제 값으로 바뀌는 것이므로 이 역시 하나의 resize로 감지된다 (Case 06과 연결됨).

### Case 06. display:none → block이면 어떻게 되는가?

#### 예상

Case 05에서 이미 확인했듯, `display:none` 상태에서는 content box 크기가 `0`으로 취급된다. 여기서 `display:block`으로 전환하면 요소가 다시 레이아웃에 포함되면서 실제 크기(`120x80`)로 바뀌는 것이므로, 이 변화도 하나의 정상적인 resize로 감지될 것이라 예상했다.

#### 테스트

Case 05와 동일한 `#hidden-box`/`hiddenBoxObserver` 구성을 그대로 사용했다. `Toggle Hidden Box Display` 버튼을 처음 한 번 클릭해 `.shown` 클래스를 추가(`display:none → block`)하고, 그 직후의 로그만 따로 확인했다.

#### 결과

첫 클릭(`none → block`) 직후 callback이 1회 발생했고, `contentRect`/`contentBoxSize`/`borderBoxSize` 모두 `width=120.0, height=80.0`(CSS에 지정한 실제 크기)이 전달되었다. 직전 callback(#3, observe 시점)의 `0x0`과 명확히 비교됐다.

#### 이유

`display:none`일 때는 content box가 존재하지 않아 크기가 `0`으로 취급되지만, `display:block`으로 바뀌면 요소가 레이아웃 트리에 다시 포함되어 실제 CSS 크기(`width: 120px; height: 80px`)만큼의 content box가 새로 생긴다. ResizeObserver 입장에서는 이 역시 "content box 크기가 `0`에서 `120x80`으로 실제로 달라진 것"이므로 일반적인 resize와 동일하게 감지되고 callback이 발생한다.

#### Learned

- `display:none → block` 전환은 요소가 "다시 나타나는 것"이라기보다, ResizeObserver 관점에서는 "content box 크기가 0에서 실제 값으로 바뀐 resize 이벤트"일 뿐이다.
- 별도의 분기 없이도 하나의 callback 안에서 이전 크기(0)와 현재 크기(120x80)를 비교하면 "요소가 막 보이기 시작했다"는 것을 판단할 수 있다.
- 컴포넌트가 조건부로 `display:none ↔ block`을 오가는 UI(예: 아코디언, 탭 패널)에서 크기가 필요한 로직(차트 리사이즈 등)을 ResizeObserver로 처리한다면, 이 전환 시점의 callback 하나로 "다시 보이기 시작했을 때 크기를 다시 계산"하는 처리가 가능하다.

### Case 07. block → none이면 어떻게 되는가?

#### 예상

Case 06과 반대 방향이므로, `display:block` 상태에서 실제 크기(`120x80`)로 있던 요소가 `display:none`으로 바뀌면 content box가 다시 `0`이 되는 것으로 감지되어 callback이 발생할 것이라 예상했다.

#### 테스트

Case 06에서 이미 `display:block`으로 전환해둔 `#hidden-box`에 대해, `Toggle Hidden Box Display` 버튼을 한 번 더 클릭해 `.shown` 클래스를 제거(`display:block → none`)했다. Playwright로 클릭 전/후 로그를 비교했다.

#### 결과

두 번째 클릭(`block → none`) 직후 callback이 1회 발생했고, `contentRect`/`contentBoxSize`/`borderBoxSize` 모두 다시 `width=0.0, height=0.0`으로 돌아왔다. 직전 callback(#4)의 `120x80`과 대비된다.

#### 이유

Case 06과 정확히 대칭적인 이유다. `display:block → none`으로 바뀌면 요소가 레이아웃 트리에서 제외되어 content box가 사라지고, ResizeObserver는 이를 "크기가 `120x80`에서 `0`으로 실제로 줄어든 resize"로 감지한다. `display:none`이 "크기를 0으로 만드는 하나의 상태"라는 Case 05의 결론과 일관된다.

#### Learned

- `display:block → none` 전환도 `none → block`과 마찬가지로 하나의 정상적인 resize(이번엔 `120x80 → 0`)로 감지되며, ResizeObserver 쪽에서 별도의 특수 처리가 필요하지 않다.
- 결과적으로 Case 05/06/07을 종합하면, ResizeObserver에게 `display:none`은 특별한 상태가 아니라 그냥 "content box 크기가 0인 상태"이고, `none ↔ block` 전환은 이 0과 실제 크기 사이를 오가는 두 번의 resize일 뿐이다.
- 크기가 0으로 줄어드는 callback을 별도로 처리하지 않으면(예: 0으로 나누기, 차트 라이브러리에 0 크기를 그대로 전달) 런타임 에러나 시각적 깨짐이 발생할 수 있으므로, `width`/`height`가 0인 경우를 명시적으로 걸러내는 방어 코드가 필요할 수 있다.

### Case 08. visibility:hidden은 어떻게 되는가?

#### 예상

`display:none`과 달리 `visibility:hidden`은 요소를 시각적으로만 감추고 레이아웃 공간(자리)은 그대로 차지하는 것으로 알고 있다. 따라서 content box의 크기 자체는 변하지 않을 것이므로, `visibility:hidden`을 토글해도 ResizeObserver callback은 발생하지 않을 것이라 예상했다.

#### 테스트

`#visibility-box`(120x80, 초기 상태 `visibility: visible`)를 `visibilityBoxObserver`로 관찰했다. `Toggle Visibility Box` 버튼으로 `.invisible` 클래스(`visibility: hidden`)를 토글하며 로그를 비교했다.

```css
#visibility-box.invisible {
    visibility: hidden;
}
```

#### 결과

- 토글 전 `boundingBox`: `{ x: 8, y: 179, width: 120, height: 80 }`
- `visibility: hidden`으로 전환 후 `boundingBox`: `{ x: 8, y: 179, width: 120, height: 80 }` — **완전히 동일**
- ResizeObserver 로그: observe 시점의 최초 callback(`width=120, height=80`) 이후, `visibility:hidden`으로 전환해도 → 새 callback 없음, 다시 `visible`로 전환해도 → 역시 새 callback 없음

예상대로 `visibility:hidden` 토글은 ResizeObserver에 어떤 반응도 일으키지 않았다.

#### 이유

`visibility:hidden`은 `display:none`과 달리 요소를 레이아웃 트리에서 제거하지 않는다. 요소는 여전히 그 자리를 차지하고 content box의 크기도 그대로 유지된 채, 다만 화면에 그려지지(paint) 않을 뿐이다. ResizeObserver는 오직 content box의 크기 변화만을 감지하는데, `visibility:hidden`은 이 크기에 전혀 영향을 주지 않으므로 감지할 대상 자체가 없는 것이다.

이는 Case 05~07에서 확인한 `display:none`(크기를 0으로 만듦)과 명확히 대비된다. `display:none`은 "크기 변화"이고, `visibility:hidden`은 "크기는 그대로인 채 렌더링(그리기)만 생략"이라는 점에서 ResizeObserver 입장에서는 전혀 다른 종류의 상태 변화다.

#### Learned

- `visibility:hidden`은 레이아웃 공간을 그대로 차지하므로 ResizeObserver로는 전혀 감지되지 않는다. "화면에 보이는지 여부"를 ResizeObserver로 판단하려 하면 안 된다 (이 용도에는 IntersectionObserver의 `isIntersecting`이나 별도의 `visibility` 값 확인이 필요하다).
- `display:none`과 `visibility:hidden`은 둘 다 "안 보이게 만든다"는 결과는 같지만, ResizeObserver 관점에서는 완전히 다르게 취급된다 — 전자는 크기를 0으로 만드는 resize이고, 후자는 크기에 아무 영향도 주지 않는 무관한 변화다.
- 두 속성을 혼용해서 쓰는 컴포넌트라면(예: 애니메이션 중엔 `visibility:hidden`, 완전히 제거할 땐 `display:none`), ResizeObserver 기반 로직이 `visibility` 전환에는 반응하지 않는다는 점을 전제로 설계해야 한다.