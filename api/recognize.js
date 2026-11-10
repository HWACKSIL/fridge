/**
 * @file api/recognize.js
 * @description 1단계: 냉장고 이미지 기반 식재료 자동 인식 Vercel 서버리스 함수
 * 기본 모델: google/gemma-4-26b-a4b-it:free
 * 429 Rate Limit 발생 시 자동 지연 재시도 및 openrouter/free 무료 모델 자동 폴백을 수행합니다.
 */

// 지연 대기 유틸리티 함수
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메서드입니다. POST 요청만 지원합니다.'
    });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: '이미지 데이터(Base64)가 전달되지 않았습니다.'
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const defaultModel = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        error: '.env.local 파일에 유효한 OPENROUTER_API_KEY가 설정되지 않았습니다.'
      });
    }

    // 시스템 및 유저 프롬프트
    const systemPrompt = `당신은 냉장고 속 식재료를 정확하게 찾아내는 전문 요리사 AI입니다.
업로드된 냉장고 사진을 정밀하게 분석하여 식별 가능한 모든 식재료 목록을 아래 JSON 규격에 맞춰 한국어로 추출해 주세요.
반드시 추가 마크다운 없이 오직 유효한 JSON 형식만 응답해야 합니다.

{
  "ingredients": [
    {
      "name": "재료명 (예: 대파, 계란, 양파)",
      "category": "채소 | 육류 | 수산물 | 유제품 | 가공식품 | 양념/소스 | 기타",
      "quantity_hint": "대략적인 수량이나 상태 (예: 2개, 반 팩, 신선함)",
      "confidence": "high | medium | low"
    }
  ]
}`;

    const userPrompt = "사진에서 보이는 모든 식재료를 식별하여 지정된 JSON 형식으로 알려줘.";

    // 시도할 모델 우선순위 목록 (기본 모델 -> openrouter/free 메타 라우터)
    const candidateModels = [defaultModel];
    if (defaultModel !== 'openrouter/free') {
      candidateModels.push('openrouter/free');
    }

    let lastError = null;
    let selectedModelUsed = null;
    let rawContent = null;

    // 모델 후보 순회 및 429 처리
    for (const targetModel of candidateModels) {
      selectedModelUsed = targetModel;
      let attempt = 0;
      const maxAttempts = 2; // 최대 2회 시도

      while (attempt < maxAttempts) {
        attempt++;
        try {
          const payload = {
            model: targetModel,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  { type: "image_url", image_url: { url: image } }
                ]
              }
            ],
            response_format: { type: "json_object" }
          };

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/fridge-recipe-assistant',
              'X-Title': 'Fridge Recipe Assistant'
            },
            body: JSON.stringify(payload)
          });

          // 429 (Rate Limit) 발생 시 대기 후 재시도
          if (response.status === 429) {
            const errText = await response.text();
            console.warn(`[Recognize] ${targetModel} 모델 429 초과 (시도 ${attempt}/${maxAttempts}). 잠시 대기합니다.`);
            lastError = `무료 모델 호출 한도 초과 (429): ${errText}`;
            if (attempt < maxAttempts) {
              await sleep(2000); // 2초 대기
              continue;
            } else {
              break; // 다음 후보 모델로 전환
            }
          }

          if (!response.ok) {
            const errText = await response.text();
            lastError = `OpenRouter API 실패 (${response.status}): ${errText}`;
            break;
          }

          const data = await response.json();
          rawContent = data.choices?.[0]?.message?.content;
          if (rawContent) {
            // 성공적으로 응답을 받았으므로 루프 탈출
            break;
          }
        } catch (fetchErr) {
          lastError = fetchErr.message;
        }
      }

      if (rawContent) {
        break; // 성공 시 전체 모델 순회 종료
      }
    }

    if (!rawContent) {
      return res.status(429).json({
        error: `현재 무료 모델 요청이 많아 일시적으로 제한되었습니다.\n약 10~20초 후 다시 시도해 주세요.\n(상세 원인: ${lastError})`
      });
    }

    // 마크다운 코드블록 제거 및 안전 파싱
    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON 파싱 실패, 원본 내용:', rawContent);
      return res.status(500).json({
        error: 'AI 응답을 JSON 형식으로 해석할 수 없습니다.',
        raw: rawContent
      });
    }

    return res.status(200).json({
      success: true,
      modelUsed: selectedModelUsed,
      ingredients: parsedResult.ingredients || []
    });

  } catch (error) {
    console.error('recognize.js 내부 오류:', error);
    return res.status(500).json({
      error: `서버 오류가 발생했습니다: ${error.message}`
    });
  }
};
