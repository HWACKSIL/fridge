# 🍳 AI 냉장고 파먹기 (Smart Fridge Recipe Assistant)

> **냉장고 속 재료 사진을 찍으면 AI가 식재료를 자동 인식하고, 나만의 맞춤형 집밥 레시피를 추천해 주는 반응형 웹 애플리케이션**

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter_Gemma_Vision-blue)](https://openrouter.ai)
[![Vanilla JS](https://img.shields.io/badge/Stack-Pure_HTML%2FCSS%2FJS-orange)](#)

---

## 📌 프로젝트 개요 및 특징

본 프로젝트는 자취생, 1인 가구, 요리 초보자가 냉장고 속 남은 재료를 낭비 없이 알뜰하게 소비할 수 있도록 돕는 스마트 레시피 어시스턴트입니다.

- **프레임워크 없는 순수 웹 기술**: React/Next.js/Vite 등 복잡한 번들러 없이 **순수 HTML5, CSS3, Vanilla JavaScript**와 **Vercel 서버리스 함수(`api/*.js`)**만으로 가볍고 빠르게 동작합니다.
- **철저한 API 보안**: 클라이언트에 API 키를 절대 노출하지 않고, 백엔드 서버리스 함수에서 `process.env.OPENROUTER_API_KEY`로 안전하게 캡슐화 호출합니다.
- **안정적인 무료 AI 파이프라인**: OpenRouter의 멀티모달 비전 모델(`google/gemma-4-26b-a4b-it:free`)을 기반으로 동작하며, 429 Rate Limit 발생 시 자동 지연 재시도 및 `openrouter/free` 무료 모델 자동 폴백을 지원합니다.

---

## 🏗️ 3단계 점진적 아키텍처

```
fridge/
├── PRD_step1.md          # 1단계 요구사항 명세서
├── PRD_step2.md          # 2단계 요구사항 명세서
├── PRD_step3.md          # 3단계 요구사항 명세서
├── AGENTS.md             # AI 에이전트 개발 지침 및 아키텍처 규칙
├── README.md             # 프로젝트 소개 및 실행 가이드
├── index.html            # 모바일 퍼스트 단일 페이지 반응형 웹앱
├── style.css             # 주방 테마 반응형 스타일시트
├── script.js             # 클라이언트 상태 관리 및 DOM/스토리지 로직
├── dev-server.js         # 순수 Node.js 기반 초경량 로컬 개발 서버
├── package.json          # 패키지 메타데이터 및 스크립트
├── vercel.json           # Vercel 서버리스 라우팅 설정
└── api/
    ├── recognize.js      # [1단계] 이미지 기반 식재료 자동 인식 서버리스 함수
    └── recipe.js         # [2단계] 사용자 조건/프로필 기반 맞춤 레시피 생성 서버리스 함수
```

---

## 🚀 주요 기능 소개

### 1단계: 냉장고 사진 촬영 & 식재료 자동 인식 (`PRD_step1.md`)
- **반응형 이미지 업로드**: 모바일 카메라 즉시 촬영 및 데스크톱 드래그 앤 드롭 지원
- **클라이언트 리사이징**: Canvas API를 활용해 최대 1280px / Quality 0.8 JPEG로 압축하여 OpenRouter 토큰 및 네트워크 지연 최소화
- **식재료 태그(Chip) 시각화**: AI가 찾은 재료를 태그로 표시하며, 오인식 재료 삭제(`✕`) 및 누락된 재료 수동 추가 지원

### 2단계: 맞춤형 레시피 생성 및 추천 (`PRD_step2.md`)
- **취향 필터**: 요리 테마(밥/국, 안주/야식, 다이어트, 면 요리), 조리 시간(15분/30분/상관없음), 난이도, 기본 양념 보유 토글
- **2~3종 실용 레시피 추천**: 냉장고 재료를 우선 활용하는 현실적인 집밥 요리 제안
- **상세 조리 가이드**: 필요 부재료 및 대체 재료 팁(Substitutes), 단계별 조리 순서(Step-by-Step), 셰프의 한 끗 팁 제공

### 3단계: 사용자 프로필 & 나만의 레시피 보관함 (`PRD_step3.md`)
- **사용자 프로필**: 닉네임, 요리 숙련도, 알레르기 6종(갑각류, 견과류, 유제품 등), 기피 식재료(오이, 고수 등) 설정
- **컨텍스트 자동 주입**: 프로필에 등록된 알레르기/기피 재료를 **2단계 레시피 프롬프트에서 원천 배제**
- **레시피 보관함 (My Recipe Box)**: 브라우저 LocalStorage 기반 영구 저장, 실시간 키워드 검색, 다중 정렬(최신순/별점순/시간순)
- **별점 & 조리 메모 & 공유**: 1~5점 별점 부여, 나만의 조리 팁 메모 작성, Web Share API 및 클립보드 공유

---

## 💻 로컬 실행 방법

### 1. 환경 변수 설정
프로젝트 루트의 `.env.local` 파일에 발급받은 OpenRouter API 키를 설정합니다:

```env
OPENROUTER_API_KEY=sk-or-v1-여기에_실제_키_입력
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

### 2. 로컬 개발 서버 실행
별도의 패키지 설치 없이 Node.js(v18 이상 권장) 환경에서 즉시 실행됩니다:

```bash
node dev-server.js
# 또는
npm start
```

서버가 구동되면 브라우저에서 **`http://localhost:3000`**으로 접속합니다.

---

## 🌐 Vercel 클라우드 배포 가이드

1. 본 프로젝트를 **GitHub 저장소에 Push**합니다. (`.gitignore`에 의해 `.env.local`은 보호됩니다.)
2. **[Vercel](https://vercel.com/)**에 로그인 후 **`[Add New...] -> [Project]`**에서 GitHub 저장소를 선택(Import)합니다.
3. 배포 설정 화면의 **`Environment Variables`**에 환경 변수를 등록합니다:
   - `OPENROUTER_API_KEY`: 본인의 OpenRouter API 키
   - `OPENROUTER_MODEL`: `google/gemma-4-26b-a4b-it:free`
4. **`[Deploy]`**를 클릭하면 수초 내에 `https://프로젝트명.vercel.app` 형태의 라이브 주소가 생성됩니다.

---

## 📄 라이선스
MIT License
