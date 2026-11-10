/**
 * @file api/recipe.js
 * @description 2단계: 냉장고 식재료 및 사용자 조건 기반 맞춤형 레시피 생성 Vercel 서버리스 함수
 * 기본 모델: google/gemma-4-26b-a4b-it:free
 * 429 Rate Limit 발생 시 자동 지연 재시도 및 openrouter/free 무료 모델 자동 폴백을 수행합니다.
 */

// 지연 대기 유틸리티
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메서드입니다. POST 요청만 지원합니다.'
    });
  }

  try {
    const {
      ingredients = [],
      theme = '전체',
      cookingTime = '상관없음',
      difficulty = '상관없음',
      hasPantrySeasoning = true,
      userProfile = null
    } = req.body || {};

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({
        error: '레시피를 생성할 식재료 목록이 비어 있습니다.'
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const defaultModel = process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return res.status(500).json({
        error: '.env.local 파일에 유효한 OPENROUTER_API_KEY가 설정되지 않았습니다.'
      });
    }

    const ingredientNames = ingredients.map(item => (typeof item === 'string' ? item : item.name));

    // 기피 재료/알레르기 필터링 주입
    let restrictionText = '';
    if (userProfile) {
      const allergies = userProfile.allergies ? userProfile.allergies.join(', ') : '';
      const dislikes = userProfile.dislikedIngredients ? userProfile.dislikedIngredients.join(', ') : '';
      if (allergies || dislikes) {
        restrictionText = `\n[주의: 사용자 알레르기/기피 재료 절대 배제]\n- 알레르기: ${allergies || '없음'}\n- 기피 재료: ${dislikes || '없음'}\n위 재료는 절대 사용하지 마세요.`;
      }
    }

    const systemPrompt = `당신은 대한민국 최고의 가정 요리 마스터 셰프 AI입니다.
사용자가 가진 냉장고 속 식재료를 최대한 활용(냉장고 파먹기)하여 현실적이고 맛있는 집밥 레시피 2~3종을 추천해 주세요.

[규칙]:
1. 냉장고에 있는 재료를 주재료로 사용하세요.
2. 추가로 필요한 양념이나 부재료는 일반 가정에 흔히 있는 기본 조미료로 최소화하세요.
3. 재료가 없더라도 대체할 수 있는 대체 팁(substitutes)을 반드시 제공하세요.
4. 모든 설명과 조리법은 한국어로 작성하세요.
5. 반드시 마크다운 없이 유효한 JSON 형식으로만 응답해야 합니다.

[JSON 응답 규격]:
{
  "recipes": [
    {
      "id": "recipe_1",
      "title": "요리 이름 (예: 대파 계란 볶음밥)",
      "summary": "1줄 매력적인 요리 소개",
      "cooking_time_minutes": 15,
      "difficulty": "쉬움 | 보통 | 어려움",
      "servings": "1~2인분",
      "category": "밥/죽 | 국/찌개 | 볶음/조림 | 면/파스타 | 간식/안주 | 기타",
      "ingredients_match": {
        "from_fridge": ["사용된 냉장고 재료"],
        "pantry_needed": ["필요한 기본 양념/추가 재료"],
        "substitutes": "대체 가능한 재료 안내"
      },
      "steps": [
        {
          "step_number": 1,
          "action": "상세한 조리 순서 설명",
          "tip": "조리 시 팁 (선택 사항)"
        }
      ],
      "chef_tip": "더 맛있게 즐기는 팁"
    }
  ]
}`;

    const userPrompt = `[보유 식재료]: ${ingredientNames.join(', ')}
[희망 요리 테마]: ${theme}
[희망 조리 시간]: ${cookingTime}
[희망 난이도]: ${difficulty}
[기본 양념 보유 여부]: ${hasPantrySeasoning ? '보유 중' : '기본 양념 없음'}${restrictionText}

위 조건에 꼭 맞는 맞춤형 레시피 2~3가지를 JSON 형식으로 작성해줘.`;

    const candidateModels = [defaultModel];
    if (defaultModel !== 'openrouter/free') {
      candidateModels.push('openrouter/free');
    }

    let lastError = null;
    let selectedModelUsed = null;
    let rawContent = null;

    for (const targetModel of candidateModels) {
      selectedModelUsed = targetModel;
      let attempt = 0;
      const maxAttempts = 2;

      while (attempt < maxAttempts) {
        attempt++;
        try {
          const payload = {
            model: targetModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
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

          if (response.status === 429) {
            const errText = await response.text();
            console.warn(`[Recipe] ${targetModel} 모델 429 초과. 잠시 대기합니다.`);
            lastError = `429 한도 초과: ${errText}`;
            if (attempt < maxAttempts) {
              await sleep(2000);
              continue;
            } else {
              break;
            }
          }

          if (!response.ok) {
            const errText = await response.text();
            lastError = `OpenRouter 실패 (${response.status}): ${errText}`;
            break;
          }

          const data = await response.json();
          rawContent = data.choices?.[0]?.message?.content;
          if (rawContent) break;

        } catch (fetchErr) {
          lastError = fetchErr.message;
        }
      }

      if (rawContent) break;
    }

    if (!rawContent) {
      return res.status(429).json({
        error: `현재 무료 모델 사용량이 많아 일시적으로 지연되었습니다. 잠시 후 다시 시도해 주세요.\n(상세 원인: ${lastError})`
      });
    }

    let cleanedContent = rawContent.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('레시피 JSON 파싱 실패:', rawContent);
      return res.status(500).json({
        error: '생성된 레시피를 JSON 규격으로 파싱하지 못했습니다.',
        raw: rawContent
      });
    }

    return res.status(200).json({
      success: true,
      modelUsed: selectedModelUsed,
      recipes: parsedResult.recipes || []
    });

  } catch (error) {
    console.error('recipe.js 내부 오류:', error);
    return res.status(500).json({
      error: `서버 내부 에러: ${error.message}`
    });
  }
};
