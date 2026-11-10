# AGENTS.md - AI 냉장고 파먹기 웹앱 개발 가이드 및 지침

본 문서는 **"AI 냉장고 파먹기 (Smart Fridge Recipe Assistant)"** 프로젝트를 개발하는 모든 AI 에이전트와 개발자가 준수해야 할 원칙, 아키텍처 규칙 및 작업 절차를 정의합니다. 본 프로젝트는 `PRD_step1.md`, `PRD_step2.md`, `PRD_step3.md`를 기반으로 합니다.

---

## 1. 절대 준수 규칙 (Core Rules)

1. **기술 스택 제한**:
   - **프론트엔드**: 순수(Vanilla) HTML/CSS/JavaScript (`index.html`, `style.css`, `script.js`)만 사용한다.
   - **백엔드/API**: Vercel 서버리스 함수 (`api/*.js`, Node.js Runtime)만 사용한다.
   - **프레임워크 및 번들러 금지**: React, Vue, Next.js, Vite, Webpack, Tailwind CSS CLI 등 복잡한 프레임워크나 빌드 도구를 절대 도입하지 않는다. 별도의 빌드 단계 없이 정적 서빙 및 Vercel 서버리스 환경에서 즉시 구동되어야 한다.

2. **OpenRouter API 호출 보안 및 환경 변수**:
   - OpenRouter API 직접 호출은 반드시 백엔드인 **`api/` 폴더 내의 서버리스 함수**에서만 수행한다. 클라이언트 브라우저(`script.js`)에서 API 키를 직접 호출하거나 노출해서는 안 된다.
   - API 키: `process.env.OPENROUTER_API_KEY`
   - 모델 이름: `process.env.OPENROUTER_MODEL` (환경 변수가 없을 경우 기본값: `"google/gemma-4-26b-a4b-it:free"`)
   - HTTP 레퍼러 및 앱 제목 헤더 설정: `HTTP-Referer`, `X-Title` 헤더를 적절히 명시한다.

3. **단계적 점진 개발 (One Feature at a Time)**:
   - 한 번에 한 기능만 구현한다.
   - 각 기능 구현을 완료한 후에는 사용자가 브라우저나 터미널에서 **어떻게 테스트하고 확인(검증)할 수 있는지** 구체적인 방법과 확인 절차를 명확히 안내한다.

4. **코드 주석 표준**:
   - 작성되는 모든 소스 코드(`index.html`, `style.css`, `script.js`, `api/*.js` 등)에는 명확하고 친절한 **한국어 주석**을 작성한다.

5. **환경 변수 및 보안 파일 격리**:
   - `.env.local`에 실제 API 키를 보관하며, 절대 Git 저장소에 커밋되지 않도록 `.gitignore`에 등록한다.
   - 배포 및 타 개발자 참고를 위해 더미 값이 들어간 `.env.example`을 제공한다.

6. **터미널 명령 직접 실행 및 결과 설명**:
   - 필요한 터미널 명령(의존성 설치, 로컬 서버 실행 등)은 에이전트가 직접 실행하고, 그 실행 결과와 의미를 사용자에게 명확히 설명한다.
   - Windows PowerShell 환경에서 `npm.ps1` 실행 권한 이슈가 있을 경우 `cmd.exe /c npm ...` 또는 실행 정책 우회 명령을 사용하여 안전하게 실행한다.

---

## 2. 프로젝트 구조 (Directory Structure)

```
fridge/
├── PRD_step1.md          # 1단계: 이미지 입력 & 식재료 인식 요구사항
├── PRD_step2.md          # 2단계: 맞춤형 레시피 생성 요구사항
├── PRD_step3.md          # 3단계: 사용자 프로필 & 레시피 저장 요구사항
├── AGENTS.md             # 본 가이드 문서
├── .gitignore            # Git 제외 목록 (.env.local, node_modules 등)
├── .env.local            # 로컬 환경 변수 (OPENROUTER_API_KEY 등, 커밋 금지)
├── .env.example          # 환경 변수 템플릿
├── package.json          # Vercel 로컬 개발 및 의존성 관리
├── vercel.json           # Vercel 라우팅 및 서버리스 설정
├── public/               # (선택) 정적 자산(아이콘, 이미지 등)
├── index.html            # 단일 반응형 웹앱 메인 페이지
├── style.css             # 모바일 퍼스트 반응형 스타일시트
├── script.js             # 클라이언트 로직 (DOM 제어, 이벤트, 로컬 스토리지)
└── api/
    ├── recognize.js      # 1단계: 이미지 기반 식재료 감지 Vercel 서버리스 함수
    └── recipe.js         # 2단계: 재료/프로필 기반 레시피 생성 Vercel 서버리스 함수
```

---

## 3. 단계별 로드맵 (Step-by-Step Implementation)

### 1단계: 이미지 입력 및 식재료 자동 인식 (PRD_step1.md)
- 클라이언트 사진 촬영/업로드 UI (`index.html`, `style.css`)
- 이미지 브라우저 단 리사이징/압축 및 Base64 인코딩 (`script.js`)
- `api/recognize.js` 서버리스 함수 구현:
  - OpenRouter `google/gemma-4-26b-a4b-it:free` 호출
  - JSON 형식 식재료 리스트 추출
- 프론트엔드 태그(Chip) 시각화 및 재료 수동 추가/삭제 기능

### 2단계: 맞춤형 레시피 생성 및 추천 (PRD_step2.md)
- 조리 시간, 난이도, 기본 양념 유무 선택 UI
- `api/recipe.js` 서버리스 함수 구현:
  - 확정된 재료 + 사용자 취향 조건을 프롬프트로 전송
  - `google/gemma-4-26b-a4b-it:free` 기반 2~3종 레시피 생성 (JSON 반환)
- 반응형 레시피 카드 캐러셀 및 단계별 조리 모드 뷰어 구현

### 3단계: 사용자 프로필 및 레시피 저장소 (PRD_step3.md)
- 사용자 프로필 설정 UI (닉네임, 알레르기 체크리스트, 기피 재료 태그)
- 프로필 정보를 `api/recipe.js` 프롬프트에 자동 반영(컨텍스트 주입)하여 기피 재료 배제
- 브라우저 LocalStorage 기반 레시피 북마크 및 보관함 기능 (별점, 조리 메모, 태그 검색)

---

## 4. API 인터페이스 가이드 (OpenRouter 통신 규칙)

### 4.1 기본 엔드포인트 및 헤더
- URL: `https://openrouter.ai/api/v1/chat/completions`
- Headers:
  ```javascript
  {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/fridge-recipe-assistant",
    "X-Title": "Fridge Recipe Assistant"
  }
  ```

### 4.2 모델 지정
- `process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free"`

---

## 5. 작업 원칙 체크리스트 (Agent Checklist)
- [ ] 작업을 시작하기 전 현재 구현할 단 하나의 기능에 집중하고 있는가?
- [ ] 프레임워크나 복잡한 빌드 툴 없이 순수 HTML/CSS/JS로 구현되었는가?
- [ ] API 키가 프론트엔드로 노출되지 않고 `api/*.js`에 캡슐화되었는가?
- [ ] 새로 작성된 모든 파일과 함수에 한국어 주석이 충실히 포함되었는가?
- [ ] 기능 추가 후 사용자가 바로 테스트할 수 있는 검증 방법을 안내했는가?
