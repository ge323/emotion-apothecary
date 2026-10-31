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
  missionEl.textContent = `오늘의 미션 · 정확한 처방 ${count}/3회 ${missionRewardedDay === d ? "(완료)" : "(달성 시 +50코인)"}`;
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
const consultationStories = {
  서하: {
    questions: [
      [
        "거절이 두려운 건가요?",
        "네. 거절당할까 겁나지만, 먼저 다가갈 용기를 얻고 싶어요.",
      ],
      [
        "마음을 천천히 정리하고 싶은가요?",
        "마음을 가라앉히는 것도 좋지만, 결국 한 걸음 내딛고 싶어요.",
      ],
    ],
    alternatives: ["calm", "confidence"],
    reason: "떨리더라도 먼저 다가갈 용기가 가장 필요했어요.",
  },
  도윤: {
    questions: [
      [
        "가장 힘든 건 불안한 마음인가요?",
        "맞아요. 심장이 두근거려서 차분히 준비하고 싶어요.",
      ],
      [
        "발표에 나갈 용기가 필요한가요?",
        "용기도 필요하지만, 지금은 불안을 가라앉히는 게 먼저예요.",
      ],
    ],
    alternatives: ["courage", "confidence"],
    reason: "발표 전 불안을 진정시키는 평온이 가장 필요했어요.",
  },
  미루: {
    questions: [
      [
        "친구를 잊고 싶은 건가요?",
        "아니요. 잊고 싶은 게 아니라 그리운 마음을 잘 간직하고 싶어요.",
      ],
      [
        "다시 만날 희망이 필요한가요?",
        "다시 만날 수 있다면 좋겠지만, 지금은 그리움을 인정하고 싶어요.",
      ],
    ],
    alternatives: ["hope", "comfort", "sad"],
    reason: "그리움을 억누르지 않고 받아들이고 싶었어요.",
  },
  하린: {
    questions: [
      [
        "사과하기가 두려운 건가요?",
        "무섭기도 하지만, 제가 상처 준 일을 제대로 돌아보고 싶어요.",
      ],
      [
        "먼저 찾아갈 용기가 필요하군요?",
        "맞아요. 다만 용기를 내기 전에 제 잘못을 인정하고 싶어요.",
      ],
    ],
    alternatives: ["courage", "forgiveness", "calm"],
    reason: "상대에게 상처 준 일을 돌아보는 후회의 마음이 중요했어요.",
  },
  루카: {
    questions: [
      [
        "지금은 쉬어 가고 싶은가요?",
        "쉬는 것도 좋지만, 내일이 조금 기대됐으면 좋겠어요.",
      ],
      [
        "작은 즐거움을 찾고 싶은가요?",
        "네. 아주 작은 것이라도 내일을 기대할 이유가 있었으면 해요.",
      ],
    ],
    alternatives: ["joy", "calm", "comfort"],
    reason: "내일을 다시 기대할 작은 희망이 필요했어요.",
  },
};
let consultStep = 0,
  consultQuestion = -1;
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
function witchRank() {
  return accurateConsultations < 10
    ? "견습 마녀"
    : accurateConsultations < 30
      ? "초급 마녀"
      : "숙련 마녀";
}
function consultationTip() {
  const name = item(guest.good)?.name || "따뜻함";
  if (accurateConsultations < 10)
    return `📖 견습 힌트 · 이 손님에게는 ${name}의 물약이 가장 잘 맞을 것 같아요.`;
  if (accurateConsultations < 30)
    return `✨ 초급 힌트 · 손님의 마음에서 ${name}의 감정이 느껴져요. 어떤 물약이 어울릴까요?`;
  return "";
}
function consultationGuide() {
  return `<div class="consult-guide" style="margin:10px 0;padding:12px;border:1px solid #b998a7;border-radius:10px;background:#352a3c;color:#fff0db"><strong>📖 마법 상담 노트</strong><p>손님의 첫 고민과 추가 답변을 함께 읽고, 지금 가장 필요한 감정을 찾아보세요.</p><p>완벽한 처방은 기본 +30코인(특별 손님 +60), 부분 성공 +15코인, 일반 손님의 부적합 처방 0코인, 특별 손님의 부적합 처방 -5코인이에요.</p><p>정확한 처방 10회에 초급, 30회에 숙련 마녀가 돼요. 숙련 마녀는 자동 힌트 없이 정확히 처방하면 +5코인을 더 받아요.</p><p>감정과 물약을 헷갈린다면 질문을 다시 읽거나 물약 이름을 비교해 보세요.</p></div>`;
}
function consultData() {
  return (
    consultationStories[guest.name] || {
      questions: [
        [
          "지금 가장 필요한 마음은 무엇인가요?",
          `제게는 ${item(guest.good)?.name || "따뜻한"}의 감정이 가장 필요해요.`,
        ],
        [
          "조금 더 이야기해 주실래요?",
          `지금 고민을 이겨 내는 데 ${item(guest.good)?.name || "따뜻한"}의 마음이 도움이 될 것 같아요.`,
        ],
      ],
      alternatives: ["calm", "comfort", "courage", "hope"].filter(
        (id) => id !== guest.good,
      ),
      reason: `손님은 ${item(guest.good)?.name || "따뜻한"}의 감정을 가장 원했어요.`,
    }
  );
}
