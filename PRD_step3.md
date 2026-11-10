# [PRD] 냉장고 재료 인식 & 레시피 추천 웹앱 - 3단계: 사용자 프로필 및 레시피 저장소

---

## 1. 프로젝트 개요 (Overview)
- **프로젝트 명칭**: AI 냉장고 파먹기 (Smart Fridge Recipe Assistant)
- **단계 목표**: 개인화된 사용자 프로필(알레르기, 기피 재료, 선호 식단 성향)을 구축하고, 2단계에서 AI가 추천한 레시피 중 마음에 드는 항목을 저장(북마크)·관리·복기할 수 있는 레시피 보관함 시스템을 구현한다.
- **핵심 가치**: "반복적인 취향 입력 없이 내 몸에 맞춘 레시피 추천과, 성공했던 요리 경험을 축적하는 개인 요리 아카이브."

---

## 2. 핵심 기능 요구사항 (Functional Requirements)

### 2.1 사용자 프로필 관리 (User Profile Management)
1. **기본 정보 설정**:
   - 닉네임, 프로필 캐릭터/아바타 선택.
   - 요리 숙련도 레벨 (요린이 / 보통 / 홈셰프).
2. **식습관 및 건강 제약조건 (Health & Dietary Restrictions)**:
   - **알레르기 필터**: 갑각류, 견과류, 유제품, 메밀, 복숭아, 난류 등 표준 식품 알레르기 다중 선택.
   - **기피 재료 태그 등록**: 오이, 고수, 당근 등 사용자가 꺼리는 재료를 자유롭게 태그로 추가/삭제.
   - **식단 성향**: 일반, 비건/채식, 저탄고지(키토), 저염식/다이어트.
3. **1·2단계 연동 (Context Injection)**:
   - 프로필에 저장된 알레르기 및 기피 재료 정보는 **2단계 레시피 생성 프롬프트의 System Instruction으로 자동 주입**되어 해당 재료가 배제된 레시피만 생성되도록 강제.

### 2.2 레시피 저장 및 북마크 (Recipe Scrap & Bookmark)
1. **원클릭 저장/취소**:
   - 2단계 레시피 상세/카드에서 북마크 아이콘 클릭 시 즉시 내 보관함에 저장.
   - 토글 방식으로 손쉽게 저장 해제 가능.
2. **저장 데이터 보존**:
   - 원본 재료, 분량, 조리 순서, 셰프 팁을 그대로 영구 저장.

### 2.3 나의 레시피 보관함 (My Recipe Box)
1. **조회 및 필터링/검색**:
   - 저장된 레시피 목록을 썸네일 카드 그리드로 제공.
   - **검색**: 레시피명 또는 포함된 재료 키워드 검색.
   - **정렬**: 최신 저장순, 조리시간 짧은순, 평점 높은순.
   - **카테고리 탭**: 전체, 자주 한 요리, 시도해볼 요리.
2. **개인 조리 노트 및 평가 (Cook Notes & Rating)**:
   - 별점(1~5점) 매기기.
   - 나만의 조리 메모 (예: "우리 집 간장 기준으로는 반 큰술만 넣는 게 딱 좋음!").
   - 요리 완료 날짜 기록 (히스토리 로그).
3. **공유 및 내보내기**:
   - Web Share API를 활용한 카카오톡/링크 복사 공유.
   - 텍스트 요약본 복사 클립보드 기능.

---

## 3. 데이터 아키텍처 및 저장소 전략 (Storage Strategy)

### 3.1 듀얼 티어(Dual-Tier) 스토리지 아키텍처
1. **Tier 1 (MVP - Local First)**:
   - 로그인 절차 없이 즉시 사용할 수 있도록 브라우저 **IndexedDB / LocalStorage** 기반 영구 저장.
   - 진입 장벽을 완전히 제거하여 사용자 유입 극대화.
2. **Tier 2 (확장 - Cloud Sync)**:
   - 소셜 로그인(Google, Kakao, Apple) 도입 시 Supabase/Firebase Auth & PostgreSQL 기반 클라우드 동기화 지원.
   - 로컬 데이터 -> 클라우드 마이그레이션 모달 제공 ("로그인하고 여러 기기에서 레시피를 동기화하세요").

### 3.2 데이터 스키마 정의 (Data Schema)

#### [UserProfile Schema]
```typescript
interface UserProfile {
  userId: string;
  nickname: string;
  avatarId: string;
  cookingLevel: 'beginner' | 'intermediate' | 'advanced';
  allergies: string[];         // 예: ["갑각류", "땅콩"]
  dislikedIngredients: string[]; // 예: ["고수", "오이"]
  dietaryPreference: 'none' | 'vegan' | 'vegetarian' | 'keto' | 'low-sodium';
  createdAt: string;
  updatedAt: string;
}
```

#### [SavedRecipe Schema]
```typescript
interface SavedRecipe {
  id: string;                  // 고유 ID (UUID)
  title: string;
  summary: string;
  cookingTimeMinutes: number;
  difficulty: string;
  servings: string;
  ingredientsMatch: {
    fromFridge: string[];
    pantryNeeded: string[];
    substitutes?: string;
  };
  steps: {
    stepNumber: number;
    action: string;
    tip?: string;
  }[];
  chefTip?: string;
  
  // 사용자 개인화 메타데이터
  userRating?: number;         // 1 ~ 5
  userNotes?: string;          // 사용자 메모
  cookedCount: number;         // 실제 해먹은 횟수
  lastCookedAt?: string;       // 마지막 조리 일시
  savedAt: string;             // 저장 일시
  tags: string[];              // 사용자 지정 태그 (예: ["도시락", "간단안주"])
}
```

---

## 4. UI/UX 요구사항 (Responsive UI/UX)
1. **전체 네비게이션 구조 (Bottom Navigation Bar)**:
   - 탭 1: `[냉장고 스캔]` (1단계: 촬영 및 재료 인식)
   - 탭 2: `[레시피 탐색]` (2단계: 생성 및 결과 보기)
   - 탭 3: `[보관함]` (3단계: 저장한 레시피 및 조리 노트)
   - 탭 4: `[내 프로필]` (프로필 설정, 알레르기 필터 관리)
2. **인터랙션 피드백**:
   - 북마크 클릭 시 튀어오르는 하트/별 마이크로 인터랙션 애니메이션.
   - 저장 완료 시 하단에 "보관함에 저장되었습니다. [보관함 보러가기]" 스낵바 토스트 노출.

---

## 5. 보안 및 성능 고려사항
1. **개인정보 취급 최소화**:
   - 알레르기 및 식습관 정보는 민감 건강 정보가 될 수 있으므로 MVP 단계에서는 로컬 기기 내에서만 암호화/저장 처리.
2. **스토리지 쿼터 관리**:
   - 레시피 텍스트 및 메타데이터는 데이터 용량이 작으므로 수백 개 저장 시에도 5MB 미만으로 안전하게 운용 가능.

---

## 6. 완료 기준 (Definition of Done for Step 3)
- [ ] 닉네임, 알레르기 재료, 기피 재료를 입력하고 수정할 수 있는 프로필 설정 화면이 정상 작동한다.
- [ ] 프로필에 등록된 기피 재료가 2단계 레시피 생성 프롬프트에 자동으로 반영되어 배제된다.
- [ ] 2단계 레시피 화면에서 북마크 버튼 클릭 시 레시피 데이터가 보관함에 영구 저장된다.
- [ ] 보관함 화면에서 저장된 레시피 목록을 검색, 필터링, 상세 조회할 수 있다.
- [ ] 저장된 레시피에 별점과 메모를 남기고 수정/저장할 수 있다.
- [ ] 브라우저를 새로고침하거나 재방문해도 저장된 프로필과 레시피가 유지된다.
