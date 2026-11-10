/**
 * @file script.js
 * @description AI 냉장고 파먹기 웹앱 클라이언트 메인 스크립트
 * 
 * [1단계]: 사진 촬영/업로드, Canvas 리사이징, /api/recognize 호출, 재료 태그 제어
 * [2단계]: 취향 필터, /api/recipe 호출 (2~3종 레시피 생성), 카드 그리드 및 상세 모달
 * [3단계]: 사용자 프로필 관리(알레르기/기피재료 자동 배제), 로컬스토리지 보관함, 검색/정렬, 별점 & 조리 메모, 공유
 */

// ==========================================================================
// 1. 전역 상태 관리
// ==========================================================================
const state = {
  // 1단계 상태
  compressedBase64: null,   // 압축된 Base64 이미지 데이터
  originalFileSize: 0,      // 원본 파일 크기(Bytes)
  compressedFileSize: 0,    // 압축 후 파일 크기(Bytes)
  ingredients: [],          // 확정된 식재료 목록 [{ name, category, quantity_hint }]

  // 2단계 상태
  recipes: [],              // AI 생성 맞춤 레시피 목록
  selectedRecipe: null,     // 현재 모달에 열린 레시피 객체

  // 3단계 상태 (프로필 & 보관함)
  userProfile: {
    nickname: '행복한 미식가',
    cookingLevel: 'intermediate',
    allergies: [],
    dislikedIngredients: [],
    dietaryPreference: 'none'
  },
  savedRecipes: []          // 보관함에 저장된 레시피 배열
};

// ==========================================================================
// 2. 초기 로컬 스토리지 데이터 로드
// ==========================================================================
function initLocalStorageData() {
  // 프로필 로드
  try {
    const localProfile = localStorage.getItem('user_profile');
    if (localProfile) {
      state.userProfile = JSON.parse(localProfile);
    }
  } catch (e) {
    console.warn('프로필 로드 에러:', e);
  }

  // 보관함 레시피 로드
  try {
    const localSaved = localStorage.getItem('saved_recipes');
    if (localSaved) {
      state.savedRecipes = JSON.parse(localSaved);
    }
  } catch (e) {
    console.warn('저장된 레시피 로드 에러:', e);
  }

  updateSavedCountBadge();
}

// ==========================================================================
// 3. DOM 요소 캐싱
// ==========================================================================

// 상단 헤더 및 네비게이션
const navLogo = document.getElementById('nav-logo');
const navProfileBtn = document.getElementById('nav-profile-btn');
const navSavedBtn = document.getElementById('nav-saved-btn');
const navSavedCount = document.getElementById('nav-saved-count');

const step1Badge = document.getElementById('step1-badge');
const step2Badge = document.getElementById('step2-badge');
const step3Badge = document.getElementById('step3-badge');

// 1단계 섹션
const uploadCard = document.getElementById('upload-card');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const cameraInput = document.getElementById('camera-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const btnRemoveImage = document.getElementById('btn-remove-image');
const metaSize = document.getElementById('meta-size');
const metaDimensions = document.getElementById('meta-dimensions');
const btnAnalyze = document.getElementById('btn-analyze');
const loadingBox = document.getElementById('loading-box');

// 1단계 결과 및 편집
const resultCard = document.getElementById('result-card');
const tagsContainer = document.getElementById('tags-container');
const manualIngredientInput = document.getElementById('manual-ingredient-input');
const btnAddIngredient = document.getElementById('btn-add-ingredient');
const btnGoStep2 = document.getElementById('btn-go-step2');

// 2단계 조건 및 결과 섹션
const recipeSettingsCard = document.getElementById('recipe-settings-card');
const btnBackToStep1 = document.getElementById('btn-back-to-step1');
const summaryChips = document.getElementById('summary-chips');
const filterTheme = document.getElementById('filter-theme');
const filterTime = document.getElementById('filter-time');
const filterDifficulty = document.getElementById('filter-difficulty');
const checkPantry = document.getElementById('check-pantry');
const btnGenerateRecipes = document.getElementById('btn-generate-recipes');
const recipeLoadingBox = document.getElementById('recipe-loading-box');

const recipeResultsCard = document.getElementById('recipe-results-card');
const recipeGrid = document.getElementById('recipe-grid');
const btnReGenerate = document.getElementById('btn-re-generate');

// 3단계 보관함 섹션
const savedCard = document.getElementById('saved-card');
const savedRecipeGrid = document.getElementById('saved-recipe-grid');
const savedEmptyState = document.getElementById('saved-empty-state');
const savedSearchInput = document.getElementById('saved-search-input');
const savedSortSelect = document.getElementById('saved-sort-select');
const btnNewRecipeFlow = document.getElementById('btn-new-recipe-flow');
const btnStartCook = document.getElementById('btn-start-cook');

// 레시피 상세 모달
const recipeModal = document.getElementById('recipe-modal');
const modalRecipeTitle = document.getElementById('modal-recipe-title');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalRecipeBody = document.getElementById('modal-recipe-body');
const btnModalBookmark = document.getElementById('btn-modal-bookmark');
const bookmarkBtnText = document.getElementById('bookmark-btn-text');
const btnModalShare = document.getElementById('btn-modal-share');

// 프로필 설정 모달
const profileModal = document.getElementById('profile-modal');
const profileCloseBtn = document.getElementById('profile-close-btn');
const profileNickname = document.getElementById('profile-nickname');
const profileCookingLevel = document.getElementById('profile-cooking-level');
const profileDislikesInput = document.getElementById('profile-dislikes-input');
const profileDietary = document.getElementById('profile-dietary');
const btnSaveProfile = document.getElementById('btn-save-profile');

// ==========================================================================
// 4. 이벤트 리스너 등록
// ==========================================================================

// 네비게이션
navLogo.addEventListener('click', goToStep1);
navProfileBtn.addEventListener('click', openProfileModal);
navSavedBtn.addEventListener('click', goToStep3);
step1Badge.addEventListener('click', goToStep1);
step2Badge.addEventListener('click', () => {
  if (state.ingredients.length > 0) goToStep2();
});
step3Badge.addEventListener('click', goToStep3);

// 1단계 업로드/촬영
fileInput.addEventListener('change', handleFileSelect);
cameraInput.addEventListener('change', handleFileSelect);
btnRemoveImage.addEventListener('click', resetImageUpload);

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    processImageFile(e.dataTransfer.files[0]);
  }
});

btnAnalyze.addEventListener('click', requestRecognizeIngredients);
btnAddIngredient.addEventListener('click', handleManualAddIngredient);
manualIngredientInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleManualAddIngredient();
  }
});

btnGoStep2.addEventListener('click', goToStep2);
btnBackToStep1.addEventListener('click', goToStep1);

// 2단계 레시피 생성
btnGenerateRecipes.addEventListener('click', requestGenerateRecipes);
btnReGenerate.addEventListener('click', () => {
  recipeResultsCard.style.display = 'none';
  recipeSettingsCard.style.display = 'block';
  recipeSettingsCard.scrollIntoView({ behavior: 'smooth' });
});

// 3단계 보관함 툴바
savedSearchInput.addEventListener('input', renderSavedRecipes);
savedSortSelect.addEventListener('change', renderSavedRecipes);
btnNewRecipeFlow.addEventListener('click', goToStep1);
btnStartCook.addEventListener('click', goToStep1);

// 모달 공통 닫기
modalCloseBtn.addEventListener('click', closeModal);
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) closeModal();
});
btnModalBookmark.addEventListener('click', handleModalBookmarkToggle);
btnModalShare.addEventListener('click', handleShareRecipe);

// 프로필 모달
profileCloseBtn.addEventListener('click', closeProfileModal);
profileModal.addEventListener('click', (e) => {
  if (e.target === profileModal) closeProfileModal();
});
btnSaveProfile.addEventListener('click', handleSaveProfile);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeProfileModal();
  }
});

// ==========================================================================
// 5. 화면 전환 헬퍼 (Step 1, Step 2, Step 3)
// ==========================================================================

function resetAllStepsUI() {
  step1Badge.classList.remove('active');
  step2Badge.classList.remove('active');
  step3Badge.classList.remove('active');

  uploadCard.style.display = 'none';
  resultCard.style.display = 'none';
  recipeSettingsCard.style.display = 'none';
  recipeResultsCard.style.display = 'none';
  savedCard.style.display = 'none';
}

function goToStep1() {
  resetAllStepsUI();
  step1Badge.classList.add('active');
  uploadCard.style.display = 'block';
  if (state.ingredients.length > 0) {
    resultCard.style.display = 'block';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep2() {
  if (state.ingredients.length === 0) {
    alert('식재료를 최소 1개 이상 등록해 주세요.');
    return;
  }
  resetAllStepsUI();
  step2Badge.classList.add('active');
  recipeSettingsCard.style.display = 'block';
  if (state.recipes.length > 0) {
    recipeResultsCard.style.display = 'block';
  }

  // 재료 요약 렌더링
  summaryChips.innerHTML = '';
  state.ingredients.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'summary-chip';
    chip.textContent = item.name;
    summaryChips.appendChild(chip);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep3() {
  resetAllStepsUI();
  step3Badge.classList.add('active');
  savedCard.style.display = 'block';
  renderSavedRecipes();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 6. [1단계] 이미지 압축 및 식재료 자동 인식
// ==========================================================================

function handleFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processImageFile(file);
  }
}

function processImageFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
    return;
  }

  state.originalFileSize = file.size;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const maxDimension = 1280;
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      state.compressedBase64 = compressedDataUrl;

      const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
      state.compressedFileSize = Math.round((base64Length * 3) / 4);

      renderPreview(compressedDataUrl, width, height);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderPreview(dataUrl, width, height) {
  previewImage.src = dataUrl;

  const origKB = (state.originalFileSize / 1024).toFixed(1);
  const compKB = (state.compressedFileSize / 1024).toFixed(1);
  metaSize.textContent = `용량: ${compKB} KB (원본: ${origKB} KB)`;
  metaDimensions.textContent = `해상도: ${width} × ${height} px`;

  dropZone.style.display = 'none';
  previewContainer.style.display = 'block';
}

function resetImageUpload() {
  state.compressedBase64 = null;
  state.originalFileSize = 0;
  state.compressedFileSize = 0;
  state.ingredients = [];

  fileInput.value = '';
  cameraInput.value = '';
  previewImage.src = '';

  previewContainer.style.display = 'none';
  resultCard.style.display = 'none';
  dropZone.style.display = 'block';
  tagsContainer.innerHTML = '';
}

async function requestRecognizeIngredients() {
  if (!state.compressedBase64) {
    alert('냉장고 이미지를 먼저 업로드해 주세요.');
    return;
  }

  btnAnalyze.style.display = 'none';
  loadingBox.style.display = 'block';
  resultCard.style.display = 'none';

  try {
    const response = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: state.compressedBase64 })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `서버 에러 (${response.status})`);
    }

    if (!data.ingredients || data.ingredients.length === 0) {
      alert('식재료를 명확하게 찾지 못했습니다. 아래에서 직접 재료를 추가해 보세요!');
      state.ingredients = [];
    } else {
      state.ingredients = data.ingredients;
    }

    renderIngredientTags();
    resultCard.style.display = 'block';

  } catch (error) {
    console.error('식재료 인식 실패:', error);
    alert(`식재료 인식 중 오류가 발생했습니다:\n${error.message}`);
    resultCard.style.display = 'block';
    renderIngredientTags();
  } finally {
    loadingBox.style.display = 'none';
    btnAnalyze.style.display = 'block';
  }
}

function renderIngredientTags() {
  tagsContainer.innerHTML = '';

  if (state.ingredients.length === 0) {
    tagsContainer.innerHTML = '<span style="color: #94a3b8; font-size: 0.9rem;">등록된 식재료가 없습니다. 아래 입력창에서 재료를 추가하세요.</span>';
    return;
  }

  state.ingredients.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag-item';

    const label = document.createElement('span');
    label.textContent = item.name;
    tag.appendChild(label);

    if (item.quantity_hint) {
      const hint = document.createElement('span');
      hint.className = 'tag-desc';
      hint.textContent = item.quantity_hint;
      tag.appendChild(hint);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.title = '재료 삭제';
    removeBtn.addEventListener('click', () => removeIngredient(index));
    tag.appendChild(removeBtn);

    tagsContainer.appendChild(tag);
  });
}

function removeIngredient(index) {
  state.ingredients.splice(index, 1);
  renderIngredientTags();
}

function handleManualAddIngredient() {
  const value = manualIngredientInput.value.trim();
  if (!value) return;

  const names = value.split(',').map(s => s.trim()).filter(Boolean);

  names.forEach(name => {
    const exists = state.ingredients.some(item => item.name === name);
    if (!exists) {
      state.ingredients.push({
        name: name,
        category: '기타',
        quantity_hint: '',
        confidence: 'user_added'
      });
    }
  });

  manualIngredientInput.value = '';
  renderIngredientTags();
}

// ==========================================================================
// 7. [2단계] 레시피 생성 및 추천 (프로필 컨텍스트 자동 주입)
// ==========================================================================

async function requestGenerateRecipes() {
  btnGenerateRecipes.style.display = 'none';
  recipeLoadingBox.style.display = 'block';

  // 3단계 프로필 정보(알레르기, 기피재료 등)를 서버리스 함수로 함께 전송
  const payload = {
    ingredients: state.ingredients,
    theme: filterTheme.value,
    cookingTime: filterTime.value,
    difficulty: filterDifficulty.value,
    hasPantrySeasoning: checkPantry.checked,
    userProfile: state.userProfile
  };

  try {
    const response = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `서버 에러 (${response.status})`);
    }

    if (!data.recipes || data.recipes.length === 0) {
      throw new Error('조건에 맞는 레시피를 생성하지 못했습니다. 조건을 조금 완화해 보세요.');
    }

    state.recipes = data.recipes;
    renderRecipeGrid(state.recipes);

    recipeResultsCard.style.display = 'block';
    recipeResultsCard.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('레시피 생성 실패:', error);
    alert(`레시피 생성 중 오류가 발생했습니다:\n${error.message}`);
  } finally {
    recipeLoadingBox.style.display = 'none';
    btnGenerateRecipes.style.display = 'block';
  }
}

function renderRecipeGrid(recipes) {
  recipeGrid.innerHTML = '';

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const isSaved = state.savedRecipes.some(r => r.id === recipe.id);

    card.innerHTML = `
      <div class="recipe-card-header">
        <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
      </div>
      <div class="recipe-card-badges">
        <span class="badge badge-time">⏱️ ${recipe.cooking_time_minutes}분</span>
        <span class="badge badge-difficulty">🍳 ${escapeHtml(recipe.difficulty)}</span>
        <span class="badge badge-category">${escapeHtml(recipe.category || '일반')}</span>
      </div>
      <p class="recipe-card-summary">${escapeHtml(recipe.summary || '')}</p>
      <div class="recipe-card-actions">
        <button type="button" class="btn-detail">자세히 보기</button>
        <button type="button" class="btn-card-save ${isSaved ? 'saved' : ''}">
          ${isSaved ? '★ 저장됨' : '☆ 저장'}
        </button>
      </div>
    `;

    card.querySelector('.btn-detail').addEventListener('click', () => {
      openRecipeModal(recipe);
    });

    const btnSave = card.querySelector('.btn-card-save');
    btnSave.addEventListener('click', () => {
      toggleRecipeBookmark(recipe);
      renderRecipeGrid(state.recipes);
      updateSavedCountBadge();
    });

    recipeGrid.appendChild(card);
  });
}

// ==========================================================================
// 8. [모달] 레시피 상세, 별점 & 조리 메모, 공유
// ==========================================================================

function openRecipeModal(recipe) {
  state.selectedRecipe = recipe;
  modalRecipeTitle.textContent = recipe.title;

  // 보관함에 저장되어 있는 레시피인지 확인하여 기존 별점 및 메모 로드
  const savedItem = state.savedRecipes.find(r => r.id === recipe.id);
  const currentRating = savedItem?.userRating || 0;
  const currentNotes = savedItem?.userNotes || '';

  const isSaved = !!savedItem;
  bookmarkBtnText.textContent = isSaved ? '★ 저장 완료 (클릭 시 취소)' : '⭐ 레시피 저장하기';

  const fridgeIngs = (recipe.ingredients_match?.from_fridge || []).map(i => `<li>🧊 ${escapeHtml(i)}</li>`).join('');
  const pantryIngs = (recipe.ingredients_match?.pantry_needed || []).map(i => `<li>🧂 ${escapeHtml(i)}</li>`).join('');
  const substituteText = recipe.ingredients_match?.substitutes
    ? `<div class="substitute-alert">💡 <strong>대체 팁:</strong> ${escapeHtml(recipe.ingredients_match.substitutes)}</div>`
    : '';

  const stepsHtml = (recipe.steps || []).map(s => `
    <li class="step-item">
      <div class="step-num">${s.step_number}</div>
      <div class="step-action">${escapeHtml(s.action)}</div>
      ${s.tip ? `<div class="step-tip">Tip: ${escapeHtml(s.tip)}</div>` : ''}
    </li>
  `).join('');

  const chefTipHtml = recipe.chef_tip
    ? `<div class="chef-tip-box">👨‍🍳 <strong>셰프의 한 끗 팁:</strong> ${escapeHtml(recipe.chef_tip)}</div>`
    : '';

  modalRecipeBody.innerHTML = `
    <div class="modal-meta-bar">
      <span>분량: ${escapeHtml(recipe.servings || '1~2인분')}</span>
      <span>•</span>
      <span>조리시간: ${recipe.cooking_time_minutes}분</span>
      <span>•</span>
      <span>난이도: ${escapeHtml(recipe.difficulty)}</span>
    </div>
    <p style="font-size: 0.95rem; color: #475569; margin-bottom: 16px;">${escapeHtml(recipe.summary || '')}</p>

    <h4 class="modal-section-title">재료 준비</h4>
    <div class="ingredients-box">
      <strong>[냉장고 보유 재료]</strong>
      <ul style="margin-bottom: 10px;">${fridgeIngs || '<li>기본 식재료 사용</li>'}</ul>
      <strong>[추가 필요 양념/재료]</strong>
      <ul>${pantryIngs || '<li>별도 양념 불필요</li>'}</ul>
    </div>
    ${substituteText}

    <h4 class="modal-section-title">단계별 조리 순서</h4>
    <ul class="steps-list">${stepsHtml}</ul>

    ${chefTipHtml}

    <!-- 3단계: 별점 평가 및 조리 메모장 -->
    <div class="user-interaction-box">
      <div class="interaction-title">
        <span>⭐ 나의 별점 평가</span>
        <div class="star-rating" id="modal-star-rating">
          <span class="star-item ${currentRating >= 1 ? 'active' : ''}" data-star="1">★</span>
          <span class="star-item ${currentRating >= 2 ? 'active' : ''}" data-star="2">★</span>
          <span class="star-item ${currentRating >= 3 ? 'active' : ''}" data-star="3">★</span>
          <span class="star-item ${currentRating >= 4 ? 'active' : ''}" data-star="4">★</span>
          <span class="star-item ${currentRating >= 5 ? 'active' : ''}" data-star="5">★</span>
        </div>
      </div>
      <label style="font-size: 0.82rem; font-weight: 600; color: #86198f;">나만의 조리 메모</label>
      <textarea class="note-textarea" id="modal-recipe-note" placeholder="예: 간장 반 스푼 줄이기, 대파를 바싹 익혀야 맛있음">${escapeHtml(currentNotes)}</textarea>
    </div>
  `;

  // 별점 클릭 이벤트 연결
  const starContainer = document.getElementById('modal-star-rating');
  starContainer.querySelectorAll('.star-item').forEach(star => {
    star.addEventListener('click', (e) => {
      const score = parseInt(e.target.getAttribute('data-star'), 10);
      handleSetRecipeRating(recipe, score);
    });
  });

  // 메모 작성 시 자동 저장
  const noteTextarea = document.getElementById('modal-recipe-note');
  noteTextarea.addEventListener('input', (e) => {
    handleSetRecipeNote(recipe, e.target.value);
  });

  recipeModal.style.display = 'flex';
}

function closeModal() {
  recipeModal.style.display = 'none';
  state.selectedRecipe = null;
}

function handleModalBookmarkToggle() {
  if (!state.selectedRecipe) return;
  toggleRecipeBookmark(state.selectedRecipe);
  const isSaved = state.savedRecipes.some(r => r.id === state.selectedRecipe.id);
  bookmarkBtnText.textContent = isSaved ? '★ 저장 완료 (클릭 시 취소)' : '⭐ 레시피 저장하기';

  // 목록 갱신
  renderRecipeGrid(state.recipes);
  renderSavedRecipes();
  updateSavedCountBadge();
}

/**
 * 북마크 추가/취소
 */
function toggleRecipeBookmark(recipe) {
  const index = state.savedRecipes.findIndex(r => r.id === recipe.id);
  if (index > -1) {
    // 저장 취소
    state.savedRecipes.splice(index, 1);
  } else {
    // 새 저장
    state.savedRecipes.unshift({
      ...recipe,
      userRating: 0,
      userNotes: '',
      savedAt: new Date().toISOString()
    });
  }
  localStorage.setItem('saved_recipes', JSON.stringify(state.savedRecipes));
  updateSavedCountBadge();
}

/**
 * 별점 설정
 */
function handleSetRecipeRating(recipe, score) {
  let saved = state.savedRecipes.find(r => r.id === recipe.id);
  if (!saved) {
    // 아직 저장 안 된 경우 자동 저장 처리
    toggleRecipeBookmark(recipe);
    saved = state.savedRecipes.find(r => r.id === recipe.id);
  }

  if (saved) {
    saved.userRating = score;
    localStorage.setItem('saved_recipes', JSON.stringify(state.savedRecipes));
    // 모달 내 별 UI 업데이트
    const starContainer = document.getElementById('modal-star-rating');
    if (starContainer) {
      starContainer.querySelectorAll('.star-item').forEach(star => {
        const starNum = parseInt(star.getAttribute('data-star'), 10);
        if (starNum <= score) {
          star.classList.add('active');
        } else {
          star.classList.remove('active');
        }
      });
    }
    renderSavedRecipes();
  }
}

/**
 * 조리 메모 저장
 */
function handleSetRecipeNote(recipe, text) {
  let saved = state.savedRecipes.find(r => r.id === recipe.id);
  if (!saved) {
    toggleRecipeBookmark(recipe);
    saved = state.savedRecipes.find(r => r.id === recipe.id);
  }
  if (saved) {
    saved.userNotes = text;
    localStorage.setItem('saved_recipes', JSON.stringify(state.savedRecipes));
  }
}

/**
 * 레시피 공유 (Web Share API 또는 클립보드 복사)
 */
async function handleShareRecipe() {
  if (!state.selectedRecipe) return;

  const recipe = state.selectedRecipe;
  const shareText = `[냉장고 파먹기 AI 레시피]\n🍽️ ${recipe.title}\n⏱️ 조리시간: ${recipe.cooking_time_minutes}분\n📝 ${recipe.summary}\n\n지금 냉장고 파먹기 AI에서 확인해보세요!`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: recipe.title,
        text: shareText,
        url: window.location.href
      });
    } catch (e) {
      // 공유 취소 무시
    }
  } else {
    // 클립보드 복사 폴백
    try {
      await navigator.clipboard.writeText(shareText);
      alert('레시피 내용이 클립보드에 복사되었습니다! 원하는 곳에 붙여넣어 공유하세요.');
    } catch (err) {
      alert('클립보드 복사 권한이 필요합니다.');
    }
  }
}

// ==========================================================================
// 9. [3단계] 나만의 레시피 보관함 (검색, 정렬, 렌더링)
// ==========================================================================

function updateSavedCountBadge() {
  navSavedCount.textContent = state.savedRecipes.length;
}

function renderSavedRecipes() {
  const query = (savedSearchInput.value || '').trim().toLowerCase();
  const sortBy = savedSortSelect.value;

  // 1. 검색 필터링
  let filtered = state.savedRecipes.filter(recipe => {
    if (!query) return true;
    const titleMatch = (recipe.title || '').toLowerCase().includes(query);
    const summaryMatch = (recipe.summary || '').toLowerCase().includes(query);
    const fridgeIngsMatch = (recipe.ingredients_match?.from_fridge || []).some(i => i.toLowerCase().includes(query));
    return titleMatch || summaryMatch || fridgeIngsMatch;
  });

  // 2. 정렬
  if (sortBy === 'latest') {
    filtered.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  } else if (sortBy === 'time') {
    filtered.sort((a, b) => (a.cooking_time_minutes || 0) - (b.cooking_time_minutes || 0));
  } else if (sortBy === 'rating') {
    filtered.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
  }

  // 3. 렌더링
  savedRecipeGrid.innerHTML = '';

  if (filtered.length === 0) {
    savedEmptyState.style.display = 'block';
    return;
  }

  savedEmptyState.style.display = 'none';

  filtered.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const stars = recipe.userRating ? '★'.repeat(recipe.userRating) + '☆'.repeat(5 - recipe.userRating) : '별점 없음';

    card.innerHTML = `
      <div class="recipe-card-header">
        <h3 class="recipe-card-title">${escapeHtml(recipe.title)}</h3>
      </div>
      <div class="recipe-card-badges">
        <span class="badge badge-time">⏱️ ${recipe.cooking_time_minutes}분</span>
        <span class="badge badge-difficulty">🍳 ${escapeHtml(recipe.difficulty)}</span>
        <span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">${stars}</span>
      </div>
      <p class="recipe-card-summary">${escapeHtml(recipe.summary || '')}</p>
      ${recipe.userNotes ? `<p style="font-size:0.82rem; color:#86198f; background:#fdf4ff; padding:6px 10px; border-radius:8px; margin-bottom:12px;">📝 ${escapeHtml(recipe.userNotes)}</p>` : ''}
      <div class="recipe-card-actions">
        <button type="button" class="btn-detail">자세히 보기</button>
        <button type="button" class="btn-card-save saved" title="저장 취소">삭제</button>
      </div>
    `;

    card.querySelector('.btn-detail').addEventListener('click', () => {
      openRecipeModal(recipe);
    });

    card.querySelector('.btn-card-save').addEventListener('click', () => {
      if (confirm(`'${recipe.title}' 레시피를 보관함에서 삭제하시겠습니까?`)) {
        toggleRecipeBookmark(recipe);
        renderSavedRecipes();
        updateSavedCountBadge();
        renderRecipeGrid(state.recipes);
      }
    });

    savedRecipeGrid.appendChild(card);
  });
}

// ==========================================================================
// 10. [3단계] 사용자 프로필 관리 (모달 & 설정 저장)
// ==========================================================================

function openProfileModal() {
  profileNickname.value = state.userProfile.nickname || '행복한 미식가';
  profileCookingLevel.value = state.userProfile.cookingLevel || 'intermediate';
  profileDislikesInput.value = (state.userProfile.dislikedIngredients || []).join(', ');
  profileDietary.value = state.userProfile.dietaryPreference || 'none';

  // 알레르기 체크박스 세팅
  const allergiesContainer = document.getElementById('profile-allergies');
  const userAllergies = new Set(state.userProfile.allergies || []);
  allergiesContainer.querySelectorAll('input[type="checkbox"]').forEach(box => {
    box.checked = userAllergies.has(box.value);
  });

  profileModal.style.display = 'flex';
}

function closeProfileModal() {
  profileModal.style.display = 'none';
}

function handleSaveProfile() {
  const nickname = profileNickname.value.trim() || '행복한 미식가';
  const cookingLevel = profileCookingLevel.value;
  const dietaryPreference = profileDietary.value;

  // 알레르기 추출
  const allergies = [];
  document.querySelectorAll('#profile-allergies input[type="checkbox"]:checked').forEach(box => {
    allergies.push(box.value);
  });

  // 기피 재료 추출
  const dislikesRaw = profileDislikesInput.value.trim();
  const dislikedIngredients = dislikesRaw ? dislikesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  state.userProfile = {
    nickname,
    cookingLevel,
    allergies,
    dislikedIngredients,
    dietaryPreference,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('user_profile', JSON.stringify(state.userProfile));
  alert('프로필이 성공적으로 저장되었습니다!\n앞으로 레시피 생성 시 설정된 알레르기/기피 재료가 자동으로 제외됩니다.');
  closeProfileModal();
}

// ==========================================================================
// 11. 유틸리티 함수
// ==========================================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 애플리케이션 시작 시 로컬 데이터 초기화
initLocalStorageData();
