const keys = new Set();
// Hold-to-move controls: pointer capture prevents missed releases.
// Do not let focused buttons intercept keyboard movement.
let opened = false,
  near = false,
  time = 0,
  last = 0;
const p = { x: 395, y: 417, w: 20, h: 17, dir: 0, walk: 0 };
const furniture = [
  { x: 72, y: 90, w: 173, h: 62, type: "shelf" },
  { x: 275, y: 88, w: 105, h: 54, type: "shelf" },
  { x: 555, y: 90, w: 172, h: 62, type: "shelf" },
  { x: 75, y: 240, w: 122, h: 78, type: "table" },
  { x: 580, y: 235, w: 135, h: 92, type: "table" },
  { x: 322, y: 211, w: 150, h: 103, type: "cauldron" },
  { x: 240, y: 455, w: 116, h: 52, type: "counter" },
  { x: 497, y: 445, w: 122, h: 62, type: "counter" },
  { x: 78, y: 392, w: 80, h: 70, type: "sofa" },
  { x: 675, y: 390, w: 49, h: 66, type: "plant" },
];
const solid = furniture.map((o) => ({
  x: o.x + 4,
  y: o.y + o.h * 0.48,
  w: o.w - 8,
  h: o.h * 0.52,
}));

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function box(x, y, w, h, main, edge = "#3b2738") {
  rect(x + 4, y + 5, w, h, "#251b2e");
  rect(x, y, w, h, edge);
  rect(x + 4, y + 4, w - 8, h - 8, main);
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function text(s, x, y, size = 14, color = "#f6ddbd") {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Limgul`;
  ctx.textAlign = "center";
  ctx.fillText(s, x, y);
}
let scene = "shop";
const villagePeople = [
  {
    x: 215,
    y: 260,
    homeX: 215,
    homeY: 260,
    name: "꽃집 루나",
    line: "마음이 지친 날에는 꽃 한 송이도 위로가 돼요.",
    color: "#d7a1b5",
    phase: 0.4,
  },
  {
    x: 592,
    y: 316,
    homeX: 592,
    homeY: 316,
    name: "우체부 모모",
    line: "전하지 못한 마음도 언젠가 닿을 거예요.",
    color: "#8baed2",
    phase: 2.2,
  },
  {
    x: 365,
    y: 415,
    homeX: 365,
    homeY: 415,
    name: "산책하는 아이",
    line: "오늘은 작은 행복을 세 개나 발견했어요!",
    color: "#e7c88b",
    phase: 4.1,
  },
];
let villageTime = 0;
const villageBuildings = [
  { x: 80, y: 100, w: 122, h: 92, kind: "flower", label: "달빛 꽃집" },
  { x: 528, y: 93, w: 148, h: 106, kind: "post", label: "마을 우체국" },
  { x: 72, y: 353, w: 110, h: 101, kind: "home", label: "작은 집" },
  { x: 565, y: 409, w: 124, h: 96, kind: "home", label: "숲속 집" },
];
// Village exploration: persistent letters, daily flowers, and residents.
let villageLetters = [],
  villageFlowerDay = -1,
  villageFlowerCollected = false;
const villageFlowerSpot = { x: 292, y: 210 };
const villageToday = () => Math.floor(served / 5) + 1;
const villageNearBuilding = (kind) =>
  villageBuildings.find(
    (b) =>
      b.kind === kind &&
      Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h + 16)) < 85,
  );
const villageFlowerNear = () =>
  Math.hypot(p.x - villageFlowerSpot.x, p.y - villageFlowerSpot.y) < 65;
function openVillagePanel(html) {
  mode = "villageEvent";
  opened = true;
  overlay.style.display = "flex";
  keys.clear();
  modal.innerHTML = html;
  modal
    .querySelectorAll("[data-village-close]")
    .forEach((b) => (b.onclick = closeModal));
}
// First village quest: persistent separately from the existing save schema.
const lunaQuestKey = "emotion-apothecary-luna-quest-v1";
let lunaQuest = { stage: "locked", moonflower: 0 };
try {
  const stored = JSON.parse(localStorage.getItem(lunaQuestKey) || "null");
  if (
    stored &&
    ["locked", "accepted", "talked", "completed"].includes(stored.stage)
  ) {
    lunaQuest.stage = stored.stage;
    lunaQuest.moonflower = stored.stage === "completed" ? 1 : 0;
  }
} catch (e) {}
function saveLunaQuest() {
  try {
    localStorage.setItem(lunaQuestKey, JSON.stringify(lunaQuest));
  } catch (e) {}
}
function lunaQuestNotice(message) {
  const el = document.getElementById("status");
  if (el) el.textContent = message;
}

function acceptLunaQuest() {
  if (lunaQuest.stage !== "locked") return;
  lunaQuest.stage = "accepted";
  saveLunaQuest();
  playEffect("discover");
  lunaQuestNotice("새 의뢰: 달빛 꽃집의 루나를 만나 보세요.");
}
function completeLunaQuest() {
  if (lunaQuest.stage !== "talked" || !known.has("courage")) return false;
  lunaQuest.stage = "completed";
  lunaQuest.moonflower = 1;
  coins += 50;
  saveLunaQuest();
  save();
  playEffect("good");
  if (typeof showReaction === "function")
    showReaction("달빛꽃이 다시 빛나요! +50코인");
  lunaQuestNotice("달빛꽃을 되살렸어요! 50코인과 달빛꽃을 받았습니다.");
  return true;
}
function villageMailbox() {
  const today = villageToday();
  const getLetters = () =>
    villageLetters
      .map((letter, index) => ({ letter, index }))
      .filter(({ letter }) => letter.day <= villageToday())
      .reverse();
  function renderList() {
    const letters = getLetters();
    const questAvailable = lunaQuest.stage === "locked";
    const unreadCount =
      letters.filter(({ letter }) => !letter.read).length +
      (questAvailable ? 1 : 0);
    const questSlot = questAvailable
      ? `<button type="button" class="mail-slot is-new" id="lunaQuestLetter"><span class="mail-envelope"><span class="mail-envelope-fold"></span><span class="mail-envelope-seal"></span></span><span class="mail-slot-info"><strong>꽃집 루나</strong><small>특별한 부탁 · 새 편지</small></span><span class="mail-slot-mark">✦</span></button>`
      : "";
    const slots =
      questSlot +
      letters
        .map(
          ({ letter, index }) =>
            `<button type="button" class="mail-slot ${letter.read ? "is-read" : "is-new"}" data-letter-index="${index}"><span class="mail-envelope"><span class="mail-envelope-fold"></span><span class="mail-envelope-seal"></span></span><span class="mail-slot-info"><strong>${shopEscape(letter.name)}</strong><small>DAY ${letter.day} · ${letter.read ? "읽음" : "새 편지"}</small></span><span class="mail-slot-mark">${letter.read ? "✓" : "✦"}</span></button>`,
        )
        .join("");
    const emptySlots =
      !letters.length && !questAvailable
        ? `<div class="mail-empty"><div class="mail-empty-slot"><span>✧</span></div><div class="mail-empty-slot"><span>✧</span></div><div class="mail-empty-slot"><span>✧</span></div><p>아직 도착한 편지가 없어요.</p><small>누군가의 마음이 도착하기를 기다리는 중...</small></div>`
        : "";
    openVillagePanel(
      `<div class="mail-game"><div class="mail-game-top"><div class="mail-game-ornament">✦ ── ✉ ── ✦</div><h2>마음 우체국</h2><p>마음이 머무는 작은 편지 보관함</p></div><div class="mail-wood-frame"><div class="mail-wood-title"><span>LETTERS</span><span>${unreadCount} NEW</span></div><div class="mail-wood-inner">${slots}${emptySlots}</div><div class="mail-wood-bottom">✧ 작은 마음도 소중히 보관합니다 ✧</div></div><button type="button" class="mail-game-back" data-village-close>← 마을로 돌아가기</button></div>`,
    );
    modal.querySelectorAll("[data-letter-index]").forEach((button) => {
      button.onclick = () => renderLetter(Number(button.dataset.letterIndex));
    });
    const questButton = modal.querySelector("#lunaQuestLetter");
    if (questButton) questButton.onclick = renderQuestLetter;
  }
  function renderLetter(index) {
    const letter = villageLetters[index];
    if (!letter || letter.day > villageToday()) return;
    if (!letter.read) {
      letter.read = true;
      save();
    }
    openVillagePanel(
      `<div class="mail-game"><div class="mail-game-top"><div class="mail-game-ornament">✦ ── ✉ ── ✦</div><h2>도착한 편지</h2><p>DAY ${letter.day}</p></div><div class="mail-paper-frame"><div class="mail-paper"><div class="mail-paper-heading"><span>TO. 마녀님</span><span>✧</span></div><div class="mail-paper-divider"></div><p class="mail-paper-message">${shopEscape(letter.message)}</p><div class="mail-paper-signature">FROM. ${shopEscape(letter.name)}</div><div class="mail-paper-stamp">♥</div></div></div><button type="button" class="mail-game-back" id="mailBackToList">← 편지 보관함</button><button type="button" class="mail-game-exit" data-village-close>우체국 나가기</button></div>`,
    );
    modal.querySelector("#mailBackToList").onclick = renderList;
  }
  function renderQuestLetter() {
    if (lunaQuest.stage !== "locked") {
      renderList();
      return;
    }
    const message =
      "마녀님께.\n\n꽃집의 달빛꽃이 조금씩 빛을 잃고 있어요. 물을 주고 햇빛도 쬐어 주었지만 꽃은 점점 고개를 숙이네요.\n\n혹시 잠시 꽃집에 들러 주실 수 있을까요?\n\n루나 올림";
    openVillagePanel(
      `<div class="mail-game"><div class="mail-game-top"><div class="mail-game-ornament">✦ ── ✉ ── ✦</div><h2>특별한 편지</h2><p>달빛 꽃집에서 온 부탁</p></div><div class="mail-paper-frame"><div class="mail-paper"><div class="mail-paper-heading"><span>TO. 마녀님</span><span>✧</span></div><div class="mail-paper-divider"></div><p class="mail-paper-message">${shopEscape(message)}</p><div class="mail-paper-signature">FROM. 꽃집 루나</div><div class="mail-paper-stamp">♥</div></div></div><button type="button" class="mail-game-back" id="acceptLunaQuest">루나의 부탁 들어주기</button><button type="button" class="mail-game-exit" id="lunaQuestBack">← 편지함으로 돌아가기</button></div>`,
    );
    modal.querySelector("#acceptLunaQuest").onclick = () => {
      acceptLunaQuest();
      closeModal();
    };
    modal.querySelector("#lunaQuestBack").onclick = renderList;
  }
  renderList();
}
function villageFlowerVisit() {
  const today = villageToday();
  if (villageFlowerDay !== today) {
    villageFlowerDay = today;
    villageFlowerCollected = false;
  }
  // Keep the original daily flower gift available during the quest.
  function dailyFlower() {
    if (villageFlowerCollected) {
      openVillagePanel(
        '<h2>달빛 꽃집</h2><div class="dialogue">“오늘의 감정 꽃은 이미 챙겼구나. 내일 다시 들러 줘!”</div><button class="action" data-village-close>나가기</button>',
      );
      return;
    }
    const bonus = 5 + (today % 3) * 2;
    villageFlowerCollected = true;
    coins += bonus;
    save();
    playEffect("good");
    openVillagePanel(
      `<h2>오늘의 감정 꽃</h2><div class="dialogue">“오늘은 마음을 달래는 꽃이 피었단다. 작은 선물도 가져가렴!”</div><p>반짝이는 꽃을 발견했어요! +${bonus}코인</p><button class="action" data-village-close>고마워요</button>`,
    );
  }
  if (lunaQuest.stage === "locked") {
    dailyFlower();
    return;
  }
  if (lunaQuest.stage === "completed") {
    openVillagePanel(
      `<h2>달빛 꽃집 · 루나</h2><div class="dialogue">“마녀님 덕분에 달빛꽃이 다시 빛나요. 정말 고마워요!”</div><p>달빛꽃 보유: ${lunaQuest.moonflower}송이</p><button class="action" id="lunaDailyFlower">${villageFlowerCollected ? "오늘의 꽃 확인" : "오늘의 감정 꽃 받기"}</button><button class="action" data-village-close>나가기</button>`,
    );
    modal.querySelector("#lunaDailyFlower").onclick = dailyFlower;
    return;
  }
  const ready = lunaQuest.stage === "talked" && known.has("courage");
  const content =
    lunaQuest.stage === "accepted"
      ? "“마녀님, 편지를 읽어 주셨군요! 달빛꽃이 겁을 먹은 것처럼 꽃잎을 닫고 있어요. 두려움을 이겨 낼 감정이 필요할 것 같아요.”"
      : ready
        ? "“마녀님! 용기의 물약을 찾으셨군요. 달빛꽃도 다시 용기를 낼 수 있을 거예요!”"
        : "“달빛꽃이 아직 기다리고 있어요. 두려움을 다독여 줄 용기의 물약을 찾아 주세요.”";
  const primaryLabel =
    lunaQuest.stage === "accepted"
      ? "용기의 물약을 찾아볼게요"
      : ready
        ? "용기의 물약 건네주기"
        : "물약을 찾으러 가기";
  openVillagePanel(
    `<h2>달빛 꽃집 · 루나</h2><div class="dialogue">${content}</div><p class="hint">${lunaQuest.stage === "accepted" ? "힌트: 평온 + 두려움 → 용기" : "필요한 물약: 용기"}</p><button class="action" id="lunaQuestAction">${primaryLabel}</button><button class="action" id="lunaDailyFlower">${villageFlowerCollected ? "오늘의 꽃 확인" : "오늘의 감정 꽃 받기"}</button><button class="action" data-village-close>나가기</button>`,
  );
  modal.querySelector("#lunaDailyFlower").onclick = dailyFlower;
  modal.querySelector("#lunaQuestAction").onclick = () => {
    if (lunaQuest.stage === "accepted") {
      lunaQuest.stage = "talked";
      saveLunaQuest();
      lunaQuestNotice("퀘스트: 용기의 물약을 발견하고 꽃집으로 돌아오세요.");
      closeModal();
      return;
    }
    if (!ready) {
      closeModal();
      return;
    }
    if (!completeLunaQuest()) return;
    openVillagePanel(
      '<h2>✦ 빛을 되찾은 달빛꽃 ✦</h2><div class="dialogue">“와아...! 꽃이 다시 빛나고 있어요! 마녀님 덕분이에요. 이 꽃 한 송이는 마녀님께 드릴게요.”</div><p>퀘스트 완료! · 50코인 · 달빛꽃 1송이</p><button class="action" data-village-close>달빛꽃 받기</button>',
    );
  };
}
function recordVillageLetter(g, wasGood, wasHelpful) {
  if (!g) return;
  const msg = wasGood
    ? `마녀님, ${g.issue} 그날 제 마음을 알아주셔서 고마워요. 덕분에 작은 용기를 내 보았어요. 다음에 또 이야기 들려드릴게요.`
    : wasHelpful
      ? `마녀님, 그날 건네준 물약 덕분에 조금은 마음이 편해졌어요. 아직 천천히 나아가는 중이에요.`
      : `마녀님, 지난번 상담 이후 제 마음을 더 들여다보았어요. 다음에 만나면 다시 이야기해 보고 싶어요.`;
  villageLetters.push({
    name: g.name,
    message: msg,
    day: villageToday() + 1,
    read: false,
  });
  if (villageLetters.length > 24) villageLetters = villageLetters.slice(-24);
}
let villageNoticeUntil = 0;
const roomBounds = { left: 52, right: 748, top: 98, bottom: 520 }; // Strict room bounds: sprite remains fully within the visible room.
function keepWitchInside() {
  if (scene === "village") {
    p.x = Math.max(34, Math.min(766, p.x));
    p.y = Math.max(34, Math.min(545, p.y));
    return;
  }
  p.x = Math.max(roomBounds.left + 16, Math.min(roomBounds.right - 16, p.x));
  p.y = Math.max(
    roomBounds.top + 29,
    Math.min(p.x > 368 && p.x < 433 ? 530 : roomBounds.bottom - 20, p.y),
  );
}
function collide(x, y) {
  if (scene === "village") {
    if (x < 30 || x > 770 || y < 30 || y > 550) return true;
    // The river is solid except at the wooden bridge.
    if (x > 722 && (y < 272 || y > 353)) return true;
    return villageBuildings.some(
      (b) =>
        x + 10 > b.x + 5 &&
        x - 10 < b.x + b.w - 5 &&
        y + 8 > b.y + 12 &&
        y - 8 < b.y + b.h,
    );
  }
  let a = { x: x - p.w / 2, y: y - p.h / 2, w: p.w, h: p.h };
  if (
    x - 16 < roomBounds.left ||
    y - 29 < roomBounds.top ||
    x + 16 > roomBounds.right ||
    (y + 20 > roomBounds.bottom && !(x > 368 && x < 433 && y < 545))
  )
    return true;
  return (
    (shopOwned("shelfPlus") &&
      a.x < 181 &&
      a.x + a.w > 34 &&
      a.y < 244 &&
      a.y + a.h > 195) ||
    solid.some(
      (b) =>
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y,
    )
  );
}
function floor() {
  rect(0, 0, W, H, "#231c2c");
  rect(32, 62, 736, 483, "#5b3c45");
  for (let y = 64; y < 544; y += 32) {
    for (let x = 33; x < 767; x += 64) {
      rect(
        x + (Math.floor(y / 32) % 2) * 24,
        y,
        62,
        30,
        (x + y) % 3 === 0 ? "#75504e" : "#69474a",
      );
      rect(x + 3, y + 4, 24, 2, "#805655");
      rect(x + 34, y + 24, 22, 2, "#5b3c45");
    }
  }
  rect(0, 0, 800, 65, "#342b42");
  for (let x = 0; x < 800; x += 33) {
    rect(x, 47, 31, 13, "#4c3544");
    rect(x, 60, 31, 4, "#a16a62");
  }
  for (let y = 64; y < 546; y += 34) {
    rect(12, y, 14, 30, "#3a2b40");
    rect(774, y, 14, 30, "#3a2b40");
  }
  rect(0, 545, 800, 31, "#292332");
  rect(365, 540, 71, 18, "#aa7c6d");
  rect(374, 544, 53, 14, "#3a2b40");
  box(412, 365, 90, 63, "#8e6970", "#63455a");
  for (let i = 0; i < 4; i++) {
    rect(423 + i * 18, 375, 9, 42, "#aa7d80");
  }
}
function potion(x, y, col) {
  rect(x + 5, y, 7, 5, "#dfc29b");
  rect(x + 3, y + 5, 11, 4, "#e9c9b4");
  box(x, y + 9, 17, 21, col, "#d6b4c1");
  rect(x + 4, y + 13, 4, 4, "#fff0db");
}
function shelf(o) {
  box(o.x, o.y, o.w, o.h, "#86554a", "#4d3042");
  rect(o.x + 6, o.y + 8, o.w - 12, 9, "#ac7963");
  rect(o.x + 6, o.y + 35, o.w - 12, 7, "#b7846c");
  for (let i = 0; i < Math.floor((o.w - 20) / 25); i++) {
    potion(
      o.x + 11 + i * 25,
      o.y + 13,
      ["#ffca73", "#90c9e4", "#e69cc5", "#b49ce8", "#a7cfa4"][i % 5],
    );
  }
}
function plant(x, y) {
  // Hand-drawn pixel plant: all foliage uses rectangular pixels, no ellipses.
  const px = (dx, dy, w, h, color) => rect(x + dx, y + dy, w, h, color);
  // Pot, lip, soil and subtle highlights.
  px(5, 39, 34, 5, "#34283e");
  px(8, 44, 28, 12, "#543849");
  px(11, 44, 22, 10, "#a87460");
  px(15, 47, 5, 7, "#c18d71");
  px(8, 39, 28, 5, "#d0a082");
  px(12, 37, 20, 4, "#493644");
  // Pixel branches and dark silhouette.
  px(19, 20, 6, 21, "#5b453c");
  px(13, 25, 18, 5, "#5b453c");
  const blocks = [
    [12, 5, 18, 5, "#356e56"],
    [7, 10, 29, 7, "#356e56"],
    [3, 17, 38, 10, "#356e56"],
    [7, 27, 30, 7, "#356e56"],
    [13, 34, 19, 5, "#356e56"],
    [13, 7, 15, 5, "#5ca077"],
    [8, 13, 20, 7, "#5ca077"],
    [4, 20, 14, 8, "#5ca077"],
    [22, 19, 17, 9, "#4c916c"],
    [11, 28, 21, 6, "#4c916c"],
    [15, 10, 9, 6, "#8cc18a"],
    [7, 19, 8, 6, "#8cc18a"],
    [24, 15, 8, 5, "#8cc18a"],
    [15, 27, 7, 4, "#75b583"],
  ];
  blocks.forEach(([dx, dy, w, h, c]) => px(dx, dy, w, h, c));
  px(12, 17, 5, 4, "#a1d19a");
  px(27, 25, 5, 4, "#a1d19a");
}
function drawFurniture() {
  if (shopOwned("shelfPlus")) {
    // Distinct, glowing freestanding display: visible even on small mobile screens.
    box(31, 162, 153, 83, "#c18a67", "#ffe2a3");
    rect(38, 169, 139, 8, "#ffe6ac");
    rect(38, 208, 139, 7, "#ffe6ac");
    for (let i = 0; i < 5; i++)
      potion(
        45 + i * 27,
        174,
        ["#ff91d3", "#90d8ff", "#b8a3ff", "#a2f0be", "#ffd38c"][i],
      );
    for (let i = 0; i < 5; i++) {
      const glowX = 53 + i * 27;
      ellipse(glowX, 164 + Math.sin(time * 0.003 + i) * 3, 3, 3, "#fff0ad");
    }
    rect(58, 230, 100, 8, "#fff0c2");
    ctx.save();
    ctx.fillStyle = "#5c3854";
    ctx.font = "bold 12px Limgul, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MAGIC POTIONS", 108, 237);
    ctx.restore();
    if (shelfDisplayId && item(shelfDisplayId)) {
      const shown = item(shelfDisplayId);
      potion(100, 174, shown.color);
      ctx.save();
      ctx.fillStyle = "#fff0c9";
      ctx.textAlign = "center";
      ctx.font = "bold 12px Limgul, sans-serif";
      ctx.fillText(shown.name, 108, 155);
      ctx.restore();
    }
  }
  if (shopOwned("moonLamp")) {
    ellipse(675, 180, 45, 45, "#f4dba72a");
    ellipse(675, 165, 17, 17, "#ffe8ae");
    ellipse(683, 160, 15, 17, "#5b3c45");
    rect(674, 185, 3, 12, "#f7db9b");
  }
  for (const o of furniture) {
    if (o.type === "shelf") shelf(o);
    if (o.type === "table") {
      box(o.x, o.y + 21, o.w, o.h - 21, "#a77361", "#593949");
      rect(o.x + 9, o.y + 28, o.w - 18, 5, "#d59b75");
      potion(o.x + 19, o.y + 5, "#d59ac9");
      potion(o.x + 48, o.y + 3, "#93c7c0");
      if (o.x > 500) {
        rect(o.x + 81, o.y + 20, 35, 28, "#e7caa4");
        rect(o.x + 86, o.y + 24, 25, 2, "#b98783");
      }
    }
    if (o.type === "counter") {
      box(o.x, o.y + 8, o.w, o.h - 8, "#9b685c", "#513746");
      rect(o.x + 8, o.y + 14, o.w - 16, 8, "#d29a78");
      potion(o.x + 15, o.y - 8, "#a4c9c4");
    }
    if (o.type === "sofa") {
      box(o.x, o.y, o.w, o.h, "#a77789", "#503849");
      box(o.x + 8, o.y + 8, o.w - 16, o.h - 20, "#c995a4");
      rect(o.x + 14, o.y + 15, 20, 20, "#e2b1b1");
    }
    if (o.type === "plant") plant(o.x, o.y);
  }
}
function cauldron() {
  const o = furniture.find((v) => v.type === "cauldron");
  rect(o.x + 10, o.y + 63, 130, 34, "#493047");
  ellipse(397, 268, 72, 36, "#302839");
  ellipse(397, 251, 70, 31, "#a37b98");
  ellipse(397, 251, 61, 24, "#543b7a");
  ellipse(397, 250, 55, 18, shopOwned("goldPot") ? "#f1cc71" : "#9c6ec0");
  for (let i = 0; i < 9; i++) {
    let x = 355 + i * 11,
      y = 250 + Math.sin(time * 0.002 + i * 2) * 8;
    ellipse(x, y, 2 + (i % 3), 2 + (i % 2), i % 2 ? "#f1c5ff" : "#d69ef5");
  }
  rect(328, 253, 12, 27, "#302839");
  rect(454, 253, 12, 27, "#302839");
  ellipse(397, 288, 49, 15, "#33283c");
  rect(361, 290, 13, 13, "#33283c");
  rect(421, 290, 13, 13, "#33283c");
  for (let i = 0; i < 4; i++) {
    let yy = 220 - ((time * 0.018 + i * 23) % 58);
    ellipse(374 + i * 15, yy, 3, 3, "#d5a6ee");
  }
  text("✦", 397, 192, 21, "#ffe1a1");
}
function witch() {
  keepWitchInside();
  const x = Math.round(p.x),
    y = Math.round(p.y);
  const facing = p.dir; // 0 front, 1 back, 2 right, 3 left
  const moving = Math.abs(p.walk - (witch.lastWalk ?? p.walk)) > 0.001;
  witch.lastWalk = p.walk;
  const step = moving ? Math.sin(p.walk * 1.8) : 0;
  const bob = moving ? Math.abs(step) * 1.4 : 0;
  const py = y - bob;
  const hair = "#674666",
    hairLight = "#886184",
    skin = "#efc2a6";
  const robe = "#79619d",
    robeShade = "#594a80",
    boot = "#332b47";
  const hat = "#4b3b67",
    brim = "#352c4d";
  // Ground shadow and alternating feet (also visible from the back).
  ellipse(x, y + 15, 14, 4, "#382a3a");
  rect(x - 7, py + 11 + Math.max(0, step * 2), 6, 7, boot);
  rect(x + 2, py + 11 + Math.max(0, -step * 2), 6, 7, boot);
  if (facing === 0 || facing === 1) {
    // Front/back silhouettes are symmetrical; facial details only face front.
    rect(x - 10, py - 8, 20, 22, robeShade);
    rect(x - 8, py - 7, 16, 20, robe);
    rect(x - 13, py - 6 + step * 2, 4, 12, robeShade);
    rect(x + 9, py - 6 - step * 2, 4, 12, robeShade);
    if (facing === 0) {
      rect(x - 11, py - 19, 22, 19, hair);
      rect(x - 8, py - 17, 16, 15, skin);
      rect(x - 11, py - 13, 4, 13, hair);
      rect(x + 7, py - 13, 4, 13, hair);
      rect(x - 5, py - 11, 3, 3, "#3e3044");
      rect(x + 3, py - 11, 3, 3, "#3e3044");
      rect(x - 3, py - 5, 6, 2, "#cb8793");
      rect(x - 4, py + 1, 8, 3, "#d6b4a6");
    } else {
      // Back view: long flowing hair covers the face and part of the cloak.
      rect(x - 11, py - 19, 22, 23, hair);
      rect(x - 9, py - 12, 18, 20, hairLight);
      rect(x - 7, py - 9, 14, 17, hair);
      rect(x - 2, py - 8, 3, 13, "#9c7392");
      rect(x - 11, py + 5, 4, 6, hair);
      rect(x + 7, py + 5, 4, 6, hair);
    }
  } else {
    // A real side-profile sprite, mirrored for left/right.
    // All features are drawn in local right-facing coordinates.
    ctx.save();
    ctx.translate(x, 0);
    if (facing === 3) ctx.scale(-1, 1);
    const r = (xx, yy, w, h, c) => rect(xx, yy, w, h, c);
    r(-8, py - 7, 16, 21, robeShade);
    r(-6, py - 6, 13, 19, robe);
    r(-10, py - 4 + step * 2, 4, 12, robeShade); // rear arm
    r(7, py - 4 - step * 2, 4, 11, "#9076ae"); // forward arm
    r(-10, py - 19, 17, 20, hair);
    r(-4, py - 17, 13, 15, skin);
    r(7, py - 11, 4, 5, skin); // nose silhouette
    r(-10, py - 15, 5, 21, hairLight); // hair at back
    r(-9, py + 3, 4, 6, hair);
    r(4, py - 12, 3, 3, "#3e3044"); // visible eye
    r(7, py - 5, 3, 2, "#cb8793"); // side mouth
    ctx.restore();
  }
  // Hat has different trim and highlights in front, side, and back views.
  rect(x - 11, py - 22, 22, 6, hat);
  rect(x - 17, py - 24, 34, 6, brim);
  rect(x - 10, py - 32, 20, 10, hat);
  rect(x - 4, py - 40, 12, 10, hat);
  rect(x - 7, py - 26, 15, 3, "#a18bbd");
  if (facing === 0) rect(x + 4, py - 29, 5, 4, "#f1cb7e");
  if (facing === 1) rect(x - 7, py - 29, 5, 4, "#b8a1c8");
  if (facing === 2) rect(x + 7, py - 29, 4, 4, "#f1cb7e");
  if (facing === 3) rect(x - 11, py - 29, 4, 4, "#f1cb7e");
}
function decorations() {
  for (let i = 0; i < 4; i++) {
    rect(50 + i * 180, 73, 6, 10, "#e8c07b");
    rect(48 + i * 180, 82, 10, 10, "#f3d18c");
  }
  box(432, 89, 75, 61, "#7697a5", "#483b56");
  rect(439, 97, 61, 46, "#a5ced5");
  rect(467, 96, 5, 47, "#6c5869");
  rect(438, 116, 63, 5, "#6c5869");
  rect(463, 103, 8, 8, "#fff1cf");
  text("✧", 252, 213, 20, "#f6c99c");
  text("✧", 558, 359, 17, "#f6c99c");
}
// Floor mat: part of the room, not a camera-following overlay.
function drawEntranceMat() {
  box(338, 496, 126, 41, "#49354f", "#c6a27d");
  rect(344, 502, 114, 29, "#66516b");
  rect(348, 506, 106, 21, "#4b3a55");
  text("마음의 약국", 401, 520, 12, "#ffdfb0");
  rect(354, 525, 92, 2, "#d2ad88");
}
// The bell on the front counter summons the next visitor.
function drawCounterBell() {
  rect(400, 389, 24, 4, "#5b3c48");
  rect(405, 382, 14, 9, "#e9c478");
  rect(410, 378, 4, 5, "#fff0b2");
  rect(405, 389, 14, 3, "#a77d63");
}
function draw() {
  floor();
  decorations();
  drawFurniture();
  cauldron();
  witch();
}
const frameEl = document.getElementById("frame"),
  modal = document.getElementById("modal"),
  dayEl = document.getElementById("day");
const emotions = [
  { id: "joy", name: "기쁨", icon: "☀️", color: "#ffca73" },
  { id: "sad", name: "슬픔", icon: "💧", color: "#90c9e4" },
  { id: "love", name: "사랑", icon: "💗", color: "#e69cc5" },
  { id: "fear", name: "두려움", icon: "🌑", color: "#b49ce8" },
  { id: "anger", name: "분노", icon: "🔥", color: "#e58b76" },
  { id: "calm", name: "평온", icon: "🍃", color: "#a7cfa4" },
  { id: "longing", name: "그리움", icon: "🌙", color: "#8aa3d4" },
  { id: "courage", name: "용기", icon: "🦋", color: "#b4d6bd" },
  { id: "flutter", name: "설렘", icon: "✨", color: "#f4aacd" },
  { id: "regret", name: "후회", icon: "🥀", color: "#bb91a1" },
  { id: "attachment", name: "집착", icon: "🕸️", color: "#aa85b5" },
  { id: "hope", name: "희망", icon: "🌟", color: "#efce79" },
];
const recipes = {
  "joy|sad": "longing",
  "calm|fear": "courage",
  "joy|love": "flutter",
  "anger|sad": "regret",
  "fear|love": "attachment",
  "courage|joy": "hope",
  "longing|love": "flutter",
  "calm|regret": "hope",
};
