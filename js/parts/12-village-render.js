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
  return positions.some(([px, py]) => Math.hypot(x - px, y - py) < minDistance);
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

  cameraY += (targetY - cameraY) * (talking ? 0.12 : portrait ? 0.085 : 0.045);

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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
