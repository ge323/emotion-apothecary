(() => {
  "use strict";
  const c = document.getElementById("game"),
    ctx = c.getContext("2d");
  if (!c || !ctx) {
    document.body.insertAdjacentHTML(
      "beforeend",
      "<p>게임 화면을 불러올 수 없습니다.</p>",
    );
    return;
  }
  ctx.imageSmoothingEnabled = false;
  const actionButton = document.getElementById("touchE"),
    overlay = document.getElementById("overlay"),
    status = document.getElementById("status");
  const W = 800,
    H = 576,
    T = 32;
  const reactionBubble = document.getElementById("reactionBubble");
  const miniDay = { set textContent(value) {} };
  let reactionUntil = 0,
    guestMood = "normal";
  // Original procedural soundtrack: no external files or network required.
  // Browsers require a real user gesture before audio playback can start.
  const soundButton = document.getElementById("soundBtn");
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let musicBus = null;
  let effectsBus = null;
  let soundEnabled = false;
  let musicTimer = null;
  let nextMusicTime = 0;
  let musicStep = 0;
  let MUSIC_STEP = 60 / 84 / 2; // 84 BPM, eighth notes
  let melody = [
    0,
    null,
    4,
    null,
    7,
    null,
    4,
    2,
    5,
    null,
    9,
    7,
    4,
    null,
    2,
    null,
    0,
    null,
    4,
    7,
    9,
    null,
    7,
    4,
    2,
    null,
    5,
    4,
    2,
    null,
    0,
    null,
  ];
  let bassNotes = [0, 5, 9, 7];
  const noteHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const tracks = [
    {
      id: "cozy",
      name: "🌙 포근한 마법 약국",
      bpm: 84,
      pitch: 0,
      wave: "sine",
      mel: [
        0,
        null,
        4,
        null,
        7,
        null,
        4,
        2,
        5,
        null,
        9,
        7,
        4,
        null,
        2,
        null,
        0,
        null,
        4,
        7,
        9,
        null,
        7,
        4,
        2,
        null,
        5,
        4,
        2,
        null,
        0,
        null,
      ],
      bass: [0, 5, 9, 7],
    },
    {
      id: "forest",
      name: "🌿 요정의 숲",
      bpm: 96,
      pitch: 12,
      wave: "sine",
      mel: [
        0,
        7,
        9,
        null,
        12,
        9,
        7,
        null,
        5,
        9,
        12,
        14,
        12,
        null,
        9,
        null,
        4,
        7,
        11,
        14,
        11,
        7,
        4,
        null,
        2,
        5,
        9,
        12,
        9,
        5,
        2,
        null,
      ],
      bass: [0, 5, 4, 2],
    },
    {
      id: "rain",
      name: "🌧️ 비 오는 약국",
      bpm: 68,
      pitch: -2,
      wave: "triangle",
      mel: [
        0,
        null,
        null,
        3,
        7,
        null,
        3,
        null,
        5,
        null,
        3,
        null,
        0,
        null,
        null,
        null,
        2,
        null,
        5,
        null,
        7,
        5,
        2,
        null,
        0,
        null,
        3,
        null,
        2,
        null,
        0,
        null,
      ],
      bass: [0, 5, 7, 3],
    },
    {
      id: "night",
      name: "✨ 별빛 연구실",
      bpm: 74,
      pitch: 7,
      wave: "sine",
      mel: [
        0,
        null,
        7,
        12,
        14,
        null,
        12,
        7,
        9,
        null,
        16,
        14,
        12,
        null,
        9,
        null,
        7,
        12,
        16,
        null,
        19,
        16,
        12,
        null,
        9,
        null,
        7,
        4,
        7,
        null,
        0,
        null,
      ],
      bass: [0, 9, 5, 7],
    },
    {
      id: "retro",
      name: "🎮 레트로 마녀의 하루",
      bpm: 126,
      pitch: 0,
      wave: "square",
      mel: [
        0,
        4,
        7,
        12,
        7,
        4,
        0,
        null,
        5,
        9,
        12,
        17,
        12,
        9,
        5,
        null,
        9,
        12,
        16,
        19,
        16,
        12,
        9,
        null,
        7,
        11,
        14,
        19,
        14,
        11,
        7,
        null,
      ],
      bass: [0, 5, 9, 7],
    },
  ];
  let trackPitch = 0,
    trackWave = "sine";
  let trackId = "cozy";
  try {
    const stored = localStorage.getItem("apothecary_bgm_track");
    if (tracks.some((t) => t.id === stored)) trackId = stored;
  } catch (e) {}
  function chooseTrack(id) {
    const track = tracks.find((t) => t.id === id) || tracks[0];
    trackId = track.id;
    melody = track.mel;
    bassNotes = track.bass;
    MUSIC_STEP = 60 / track.bpm / 2;
    trackPitch = track.pitch;
    trackWave = track.wave;
    musicStep = 0;
    if (audioContext) nextMusicTime = audioContext.currentTime + 0.2;
    try {
      localStorage.setItem("apothecary_bgm_track", track.id);
    } catch (e) {}
    document
      .querySelectorAll("[data-track]")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.track === trackId),
      );
  }
  const musicPanel = document.getElementById("musicPanel");
  const musicOptions = document.getElementById("musicOptions");
  musicOptions.innerHTML = tracks
    .map((t) => `<button type="button" data-track="${t.id}">${t.name}</button>`)
    .join("");
  musicOptions.addEventListener("click", (e) => {
    const b = e.target.closest("[data-track]");
    if (!b) return;
    chooseTrack(b.dataset.track);
    if (!soundEnabled) startSound();
  });
  document.getElementById("musicSelect").addEventListener("click", () => {
    musicPanel.hidden = false;
    document.getElementById("musicToggle").textContent = soundEnabled
      ? "음악 끄기"
      : "음악 켜기";
  });
  document.getElementById("musicClose").addEventListener("click", () => {
    musicPanel.hidden = true;
  });
  musicPanel.addEventListener("click", (e) => {
    if (e.target === musicPanel) musicPanel.hidden = true;
  });
  document.getElementById("musicToggle").addEventListener("click", () => {
    if (soundEnabled) stopSound();
    else startSound();
    document.getElementById("musicToggle").textContent = soundEnabled
      ? "음악 끄기"
      : "음악 켜기";
  });
  chooseTrack(trackId);

  function ensureAudio() {
    if (!AudioContextClass) return false;
    if (!audioContext) {
      audioContext = new AudioContextClass();
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 3;
      compressor.connect(audioContext.destination);
      musicBus = audioContext.createGain();
      effectsBus = audioContext.createGain();
      musicBus.gain.value = 0.16;
      effectsBus.gain.value = 0.27;
      musicBus.connect(compressor);
      effectsBus.connect(compressor);
    }
    if (audioContext.state === "suspended")
      audioContext.resume().catch(() => {});
    return true;
  }

  function tone(
    midi,
    at,
    duration,
    volume = 0.1,
    wave = "sine",
    bus = musicBus,
  ) {
    if (!audioContext || !bus) return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(noteHz(midi), at);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      at + 0.025,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  function scheduleMusic() {
    if (!soundEnabled || !audioContext || document.hidden) return;
    while (nextMusicTime < audioContext.currentTime + 0.16) {
      const step = musicStep % melody.length;
      const phrase = Math.floor(musicStep / 8) % bassNotes.length;
      const note = melody[step];
      if (note !== null)
        tone(
          72 + note + trackPitch,
          nextMusicTime,
          MUSIC_STEP * 1.5,
          0.09,
          trackWave,
        );
      if (step % 8 === 0) {
        const root = 48 + bassNotes[phrase];
        tone(root, nextMusicTime, MUSIC_STEP * 7, 0.07, "triangle");
        tone(root + 12, nextMusicTime + 0.08, MUSIC_STEP * 5, 0.025, "sine");
      }
      musicStep++;
      nextMusicTime += MUSIC_STEP;
    }
  }

  function startSound() {
    if (!ensureAudio()) {
      if (soundButton) soundButton.textContent = "소리 미지원";
      return;
    }
    soundEnabled = true;
    nextMusicTime = audioContext.currentTime + 0.06;
    if (soundButton) soundButton.textContent = "♫ 소리 끄기";
    soundButton?.setAttribute("aria-label", "음악과 효과음 끄기");
    if (!musicTimer) musicTimer = setInterval(scheduleMusic, 80);
    scheduleMusic();
  }

  function stopSound() {
    soundEnabled = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (audioContext) audioContext.suspend().catch(() => {});
    if (soundButton) soundButton.textContent = "♫ 소리 켜기";
    soundButton?.setAttribute("aria-label", "음악과 효과음 켜기");
  }

  function playEffect(name) {
    if (!soundEnabled || !audioContext || audioContext.state !== "running")
      return;
    const t = audioContext.currentTime + 0.012;
    if (name === "door") {
      tone(84, t, 0.32, 0.18, "sine", effectsBus);
      tone(91, t + 0.13, 0.48, 0.16, "sine", effectsBus);
    } else if (name === "brew") {
      [60, 64, 67, 72].forEach((m, i) =>
        tone(m, t + i * 0.105, 0.34, 0.11, "triangle", effectsBus),
      );
    } else if (name === "discover") {
      [72, 76, 79, 84, 88].forEach((m, i) =>
        tone(m, t + i * 0.12, 0.58, 0.13, "sine", effectsBus),
      );
    } else if (name === "blip") {
      tone(
        88 + Math.floor(Math.random() * 4),
        t,
        0.04,
        0.045,
        "square",
        effectsBus,
      );
    } else if (name === "fail") {
      tone(57, t, 0.24, 0.08, "triangle", effectsBus);
      tone(55, t + 0.13, 0.34, 0.07, "triangle", effectsBus);
    } else if (name === "serve") {
      tone(76, t, 0.23, 0.12, "sine", effectsBus);
      tone(79, t + 0.11, 0.32, 0.1, "sine", effectsBus);
    } else if (name === "good") {
      [72, 76, 79].forEach((m, i) =>
        tone(m, t + i * 0.12, 0.42, 0.13, "sine", effectsBus),
      );
    } else if (name === "leave") {
      tone(79, t, 0.2, 0.09, "sine", effectsBus);
      tone(72, t + 0.14, 0.3, 0.08, "sine", effectsBus);
    }
  }

  if (soundButton)
    soundButton.addEventListener("click", () =>
      soundEnabled ? stopSound() : startSound(),
    );
  // Start automatically on the first interaction when the browser permits it.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!soundEnabled && event.target !== soundButton) startSound();
    },
    { once: true },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (!soundEnabled && !event.repeat && event.key !== "Escape")
        startSound();
    },
    { once: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (!audioContext || !soundEnabled) return;
    if (document.hidden) audioContext.suspend().catch(() => {});
    else {
      audioContext
        .resume()
        .then(() => {
          nextMusicTime = audioContext.currentTime + 0.08;
        })
        .catch(() => {});
    }
  });
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

  // The first village quest uses its own save key, preserving existing v2 saves.
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
  } catch (e) {
    /* Ignore invalid quest saves. */
  }
  function saveLunaQuest() {
    try {
      localStorage.setItem(lunaQuestKey, JSON.stringify(lunaQuest));
    } catch (e) {
      /* Private browsing may disable storage. */
    }
  }
  function lunaQuestNotice(message) {
    const el = document.getElementById("status");
    if (el) el.textContent = message;
  }

  function lunaQuestReaction(message) {
    if (typeof showReaction === "function") showReaction(message);
    else lunaQuestNotice(message);
  }

  function lunaQuestReady() {
    return lunaQuest.stage === "talked" && known.has("courage");
  }
  // =====================================================================
  // 마음 우체국 2.0 : 우체국 의뢰 · 소포 배달 · 오늘의 편지 · 우표첩
  //  - 저장 키를 따로 사용해서 기존 세이브(v2, 루나 퀘스트)와 충돌하지 않아요.
  //  - 기존 편지함(상담 후기 편지 / 루나의 특별한 부탁)도 그대로 이어져요.
  // =====================================================================
  const postKey = "emotion-apothecary-post-v1";
  const postStamps = [
    {
      id: "first",
      name: "첫 배달",
      from: "우체부 모모의 첫 배달",
      kind: "star",
      color: "#8baed2",
    },
    {
      id: "riddle",
      name: "작은 행복",
      from: "산책하는 아이의 수수께끼",
      kind: "sun",
      color: "#e7c88b",
    },
    {
      id: "grandma",
      name: "보고 싶은 마음",
      from: "순이 할머니의 소포",
      kind: "drop",
      color: "#8aa3d4",
    },
    {
      id: "bori",
      name: "새 친구",
      from: "보리의 답장",
      kind: "leaf",
      color: "#a7cfa4",
    },
    {
      id: "library",
      name: "안도의 책장",
      from: "별빛 도서관의 부탁",
      kind: "bottle",
      color: "#b9d9c2",
    },
    {
      id: "night",
      name: "별빛 배달부",
      from: "모모의 별빛 배달",
      kind: "star",
      color: "#c6a2df",
    },
    {
      id: "unsent",
      name: "전하지 못한 편지",
      from: "모모의 3년 묵은 편지",
      kind: "heart",
      color: "#e69cc5",
    },
    {
      id: "moon",
      name: "달빛꽃",
      from: "꽃집 루나의 특별한 부탁",
      kind: "moon",
      color: "#d7a1b5",
    },
    {
      id: "daily5",
      name: "단골 우표",
      from: "오늘의 편지에 5번 답장하기",
      kind: "coin",
      color: "#eac56c",
    },
    {
      id: "daily15",
      name: "우체국 보물",
      from: "오늘의 편지에 15번 답장하기",
      kind: "chest",
      color: "#cda17a",
    },
  ];
  const postMilestones = [
    { n: 3, coins: 30 },
    { n: 6, coins: 60 },
    { n: 10, coins: 100, title: "명예 우체부" },
  ];
  const postEmoName = (id) => (item(id) ? item(id).name : id);

  // ---- 의뢰 편지 ---------------------------------------------------
  // step.type : deliver(배달) · quiz(수수께끼) · potion(물약 동봉) · reply(답장 쓰기)
  //             brew(연구해서 보내기) · ending(마지막 답신)
  const postMissions = [
    {
      id: "first_delivery",
      from: "우체부 모모",
      title: "첫 배달",
      unlock: () => true,
      reward: { coins: 5, stamp: "first" },
      steps: [
        {
          type: "deliver",
          text: "마녀님, 마음 우체국에 오신 걸 환영해요!\n\n오늘 가방을 정리하다가 아직 전하지 못한 소포 하나를 발견했어요. 꽃집 루나 씨에게 가는 작은 달빛 씨앗 봉투예요.\n\n제가 직접 가야 하는데 우체국을 비울 수가 없어서… 마녀님이 대신 전해 주시겠어요?\n\n우체부 모모 올림",
          parcel: { to: "꽃집 루나", kind: "person", name: "달빛 씨앗 봉투" },
          coins: 15,
          scene: {
            quote: true,
            intro:
              "어머, 마녀님! 그 봉투는… 혹시 제가 기다리던 달빛 씨앗인가요?",
            choices: [
              {
                label: "모모 씨가 마녀님께 전해 달라고 했어요.",
                reply:
                  "모모 씨는 늘 다정하다니까요. 마녀님도요. 덕분에 오늘 꽃집이 환해졌어요.",
              },
              {
                label: "씨앗이 활짝 필 거예요. 응원할게요!",
                reply: "정말요? 그 말만 들어도 벌써 꽃이 핀 것 같아요!",
                bonus: 3,
              },
              {
                label: "(말없이 봉투를 건넨다)",
                reply: "…고마워요. 말하지 않아도 마음이 전해지네요.",
              },
            ],
          },
        },
      ],
    },
    {
      id: "riddle",
      from: "산책하는 아이",
      title: "작은 행복 수수께끼",
      unlock: () => true,
      reward: { coins: 5, stamp: "riddle" },
      steps: [
        {
          type: "quiz",
          text: "마녀님께!\n\n저는 오늘 작은 행복을 세 개나 찾았어요. 그래서 수수께끼를 내 볼게요.\n\n‘비가 그친 하늘에 무지개가 떴어요. 아무도 웃으라고 하지 않았는데, 마음이 먼저 웃어 버렸어요.’\n\n이때 마음속에 찾아온 감정은 뭘까요?\n\n산책하는 아이가",
          options: ["joy", "fear", "anger", "sad"],
          answer: "joy",
          hint: "마음이 가벼워지는 쪽이에요!",
          coins: 8,
          done: "맞아요! 기쁨은 부르지 않아도 먼저 찾아오는 손님 같아요.\n\n앗, 그런데 수수께끼가 하나 더 떠올랐어요. 다음 편지를 기다려 주세요!",
        },
        {
          type: "quiz",
          text: "마녀님, 정답이에요!\n\n그럼 두 번째 수수께끼예요.\n\n‘캄캄한 밤길에 낯선 소리가 났어요. 그래도 딱 한 걸음만 더, 하고 발을 뗐어요.’\n\n그때 발을 떼게 해 준 감정은 뭘까요?\n\n산책하는 아이가",
          options: ["regret", "jealousy", "courage", "attachment"],
          answer: "courage",
          hint: "무서워도 한 걸음 내딛게 하는 마음이에요!",
          coins: 12,
          done: "역시 마녀님이에요! 이제 마녀님은 제 마음 읽기 친구예요.\n\n오늘 찾은 작은 행복 하나는 마녀님께 나눠 드릴게요.\n\n산책하는 아이가",
        },
      ],
    },
    {
      id: "grandma",
      from: "순이 할머니",
      title: "손주에게 보낼 소포",
      unlock: () => postDone("first_delivery"),
      reward: { coins: 10, stamp: "grandma" },
      steps: [
        {
          type: "potion",
          text: "마녀님, 안녕하세요.\n\n손주 녀석이 먼 나라로 공부하러 떠난 지 벌써 석 달이에요. 전화는 매주 오는데, 목소리를 들을수록 더 보고 싶어지네요.\n\n투정은 아니에요. 이 마음에 이름이 있다면 무엇일까 싶어서요.\n\n그 마음에 꼭 맞는 물약 한 병을 소포에 담아 손주에게 보내 주실 수 있을까요?\n\n순이 올림",
          prompt: "순이 할머니의 마음에 꼭 맞는 물약은 무엇일까요?",
          good: "longing",
          okay: ["nostalgia", "love", "comfort", "hope"],
          hint: "‘멀리 있어서 더 생각나는’ 쪽에 가까운 마음 같아요.",
          coins: { good: 30, okay: 15 },
          goodReply:
            "그리움… 그래요, 이 마음의 이름은 그리움이었군요. 이름을 알고 나니 한결 따뜻해요.\n\n손주에게 꼭 전할게요. 고마워요, 마녀님.\n\n순이 올림",
          okayReply:
            "보내 주신 물약, 마음이 따뜻해져요. 고마워요.\n\n그런데 이 마음의 이름은 조금 다른 것 같기도 해요. 그래도 손주에게 잘 전할게요.\n\n순이 올림",
        },
      ],
    },
    {
      id: "bori",
      from: "보리",
      title: "새 동네의 첫 친구",
      unlock: () => villageToday() >= 2 || postDone("riddle"),
      reward: { coins: 5, stamp: "bori" },
      steps: [
        {
          type: "reply",
          text: "마녀님, 잘 지내세요?\n\n저는 새 동네로 이사 온 지 한 달이 됐는데 아직 말을 걸 친구가 없어요.\n\n학교 앞 놀이터에서 매일 혼자 그네를 타요. 사실 오늘은 옆에 앉은 아이에게 처음으로 인사해 보려다가 못 했어요.\n\n마녀님이라면 저에게 뭐라고 답장해 주실 거예요?\n\n보리가",
          choices: [
            {
              label:
                "인사 한마디가 어려운 건 당연해요. 내일은 ‘안녕’ 한 글자만 해 봐요.",
              coins: 25,
              reply:
                "‘안녕’ 한 글자라면 할 수 있을 것 같아요!\n\n내일 그네 옆자리에 앉으면 꼭 해 볼게요. 고마워요, 마녀님.\n\n보리가",
              best: true,
            },
            {
              label: "그냥 먼저 말 걸면 되죠. 어렵지 않아요!",
              coins: 10,
              reply:
                "쉽다고 말씀해 주시니 조금 속상하지만… 그래도 해 볼게요.\n\n보리가",
            },
            {
              label: "친구는 천천히 생겨요. 지금은 혼자 시간을 즐겨 봐요.",
              coins: 15,
              reply:
                "그래요, 서두르지 않아도 되는 거군요. 마음이 조금 가벼워졌어요.\n\n보리가",
            },
          ],
        },
      ],
    },
    {
      id: "library",
      from: "별빛 도서관 사서",
      title: "도서관에 필요한 안도",
      unlock: () => villageToday() >= 3 || postDone("grandma"),
      reward: { coins: 10, stamp: "library" },
      steps: [
        {
          type: "brew",
          text: "마녀님께.\n\n시험 철이 되면 도서관이 한숨으로 가득 차요. 책장을 넘기는 손이 떨리는 아이들을 보면 제 마음도 조마조마하답니다.\n\n혹시 ‘안도’의 물약 한 병을 구해 주실 수 있을까요? 아이들이 책상에 앉았을 때, 후우— 하고 숨을 고를 수 있게요.\n\n별빛 도서관 사서 올림",
          need: "peace",
          hint: "평온과 희망을 함께 살펴보세요. (희망은 용기와 기쁨에서, 용기는 평온과 두려움에서 태어나요.)",
          coins: 35,
          done: "물약이 도착했어요! 오늘은 도서관에서 한숨 대신 작은 안도의 숨소리가 들려요.\n\n책장 맨 윗칸에 마녀님 이름으로 책 한 권을 꽂아 두었답니다.\n\n별빛 도서관 사서 올림",
        },
      ],
    },
    {
      id: "night_route",
      from: "우체부 모모",
      title: "별빛 배달 두 번",
      unlock: () => postDone("first_delivery") && postDone("riddle"),
      reward: { coins: 10, stamp: "night" },
      steps: [
        {
          type: "deliver",
          text: "마녀님, 오늘은 편지가 정말 많아서요. 부탁이 하나 더 있어요.\n\n산책하는 아이에게 가는 별모양 편지를 대신 전해 주시겠어요? 그 아이는 편지를 받으면 온 마을이 떠나가라 좋아하거든요.\n\n우체부 모모 올림",
          parcel: { to: "산책하는 아이", kind: "person", name: "별모양 편지" },
          coins: 12,
          scene: {
            quote: true,
            intro: "우와, 편지다! 저한테 온 거예요? 별 모양이에요!",
            choices: [
              {
                label: "마을에서 제일 먼저 열어 봐요.",
                reply: "네! 지금 바로 열어 볼게요. 작은 행복 네 개째예요!",
              },
              {
                label: "소중한 편지니까 천천히 읽어요.",
                reply:
                  "좋아요, 오늘 밤 잠들기 전에 읽을게요. 별이 보이는 창가에서요!",
                bonus: 2,
              },
            ],
          },
          done: "아이가 기뻐하는 걸 봤나요? 멀리서도 웃음소리가 들렸어요.\n\n마지막으로 하나만 더요. ‘작은 집’에 가는 엽서예요. 문 앞 우편함 대신 마녀님이 직접 전해 주시면 좋겠어요.\n\n우체부 모모 올림",
        },
        {
          type: "deliver",
          text: "마녀님, 아이가 기뻐하는 걸 봤나요? 멀리서도 웃음소리가 들렸어요.\n\n마지막으로 하나만 더요. ‘작은 집’에 가는 엽서예요. 우편함에 넣어도 되지만, 마녀님이 문 앞까지 가 주시면 더 좋을 것 같아요.\n\n우체부 모모 올림",
          parcel: { to: "작은 집", kind: "home", name: "별빛 엽서" },
          coins: 18,
          scene: {
            quote: false,
            intro:
              "문 앞에 서자 안쪽에서 따뜻한 불빛이 새어 나와요. 엽서를 어떻게 전할까요?",
            choices: [
              {
                label: "문틈 아래로 살며시 밀어 넣는다.",
                reply:
                  "엽서가 스르륵 안으로 들어가고, 잠시 뒤 문 너머에서 작은 웃음소리가 들렸어요.",
              },
              {
                label: "문을 두드리고 인사한다.",
                reply:
                  "문이 빼꼼 열리더니 반가운 얼굴이 엽서를 받아 갔어요. ‘우체국 분이 아니라 마녀님이시네요?’",
                bonus: 3,
              },
              {
                label: "우편함에 넣고 문패를 한 번 쓰다듬는다.",
                reply:
                  "우편함이 딸깍, 하고 작게 울렸어요. 이 집에 오늘 하루가 배달된 것 같아요.",
              },
            ],
          },
          done: "작은 집 분이 엽서를 받고 모모에게 안부를 전해 왔어요. ‘마녀님이 직접 오셨다니 놀랐다’고요.\n\n오늘 배달은 별빛처럼 반짝였어요. 고마워요, 마녀님!\n\n우체부 모모 올림",
        },
      ],
    },
    {
      id: "unsent_letter",
      from: "우체부 모모",
      title: "3년 묵은 편지",
      unlock: () => postDone("night_route") && villageToday() >= 4,
      reward: { coins: 30, stamp: "unsent" },
      steps: [
        {
          type: "potion",
          text: "마녀님, 부끄러운 이야기를 하나 해도 될까요?\n\n제 가방 맨 밑에는 3년 동안 전하지 못한 편지가 있어요. 숲속 집에 사는 분께 쓴 편지인데, 문 앞까지 갔다가도 번번이 돌아왔어요. 우체부가 편지를 못 전하다니 우습죠?\n\n이 마음을 이겨 낼 물약을 한 병 마련해 주실 수 있을까요?\n\n모모 올림",
          prompt: "편지를 전할 수 있게 도와줄 물약을 골라 주세요.",
          good: "courage",
          okay: ["determination", "confidence", "hope", "trust"],
          hint: "‘한 걸음 내딛게 해 주는’ 마음이 필요해 보여요.",
          coins: { good: 25, okay: 12 },
          goodReply:
            "후우… 가슴이 두근거려요. 그런데 이상하게 발걸음은 가벼워요.\n\n이번에는 정말 전할 수 있을 것 같아요. 편지를 마녀님께 맡길게요. 숲속 집까지 부탁드려요.\n\n모모 올림",
          okayReply:
            "고마워요, 마녀님. 마음이 한결 든든해졌어요.\n\n아직 조금 떨리지만… 편지를 마녀님께 맡길게요. 숲속 집까지 부탁드려요.\n\n모모 올림",
        },
        {
          type: "deliver",
          text: "마녀님, 여기 3년 묵은 편지예요. 봉투가 조금 낡았지만 마음은 그대로예요.\n\n숲속 집 문 앞에서 전해 주세요. 어떻게 전할지는 마녀님께 맡길게요.\n\n모모 올림",
          parcel: { to: "숲속 집", kind: "home", name: "3년 묵은 편지" },
          coins: 25,
          scene: {
            quote: false,
            intro:
              "숲속 집 문 앞에 섰어요. 3년 전 모모의 떨리던 손이 떠올라요. 편지를 어떻게 전할까요?",
            choices: [
              {
                label: "우편함에 조용히 넣는다.",
                reply:
                  "편지가 우편함 바닥에 닿는 소리가 났어요. 잠시 뒤, 집 안에 불이 하나 켜졌어요.",
              },
              {
                label: "문을 두드리고 직접 건넨다.",
                reply:
                  "문이 열리고, 오래 기다린 듯한 얼굴이 편지를 받아 들었어요. ‘드디어 왔군요.’",
                bonus: 5,
              },
              {
                label: "문 앞에 놓고 인기척만 남긴다.",
                reply:
                  "발걸음을 돌리는 순간, 등 뒤에서 문이 열리는 소리가 들렸어요.",
              },
            ],
          },
          done: "마녀님!\n\n숲속 집에서 답장이 도착했어요. 봉투 겉면에는 단 한 줄이 적혀 있었어요.\n\n‘기다리고 있었어요.’\n\n3년 동안 가방 맨 밑에 있던 건 편지가 아니라 제 용기였나 봐요. 마녀님 덕분에 이제 가방이 가벼워요.",
        },
        {
          type: "ending",
          text: "마녀님!\n\n숲속 집에서 답장이 도착했어요. 봉투 겉면에는 단 한 줄이 적혀 있었어요.\n\n‘기다리고 있었어요.’\n\n3년 동안 가방 맨 밑에 있던 건 편지가 아니라 제 용기였나 봐요. 마녀님 덕분에 이제 가방이 가벼워요.\n\n이 편지는 마녀님이 간직해 주세요.\n\n우체부 모모 올림",
          button: "✉ 편지 간직하기",
          coins: 20,
          done: "마녀님!\n\n숲속 집에서 답장이 도착했어요. 봉투 겉면에는 단 한 줄이 적혀 있었어요.\n\n‘기다리고 있었어요.’\n\n3년 동안 가방 맨 밑에 있던 건 편지가 아니라 제 용기였나 봐요. 마녀님 덕분에 이제 가방이 가벼워요.\n\n우체부 모모 올림",
        },
      ],
    },
  ];

  // ---- 오늘의 편지 (하루 한 통, 매일 다른 마음) --------------------------
  const postDailyPool = [
    {
      from: "새벽 빵집 주인",
      text: "마녀님, 오늘 첫 빵이 딱딱하게 구워졌어요. 괜찮다고 말하면서도 마음이 자꾸 가라앉네요.\n\n누군가 토닥여 주는 것 같은 따뜻함이 필요해요.",
      good: "comfort",
      okay: ["calm", "hope", "joy"],
      hint: "곁에서 토닥여 주는 따뜻함이 필요해 보여요.",
      goodReply:
        "포근해요… 마음이 따뜻한 빵 같아요. 내일은 더 부드러운 빵을 구울게요!",
      okayReply: "고마워요. 조금 힘이 나네요. 내일 다시 반죽해 볼게요.",
    },
    {
      from: "회의 전의 직장인",
      text: "10분 뒤에 중요한 회의가 있어요. 심장이 쿵쾅거려서 발표 자료가 눈에 안 들어와요.\n\n숨을 길게 고를 수 있으면 좋겠어요.",
      good: "calm",
      okay: ["courage", "confidence", "peace"],
      hint: "쿵쾅대는 마음을 가라앉혀 줄 잔잔함이 필요해요.",
      goodReply: "후우… 숨이 길어졌어요. 이제 자료가 읽혀요. 다녀올게요!",
      okayReply: "조금은 힘이 나요! 떨리지만 일단 가 볼게요.",
    },
    {
      from: "비 오는 월요일의 학생",
      text: "월요일인데 비까지 와서 하루 종일 잿빛이에요. 웃을 일이 하나도 없는 것 같아요.\n\n작은 웃음이라도 빌릴 수 있을까요?",
      good: "joy",
      okay: ["hope", "comfort", "gratitude"],
      hint: "마음에 햇살 한 조각이 필요해 보여요.",
      goodReply:
        "빗소리가 갑자기 노래처럼 들려요! 우산 위에서 톡톡 춤추는 것 같아요.",
      okayReply: "마음이 조금 밝아졌어요. 오늘은 따뜻한 차를 마셔야겠어요.",
    },
    {
      from: "참기만 한 사람",
      text: "울고 싶은데 눈물이 안 나요. 너무 오래 꾹 참기만 했나 봐요.\n\n마음껏 울 수 있는 용기가 필요해요.",
      good: "sad",
      okay: ["comfort", "calm", "empathy"],
      hint: "참아 온 마음이 흘러나올 수 있게 해 주는 감정이 필요해요.",
      goodReply:
        "…눈물이 나요. 이상하게 시원해요. 고마워요, 이제야 숨이 쉬어져요.",
      okayReply: "마음이 조금 풀렸어요. 눈물은 아직이지만, 곧 흐를 것 같아요.",
    },
    {
      from: "거절을 못 하는 사람",
      text: "부탁을 거절하지 못해서 매번 제가 손해만 봐요. 한 번쯤은 제대로 화를 내고 싶어요.\n\n건강한 화는 어떤 모양일까요?",
      good: "anger",
      okay: ["courage", "determination", "confidence"],
      hint: "‘싫어요’라고 말할 수 있게 해 주는 뜨거운 마음이 필요해요.",
      goodReply:
        "처음으로 ‘싫어요’라고 말해 봤어요. 손이 떨렸지만 속이 시원해요!",
      okayReply: "용기가 조금 생겼어요. 다음 부탁은 한 번 더 생각해 볼게요.",
    },
    {
      from: "혼자 사는 사람",
      text: "혼자 사는 집이 너무 조용해요. 누군가 제 이름을 불러 주었으면 좋겠어요.\n\n이 조용함을 따뜻하게 바꿀 수 있을까요?",
      good: "love",
      okay: ["comfort", "joy", "trust"],
      hint: "누군가를 향한, 혹은 누군가에게서 오는 따뜻한 마음이 필요해요.",
      goodReply:
        "집 안이 갑자기 포근해졌어요. 오늘은 안부 전화를 걸어 봐야겠어요!",
      okayReply: "마음이 조금 데워졌어요. 조용함도 나쁘지 않네요.",
    },
    {
      from: "겁 없는 모험가",
      text: "지난번에도 겁 없이 달려들다 크게 다쳤어요. 이제는 조심할 줄 아는 마음이 필요해요.\n\n두려움도 쓸모가 있겠죠?",
      good: "fear",
      okay: ["calm", "trust"],
      hint: "때로는 조심스러운 마음이 나를 지켜 줘요.",
      goodReply: "발밑이 보여요. 두려움도 저를 지켜 주는 친구였군요!",
      okayReply: "차분해져서 한 번 더 살펴볼 수 있겠어요. 고마워요.",
    },
    {
      from: "이사를 앞둔 사람",
      text: "다음 주에 낯선 도시로 이사를 가요. 설레기도 하지만 짐을 쌀수록 가슴이 먹먹해져요.\n\n한 걸음 내디딜 힘이 필요해요.",
      good: "courage",
      okay: ["hope", "confidence", "determination"],
      hint: "낯선 곳으로 걸어갈 힘을 주는 마음이 필요해요.",
      goodReply:
        "상자 위에 걸터앉아 웃었어요. 낯선 도시도 곧 익숙한 우리 동네가 되겠죠!",
      okayReply: "마음이 한결 든든해졌어요. 짐을 마저 싸 볼게요.",
    },
    {
      from: "취업 준비생",
      text: "취업 준비 2년째예요. 이번에도 떨어지고 나니 내일을 기다릴 힘이 없네요.\n\n그래도 완전히 포기하고 싶진 않아요.",
      good: "hope",
      okay: ["courage", "comfort", "determination"],
      hint: "내일을 기다릴 이유가 되어 줄 마음이 필요해요.",
      goodReply: "내일 아침이 조금 궁금해졌어요. 이력서를 다시 열어 볼게요!",
      okayReply: "힘이 조금 났어요. 오늘은 푹 쉬고 내일 다시 해 볼게요.",
    },
    {
      from: "시계를 간직한 손녀",
      text: "돌아가신 할아버지의 시계를 보면 마음이 시려요. 잊고 싶지는 않은데 자꾸 아파요.\n\n이 마음을 부드럽게 간직하고 싶어요.",
      good: "longing",
      okay: ["nostalgia", "comfort", "sad"],
      hint: "떠난 사람을 따뜻하게 떠올리게 해 주는 마음이 필요해요.",
      goodReply:
        "시계 소리가 할아버지 목소리 같아요. 아프기만 한 건 아니었네요.",
      okayReply: "마음이 조금 포근해졌어요. 시계를 소중히 닦아 둘게요.",
    },
    {
      from: "연락을 끊은 동생",
      text: "오랫동안 연락을 끊은 형에게 미안해요. 먼저 전화를 걸어야 하는데 번호만 쳐다보고 있어요.\n\n제 잘못을 인정하는 마음부터 필요한 것 같아요.",
      good: "regret",
      okay: ["forgiveness", "courage"],
      hint: "내가 한 일을 돌아보는 마음이 첫걸음이 될 거예요.",
      goodReply:
        "형에게 ‘미안해’라고 보냈어요. 답장은 아직이지만 마음이 가벼워졌어요.",
      okayReply: "조금 용기가 났어요. 천천히 정리해서 연락해 볼게요.",
    },
    {
      from: "평범한 하루의 직장인",
      text: "오늘은 아무 일도 없었어요. 좋은 일도, 나쁜 일도요. 그런데 그게 오히려 허전해요.\n\n평범한 하루를 소중히 여기는 마음을 배우고 싶어요.",
      good: "gratitude",
      okay: ["joy", "peace", "calm"],
      hint: "당연해 보이던 것들을 다시 보게 해 주는 마음이 필요해요.",
      goodReply:
        "아무 일 없던 하루가 선물 같아요. 따뜻한 저녁밥이 고마워졌어요!",
      okayReply: "마음이 편안해졌어요. 평범함도 나쁘지 않네요.",
    },
    {
      from: "같은 길만 걷는 사람",
      text: "매일 같은 길로 출근하고 같은 길로 퇴근해요. 너무 심심해서 하품이 나와요.\n\n오늘은 다른 골목으로 들어가 보고 싶어요.",
      good: "curiosity",
      okay: ["joy", "courage", "passion"],
      hint: "새로운 것이 궁금해지는 마음이 필요해요.",
      goodReply: "저 골목 끝엔 뭐가 있을까요? 오늘은 꼭 가 볼래요!",
      okayReply: "조금 신나요! 내일은 다른 길을 걸어 볼게요.",
    },
    {
      from: "친구를 걱정하는 사람",
      text: "친구가 요즘 많이 힘들다는데 어떤 말을 해야 할지 모르겠어요. 괜히 상처가 될까 봐 연락도 못 했어요.\n\n말보다 마음이 먼저 닿으면 좋겠어요.",
      good: "empathy",
      okay: ["comfort", "love", "calm"],
      hint: "상대의 마음 옆에 나란히 앉아 주는 감정이 필요해요.",
      goodReply: "‘그냥 옆에 있을게’라고 보냈어요. 친구가 바로 답장을 했어요!",
      okayReply: "한결 마음이 놓여요. 일단 안부부터 물어볼게요.",
    },
    {
      from: "발표를 마친 학생",
      text: "발표가 끝나자 모두가 박수를 쳐 줬는데 믿기지가 않아요. 운이 좋았던 것 같기도 하고요.\n\n제가 해낸 거라고 믿어도 될까요?",
      good: "confidence",
      okay: ["joy", "gratitude", "courage"],
      hint: "‘내가 해냈다’고 믿게 해 주는 단단한 마음이 필요해요.",
      goodReply: "맞아요, 제가 준비한 거였어요! 어깨가 쭉 펴져요!",
      okayReply: "기분이 좋아요. 천천히 믿어 볼게요!",
    },
  ];

  // ---- 저장 · 불러오기 ------------------------------------------------
  let post = {
    missions: {},
    stamps: [],
    parcel: null,
    daily: { day: 0, idx: -1, state: "none", tries: 0, result: "" },
    dailyDone: 0,
    albumClaimed: [],
  };
  try {
    const stored = JSON.parse(localStorage.getItem(postKey) || "null");
    if (stored && typeof stored === "object") {
      if (stored.missions && typeof stored.missions === "object")
        post.missions = stored.missions;
      if (Array.isArray(stored.stamps))
        post.stamps = stored.stamps.filter((id) =>
          postStamps.some((s) => s.id === id),
        );
      if (stored.parcel && typeof stored.parcel === "object")
        post.parcel = stored.parcel;
      if (stored.daily && typeof stored.daily === "object")
        post.daily = Object.assign(post.daily, stored.daily);
      post.dailyDone = Math.max(0, Number(stored.dailyDone) || 0);
      if (Number.isFinite(stored.lunaDoneDay))
        post.lunaDoneDay = stored.lunaDoneDay;
      if (Array.isArray(stored.albumClaimed))
        post.albumClaimed = stored.albumClaimed;
    }
  } catch (e) {
    /* Ignore invalid post office saves. */
  }
  function savePost() {
    try {
      localStorage.setItem(postKey, JSON.stringify(post));
    } catch (e) {
      /* Private browsing may disable storage. */
    }
  }
  function postState(id) {
    if (!post.missions[id])
      post.missions[id] = {
        step: 0,
        read: false,
        done: false,
        taken: false,
        tries: 0,
        result: "",
      };
    return post.missions[id];
  }
  function postDone(id) {
    return !!(post.missions[id] && post.missions[id].done);
  }
  function postMission(id) {
    return postMissions.find((m) => m.id === id);
  }
  function postAvailable() {
    return postMissions.filter((m) => postDone(m.id) || m.unlock());
  }

  // ---- 지난 편지함 ------------------------------------------------------
  // 읽은 편지가 일정 기간(하루 = 손님 5명) 지나면 편지함에서 지난 편지함으로 옮겨져요.
  // 아직 안 읽은 편지와 진행 중인 의뢰는 그대로 남아요.
  const postArchiveGuestDays = 3;
  const postArchiveMissionDays = 2;
  let postFromArchive = false;
  const postBack = () =>
    postFromArchive ? postRenderArchive() : postRenderList();
  function postNormalizeDays() {
    const today = villageToday();
    let dirty = false;
    postMissions.forEach((m) => {
      const st = post.missions[m.id];
      if (st && st.done && st.doneDay === undefined) {
        st.doneDay = today;
        dirty = true;
      }
    });
    if (lunaQuest.stage === "completed" && post.lunaDoneDay === undefined) {
      post.lunaDoneDay = today;
      dirty = true;
    }
    if (dirty) savePost();
  }
  const postLunaArchived = () =>
    lunaQuest.stage === "completed" &&
    post.lunaDoneDay !== undefined &&
    villageToday() - post.lunaDoneDay >= postArchiveMissionDays;
  const postMissionArchived = (m) => {
    const st = post.missions[m.id];
    return !!(
      st &&
      st.done &&
      st.doneDay !== undefined &&
      villageToday() - st.doneDay >= postArchiveMissionDays
    );
  };
  const postGuestArchived = (l) =>
    postLetterHere(l) &&
    !!l.read &&
    villageToday() - l.day >= postArchiveGuestDays;
  function postArchivedCount() {
    return (
      (postLunaArchived() ? 1 : 0) +
      postMissions.filter((m) => postMissionArchived(m)).length +
      villageLetters.filter((l) => postGuestArchived(l)).length
    );
  }

  // ---- 우표 · 수집 보상 ------------------------------------------------
  function postMilestoneLines() {
    const lines = [];
    postMilestones.forEach((ms) => {
      if (post.stamps.length >= ms.n && !post.albumClaimed.includes(ms.n)) {
        post.albumClaimed.push(ms.n);
        coins += ms.coins;
        lines.push(
          `🎖 우표 ${ms.n}장 수집 보상 +${ms.coins}코인${ms.title ? ` · 칭호 「${ms.title}」` : ""}`,
        );
      }
    });
    return lines;
  }
  function postGrantStamp(id) {
    if (!id || post.stamps.includes(id)) return [];
    const stamp = postStamps.find((s) => s.id === id);
    if (!stamp) return [];
    post.stamps.push(id);
    const lines = [`📮 우표 「${stamp.name}」을(를) 모았어요!`];
    postMilestoneLines().forEach((l) => lines.push(l));
    savePost();
    save();
    return lines;
  }
  function postStampBadge(id) {
    const s = postStamps.find((x) => x.id === id);
    if (!s) return "";
    return `<div class="po-stamp-new"><span class="po-stamp" style="--c:${s.color}">${pixelIcon(s.kind, s.color)}</span><strong>${shopEscape(s.name)}</strong></div>`;
  }
  // 예전에 이미 끝낸 루나 퀘스트의 우표를 조용히 이어 줍니다.
  function postSyncLegacy() {
    if (lunaQuest.stage === "completed" && !post.stamps.includes("moon")) {
      const lines = postGrantStamp("moon");
      if (lines.length) lunaQuestReaction(lines[0]);
    }
  }

  // ---- 오늘의 편지 ----------------------------------------------------
  function postEnsureDaily() {
    const today = villageToday();
    if (post.daily.day === today && post.daily.idx >= 0) return post.daily;
    const all = postDailyPool.map((d, i) => ({ d, i }));
    let list = all.filter(({ d }) => known.has(d.good));
    if (!list.length)
      list = all.filter(({ d }) => d.okay.some((id) => known.has(id)));
    if (!list.length) list = all;
    let pick = list[(today * 5 + 2) % list.length];
    if (pick.i === post.daily.idx && list.length > 1)
      pick = list[(list.indexOf(pick) + 1) % list.length];
    post.daily = {
      day: today,
      idx: pick.i,
      state: "new",
      tries: 0,
      result: "",
      seen: false,
    };
    savePost();
    return post.daily;
  }
  function postUnreadCount() {
    postNormalizeDays();
    let n = 0;
    if (lunaQuest.stage === "locked") n++;
    n += villageLetters.filter((l) => postLetterHere(l) && !l.read).length;
    postAvailable().forEach((m) => {
      const st = post.missions[m.id];
      if (!st || (!st.done && !st.read)) n++;
    });
    const dl = postEnsureDaily();
    if (dl.state === "new" && !dl.seen) n++;
    return n;
  }

  // ---- 화면 조각 -------------------------------------------------------
  function postShell(title, sub, body, foot) {
    return `<div class="mail-game"><div class="mail-game-top"><div class="mail-game-ornament">✦ ── ✉ ── ✦</div><h2>${title}</h2><p>${sub}</p></div>${body}${foot || ""}</div>`;
  }
  function postPaper(message, from) {
    return `<div class="mail-paper-frame"><div class="mail-paper"><div class="mail-paper-heading"><span>TO. 마녀님</span><span>✧</span></div><div class="mail-paper-divider"></div><p class="mail-paper-message">${shopEscape(message)}</p><div class="mail-paper-signature">FROM. ${shopEscape(from)}</div><div class="mail-paper-stamp">♥</div></div></div>`;
  }
  function postSlot(key, cls, name, sub, mark) {
    return `<button type="button" class="mail-slot ${cls}" data-post="${key}"><span class="mail-envelope"><span class="mail-envelope-fold"></span><span class="mail-envelope-seal"></span></span><span class="mail-slot-info"><strong>${shopEscape(name)}</strong><small>${shopEscape(sub)}</small></span><span class="mail-slot-mark">${mark}</span></button>`;
  }
  function postTabs(active) {
    const arc = postArchivedCount();
    return `<div class="po-tabs"><button type="button" class="po-tab ${active === "letters" ? "on" : ""}" data-po-tab="letters">✉ 편지함</button><button type="button" class="po-tab ${active === "archive" ? "on" : ""}" data-po-tab="archive">📦 지난 편지${arc ? ` ${arc}` : ""}</button><button type="button" class="po-tab ${active === "album" ? "on" : ""}" data-po-tab="album">📮 우표첩 ${post.stamps.length}/${postStamps.length}</button></div>`;
  }
  function postBind(map) {
    Object.entries(map).forEach(([sel, fn]) => {
      const el = modal.querySelector(sel);
      if (el) el.onclick = fn;
    });
  }
  function postBindTabs() {
    modal.querySelectorAll("[data-po-tab]").forEach((b) => {
      b.onclick = () =>
        b.dataset.poTab === "album"
          ? postRenderAlbum()
          : b.dataset.poTab === "archive"
            ? postRenderArchive()
            : postRenderList();
    });
  }
  function postRewardBlock(lines, stampId) {
    return `${lines.length ? `<div class="po-rewards">${lines.map((l) => `<div>${l}</div>`).join("")}</div>` : ""}${stampId ? postStampBadge(stampId) : ""}`;
  }
  function postStepStatus(m, st) {
    const step = m.steps[st.step];
    if (step.type === "deliver")
      return st.taken ? `배달 중 → ${step.parcel.to}` : "소포 받기";
    if (step.type === "brew")
      return known.has(step.need) ? "물약 보내기" : "물약 필요";
    if (step.type === "quiz") return "수수께끼";
    if (step.type === "ending") return "답신 도착";
    return "답장 필요";
  }

  // ---- 편지함 ---------------------------------------------------------
  function villageMailbox() {
    postFromArchive = false;
    postSyncLegacy();
    postRenderList();
  }
  function postRenderList() {
    const today = villageToday();
    const daily = postEnsureDaily();
    const dailyData = postDailyPool[daily.idx];
    const letters = villageLetters
      .map((letter, index) => ({ letter, index }))
      .filter(
        ({ letter }) => postLetterHere(letter) && !postGuestArchived(letter),
      )
      .reverse();
    const questUnread = lunaQuest.stage === "locked" ? 1 : 0;
    // 해야 할 편지(새 편지 · 진행 중)는 위, 끝낸 편지는 아래로 정렬합니다.
    const entries = [];
    const addSlot = (done, html) => entries.push({ done, html });
    if (!postLunaArchived())
      addSlot(
        lunaQuest.stage === "completed",
        postSlot(
          "luna",
          questUnread ? "is-new" : "is-read",
          "꽃집 루나",
          `특별한 부탁 · ${questUnread ? "새 편지" : "읽음"}`,
          questUnread ? "✦" : "✓",
        ),
      );
    addSlot(
      daily.state !== "new",
      postSlot(
        "daily",
        daily.state === "new" ? "is-new" : "is-read",
        dailyData.from,
        `오늘의 편지 · ${daily.state === "new" ? "답장 필요" : "답장 완료"}`,
        daily.state === "new" ? "✦" : "✓",
      ),
    );
    postAvailable()
      .filter((m) => !postMissionArchived(m))
      .forEach((m) => {
        const st = postState(m.id);
        if (st.done)
          addSlot(
            true,
            postSlot(
              `m:${m.id}`,
              "is-read",
              m.from,
              `의뢰 · ${m.title} · 완료`,
              "✓",
            ),
          );
        else if (!st.read)
          addSlot(
            false,
            postSlot(
              `m:${m.id}`,
              "is-new",
              m.from,
              `의뢰 · ${m.title} · 새 편지`,
              "✦",
            ),
          );
        else
          addSlot(
            false,
            postSlot(
              `m:${m.id}`,
              "is-new is-active",
              m.from,
              `의뢰 · ${m.title} · ${postStepStatus(m, st)}`,
              "✎",
            ),
          );
      });
    letters.forEach(({ letter, index }) => {
      addSlot(
        !!letter.read,
        postSlot(
          `g:${index}`,
          letter.read ? "is-read" : "is-new",
          letter.name,
          `DAY ${letter.day} · ${letter.read ? "읽음" : "새 편지"}${letter.replied ? " · 답장 완료" : ""}`,
          letter.read ? "✓" : "✦",
        ),
      );
    });
    const slots = [
      ...entries.filter((e) => !e.done).map((e) => e.html),
      ...entries.filter((e) => e.done).map((e) => e.html),
    ];
    const available = postAvailable();
    const unread = postUnreadCount();
    const doneCount = postMissions.filter((m) => postDone(m.id)).length;
    const lockedCount = postMissions.length - available.length;
    openVillagePanel(
      postShell(
        "마음 우체국",
        "마음이 머무는 작은 편지 보관함",
        `${postTabs("letters")}<div class="mail-wood-frame"><div class="mail-wood-title"><span>LETTERS</span><span>${unread} NEW</span></div><div class="mail-wood-inner">${slots.join("")}</div><div class="mail-wood-bottom">✧ 작은 마음도 소중히 보관합니다 ✧</div><div class="po-progress">의뢰 ${doneCount}/${postMissions.length}${lockedCount ? ` · 아직 도착하지 않은 편지 ${lockedCount}통` : ""}${post.parcel ? ` · 📦 배달 중: ${shopEscape(post.parcel.to)}` : ""}${postArchivedCount() ? ` · 지난 편지 ${postArchivedCount()}통은 보관 중` : ""}</div></div>`,
        `<button class="mail-game-back" data-village-close>← 마을로 돌아가기</button>`,
      ),
    );
    postBindTabs();
    postBindSlots(false);
  }
  function postBindSlots(fromArchive) {
    modal.querySelectorAll("[data-post]").forEach((b) => {
      b.onclick = () => {
        postFromArchive = fromArchive;
        const key = b.dataset.post;
        if (key === "luna") postRenderLuna();
        else if (key === "daily") postRenderDaily();
        else if (key.startsWith("m:")) postRenderMission(key.slice(2));
        else if (key.startsWith("g:"))
          postRenderGuestLetter(Number(key.slice(2)));
      };
    });
  }
  function postRenderArchive() {
    postFromArchive = true;
    postNormalizeDays();
    const items = [];
    if (postLunaArchived())
      items.push({
        order: post.lunaDoneDay,
        html: postSlot(
          "luna",
          "is-read",
          "꽃집 루나",
          "특별한 부탁 · 완료",
          "✓",
        ),
      });
    postMissions
      .filter((m) => postMissionArchived(m))
      .forEach((m) =>
        items.push({
          order: postState(m.id).doneDay,
          html: postSlot(
            `m:${m.id}`,
            "is-read",
            m.from,
            `의뢰 · ${m.title} · 완료`,
            "✓",
          ),
        }),
      );
    villageLetters.forEach((l, index) => {
      if (postGuestArchived(l))
        items.push({
          order: l.day,
          html: postSlot(
            `g:${index}`,
            "is-read",
            l.name,
            `DAY ${l.day} · 읽음${l.replied ? " · 답장 완료" : ""}`,
            "✓",
          ),
        });
    });
    items.sort((a, b) => b.order - a.order);
    openVillagePanel(
      postShell(
        "지난 편지",
        "읽은 지 오래된 편지는 이곳에 보관돼요",
        `${postTabs("archive")}<div class="mail-wood-frame"><div class="mail-wood-title"><span>ARCHIVE</span><span>${items.length}통</span></div><div class="mail-wood-inner">${items.length ? items.map((i) => i.html).join("") : `<div class="po-note">아직 보관된 편지가 없어요.<br>읽은 편지는 시간이 지나면 이곳으로 옮겨져요.</div>`}</div><div class="mail-wood-bottom">✧ 오래된 편지도 소중히 보관합니다 ✧</div></div>`,
        `<button class="mail-game-back" data-village-close>← 마을로 돌아가기</button>`,
      ),
    );
    postBindTabs();
    postBindSlots(true);
  }

  // ---- 루나의 특별한 부탁 (기존 퀘스트 그대로) -------------------------
  function postRenderLuna() {
    const message =
      "마녀님께.\n\n꽃집의 달빛꽃이 조금씩 빛을 잃고 있어요.\n물을 주고 햇빛도 쬐어 주었지만 꽃은 점점 고개를 숙이네요.\n\n혹시 잠시 꽃집에 들러 주실 수 있을까요?\n\n루나 올림";
    openVillagePanel(
      postShell(
        "특별한 편지",
        "달빛 꽃집에서 온 부탁",
        postPaper(message, "꽃집 루나"),
        `${lunaQuest.stage === "locked" ? '<button class="mail-game-back" id="lunaAccept">루나의 부탁 들어주기</button>' : '<button class="mail-game-back" id="lunaBack">← 편지 보관함</button>'}<button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
      ),
    );
    const accept = modal.querySelector("#lunaAccept");
    if (accept)
      accept.onclick = () => {
        if (lunaQuest.stage !== "locked") return;
        lunaQuest.stage = "accepted";
        saveLunaQuest();
        playEffect("discover");
        lunaQuestNotice("새로운 의뢰: 달빛 꽃집의 루나를 만나 보세요.");
        closeModal();
      };
    postBind({ "#lunaBack": postBack });
  }

  // ---- 상담 후기 편지 + 답장 쓰기 -----------------------------------
  // 손님마다 어울리는 말투가 달라요 (필요했던 감정에서 정해져요).
  const postToneGroups = {
    cheer: [
      "courage",
      "determination",
      "confidence",
      "passion",
      "hope",
      "curiosity",
      "joy",
    ],
    calm: ["calm", "peace", "fear", "anger", "jealousy", "attachment"],
  };
  const postToneName = {
    warm: "따뜻한 위로",
    cheer: "힘이 되는 응원",
    calm: "차분한 말",
  };
  function postToneFor(emotionId) {
    if (postToneGroups.cheer.includes(emotionId)) return "cheer";
    if (postToneGroups.calm.includes(emotionId)) return "calm";
    return "warm";
  }
  // 처방이 잘 맞았을 때 손님이 편지에 적는 후일담 (감정별)
  const postAfter = {
    joy: "오랜만에 마음에 햇살이 들었어요. 괜히 웃음이 나왔어요.",
    sad: "마음껏 울고 나니 속이 시원해졌어요.",
    love: "따뜻한 마음이 들어서 오랜만에 안부 전화를 걸어 보았어요.",
    fear: "조심스럽게 한 번 더 살펴볼 수 있게 됐어요.",
    anger: "하고 싶은 말을 제대로 꺼내 볼 수 있었어요.",
    calm: "숨을 고르고 차분하게 해낼 수 있었어요.",
    longing: "그리운 마음을 소중히 간직하기로 했어요.",
    courage: "떨렸지만 용기를 내서 한 걸음 내디뎠어요.",
    flutter: "간질간질한 이 기분이 설렘이라는 걸 알게 됐어요.",
    regret: "제 잘못을 돌아보고 진심으로 사과할 수 있었어요.",
    attachment: "꼭 쥐고 있던 걸 조금 느슨하게 놓아 보았어요.",
    hope: "내일이 조금 기다려지기 시작했어요.",
    trust: "닫혀 있던 마음의 문을 조금 열어 보았어요.",
    comfort: "포근한 기분으로 푹 잘 수 있었어요.",
    nostalgia: "오래된 사진을 꺼내 보며 웃을 수 있었어요.",
    confidence: "어깨를 펴고 당당하게 해낼 수 있었어요.",
    jealousy: "남과 비교하는 대신 제 것을 돌아볼 수 있었어요.",
    forgiveness: "마음에 얹혀 있던 돌을 내려놓을 수 있었어요.",
    gratitude: "당연하던 것들에게 고맙다고 말해 보았어요.",
    curiosity: "처음 가 보는 골목으로 들어가 보았어요.",
    determination: "마음먹은 일을 끝까지 해 보기로 했어요.",
    peace: "한시름 놓고 편안히 쉴 수 있었어요.",
    empathy: "친구 곁에 가만히 앉아 이야기를 들어 줄 수 있었어요.",
    passion: "하고 싶은 일에 다시 불이 붙었어요.",
  };
  const postGuestReplies = [
    {
      tone: "warm",
      label: "힘들었겠어요. 언제든 곁에서 이야기를 들어 줄게요.",
    },
    { tone: "cheer", label: "당신이라면 해낼 수 있어요. 마녀가 응원할게요!" },
    { tone: "calm", label: "서두르지 말고, 숨 한 번 고르고 천천히 가요." },
  ];
  const postReplyBack = {
    warm: "…마녀님 말씀이 마음에 오래 남아요. 정말 따뜻하네요.",
    cheer: "응원해 주셔서 힘이 났어요! 다시 한 번 해 볼게요!",
    calm: "차분한 말을 들으니 마음이 가라앉았어요. 고마워요.",
    other:
      "답장 고마워요. 마음에 닿기까지는 조금 더 걸릴 것 같지만, 잊지 않을게요.",
    plain: "답장 고마워요. 마음이 한결 놓였어요.",
  };
  function postRenderGuestLetter(index) {
    const letter = villageLetters[index];
    if (!letter || !postLetterHere(letter)) return;
    if (!letter.read) {
      letter.read = true;
      save();
    }
    const replyBlock = letter.replied
      ? `<div class="po-note">✓ 답장을 보냈어요.${letter.replyMatch === true ? " (마음이 닿았어요 💗)" : ""}</div>`
      : `<div class="po-note">✎ 어떤 말을 전할까요? ${shopEscape(letter.name)}님의 마음에 어울리는 말투를 골라 보세요. (최대 +8코인)</div><div class="po-choices">${postGuestReplies.map((r, i) => `<button type="button" class="po-choice" data-po-reply="${i}"><span>▸</span><b>[${postToneName[r.tone]}]</b>&nbsp;${r.label}</button>`).join("")}</div>`;
    openVillagePanel(
      postShell(
        "도착한 편지",
        `DAY ${letter.day}`,
        `${postPaper(letter.message, letter.name)}${replyBlock}`,
        `<button class="mail-game-back" id="mailBackToList">← 편지 보관함</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
      ),
    );
    postBind({ "#mailBackToList": postBack });
    modal.querySelectorAll("[data-po-reply]").forEach((b) => {
      b.onclick = () => {
        if (letter.replied) return;
        const r = postGuestReplies[Number(b.dataset.poReply)];
        const hasTone = !!letter.tone;
        const match = hasTone && letter.tone === r.tone;
        const gain = !hasTone ? 5 : match ? 8 : 3;
        const back = !hasTone
          ? postReplyBack.plain
          : match
            ? postReplyBack[r.tone]
            : postReplyBack.other;
        letter.replied = true;
        letter.replyMatch = hasTone ? match : null;
        coins += gain;
        save();
        playEffect(match ? "discover" : "good");
        const lines = [
          `💰 +${gain}코인${match ? " · 마음이 닿았어요 💗" : ""}`,
        ];
        const hint =
          hasTone && !match
            ? `<div class="po-note">💡 ${shopEscape(letter.name)}님에게는 ${postToneName[letter.tone]}이(가) 더 잘 맞았을지도 몰라요.</div>`
            : "";
        openVillagePanel(
          postShell(
            "답장을 보냈어요",
            `${shopEscape(letter.name)}님께`,
            `<div class="po-note">🧙 내 답장 · ${shopEscape(r.label)}</div>${postPaper(back, letter.name)}${postRewardBlock(lines)}${hint}`,
            `<button class="mail-game-back" id="mailBackToList2">← 편지 보관함</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
          ),
        );
        postBind({ "#mailBackToList2": postBack });
      };
    });
  }

  // ---- 물약 고르기 (의뢰 · 오늘의 편지 공용) ---------------------------
  let postSel = null;
  function postPotionQuality(cfg, id) {
    if (id === cfg.good) return "good";
    if ((cfg.okay || []).includes(id)) return "okay";
    return ["fear", "anger", "attachment", "jealousy"].includes(id)
      ? "bad"
      : "miss";
  }
  function postRenderPotionPick(ctx) {
    const potions = uniqueKnownPotions();
    openVillagePanel(
      postShell(
        "물약 고르기",
        shopEscape(ctx.sub),
        `<div class="po-note">${shopEscape(ctx.cfg.prompt || "이 마음에 꼭 맞는 물약을 골라 편지와 함께 보내요.")}</div><div class="po-potions">${potions.map((e) => `<button type="button" class="po-potion ${postSel === e.id ? "on" : ""}" data-po-potion="${e.id}">${potionPixel(e)}<span>${e.name}</span></button>`).join("")}</div>`,
        `<button class="mail-game-back" id="poSend" ${postSel ? "" : "disabled"}>✉ 물약을 동봉해 보내기</button><button class="mail-game-exit" id="poPickBack">← 편지 다시 읽기</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
      ),
    );
    modal.querySelectorAll("[data-po-potion]").forEach((b) => {
      b.onclick = () => {
        postSel = b.dataset.poPotion;
        postRenderPotionPick(ctx);
      };
    });
    postBind({
      "#poPickBack": () => {
        postSel = null;
        ctx.back();
      },
      "#poSend": () => {
        if (!postSel) return;
        const id = postSel;
        const q = postPotionQuality(ctx.cfg, id);
        postSel = null;
        if (q === "good" || q === "okay") {
          ctx.solved(q, q === "good" ? ctx.cfg.goodReply : ctx.cfg.okayReply);
          return;
        }
        ctx.fail();
        playEffect("fail");
        const why =
          q === "bad"
            ? `${postEmoName(id)}의 물약은 오히려 마음을 더 무겁게 하는 것 같아요.`
            : `${postEmoName(id)}의 물약도 고맙지만, 마음에 꼭 맞지는 않아요.`;
        openVillagePanel(
          postShell(
            "답장이 도착했어요",
            "마음이 조금 달랐나 봐요",
            `<div class="po-note">${shopEscape(why)}</div><div class="po-note">💡 ${shopEscape(ctx.cfg.hint)}</div>`,
            `<button class="mail-game-back" id="poRetry">다른 물약 고르기</button><button class="mail-game-exit" id="poPickBack2">← 편지 다시 읽기</button>`,
          ),
        );
        postBind({
          "#poRetry": () => postRenderPotionPick(ctx),
          "#poPickBack2": ctx.back,
        });
      },
    });
  }

  // ---- 오늘의 편지 ----------------------------------------------------
  function postRenderDaily() {
    const d = postEnsureDaily();
    const data = postDailyPool[d.idx];
    const done = d.state === "done";
    if (!d.seen) {
      d.seen = true;
      savePost();
    }
    openVillagePanel(
      postShell(
        "오늘의 편지",
        `DAY ${villageToday()} · 하루에 한 통씩 도착해요`,
        `${postPaper(done ? d.result : data.text, data.from)}${done ? `<div class="po-note">✓ 오늘의 답장을 보냈어요. 손님 다섯 분을 처방하면 하루가 지나고 새 편지가 도착해요.<br>지금까지 답장한 편지 ${post.dailyDone}통</div>` : `<div class="po-note">✎ 마음에 꼭 맞는 물약을 동봉해 답장해 주세요.</div><button class="mail-game-back" id="poDailyPick">🧪 물약 골라 동봉하기</button>`}`,
        `<button class="mail-game-back" id="poBack">← 편지 보관함</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
      ),
    );
    postBind({ "#poBack": postRenderList });
    postBind({
      "#poDailyPick": () => {
        postSel = null;
        postRenderPotionPick({
          sub: data.from,
          cfg: { ...data, prompt: "이 편지에 꼭 맞는 물약을 골라 주세요." },
          back: postRenderDaily,
          fail: () => {
            d.tries++;
            savePost();
          },
          solved: (q, reply) => {
            const gain = q === "good" ? 12 + (d.tries === 0 ? 4 : 0) : 5;
            d.state = "done";
            d.result = reply;
            post.dailyDone++;
            coins += gain;
            const lines = [
              `💰 +${gain}코인${q === "good" && d.tries === 0 ? " (한 번에 맞혔어요!)" : ""}`,
            ];
            let stamp = null;
            if (post.dailyDone === 5) stamp = "daily5";
            if (post.dailyDone === 15) stamp = "daily15";
            if (stamp) postGrantStamp(stamp).forEach((l) => lines.push(l));
            savePost();
            save();
            playEffect(q === "good" ? "good" : "serve");
            openVillagePanel(
              postShell(
                "답장이 도착했어요",
                data.from,
                `${postPaper(reply, data.from)}${postRewardBlock(lines, stamp)}`,
                `<button class="mail-game-back" id="poBack3">← 편지 보관함</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
              ),
            );
            postBind({ "#poBack3": postRenderList });
          },
        });
      },
    });
  }

  // ---- 의뢰 편지 -------------------------------------------------------
  const postWrong = {};
  function postRenderMission(id) {
    const m = postMission(id);
    if (!m) return;
    const st = postState(id);
    if (!st.read && !st.done) {
      st.read = true;
      savePost();
    }
    const step = m.steps[Math.min(st.step, m.steps.length - 1)];
    const body = [];
    if (st.done) {
      body.push(`<div class="po-note">✓ 의뢰를 마쳤어요.</div>`);
    } else if (step.type === "deliver") {
      if (st.taken && (!post.parcel || post.parcel.mid !== m.id))
        st.taken = false;
      if (st.taken)
        body.push(
          `<div class="po-note">📦 「${shopEscape(step.parcel.name)}」을(를) <b>${shopEscape(step.parcel.to)}</b>에게 전해 주세요.<br>마을을 걸어 찾아가 오른쪽 버튼(E)을 누르면 돼요.</div>`,
        );
      else if (post.parcel)
        body.push(
          `<div class="po-note">이미 다른 소포를 들고 있어요. 먼저 전해 주고 다시 와요.</div>`,
        );
      else
        body.push(
          `<div class="po-note">📦 소포: ${shopEscape(step.parcel.name)} → ${shopEscape(step.parcel.to)}</div><button class="mail-game-back" id="poTake">📦 소포 받기</button>`,
        );
    } else if (step.type === "potion") {
      body.push(
        `<div class="po-note">✎ 마음에 꼭 맞는 물약을 동봉해 답장해 주세요.</div><button class="mail-game-back" id="poPotion">🧪 물약 골라 동봉하기</button>`,
      );
    } else if (step.type === "reply") {
      body.push(
        `<div class="po-note">✎ 어떤 답장을 보낼까요?</div><div class="po-choices">${step.choices.map((c, i) => `<button type="button" class="po-choice" data-po-choice="${i}"><span>▸</span>${c.label}</button>`).join("")}</div>`,
      );
    } else if (step.type === "quiz") {
      const key = `${id}:${st.step}`;
      const wrong = postWrong[key] || [];
      body.push(
        `<div class="po-note">❓ 정답이라고 생각하는 감정을 골라 보세요.${wrong.length ? `<br>💡 ${shopEscape(step.hint)}` : ""}</div><div class="po-potions">${step.options
          .map((oid) => {
            const e = item(oid);
            return `<button type="button" class="po-potion ${wrong.includes(oid) ? "off" : ""}" data-po-quiz="${oid}" ${wrong.includes(oid) ? "disabled" : ""}>${potionPixel(e)}<span>${e.name}</span></button>`;
          })
          .join("")}</div>`,
      );
    } else if (step.type === "brew") {
      const have = known.has(step.need);
      body.push(
        `<div class="po-note">필요한 물약: <b>${shopEscape(postEmoName(step.need))}</b> ${have ? "— 이미 연구해 두었어요!" : `<br>💡 ${shopEscape(step.hint)}<br>약국 가마솥에서 연구해 만들어 보세요.`}</div><button class="mail-game-back" id="poBrew" ${have ? "" : "disabled"}>🧪 ${shopEscape(postEmoName(step.need))}의 물약 보내기</button>`,
      );
    } else if (step.type === "ending") {
      body.push(
        `<button class="mail-game-back" id="poEnding">${step.button || "✉ 편지 간직하기"}</button>`,
      );
    }
    openVillagePanel(
      postShell(
        st.done ? "도착한 답신" : "의뢰 편지",
        shopEscape(m.title),
        `${postPaper(st.done ? st.result : step.text, m.from)}${body.join("")}`,
        `<button class="mail-game-back" id="poBack">← 편지 보관함</button><button class="mail-game-exit" data-village-close>우체국 나가기</button>`,
      ),
    );
    postBind({ "#poBack": postBack });

    postBind({
      "#poTake": () => {
        if (post.parcel) return;
        post.parcel = {
          mid: m.id,
          to: step.parcel.to,
          kind: step.parcel.kind,
          name: step.parcel.name,
        };
        st.taken = true;
        savePost();
        playEffect("discover");
        lunaQuestNotice(
          `📦 소포를 받았어요! ${step.parcel.to}에게 전해 주세요.`,
        );
        closeModal();
      },
      "#poPotion": () => {
        postSel = null;
        postRenderPotionPick({
          sub: m.title,
          cfg: step,
          back: () => postRenderMission(id),
          fail: () => {},
          solved: (q, reply) => {
            const gain = q === "good" ? step.coins.good : step.coins.okay;
            postFinishStep(m, reply, gain);
          },
        });
      },
      "#poBrew": () => {
        if (!known.has(step.need)) return;
        postFinishStep(m, step.done, step.coins);
      },
      "#poEnding": () => postFinishStep(m, step.done, step.coins),
    });
    modal.querySelectorAll("[data-po-choice]").forEach((b) => {
      b.onclick = () => {
        const c = step.choices[Number(b.dataset.poChoice)];
        postFinishStep(m, c.reply, c.coins);
      };
    });
    modal.querySelectorAll("[data-po-quiz]").forEach((b) => {
      b.onclick = () => {
        const key = `${id}:${st.step}`;
        if (b.dataset.poQuiz === step.answer) {
          const gain = (postWrong[key] || []).length
            ? Math.max(4, Math.floor(step.coins / 2))
            : step.coins;
          delete postWrong[key];
          postFinishStep(m, step.done, gain);
        } else {
          (postWrong[key] = postWrong[key] || []).push(b.dataset.poQuiz);
          playEffect("fail");
          postRenderMission(id);
        }
      };
    });
  }

  // 의뢰의 한 단계를 마쳤을 때 (보상 · 다음 편지 · 우표)
  function postFinishStep(m, reply, gain, speaker) {
    const st = postState(m.id);
    const lines = [];
    if (gain > 0) {
      coins += gain;
      lines.push(`💰 +${gain}코인`);
    }
    const last = st.step >= m.steps.length - 1;
    let stamp = null;
    if (last) {
      st.done = true;
      st.doneDay = villageToday();
      st.result = reply;
      st.read = true;
      st.taken = false;
      if (m.reward.coins) {
        coins += m.reward.coins;
        lines.push(`💰 의뢰 완료 보너스 +${m.reward.coins}코인`);
      }
      stamp = m.reward.stamp;
      postGrantStamp(stamp).forEach((l) => lines.push(l));
      playEffect("discover");
      showReaction(`의뢰 완료: ${m.title}`);
    } else {
      st.step++;
      st.read = false;
      st.taken = false;
      st.tries = 0;
      lines.push("✉ 새 편지가 도착했어요!");
      playEffect("good");
    }
    savePost();
    save();
    const asVillage = speaker === "village";
    if (asVillage) return { lines, stamp, last };
    openVillagePanel(
      postShell(
        last ? "의뢰 완료!" : "답장이 도착했어요",
        shopEscape(m.title),
        `${postPaper(reply, m.from)}${postRewardBlock(lines, stamp)}`,
        `${last ? "" : `<button class="mail-game-back" id="poNext">✉ 다음 편지 읽기</button>`}<button class="mail-game-${last ? "back" : "exit"}" id="poBack4">← 편지 보관함</button>${last ? `<button class="mail-game-exit" data-village-close>우체국 나가기</button>` : ""}`,
      ),
    );
    postBind({
      "#poNext": () => postRenderMission(m.id),
      "#poBack4": postRenderList,
    });
  }

  // ---- 우표첩 ---------------------------------------------------------
  function postRenderAlbum() {
    postSyncLegacy();
    const cards = postStamps
      .map((s) => {
        const got = post.stamps.includes(s.id);
        return `<div class="po-stamp-card ${got ? "got" : ""}"><span class="po-stamp" style="--c:${got ? s.color : "#7a6775"}">${pixelIcon(got ? s.kind : "mystery", got ? s.color : "#7a6775")}</span><strong>${got ? shopEscape(s.name) : "???"}</strong><small>${shopEscape(s.from)}</small></div>`;
      })
      .join("");
    const ms = postMilestones
      .map(
        (x) =>
          `<div class="po-mile ${post.albumClaimed.includes(x.n) ? "on" : ""}">${post.albumClaimed.includes(x.n) ? "✓" : "·"} 우표 ${x.n}장 · +${x.coins}코인${x.title ? ` · 칭호 「${x.title}」` : ""}</div>`,
      )
      .join("");
    const title = post.albumClaimed.includes(10)
      ? `<div class="po-title">🏅 마음 우체국 명예 우체부</div>`
      : "";
    openVillagePanel(
      postShell(
        "우표첩",
        "마음을 전할 때마다 우표가 한 장씩 모여요",
        `${postTabs("album")}${title}<div class="po-stamp-grid">${cards}</div><div class="po-miles">${ms}</div>`,
        `<button class="mail-game-back" data-village-close>← 마을로 돌아가기</button>`,
      ),
    );
    postBindTabs();
  }

  // ---- 소포 배달 --------------------------------------------------------
  function postParcelHere() {
    const par = post.parcel;
    if (!par || scene !== "village") return false;
    if (par.kind === "home")
      return villageBuildings.some(
        (b) =>
          b.kind === "home" &&
          b.label === par.to &&
          Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h + 16)) < 78,
      );
    const person = villagePeople.find((v) => v.name === par.to);
    if (!person) return false;
    if (Math.hypot(p.x - person.x, p.y - person.y) < 88) return true;
    return (
      par.to === "꽃집 루나" &&
      (!!villageNearBuilding("flower") || villageFlowerNear())
    );
  }
  function postTryDeliver() {
    const par = post.parcel;
    if (!par || !postParcelHere()) return false;
    const m = postMission(par.mid);
    const st = m && postState(m.id);
    const step = m && m.steps[st.step];
    if (!m || !step || step.type !== "deliver" || step.parcel.to !== par.to) {
      post.parcel = null;
      savePost();
      return false;
    }
    const sc = step.scene;
    const heading = par.kind === "home" ? par.to : par.to;
    openVillagePanel(
      `<h2>📦 ${shopEscape(heading)}</h2><div class="dialogue">${sc.quote ? `“${shopEscape(sc.intro)}”` : shopEscape(sc.intro)}</div><p class="hint">「${shopEscape(par.name)}」을(를) 어떻게 전할까요?</p>${sc.choices.map((c, i) => `<button class="action" data-po-hand="${i}">${shopEscape(c.label)}</button>`).join("")}<button data-village-close>나중에 전하기</button>`,
    );
    modal.querySelectorAll("[data-po-hand]").forEach((b) => {
      b.onclick = () => {
        const c = sc.choices[Number(b.dataset.poHand)];
        post.parcel = null;
        const out = postFinishStep(
          m,
          step.done || c.reply,
          (step.coins || 0) + (c.bonus || 0),
          "village",
        );
        savePost();
        const lines = out.lines;
        openVillagePanel(
          `<h2>${out.last ? "✦ 의뢰 완료 ✦" : "📦 배달 완료"}</h2><div class="dialogue">${sc.quote ? `“${shopEscape(c.reply)}”` : shopEscape(c.reply)}</div>${postRewardBlock(lines, out.stamp)}<p class="hint">${out.last ? "우체국 편지함에서 마지막 답신을 확인해 보세요." : "우체국에 새 편지가 도착했어요."}</p><button class="action" data-village-close>계속 걷기</button>`,
        );
      };
    });
    return true;
  }

  // ---- 마을 주민의 달라진 한마디 -------------------------------------
  function postVillagerLine(v) {
    const rules = {
      "꽃집 루나": [
        [
          () => postDone("first_delivery"),
          "달빛 씨앗이 잘 도착했어요. 우체국에서 마녀님 이야기를 자주 들었어요!",
        ],
        [
          () => lunaQuest.stage === "completed",
          "달빛꽃이 매일 밤 반짝여요. 마녀님이 오시면 꽃이 먼저 알아봐요.",
        ],
      ],
      "우체부 모모": [
        [
          () => postDone("first_delivery"),
          "마녀님 덕분에 오늘은 가방이 한결 가벼워요!",
        ],
        [
          () => postDone("night_route"),
          "별빛 배달, 정말 멋졌어요. 이제 우체국의 어엿한 단골이세요.",
        ],
        [
          () => postDone("unsent_letter"),
          "가방 맨 밑이 텅 비었어요. 이렇게 마음이 가벼울 수가 없네요.",
        ],
      ],
      "산책하는 아이": [
        [
          () => postDone("riddle"),
          "수수께끼를 맞히다니! 마녀님은 마음 읽기 달인이에요!",
        ],
        [
          () => postDone("night_route"),
          "별모양 편지를 받았어요! 오늘은 작은 행복이 네 개예요!",
        ],
      ],
    };
    let line = v.line;
    (rules[v.name] || []).forEach(([cond, text]) => {
      if (cond()) line = text;
    });
    const mail = v.name === "우체부 모모" ? postUnreadCount() : 0;
    return mail
      ? `${line}”<br>“참, 우체국에 마녀님께 온 새 편지가 ${mail}통 있어요.`
      : line;
  }
  // 새 편지가 있으면 우체국 지붕 위에 "!" 말풍선이 통통 떠올라요.
  function drawPostBubble() {
    if (!postUnreadCount()) return;
    const b = villageBuildings.find((x) => x.kind === "post");
    if (!b) return;
    const bob = Math.round(Math.sin(villageTime * 5) * 3);
    const cx = Math.round(b.x + b.w / 2);
    const top = b.y - 42 + bob;
    rect(cx - 15, top, 30, 28, "#3b2738");
    rect(cx - 13, top + 2, 26, 24, "#fff6dc");
    rect(cx - 5, top + 28, 10, 4, "#3b2738");
    rect(cx - 3, top + 28, 6, 3, "#fff6dc");
    rect(cx - 2, top + 32, 4, 3, "#3b2738");
    rect(cx - 2, top + 6, 4, 11, "#d1566f");
    rect(cx - 2, top + 19, 4, 4, "#d1566f");
  }
  function postMailHint() {
    if (post.parcel) return ` · 📦 ${post.parcel.to}에게 배달 중`;
    const n = postUnreadCount();
    return n ? ` · ✉ 새 편지 ${n}통` : "";
  }
  // =====================================================================

  function villageFlowerVisit() {
    const today = villageToday();
    if (villageFlowerDay !== today) {
      villageFlowerDay = today;
      villageFlowerCollected = false;
    }
    const questText = {
      locked:
        "“마녀님, 우체국에 편지를 맡겨 두었어요. 시간 나실 때 읽어 주세요.”",
      accepted:
        "“달빛꽃이 겁을 먹은 듯 꽃잎을 닫고 있어요. 두려운 마음을 이겨 낼 감정이 필요할 것 같아요.”",
      talked: known.has("courage")
        ? "“용기의 물약을 찾으셨군요! 달빛꽃에게 건네 주시겠어요?”"
        : "“평온과 두려움을 함께 살펴보면 용기의 물약을 찾을 수 있을 거예요.”",
      completed: "“마녀님 덕분에 달빛꽃이 다시 빛나고 있어요. 정말 고마워요!”",
    };
    openVillagePanel(`
    <h2>${pixelIcon("moon")} 달빛 꽃집 · 루나</h2>
    <div class="dialogue">${questText[lunaQuest.stage]}</div>
    ${lunaQuest.stage === "accepted" ? '<p class="hint">힌트: 평온 + 두려움 → 용기</p><button class="action" id="lunaTalk">용기의 물약을 찾아볼게요</button>' : ""}
    ${lunaQuestReady() ? '<button class="action" id="lunaDeliver">용기의 물약 건네주기</button>' : ""}
    ${lunaQuest.stage === "talked" && !known.has("courage") ? '<p class="hint">필요한 물약: 용기</p>' : ""}
    ${!villageFlowerCollected ? '<button class="action" id="lunaDailyFlower">오늘의 감정 꽃 받기</button>' : '<p class="hint">오늘의 감정 꽃은 이미 받았어요.</p>'}
    <button data-village-close>꽃집 나가기</button>
  `);
    const talk = modal.querySelector("#lunaTalk");
    if (talk)
      talk.onclick = () => {
        lunaQuest.stage = "talked";
        saveLunaQuest();
        lunaQuestNotice("퀘스트: 용기의 물약을 발견하고 꽃집으로 돌아오세요.");
        villageFlowerVisit();
      };
    const deliver = modal.querySelector("#lunaDeliver");
    if (deliver)
      deliver.onclick = () => {
        if (!lunaQuestReady()) return;
        lunaQuest.stage = "completed";
        lunaQuest.moonflower = 1;
        coins += 50;
        saveLunaQuest();
        save();
        playEffect("good");
        const lunaStampLines = postGrantStamp("moon");
        lunaQuestReaction("달빛꽃이 다시 빛나요! +50코인");
        openVillagePanel(`
      <h2>✦ 빛을 되찾은 달빛꽃 ✦</h2>
      <div class="dialogue">“와아...! 꽃이 다시 빛나고 있어요! 이 달빛꽃 한 송이는 마녀님께 드릴게요.”</div>
      <p>퀘스트 완료! · 50코인 · 달빛꽃 1송이</p>
      ${lunaStampLines.map((l) => `<p>${l}</p>`).join("")}
      <button class="action" data-village-close>달빛꽃 받기</button>`);
      };
    const daily = modal.querySelector("#lunaDailyFlower");
    if (daily)
      daily.onclick = () => {
        if (villageFlowerCollected) return;
        const bonus = 5 + (today % 3) * 2;
        villageFlowerCollected = true;
        coins += bonus;
        save();
        playEffect("good");
        openVillagePanel(`
      <h2>오늘의 감정 꽃</h2>
      <div class="dialogue">“오늘은 마음을 달래는 꽃이 피었단다. 작은 선물도 가져가렴!”</div>
      <p>반짝이는 꽃을 발견했어요! +${bonus}코인</p>
      <button class="action" id="lunaReturn">꽃집으로 돌아가기</button>
      <button data-village-close>마을로 나가기</button>`);
        modal.querySelector("#lunaReturn").onclick = villageFlowerVisit;
      };
  }

  // 모든 손님이 편지를 보내지는 않아요. 특별 손님과 인상 깊은 상담만 가끔,
  // 그리고 몇 번의 처방이 지난 뒤에 갑자기 도착해요.
  let postArrivalPending = 0;
  function recordVillageLetter(g, wasGood, wasHelpful) {
    if (!g) return;
    const chance = g.special ? 0.6 : wasGood ? 0.25 : wasHelpful ? 0.12 : 0.08;
    if (!g.special && served - consultLastLetter < 2) return; // 연달아 쌓이지 않게
    if (Math.random() >= chance) return;
    consultLastLetter = served;
    saveConsultVisits();
    const after = postAfter[g.good] || "작은 용기를 내 보았어요.";
    const msg = wasGood
      ? `마녀님, 지난번에는 정말 고마웠어요.\n\n덕분에 ${after}\n\n다음에 또 이야기 들려 드릴게요.`
      : wasHelpful
        ? `마녀님, 그날 건네주신 물약 덕분에 조금은 마음이 편해졌어요.\n\n아직 천천히 나아가는 중이에요. 이야기 들어 주셔서 고마워요.`
        : `마녀님, 지난번 상담 이후 제 마음을 더 들여다보았어요.\n\n다음에 만나면 다시 이야기해 보고 싶어요.`;
    const arriveAt = served + 1 + Math.floor(Math.random() * 3);
    villageLetters.push({
      name: g.name,
      message: msg,
      day: Math.floor(arriveAt / 5) + 1,
      arriveAt,
      notified: false,
      read: false,
      tone: postToneFor(g.good),
    });
    if (villageLetters.length > 40) villageLetters = villageLetters.slice(-40);
  }
  // 편지가 도착한 순간을 알려요 (손님을 배웅할 때 종소리 한 번)
  function postCheckArrivals() {
    villageLetters.forEach((l) => {
      if (l.arriveAt !== undefined && !l.notified && served >= l.arriveAt) {
        l.notified = true;
        postArrivalPending++;
      }
    });
  }
  function postLetterHere(l) {
    return l.arriveAt !== undefined
      ? served >= l.arriveAt
      : l.day <= villageToday();
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
    const facing =
      scene === "shop" && opened && mode === "talk" && guest ? 2 : p.dir; // 0 front, 1 back, 2 right, 3 left
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
  const guests = [
    {
      name: "서하",
      icon: "👩🏻",
      color: "#e3a8a2",
      issue:
        "좋아하는 사람 앞에만 서면 아무 말도 못 하겠어요. 제 마음을 조금 바꿀 수 있을까요?",
      good: "courage",
      lines: {
        courage: "저… 오늘은 제가 먼저 연락해 볼게요! 떨리지만 해보고 싶어요!",
        calm: "조급할 필요는 없겠네요. 제 마음을 천천히 알아볼래요.",
        love: "앗, 갑자기 너무 보고 싶어요! 지금 당장 찾아가야겠어요!",
        fear: "역시 거절당할까 봐 무서워요… 그냥 포기할래요.",
      },
    },
    {
      name: "도윤",
      icon: "🧑🏻",
      color: "#a7c4cb",
      issue:
        "중요한 발표를 앞두고 자꾸 실패하는 상상만 해요. 어떻게 하면 좋을까요?",
      good: "calm",
      lines: {
        calm: "후우… 이제 숨을 고를 수 있겠어요. 차근차근 준비할게요.",
        courage: "좋아요! 떨려도 무대에 올라가 볼게요!",
        fear: "으악, 더 무서워졌어요. 오늘은 못 할 것 같아요.",
        joy: "하하! 뭐든 잘될 것 같아요! 연습은… 내일 할까요?",
      },
    },
    {
      name: "미루",
      icon: "👧🏻",
      color: "#d2b2e0",
      issue: "멀리 떠난 친구가 자꾸 생각나요. 잊어야 하는 걸까요?",
      good: "longing",
      lines: {
        longing: "그리워해도 괜찮군요. 편지를 써볼래요.",
        hope: "다시 만날 날이 올 수도 있겠죠? 마음이 따뜻해요.",
        sad: "눈물이 나요… 그래도 소중한 기억이었어요.",
        anger: "왜 저만 두고 떠났을까요? 화가 나요!",
      },
    },
    {
      name: "하린",
      icon: "👩🏽",
      color: "#dfbd83",
      issue: "친구와 다투고 심한 말을 했어요. 사과하고 싶은데 용기가 안 나요.",
      good: "regret",
      lines: {
        regret: "제 잘못을 인정하고 진심으로 사과할게요.",
        courage: "맞아요. 먼저 찾아가서 이야기해 볼게요.",
        anger: "생각할수록 화가 나네요! 제가 왜 사과해야 하죠?",
        calm: "일단 마음을 가라앉히고, 내일 다시 생각해 볼게요.",
      },
    },
    {
      name: "루카",
      icon: "🧑🏼",
      color: "#b7cfa8",
      issue: "요즘 모든 게 재미없어요. 내일을 기다릴 이유가 있을까요?",
      good: "hope",
      lines: {
        hope: "작은 기대가 생겼어요. 내일은 산책을 해 볼래요.",
        joy: "오, 기분이 좀 나아졌어요! 오늘은 맛있는 걸 먹을래요.",
        calm: "잠깐 쉬어도 괜찮겠어요. 조금 편안해졌어요.",
        fear: "내일도 똑같을까 봐 무서워졌어요…",
      },
    },
  ];
  // 신규 감정: 발견한 감정을 다시 조합 재료로 사용할 수 있습니다.
  const extraEmotions = [
    ["trust", "신뢰", "🤝", "#9bcbbf"],
    ["comfort", "위로", "🧸", "#d8b2dc"],
    ["nostalgia", "향수", "🕰️", "#c9ad8e"],
    ["confidence", "자신감", "🌈", "#f0bd80"],
    ["jealousy", "질투", "💚", "#a9c27c"],
    ["forgiveness", "용서", "🕊️", "#c5d6ee"],
    ["gratitude", "감사", "🎁", "#edb7aa"],
    ["curiosity", "호기심", "🔍", "#b7b2e8"],
    ["determination", "결심", "⚔️", "#e8a28b"],
    ["peace", "안도", "🫖", "#b9d9c2"],
    ["empathy", "공감", "🫂", "#d5b3c8"],
    ["passion", "열정", "❤️‍🔥", "#e99c8d"],
  ];
  extraEmotions.forEach(([id, name, icon, color]) =>
    emotions.push({ id, name, icon, color }),
  );
  Object.assign(recipes, {
    "calm|love": "trust",
    "calm|sad": "comfort",
    "longing|sad": "nostalgia",
    "courage|hope": "confidence",
    "anger|love": "jealousy",
    "calm|regret": "forgiveness",
    "joy|trust": "gratitude",
    "fear|joy": "curiosity",
    "anger|courage": "determination",
    "calm|hope": "peace",
    "comfort|sad": "empathy",
    "courage|love": "passion",
    "love|trust": "comfort",
    "hope|sad": "empathy",
    "joy|regret": "gratitude",
    "fear|trust": "courage",
    "longing|hope": "peace",
    "anger|calm": "determination",
  });
  // 조합 키는 항상 알파벳순으로 정규화합니다.
  const normalizedRecipes = {};
  Object.entries(recipes).forEach(([key, result]) => {
    normalizedRecipes[key.split("|").sort().join("|")] = result;
  });
  Object.keys(recipes).forEach((key) => delete recipes[key]);
  Object.assign(recipes, normalizedRecipes);

  // 맵에 그려지는 손님과 같은 색상·얼굴 형태를 상담창에서도 사용합니다.
  // 외부 이미지가 필요 없는 픽셀 캔버스 초상화입니다.
  function drawGuestPortrait(canvas, person, mood = "normal") {
    const c = canvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    const pixel = (x, y, w, h, color) => {
      c.fillStyle = color;
      c.fillRect(x, y, w, h);
    };
    c.clearRect(0, 0, 48, 48);
    pixel(0, 0, 48, 48, "#72546d");
    pixel(3, 3, 42, 42, "#987c93");
    pixel(8, 36, 32, 12, person.color);
    pixel(13, 9, 22, 29, "#5b3a47");
    pixel(16, 15, 16, 21, "#f0c6ac");
    pixel(12, 8, 24, 9, "#5b3a47");
    pixel(12, 16, 5, 13, "#5b3a47");
    pixel(31, 16, 5, 13, "#5b3a47");
    if (mood === "happy") {
      pixel(19, 25, 4, 2, "#443443");
      pixel(27, 25, 4, 2, "#443443");
      pixel(22, 31, 7, 2, "#a14e69");
      pixel(23, 33, 5, 1, "#a14e69");
    } else if (mood === "surprised") {
      pixel(19, 24, 3, 5, "#443443");
      pixel(28, 24, 3, 5, "#443443");
      pixel(24, 31, 3, 4, "#a14e69");
    } else {
      pixel(19, 25, 3, 3, "#443443");
      pixel(28, 25, 3, 3, "#443443");
      pixel(23, 32, 5, 2, "#a14e69");
    }
    pixel(16, 30, 4, 2, "#e9a5a6");
    pixel(31, 30, 4, 2, "#e9a5a6");
  }
  function refreshGuestPortrait(mood = "normal") {
    const canvas = modal.querySelector(".portrait");
    if (canvas && guest) drawGuestPortrait(canvas, guest, mood);
  }
  let known = new Set(["joy", "sad", "love", "fear", "anger", "calm"]);
  let seen = new Set();
  let missionWins = 0,
    specialVisits = 0,
    lastOutcome = "good",
    missionRewardedDay = 0,
    resultDelta = 0,
    resultKind = "good";
  const missionEl = document.getElementById("mission");
  const specials = [
    {
      name: "달빛 우체부",
      icon: "✉️",
      color: "#a9b9e5",
      issue:
        "전하지 못한 편지가 있어요. 누군가를 다시 만날 용기를 얻고 싶어요.",
      good: "courage",
      lines: {
        courage: "좋아요. 이번에는 편지를 직접 전할게요!",
        fear: "편지를 더 깊숙이 숨겨야겠어요…",
      },
    },
    {
      name: "숲의 정령",
      icon: "🌿",
      color: "#8fc5a0",
      issue: "숲이 시끄러워 잠들지 못해요. 마음을 쉬게 해 줄 물약이 있나요?",
      good: "calm",
      lines: {
        calm: "숲의 바람이 다시 잔잔하게 들려요.",
        anger: "나뭇잎이 모두 붉게 물들 것 같아요!",
      },
    },
    {
      name: "별을 잃은 마법사",
      icon: "⭐",
      color: "#c6a2df",
      issue: "소중한 별을 잃어버렸어요. 다시 찾아 나설 힘이 필요해요.",
      good: "hope",
      lines: {
        hope: "아직 끝난 게 아니군요. 별을 찾아 떠나겠어요!",
        sad: "별을 생각하니 더 슬퍼져요…",
      },
    },
  ];
  // v2.4: one-time purchases. Old saves remain compatible.
  const shopGoods = [
    {
      id: "shelfPlus",
      category: "decor",
      name: "마법 진열대",
      icon: "🪵",
      price: 100,
      desc: "매일 새로운 감정 물약 1종 발견! 보유 물약을 전시하면 정확한 처방 시 +5코인",
    },
    {
      id: "moonLamp",
      category: "decor",
      name: "달빛 조명",
      icon: "🌙",
      price: 200,
      desc: "조명 근처에서 달빛 축복을 받아 매일 15코인 획득",
    },
    {
      id: "goldPot",
      category: "decor",
      name: "황금 가마솥",
      icon: "⚗️",
      price: 500,
      desc: "가마솥에서 연구할 때 추가 보상 + 정확한 처방 10코인",
    },
    {
      id: "spark",
      category: "potion",
      name: "설렘의 물약",
      icon: "💗",
      price: 150,
      desc: "새로운 감정 물약과 설렘을 고민하는 손님 해금",
    },
    {
      id: "serenity",
      category: "potion",
      name: "평온의 물약",
      icon: "🫧",
      price: 200,
      desc: "깊은 불안을 가라앉히는 물약과 손님 해금",
    },
    {
      id: "memory",
      category: "potion",
      name: "기억의 물약",
      icon: "🔮",
      price: 350,
      desc: "기억을 잃은 마법사의 특별한 사연 해금",
    },
  ];
  const shopPotions = [
    { id: "spark", name: "설렘", icon: "💗", color: "#e8a3c3" },
    { id: "serenity", name: "평온", icon: "🫧", color: "#a3c9e4" },
    { id: "memory", name: "기억", icon: "🔮", color: "#b6a2df" },
  ];
  shopPotions.forEach((e) => {
    if (!emotions.some((p) => p.id === e.id)) emotions.push(e);
  });
  // Rotating stock: new emotions appear every 10 real-world minutes.
  const RESTOCK_MS = 10 * 60 * 1000;
  const rotatingPotions = [
    {
      id: "courage",
      name: "용기",
      icon: "🦁",
      color: "#efbd74",
      price: 170,
      issue: "새로운 도전을 앞두고 자꾸 망설이게 돼요.",
      line: "두려워도 한 걸음 내디딜 수 있겠어요!",
    },
    {
      id: "comfort",
      name: "위로",
      icon: "🧸",
      color: "#e8b4a3",
      price: 190,
      issue: "오늘은 아무에게도 괜찮다는 말을 듣지 못했어요.",
      line: "따뜻하게 안아 주는 것 같아요.",
    },
    {
      id: "focus",
      name: "집중",
      icon: "📘",
      color: "#a6c7e8",
      price: 220,
      issue: "중요한 일을 앞두고 생각이 너무 흩어져요.",
      line: "마음이 맑아져서 다시 시작할 수 있겠어요.",
    },
    {
      id: "dream",
      name: "꿈",
      icon: "🌠",
      color: "#b6a7e9",
      price: 240,
      issue: "오랫동안 잊고 지낸 꿈을 다시 찾고 싶어요.",
      line: "내가 정말 원하던 게 떠올랐어요!",
    },
    {
      id: "trust",
      name: "믿음",
      icon: "🤝",
      color: "#a9d5ba",
      price: 260,
      issue: "친구와 오해가 생겨 다시 믿을 수 있을지 모르겠어요.",
      line: "천천히 다시 마음을 열어볼게요.",
    },
    {
      id: "wonder",
      name: "호기심",
      icon: "🔍",
      color: "#e3c58e",
      price: 280,
      issue: "세상 모든 것이 시시해진 것 같아요.",
      line: "새로운 것들을 발견하러 가고 싶어요!",
    },
    {
      id: "gratitude",
      name: "감사",
      icon: "🌻",
      color: "#e8cb83",
      price: 310,
      issue: "늘 곁에 있던 소중함을 잊고 있었어요.",
      line: "고마운 사람들에게 마음을 전해야겠어요.",
    },
    {
      id: "harmony",
      name: "화해",
      icon: "🕊️",
      color: "#b7d7dc",
      price: 330,
      issue: "소중한 사람에게 먼저 사과하고 싶지만 어려워요.",
      line: "이제 진심을 전할 용기가 났어요.",
    },
    {
      id: "starlight",
      name: "별빛",
      icon: "✨",
      color: "#d7b6ef",
      price: 370,
      issue: "어두운 밤이 길게만 느껴져요.",
      line: "작은 별빛이 제 길을 밝혀 주네요.",
    },
  ];
  rotatingPotions.forEach((e) => {
    if (!emotions.some((p) => p.id === e.id))
      emotions.push({ id: e.id, name: e.name, icon: e.icon, color: e.color });
  });
  let stockEpoch = -1,
    stockIds = [];
  function stockSeed(epoch) {
    let v = (epoch * 1664525 + 1013904223) >>> 0;
    return () => {
      v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
      return v / 4294967296;
    };
  }
  function refreshStock() {
    const epoch = Math.floor(Date.now() / RESTOCK_MS);
    if (stockEpoch === epoch && stockIds.length) return;
    const available = rotatingPotions.filter(
      (p) => !known.has(p.id) && !ownedShop.has(p.id),
    );
    const random = stockSeed(epoch);
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    stockIds = available.slice(0, 3).map((p) => p.id);
    stockEpoch = epoch;
    save();
  }
  function restockCountdown() {
    const remain = RESTOCK_MS - (Date.now() % RESTOCK_MS);
    return `${String(Math.floor(remain / 60000)).padStart(2, "0")}:${String(Math.floor((remain % 60000) / 1000)).padStart(2, "0")}`;
  }

  const shopGuests = [
    {
      name: "소이",
      icon: "💌",
      color: "#f1b1ca",
      issue:
        "오래 기다린 고백을 앞두고 있어요. 두근거리는 마음을 소중히 간직하고 싶어요.",
      good: "spark",
      lines: { spark: "이 두근거림도 제 마음이었군요. 용기 내서 전할게요!" },
    },
    {
      name: "이안",
      icon: "☁️",
      color: "#b5d7e7",
      issue: "작은 소리에도 마음이 불안해져요. 조용히 잠들고 싶어요.",
      good: "serenity",
      lines: {
        serenity: "마음에 잔잔한 호수가 생긴 기분이에요. 이제 쉬어볼래요.",
      },
    },
    {
      name: "기억을 잃은 마법사",
      icon: "🔮",
      color: "#b8a4db",
      special: true,
      issue:
        "내가 지키려던 가장 소중한 약속이 기억나지 않아요. 도와줄 수 있나요?",
      good: "memory",
      lines: { memory: "기억났어요! 이 약국에 다시 오겠다는 약속이었군요." },
    },
  ];
  rotatingPotions.forEach((e) =>
    shopGuests.push({
      name: `${e.name}을 찾는 여행자`,
      icon: e.icon,
      color: e.color,
      issue: e.issue,
      good: e.id,
      lines: { [e.id]: e.line },
    }),
  );
  let discoveryCounts = { pouch: 0, dust: 0, chest: 0 };
  let ownedShop = new Set(),
    shopTab = "decor",
    dailyShelfDay = -1,
    dailyLampDay = -1;
  let shelfDisplayId = null,
    shelfLastGift = null,
    heartCrystals = 0;
  function shopOwned(id) {
    return ownedShop.has(id);
  }
  function shopEscape(v) {
    return String(v).replace(
      /[&<>"']/g,
      (x) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[x],
    );
  }
  let guestIndex = 0,
    guest = null,
    guestPhase = "none",
    guestWait = 0,
    focus = 0,
    focusTarget = 0,
    selected = [],
    chosen = null,
    mode = "",
    reaction = "",
    coins = 0,
    served = 0,
    callDelay = 1.4,
    closeTimer = 0;
  try {
    const save = JSON.parse(
      localStorage.getItem("emotion-apothecary-v2") || "{}",
    );
    if (Array.isArray(save.known)) known = new Set([...known, ...save.known]);
    coins = Number(save.coins) || 0;
    villageLetters = Array.isArray(save.villageLetters)
      ? save.villageLetters
          .filter(
            (x) =>
              x &&
              typeof x.name === "string" &&
              typeof x.message === "string" &&
              Number.isFinite(x.day),
          )
          .slice(-40)
      : [];
    villageFlowerDay = Number.isFinite(save.villageFlowerDay)
      ? save.villageFlowerDay
      : -1;
    villageFlowerCollected = !!save.villageFlowerCollected;
    served = Number(save.served) || 0;
    guestIndex = Number(save.guestIndex) || 0;
    missionWins = Number(save.missionWins) || 0;
    missionCalendarDay = String(save.missionCalendarDay || missionDay());
    if (missionCalendarDay !== String(missionDay())) {
      missionWins = 0;
      missionCalendarDay = String(missionDay());
    }
    specialVisits = Number(save.specialVisits) || 0;
    missionRewardedDay = Number(save.missionRewardedDay) || 0;
    if (save.discoveryCounts && typeof save.discoveryCounts === "object") {
      for (const k of ["pouch", "dust", "chest"])
        discoveryCounts[k] = Math.max(0, Number(save.discoveryCounts[k]) || 0);
    }
    if (Array.isArray(save.ownedShop)) ownedShop = new Set(save.ownedShop);
    dailyShelfDay = Number.isFinite(save.dailyShelfDay)
      ? save.dailyShelfDay
      : -1;
    dailyLampDay = Number.isFinite(save.dailyLampDay) ? save.dailyLampDay : -1;
    shelfDisplayId =
      typeof save.shelfDisplayId === "string" ? save.shelfDisplayId : null;
    shelfLastGift = save.shelfLastGift || null;
    heartCrystals = Math.max(0, Number(save.heartCrystals) || 0);
    shopPotions.forEach((e) => {
      if (ownedShop.has(e.id)) known.add(e.id);
    });
    rotatingPotions.forEach((e) => {
      if (ownedShop.has(e.id)) known.add(e.id);
    });
  } catch (e) {}
  refreshStock();
  function save() {
    try {
      localStorage.setItem(
        "emotion-apothecary-v2",
        JSON.stringify({
          known: [...known],
          coins,
          served,
          guestIndex,
          missionWins,
          missionCalendarDay,
          specialVisits,
          missionRewardedDay,
          ownedShop: [...ownedShop],
          dailyShelfDay,
          dailyLampDay,
          shelfDisplayId,
          shelfLastGift,
          heartCrystals,
          discoveryCounts,
          accurateConsultations,
          villageLetters,
          villageFlowerDay,
          villageFlowerCollected,
        }),
      );
    } catch (e) {}
  }
  function item(id) {
    return emotions.find((x) => x.id === id);
  }
  function uniqueKnownPotions() {
    const names = new Set();
    return emotions.filter((e) => {
      if (!known.has(e.id)) return false;
      const key = e.name.trim().replace(/\s+/g, "");
      if (names.has(key)) return false;
      names.add(key);
      return true;
    });
  }
  // Each icon is drawn from a tiny 12x12 pixel grid, independent of OS emoji fonts.
  function pixelIcon(kind, color) {
    const patterns = {
      heart: [
        "............",
        "..XX....XX..",
        ".XXXX..XXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        ".....XX.....",
        "............",
        "............",
      ],
      sun: [
        ".....XX.....",
        ".....XX.....",
        "..X..XX..X..",
        "...XXXXXX...",
        "..XXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "..X..XX..X..",
        ".....XX.....",
        "............",
      ],
      drop: [
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...XXXXXX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        "............",
        "............",
      ],
      leaf: [
        ".........XX.",
        ".......XXXX.",
        ".....XXXXXX.",
        "...XXXXXXXX.",
        "..XXXXXXXX..",
        ".XXXXXXXX...",
        ".XXXXXXX....",
        "..XXXXX.....",
        "...XXX......",
        "....X.......",
        "............",
        "............",
      ],
      flame: [
        "......XX....",
        ".....XXX....",
        "....XXXX....",
        "...XXXXXX...",
        "....XXXXX...",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "....XXXX....",
        ".....XX.....",
        "............",
        "............",
      ],
      star: [
        ".....XX.....",
        ".....XX.....",
        ".....XX.....",
        "...XXXXXX...",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "...XXXXXX...",
        "....XXXX....",
        "...XX..XX...",
        "..XX....XX..",
        "............",
        "............",
      ],
      moon: [
        ".....XXXXX..",
        "...XXXXXX...",
        "..XXXXX.....",
        "..XXXX......",
        ".XXXX.......",
        ".XXXX.......",
        "..XXXX......",
        "..XXXXX.....",
        "...XXXXXX...",
        ".....XXXXX..",
        "............",
        "............",
      ],
      bottle: [
        "....XXXX....",
        "....XXXX....",
        "...XXXXXX...",
        "...X....X...",
        "..XX....XX..",
        "..XX....XX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "............",
      ],
      coin: [
        "....XXXX....",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "....XXXX....",
      ],
      mystery: [
        "............",
        "...XXXXXX...",
        "..XX....XX..",
        "......XX....",
        ".....XX.....",
        "....XX......",
        "....XX......",
        "............",
        "....XX......",
        "....XX......",
        "............",
        "............",
      ],
      chest: [
        "............",
        "............",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXX..XX..XXX",
        "XXX..XX..XXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "............",
      ],
      butterfly: [
        "............",
        "...X....X...",
        "..X......X..",
        ".XXX.XX.XXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXX..XXX..",
        ".XXXX..XXXX.",
        ".XXX....XXX.",
        "..X......X..",
        "............",
      ],
      shooting: [
        "........X...",
        "........X...",
        ".......XXX..",
        ".....XXXXXXX",
        ".......XXX..",
        "...X....X...",
        "..X..XX.X...",
        ".X..XX......",
        "X..XX.......",
        "..XX........",
        ".XX.........",
        "XX..........",
      ],
      crack: [
        "............",
        "..XX....XX..",
        ".XXXX..XXXX.",
        "XXXXXX.XXXXX",
        "XXXXX.XXXXXX",
        "XXXXXX.XXXXX",
        ".XXXXX.XXXX.",
        "..XXXX.XXX..",
        "...XXX.XX...",
        "....XX.X....",
        ".....XX.....",
        "............",
      ],
      lantern: [
        "............",
        "....XXXX....",
        "....X..X....",
        "..XXXXXXXX..",
        "..X..XX..X..",
        "..X.XXXX.X..",
        "..X.XXXX.X..",
        "..X..XX..X..",
        "..XXXXXXXX..",
        "...XXXXXX...",
        "............",
        "............",
      ],
      key: [
        "..XXXX......",
        ".XXXXXX.....",
        "XX....XX....",
        "XX....XX....",
        ".XXXXXX.....",
        "..XXXX......",
        "...XX.......",
        "...XXXXX....",
        "...XX.......",
        "...XXXXX....",
        "...XX.......",
        "............",
      ],
      teddy: [
        "............",
        "XXX......XXX",
        "XXXX....XXXX",
        ".XXXXXXXXXX.",
        ".XXXXXXXXXX.",
        ".XX.XXXX.XX.",
        ".XXXXXXXXXX.",
        ".XXXX..XXXX.",
        ".XXXX..XXXX.",
        ".XXXXXXXXXX.",
        "..XXXXXXXX..",
        "............",
      ],
      book: [
        "............",
        "..XXXXXXXXX.",
        ".XXXXXXXXXXX",
        ".XX.......XX",
        ".XX.XXXXX.XX",
        ".XX.......XX",
        ".XX.XXXXX.XX",
        ".XX.......XX",
        ".XXXXXXXXXXX",
        "..XXXXXXXXX.",
        "............",
        "............",
      ],
      crown: [
        "............",
        "............",
        "X....XX....X",
        "XX..XXXX..XX",
        "XXX.XXXX.XXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "............",
        "............",
        "............",
      ],
      eye: [
        "............",
        "............",
        "....XXXX....",
        "..XXXXXXXX..",
        ".XXXX..XXXX.",
        "XXX..XX..XXX",
        "XXX..XX..XXX",
        ".XXXX..XXXX.",
        "..XXXXXXXX..",
        "....XXXX....",
        "............",
        "............",
      ],
      rainbow: [
        "............",
        "....XXXX....",
        "..XXXXXXXX..",
        ".XXX....XXX.",
        ".XX.XXXX.XX.",
        "XXX.X..X.XXX",
        "XX.XX..XX.XX",
        "XX.X....X.XX",
        "XX.X....X.XX",
        "XX........XX",
        "............",
        "............",
      ],
      gift: [
        "............",
        "...XX..XX...",
        "..X..XX..X..",
        "..XXXXXXXX..",
        "XXXXX..XXXXX",
        "XXXXXXXXXXXX",
        ".XXXX..XXXX.",
        ".XXXX..XXXX.",
        ".XXXX..XXXX.",
        ".XXXX..XXXX.",
        ".XXXXXXXXXX.",
        "............",
      ],
      magnifier: [
        "..XXXXXX....",
        ".XX....XX...",
        "XX......XX..",
        "X........X..",
        "X........X..",
        "XX......XX..",
        ".XX....XXX..",
        "..XXXXXXXXX.",
        "........XXXX",
        ".........XXX",
        "..........XX",
        "............",
      ],
      flag: [
        "..XXXXXXXX..",
        "..XXXXXXXXX.",
        "..XXXXXXXX..",
        "..XXXXXXXXX.",
        "..XX........",
        "..XX........",
        "..XX........",
        "..XX........",
        "..XX........",
        "..XX........",
        ".XXXX.......",
        "XXXXXX......",
      ],
      cloud: [
        "............",
        "............",
        "............",
        "....XXX.....",
        "...XXXXX.XX.",
        ".XXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "............",
        "............",
        "............",
      ],
      bubble: [
        "............",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "XXX.XX.XX.XX",
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XXXX......",
        "...XXX......",
        "....XX......",
        "............",
        "............",
      ],
      bolt: [
        "............",
        ".....XXXXX..",
        "....XXXXX...",
        "...XXXXX....",
        "..XXXXXXXX..",
        ".....XXXXX..",
        "....XXXX....",
        "...XXXX.....",
        "..XXX.......",
        ".XX.........",
        "X...........",
        "............",
      ],
      hourglass: [
        "XXXXXXXXXXXX",
        ".XXXXXXXXXX.",
        "..XX.XX.XX..",
        "...XXXXXX...",
        "....XXXX....",
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "...XX.XXX...",
        "..XXXXXXXX..",
        ".XXXXXXXXXX.",
        "XXXXXXXXXXXX",
      ],
      target: [
        "............",
        "....XXXX....",
        "..XX....XX..",
        ".X..XXXX..X.",
        ".X.X....X.X.",
        "X.X..XX..X.X",
        "X.X..XX..X.X",
        ".X.X....X.X.",
        ".X..XXXX..X.",
        "..XX....XX..",
        "....XXXX....",
        "............",
      ],
      zzz: [
        ".....XXXXX..",
        "......XX....",
        ".....XX.....",
        ".....XXXXX..",
        "............",
        "XXXXXXXX....",
        "XXXXXXXX....",
        "....XX......",
        "...XX.......",
        "..XXXXXXXX..",
        "..XXXXXXXX..",
        "............",
      ],
      sparkle: [
        "............",
        ".....XX.....",
        ".....XX.....",
        "....XXXX....",
        "..XXXXXXXX..",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        "..XXXXXXXX..",
        "....XXXX....",
        ".....XX.....",
        ".....XX.....",
        "............",
      ],
      anchor: [
        ".....XX.....",
        "....X..X....",
        "....X..X....",
        ".....XX.....",
        "..XXXXXXXX..",
        ".....XX.....",
        ".....XX.....",
        "X....XX....X",
        "XX...XX...XX",
        ".XX..XX..XX.",
        "..XXXXXXXX..",
        "...XXXXXX...",
      ],
      rings: [
        "............",
        "............",
        "..XXXX.XXX..",
        ".XX..XXX.XX.",
        ".X...XXX..XX",
        "XX..XX.X...X",
        "XX..XX.X...X",
        ".X...XXX..XX",
        ".XX..XXX.XX.",
        "..XXXX.XXX..",
        "............",
        "............",
      ],
    };
    const pal = {
      heart: "#ef7eaa",
      sun: "#ffd06c",
      drop: "#80c8ee",
      leaf: "#8ed1a3",
      flame: "#f2a16e",
      star: "#f3d78a",
      moon: "#b4a5e5",
      bottle: "#b6a1e4",
      coin: "#eac56c",
      chest: "#cda17a",
      mystery: "#f5dfb9",
    };
    pixelIcon.patterns = patterns; // 물약 그리기 에디터가 기본 그림을 불러올 때 써요
    const rows = patterns[kind] || patterns.bottle;
    const fill = color || pal[kind] || pal.bottle;
    let rects = "";
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === "X")
          rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }),
    );
    return `<svg class="pixel-icon" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" fill="${fill}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  // 감정마다 어울리는 모양 (없으면 기본 병)
  const potionKinds = {
    joy: "sun",
    sad: "drop",
    love: "heart",
    fear: "moon",
    anger: "flame",
    calm: "leaf",
    courage: "star",
    longing: "shooting",
    flutter: "butterfly",
    spark: "butterfly",
    regret: "crack",
    attachment: "anchor",
    hope: "lantern",
    trust: "key",
    comfort: "teddy",
    nostalgia: "book",
    confidence: "crown",
    jealousy: "eye",
    forgiveness: "rainbow",
    gratitude: "gift",
    curiosity: "magnifier",
    wonder: "magnifier",
    determination: "flag",
    peace: "cloud",
    serenity: "leaf",
    empathy: "bubble",
    passion: "bolt",
    memory: "hourglass",
    focus: "target",
    dream: "zzz",
    harmony: "rings",
    starlight: "sparkle",
  };
  const potionKind = (id) => potionKinds[id] || "bottle";

  // ---- 내가 그린 물약 그림 (12x12, 칸마다 색 번호 1글자 = 144글자) ----
  // 0 = 빈 칸, 1 = 그 감정의 색, 2~13 = 고정 팔레트
  const iconKey = "emotion-apothecary-icons-v1";
  const drawPalette = [
    null,
    "emotion",
    "#fff0d8",
    "#2f2438",
    "#ffca73",
    "#f2a16e",
    "#e66b7a",
    "#e69cc5",
    "#b49ce8",
    "#80c8ee",
    "#8ed1a3",
    "#c99a72",
    "#9aa0b4",
    "#ffffff",
  ];
  let customIcons = {};
  try {
    const stored = JSON.parse(localStorage.getItem(iconKey) || "null");
    if (stored && typeof stored === "object")
      Object.entries(stored).forEach(([id, code]) => {
        if (
          typeof code === "string" &&
          /^[0-9a-d]{144}$/.test(code) &&
          /[1-9a-d]/.test(code)
        )
          customIcons[id] = code;
      });
  } catch (e) {}
  function saveCustomIcons() {
    try {
      localStorage.setItem(iconKey, JSON.stringify(customIcons));
    } catch (e) {}
  }
  function customIconSvg(code, emotionColor) {
    let rects = "";
    for (let i = 0; i < 144; i++) {
      const idx = parseInt(code[i], 36);
      if (!idx) continue;
      const color = idx === 1 ? emotionColor || "#b6a1e4" : drawPalette[idx];
      rects += `<rect x="${i % 12}" y="${Math.floor(i / 12)}" width="1" height="1" fill="${color}"/>`;
    }
    return `<svg class="pixel-icon" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  function potionPixel(e) {
    const mine = customIcons[e.id];
    if (mine) return customIconSvg(mine, e.color);
    return pixelIcon(potionKind(e.id), e.color);
  }
  function potionTile(e, attr, selectedClass = "") {
    return `<button type="button" class="potion-tile ${selectedClass}" ${attr} aria-label="${e.name}의 물약"><span class="bottle"><span class="bottle-neck"></span><span class="bottle-liquid" style="--liquid:${e.color}"></span><span class="bottle-spark">${potionPixel(e)}</span></span><span class="potion-label">${e.name}</span></button>`;
  }
  // =====================================================================
  // 물약 그리기 : 12x12 픽셀 에디터 (수첩 메뉴 > 🎨 물약 그리기)
  //  - 기본 그림은 그대로 두고, 내가 그린 그림만 따로 저장해요 (언제든 되돌릴 수 있어요).
  //  - 연필 · 지우개 · 채우기 · 좌우 대칭 · 되돌리기를 쓸 수 있어요.
  // =====================================================================
  let art = null; // { id, cells, color, tool, sym, history, painting }
  function drawDefaultCells(e) {
    pixelIcon("star"); // 패턴 목록을 준비해요
    const rows =
      pixelIcon.patterns[potionKind(e.id)] || pixelIcon.patterns.bottle;
    return rows.flatMap((r) => [...r].map((c) => (c === "X" ? 1 : 0)));
  }
  function drawEncode(cells) {
    return cells.map((n) => n.toString(36)).join("");
  }
  function openDrawPicker() {
    if (opened) return;
    mode = "draw";
    opened = true;
    overlay.style.display = "flex";
    keys.clear();
    renderDrawPicker();
  }
  function renderDrawPicker() {
    const list = uniqueKnownPotions();
    art = null;
    modal.innerHTML = `<h2>${pixelIcon("star")} 물약 그리기</h2>
      <p>물약에 나만의 그림을 그려 줄 수 있어요. 마음에 안 들면 언제든 기본 그림으로 되돌릴 수 있어요.</p>
      <div class="draw-view"><div class="draw-list">${list
        .map(
          (e) =>
            `<button type="button" class="draw-tile ${customIcons[e.id] ? "mine" : ""}" data-draw="${e.id}"><span class="draw-tile-icon">${potionPixel(e)}</span><span>${e.name}</span>${customIcons[e.id] ? "<i>내 그림</i>" : ""}</button>`,
        )
        .join("")}</div></div>
      <button type="button" id="drawClose">약국으로 돌아가기</button>`;
    modal
      .querySelectorAll("[data-draw]")
      .forEach((b) => (b.onclick = () => openDrawEditor(b.dataset.draw)));
    modal.querySelector("#drawClose").onclick = closeModal;
  }
  function openDrawEditor(id) {
    const e = item(id);
    if (!e) return;
    const code = customIcons[id];
    art = {
      id,
      cells: code ? [...code].map((c) => parseInt(c, 36)) : drawDefaultCells(e),
      color: 1,
      tool: "pen",
      sym: false,
      history: [],
      painting: false,
    };
    renderDrawEditor();
  }
  function renderDrawEditor() {
    const e = item(art.id);
    modal.innerHTML = `<h2>${potionPixel(e)} ${e.name}의 물약 그리기</h2>
      <div class="draw-view">
        <div class="draw-top">
          <canvas id="drawCanvas" width="240" height="240" aria-label="물약 그림 그리기 칸"></canvas>
          <div class="draw-preview"><div id="drawBottle"></div><div class="draw-mini" id="drawMini"></div><small>미리보기</small></div>
        </div>
        <div class="draw-palette">${drawPalette
          .map((c, i) =>
            i === 0
              ? ""
              : `<button type="button" class="swatch" data-color="${i}" style="background:${i === 1 ? e.color : c}" aria-label="${i === 1 ? "감정 색" : `색 ${i}`}">${i === 1 ? "✦" : ""}</button>`,
          )
          .join("")}</div>
        <div class="draw-tools">
          <button type="button" data-tool="pen">연필</button>
          <button type="button" data-tool="eraser">지우개</button>
          <button type="button" data-tool="fill">채우기</button>
          <button type="button" id="drawSym">좌우 대칭</button>
          <button type="button" id="drawUndo">되돌리기</button>
          <button type="button" id="drawClear">모두 지우기</button>
        </div>
        <div class="draw-actions">
          <button type="button" id="drawLoadDefault">기본 그림 불러오기</button>
          <button type="button" id="drawReset" ${customIcons[art.id] ? "" : "disabled"}>내 그림 지우기</button>
        </div>
      </div>
      <button type="button" id="drawSave">저장하기</button>
      <button type="button" id="drawBack">← 물약 목록</button>`;
    const canvas = modal.querySelector("#drawCanvas");
    const cellAt = (ev) => {
      const r = canvas.getBoundingClientRect();
      const cx = Math.min(
        11,
        Math.max(0, Math.floor(((ev.clientX - r.left) / r.width) * 12)),
      );
      const cy = Math.min(
        11,
        Math.max(0, Math.floor(((ev.clientY - r.top) / r.height) * 12)),
      );
      return cy * 12 + cx;
    };
    const push = () => {
      art.history.push(art.cells.slice());
      if (art.history.length > 40) art.history.shift();
    };
    const mirror = (i) => Math.floor(i / 12) * 12 + (11 - (i % 12));
    const flood = (start, to) => {
      const from = art.cells[start];
      if (from === to) return;
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        if (art.cells[i] !== from) continue;
        art.cells[i] = to;
        const x = i % 12;
        if (x > 0) stack.push(i - 1);
        if (x < 11) stack.push(i + 1);
        if (i >= 12) stack.push(i - 12);
        if (i < 132) stack.push(i + 12);
      }
    };
    const paint = (i) => {
      const value = art.tool === "eraser" ? 0 : art.color;
      if (art.tool === "fill") {
        flood(i, value);
        if (art.sym) flood(mirror(i), value);
      } else {
        art.cells[i] = value;
        if (art.sym) art.cells[mirror(i)] = value;
      }
      drawRefresh();
    };
    canvas.onpointerdown = (ev) => {
      ev.preventDefault();
      canvas.setPointerCapture(ev.pointerId);
      art.painting = true;
      push();
      paint(cellAt(ev));
    };
    canvas.onpointermove = (ev) => {
      if (art.painting && art.tool !== "fill") paint(cellAt(ev));
    };
    canvas.onpointerup = canvas.onpointercancel = () => (art.painting = false);
    modal.querySelectorAll("[data-color]").forEach(
      (b) =>
        (b.onclick = () => {
          art.color = Number(b.dataset.color);
          if (art.tool === "eraser") art.tool = "pen";
          drawRefresh();
        }),
    );
    modal.querySelectorAll("[data-tool]").forEach(
      (b) =>
        (b.onclick = () => {
          art.tool = b.dataset.tool;
          drawRefresh();
        }),
    );
    modal.querySelector("#drawSym").onclick = () => {
      art.sym = !art.sym;
      drawRefresh();
    };
    modal.querySelector("#drawUndo").onclick = () => {
      if (art.history.length) art.cells = art.history.pop();
      drawRefresh();
    };
    modal.querySelector("#drawClear").onclick = () => {
      push();
      art.cells = Array(144).fill(0);
      drawRefresh();
    };
    modal.querySelector("#drawLoadDefault").onclick = () => {
      push();
      art.cells = drawDefaultCells(e);
      drawRefresh();
    };
    modal.querySelector("#drawReset").onclick = () => {
      delete customIcons[art.id];
      saveCustomIcons();
      showReaction(`${e.name}의 물약을 기본 그림으로 되돌렸어요`);
      playEffect("good");
      renderDrawPicker();
    };
    modal.querySelector("#drawSave").onclick = () => {
      const code = drawEncode(art.cells);
      if (/^0+$/.test(code)) delete customIcons[art.id];
      else customIcons[art.id] = code;
      saveCustomIcons();
      showReaction(
        /^0+$/.test(code)
          ? `${e.name}의 물약을 기본 그림으로 되돌렸어요`
          : `${e.name}의 물약 그림을 저장했어요!`,
      );
      playEffect("discover");
      renderDrawPicker();
    };
    modal.querySelector("#drawBack").onclick = renderDrawPicker;
    drawRefresh();
  }
  // 그림 칸 · 미리보기 · 버튼 상태를 한 번에 다시 그려요
  function drawRefresh() {
    if (!art) return;
    const e = item(art.id);
    const canvas = modal.querySelector("#drawCanvas");
    if (!canvas) return;
    const x = canvas.getContext("2d");
    const s = 20;
    for (let i = 0; i < 144; i++) {
      const cx = i % 12,
        cy = Math.floor(i / 12);
      x.fillStyle = (cx + cy) % 2 ? "#34283f" : "#2b2037";
      x.fillRect(cx * s, cy * s, s, s);
      const idx = art.cells[i];
      if (idx) {
        x.fillStyle = idx === 1 ? e.color : drawPalette[idx];
        x.fillRect(cx * s, cy * s, s, s);
      }
    }
    if (art.sym) {
      x.fillStyle = "#ffffff55";
      x.fillRect(6 * s - 1, 0, 2, 12 * s);
    }
    const svg = customIconSvg(drawEncode(art.cells), e.color);
    modal.querySelector("#drawBottle").innerHTML =
      `<span class="bottle"><span class="bottle-neck"></span><span class="bottle-liquid" style="--liquid:${e.color}"></span><span class="bottle-spark">${svg}</span></span>`;
    modal.querySelector("#drawMini").innerHTML = svg;
    modal
      .querySelectorAll("[data-color]")
      .forEach((b) =>
        b.classList.toggle(
          "on",
          Number(b.dataset.color) === art.color && art.tool !== "eraser",
        ),
      );
    modal
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("on", b.dataset.tool === art.tool));
    modal.querySelector("#drawSym").classList.toggle("on", art.sym);
    modal.querySelector("#drawUndo").disabled = !art.history.length;
  }
  function drawResearchWitch() {
    const c = modal.querySelector("#researchWitch");
    if (!c) return;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    const r = (a, b, w, h, color) => {
      x.fillStyle = color;
      x.fillRect(a, b, w, h);
    };
    x.clearRect(0, 0, 48, 56);
    r(14, 7, 20, 5, "#33253d");
    r(19, 1, 11, 9, "#33253d");
    r(21, 2, 7, 7, "#78558d");
    r(11, 12, 26, 5, "#33253d");
    r(13, 13, 22, 3, "#9c78b4");
    r(15, 17, 19, 21, "#65405a");
    r(18, 19, 13, 17, "#f3c6a5");
    r(20, 26, 3, 3, "#33253d");
    r(29, 26, 3, 3, "#33253d");
    r(24, 32, 4, 2, "#bb6e78");
    r(15, 38, 19, 12, "#55466f");
    r(11, 39, 5, 9, "#d1a1bf");
    r(33, 39, 5, 9, "#d1a1bf");
    r(18, 50, 6, 4, "#302639");
    r(28, 50, 6, 4, "#302639");
  }

  let missionCalendarDay = "";
  function missionDay() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function syncMissionDay() {
    const today = String(missionDay());
    if (missionCalendarDay && missionCalendarDay !== today) {
      missionWins = 0;
      save();
    }
    missionCalendarDay = today;
  }

  function updateMission() {
    syncMissionDay();
    const d = missionDay();
    const count = Math.min(3, missionWins);
    missionEl.textContent = `오늘의 미션 · 정확한 처방 ${count}/3회 ${missionRewardedDay === d ? "(완료)" : "(달성 시 +50코인)"}${postMailHint()}`;
  }
  function awardMission() {
    syncMissionDay();
    const d = missionDay();
    if (missionWins >= 3 && missionRewardedDay !== d) {
      missionRewardedDay = d;
      coins += 50;
      playEffect("discover");
      showReaction("오늘의 미션 완료! +50코인");
      save();
    }
    updateMission();
  }
  updateMission();
  function beginGuest() {
    if (guest || opened) return;
    const isSpecial = (guestIndex + 1) % 4 === 0;
    const unlocked = shopGuests.filter((g) => ownedShop.has(g.good));
    const pool = [...guests, ...unlocked.filter((g) => !g.special)];
    const specialPool = [...specials, ...unlocked.filter((g) => g.special)];
    const d = isSpecial
      ? specialPool[Math.floor(guestIndex / 4) % specialPool.length]
      : pool[guestIndex % pool.length];
    guestMood = "normal";
    guest = { ...d, special: isSpecial || !!d.special, x: 398, y: 552 };
    consultPrepare(guest);
    if (isSpecial) showReaction("특별한 손님이 찾아왔어요!");
    guestPhase = "enter";
    guestWait = 0;
    callDelay = 0;
    status.textContent = "새로운 손님이 오셨어요";
    playEffect("door");
    if (!isSpecial) showReaction("새로운 손님이 오셨어요");
    save();
  }

  function npc() {
    if (!guest) return;

    // 상담 중에는 마녀 오른쪽에 손님을 표시
    const talking = scene === "shop" && opened && mode === "talk";

    const positions = talking ? consultationPositions() : null;

    const x = Math.round(positions ? positions.customer.x : guest.x);

    const y = Math.round(positions ? positions.customer.y : guest.y);

    ellipse(x, y + 9, 12, 5, "#3c2a39");

    rect(x - 10, y - 9, 20, 20, guest.color);
    rect(x - 8, y - 24, 16, 18, "#f0c6ac");
    rect(x - 11, y - 27, 22, 7, "#5b3a47");

    if (guestMood === "happy") {
      rect(x - 6, y - 17, 5, 2, "#443443");
      rect(x + 2, y - 17, 5, 2, "#443443");
      rect(x - 3, y - 10, 7, 2, "#ba6578");
    } else if (guestMood === "sad") {
      rect(x - 5, y - 17, 3, 4, "#443443");
      rect(x + 4, y - 17, 3, 4, "#443443");
      rect(x - 7, y - 10, 2, 5, "#8ad0ee");
    } else if (guestMood === "angry") {
      rect(x - 6, y - 19, 6, 3, "#443443");
      rect(x + 2, y - 19, 6, 3, "#443443");
      rect(x - 3, y - 9, 7, 2, "#7a374d");
    } else if (guestMood === "surprised") {
      rect(x - 5, y - 17, 3, 5, "#443443");
      rect(x + 4, y - 17, 3, 5, "#443443");
      rect(x - 1, y - 10, 3, 4, "#ba6578");
    } else {
      rect(x - 5, y - 17, 3, 3, "#443443");
      rect(x + 4, y - 17, 3, 3, "#443443");
    }

    rect(x - 7, y + 10, 5, 6, "#493447");
    rect(x + 3, y + 10, 5, 6, "#493447");

    // 상담 중에는 대기 표시를 숨김
    if (guestPhase === "wait" && !talking) {
      ellipse(x, y - 44, 17, 15, "#f8e2b8");
      text("!", x, y - 38, 20, "#4a3246");
    }
  }

  // 상담 테스트: 질문을 통해 감정을 파악하고, 맥락에 맞는 대체 처방을 인정합니다.
  // =====================================================================
  // 상담 2.0 : 질문은 단서만 주고, 정답은 직접 추리해요.
  //  - 같은 손님도 방문할 때마다 사연(필요한 감정)이 달라져요.
  //  - 질문은 하나만 무료. 더 물을수록 / 힌트를 볼수록 보상이 줄고,
  //    직감으로 바로 맞히면 보상이 커져요.
  //  - 손님이 내 질문에 반응하며 대답해요 (말풍선 · 끄덕임 · 타자 연출).
  // scenario : { issue?, good, alt:[도움이 되는 대안], reason, lines?, qs:[{q,a,fit}] }
  //  fit "hit" = 정곡을 찌르는 질문 / "trap" = 비슷하지만 빗나가는 질문
  // =====================================================================
  const consultScenarios = {
    서하: [
      {
        good: "courage",
        alt: ["calm", "confidence"],
        reason: "떨리더라도 먼저 다가갈 용기가 가장 필요했어요.",
        qs: [
          {
            q: "그 사람 앞에서는 어떤 기분이 드나요?",
            a: "심장이 쿵쾅거리고 목이 막혀요. 그래도… 딱 한 걸음만 다가갈 수 있다면 좋겠어요.",
            fit: "hit",
          },
          {
            q: "마음을 천천히 정리하고 싶은가요?",
            a: "서두르고 싶진 않아요. 조금 차분해질 수 있다면 좋겠어요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "내일 좋아하는 사람과 처음으로 단둘이 밥을 먹어요. 어젯밤부터 심장이 너무 뛰어서 잠을 못 잤어요.",
        good: "calm",
        alt: ["courage", "peace", "comfort"],
        reason: "일렁이는 마음을 잔잔하게 가라앉혀 줄 평온이 필요했어요.",
        lines: {
          calm: "후우… 마음이 호수처럼 잔잔해졌어요. 내일은 웃으면서 인사할 수 있겠어요!",
          courage: "좋아요, 내일은 용기 내서 먼저 말을 걸어 볼게요!",
        },
        qs: [
          {
            q: "지금 몸은 어떤 상태인가요?",
            a: "손이 떨리고 숨이 얕아요. 마음이 파도처럼 일렁여서 잔잔해졌으면 좋겠어요.",
            fit: "hit",
          },
          {
            q: "먼저 다가갈 힘이 필요한가요?",
            a: "다가가고 싶은 마음은 있어요. 그런데 지금은 그것보다… 잠을 못 잔 게 더 걱정이에요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "몇 번이나 마음을 전했는데 매번 어색하게 끝났어요. 이제 그만 포기할까 생각 중이에요.",
        good: "hope",
        alt: ["courage", "comfort", "determination"],
        reason: "다시 해 볼 이유가 되어 줄 희망이 필요했어요.",
        lines: {
          hope: "아직 끝난 게 아니군요. 다음엔 조금 다르게 해 볼게요!",
          courage: "용기는 있어요. 다만 이유를 하나 더 찾고 싶어요.",
        },
        qs: [
          {
            q: "정말 포기하고 싶은 건가요?",
            a: "포기하고 싶진 않아요. 다만 앞으로 달라질 거라는 믿음이 안 생겨요.",
            fit: "hit",
          },
          {
            q: "다시 한 번 용기를 내고 싶은가요?",
            a: "용기는 벌써 몇 번이나 냈어요. 이제는… 그것만으로는 모자란 것 같아요.",
            fit: "trap",
          },
        ],
      },
    ],
    도윤: [
      {
        good: "calm",
        alt: ["courage", "confidence"],
        reason: "발표 전 소란스러운 불안을 진정시키는 평온이 가장 필요했어요.",
        qs: [
          {
            q: "발표를 떠올리면 어떤 느낌인가요?",
            a: "머릿속에서 실패 장면이 계속 재생돼요. 숨이 가빠서 아무것도 정리가 안 돼요.",
            fit: "hit",
          },
          {
            q: "발표에 나갈 용기가 필요한가요?",
            a: "무대에 올라갈 힘이 있으면 좋겠지만… 그 전에 이 소란스러움부터 어떻게 했으면 해요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "발표 준비는 다 했는데, 막상 앞에 서면 제 자료가 부족해 보일 것 같아요. 다들 저보다 잘할 것 같고요.",
        good: "confidence",
        alt: ["courage", "hope", "calm"],
        reason: "준비한 만큼 스스로를 믿어 줄 자신감이 필요했어요.",
        lines: {
          confidence:
            "맞아요, 제가 밤새 준비한 거였어요. 어깨를 펴고 해 볼게요!",
          courage: "일단 올라가 볼게요. 믿음은 하다 보면 생기겠죠?",
        },
        qs: [
          {
            q: "준비한 자료는 어떤가요?",
            a: "밤새 만들었어요. 틀린 건 없는데… 제가 해낼 수 있다는 믿음이 안 생겨요.",
            fit: "hit",
          },
          {
            q: "떨리는 마음부터 가라앉히고 싶은가요?",
            a: "떨리는 것도 있어요. 하지만 진짜 문제는 제가 못하는 사람 같다는 생각이에요.",
            fit: "trap",
          },
        ],
      },
      {
        issue: "발표 순서가 바로 다음인데, 화장실로 도망가고 싶어요… 어떡하죠?",
        good: "courage",
        alt: ["calm", "determination", "confidence"],
        reason: "도망치고 싶어도 무대로 올라갈 용기가 필요했어요.",
        lines: {
          courage: "좋아요! 떨려도 일단 올라가 볼게요!",
          calm: "숨은 골랐어요. 이제 발만 움직이면 되겠죠.",
        },
        qs: [
          {
            q: "지금 가장 하고 싶은 게 뭔가요?",
            a: "솔직히 도망가고 싶어요. 그래도 저 무대에 올라가야 한다는 건 알아요.",
            fit: "hit",
          },
          {
            q: "숨부터 고르고 싶은가요?",
            a: "숨은 아까 여러 번 골랐어요. 그런데도 발이 바닥에 붙어서 안 떨어져요.",
            fit: "trap",
          },
        ],
      },
    ],
    미루: [
      {
        good: "longing",
        alt: ["hope", "comfort", "sad"],
        reason: "그리움을 억누르지 않고 소중히 받아들이고 싶었어요.",
        qs: [
          {
            q: "그 친구를 떠올리면 어떤 기분이에요?",
            a: "보고 싶어서 가슴 한구석이 시려요. 지우고 싶은 건 아니에요. 그 마음을 소중히 두고 싶어요.",
            fit: "hit",
          },
          {
            q: "다시 만날 수 있다는 희망이 필요한가요?",
            a: "다시 만난다면 좋겠지만… 만날 수 있을지 생각하면 오히려 더 불안해져요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "친구가 떠난 뒤로 한 번도 울지 않았어요. 괜찮은 줄 알았는데, 요즘 갑자기 숨이 막혀요.",
        good: "sad",
        alt: ["comfort", "longing", "empathy"],
        reason: "참아 온 눈물을 흘려보낼 슬픔이 필요했어요.",
        lines: {
          sad: "…눈물이 나요. 이상하게 시원해요. 이제야 숨이 쉬어져요.",
          comfort: "따뜻해요. 그런데 눈물은 아직… 조금만 더 기다려 주세요.",
        },
        qs: [
          {
            q: "마지막으로 울었던 게 언제인가요?",
            a: "기억이 안 나요. 마음속에 눈물이 가득 찬 것 같은데 밖으로 나오지를 않아요.",
            fit: "hit",
          },
          {
            q: "친구가 많이 그리운가요?",
            a: "그립긴 해요. 그런데 그리운 것보다… 가슴이 먹먹해서 말이 안 나와요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "친구에게서 편지가 왔는데 답장을 쓸 자신이 없어요. 우리가 다시 가까워질 수 있을까요?",
        good: "hope",
        alt: ["courage", "longing", "comfort"],
        reason: "다시 가까워질 수 있다는 희망이 필요했어요.",
        lines: {
          hope: "다시 예전처럼 지낼 수 있겠죠? 오늘 답장을 써 볼게요!",
          courage: "일단 펜을 들어 볼게요. 어떤 말이 나올지는 모르겠지만요.",
        },
        qs: [
          {
            q: "편지를 읽고 어떤 생각이 들었나요?",
            a: "다시 예전처럼 지낼 수 있을지 모르겠어요. 그래도… 그럴 수 있다고 믿고 싶어요.",
            fit: "hit",
          },
          {
            q: "답장을 쓰는 게 두려운가요?",
            a: "조금 무섭긴 해요. 하지만 겁이 난다기보다 확신이 없는 것 같아요.",
            fit: "trap",
          },
        ],
      },
    ],
    하린: [
      {
        good: "regret",
        alt: ["courage", "forgiveness", "calm"],
        reason: "상대에게 상처 준 일을 돌아보는 후회의 마음이 중요했어요.",
        qs: [
          {
            q: "다툰 일을 떠올리면 어떤 기분이에요?",
            a: "그때 한 말이 계속 귓가에 남아요. 제가 왜 그랬을까… 되돌리고 싶어요.",
            fit: "hit",
          },
          {
            q: "사과하러 갈 용기가 부족한가요?",
            a: "용기도 문제예요. 그런데 제 잘못부터 제대로 인정해야 갈 수 있을 것 같아요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "사과문은 다 써 두었는데, 친구 집 앞까지 갔다가 세 번이나 그냥 돌아왔어요.",
        good: "courage",
        alt: ["determination", "regret", "calm"],
        reason: "사과할 마음은 충분했어요. 문을 두드릴 용기만 필요했어요.",
        lines: {
          courage: "이번엔 정말 초인종을 누를게요. 떨려도 해 볼래요!",
          determination: "이번엔 끝까지 가 볼게요. 돌아오지 않을 거예요!",
        },
        qs: [
          {
            q: "문 앞에서 무슨 일이 있었나요?",
            a: "초인종에 손을 올렸다가… 발이 저절로 뒤로 물러났어요. 사과할 마음은 진심인데도요.",
            fit: "hit",
          },
          {
            q: "아직 후회가 정리되지 않았나요?",
            a: "후회는 많이 했어요. 그런데 후회만 해서는 달라지는 게 없더라고요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "친구가 먼저 사과했는데도 마음이 안 풀려요. 용서하고 싶은데 잘 안 돼요.",
        good: "forgiveness",
        alt: ["calm", "peace", "comfort", "empathy"],
        reason: "마음에 얹힌 돌을 내려놓게 해 줄 용서가 필요했어요.",
        lines: {
          forgiveness:
            "마음의 돌이 스르륵 내려가요. 이제 친구에게 먼저 연락해 볼게요.",
          calm: "조금 편안해졌어요. 천천히 풀어 볼게요.",
        },
        qs: [
          {
            q: "용서하고 싶은 마음은 있나요?",
            a: "네, 있어요. 화가 남은 게 아니라 마음에 얹힌 돌이 안 내려가는 느낌이에요.",
            fit: "hit",
          },
          {
            q: "아직도 많이 화가 나 있나요?",
            a: "화가 났던 건 맞아요. 그런데 지금은 많이 식은 것 같기도 해요.",
            fit: "trap",
          },
        ],
      },
    ],
    루카: [
      {
        good: "hope",
        alt: ["joy", "calm", "comfort"],
        reason: "내일을 다시 기대할 작은 희망이 필요했어요.",
        qs: [
          {
            q: "요즘 하루는 어떻게 흘러가나요?",
            a: "눈을 뜨면 어제와 똑같은 하루가 기다리는 것 같아요. 기대할 게 하나라도 있었으면 해요.",
            fit: "hit",
          },
          {
            q: "잠시 쉬어 가고 싶은가요?",
            a: "쉬는 건 많이 쉬었어요. 그런데도 마음이 채워지질 않아요.",
            fit: "trap",
          },
        ],
      },
      {
        issue: "웃은 지 너무 오래돼서, 웃는 법을 잊어버린 것 같아요.",
        good: "joy",
        alt: ["hope", "comfort", "curiosity"],
        reason: "마음에 햇살 한 조각 같은 기쁨이 필요했어요.",
        lines: {
          joy: "하하, 웃음이 나왔어요! 이런 기분 정말 오랜만이에요!",
          comfort: "위로가 됐어요. 그런데 오늘은 한 번 웃어 보고 싶어요.",
        },
        qs: [
          {
            q: "마지막으로 크게 웃은 게 언제예요?",
            a: "기억이 안 나요. 마음에 햇빛이 한 조각이라도 들어오면 좋겠어요.",
            fit: "hit",
          },
          {
            q: "누군가의 위로가 필요한가요?",
            a: "위로도 고맙지만… 토닥여 주는 것보다 그냥 한번 웃어 보고 싶은 거예요.",
            fit: "trap",
          },
        ],
      },
      {
        issue:
          "매일 똑같은 길, 똑같은 밥, 똑같은 생각이에요. 뭘 해도 궁금한 게 하나도 없어요.",
        good: "curiosity",
        alt: ["joy", "hope", "courage"],
        reason: "세상이 다시 궁금해지는 호기심이 필요했어요.",
        lines: {
          curiosity: "저 골목 끝엔 뭐가 있을까요? 오늘은 꼭 가 볼래요!",
          joy: "기분이 좋아졌어요. 다음엔 다른 길로 가 볼까요?",
        },
        qs: [
          {
            q: "요즘 궁금한 게 있나요?",
            a: "하나도 없어요. 새로운 게 있어도 ‘그래서 뭐’라는 생각만 들어요.",
            fit: "hit",
          },
          {
            q: "내일이 기대되었으면 하나요?",
            a: "기대까지는 너무 큰 부탁이에요. 그냥 오늘과는 다른 걸 해 보고 싶어요.",
            fit: "trap",
          },
        ],
      },
    ],
  };

  // 사연이 따로 없는 손님(특별 손님 · 상점 손님)용 : 감정별 단서
  const consultFeel = {
    joy: "마음이 흐린 날 같아요. 햇살 한 줌만 있으면 좋겠어요.",
    sad: "가슴에 눈물이 고여 있는데 흘려보내질 못하겠어요.",
    love: "누군가를 향한 따뜻함이 있었으면 해요. 마음이 너무 춥거든요.",
    fear: "조심해야 할 것 같은 마음이 필요해요. 너무 겁 없이 달려들었거든요.",
    anger: "속이 부글부글 끓는데 말로 꺼내질 못하겠어요.",
    calm: "마음이 소란스러워요. 파도처럼 일렁이는 걸 가라앉히고 싶어요.",
    longing: "멀리 있는 사람이 자꾸 떠올라요. 가슴 한구석이 시려요.",
    courage: "하고 싶은 일이 있는데 발이 바닥에 붙어 버렸어요.",
    flutter: "뭔가 시작될 것 같은 기분이 간질간질한데 이름을 모르겠어요.",
    regret: "지난 일이 계속 머릿속에서 재생돼요. 되돌리고 싶어요.",
    attachment: "놓아야 하는 걸 알면서도 손에 꼭 쥐고 있어요.",
    hope: "내일이 기다려질 이유가 하나라도 있었으면 해요.",
    trust: "누군가를 믿고 기대고 싶은데 마음이 자꾸 닫혀요.",
    comfort: "누군가 등을 토닥여 주면 좋겠어요. 오늘은 많이 지쳤어요.",
    nostalgia: "오래된 물건을 보면 그 시절이 떠올라서 가슴이 몽글해져요.",
    confidence: "해낼 수 있다는 건 아는데도 스스로 믿어지질 않아요.",
    jealousy: "남이 가진 게 자꾸 눈에 들어와요. 제 마음이 좁아진 것 같아요.",
    forgiveness: "마음에 얹힌 돌이 있어요. 내려놓고 싶은데 잘 안 돼요.",
    gratitude: "당연하다고 여기던 것들이 갑자기 소중하게 느껴져요.",
    curiosity: "늘 같은 길이 지겨워요. 모르는 골목이 궁금해요.",
    determination: "마음은 정했는데 끝까지 밀고 나갈 힘이 필요해요.",
    peace:
      "큰일을 치르고 나니 힘이 쭉 빠져요. 이제 숨 돌려도 된다는 말이 듣고 싶어요.",
    empathy: "누군가의 마음 옆에 나란히 앉아 주고 싶어요.",
    passion: "하고 싶은 일에 불꽃이 확 붙었으면 좋겠어요.",
  };
  // 상담 노트의 ‘마음의 기운 엿보기’ : 이름은 말하지 않고 느낌만 알려 줘요
  const consultAura = {
    joy: "잿빛 기운 사이로 노란 빛이 한 줄기 그리운 듯 흔들려요.",
    sad: "푸른 물방울이 고여 있는 듯한 기운이 느껴져요.",
    love: "분홍빛이 아주 옅게 깜빡여요. 온기를 찾는 기운이에요.",
    fear: "보랏빛 그림자가 느껴져요. 경계심을 품은 기운이에요.",
    anger: "붉은 불씨가 보여요. 터지기 직전의 뜨거운 기운이에요.",
    calm: "초록빛 기운이 어지럽게 흔들려요. 가라앉히고 싶은 마음이 보여요.",
    longing: "푸른 달빛 같은 기운이 아주 먼 곳을 향하고 있어요.",
    courage:
      "연둣빛 나비가 날개를 접고 있어요. 날아오를 준비는 되어 있어 보여요.",
    flutter: "분홍빛 별가루가 간질간질 흩날려요.",
    regret: "빛바랜 장밋빛 기운이 자꾸 뒤를 돌아보고 있어요.",
    attachment: "보랏빛 실이 손끝에 얽혀 있어요.",
    hope: "노란 별빛이 아주 작게 반짝여요. 아직 꺼지지는 않았어요.",
    trust: "청록빛 기운이 닫힌 문 앞에서 머뭇거려요.",
    comfort: "연보랏빛 기운이 몸을 웅크리고 있어요. 포근함을 찾고 있어요.",
    nostalgia: "빛바랜 갈색 기운이 먼 옛날을 비추고 있어요.",
    confidence: "주황빛 기운이 있는데, 스스로 가려 버리고 있어요.",
    jealousy: "연두빛 기운이 옆 사람을 곁눈질하고 있어요.",
    forgiveness: "하늘빛 기운 위에 무거운 돌이 얹혀 있어요.",
    gratitude: "복숭아빛 기운이 작은 선물 상자를 찾고 있어요.",
    curiosity: "보랏빛 기운이 닫힌 창문 너머를 기웃거려요.",
    determination: "주홍빛 기운이 주먹을 꼭 쥐고 있어요.",
    peace: "연두빛 기운이 긴 한숨을 내쉬고 있어요.",
    empathy: "분홍빛 기운이 누군가의 곁에 앉고 싶어 해요.",
    passion: "붉은 기운의 불꽃이 아주 작게 타오르고 있어요.",
  };
  const consultNear = {
    joy: ["hope", "comfort"],
    sad: ["comfort", "empathy"],
    love: ["comfort", "trust"],
    fear: ["calm", "trust"],
    anger: ["determination", "courage"],
    calm: ["peace", "courage"],
    longing: ["nostalgia", "sad"],
    courage: ["determination", "confidence"],
    flutter: ["love", "joy"],
    regret: ["forgiveness", "sad"],
    attachment: ["love", "trust"],
    hope: ["courage", "comfort"],
    trust: ["comfort", "love"],
    comfort: ["empathy", "calm"],
    nostalgia: ["longing", "comfort"],
    confidence: ["courage", "hope"],
    jealousy: ["calm", "confidence"],
    forgiveness: ["calm", "peace"],
    gratitude: ["joy", "peace"],
    curiosity: ["joy", "courage"],
    determination: ["courage", "confidence"],
    peace: ["calm", "gratitude"],
    empathy: ["comfort", "love"],
    passion: ["courage", "joy"],
  };

  // ---- 상태 -----------------------------------------------------------
  let accurateConsultations = 0,
    consultationGuideOpen = false,
    consultationHintUsed = false;
  try {
    const progress = JSON.parse(
      localStorage.getItem("emotion-apothecary-v2") || "{}",
    );
    accurateConsultations = Math.max(
      0,
      Number(progress.accurateConsultations) || 0,
    );
  } catch (e) {}
  // 손님별 방문 횟수 (사연이 돌아가며 바뀌어요). 저장 키를 따로 써서 기존 세이브와 충돌하지 않아요.
  const consultKey = "emotion-apothecary-consult-v1";
  let consultVisits = {};
  let consultLastLetter = -99; // 마지막으로 편지가 예약된 처방 횟수
  try {
    const stored = JSON.parse(localStorage.getItem(consultKey) || "null");
    if (stored && stored.visits && typeof stored.visits === "object")
      consultVisits = stored.visits;
    if (stored && Number.isFinite(stored.lastLetter))
      consultLastLetter = stored.lastLetter;
  } catch (e) {}
  function saveConsultVisits() {
    try {
      localStorage.setItem(
        consultKey,
        JSON.stringify({
          visits: consultVisits,
          lastLetter: consultLastLetter,
        }),
      );
    } catch (e) {}
  }
  let consultAsked = [], // 지금까지 물어본 질문 [{i, q, a, fit}]
    consultOrder = [0, 1], // 질문이 보이는 순서(매번 섞여요)
    consultSpeech = { text: "", mode: "static", fit: "" },
    consultView = "questions",
    resultNote = "",
    resultMissionBonus = 0;
  let consultTypeToken = 0,
    consultTypeTimer = null,
    consultTypeFinish = null;
  function witchRank() {
    return accurateConsultations < 10
      ? "견습 마녀"
      : accurateConsultations < 30
        ? "초급 마녀"
        : "숙련 마녀";
  }

  // ---- 손님 사연 정하기 (손님이 올 때 한 번) -----------------------------
  function consultGeneric(g) {
    const feel = (id) =>
      consultFeel[id] ||
      "마음에 이름을 붙이기가 어려워요. 그래도 이 약국이라면 알 수 있을 것 같아요.";
    const near = consultNear[g.good] || ["calm", "comfort"];
    return {
      good: g.good,
      reason: `손님은 ${item(g.good)?.name || "따뜻한"}의 감정을 가장 원했어요.`,
      alt: [...new Set([...near, "calm", "comfort", "courage", "hope"])].filter(
        (id) => id !== g.good,
      ),
      qs: [
        { q: "지금 마음은 어떤 모습인가요?", a: feel(g.good), fit: "hit" },
        {
          q: "혹시 이런 마음이 더 크지 않나요?",
          a: feel(near[0]),
          fit: "trap",
        },
      ],
    };
  }
  function consultPrepare(g) {
    const list = consultScenarios[g.name];
    let sc;
    if (list) {
      const n = consultVisits[g.name] || 0;
      consultVisits[g.name] = n + 1;
      saveConsultVisits();
      sc = list[n % list.length];
      g.good = sc.good;
      if (sc.issue) g.issue = sc.issue;
      g.lines = Object.assign({}, g.lines, sc.lines || {});
    } else {
      sc = consultGeneric(g);
    }
    g.story = sc;
    return g;
  }
  function consultData() {
    return guest.story || consultGeneric(guest);
  }

  // ---- 보상 계산 ---------------------------------------------------------
  const consultBase = () => (guest.special ? 60 : 30);
  function consultAskAdj(n) {
    const b = consultBase();
    return n === 0 ? Math.round(b * 0.5) : n === 1 ? 0 : -Math.round(b * 0.3);
  }
  const consultHintAdj = () =>
    consultationHintUsed ? -Math.round(consultBase() * 0.2) : 0;
  function consultReward() {
    return Math.max(
      10,
      consultBase() + consultAskAdj(consultAsked.length) + consultHintAdj(),
    );
  }
  function consultBreakdown(gold, shelf, expert) {
    const n = consultAsked.length;
    const ask = consultAskAdj(n);
    const parts = [];
    if (n === 0) parts.push(`직감 보너스 +${ask}`);
    if (n >= 2) parts.push(`질문 추가 ${ask}`);
    if (consultationHintUsed) parts.push(`기운 엿보기 ${consultHintAdj()}`);
    if (gold) parts.push(`황금 냄비 +${gold}`);
    if (shelf) parts.push(`진열 보너스 +${shelf}`);
    if (expert) parts.push(`숙련 마녀 +${expert}`);
    // 기본 보상 그대로면 따로 보여 주지 않아요.
    return parts.length ? `기본 ${consultBase()} · ${parts.join(" · ")}` : "";
  }
  function consultationGuide() {
    const b = consultBase();
    const aura = consultationHintUsed
      ? `<p><strong>🔍 마음의 기운</strong><br>${shopEscape(consultAura[guest.good] || "알 수 없는 신비한 기운이 느껴져요.")}</p>`
      : `<button type="button" id="consultAura">🔍 마음의 기운 엿보기 (보상 ${consultHintAdj() || -Math.round(b * 0.2)})</button>`;
    return `<div class="consult-guide"><strong>📖 마법 상담 노트</strong><p>질문은 하나만 해도 단서가 모여요. 단서만으로 짐작해서 처방해 보세요.</p><p>보상(정확한 처방): 질문 없이 직감으로 <b>${b + Math.round(b * 0.5)}</b> · 질문 1개 <b>${b}</b> · 질문 2개 <b>${Math.max(10, b - Math.round(b * 0.3))}</b>. 기운 엿보기는 보상이 줄어요.</p><p>도움이 되는 다른 물약은 +15코인이에요. (특별 손님이 맞지 않는 처방을 받으면 -5코인)</p>${aura}</div>`;
  }

  // ---- 말하는 연출 -------------------------------------------------------
  function consultCancelSpeech() {
    consultTypeToken++;
    consultTypeFinish = null;
    if (consultTypeTimer) clearTimeout(consultTypeTimer);
    consultTypeTimer = null;
  }
  function consultSetBusy(busy) {
    modal
      .querySelectorAll("[data-ask], #consultToPotions, #consultInstinct")
      .forEach((b) => (b.disabled = busy));
    const story = modal.querySelector(".rpg-story");
    if (story) story.classList.toggle("is-speaking", busy);
  }
  function consultMark(text) {
    const mark = modal.querySelector(".rpg-mark");
    if (!mark) return;
    mark.textContent = text;
    mark.classList.remove("show");
    if (!text) return;
    void mark.offsetWidth;
    mark.classList.add("show");
  }
  // 대답이 끝난 뒤의 리액션 : 정곡이면 끄덕끄덕(!), 빗나가면 갸웃(?)
  function consultReact(fit) {
    const portrait = modal.querySelector(".rpg-portrait");
    if (!portrait || !fit) return;
    portrait.classList.remove("talking", "nod", "sway");
    void portrait.offsetWidth;
    portrait.classList.add(fit === "hit" ? "nod" : "sway");
    consultMark(fit === "hit" ? "!" : "?");
    refreshGuestPortrait(fit === "hit" ? "happy" : "surprised");
  }
  function consultRunSpeech() {
    const p = modal.querySelector("#consultSpeech");
    if (!p) return;
    const sp = consultSpeech;
    consultCancelSpeech();
    const token = consultTypeToken;
    const portrait = modal.querySelector(".rpg-portrait");
    if (sp.mode === "static") {
      p.textContent = sp.text;
      consultSetBusy(false);
      return;
    }
    consultSetBusy(true);
    const startTyping = () => {
      if (token !== consultTypeToken || !p.isConnected) return;
      sp.mode = "type";
      consultMark("");
      p.textContent = "";
      if (portrait) portrait.classList.add("talking");
      let i = 0;
      const finish = () => {
        if (token !== consultTypeToken) return;
        consultCancelSpeech();
        sp.mode = "static";
        p.textContent = sp.text;
        if (portrait) portrait.classList.remove("talking");
        consultSetBusy(false);
        consultReact(sp.fit);
      };
      consultTypeFinish = finish;
      const step = () => {
        if (token !== consultTypeToken || !p.isConnected) return;
        i++;
        p.textContent = sp.text.slice(0, i);
        if (i % 2 === 0 && sp.text[i - 1] !== " ") playEffect("blip");
        if (i >= sp.text.length) finish();
        else consultTypeTimer = setTimeout(step, 28);
      };
      step();
    };
    if (sp.mode === "think") {
      p.innerHTML = '<span class="rpg-dots"><i></i><i></i><i></i></span>';
      consultMark("…");
      consultTypeFinish = () => {
        if (token !== consultTypeToken) return;
        consultCancelSpeech();
        sp.mode = "static";
        p.textContent = sp.text;
        consultSetBusy(false);
        consultReact(sp.fit);
      };
      consultTypeTimer = setTimeout(startTyping, 650);
    } else {
      startTyping();
    }
  }
  function openModal(nextMode) {
    if (nextMode === "talk") {
      consultCancelSpeech();
      consultAsked = [];
      consultOrder = Math.random() < 0.5 ? [0, 1] : [1, 0];
      consultView = "questions";
      consultationGuideOpen = false;
      consultationHintUsed = false;
      consultSpeech = { text: guest.issue, mode: "type", fit: "" };
      chosen = null;
    }

    mode = nextMode;
    opened = true;
    overlay.style.display = "flex";
    keys.clear();

    focusTarget = nextMode === "talk" ? 0 : nextMode === "result" ? 1 : 0;

    renderModal();
  }
  function closeModal() {
    consultCancelSpeech();
    opened = false;
    overlay.style.display = "none";
    overlay.classList.remove("talk-overlay");

    mode = "";
    consultView = "questions";

    keys.clear();
    focusTarget = 0;
  }
  function renderModal() {
    overlay.classList.toggle("talk-overlay", mode === "talk");
    if (mode === "shop") {
      renderShop();
    } else if (mode === "shelf") {
      renderShelf();
    } else if (mode === "research") {
      const selectedPotion = (id) => {
        const e = item(id);
        return e
          ? `<span class="bottle small"><span class="bottle-neck"></span><span class="bottle-liquid" style="--liquid:${e.color}"></span><span class="bottle-spark">${potionPixel(e)}</span></span><small>${e.name}</small>`
          : `<span class="empty-slot">+</span><small>물약 선택</small>`;
      };
      modal.innerHTML = `<h2>${pixelIcon("bottle")} 마녀의 감정 제작대</h2><div class="research-scene"><div class="research-witch"><canvas id="researchWitch" width="48" height="56"></canvas><small>마녀</small></div><div class="research-cauldron"><div class="steam">${pixelIcon("star")} ${pixelIcon("star")}</div><div class="cauldron-rim"></div><div class="cauldron-body">${pixelIcon("star")}</div><div class="cauldron-fire">${pixelIcon("flame")}</div></div><div class="research-caption">두 감정을 골라<br>가마솥에 넣어 보세요!</div></div><div class="recipe-grid"><div class="recipe-slot">${selectedPotion(selected[0])}</div><span class="recipe-plus">+</span><div class="recipe-slot">${selectedPotion(selected[1])}</div><span class="recipe-arrow">➜</span><div class="recipe-slot result-slot"><span class="bottle small mystery"><span class="bottle-neck"></span><span class="bottle-liquid"></span><span class="bottle-spark">${pixelIcon("mystery")}</span></span><small>새로운 물약</small></div></div><div class="research-subtitle">내 물약 보관함 <span>${uniqueKnownPotions().length}종</span></div><div class="potion-inventory" id="mixChoices">${uniqueKnownPotions()
        .map((x) =>
          potionTile(
            x,
            `data-emotion="${x.id}"`,
            selected.includes(x.id) ? "selected" : "",
          ),
        )
        .join(
          "",
        )}</div><button class="action" id="mix" ${selected.length !== 2 ? "disabled" : ""}>${pixelIcon("star")} 가마솥에서 조합하기</button><div id="mixResult" class="dialogue" style="display:none"></div><button id="dismiss">약국으로 돌아가기</button>`;
      drawResearchWitch();
      modal.querySelectorAll("[data-emotion]").forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.emotion;
            if (selected.includes(id))
              selected = selected.filter((x) => x !== id);
            else if (selected.length < 2) selected.push(id);
            renderModal();
          }),
      );
      modal.querySelector("#mix").onclick = () => {
        const k = [...selected].sort().join("|");
        const found = recipes[k];
        const out = modal.querySelector("#mixResult");
        out.style.display = "block";
        if (found) {
          const fresh = !known.has(found);
          playEffect(fresh ? "discover" : "brew");
          known.add(found);
          out.innerHTML = `${fresh ? "🎉 새로운 감정 발견!" : "📖 이미 발견한 조합"}<br><strong>${potionPixel(item(found))} ${item(found).name}</strong> 물약을 만들었어요!`;
          save();
        } else {
          playEffect("fail");
          out.textContent =
            "🫧 보글보글… 아직 새로운 감정이 만들어지지 않았어요. 다른 조합을 연구해 보세요.";
        }
        selected = [];
        modal.querySelector("#mix").disabled = true;
      };
    } else if (mode === "talk") {
      const story = consultData();
      const isPotions = consultView === "potions";
      const last = consultAsked[consultAsked.length - 1] || null;
      const remaining = consultOrder
        .map((i) => ({ i, q: story.qs[i] }))
        .filter(({ i }) => !consultAsked.some((a) => a.i === i));
      const speaker = isPotions ? "마녀" : guest.name;
      if (isPotions)
        consultSpeech = {
          text: "손님의 이야기를 들었어요. 어떤 물약을 처방할까요?",
          mode: "static",
          fit: "",
        };
      const rewardText = `💰 정확히 처방하면 <b>${consultReward()}</b>코인${consultAsked.length === 0 ? " · 직감 보너스!" : ""}`;
      const clueHtml = `<div class="rpg-clues"><strong><span>📝 모은 단서${consultAsked.length || consultationHintUsed ? "" : " 없음"}</span><span class="rpg-reward-inline">${rewardText}</span></strong>${consultAsked.map((a) => `<div>▸ ${shopEscape(a.a)}</div>`).join("")}${consultationHintUsed ? `<div>🔍 ${shopEscape(consultAura[guest.good] || "알 수 없는 신비한 기운이 느껴져요.")}</div>` : ""}</div>`;
      const rewardHtml = `<div class="rpg-reward">${rewardText}</div>`;
      const answers = isPotions
        ? `
      <div class="rpg-potions">
        ${uniqueKnownPotions()
          .map(
            (x) =>
              `<button type="button" class="rpg-potion ${chosen === x.id ? "selected" : ""}" data-give="${x.id}">${potionPixel(x)} <span>${x.name}</span></button>`,
          )
          .join("")}
      </div>
      <div class="rpg-actions"><button id="consultBack" type="button">← 다시 대화하기</button><button id="give" type="button" ${!chosen ? "disabled" : ""}>선택한 물약 건네주기 →</button></div>
    `
        : `
      <div class="rpg-choices">${remaining.map(({ i, q }) => `<button type="button" class="rpg-choice" data-ask="${i}" disabled><span>▸</span>${shopEscape(q.q)}${consultAsked.length ? ` <small>(보상 ${consultAskAdj(consultAsked.length + 1) - consultAskAdj(consultAsked.length) > 0 ? "+" : ""}${consultAskAdj(consultAsked.length + 1) - consultAskAdj(consultAsked.length)})</small>` : ""}</button>`).join("")}</div>
      <div class="rpg-actions">${consultAsked.length ? '<button id="consultToPotions" type="button" disabled>물약 처방하기 →</button>' : '<button id="consultInstinct" type="button" disabled>🔮 바로 처방하기 (직감 보너스)</button>'}</div>
    `;
      const keepScroll = isPotions ? modal.scrollTop : 0;
      modal.innerHTML = `
      <div class="rpg-dialogue">
        <div class="rpg-header"><span>✦ 마음 상담 · ${guest.special ? "특별 손님" : `손님 ${served + 1}`}</span><div><button id="consultGuideToggle" type="button">상담 노트</button><button id="dismiss" type="button" aria-label="상담 나가기">✕</button></div></div>
        <div class="rpg-story"><span class="rpg-portrait-wrap"><canvas class="portrait rpg-portrait" width="48" height="48" aria-label="손님 초상화"></canvas><span class="rpg-mark" aria-hidden="true"></span></span><div class="rpg-script">${last && !isPotions ? `<div class="rpg-ask"><b>🧙 마녀</b> ${shopEscape(last.q)}</div>` : ""}<strong>${speaker}</strong><p id="consultSpeech"></p></div></div>
        ${consultationGuideOpen ? `<div class="rpg-guide">${consultationGuide()}</div>` : ""}
        ${isPotions ? clueHtml : rewardHtml}
        ${answers}
      </div>`;
      if (isPotions) modal.scrollTop = keepScroll;
      refreshGuestPortrait();
      consultRunSpeech();
      const storyEl = modal.querySelector(".rpg-story");
      if (storyEl)
        storyEl.onclick = () => {
          if (consultTypeFinish) consultTypeFinish();
        };
      modal.querySelector("#consultGuideToggle").onclick = () => {
        consultationGuideOpen = !consultationGuideOpen;
        if (consultSpeech.mode !== "static") consultSpeech.mode = "static";
        renderModal();
      };
      const aura = modal.querySelector("#consultAura");
      if (aura)
        aura.onclick = () => {
          consultationHintUsed = true;
          consultSpeech.mode = "static";
          renderModal();
        };
      modal.querySelectorAll("[data-ask]").forEach(
        (b) =>
          (b.onclick = () => {
            const i = Number(b.dataset.ask);
            const q = story.qs[i];
            if (consultAsked.some((a) => a.i === i)) return;
            consultAsked.push({ i, q: q.q, a: q.a, fit: q.fit });
            consultSpeech = { text: q.a, mode: "think", fit: q.fit };
            playEffect("serve");
            renderModal();
          }),
      );
      const instinct = modal.querySelector("#consultInstinct");
      if (instinct)
        instinct.onclick = () => {
          consultView = "potions";
          renderModal();
        };
      const next = modal.querySelector("#consultToPotions");
      if (next)
        next.onclick = () => {
          consultView = "potions";
          renderModal();
        };
      const back = modal.querySelector("#consultBack");
      if (back)
        back.onclick = () => {
          consultView = "questions";
          consultSpeech = last
            ? { text: last.a, mode: "static", fit: "" }
            : { text: guest.issue, mode: "static", fit: "" };
          renderModal();
        };
      modal.querySelectorAll("[data-give]").forEach(
        (b) =>
          (b.onclick = () => {
            chosen = b.dataset.give;
            renderModal();
          }),
      );
      const give = modal.querySelector("#give");
      if (give)
        give.onclick = () => {
          if (!chosen) return;
          const good = chosen === guest.good;
          const expertBonus =
            good &&
            accurateConsultations >= 30 &&
            !consultationHintUsed &&
            consultAsked.length <= 1
              ? 5
              : 0;
          const helpful = !good && story.alt.includes(chosen);
          const harmful =
            !good &&
            ["fear", "anger", "attachment", "jealousy"].includes(chosen) &&
            !helpful;
          resultKind = good
            ? "good"
            : helpful
              ? "partial"
              : harmful
                ? "bad"
                : "miss";
          const goldBonus = shopOwned("goldPot") ? 10 : 0;
          const shelfBonus =
            shopOwned("shelfPlus") && shelfDisplayId === chosen ? 5 : 0;
          resultDelta = good
            ? consultReward() + goldBonus + shelfBonus + expertBonus
            : helpful
              ? 15
              : guest.special
                ? -5
                : 0;
          resultNote = good
            ? consultBreakdown(goldBonus, shelfBonus, expertBonus)
            : "";
          reaction = good
            ? guest.lines[chosen] || "제 마음을 알아주셔서 고마워요!"
            : helpful
              ? guest.lines[chosen] ||
                "이 물약도 제 마음에 도움이 될 것 같아요. 고마워요!"
              : harmful
                ? "아직 제 마음과는 조금 다른 것 같아요."
                : "마음에 꼭 맞지는 않지만, 이야기 들어주셔서 감사해요.";
          playEffect(good ? "good" : harmful ? "fail" : "serve");
          guestMood = good ? "happy" : harmful ? "sad" : "surprised";
          showReaction(
            good
              ? "마음에 꼭 맞는 처방이에요!"
              : helpful
                ? "도움이 되는 처방이에요!"
                : "상담 결과를 확인하세요",
          );
          coins = Math.max(0, coins + resultDelta);
          served++;
          guestIndex++;
          recordVillageLetter(guest, good, helpful);
          postCheckArrivals();
          if (good) {
            missionWins++;
            accurateConsultations++;
          }
          const rewardedBefore = missionRewardedDay;
          awardMission();
          resultMissionBonus = missionRewardedDay !== rewardedBefore ? 50 : 0;
          save();
          mode = "result";
          renderModal();
        };
    } else if (mode === "result") {
      const good = chosen === guest.good;
      const wins = Math.min(3, missionWins);
      const missionDone = missionRewardedDay === missionDay();
      const badges = [
        good
          ? '<span class="res-badge good">정확한 처방</span>'
          : resultKind === "partial"
            ? '<span class="res-badge ok">도움이 되는 처방</span>'
            : '<span class="res-badge miss">아쉬운 처방</span>',
        good && consultAsked.length === 0
          ? '<span class="res-badge star">✦ 직감 보너스!</span>'
          : "",
      ].join("");
      const sign = resultDelta > 0 ? "+" : "";
      const rewardKind =
        resultDelta > 0 ? "plus" : resultDelta < 0 ? "minus" : "zero";
      modal.innerHTML = `<h2>${good ? `${pixelIcon("heart")} 마음이 한결 가벼워졌어요!` : resultKind === "partial" ? `${pixelIcon("leaf")} 조금은 도움이 되었어요` : `${pixelIcon("drop")} 아쉬운 처방`}</h2>
      <div class="row"><canvas class="portrait" width="48" height="48" aria-label="${guest.name}의 반응 표정"></canvas><div><strong>${guest.name}</strong><div class="note">${potionPixel(item(chosen))} ${item(chosen).name}의 물약을 마셨어요</div></div></div>
      <div class="dialogue">“${reaction}”</div>
      <div class="res-badges">${badges}</div>
      <div class="res-reward ${rewardKind}">${pixelIcon("coin")}<span class="res-coin-num" id="resCoin" data-to="${resultDelta}">${rewardKind === "zero" ? "0" : `${sign}0`}</span><small>${rewardKind === "zero" ? "이번엔 보상이 없었어요" : "코인"}</small></div>
      ${resultMissionBonus ? `<div class="res-bonus">✦ 오늘의 미션 완료! +${resultMissionBonus}코인</div>` : ""}
      ${resultNote ? `<div class="res-note">${resultNote}</div>` : ""}
      <div class="res-reason">${pixelIcon("star")}<span>${consultData().reason}${!good && resultKind === "partial" ? " 선택한 물약도 도움이 되는 대안이에요." : ""}</span></div>
      <div class="res-mission"><span>오늘의 미션 · 정확한 처방</span><span class="res-pips">${[0, 1, 2].map((i) => `<i class="${i < wins ? "on" : ""}"></i>`).join("")}</span><small>${missionDone ? "완료" : `${wins}/3 · 달성 시 +50코인`}</small></div>
      <button class="action" id="leave">손님 배웅하기</button>`;
      const coinEl = modal.querySelector("#resCoin");
      if (coinEl && resultDelta !== 0) {
        const to = resultDelta,
          start = performance.now();
        const tick = (now) => {
          if (!coinEl.isConnected) return;
          const t = Math.min(1, (now - start) / 650);
          coinEl.textContent = `${to > 0 ? "+" : ""}${Math.round(to * (1 - Math.pow(1 - t, 3)))}`;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      refreshGuestPortrait(
        guestMood === "angry"
          ? "surprised"
          : guestMood === "sad"
            ? "normal"
            : guestMood,
      );
      modal.querySelector("#leave").onclick = () => {
        closeModal();
        guestPhase = "exit";
        playEffect("leave");
        chosen = null;
        status.textContent = `${guest.name}님이 약국을 나서고 있어요.`;
        if (postArrivalPending > 0) {
          postArrivalPending = 0;
          showReaction("딸랑— 우체국에 편지가 도착한 것 같아요 ✉");
        }
      };
    }
    const dismiss = modal.querySelector("#dismiss");
    if (dismiss) dismiss.onclick = closeModal;
  }
  function renderShop() {
    refreshStock();
    const goods =
      shopTab === "decor"
        ? shopGoods.filter((g) => g.category === "decor")
        : [
            ...shopGoods.filter(
              (g) =>
                g.category === "potion" && !shopOwned(g.id) && !known.has(g.id),
            ),
            ...stockIds
              .map((id) => {
                const p = rotatingPotions.find((e) => e.id === id);
                return (
                  p && {
                    ...p,
                    category: "potion",
                    name: p.name + "의 물약",
                    desc: "구매 시 새로운 처방과 해당 감정을 찾는 손님 해금",
                  }
                );
              })
              .filter(Boolean),
          ];
    modal.innerHTML = `<h2>${pixelIcon("chest")} 마녀의 상점</h2><p>손님을 도와 모은 코인으로 약국을 꾸미고 새로운 이야기를 열어보세요.</p><div class="bar"><span class="shop-balance">${pixelIcon("coin")} ${coins}코인</span><span>${shopTab === "potion" ? "새 물약 입고까지 " + restockCountdown() : "구매한 인테리어 " + shopGoods.filter((g) => g.category === "decor" && shopOwned(g.id)).length + "개"}</span></div><div class="shop-tabs"><button type="button" data-tab="decor" class="${shopTab === "decor" ? "active" : ""}">인테리어</button><button type="button" data-tab="potion" class="${shopTab === "potion" ? "active" : ""}">물약</button></div><div class="shop-list">${goods.length ? goods.map((g) => `<div class="shop-item"><span class="shop-icon">${g.category === "potion" ? potionPixel({ id: g.id, color: "#c9a0d6" }) : pixelIcon("chest")}</span><div class="shop-detail"><strong>${shopEscape(g.name)}</strong><p>${shopEscape(g.desc)}</p></div><button type="button" data-buy="${g.id}" ${shopOwned(g.id) || coins < g.price ? "disabled" : ""}>${shopOwned(g.id) ? "구매 완료" : g.price + " G"}</button></div>`).join("") : '<p class="hint">현재 판매할 새 물약이 없어요. 다음 입고를 기다려 주세요!</p>'}</div><p class="hint">${shopTab === "potion" ? "이미 보유하거나 발견한 물약은 진열되지 않아요. 10분마다 새로운 물약이 입고돼요." : "구매한 가구는 약국에서 직접 사용하거나 보너스를 받을 수 있어요."}</p><button id="dismiss" type="button">약국으로 돌아가기</button>`;
    modal.querySelectorAll("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          shopTab = b.dataset.tab;
          renderShop();
        }),
    );
    modal.querySelectorAll("[data-buy]").forEach(
      (b) =>
        (b.onclick = () => {
          const g = [...shopGoods, ...rotatingPotions].find(
            (x) => x.id === b.dataset.buy,
          );
          if (
            !g ||
            shopOwned(g.id) ||
            (known.has(g.id) && g.category !== "decor") ||
            coins < g.price
          )
            return;
          coins -= g.price;
          ownedShop.add(g.id);
          if (
            g.category === "potion" ||
            rotatingPotions.some((p) => p.id === g.id)
          )
            known.add(g.id);
          stockIds = stockIds.filter((id) => id !== g.id);
          save();
          playEffect("discover");
          showReaction(`${g.name} 구매 완료!`);
          renderShop();
        }),
    );
    modal.querySelector("#dismiss").onclick = closeModal;
  }
  setInterval(() => {
    if (mode === "shop" && shopTab === "potion") renderShop();
  }, 1000);
  document.getElementById("openShop").addEventListener("click", () => {
    if (!opened) {
      shopTab = "decor";
      openModal("shop");
    }
  });
  function showReaction(message) {
    reactionBubble.textContent = message;
    reactionBubble.classList.add("show");
    reactionUntil = performance.now() + 3000;
  }
  function nearbyUpgrade() {
    if (shopOwned("shelfPlus") && Math.hypot(p.x - 190, p.y - 242) < 125)
      return "shelfPlus";
    if (shopOwned("moonLamp") && Math.hypot(p.x - 665, p.y - 205) < 125)
      return "moonLamp";
    return null;
  }
  function renderShelf() {
    const today = Math.floor(Date.now() / 86400000);
    const displayed = item(shelfDisplayId);
    const last = item(shelfLastGift);
    modal.innerHTML = `<h2>${pixelIcon("bottle")} 마법 진열대</h2>
                  <p>매일 새로운 감정을 발견하고, 마음에 드는 물약을 전시해 보세요.</p>
                  <div class="dialogue"><strong>오늘의 선물</strong><p>${dailyShelfDay === today ? (last ? `${potionPixel(last)} ${last.name}의 물약을 받았어요! 보관함에 추가됐어요.` : `마음의 결정 1개를 받았어요! (보유 ${heartCrystals}개)`) : "아직 받지 않았어요. 아래 버튼을 눌러 보세요."}</p></div>
                  <button class="action" id="shelfGift" ${dailyShelfDay === today ? "disabled" : ""}>${dailyShelfDay === today ? "오늘은 수령 완료" : "오늘의 무료 감정 물약 받기"}</button>
                  <div class="research-subtitle">전시 중인 물약 <span>${displayed ? displayed.name : "없음"}</span></div>
                  <p class="hint">전시한 물약으로 손님에게 정확히 처방하면 추가로 5코인을 받아요. 전시 물약은 언제든 바꿀 수 있어요.</p>
                  <div class="potion-inventory">${uniqueKnownPotions()
                    .map((e) =>
                      potionTile(
                        e,
                        `data-shelf="${e.id}"`,
                        shelfDisplayId === e.id ? "selected" : "",
                      ),
                    )
                    .join("")}</div>
                  <p class="hint">${heartCrystals ? `모든 감정을 이미 발견했을 때 받는 마음의 결정: ${heartCrystals}개 (진열대 수집 기념품)` : "아직 발견하지 못한 감정 중 하나를 무료로 얻을 수 있어요."}</p>
                  <button id="dismiss">약국으로 돌아가기</button>`;
    modal.querySelector("#shelfGift").onclick = () => {
      if (dailyShelfDay === today) return;
      const pool = emotions.filter((e) => !known.has(e.id));
      if (pool.length) {
        const gift = pool[Math.floor(Math.random() * pool.length)];
        known.add(gift.id);
        shelfLastGift = gift.id;
        showReaction(`${gift.name}의 물약 발견!`);
      } else {
        heartCrystals++;
        shelfLastGift = null;
        showReaction("마음의 결정 1개 획득!");
      }
      dailyShelfDay = today;
      save();
      playEffect("discover");
      renderShelf();
    };
    modal.querySelectorAll("[data-shelf]").forEach(
      (b) =>
        (b.onclick = () => {
          shelfDisplayId = b.dataset.shelf;
          save();
          playEffect("brew");
          renderShelf();
        }),
    );
    modal.querySelector("#dismiss").onclick = closeModal;
  }
  function useUpgrade(id) {
    const today = Math.floor(Date.now() / 86400000);
    if (id === "shelfPlus") {
      openModal("shelf");
      return;
    }
    if (id === "moonLamp") {
      if (dailyLampDay === today) {
        showReaction("달빛 축복은 내일 다시 받을 수 있어요!");
        return;
      }
      dailyLampDay = today;
      coins += 15;
      showReaction("달빛 축복! +15코인");
    }
    save();
    playEffect("discover");
  }
  // Hidden discoveries spawn on walkable tiles, not inside walls or furniture.
  const discoveryTypes = {
    pouch: { name: "잃어버린 동전 주머니", min: 10, max: 30 },
    dust: { name: "반짝이는 마법 가루", min: 5, max: 15 },
    chest: { name: "비밀 보물상자", min: 50, max: 100 },
  };
  let discovery = null;
  let discoveryNextAt = performance.now() + 22000;
  function findDiscoverySpot() {
    for (let i = 0; i < 110; i++) {
      const x = 76 + Math.random() * 648,
        y = 140 + Math.random() * 354;
      if (collide(x, y) || Math.hypot(x - p.x, y - p.y) < 105) continue;
      if (
        Math.hypot(x - 397, y - 265) < 76 ||
        Math.hypot(x - 412, y - 414) < 65
      )
        continue;
      if (guest && Math.hypot(x - guest.x, y - guest.y) < 70) continue;
      // Four nearby samples ensure an accessible spot, not a tiny gap.
      if (
        [
          [x + 16, y],
          [x - 16, y],
          [x, y + 16],
          [x, y - 16],
        ].some(([a, b]) => collide(a, b))
      )
        continue;
      return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
  }
  function spawnDiscovery(now) {
    const pos = findDiscoverySpot();
    if (!pos) {
      discoveryNextAt = now + 15000;
      return;
    }
    const roll = Math.random();
    const type = roll < 0.12 ? "chest" : roll < 0.5 ? "pouch" : "dust";
    discovery = { ...pos, type, expiresAt: now + 95000 };
  }
  function nearbyDiscovery() {
    return discovery && Math.hypot(p.x - discovery.x, p.y - discovery.y) < 57
      ? discovery
      : null;
  }
  function collectDiscovery() {
    const found = nearbyDiscovery();
    if (!found) return false;
    const data = discoveryTypes[found.type];
    const amount =
      data.min + Math.floor(Math.random() * (data.max - data.min + 1));
    coins += amount;
    discoveryCounts[found.type]++;
    discovery = null;
    discoveryNextAt = performance.now() + 45000 + Math.random() * 65000;
    save();
    playEffect("discover");
    showReaction(`✦ ${data.name} 발견! +${amount}코인`);
    status.textContent = `🔎 ${data.name}을 발견했어요! +${amount}코인`;
    return true;
  }
  function drawDiscovery() {
    if (!discovery) return;
    const { x, y, type } = discovery;
    const pulse = Math.sin(performance.now() / 330) * 2;
    ellipse(x, y + 13, 17, 5, "#3e2c42");
    if (type === "pouch") {
      box(x - 11, y - 8, 22, 23, "#c39a64", "#5d4050");
      rect(x - 6, y - 12, 12, 6, "#f4d38e");
      rect(x - 2, y, 4, 7, "#ffe4a0");
    } else if (type === "dust") {
      ellipse(x, y, 8 + pulse, 8 + pulse, "#b48bda");
      rect(x - 2, y - 13, 4, 26, "#f2d7ff");
      rect(x - 13, y - 2, 26, 4, "#f2d7ff");
    } else {
      box(x - 16, y - 10, 32, 26, "#866092", "#3b2b4d");
      rect(x - 14, y - 6, 28, 6, "#e4b56f");
      rect(x - 3, y, 6, 9, "#fce5a4");
    }
    if (Math.sin(performance.now() / 280) > 0) {
      rect(x + 17, y - 17, 4, 9, "#ffe7b4");
      rect(x + 14, y - 14, 10, 3, "#ffe7b4");
    }
  }
  function discoverySummary() {
    return `🔎 발견 도감 · 동전 주머니 ${discoveryCounts.pouch}회 · 마법 가루 ${discoveryCounts.dust}회 · 보물상자 ${discoveryCounts.chest}회`;
  }
  // 약국 안에서 버튼이 가리키는 대상 : 손님 · 종 · 가마솥 중 "가장 가까운 하나"만 활성화돼요.
  // (범위가 겹쳐도 솥 아래쪽에서 연구하기가 가려지지 않아요.)
  const shopReach = { guest: 66, bell: 64, research: 118 };
  function shopTarget() {
    if (scene !== "shop") return null;
    let best = null,
      bestD = Infinity;
    const consider = (kind, x, y, r) => {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < r && d < bestD) {
        best = kind;
        bestD = d;
      }
    };
    if (guest && guestPhase === "wait")
      consider("guest", guest.x, guest.y, shopReach.guest);
    if (!guest) consider("bell", 412, 414, shopReach.bell);
    consider("research", 397, 275, shopReach.research);
    return best;
  }
  function interact() {
    if (scene === "village" && !opened) {
      if (postTryDeliver()) return;
      if (villageNearBuilding("post")) {
        villageMailbox();
        return;
      }
      if (villageNearBuilding("flower") || villageFlowerNear()) {
        villageFlowerVisit();
        return;
      }
      const home = villageBuildings.find(
        (b) =>
          b.kind === "home" &&
          Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h + 16)) < 78,
      );
      if (home) {
        openVillagePanel(
          `<h2>${shopEscape(home.label)}</h2><div class="dialogue">“이곳에는 아직 알려지지 않은 이야기가 있어요. 마을 주민들과 친해지면 더 많은 이야기를 들을 수 있을 거예요.”</div><button class="action" data-village-close>돌아가기</button>`,
        );
        return;
      }
      const person = villagePeople.find(
        (v) => Math.hypot(p.x - v.x, p.y - v.y) < 88,
      );
      if (person) {
        mode = "villageTalk";
        opened = true;
        overlay.style.display = "flex";
        keys.clear();
        modal.innerHTML = `<h2>${person.name}</h2><div class="dialogue">“${postVillagerLine(person)}”</div><p>마녀: “그 마음, 소중히 간직해 주세요.”</p><button class="action" id="villageClose">따뜻한 인사 나누기</button>`;
        modal.querySelector("#villageClose").onclick = () => {
          closeModal();
          playEffect("good");
        };
        return;
      }
      if (p.x > 350 && p.x < 450 && p.y < 125) {
        scene = "shop";
        p.x = 400;
        p.y = 488;
        playEffect("door");
        return;
      }
      return;
    }
    if (opened) {
      if (mode === "result") {
        modal.querySelector("#leave")?.click();
      } else closeModal();
      return;
    }
    if (collectDiscovery()) return;
    const upgrade = nearbyUpgrade();
    if (upgrade) {
      useUpgrade(upgrade);
      return;
    }
    const target = shopTarget();
    if (target === "guest") {
      chosen = null;
      openModal("talk");
      return;
    }
    if (target === "bell") {
      beginGuest();
      return;
    }
    if (target === "research") {
      selected = [];
      openModal("research");
    }
  }
  function update(dt) {
    if (scene === "village" && !opened) {
      villageTime += dt;
      for (const v of villagePeople) {
        const nx = v.homeX + Math.sin(villageTime * 0.43 + v.phase) * 19;
        const ny = v.homeY + Math.cos(villageTime * 0.32 + v.phase) * 12;
        v.x += (nx - v.x) * Math.min(1, dt * 2.1);
        v.y += (ny - v.y) * Math.min(1, dt * 2.1);
      }
    }
    const now = performance.now();
    if (discovery && now > discovery.expiresAt) {
      discovery = null;
      discoveryNextAt = now + 25000;
    }
    if (!discovery && now >= discoveryNextAt && !opened && scene === "shop")
      spawnDiscovery(now);
    focus += (focusTarget - focus) * Math.min(1, dt * 5);
    frameEl.classList.toggle("focus", focus > 0.12);
    if (!opened) {
      let dx =
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
        dy =
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
          (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      if (dx || dy) {
        const len = Math.hypot(dx, dy),
          speed = 170 * dt;
        dx /= len;
        dy /= len;
        const steps = Math.max(1, Math.ceil(speed / 3));
        for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
          if (!collide(p.x + (dx * speed) / steps, p.y))
            p.x += (dx * speed) / steps;
          if (!collide(p.x, p.y + (dy * speed) / steps))
            p.y += (dy * speed) / steps;
        }
        keepWitchInside();
        if (
          scene === "shop" &&
          p.x > 368 &&
          p.x < 433 &&
          p.y >= 516 &&
          dy > 0
        ) {
          scene = "village";
          p.x = 400;
          p.y = 100;
          keys.clear();
          playEffect("door");
          status.textContent =
            "작은 마을에 도착했어요. 주민들에게 인사해 보세요!";
          if (postUnreadCount())
            showReaction(`우체국에 새 편지가 ${postUnreadCount()}통 있어요 ✉`);
        } else if (
          scene === "village" &&
          p.x > 351 &&
          p.x < 449 &&
          p.y <= 55 &&
          dy < 0
        ) {
          scene = "shop";
          p.x = 400;
          p.y = 488;
          keys.clear();
          playEffect("door");
          status.textContent = "마음의 약국으로 돌아왔어요.";
        }
        p.walk += dt * 13;
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3;
        else p.dir = dy < 0 ? 1 : 0;
      }
    }
    keepWitchInside();
    if (scene === "shop" && guest) {
      if (guestPhase === "enter") {
        guest.y = Math.max(409, guest.y - dt * 83);
        if (guest.y <= 409) {
          guestPhase = "wait";
          status.textContent = `💬 ${guest.name}님이 기다리고 있어요. 가까이 가서 대화해 보세요.`;
        }
      } else if (guestPhase === "exit") {
        guest.y += dt * 90;
        if (guest.y > 570) {
          guest = null;
          guestMood = "normal";
          guestPhase = "none";
          callDelay = 8;
          status.textContent =
            "손님이 돌아갔어요. 자유롭게 연구하거나 다음 손님을 불러보세요.";
        }
      }
    } else if (scene === "shop" && !opened) {
      callDelay -= dt;
      if (callDelay <= 0) beginGuest();
    }
    const shopT = shopTarget();
    near = shopT === "research";
    const villageNear =
      scene === "village" &&
      villagePeople.some((v) => Math.hypot(p.x - v.x, p.y - v.y) < 88);
    const villagePost = scene === "village" && !!villageNearBuilding("post");
    const villageFlower =
      scene === "village" &&
      (!!villageNearBuilding("flower") || villageFlowerNear());
    const villageHome =
      scene === "village" &&
      villageBuildings.some(
        (b) =>
          b.kind === "home" &&
          Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h + 16)) < 78,
      );
    const villageDoor =
      scene === "village" && p.x > 350 && p.x < 450 && p.y < 125;
    const parcelHere = scene === "village" && postParcelHere();
    const foundNear = scene === "shop" ? nearbyDiscovery() : null;
    const upgradeNear = scene === "shop" ? nearbyUpgrade() : null;
    const bellNear = shopT === "bell";
    const guestNear = !upgradeNear && shopT === "guest";
    actionButton.textContent = parcelHere
      ? "📦 배달하기"
      : villagePost
        ? `💌 편지 읽기${postUnreadCount() ? ` (${postUnreadCount()})` : ""}`
        : villageFlower
          ? "🌷 꽃집 방문"
          : villageHome
            ? "🏠 집 살펴보기"
            : villageNear
              ? "주민과 대화하기"
              : villageDoor
                ? "약국 들어가기"
                : foundNear
                  ? "🔎 조사하기"
                  : upgradeNear === "shelfPlus"
                    ? "물약 진열대 열기"
                    : upgradeNear === "moonLamp"
                      ? "달빛 축복"
                      : guestNear
                        ? "대화하기"
                        : bellNear
                          ? "손님 부르기 🔔"
                          : near
                            ? "연구하기"
                            : "다가가 주세요";
    actionButton.disabled =
      opened ||
      !(
        parcelHere ||
        villagePost ||
        villageFlower ||
        villageHome ||
        villageNear ||
        villageDoor ||
        foundNear ||
        upgradeNear ||
        guestNear ||
        bellNear ||
        near
      );
    actionButton.classList.toggle(
      "ready",
      !opened &&
        !!(
          parcelHere ||
          villagePost ||
          villageFlower ||
          villageHome ||
          villageNear ||
          villageDoor ||
          foundNear ||
          upgradeNear ||
          guestNear ||
          bellNear ||
          near
        ),
    );
    updateMission();
    document.getElementById("menuMission").textContent = missionEl.textContent;
    dayEl.textContent = `DAY ${String(Math.floor(served / 5) + 1).padStart(2, "0")} · 💰 ${coins} · 처방 ${served}회`;
    miniDay.textContent = `DAY ${String(Math.floor(served / 5) + 1).padStart(2, "0")} · 💰 ${coins}`;
    if (reactionUntil && performance.now() > reactionUntil) {
      reactionBubble.classList.remove("show");
      reactionUntil = 0;
    }
  }
  // Responsive world viewport. A wider view reduces cramped follow-camera motion.
  let cameraX = 400,
    cameraY = 300;
  // The witch occasionally thinks aloud. Timings are in real seconds, not game days.
  // Weighted personality: warm empathy 50%, whimsical daily life 30%, gentle MZ humor 20%.
  const witchThoughtGroups = [
    {
      weight: 5,
      lines: [
        "슬픈 마음도 소중한 마음이야.",
        "오늘도 누군가의 하루가 가벼워졌으면.",
        "괜찮아. 모든 감정에는 이유가 있으니까.",
        "가끔은 울어도 괜찮은 날이 있어.",
        "행복은 생각보다 작은 곳에 있더라.",
        "마음이 쉬어 갈 곳이 필요하지.",
        "서두르지 않아도 괜찮아.",
        "손님이 웃으면 나도 기뻐.",
        "마음에도 따뜻한 차가 필요해.",
        "오늘도 좋은 하루가 되길.",
      ],
    },
    {
      weight: 3,
      lines: [
        "내 마음에도 물약 한 방울 넣어볼까?",
        "가마솥아, 오늘도 잘 부탁해!",
        "마법보다 어려운 건 사람 마음이야.",
        "앗! 오늘도 모자가 삐뚤어졌네.",
        "가마솥이 보글보글~",
        "물약 향기가 참 좋네!",
        "반짝이는 재료를 찾아볼까?",
        "흠흠, 오늘의 주문은…",
      ],
    },
    {
      weight: 2,
      lines: [
        "오늘 감정 상태... 제법 말랑함.",
        "손님 웃는 거 보니까 뿌듯함 MAX.",
        "마음 돌보기, 이거 완전 갓생인데?",
        "오늘의 나, 제법 괜찮은 마녀.",
        "물약 조합? 느낌 좋은데!",
        "작은 행복 발견. 도파민 충전!",
      ],
    },
  ];
  function pickWitchThought() {
    const total = witchThoughtGroups.reduce(
      (sum, group) => sum + group.weight,
      0,
    );
    let roll = Math.random() * total;
    let group = witchThoughtGroups[0];
    for (const candidate of witchThoughtGroups) {
      roll -= candidate.weight;
      if (roll < 0) {
        group = candidate;
        break;
      }
    }
    const choices = group.lines.filter((line) => line !== currentThought);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  let nextThoughtAt = performance.now() + 7500;
  let thoughtEndsAt = 0;
  let thoughtStartsAt = 0;
  let currentThought = "";
  let lastThoughtIndex = -1;
  function updateWitchThought(now) {
    if (
      opened ||
      !document.getElementById("helpPanel").hidden ||
      !document.getElementById("menuPanel").hidden ||
      !document.getElementById("musicPanel").hidden
    ) {
      thoughtEndsAt = 0;
      nextThoughtAt = Math.max(nextThoughtAt, now + 3500);
      return;
    }
    if (now >= nextThoughtAt) {
      currentThought = pickWitchThought();
      thoughtStartsAt = now;
      thoughtEndsAt = now + 3400;
      nextThoughtAt = now + 13000 + Math.random() * 12000;
    }
  }
  function drawWitchThought(now) {
    if (now >= thoughtEndsAt || !currentThought || opened) return;
    ctx.save();
    const fontSize = 11;
    ctx.font = `bold ${fontSize}px Limgul, sans-serif`;
    const maxTextWidth = 190;
    const words = currentThought.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const trial = line ? line + " " + word : word;
      if (line && ctx.measureText(trial).width > maxTextWidth) {
        lines.push(line);
        line = word;
      } else line = trial;
    }
    if (line) lines.push(line);
    const lineHeight = 16;
    const w =
      Math.ceil(Math.max(...lines.map((t) => ctx.measureText(t).width))) + 18;
    const h = lines.length * lineHeight + 12;
    const x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, p.x));
    const y = Math.max(h + 13, p.y - 49);
    // Fade in over 0.2s and fade out at the end, without moving the bubble.
    const fadeIn = Math.min(1, Math.max(0, (now - thoughtStartsAt) / 200));
    const fadeOut = Math.min(1, Math.max(0, (thoughtEndsAt - now) / 220));
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx.fillStyle = "#30243d";
    ctx.strokeStyle = "#d5aa88";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h, w, h, 7);
    ctx.fill();
    ctx.stroke();
    // Tail points to the witch's hat; clamp its base to the bubble.
    const tipX = Math.max(x - w / 2 + 9, Math.min(x + w / 2 - 9, p.x));
    ctx.beginPath();
    ctx.moveTo(tipX - 5, y - 1);
    ctx.lineTo(p.x, y + 7);
    ctx.lineTo(tipX + 5, y - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff0d6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((t, i) =>
      ctx.fillText(t, x, y - h + 6 + lineHeight * (i + 0.5)),
    );
    ctx.restore();
  }
  /*
   * 12-village-render.js
   * 마음의 약국 - 마을 그래픽 및 장식 배치 개선
   *
   * 기존 건물 좌표 / NPC / 이동 기능 유지
   * 꽃, 수풀, 화분의 겹침 및 길 위 배치 수정
   */

  // ================================================
  // 1. 공통 픽셀 장식
  // ================================================

  function villageFlower(x, y, col = "#f4b6c8") {
    rect(x - 1, y + 3, 3, 8, "#48825d");
    rect(x - 5, y - 1, 4, 5, col);
    rect(x + 2, y - 1, 4, 5, col);
    rect(x - 1, y - 5, 4, 5, col);
    rect(x - 1, y + 3, 4, 4, col);
    rect(x, y, 2, 3, "#ffdf91");
    rect(x - 4, y + 8, 3, 2, "#68a575");
  }

  function villageGrass(x, y, variant = 0) {
    const colors = ["#6e9d77", "#a8c29a", "#7ba882"];
    const col = colors[variant % colors.length];

    rect(x, y + 4, 2, 4, col);
    rect(x + 3, y + 1, 2, 6, col);
    rect(x + 6, y + 4, 2, 3, col);
  }

  function villageTree(x, y) {
    ellipse(x, y + 32, 23, 7, "#638d70");

    // 기둥
    rect(x - 6, y + 12, 13, 24, "#654c4d");
    rect(x - 3, y + 13, 4, 20, "#94705b");
    rect(x - 9, y + 28, 19, 5, "#755450");

    // 나뭇잎
    rect(x - 19, y - 2, 38, 23, "#376c53");
    rect(x - 16, y - 12, 32, 29, "#4b8966");
    rect(x - 11, y - 20, 25, 17, "#5a9c70");
    rect(x - 5, y - 25, 16, 11, "#72ad7b");

    // 명암
    rect(x - 15, y + 1, 10, 9, "#74ae80");
    rect(x - 11, y - 13, 12, 6, "#85bd88");
    rect(x + 5, y - 17, 7, 5, "#8fc392");
    rect(x + 9, y + 3, 7, 8, "#32664f");
    rect(x - 8, y + 14, 16, 5, "#356c52");

    // 열매
    rect(x + 10, y - 4, 3, 3, "#e5a4ae");
    rect(x - 10, y + 5, 3, 3, "#e8bd91");
  }

  function villageBush(x, y, flowering = false) {
    ellipse(x, y + 9, 15, 4, "#668f72");

    rect(x - 13, y, 26, 11, "#39765a");
    rect(x - 10, y - 7, 20, 12, "#55996d");
    rect(x - 5, y - 11, 12, 7, "#79b785");

    rect(x - 10, y + 3, 6, 4, "#8cc18d");
    rect(x + 5, y - 4, 5, 4, "#8cc18d");

    if (flowering) {
      rect(x - 7, y - 5, 4, 4, "#efb4cc");
      rect(x + 6, y - 3, 4, 4, "#f7d4a0");
    }
  }

  function villageLantern(x, y) {
    rect(x, y, 7, 24, "#65504e");
    rect(x - 4, y - 6, 15, 11, "#bc956b");
    rect(x - 2, y - 9, 11, 5, "#fff0b2");
    rect(x - 1, y - 4, 9, 7, "#f4d99b");
    rect(x + 2, y + 3, 3, 3, "#fff2bd");
  }

  function villageWindow(x, y, width = 22) {
    rect(x, y, width, 25, "#564457");
    rect(x + 4, y + 4, width - 8, 16, "#91c3cf");
    rect(x + 5, y + 5, 5, 12, "#d7eef0");
    rect(x + width - 10, y + 6, 4, 11, "#b8d9d9");
    rect(x + Math.floor(width / 2), y + 4, 3, 17, "#e9d6b5");
    rect(x - 2, y + 23, width + 4, 4, "#846377");
  }

  function villageDoor(x, y) {
    rect(x - 14, y - 30, 28, 31, "#514052");
    rect(x - 10, y - 26, 20, 26, "#a47b70");
    rect(x - 7, y - 22, 14, 20, "#bd937c");
    rect(x + 5, y - 14, 3, 3, "#f7df9c");
    rect(x - 17, y, 34, 4, "#6a5360");
  }

  // 작은 화분
  function villagePot(x, y, flowerColor = "#eeb1c9") {
    rect(x - 6, y, 12, 9, "#a66e70");
    rect(x - 7, y, 14, 3, "#cf9384");
    rect(x - 4, y - 8, 8, 9, "#4e9067");
    rect(x - 7, y - 9, 6, 5, "#69aa78");
    rect(x + 2, y - 11, 5, 6, "#79b986");
    rect(x - 2, y - 13, 4, 4, flowerColor);
  }

  // ================================================
  // 2. 건물 렌더링
  // ================================================

  function villageHouse(b) {
    const x = b.x;
    const y = b.y;
    const w = b.w;
    const h = b.h;

    const isFlower = b.kind === "flower";
    const isPost = b.kind === "post";
    const isForest = b.kind === "forest" || /숲/.test(b.label || "");

    const wall = isFlower
      ? "#e2bba9"
      : isPost
        ? "#d2beb0"
        : isForest
          ? "#c4b5a0"
          : "#cbb9af";

    const roof = isFlower
      ? "#b76f8f"
      : isPost
        ? "#6b91a4"
        : isForest
          ? "#8e7189"
          : "#9c829b";

    // 건물 그림자
    rect(x + 10, y + 24, w - 4, h - 10, "#3d3445");

    // 외벽
    rect(x + 8, y + 25, w - 16, h - 30, wall);
    rect(x + 12, y + 30, 5, h - 39, "#edcdb9");
    rect(x + w - 19, y + 31, 5, h - 40, "#aa918d");

    // 지붕
    rect(x, y + 9, w, 30, "#392f44");
    rect(x + 5, y + 4, w - 10, 30, roof);
    rect(x + 11, y + 8, w - 22, 7, isPost ? "#a8c9d3" : "#d2a6b8");
    rect(x + 8, y + 32, w - 16, 5, "#6b5267");

    for (let i = 0; i < Math.floor((w - 24) / 24); i++) {
      rect(x + 14 + i * 24, y + 26, 17, 3, "#e7bcb0");
    }

    // 창문
    villageWindow(x + 18, y + 47);
    villageWindow(x + w - 40, y + 47);

    // 문
    villageDoor(x + w / 2, y + h - 5);

    // 간판
    rect(x + w / 2 - 38, y + 36, 76, 17, "#493847");
    rect(x + w / 2 - 35, y + 38, 70, 12, "#674b60");
    text(b.label, x + w / 2, y + 48, 9, "#fff0cb");

    // --------------------------------
    // 꽃집
    // --------------------------------
    if (isFlower) {
      // 지붕 위 꽃 장식
      for (let i = 0; i < 6; i++) {
        const fx = x + 18 + i * ((w - 36) / 5);
        rect(fx, y + 17, 4, 4, i % 2 === 0 ? "#f8d5a3" : "#f4b5d2");
      }

      // 창문 아래 꽃 상자
      for (const sx of [x + 18, x + w - 40]) {
        rect(sx - 3, y + 70, 28, 8, "#704e5e");
        rect(sx, y + 72, 22, 5, "#bd8278");

        for (let i = 0; i < 4; i++) {
          const fx = sx + 3 + i * 5;
          rect(fx, y + 64, 2, 9, "#4d966a");
          rect(fx - 1, y + 62, 4, 4, i % 2 ? "#f9dba5" : "#ed9fbd");
        }
      }

      // 출입문 양옆 화분
      villagePot(x + 16, y + h - 13, "#f0a6c7");
      villagePot(x + w - 16, y + h - 13, "#f6d5a2");

      // 꽃밭
      const flowerColors = ["#f3a5c5", "#f9d59c", "#d9b5f5", "#f5bdc6"];

      const flowerY = y + h + 10;

      for (let i = 0; i < 4; i++) {
        villageFlower(x + 13 + i * 11, flowerY + (i % 2) * 3, flowerColors[i]);

        villageFlower(
          x + w - 13 - i * 11,
          flowerY + (i % 2) * 3,
          flowerColors[(i + 2) % flowerColors.length],
        );
      }

      rect(x + 6, y + h + 17, 48, 3, "#9b8069");
      rect(x + w - 54, y + h + 17, 48, 3, "#9b8069");
    }

    // --------------------------------
    // 마음 우체국
    // --------------------------------
    if (isPost) {
      // 지붕 위 파란 기와와 밝은 장식
      rect(x + 12, y + 17, w - 24, 3, "#547b92");

      for (let i = 0; i < Math.floor((w - 30) / 17); i++) {
        rect(x + 17 + i * 17, y + 25, 10, 3, "#c5e0dd");
      }

      // 창문 아래 작은 편지함
      const mailSlotX = x + 19;
      const mailSlotY = y + 76;

      rect(mailSlotX, mailSlotY, 19, 12, "#526a7b");
      rect(mailSlotX + 2, mailSlotY + 2, 15, 8, "#e7d6b8");
      rect(mailSlotX + 5, mailSlotY + 4, 9, 2, "#b58e82");
      rect(mailSlotX + 8, mailSlotY + 6, 3, 2, "#7898a7");

      // 건물 오른쪽의 붉은 우체통
      // 기존 배치 범위 안쪽에 위치
      const boxX = x + w - 18;
      const boxY = y + h - 25;

      // 받침대
      rect(boxX + 4, boxY + 21, 8, 5, "#544456");

      // 우체통 본체
      rect(boxX, boxY + 5, 16, 19, "#8c4d62");
      rect(boxX + 2, boxY + 6, 12, 15, "#c66e7b");

      // 둥근 느낌의 상단 덮개
      rect(boxX + 2, boxY + 1, 12, 5, "#a85a70");
      rect(boxX + 4, boxY - 1, 8, 3, "#d98a95");

      // 편지 투입구
      rect(boxX + 4, boxY + 9, 8, 3, "#493b4d");
      rect(boxX + 5, boxY + 10, 6, 1, "#f2d8b2");

      // 작은 우편 마크
      rect(boxX + 5, boxY + 15, 6, 5, "#f7e6ca");
      rect(boxX + 6, boxY + 16, 4, 1, "#c78c91");

      // 건물 왼쪽 소포 상자
      // 출입문 앞쪽은 비워 둠
      const parcelX = x + 12;
      const parcelY = y + h - 14;

      rect(parcelX + 1, parcelY + 2, 17, 12, "#725765");
      rect(parcelX, parcelY, 16, 12, "#b88c70");
      rect(parcelX + 2, parcelY + 2, 12, 8, "#d8ae89");

      // 포장 테이프
      rect(parcelX + 7, parcelY, 3, 12, "#f0d2a0");
      rect(parcelX + 1, parcelY + 4, 14, 2, "#f0d2a0");

      // 건물 벽면에 작은 편지 장식
      // 간판이나 창문과 겹치지 않는 오른쪽 하단
      const letterX = x + w - 33;
      const letterY = y + 80;

      rect(letterX, letterY, 14, 10, "#f4e2c5");
      rect(letterX + 2, letterY + 2, 10, 2, "#9c8292");
      rect(letterX + 4, letterY + 5, 6, 2, "#c9a4a3");
    }

    // --------------------------------
    // 숲속 집
    // --------------------------------
    if (isForest) {
      rect(x + 11, y + 43, 3, 27, "#4f8968");
      rect(x + w - 14, y + 43, 3, 27, "#4f8968");

      for (let i = 0; i < 3; i++) {
        rect(x + 8, y + 47 + i * 9, 7, 4, "#68a77b");
        rect(x + w - 15, y + 45 + i * 9, 7, 4, "#72ae7d");
      }
    }

    // --------------------------------
    // 작은 집
    // --------------------------------
    if (!isFlower && !isPost && !isForest) {
      villagePot(x + 18, y + h - 13, "#f0b4cc");
      villagePot(x + w - 18, y + h - 13, "#f7d8a3");
    }
  }

  function villageBench(x, y) {
    ellipse(x + 25, y + 24, 29, 6, "#719477");

    rect(x + 3, y + 13, 5, 12, "#55414b");
    rect(x + 42, y + 13, 5, 12, "#55414b");

    rect(x, y, 50, 12, "#5e4250");
    rect(x + 4, y + 3, 42, 5, "#d2a17e");
    rect(x + 4, y + 14, 42, 5, "#b98a70");

    for (let i = 0; i < 4; i++) {
      rect(x + 8 + i * 10, y + 4, 2, 4, "#e5b895");
    }
  }

  // ================================================
  // 3. 장식 배치 검사
  // ================================================

  // 길이나 건물과 겹치는 위치인지 확인
  function villageDecorationBlocked(x, y, radius = 9) {
    // 가로길
    if (
      x + radius > 0 &&
      x - radius < 740 &&
      y + radius > 277 &&
      y - radius < 344
    ) {
      return true;
    }

    // 세로길
    if (x + radius > 365 && x - radius < 435) {
      return true;
    }

    // 강과 강둑
    if (x + radius >= 709) {
      return true;
    }

    // 약국
    if (
      x + radius > 309 &&
      x - radius < 493 &&
      y + radius > 8 &&
      y - radius < 110
    ) {
      return true;
    }

    // 다른 건물
    if (
      villageBuildings.some(
        (b) =>
          x + radius > b.x - 3 &&
          x - radius < b.x + b.w + 3 &&
          y + radius > b.y - 3 &&
          y - radius < b.y + b.h + 3,
      )
    ) {
      return true;
    }

    return false;
  }

  // 장식끼리도 너무 가까워지지 않게 검사
  function villageDecorationNear(x, y, positions, minDistance) {
    return positions.some(
      ([px, py]) => Math.hypot(x - px, y - py) < minDistance,
    );
  }

  // ================================================
  // 4. 마을 전체
  // ================================================

  function drawVillage() {
    // --------------------------------
    // 잔디
    // --------------------------------
    rect(0, 0, 800, 576, "#86ab89");

    for (let y = 0; y < 576; y += 32) {
      for (let x = 0; x < 800; x += 32) {
        const variant = (x / 32 + y / 32) % 4;

        rect(
          x,
          y,
          32,
          32,
          variant === 0
            ? "#87ad8b"
            : variant === 1
              ? "#90b393"
              : variant === 2
                ? "#89ae8c"
                : "#8db190",
        );

        if ((x * 3 + y * 7) % 5 < 2) {
          villageGrass(
            x + 8 + ((x + y) % 9),
            y + 10 + ((x * 2 + y) % 11),
            variant,
          );
        }

        if ((x + y * 3) % 7 === 0) {
          rect(x + 23, y + 24, 3, 2, "#b5c99f");
        }
      }
    }

    // --------------------------------
    // 강
    // --------------------------------
    rect(714, 0, 86, 576, "#71968a");
    rect(723, 0, 77, 576, "#5b9b9f");
    rect(733, 0, 67, 576, "#3d8598");
    rect(742, 0, 58, 576, "#36798f");

    for (let y = 8; y < 576; y += 27) {
      const sway = Math.round(Math.sin(villageTime * 1.1 + y * 0.1) * 4);

      rect(750 + sway, y, 21, 3, "#85c8cb");
      rect(764 - sway, y + 12, 15, 3, "#64b4bf");
      rect(785, y + 5, 12, 2, "#a4d9d2");
    }

    // 강둑
    for (let y = 0; y < 576; y += 24) {
      rect(710 + (y % 48 === 0 ? 0 : 4), y, 11, 20, "#b7b99a");

      rect(720, y + 4, 8, 12, "#88a696");
      rect(713, y + 3, 4, 5, "#d3c9a7");
    }

    // --------------------------------
    // 길
    // --------------------------------
    rect(365, 0, 70, 576, "#c6a684");
    rect(376, 0, 48, 576, "#e5c8a5");

    rect(0, 277, 740, 67, "#c6a684");
    rect(0, 290, 740, 41, "#e5c8a5");

    for (let x = 14; x < 710; x += 45) {
      rect(x, 282, 18, 2, "#f4d8b3");
      rect(x + 21, 334, 14, 2, "#b99378");
    }

    for (let y = 30; y < 576; y += 52) {
      rect(385 + (y % 3) * 5, y, 8, 3, "#d6b28e");
    }

    // --------------------------------
    // 나무다리
    // --------------------------------
    rect(709, 270, 91, 86, "#493e4a");
    rect(714, 275, 86, 77, "#b98d70");

    for (let x = 717; x < 800; x += 12) {
      rect(x, 278, 3, 71, "#795a5c");
      rect(x + 3, 283, 8, 3, "#d9ad88");
      rect(x + 4, 337, 6, 3, "#8f675d");
    }

    rect(711, 271, 89, 7, "#e1bd94");
    rect(711, 348, 89, 7, "#6d4c4d");

    // --------------------------------
    // 약국
    // --------------------------------
    rect(309, 8, 184, 96, "#3d3446");
    rect(316, 18, 168, 80, "#986d81");

    rect(320, 21, 8, 72, "#aa8192");
    rect(472, 21, 8, 72, "#79586e");

    rect(322, 8, 156, 14, "#b48d9e");
    rect(327, 12, 146, 5, "#d0a7b1");

    rect(337, 24, 126, 29, "#c399a7");
    rect(342, 29, 116, 19, "#d1a8b4");
    text("마음의 약국", 400, 45, 14, "#fff0cc");

    rect(369, 55, 63, 44, "#463749");
    rect(379, 63, 43, 36, "#e0c39b");
    rect(384, 68, 33, 28, "#f2d5ad");

    // --------------------------------
    // 기존 건물 배치 유지
    // --------------------------------
    for (const b of villageBuildings) {
      villageHouse(b);
    }

    // --------------------------------
    // 나무: 기존 위치 유지
    // --------------------------------
    const treePositions = [
      [235, 123],
      [494, 188],
      [673, 241],
      [242, 477],
      [520, 512],
      [688, 550],
    ];

    for (const [x, y] of treePositions) {
      villageTree(x, y);
    }

    // --------------------------------
    // 벤치: 기존 위치 유지
    // --------------------------------
    villageBench(239, 360);
    villageBench(476, 248);

    // --------------------------------
    // 가로등: 기존 위치 유지
    // --------------------------------
    villageLantern(310, 262);
    villageLantern(455, 354);

    // --------------------------------
    // 안내판
    // --------------------------------
    rect(472, 211, 7, 30, "#66504d");
    rect(447, 201, 57, 24, "#4b3849");
    rect(451, 205, 49, 16, "#aa826e");
    rect(451, 205, 49, 3, "#d5a789");
    text("작은 마을", 476, 216, 10, "#fff0cb");

    // --------------------------------
    // 수풀: 건물과 길을 피한 고정 좌표
    // --------------------------------
    const bushPositions = [
      [192, 192, true],
      [535, 181, false],
      [644, 199, true],
      [194, 469, false],
      [570, 473, true],
    ];

    const occupied = [
      ...treePositions,
      [264, 375],
      [501, 263],
      [313, 262],
      [458, 354],
      [476, 211],
      ...villagePeople.map((v) => [v.x, v.y]),
    ];

    for (const [x, y, flowering] of bushPositions) {
      if (villageDecorationBlocked(x, y, 15)) {
        continue;
      }

      if (villageDecorationNear(x, y, occupied, 29)) {
        continue;
      }

      villageBush(x, y, flowering);
      occupied.push([x, y]);
    }

    // --------------------------------
    // 꽃: 길과 건물에서 떨어진 고정 좌표
    // --------------------------------
    const flowerPositions = [
      [96, 94, "#f9d8a5"],
      [164, 116, "#e8a4bc"],
      [295, 119, "#d5c5f4"],
      [548, 112, "#f9d8a5"],
      [615, 151, "#e8a4bc"],
      [86, 232, "#d5c5f4"],
      [280, 220, "#f9d8a5"],
      [574, 235, "#e8a4bc"],
      [106, 384, "#d5c5f4"],
      [289, 410, "#f9d8a5"],
      [450, 411, "#e8a4bc"],
      [636, 397, "#d5c5f4"],
      [94, 520, "#f9d8a5"],
      [319, 535, "#e8a4bc"],
      [612, 535, "#d5c5f4"],
    ];

    for (const [x, y, color] of flowerPositions) {
      if (villageDecorationBlocked(x, y, 9)) {
        continue;
      }

      if (villageDecorationNear(x, y, occupied, 21)) {
        continue;
      }

      villageFlower(x, y, color);
      occupied.push([x, y]);
    }

    // --------------------------------
    // 마을 주민
    // --------------------------------
    for (const v of villagePeople) {
      const bob = Math.round(Math.sin(villageTime * 4 + v.phase) * 2);

      ellipse(v.x, v.y + 12, 12, 4, "#6b9277");

      rect(v.x - 9, v.y - 7 + bob, 18, 23, v.color);
      rect(v.x - 8, v.y - 23 + bob, 16, 17, "#e9c3a5");
      rect(v.x - 10, v.y - 27 + bob, 20, 7, "#5b485d");

      rect(v.x - 5, v.y - 16 + bob, 3, 3, "#3e3141");
      rect(v.x + 3, v.y - 16 + bob, 3, 3, "#3e3141");

      rect(v.x - 7, v.y + 15 + bob, 5, 4, "#58475d");
      rect(v.x + 3, v.y + 15 + bob, 5, 4, "#58475d");

      if (Math.hypot(p.x - v.x, p.y - v.y) < 88) {
        text("!", v.x, v.y - 39 + bob, 17, "#fff0c6");
      }
    }
  }

  // ================================================
  // 5. 기존 카메라 및 장면 렌더링
  // ================================================

  let consultationCameraZoom = 1;
  function consultationPositions() {
    // 상담 중 마녀 왼쪽, 손님 오른쪽
    const witchX = p.x;
    const witchY = p.y;

    const customerX = witchX + 75;
    const customerY = witchY;

    return {
      witch: { x: witchX, y: witchY },
      customer: { x: customerX, y: customerY },
      centerX: (witchX + customerX) / 2,
      centerY: witchY,
    };
  }
  function drawScene() {
    const bounds = frameEl.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const viewW = Math.max(280, Math.round(bounds.width * pixelRatio));

    const viewH = Math.max(280, Math.round(bounds.height * pixelRatio));

    if (c.width !== viewW || c.height !== viewH) {
      c.width = viewW;
      c.height = viewH;
      ctx.imageSmoothingEnabled = false;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#251d2d";
    ctx.fillRect(0, 0, c.width, c.height);

    const portrait = window.matchMedia(
      "(max-width:700px), (orientation:portrait)",
    ).matches;

    const baseScale = portrait
      ? Math.max(c.height / H, c.width / W) * 1.12
      : Math.min(c.width / W, c.height / H);

    const talking = scene === "shop" && opened && mode === "talk" && !!guest;

    const desiredZoom = talking ? 1.7 : 1;

    consultationCameraZoom += (desiredZoom - consultationCameraZoom) * 0.09;

    if (Math.abs(consultationCameraZoom - desiredZoom) < 0.001) {
      consultationCameraZoom = desiredZoom;
    }

    const scale = baseScale * consultationCameraZoom;
    const shownW = c.width / scale;
    const shownH = c.height / scale;

    const positions = talking ? consultationPositions() : null;

    const pairX = positions ? positions.centerX : p.x;

    const pairY = positions ? positions.centerY : p.y;

    const aimX = pairX;

    const aimY = talking
      ? pairY + shownH * (portrait ? 0.12 : 0.16)
      : p.y + (portrait ? 38 : 0);

    const clampX = (x) =>
      shownW >= W ? W / 2 : Math.max(shownW / 2, Math.min(W - shownW / 2, x));

    const clampY = (y) =>
      shownH >= H ? H / 2 : Math.max(shownH / 2, Math.min(H - shownH / 2, y));

    const targetX = clampX(aimX);
    const targetY = clampY(aimY);

    if (!talking) {
      const deadX = 42;
      const deadY = 38;

      if (p.x < cameraX - deadX) {
        cameraX = p.x + deadX;
      }

      if (p.x > cameraX + deadX) {
        cameraX = p.x - deadX;
      }

      if (p.y < cameraY - deadY) {
        cameraY = p.y + deadY;
      }

      if (p.y > cameraY + deadY) {
        cameraY = p.y - deadY;
      }
    }

    cameraX += (targetX - cameraX) * (talking ? 0.12 : 0.045);

    cameraY +=
      (targetY - cameraY) * (talking ? 0.12 : portrait ? 0.085 : 0.045);

    cameraX = clampX(cameraX);
    cameraY = clampY(cameraY);

    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      Math.round(c.width / 2 - cameraX * scale),
      Math.round(c.height / 2 - cameraY * scale),
    );

    if (scene === "shop") {
      floor();
      drawEntranceMat();
      decorations();
      drawFurniture();
      drawCounterBell();
      cauldron();
      drawDiscovery();
      npc();
    } else {
      drawVillage();
    }

    witch();
    drawWitchThought(performance.now());
    if (scene === "village") drawPostBubble();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function frame(ts) {
    const dt = Math.min((ts - last) / 1000 || 0, 0.04);
    last = ts;
    time = ts;
    update(dt);
    updateWitchThought(ts);
    drawScene();
    requestAnimationFrame(frame);
  }
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
        "w",
        "a",
        "s",
        "d",
      ].includes(k) &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
    )
      e.preventDefault();
    if (k === "e" && !e.repeat) interact();
    else if (k === "escape" && opened) closeModal();
    keys.add(k);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) keys.clear();
  });
  // v2.4: Follow the same finger across buttons without requiring a new tap.
  // Native touch events are used because some in-app browsers cancel pointer
  // capture when a finger slides between child buttons.
  const dpad = document.querySelector(".dpad");
  const padButtons = [...dpad.querySelectorAll("button[data-key]")];
  let activeTouchId = null;
  let activeMouse = false;
  let activePadKey = null;
  function changePadDirection(nextKey) {
    if (activePadKey === nextKey) return;
    if (activePadKey) keys.delete(activePadKey);
    activePadKey = nextKey;
    if (nextKey) keys.add(nextKey);
    padButtons.forEach((b) =>
      b.classList.toggle("pressed", b.dataset.key.toLowerCase() === nextKey),
    );
  }
  function padDirectionAt(x, y) {
    // Hit the actual key when possible; otherwise use the closest key.
    let best = null,
      distance = Infinity;
    for (const button of padButtons) {
      const r = button.getBoundingClientRect();
      const cx = r.left + r.width / 2,
        cy = r.top + r.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < distance) {
        distance = d;
        best = button;
      }
    }
    const r = dpad.getBoundingClientRect();
    // Small tolerance lets the finger travel through button gaps.
    const margin = 24;
    if (
      x < r.left - margin ||
      x > r.right + margin ||
      y < r.top - margin ||
      y > r.bottom + margin
    )
      return null;
    return best ? best.dataset.key.toLowerCase() : null;
  }
  dpad.addEventListener(
    "touchstart",
    (e) => {
      if (activeTouchId !== null || !e.changedTouches.length) return;
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;
      changePadDirection(padDirectionAt(touch.clientX, touch.clientY));
      e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (activeTouchId === null) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === activeTouchId) {
          changePadDirection(padDirectionAt(touch.clientX, touch.clientY));
          e.preventDefault();
          break;
        }
      }
    },
    { passive: false, capture: true },
  );
  function endPadTouch(e) {
    if (activeTouchId === null) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === activeTouchId) {
        activeTouchId = null;
        changePadDirection(null);
        e.preventDefault();
        break;
      }
    }
  }
  document.addEventListener("touchend", endPadTouch, {
    passive: false,
    capture: true,
  });
  document.addEventListener("touchcancel", endPadTouch, {
    passive: false,
    capture: true,
  });
  // Mouse dragging in desktop testing follows the same direction logic.
  dpad.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || activeTouchId !== null) return;
    activeMouse = true;
    changePadDirection(padDirectionAt(e.clientX, e.clientY));
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (activeMouse) changePadDirection(padDirectionAt(e.clientX, e.clientY));
  });
  document.addEventListener("mouseup", () => {
    if (activeMouse) {
      activeMouse = false;
      changePadDirection(null);
    }
  });
  dpad.addEventListener("dragstart", (e) => e.preventDefault());
  dpad.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", () => {
    activeTouchId = null;
    activeMouse = false;
    changePadDirection(null);
  });
  actionButton.addEventListener("pointerdown", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => {
    if (!e.target.closest("input,textarea")) e.preventDefault();
  });
  document.querySelectorAll(".frame .touch button").forEach((button) => {
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });
  actionButton.onclick = interact;
  document.getElementById("nextGuest").onclick = () => {
    if (!guest && !opened) beginGuest();
    else status.textContent = "현재 손님이 약국에 있어요!";
  };

  const menuPanel = document.getElementById("menuPanel");
  const menuBtn = document.getElementById("menuBtn");
  function closeMenu() {
    menuPanel.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    if (opened) return;
    menuPanel.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    keys.clear();
  }
  menuBtn.addEventListener("click", openMenu);
  document.getElementById("menuClose").addEventListener("click", closeMenu);
  menuPanel.addEventListener("click", (e) => {
    if (e.target === menuPanel) closeMenu();
  });
  document.getElementById("menuShop").addEventListener("click", () => {
    closeMenu();
    document.getElementById("openShop").click();
  });
  document.getElementById("menuDraw").addEventListener("click", () => {
    closeMenu();
    openDrawPicker();
  });
  document.getElementById("menuBgm").addEventListener("click", () => {
    closeMenu();
    document.getElementById("musicSelect").click();
  });
  document.getElementById("menuHelp").addEventListener("click", () => {
    closeMenu();
    document.getElementById("helpBtn").click();
  });
  const helpPanel = document.getElementById("helpPanel");
  document.getElementById("helpBtn").addEventListener("click", () => {
    helpPanel.hidden = false;
    keys.clear();
  });
  document.getElementById("helpClose").addEventListener("click", () => {
    helpPanel.hidden = true;
  });
  helpPanel.addEventListener("click", (e) => {
    if (e.target === helpPanel) helpPanel.hidden = true;
  });
  // ---- 팝업 공통 : 오른쪽 위 ✕ 버튼, 창 크기 맞추기 ------------------------
  // 상점 · 선반 · 연구 · 마을(우체국/꽃집 등) 팝업에 ✕를 달아 주고,
  // 큰 창(상점, 우체국)은 어떤 화면이든 같은 높이로 맞춰요.
  // 상담/결과 화면은 손님 배웅 처리가 필요해서 제외해요.
  function syncModalChrome() {
    const closable =
      opened &&
      (mode === "shop" ||
        mode === "draw" ||
        mode === "shelf" ||
        mode === "research" ||
        mode === "villageEvent");
    let bar = modal.querySelector(":scope > .modal-x-bar");
    if (!closable) {
      if (bar) bar.remove();
      modal.removeAttribute("data-x");
      modal.removeAttribute("data-win");
      return;
    }
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "modal-x-bar";
      bar.innerHTML =
        '<button type="button" class="modal-x" aria-label="닫기">✕</button>';
      bar.firstChild.onclick = closeModal;
      modal.prepend(bar);
    }
    modal.setAttribute("data-x", "1");
    if (modal.querySelector(".mail-game, .shop-list, .draw-view")) {
      modal.setAttribute("data-win", "1");
      // 맨 아래 버튼들(돌아가기/나가기)을 창 바닥에 모아서 고정해요.
      const host = modal.querySelector(":scope > .mail-game") || modal;
      if (!host.querySelector(":scope > .modal-foot")) {
        const btns = [];
        let n = host.lastElementChild;
        while (n && n.tagName === "BUTTON") {
          btns.unshift(n);
          n = n.previousElementSibling;
        }
        if (btns.length) {
          const foot = document.createElement("div");
          foot.className = "modal-foot";
          host.append(foot);
          btns.forEach((b) => foot.append(b));
        }
      }
    } else modal.removeAttribute("data-win");
  }
  new MutationObserver(syncModalChrome).observe(modal, { childList: true });
  requestAnimationFrame(frame);
})();
