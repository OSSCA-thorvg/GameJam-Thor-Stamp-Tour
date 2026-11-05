import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';
import { fillCanvasGradient, rect, toOrigin, verticalGradient } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 국회의사당과 양옆 벚나무. 건물 가운데 축은 x = 180.
const BUILDING_BOX = { left: 24, top: 44, width: 312 };

/** 해 질 녘 하늘, 강 건너 빌딩, 한강, 잔디밭 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [120, 150, 210], [250, 200, 180]));

  const skyline = new tvg.Shape();
  const heights = [30, 46, 22, 60, 36, 28, 52, 24, 40, 70, 32, 44];
  heights.forEach((h, i) => skyline.appendRect(i * 30, 140 - h, 24, h));
  scene.add(skyline.fill(110, 116, 150));

  scene.add(new tvg.Shape().appendRect(0, 140, CANVAS_W, 56).fill(verticalGradient(tvg, 140, 196, [90, 120, 170], [140, 170, 200])));
  const waves = new tvg.Shape();
  for (let y = 150; y < 194; y += 10) {
    for (let x = (y / 10) % 2 === 0 ? 0 : 20; x < CANVAS_W; x += 40) waves.moveTo(x, y).cubicTo(x + 5, y - 3, x + 10, y - 3, x + 15, y);
  }
  scene.add(waves.stroke({ width: 1, color: [220, 230, 245, 180] }));

  scene.add(rect(tvg, 0, 196, CANVAS_W, 44, [120, 168, 100]));
  return scene;
}

/** 줄기와 분홍 꽃송이 무리로 그린 벚나무 */
function cherryTree(tvg: TVG, scene: Scene, cx: number) {
  scene.add(
    new tvg.Shape()
      .moveTo(cx - 4, 200)
      .lineTo(cx - 2, 140)
      .lineTo(cx + 2, 140)
      .lineTo(cx + 4, 200)
      .close()
      .fill(110, 76, 60),
  );
  const blossom = new tvg.Shape();
  for (const [dx, dy, r] of [[-22, 132, 16], [22, 132, 16], [0, 116, 20], [-12, 104, 14], [12, 104, 14], [0, 140, 14]] as const) {
    blossom.appendCircle(cx + dx, dy, r);
  }
  scene.add(blossom.fill(248, 190, 206));
  const petals = new tvg.Shape();
  for (const [dx, dy] of [[-18, 124], [10, 110], [20, 138], [-4, 132], [-14, 104]] as const) petals.appendCircle(cx + dx, dy, 3);
  scene.add(petals.fill(255, 230, 236));
}

/** 국회의사당을 본뜬 녹색 돔과 사각 열주 건물 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();

  // 기단
  scene.add(rect(tvg, 96, 186, 168, 14, [190, 190, 186]));
  scene.add(rect(tvg, 106, 176, 148, 10, [210, 210, 206]));

  // 본체와 사각 기둥
  scene.add(rect(tvg, 110, 110, 140, 66, [170, 174, 178]));
  for (let x = 112; x <= 240; x += 16) scene.add(rect(tvg, x, 110, 8, 66, [236, 236, 232]));
  scene.add(rect(tvg, 104, 100, 152, 10, [226, 226, 222]));

  // 돔 받침과 녹색 돔
  scene.add(rect(tvg, 132, 86, 96, 14, [214, 214, 210]));
  scene.add(
    new tvg.Shape()
      .moveTo(128, 86)
      .cubicTo(128, 54, 160, 44, 180, 44)
      .cubicTo(200, 44, 232, 54, 232, 86)
      .close()
      .fill(verticalGradient(tvg, 44, 86, [110, 170, 150], [60, 120, 104])),
  );
  const ribs = new tvg.Shape();
  for (const x of [148, 164, 196, 212]) ribs.moveTo(x, 86).cubicTo(x, 70, (x + 180) / 2, 50, 180, 46);
  ribs.moveTo(180, 46).lineTo(180, 86);
  scene.add(ribs.stroke({ width: 0.8, color: [50, 100, 88, 255] }));

  cherryTree(tvg, scene, 62);
  cherryTree(tvg, scene, 298);

  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const yeouido: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
