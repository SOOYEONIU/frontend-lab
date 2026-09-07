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

Playwright로 실제 브라우저를 띄워 클릭 전/후의 `box.clientWidth`/`clientHeight`와 ResizeObserver 로그를 비교했다.

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