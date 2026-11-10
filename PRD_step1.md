# [PRD] 냉장고 재료 인식 & 레시피 추천 웹앱 - 1단계: 이미지 입력 및 식재료 자동 인식

---

## 1. 프로젝트 개요 (Overview)
- **프로젝트 명칭**: AI 냉장고 파먹기 (Smart Fridge Recipe Assistant)
- **단계 목표**: 사용자가 냉장고 내부 사진을 업로드하거나 촬영하면, OpenRouter의 `google/gemma-4-26b-a4b-it:free` 멀티모달 모델을 호출하여 사진 속 식재료를 자동으로 감지하고, 사용자가 검토 및 수정할 수 있는 정제된 재료 목록을 도출한다.
- **대상 사용자**: 냉장고 속 재료로 무엇을 만들지 고민하는 1인 가구, 자취생, 주부 및 요리 초보자.

---

## 2. 핵심 기능 요구사항 (Functional Requirements)

### 2.1 반응형 이미지 입력 (Image Input)
1. **입력 방식 지원**:
   - **모바일 환경**: 카메라 앱 직접 연동(HTML5 `capture="environment"`)을 통한 즉시 촬영.
   - **데스크톱/태블릿 환경**: 파일 탐색기 선택 및 드래그 앤 드롭(Drag & Drop) 지원.
2. **지원 파일 형식**: JPG, JPEG, PNG, WEBP.
3. **클라이언트 사이드 전처리**:
   - 대용량 이미지 업로드 시 API 레이턴시 및 토큰 비용을 최소화하기 위해 클라이언트(Canvas API 또는 라이브러리)에서 최대 가로/세로 1280px 이하, 용량 2MB 이하로 자동 압축(Quality 0.8).
   - 압축된 이미지를 Base64(Data URL) 형식으로 변환하여 API 요청 페이로드로 사용.

### 2.2 OpenRouter Vision API 연동 (AI Material Recognition)
1. **모델 설정**:
   - 엔드포인트: `https://openrouter.ai/api/v1/chat/completions`
   - 모델명: `google/gemma-4-26b-a4b-it:free`
   - 인증: HTTP Header `Authorization: Bearer $OPENROUTER_API_KEY`
2. **프롬프트 엔지니어링**:
   - 냉장고 내부의 어둡거나 겹쳐진 물체를 감안하여 식재료(채소, 육류, 소스류, 가공식품, 음료 등)를 식별하도록 지시.
   - 파싱 안정성을 위해 결과를 반드시 **JSON 규격**으로 출력하도록 유도.
3. **구조화된 데이터 추출 (Output Schema)**:
   ```json
   {
     "ingredients": [
       {
         "name": "대파",
         "category": "채소",
         "quantity_hint": "반 단 정도",
         "confidence": "high"
       },
       {
         "name": "계란",
         "category": "난류/유제품",
         "quantity_hint": "4알",
         "confidence": "medium"
       }
     ]
   }
   ```

### 2.3 재료 검토 및 편집 UI (Material Review & Edit)
1. **인식 결과 태그 뷰**:
   - AI가 인식한 재료를 뱃지/칩(Chip) 형태로 시각화.
   - 카테고리별 컬러 코딩 (채소: 초록, 육류: 빨강, 가공식품: 주황 등).
2. **사용자 편집 기능**:
   - **삭제**: 잘못 인식된 재료는 'X' 버튼으로 삭제 가능.
   - **추가**: AI가 놓친 재료는 검색 또는 텍스트 입력으로 수동 추가.
   - **수량/상태 메모**: 사용자가 필요 시 '신선함', '소비기한 임박' 등의 메모 태그 추가 가능.
3. **2단계 전환 액션**:
   - '이 재료로 레시피 추천받기' 플로팅/고정 버튼을 제공하여 최종 확정된 재료 배열을 2단계로 전달.

---

## 3. UI/UX 요구사항 (Responsive UI/UX)
1. **모바일 퍼스트(Mobile-First) 디자인**:
   - 주 사용 환경이 주방/모바일이므로 한 손 조작이 용이한 하단 액션 버튼 배치.
2. **로딩 및 피드백 UX**:
   - 무료 모델(`free`)의 경우 응답 지연(Cold Start, 대기열)이 발생할 수 있으므로 스켈레톤 UI 및 재치 있는 로딩 문구 제공 ("냉장고 안을 꼼꼼히 들여다보는 중이에요...", "신선한 재료를 찾는 중!").
3. **미리보기 캔버스**:
   - 업로드한 원본 사진 미리보기를 상단에 축소 카드로 유지하여 사용자가 대조해 볼 수 있도록 구성.

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
        "content": "You are a professional culinary assistant. Analyze the refrigerator image and extract a list of identifiable food ingredients in valid JSON format. Always write ingredient names in Korean."
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "사진에서 보이는 모든 식재료를 찾아내어 지정된 JSON 형식으로만 응답해줘."
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,..."
            }
          }
        ]
      }
    ],
    "response_format": { "type": "json_object" }
  }
  ```

### 4.2 에러 핸들링 및 예외 처리
1. **API Rate Limit (429 Too Many Requests)**:
   - 무료 모델 트래픽 초과 시 지수 백오프(Exponential Backoff) 기반 자동 재시도 1회 수행 후, 실패 시 사용자 친화적인 알림("현재 요청이 몰리고 있습니다. 잠시 후 다시 시도해주세요.") 표시.
2. **인식 실패 / 빈 결과**:
   - 식재료가 식별되지 않았을 경우 안내 모달과 함께 수동 재료 입력 모드로 자연스럽게 유도.
3. **지원되지 않는 이미지 포맷 또는 손상된 파일**:
   - 업로드 직후 클라이언트 단에서 MIME 타입 검증 및 에러 토스트 표시.

---

## 5. 완료 기준 (Definition of Done for Step 1)
- [ ] 모바일/데스크톱 브라우저에서 냉장고 사진을 촬영 또는 업로드할 수 있다.
- [ ] 이미지가 2MB 이하로 클라이언트에서 압축된 후 OpenRouter API로 전송된다.
- [ ] `google/gemma-4-26b-a4b-it:free` 모델을 통해 인식된 재료 목록이 JSON으로 파싱된다.
- [ ] 화면에 인식된 재료 칩이 정상적으로 렌더링되며, 추가/삭제가 가능하다.
- [ ] 정제된 최종 재료 목록이 2단계(레시피 추천)의 입력 상태값으로 전달 준비가 완료된다.
