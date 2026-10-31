// All outdoor artwork uses integer pixel rectangles (no smooth emoji sprites).
function villageFlower(x, y, col = "#f4b6c8") {
  rect(x - 1, y + 4, 3, 6, "#3c825a");
  rect(x - 4, y, 3, 4, col);
  rect(x + 2, y, 3, 4, col);
  rect(x - 1, y - 3, 3, 4, col);
  rect(x - 1, y + 3, 3, 3, col);
  rect(x, y + 1, 2, 2, "#ffdf92");
}
function villageTree(x, y) {
  rect(x - 5, y + 17, 11, 18, "#654b4c");
  rect(x - 9, y + 23, 19, 5, "#8a6555");
  rect(x - 18, y - 3, 36, 24, "#3f765c");
  rect(x - 12, y - 14, 25, 12, "#4d906a");
  rect(x - 5, y - 20, 18, 11, "#69a777");
  rect(x - 14, y + 1, 9, 8, "#7ab583");
  rect(x + 8, y - 8, 7, 8, "#88bc8a");
  rect(x - 8, y + 10, 12, 5, "#38684f");
}
function villageHouse(b) {
  const x = b.x,
    y = b.y,
    w = b.w,
    h = b.h;
  rect(x + 7, y + 20, w - 6, h - 12, "#3d3544");
  const wall =
    b.kind === "flower" ? "#d9b3a2" : b.kind === "post" ? "#c8b3a7" : "#b9a8a0";
  rect(x + 10, y + 24, w - 18, h - 29, wall);
  rect(x + 7, y + 27, w - 6, 5, "#e6c8aa");
  const roof =
    b.kind === "flower" ? "#b06b88" : b.kind === "post" ? "#6b879b" : "#8c7189";
  rect(x, y + 8, w, 28, "#382e43");
  rect(x + 5, y + 4, w - 10, 28, roof);
  rect(x + 11, y + 9, w - 22, 6, b.kind === "post" ? "#9fc3ce" : "#c99db3");
  for (let k = 0; k < Math.floor((w - 18) / 21); k++)
    rect(x + 12 + k * 21, y + 27, 16, 3, "#e5b9ac");
  rect(x + w / 2 - 13, y + h - 33, 26, 29, "#514152");
  rect(x + w / 2 - 9, y + h - 29, 18, 25, "#a67c70");
  rect(x + w / 2 + 5, y + h - 16, 3, 3, "#f6df9b");
  for (const sx of [x + 17, x + w - 38]) {
    rect(sx, y + 44, 22, 24, "#574458");
    rect(sx + 4, y + 48, 14, 15, "#9ac6d0");
    rect(sx + 10, y + 48, 3, 15, "#e6d5b3");
  }
  rect(x + w / 2 - 35, y + 34, 70, 15, "#564054");
  text(b.label, x + w / 2, y + 45, 9, "#fff0cc");
  if (b.kind === "flower") {
    for (let i = 0; i < 4; i++)
      villageFlower(x + 19 + i * 13, y + h + 9, i % 2 ? "#f5d4a1" : "#e9a6c7");
  }
  if (b.kind === "post") {
    rect(x + w - 12, y + h - 14, 12, 15, "#60465d");
    rect(x + w - 10, y + h - 12, 8, 7, "#e9bd85");
  }
}
function villageBench(x, y) {
  rect(x + 3, y + 13, 5, 11, "#55414b");
  rect(x + 42, y + 13, 5, 11, "#55414b");
  rect(x, y, 50, 12, "#5e4250");
  rect(x + 4, y + 3, 42, 5, "#c99778");
  rect(x + 3, y + 14, 44, 5, "#ae7d69");
}
function drawVillage() {
  rect(0, 0, 800, 576, "#82a986");
  for (let y = 0; y < 576; y += 32)
    for (let x = 0; x < 800; x += 32) {
      rect(x, y, 31, 31, (x / 32 + y / 32) % 3 === 0 ? "#86ac88" : "#91b592");
      if ((x * 7 + y * 11) % 17 === 0) {
        rect(x + 8, y + 20, 5, 3, "#76a37c");
        rect(x + 17, y + 9, 3, 5, "#b1c99c");
      }
    }
  // River and two layered banks, with blocky animated ripples.
  rect(719, 0, 81, 576, "#648d83");
  rect(731, 0, 69, 576, "#43899b");
  rect(740, 0, 60, 576, "#37778e");
  for (let y = 8; y < 576; y += 28) {
    const sway = Math.round(Math.sin(villageTime * 1.1 + y) * 5);
    rect(752 + sway, y, 21, 3, "#82c5c7");
    rect(762 - sway, y + 12, 15, 3, "#60afbb");
    rect(785, y + 6, 12, 2, "#a3d7cf");
  }
  for (let y = 0; y < 576; y += 24) {
    rect(711 + (y % 48 === 0 ? 0 : 4), y, 10, 20, "#b4b99a");
    rect(720, y + 4, 8, 12, "#89a795");
  }
  // Paths are behind buildings and bridge.
  rect(365, 0, 70, 576, "#c7a987");
  rect(376, 0, 48, 576, "#e4c7a3");
  rect(0, 277, 740, 67, "#c7a987");
  rect(0, 290, 740, 41, "#e4c7a3");
  for (let x = 14; x < 710; x += 45) {
    rect(x, 282, 18, 2, "#efd2ac");
    rect(x + 21, 334, 14, 2, "#ba967a");
  }
  // Wooden bridge over river, visibly walkable.
  rect(709, 270, 91, 86, "#493e4a");
  rect(714, 275, 86, 77, "#b98d70");
  for (let x = 717; x < 800; x += 12) {
    rect(x, 278, 3, 71, "#795a5c");
    rect(x + 3, 283, 8, 3, "#d9ad88");
  }
  rect(711, 271, 89, 7, "#e1bd94");
  rect(711, 348, 89, 7, "#6d4c4d");
  // Apothecary exterior.
  rect(309, 8, 184, 96, "#3d3446");
  rect(316, 18, 168, 80, "#986d81");
  rect(322, 8, 156, 14, "#b48d9e");
  rect(337, 24, 126, 29, "#c399a7");
  rect(369, 55, 63, 44, "#463749");
  rect(379, 63, 43, 36, "#e0c39b");
  text("마음의 약국", 400, 45, 14, "#fff0cc");
  for (const b of villageBuildings) villageHouse(b);
  // Flower beds, trees, benches and small lanterns.
  for (const [x, y] of [
    [235, 123],
    [494, 188],
    [673, 241],
    [242, 477],
    [520, 512],
    [688, 550],
  ])
    villageTree(x, y);
  villageBench(239, 360);
  villageBench(476, 248);
  for (let i = 0; i < 16; i++) {
    const x = 35 + ((i * 83) % 655),
      y = 63 + ((i * 107) % 470);
    if (x > 320 && x < 470) continue;
    if (
      villageBuildings.some(
        (b) =>
          x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8,
      )
    )
      continue;
    villageFlower(
      x,
      y,
      i % 3 === 0 ? "#f9d8a5" : i % 3 === 1 ? "#e8a4bc" : "#d5c5f4",
    );
  }
  for (const [x, y] of [
    [310, 262],
    [455, 354],
  ]) {
    rect(x, y, 7, 24, "#65504e");
    rect(x - 4, y - 6, 15, 10, "#e5c98e");
    rect(x - 2, y - 9, 11, 4, "#fff0b2");
  }
  // Physical signboard, not floating title text.
  rect(472, 211, 7, 30, "#66504d");
  rect(447, 201, 57, 24, "#4b3849");
  rect(451, 205, 49, 16, "#aa826e");
  text("작은 마을", 476, 216, 10, "#fff0cb");
  // Village NPCs wander gently near their original spots.
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
    if (Math.hypot(p.x - v.x, p.y - v.y) < 88)
      text("!", v.x, v.y - 39 + bob, 17, "#fff0c6");
  }
}

// Smooth consultation zoom. 1 = normal view, 1.7 = conversation close-up.
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

  // 상담 중 1.7배 확대, 상담 종료 시 원래 배율로 복귀
  const desiredZoom = talking ? 1.7 : 1;

  consultationCameraZoom += (desiredZoom - consultationCameraZoom) * 0.09;

  if (Math.abs(consultationCameraZoom - desiredZoom) < 0.001) {
    consultationCameraZoom = desiredZoom;
  }

  const scale = baseScale * consultationCameraZoom;
  const shownW = c.width / scale;
  const shownH = c.height / scale;

  // 마녀와 손님의 중간 지점으로 카메라 이동
  const positions = talking ? consultationPositions() : null;

  const pairX = positions ? positions.centerX : p.x;

  const pairY = positions ? positions.centerY : p.y;

  const aimX = pairX;

  // 캐릭터들이 하단 대화창에 가려지지 않도록 위치 조정
  const aimY = talking
    ? pairY + shownH * (portrait ? 0.12 : 0.16)
    : p.y + (portrait ? 38 : 0);

  const clampX = (x) =>
    shownW >= W ? W / 2 : Math.max(shownW / 2, Math.min(W - shownW / 2, x));

  const clampY = (y) =>
    shownH >= H ? H / 2 : Math.max(shownH / 2, Math.min(H - shownH / 2, y));

  const targetX = clampX(aimX);
  const targetY = clampY(aimY);

  // 평소에는 기존 카메라 데드존 유지
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

  // 상담 중에는 카메라 이동 속도도 조금 빠르게
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

  // 기존 약국 및 마을 렌더링
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
