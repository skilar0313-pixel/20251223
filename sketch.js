const TOTAL_FRAMES = 35;
let frames = [];
let currentFrame = 0;
const FRAME_INTERVAL = 100; // ms per frame
let lastFrameTime = 0;
let displayW = 200;
let displayH = 200;
let y848sound = null;
let soundPlaying = false;
// Player / physics
let playerX = 0;
let playerY = 0;
let vy = 0;
let gravity = 0.8;
let jumpForce = -15;
let moveSpeed = 6;
let onGround = false;
let groundY = 0;
// Micky sprite
let mickyFrames = [];
const MICKY_TOTAL = 16;
let mickyFrame = 0;
let mickyLastFrameTime = 0;
const MICKY_INTERVAL = 120; // ms per frame
// Right-side character (角色3)
let rightFrames = [];
const RIGHT_TOTAL = 5;
let rightFrame = 0;
let rightLastFrameTime = 0;
const RIGHT_INTERVAL = 160;
// Left-far character (角色4)
let leftFarFrames = [];
const LEFTFAR_TOTAL = 20;
let leftFarFrame = 0;
let leftFarLastFrameTime = 0;
const LEFTFAR_INTERVAL = 140;
// Micky physics (independent from main player)
let mickyX = 0;
let mickyY = 0;
let mVy = 0;
let mGravity = 0.8;
let mJumpForce = -12;
let mSpeed = 4;
let mOnGround = false;
// Dialog / input state
let inputActive = false;       // whether the middle player's input box is open
let inputText = '';
let inputSubmitted = false;    // whether player has submitted input
let mickyDialogText = '';      // text shown above micky
// question bank loaded from CSV
let questionsCSV = null; // raw lines loaded by loadStrings
let questions = [];
let askedQuestionIndices = new Set(); // 記錄已經問過的題目索引
let currentQuestionIndex = -1;
// particle/ticket effect
let tickets = [];
const TICKET_GRAVITY = 0.3;
let mDisplayWCurrent = undefined;
let mDisplayHCurrent = undefined;
// right character display sizes and dialog
let rDisplayWCurrent = undefined;
let rDisplayHCurrent = undefined;
let rightDialogText = '';
let rightX = 0;
let rightY = 0;
// left-far character display sizes and dialog
let lfDisplayWCurrent = undefined;
let lfDisplayHCurrent = undefined;
let leftFarDialogText = '';
let leftFarX = 0;
let leftFarY = 0;
// question type tracking
// types: 'math' or 'life' (生活知識)
let currentQuestionType = 'math';
let mathCompleted = false; // whether a math question has been answered correctly
let englishCompleted = false; // whether an english question has been answered correctly
let lifeAsked = false; // whether the life question has already been asked (only one question)
let showingCompletionMessage = false; // show "press enter for next" message after correct
let nextQuestionTimer = 0; // millis timestamp when to auto-advance

// Background (非著作權侵權): 程式生成的 Mario‑Kart 風格元素（分層山丘、彩虹、移動雲、道路）
let clouds = [];
const NUM_CLOUDS = 8;
let cloudSpeed = 0.2;
let bgScrollOffset = 0;

// Score & english/animation state
let score = 0;
const SCORE_MAX = 100;
let gameOver = false; // 遊戲結束狀態

// Right-character movement / swap state
let rightAdvancing = false; // whether the rightmost character is moving forward to swap with micky
let rightMoved = false;     // whether the swap already happened
let swapStartRightX = 0;
let swapStartMickyX = 0;
let swapProgress = 0;

// Drowning / wave flood control (per-character)
let drowned = { micky: false, right: false, leftFar: false };
let waveFloodOffset = 0;   // current animated flood amount (pixels)
let waveFloodTarget = 0;   // target flood amount to lerp towards
const WAVE_FLOOD_MAX = 140; // maximum flood amount (pixels)

// revive prompt state
let revivePrompt = { active: false, role: null };
let questionLocked = false; // 防止 draw() 重複抽題
let gameStarted = false; // 遊戲開始狀態


function preload() {
  // Load individual frame files all0001.png ... all0035.png
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const idx = String(i).padStart(4, '0');
    frames.push(loadImage(`1/all${idx}.png`));
  }
  // Load micky frames 0.png .. 15.png from `micky/`
  for (let i = 0; i < MICKY_TOTAL; i++) {
    mickyFrames.push(loadImage(`micky/${i}.png`));
  }
  // Load right-side character frames ALL001..ALL005 from `3/` folder
  for (let i = 1; i <= RIGHT_TOTAL; i++) {
    const idx = String(i).padStart(4, '0');
    // filenames expected: ALL0001.png .. ALL0005.png
    rightFrames.push(loadImage(`3/ALL${idx}.png`));
  }
  // Load left-far character frames all0001..all0020 from `4/` folder (lowercase)
  for (let i = 1; i <= LEFTFAR_TOTAL; i++) {
    const idx = String(i).padStart(4, '0');
    // filenames expected: all0001.png .. all0020.png
    leftFarFrames.push(loadImage(`4/all${idx}.png`));
  }
  // Load sound file y848 (ensure path matches project)
  y848sound = loadSound('y848.wav');
  // Load question bank CSV (placed in same folder as index.html)
  // Expected header columns: 題目, 答案, 答對回饋, 提示, 題型
  // File name: `questions.csv` (create this in the project root or alongside index.html)
  // Use loadStrings to avoid p5.loadTable streaming issue in some servers
  try {
    questionsCSV = loadStrings('questions.csv',
      () => { console.log('questions.csv 載入完成'); },
      (err) => { console.warn('載入 questions.csv 失敗，請檢查檔案路徑與伺服器', err); }
    );
  } catch (e) {
    console.warn('載入 questions.csv 時發生例外', e);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noSmooth();
  if (frames.length > 0) {
    // assume all frames same size
    displayW = frames[0].width * 4;
    displayH = frames[0].height * 4;
  }
  // initialize player position on the ground
  playerX = width / 2;
  groundY = height - displayH / 2 - 20;
  playerY = groundY;
  // initialize micky position to the left of the main player
  mickyX = playerX - displayW - 40;
  mickyY = groundY;

  // initialize right character position to the right of the main player
  rightX = playerX + displayW + 40;
  rightY = groundY;

  // initialize left-far character position to the far left of micky
  leftFarX = mickyX - displayW * 0.8 - 60;
  leftFarY = groundY;

  // initialize background clouds (位置與速度略有隨機，作為視差前景)
  for (let i = 0; i < NUM_CLOUDS; i++) {
    clouds.push({
      x: random(0, width),
      y: random(60, height * 0.45),
      size: random(60, 160),
      speed: random(0.08, 0.5)
    });
  }

  // parse loaded questions table (if available) 
  if (questionsCSV && Array.isArray(questionsCSV) && questionsCSV.length > 0) {
    try {
      // remove empty lines
      const lines = questionsCSV.map(s => s.trim()).filter(s => s.length > 0);
      if (lines.length < 2) {
        console.warn('questions.csv 欄位不足或沒有資料（至少要有表頭與一列）');
      } else {
        // parse header (handle BOM)
        const rawHeader = lines[0].replace(/\uFEFF/, '');
        const headers = rawHeader.split(',').map(h => h.trim());
        const idxMap = {};
        headers.forEach((h, i) => { idxMap[h] = i; });
        // expected headers: 題目, 答案, 答對回饋, 提示, 題型（題型可選）
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(c => c.trim());
          const q = row[idxMap['題目']] || '';
          const a = row[idxMap['答案']] || '';
          const fb = row[idxMap['答對回饋']] || '';
          const hint = row[idxMap['提示']] || '';
          const type = row[idxMap['題型']] || 'math'; // 'math' or 'english', default to 'math'
          questions.push({題目: q, 答案: a, 答對回饋: fb, 提示: hint, 題型: type});
        }
        if (questions.length > 0) console.log('已載入題庫數量:', questions.length);
      }
    } catch (e) {
      console.warn('解析 questions.csv 時發生問題，請檢查 CSV 格式（逗號分隔，首行為表頭）', e);
    }
  } else {
    console.log('未找到 questions.csv，將使用預設文字作為 fallback。');
  }

 // 檢查是否有英文題目，若無則新增預設題目
 const hasEnglishQuestions = questions.some(q => q.題型 && q.題型.toLowerCase() === 'english');
 if (!hasEnglishQuestions) {
  console.log('題庫中沒有英文題目，新增預設英文題目。請編輯 questions.csv 以新增更多題目。');
  questions.push(
    { 題目: '天空的顏色是什麼? (英文)', 答案: 'blue', 答對回饋: '答對了!', 提示: '一種顏色', 題型: 'english' },
    { 題目: '蘋果的英文單字?', 答案: 'apple', 答對回饋: '太棒了!', 提示: '一種水果', 題型: 'english' },
    { 題目: '貓的英文單字?', 答案: 'cat', 答對回饋: '正確!', 提示: '一種動物', 題型: 'english' }
  );
 }
}

function draw() {
  // draw a procedural Mario‑Kart inspired background (gradient sky, hills, clouds, road)
  drawBackground();

  if (!gameStarted) {
    drawInstructions();
    return;
  }

  // Scoreboard (左上角)
  push();
  rectMode(CORNER);
  fill(255, 240);
  stroke(0);
  strokeWeight(1);
  rect(16, 16, 180, 84, 8);
  noStroke();
  fill(0, 220);
  textSize(48);
  textAlign(CENTER, CENTER);
  text(score, 16 + 180 / 2, 16 + 84 / 2);
  pop();

  // 遊戲結束訊息
  if (gameOver) {
    push();
    fill(0, 180);
    rect(0, 0, width, height);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    // 根據結束條件顯示不同訊息
    if (score >= SCORE_MAX) {
      text('恭喜！你已達到 100 分！', width / 2, height / 2 - 60);
    } else {
      text('遊戲結束！你已完成所有挑戰！', width / 2, height / 2 - 60);
    }

    // 顯示最終分數
    textSize(48);
    text('最終得分: ' + score, width / 2, height / 2 + 10);

    // 重新開始按鈕
    const btnW = 220;
    const btnH = 60;
    const btnX = width / 2;
    const btnY = height / 2 + 100;
    rectMode(CENTER);
    fill(100, 200, 100);
    rect(btnX, btnY, btnW, btnH, 8);
    fill(0);
    textSize(24);
    text('重新開始', btnX, btnY);
    pop();
    return; // 停止後續繪製
  }

  if (frames.length === 0) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('找不到動畫幀：請確認 `1/` 資料夾內有 all0001..all0035.png', width / 2, height / 2);
    return;
  }

  if (millis() - lastFrameTime > FRAME_INTERVAL) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
    lastFrameTime = millis();
  }

  // handle right-character auto-advance swap animation
  if (rightAdvancing) {
    swapProgress = min(1, swapProgress + 0.035);
    rightX = lerp(swapStartRightX, swapStartMickyX, swapProgress);
    mickyX = lerp(swapStartMickyX, swapStartRightX, swapProgress);
    if (swapProgress >= 1) {
      rightAdvancing = false;
      rightMoved = true;
      swapProgress = 0;
    }
  }

  const img = frames[currentFrame];
  // Micky controls: A/D for left/right movement (hold), W to jump (press)
  if (keyIsDown(65)) { // 'A'
    mickyX -= mSpeed;
  }
  if (keyIsDown(68)) { // 'D'
    mickyX += mSpeed;
  }

  // Apply gravity to micky
  mVy += mGravity;
  mickyY += mVy;

  // Ground collision for micky
  if (mickyY > groundY) {
    mickyY = groundY;
    mVy = 0;
    mOnGround = true;
  } else {
    mOnGround = false;
  }

  // update and draw micky (uses its own position)
  if (mickyFrames.length > 0) {
    if (millis() - mickyLastFrameTime > MICKY_INTERVAL) {
      mickyFrame = (mickyFrame + 1) % MICKY_TOTAL;
      mickyLastFrameTime = millis();
    }

    const mimg = mickyFrames[mickyFrame];
    // scale micky so its height is proportional to main displayH
    const mScale = 0.8; // relative size compared to main character
    const mDisplayH = displayH * mScale;
    const mDisplayW = (mimg.width / mimg.height) * mDisplayH;

    // store last display size for proximity checks later
    mDisplayWCurrent = mDisplayW;
    mDisplayHCurrent = mDisplayH;

    // Constrain micky within canvas
    mickyX = constrain(mickyX, mDisplayW / 2, width - mDisplayW / 2);

    // image uses center, so pass mickyX and mickyY
    if (drowned.micky) {
      const submergedY = mickyY + min(40, waveFloodOffset * 0.35);
      push();
      tint(255, 180);
      image(mimg, mickyX, submergedY, mDisplayW, mDisplayH);
      noTint();
      fill('#84C1FF');
      noStroke();
      ellipse(mickyX + 8, submergedY + mDisplayH * 0.12, mDisplayW * 1.0, mDisplayH * 0.36);
      pop();
    } else {
      image(mimg, mickyX, mickyY, mDisplayW, mDisplayH);
    }
  }
  // draw right-side character (static-ish, uses its own frames)
  if (rightFrames.length > 0) {
    if (millis() - rightLastFrameTime > RIGHT_INTERVAL) {
      rightFrame = (rightFrame + 1) % RIGHT_TOTAL;
      rightLastFrameTime = millis();
    }
    const rimg = rightFrames[rightFrame];
    const rScale = 0.9;
    const rDisplayH = displayH * rScale;
    const rDisplayW = (rimg.width / rimg.height) * rDisplayH;
    rDisplayWCurrent = rDisplayW;
    rDisplayHCurrent = rDisplayH;
    // ensure right character constrained inside canvas
    rightX = constrain(rightX, rDisplayW / 2, width - rDisplayW / 2);

  // If drowned, draw slightly submerged and with a wave crest overlay
  if (drowned.right) {
      const submergedY = rightY + min(40, waveFloodOffset * 0.35);
      push();
      tint(255, 180);
      image(rimg, rightX, submergedY, rDisplayW, rDisplayH);
      noTint();
      // front wave crest
      fill('#00E3E3');
      noStroke();
      ellipse(rightX + 12, submergedY + rDisplayH * 0.12, rDisplayW * 1.1, rDisplayH * 0.4);
      pop();
    } else {
      image(rimg, rightX, rightY, rDisplayW, rDisplayH);
    }
  }
  // draw left-far character (角色4)
  if (leftFarFrames.length > 0) {
    if (millis() - leftFarLastFrameTime > LEFTFAR_INTERVAL) {
      leftFarFrame = (leftFarFrame + 1) % LEFTFAR_TOTAL;
      leftFarLastFrameTime = millis();
    }
    const lfimg = leftFarFrames[leftFarFrame];
    const lfScale = 0.75;
    const lfDisplayH = displayH * lfScale;
    const lfDisplayW = (lfimg.width / lfimg.height) * lfDisplayH;
    lfDisplayWCurrent = lfDisplayW;
    lfDisplayHCurrent = lfDisplayH;
    // ensure left-far character constrained inside canvas
    leftFarX = constrain(leftFarX, lfDisplayW / 2, width - lfDisplayW / 2);
    if (drowned.leftFar) {
      const submergedY = leftFarY + min(36, waveFloodOffset * 0.32);
      push();
      tint(255, 200);
      image(lfimg, leftFarX, submergedY, lfDisplayW, lfDisplayH);
      noTint();
      fill('#80FFFF');
      noStroke();
      ellipse(leftFarX + 6, submergedY + lfDisplayH * 0.12, lfDisplayW * 0.9, lfDisplayH * 0.34);
      pop();
    } else {
      image(lfimg, leftFarX, leftFarY, lfDisplayW, lfDisplayH);
    }
  }
  // Movement: left/right
  if (keyIsDown(LEFT_ARROW)) {
    playerX -= moveSpeed;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    playerX += moveSpeed;
  }

  // Apply gravity
  vy += gravity;
  playerY += vy;

  // Ground collision
  if (playerY > groundY) {
    playerY = groundY;
    vy = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  // Constrain player within canvas
  playerX = constrain(playerX, displayW / 2, width - displayW / 2);

  // Draw character at player position
  image(img, playerX, playerY, displayW, displayH);

  // Show dialog box above micky when close to main player
  // compute current micky display sizes (fallback if not set)
  if (typeof mDisplayWCurrent === 'undefined') {
    mDisplayHCurrent = displayH * 0.8;
    mDisplayWCurrent = (21 / 30) * mDisplayHCurrent;
  }
  const distance = dist(playerX, playerY, mickyX, mickyY);
  const proximityThreshold = displayW / 2 + mDisplayWCurrent / 2 + 40;

  // Open input when approaching (only if not yet submitted)
  if (!inputSubmitted && distance < proximityThreshold) {
    if (!inputActive) {
      inputActive = true;
      inputText = '';
    }
    if (!mickyDialogText && !leftFarDialogText && !showingCompletionMessage) {
      // 如果兩種題目都問完了，就重置，形成循環
      if (mathCompleted && englishCompleted) {
        mathCompleted = false;
        englishCompleted = false;
        lifeAsked = false; // 修正：重置英文題旗標以開始新循環
      }

      // choose a question based on progress
      // first do math (micky), then english (character 4)
  // 檢查是否還有題目
  if (askedQuestionIndices.size >= questions.length && questions.length > 0) {
    gameOver = true;
    mickyDialogText = '';
    rightDialogText = '';
    leftFarDialogText = '';
    return;
  }
  if (!mathCompleted && !drowned.micky && !questionLocked) {
        // select a math question for micky
        const mathQuestions = questions.map((q, i) => ({...q, originalIndex: i}))
                                     .filter((q, i) => (q.題型 === 'math' || !q.題型) && !askedQuestionIndices.has(i));
        if (mathQuestions.length > 0) {
          currentQuestionIndex = floor(random(0, mathQuestions.length));
          const qobj = mathQuestions[currentQuestionIndex];
          mickyDialogText = qobj && qobj.題目 ? qobj.題目 : '請問你叫甚麼名字';
          currentQuestionType = 'math';
          // find the index in main questions array
          currentQuestionIndex = qobj.originalIndex;
          questionLocked = true; // 鎖定題目，防止重複抽取
        } else {
          // 沒有數學題了，強制輪到英文題
          mathCompleted = true;
        }
      } else if (drowned.micky) {
        mickyDialogText = '被海浪淹沒中…';
      } else if (!englishCompleted && mathCompleted && !drowned.right && !questionLocked) {
      // select a life-knowledge question for the RIGHT character (only after math round or after it has moved)
      const lifeQuestions = questions.map((q, i) => ({...q, originalIndex: i}))
                                     .filter((q, i) => q.題型.toLowerCase() === 'english' && !askedQuestionIndices.has(i));
      if (lifeQuestions.length > 0) {
        const randIdx = floor(random(0, lifeQuestions.length));
        const qobj = lifeQuestions[randIdx];
        // show the life-knowledge question directly in the right character's dialog
        rightDialogText = qobj && qobj.題目 ? qobj.題目 : '';
        currentQuestionType = 'english';
        // find the index in main questions array
        currentQuestionIndex = qobj.originalIndex;
        // open input immediately for the player to answer
        inputActive = true;
        inputText = '';
        lifeAsked = true; // 標記英文題已出過
          questionLocked = true; // 鎖定題目，防止重複抽取
      } else { // no english questions found
        // no life questions available: do nothing (no fallback prompt)
        // 沒有英文題了，強制輪到數學題
        englishCompleted = true;
      }
  } else if (drowned.right) {
      // if drowned, prompt the player to answer a math question to recover
      rightDialogText = '被海浪淹沒中…';
    }
    }
  }

  // Determine whether to show micky's dialog: show when input open (typing) or when close (or after submit)
  const showMickyDialog = (inputActive || (!inputSubmitted && distance < proximityThreshold) || (inputSubmitted && mickyDialogText));
  if (showMickyDialog && mickyDialogText) {
    push();
    textSize(18);
    textAlign(CENTER, CENTER);
    const padding = 10;
    const tw = textWidth(mickyDialogText);
    const boxW = tw + padding * 2;
    const boxH = 26 + padding;
    const boxX = mickyX;
    const boxY = mickyY - mDisplayHCurrent / 2 - boxH / 2 - 8;
    rectMode(CENTER);
    fill(255, 245);
    stroke(0);
    strokeWeight(2);
    rect(boxX, boxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    text(mickyDialogText, boxX, boxY);
    pop();
  }

  // show right character dialog when available
  if (rightDialogText) {
    push();
    textSize(18);
    textAlign(CENTER, CENTER);
    const padding = 10;
    const tw = textWidth(rightDialogText);
    const boxW = tw + padding * 2;
    const boxH = 26 + padding;
    const boxX = rightX;
    const boxY = rightY - rDisplayHCurrent / 2 - boxH / 2 - 8;
    rectMode(CENTER);
    fill(255, 245);
    stroke(0);
    strokeWeight(2);
    rect(boxX, boxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    text(rightDialogText, boxX, boxY);
    pop();
  }

  // show left-far character dialog when available
  if (leftFarDialogText) {
    push();
    textSize(18);
    textAlign(CENTER, CENTER);
    const padding = 10;
    const tw = textWidth(leftFarDialogText);
    const boxW = tw + padding * 2;
    const boxH = 26 + padding;
    const boxX = leftFarX;
    const boxY = leftFarY - lfDisplayHCurrent / 2 - boxH / 2 - 8;
    rectMode(CENTER);
    fill(255, 245);
    stroke(0);
    strokeWeight(2);
    rect(boxX, boxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    text(leftFarDialogText, boxX, boxY);
    pop();
  }

  // show "press enter for next" hint when showing completion message
  if (showingCompletionMessage) {
    push();
    fill(100, 150);
    textAlign(CENTER, TOP);
    textSize(14);
    text('按 ENTER 進入下一題', width / 2, height - 60);
    pop();
  }

  // Revive prompt modal (when a drowned role can be revived after answering the other domain)
  if (revivePrompt.active) {
    push();
    const w = 380;
    const h = 120;
    const cx = width / 2;
    const cy = height / 2 - 40;
    rectMode(CENTER);
    fill(255, 245);
    stroke(0);
    strokeWeight(2);
    rect(cx, cy, w, h, 10);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('是否要復活？按「是」扣10分', cx, cy - 26);
    // buttons
    const btnW = 120;
    const btnH = 40;
    // left: 是 (yes)
    const leftX = cx - 90;
    const rightX = cx + 90;
    const by = cy + 28;
    // left button (Yes)
    fill(80, 200, 120);
    rect(leftX, by, btnW, btnH, 6);
    fill(255);
    textSize(16);
    text('是', leftX, by);
    // right button (No)
    fill(200, 100, 100);
    rect(rightX, by, btnW, btnH, 6);
    fill(255);
    text('否', rightX, by);
    pop();
    // disable input while modal active
    inputActive = false;
  }

  // If input is active, show an input box above the middle (player) character.
  if (inputActive) {
    push();
    // keep input box vertically stable (don't jump when player jumps): anchor relative to ground
    const iboxX = playerX;
    const iboxY = groundY - displayH / 2 - 60;
    const padding = 8;
    textSize(18);
    textAlign(LEFT, CENTER);
    const tw = textWidth(inputText || ' ');
    const boxW = max(160, tw + padding * 2 + 12);
    const boxH = 32;
    rectMode(CENTER);
    fill(255);
    stroke(0);
    strokeWeight(2);
    rect(iboxX, iboxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    // draw the typed text left-aligned inside the box
    const textX = iboxX - boxW / 2 + padding + 4;
    text(inputText, textX, iboxY);
    // draw a caret at end (non-blinking)
    const caretX = textX + textWidth(inputText);
    stroke(0);
    strokeWeight(2);
    line(caretX + 2, iboxY - 10, caretX + 2, iboxY + 10);
    pop();
  }

  // Draw simple ground indicator
  push();
  stroke(0, 60);
  strokeWeight(2);
  line(0, groundY + displayH / 2 + 10, width, groundY + displayH / 2 + 10);
  pop();

  // If sound not yet started, show a small hint to click/tap to enable audio
  if (y848sound && !soundPlaying) {
    push();
    fill(0, 150);
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text('點擊或按任意鍵以播放音效', width / 2, height - 20);
    pop();
  }

  // update and draw ticket particles (draw behind UI elements so they look like background effects)
  for (let i = tickets.length - 1; i >= 0; i--) {
    const p = tickets[i];
    p.vy += TICKET_GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    push();
    translate(p.x, p.y);
    rotate(p.rot);
    rectMode(CENTER);
    noStroke();
    fill(p.color);
    rect(0, 0, p.w, p.h, 4);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(10);
    if (p.kind === 'rainbow') {
      text('🌈', 0, 0);
    } else {
      text('彩票', 0, 0);
    }
    pop();
    if (p.life <= 0 || p.y > height + 50) tickets.splice(i, 1);
  }

  // auto-advance when timer elapsed
  if (showingCompletionMessage && nextQuestionTimer > 0 && millis() >= nextQuestionTimer) {
    // reset timer and prepare for next question
    nextQuestionTimer = 0;
    showingCompletionMessage = false; // hide "press enter" message
    inputActive = false; // keep input closed until next question is chosen
    inputText = '';
    inputSubmitted = false;
    mickyDialogText = '';
    leftFarDialogText = '';
    rightDialogText = '';
    // 重置輪替旗標，讓 draw() 重新選擇題目
    if (currentQuestionType === 'math') {
      mathCompleted = true;
      englishCompleted = false; // 為下一題英文題做準備
    } else if (currentQuestionType === 'english') {
      englishCompleted = true;
      // After an English question, the next cycle should start with math.
      // By setting mathCompleted to false, we ensure the logic doesn't stall.
      mathCompleted = false;
    }
    questionLocked = false; // 解鎖，允許選擇下一題
  }
}

// emit colorful rainbow tickets
function emitRainbowTickets(x, y, n = 30) {
  const rainbow = [ color('#FF6B6B'), color('#FFB86B'), color('#FFD86B'), color('#6BFFB8'), color('#6BB8FF') ];
  for (let i = 0; i < n; i++) {
    const angle = random(-PI * 0.9, -PI * 0.1);
    const speed = random(2, 8);
    const vx = cos(angle) * speed + random(-1, 1);
    const vy = sin(angle) * speed + random(-1, 1);
    const sizeW = random(16, 30);
    const sizeH = random(10, 18);
    tickets.push({
      x: x + random(-20, 20),
      y: y + random(-10, 10),
      vx: vx,
      vy: vy,
      w: sizeW,
      h: sizeH,
      rot: random(-0.7, 0.7),
      life: Math.floor(random(60, 140)),
      color: rainbow[floor(random(0, rainbow.length))],
      kind: 'rainbow'
    });
  }
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // update ground and keep player on ground if they were standing
  groundY = height - displayH / 2 - 20;
  if (onGround) {
    playerY = groundY;
  }
  if (mOnGround) {
    mickyY = groundY;
  }
}

// draw a Mario‑Kart‑inspired, non‑copyright procedural background
function drawBackground() {
  // small automatic scroll influenced by time and player position
  bgScrollOffset += 0.2 + (moveSpeed / 100) * (playerX - width / 2) * 0.0005;

  // sky gradient
  for (let y = 0; y < height; y++) {
    const t = map(y, 0, height, 0, 1);
    const topColor = color(135, 206, 250); // sky blue
    const midColor = color(255, 200, 200); // warm near horizon
    const c = lerpColor(topColor, midColor, t * 0.8 + 0.1);
    stroke(c);
    line(0, y, width, y);
  }
  noStroke();

  // sun glow
  push();
  const sunX = width * 0.85;
  const sunY = height * 0.18;
  for (let r = 140; r > 0; r -= 14) {
    fill(255, 230, 120, map(r, 140, 0, 40, 240));
    ellipse(sunX, sunY, r * 2, r * 2);
  }
  pop();

  // clouds (parallax)
  push();
  for (let c of clouds) {
    c.x += c.speed + cloudSpeed;
    if (c.x - c.size > width) c.x = -c.size;
    fill(255, 250);
    ellipse(c.x, c.y, c.size * 1.6, c.size * 0.9);
    ellipse(c.x - c.size * 0.5, c.y + 6, c.size * 1.1, c.size * 0.7);
    ellipse(c.x + c.size * 0.5, c.y + 4, c.size * 0.9, c.size * 0.6);
  }
  pop();

  // small ocean waves (三層小波浪)，使用使用者指定顏色
  // animate flood offset (lerp towards target) so wrong answers can "raise" the waves
  waveFloodOffset = lerp(waveFloodOffset, waveFloodTarget, 0.05);
  const waveCols = [ color('#80FFFF'), color('#84C1FF'), color('#00E3E3') ];
  const waveHeights = [ height * 0.72, height * 0.78, height * 0.84 ];
  const waveAmps = [ 12, 18, 24 ];
  const waveFreqs = [ 0.012, 0.01, 0.008 ];
  for (let i = 0; i < 3; i++) {
    push();
    fill(waveCols[i]);
    noStroke();
    beginShape();
    vertex(0, height);
    for (let x = 0; x <= width + 200; x += 16) {
      const nx = (x * waveFreqs[i]) + bgScrollOffset * (0.02 * (i + 1));
      // subtract waveFloodOffset to raise waves upward when flooded
      const y = waveHeights[i] - waveFloodOffset + sin(nx * TWO_PI + i * 0.6) * waveAmps[i];
      vertex(x, y);
    }
    vertex(width, height);
    endShape(CLOSE);
    pop();
  }

  // subtle rainbow arc
  push();
  translate(width * 0.2, height * 0.5);
  noFill();
  strokeWeight(14);
  const rainbowColors = [
    color(255, 100, 100, 60),
    color(255, 170, 80, 60),
    color(255, 230, 110, 60),
    color(120, 220, 150, 60),
    color(120, 170, 255, 60)
  ];
  for (let i = 0; i < rainbowColors.length; i++) {
    stroke(rainbowColors[i]);
    arc(0, 0, 800 - i * 60, 400 - i * 40, PI * 1.1, PI * 1.9);
  }
  pop();

  // foreground racetrack surface
  push();
  const roadY = height - displayH / 2 + 30;
  fill(30);
  beginShape();
  vertex(0, height);
  vertex(0, roadY - 120);
  for (let x = 0; x <= width + 200; x += 30) {
    const nx = (x * 0.008) + bgScrollOffset * 0.02;
    const y = roadY + sin(nx * TWO_PI) * 20 + (x / width) * 10;
    vertex(x, y);
  }
  vertex(width, roadY - 120);
  vertex(width, height);
  endShape(CLOSE);
  // dashed center line
  stroke(255, 240, 100);
  strokeWeight(6);
  const dashLen = 40;
  let accum = bgScrollOffset * 8;
  for (let x = -200; x < width + 200; x += dashLen * 2) {
    const nx = (x * 0.008) + bgScrollOffset * 0.02;
    const y = roadY + sin(nx * TWO_PI) * 20 + (x / width) * 10;
    line(x + (accum % (dashLen * 2)), y, x + dashLen + (accum % (dashLen * 2)), y);
  }
  noStroke();
  pop();
}
// emit N ticket particles from (x,y)
function emitTickets(x, y, n = 30) {
  for (let i = 0; i < n; i++) {
    const angle = random(-PI * 0.9, -PI * 0.1);
    const speed = random(2, 8);
    const vx = cos(angle) * speed + random(-1, 1);
    const vy = sin(angle) * speed + random(-1, 1);
    const sizeW = random(18, 34);
    const sizeH = random(12, 20);
    tickets.push({
      x: x + random(-20, 20),
      y: y + random(-10, 10),
      vx: vx,
      vy: vy,
      w: sizeW,
      h: sizeH,
      rot: random(-0.5, 0.5),
      life: Math.floor(random(60, 140)),
      color: color(random(200, 255), random(160, 240), random(80, 220))
    });
  }
}

function keyPressed() {
  if (!gameStarted) {
    gameStarted = true;
    if (y848sound && !soundPlaying) {
      userStartAudio();
      y848sound.play();
      soundPlaying = true;
    }
    return false;
  }
  // If revive prompt active, allow quick keyboard choices: Left/1=yes, Right/2=no
  if (revivePrompt.active) {
    if (keyCode === LEFT_ARROW || key === '1') {
      handleReviveChoice(true);
      return false;
    }
    if (keyCode === RIGHT_ARROW || key === '2') {
      handleReviveChoice(false);
      return false;
    }
  }
  // also allow keyboard to start sound
  if (y848sound && !soundPlaying) {
    userStartAudio();
    y848sound.play();
    soundPlaying = true;
  }
  // Jump on Space (only if on ground)
  if ((key === ' ' || keyCode === 32) && onGround) {
    vy = jumpForce;
    onGround = false;
  }
  // Micky jump on 'W' or 'w'
  if ((key === 'w' || key === 'W' || keyCode === 87) && mOnGround) {
    mVy = mJumpForce;
    mOnGround = false;
  }

  // If we are showing the "press enter for next" message, allow Enter to advance
  if ((keyCode === ENTER || keyCode === 13) && showingCompletionMessage) {
    showingCompletionMessage = false;
    inputActive = true;
    inputText = '';
    inputSubmitted = false;
    mickyDialogText = '';
    leftFarDialogText = '';
    rightDialogText = '';
    // next question will be selected in draw()
    return false; // consume the key
  }

  // Input handling: when input box active, handle Enter and Backspace here
  if (inputActive) {
    // Enter: submit or next question
    if (keyCode === ENTER || keyCode === 13) {
      // if showing completion message, pressing Enter proceeds to next question
      if (showingCompletionMessage) {
        showingCompletionMessage = false;
        inputActive = true;
        inputText = '';
        inputSubmitted = false;
        mickyDialogText = '';
        leftFarDialogText = '';
        rightDialogText = '';
        // next question will be selected in draw() when both dialogs are empty
        return false;
      }
      
      // check against current question's answer (if any)
      const userAns = inputText.trim();
      if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
        const expectedRaw = (questions[currentQuestionIndex].答案 || '').toString().trim();
        // allow numeric comparison if both look numeric
        const userNum = Number(userAns);
        const expNum = Number(expectedRaw);
        const isNumericCompare = !isNaN(userNum) && !isNaN(expNum);
        const correct = isNumericCompare ? (userNum === expNum) : (userAns === expectedRaw);
        if (correct) {
          // correct answer
          const emitX = width / 2;
          const emitY = groundY - displayH / 2 - 40;
          // reward visual
          score += 10;
          if (score >= SCORE_MAX) {
            gameOver = true;
          }
          askedQuestionIndices.add(currentQuestionIndex); // 標記此題已問過
          if (currentQuestionType === 'english') {
            // life-knowledge: rainbow ticket explosion
            emitRainbowTickets(emitX, emitY, 60);
            rightDialogText = '答對了耶！';
            englishCompleted = true;
          } else {
            // math: normal tickets and math success
            emitTickets(emitX, emitY, 40);
            mickyDialogText = '答對了好棒';
            mathCompleted = true;
            // Answering a math question correctly can revive the English teacher
            // if right was drowned, recover when math answered correctly
            if (drowned.right) {
              drowned.right = false;
              waveFloodTarget = 0;
              // small celebration
              emitRainbowTickets(emitX, emitY - 30, 20);
            }
          }
          // after finishing math, if right hasn't moved yet, make it advance and swap with micky
          if (mathCompleted && !rightMoved && !rightAdvancing) {
            rightAdvancing = true;
            swapStartRightX = rightX;
            swapStartMickyX = mickyX;
            swapProgress = 0;
          }
          // clear right hint if any
          inputSubmitted = true;
          inputActive = false;
          showingCompletionMessage = true;
          // check if there is any other drowned role to offer revival
          const currentAsker = (currentQuestionType === 'english') ? 'right' : (currentQuestionType === 'math') ? 'micky' : null;
          let otherDrowned = null;
          for (let k in drowned) {
            if (drowned[k] && k !== currentAsker) { otherDrowned = k; break; }
          }
          if (otherDrowned) {
            // show revive prompt immediately and pause auto-advance
            revivePrompt.active = true;
            revivePrompt.role = otherDrowned;
            // keep input paused while user chooses
            inputActive = false;
            nextQuestionTimer = 0;
          } else {
            // schedule auto-advance in 1 second
            nextQuestionTimer = millis() + 1000;
          }
        } else {
          // incorrect: show hint and drown the asking role; revival is offered immediately
          // drown the asking role (math->micky, life->right)
          const asker = (currentQuestionType === 'english') ? 'right' : (currentQuestionType === 'math') ? 'micky' : null;
          if (asker) {
            drowned[asker] = true;
            waveFloodTarget = WAVE_FLOOD_MAX;
            // asker's dialog shows that it was drowned
            if (asker === 'right') rightDialogText = '被海浪淹沒中…';
            if (asker === 'micky') mickyDialogText = '被海浪淹沒中…';
            // hint provider (left-far) provides a hint
            // 修正：確保兩種題型答錯時都能顯示提示
            if (questions[currentQuestionIndex] && questions[currentQuestionIndex].提示) {
              leftFarDialogText = questions[currentQuestionIndex].提示;
            }

            // immediately ask the player whether to revive (cost if yes)
            revivePrompt.active = true;
            revivePrompt.role = asker;
            inputActive = false; // pause answering while modal active
          } else {
            // generic fallback
            rightDialogText = questions[currentQuestionIndex].提示 || '答錯了，再試一次';
            inputActive = true;
          }
          inputSubmitted = false;
        }
      } else {
        // no current question: fallback behaviour (same as before)
        mickyDialogText = (inputText.trim() || '') + ' 歡迎你';
      }
    } else if (keyCode === BACKSPACE || keyCode === 8) {
      // remove last character
      inputText = inputText.slice(0, -1);
    }
    // prevent other handlers from acting on this keypress (but still allow movement keys via keyIsDown)
  }
}

function keyTyped() {
  // capture printable characters for input when inputActive
  if (inputActive) {
    // key contains the typed character
    if (key && key.length === 1) {
      inputText += key;
    }
    // prevent default
    return false;
  }
}

// handle revive modal choice
function handleReviveChoice(yes) {
  // 如果遊戲結束，則不處理
  if (gameOver) {
    revivePrompt.active = false;
    revivePrompt.role = null;
    return;
  }

  if (!revivePrompt.active) return;
  const role = revivePrompt.role;
  revivePrompt.active = false;
  revivePrompt.role = null;
  if (yes) {
    // cost 10 points to revive
    score = max(0, score - 10);
    if (role && drowned[role]) {
      drowned[role] = false;
      waveFloodTarget = 0;
      // celebration
      emitRainbowTickets((role === 'right') ? rightX : (role === 'micky') ? mickyX : leftFarX, groundY - displayH / 2 - 40, 20);
    }
  } else {
    // no action, just close prompt
  }
  // 準備下一題
  showingCompletionMessage = true;
  nextQuestionTimer = millis() + 100; // 立即準備下一題
  questionLocked = false; // 解鎖，允許選擇下一題
  inputActive = false; // 保持輸入關閉
}

function mousePressed() {
  if (!gameStarted) {
    gameStarted = true;
    if (y848sound && !soundPlaying) {
      userStartAudio();
      y848sound.play();
      soundPlaying = true;
    }
    return;
  }
  // 如果遊戲結束，檢查是否點擊重新開始按鈕
  if (gameOver) {
    const btnW = 220;
    const btnH = 60;
    const btnX = width / 2;
    const btnY = height / 2 + 100;
    if (mouseX >= btnX - btnW/2 && mouseX <= btnX + btnW/2 && mouseY >= btnY - btnH/2 && mouseY <= btnY + btnH/2) {
      restartGame();
      return;
    }
  }

  // if revive prompt active, check button clicks
  if (revivePrompt.active) {
    const w = 380;
    const h = 120;
    const cx = width / 2;
    const cy = height / 2 - 40;
    const btnW = 120;
    const btnH = 40;
    const leftX = cx - 90;
    const rightX = cx + 90;
    const by = cy + 28;
    if (mouseX >= leftX - btnW/2 && mouseX <= leftX + btnW/2 && mouseY >= by - btnH/2 && mouseY <= by + btnH/2) {
      handleReviveChoice(true);
      return;
    }
    if (mouseX >= rightX - btnW/2 && mouseX <= rightX + btnW/2 && mouseY >= by - btnH/2 && mouseY <= by + btnH/2) {
      handleReviveChoice(false);
      return;
    }
  }
  // Start audio in response to user gesture to satisfy browser autoplay policies
  if (y848sound && !soundPlaying) {
    userStartAudio();
    // play once or loop; change to .loop() if you want continuous playback
    y848sound.play();
    soundPlaying = true;
  }
}

function restartGame() {
  // Reset scores and game state
  score = 0;
  gameOver = false;

  // Reset question tracking
  askedQuestionIndices.clear();
  currentQuestionIndex = -1;
  mathCompleted = false;
  englishCompleted = false;
  lifeAsked = false;

  // Reset UI and interaction states
  showingCompletionMessage = false;
  nextQuestionTimer = 0;
  inputActive = false;
  inputText = '';
  inputSubmitted = false;

  // Reset dialogs
  mickyDialogText = '';
  rightDialogText = '';
  leftFarDialogText = '';

  // Reset character states
  drowned = { micky: false, right: false, leftFar: false };
  waveFloodTarget = 0;
  revivePrompt = { active: false, role: null };

  // Reset character positions to initial setup
  playerX = width / 2;
  playerY = groundY;
  rightMoved = false; // 修正：重置角色交換狀態
  mickyX = playerX - displayW - 40;
  mickyY = groundY;
  rightX = playerX + displayW + 40;
  rightY = groundY;
  leftFarX = mickyX - displayW * 0.8 - 60;
  leftFarY = groundY;
  questionLocked = false;
}

function drawInstructions() {
  push();
  rectMode(CENTER);
  // 半透明背景
  fill(0, 150);
  rect(width / 2, height / 2, width, height);

  // 說明視窗
  fill(255);
  stroke(0);
  strokeWeight(4);
  rect(width / 2, height / 2, 640, 480, 20);

  // 標題
  fill(0);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(40);
  textStyle(BOLD);
  text("遊戲說明", width / 2, height / 2 - 200);

  // 內容 (條列式)
  textAlign(LEFT, TOP);
  textSize(22);
  textStyle(NORMAL);
  let startX = width / 2 - 280;
  let startY = height / 2 - 130;
  let leading = 50;

  text("● 米老鼠操控：按下 WASD 各自代表前後左右", startX, startY);
  text("● 馬力歐操控：按下鍵盤中的上下左右可以使\n   馬力歐移動或往上跳", startX, startY + leading);
  text("● 答題規則：回答題目時要送出答案請按下 Enter 鍵", startX, startY + leading * 2.5);
  text("● 獎懲機制：答對就會噴射彩票，答錯會害角色淹水", startX, startY + leading * 3.5);
  text("● 復活機制：當淹水時，可以選擇復活但會扣 10 分", startX, startY + leading * 4.5);

  // 開始提示
  textAlign(CENTER, BOTTOM);
  textSize(18);
  fill(100);
  text("點擊畫面或按任意鍵開始遊戲", width / 2, height / 2 + 220);
  pop();
}
