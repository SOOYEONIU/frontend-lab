# browser/resize-observer

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