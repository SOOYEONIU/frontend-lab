# frontend-lab

프론트엔드 개발 개념을 주제별로 작은 데모 프로젝트로 만들어 학습하고 관리하기 위한 레포입니다.

## 구조

```
frontend-lab/
├─ template/
│  └─ vanilla-ts/     # 새 학습 프로젝트를 만들 때 복사해서 쓰는 scaffold
│
├─ browser/            # 브라우저 API 관련 학습 프로젝트
├─ javascript/         # JavaScript 개념 학습 프로젝트
├─ typescript/         # TypeScript 개념 학습 프로젝트
├─ ui/                 # UI/스타일링 관련 학습 프로젝트
├─ performance/        # 성능 관련 학습 프로젝트
└─ testing/            # 테스트 관련 학습 프로젝트
```

각 카테고리 폴더 하위에 주제별 프로젝트를 하나씩 추가합니다. (예: `browser/resize-observer/`)

## 새 학습 프로젝트 만들기

```bash
cp -r template/vanilla-ts <category>/<topic-name>
```

이후 복사한 프로젝트의 `package.json`의 `name` 필드와 `README.md`를 새 주제에 맞게 수정합니다.

## 패키지 매니저

이 레포는 pnpm workspace로 관리됩니다.

```bash
pnpm install
```
