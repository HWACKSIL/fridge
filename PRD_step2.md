# [PRD] 냉장고 재료 인식 & 레시피 추천 웹앱 - 2단계: 맞춤형 레시피 생성 및 추천

---

## 1. 프로젝트 개요 (Overview)
- **프로젝트 명칭**: AI 냉장고 파먹기 (Smart Fridge Recipe Assistant)
- **단계 목표**: 1단계에서 정제된 식재료 목록을 바탕으로, OpenRouter의 `google/gemma-4-26b-a4b-it:free` 모델을 활용하여 사용자가 바로 조리할 수 있는 실용적이고 창의적인 맞춤형 레시피(2~3종)를 생성하고 상세 가이드를 제공한다.
- **핵심 가치**: "냉장고에 있는 재료를 최대한 소진(냉장고 파먹기)하면서도, 부족한 양념/재료는 최소화한 현실적인 레시피 제공."

---

## 2. 핵심 기능 요구사항 (Functional Requirements)

### 2.1 레시피 생성 조건 필터 (Recipe Preferences)
사용자가 레시피를 생성하기 전 간단히 선택할 수 있는 퀵 필터 제공:
1. **요리 분류(테마)**: 전체(기본), 든든한 밥/국, 초간단 안주/야식, 다이어트/건강식, 면/파스타.
2. **조리 시간 제한**: 상관없음, 15분 이내, 30분 이내.
3. **난이도 수준**: 초보자(칼질 최소화, 원팬 요리), 보통, 전문가.
4. **기본 조미료 보유 여부 토글**:
   - "기본 양념 보유 (소금, 설탕, 간장, 고춧가루, 식용유, 마늘, 참기름 등)" 기본 ON 설정.

### 2.2 OpenRouter LLM 기반 레시피 생성 (Prompt Strategy)
1. **모델 설정**:
   - 엔드포인트: `https://openrouter.ai/api/v1/chat/completions`
   - 모델명: `google/gemma-4-26b-a4b-it:free`
2. **프롬프트 설계 규칙**:
   - 냉장고에 있는 재료를 메인으로 삼고, 없는 재료는 대체 가능한 재료를 제안하도록 유도.
   - 2~3개의 서로 다른 성격의 레시피(예: 국물 요리 1개, 볶음/덮밥 요리 1개) 생성.
   - 정확한 계량(스푼, g 단위)과 직관적인 순서형 조리 단계 제공.
   - 일관된 파싱을 위해 **JSON 스키마 규격**으로 생성.
3. **구조화된 출력 스키마 (JSON Output Specification)**:
   ```json
   {
     "recipes": [
       {
         "id": "recipe_01",
         "title": "대파 계란 볶음밥",
         "summary": "대파 기름의 풍미를 살린 10분 완성 초간단 볶음밥",
         "cooking_time_minutes": 15,
         "difficulty": "쉬움",
         "servings": "1인분",
         "ingredients_match": {
           "from_fridge": ["대파", "계란"],
           "pantry_needed": ["밥 1공기", "진간장 1큰술", "식용유 2큰술", "굴소스 0.5큰술(선택)"],
           "substitutes": "굴소스가 없으면 진간장을 0.5큰술 더 넣으세요."
         },
         "steps": [
           {
             "step_number": 1,
             "action": "대파는 송송 썰고, 계란 2개는 그릇에 풀어둡니다."
           },
           {
             "step_number": 2,
             "action": "달군 팬에 식용유를 두르고 대파를 볶아 파기름을 냅니다.",
             "tip": "약불에서 파가 노릇해질 때까지 천천히 볶아야 향이 극대화됩니다."
           }
         ],
         "chef_tip": "찬밥을 사용하면 밥알이 뭉치지 않고 고슬고슬하게 볶아집니다."
       }
     ]
   }
   ```

### 2.3 레시피 브라우징 및 뷰어 (Recipe Presentation & Cooking Mode)
1. **레시피 카드 캐러셀/그리드**:
   - 2~3가지 레시피를 요약 카드 형태로 나열 (썸네일 아이콘, 예상 시간, 난이도 뱃지, 냉장고 재료 매칭률 표시).
2. **레시피 상세 화면 (Detail View)**:
   - **재료 체크리스트**: 사용자가 주방에서 준비하며 체크박스를 누를 수 있는 인터랙션.
   - **단계별 가이드(Step-by-Step)**: 큰 폰트와 명확한 번호 매김, 조리 팁 하이라이트.
3. **요리 진행 모드 (Cook Mode)**:
   - 스마트폰 화면이 꺼지지 않도록 Screen Wake Lock API 적용(지원 브라우저 기준).
   - 각 스텝 완료 시 탭하여 완료 체크 가능.
4. **3단계 연계 버튼**:
   - 상단/하단에 "⭐ 레시피 저장하기 (북마크)" 버튼 배치 -> 3단계 사용자 프로필 및 보관함으로 전달.

---

## 3. UI/UX 요구사항 (Responsive UI/UX)
1. **가독성 최적화**:
   - 요리 중 멀리서도 볼 수 있도록 단계별 텍스트 줄간격(Line-height)과 폰트 크기(최소 16px 이상) 확보.
2. **스트리밍/로딩 UX**:
   - 다중 레시피 생성 시 체감 대기시간을 줄이기 위해 조리 도구 애니메이션 및 "셰프 Gemma가 레시피를 작성 중입니다..." 진행 메시지 노출.
3. **반응형 레이아웃**:
   - 모바일: 탭 또는 하단 슬라이드 업 바텀시트(Bottom Sheet) 형태.
   - 데스크톱/태블릿: 좌측 재료/필터 요약 패널 + 우측 레시피 리스트/상세 뷰의 2-Column Split 레이아웃.

---

## 4. 기술 사양 및 인터페이스 (Technical Specifications)

### 4.1 클라이언트-서버 통신 규격
- **OpenRouter Request Payload 예시**:
  ```json
  {
    "model": "google/gemma-4-26b-a4b-it:free",
    "messages": [
      {
        "role": "system",
        "content": "You are a master Korean cuisine chef. Using the user-provided fridge ingredients and preferences, create 2-3 realistic and delicious home-cooked recipes. Output strictly in the specified JSON format."
      },
      {
        "role": "user",
        "content": "보유 재료: [대파, 계란, 양파, 김치]\n요청 테마: 15분 이내 초간단 요리\n기본 조미료: 보유 중\n위 조건으로 만들 수 있는 레시피를 JSON으로 추천해줘."
      }
    ],
    "temperature": 0.7,
    "response_format": { "type": "json_object" }
  }
  ```

### 4.2 예외 상황 대응
1. **극소 재료 또는 비호환 재료 (Edge Case)**:
   - 재료가 "생수, 잼" 등 극히 적거나 요리 조합이 불가능할 경우, 모델이 억지 레시피를 만들지 않고 "간단 간식/대체 활용 팁"을 반환하도록 프롬프트에 방어 룰 명시.
2. **응답 JSON 파싱 실패 시 복구**:
   - LLM이 마크다운 코드블록(` ```json `)을 포함해 반환하는 경우를 대비해 정규식 추출 파서 구현.

---

## 5. 완료 기준 (Definition of Done for Step 2)
- [ ] 1단계에서 선택된 재료 목록이 2단계 화면으로 온전하게 전달된다.
- [ ] 조리 시간, 난이도 등 사용자 필터 옵션을 선택할 수 있다.
- [ ] `google/gemma-4-26b-a4b-it:free` 모델을 통해 2~3개의 구조화된 레시피 데이터가 생성된다.
- [ ] 레시피 카드 목록 및 상세 보기 화면이 모바일과 데스크톱 환경에서 가독성 높게 렌더링된다.
- [ ] 레시피 상세 화면에서 '저장하기(북마크)'를 클릭하면 3단계 저장 파이프라인으로 레시피 객체가 전달된다.
