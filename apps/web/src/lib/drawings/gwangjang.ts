import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';
import { fillCanvasGradient, rect, toOrigin, type RGB } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 노점 세 칸. 건물 가운데 축은 x = 180.
const BUILDING_BOX = { left: 48, top: 66, width: 264 };

/** 아치형 지붕 골조와 전구가 매달린 시장 통로 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [70, 52, 44], [150, 110, 80]));

  const truss = new tvg.Shape();
  for (let x = -20; x < CANVAS_W + 40; x += 60) truss.moveTo(x, 60).cubicTo(x + 10, 10, x + 50, 10, x + 60, 60);
  truss.moveTo(0, 60).lineTo(CANVAS_W, 60);
  scene.add(truss.stroke({ width: 2, color: [110, 84, 66, 255] }));

  // 전선과 전구
  const wire = new tvg.Shape();
  for (let x = 20; x < CANVAS_W; x += 40) wire.moveTo(x, 60).lineTo(x, 74);
  scene.add(wire.stroke({ width: 0.8, color: [40, 30, 26, 255] }));
  for (let x = 20; x < CANVAS_W; x += 40) {
    scene.add(new tvg.Shape().appendCircle(x, 78, 10).fill(255, 210, 120, 50));
    scene.add(new tvg.Shape().appendCircle(x, 78, 4).fill(255, 226, 150));
  }

  scene.add(rect(tvg, 0, 204, CANVAS_W, 36, [120, 108, 96]));
  const tiles = new tvg.Shape();
  for (let x = 0; x < CANVAS_W; x += 30) tiles.moveTo(x, 204).lineTo(x, 240);
  tiles.moveTo(0, 222).lineTo(CANVAS_W, 222);
  scene.add(tiles.stroke({ width: 0.6, color: [96, 86, 76, 255] }));
  return scene;
}

/** 간판, 줄무늬 차양, 철판 위 빈대떡이 있는 노점 한 칸 */
function stall(tvg: TVG, scene: Scene, x: number, w: number, sign: RGB, stripe: RGB) {
  // 뒷벽과 기둥
  scene.add(rect(tvg, x, 96, w, 70, [230, 200, 160]));
  scene.add(rect(tvg, x, 90, 4, 114, [90, 70, 56]));
  scene.add(rect(tvg, x + w - 4, 90, 4, 114, [90, 70, 56]));

  // 간판
  scene.add(new tvg.Shape().appendRect(x + 6, 66, w - 12, 18, { rx: 3, ry: 3 }).fill(...sign));
  scene.add(new tvg.Shape().appendRect(x + 16, 72, w - 32, 6, { rx: 3, ry: 3 }).fill(255, 245, 225));

  // 줄무늬 차양과 물결 모양 끝단
  const band = w / 6;
  for (let i = 0; i < 6; i++) {
    const color = i % 2 === 0 ? stripe : ([250, 246, 236] as RGB);
    scene.add(rect(tvg, x + i * band, 86, band, 16, color));
    scene.add(new tvg.Shape().appendCircle(x + i * band + band / 2, 102, band / 2, 4).fill(...color));
  }

  // 판매대와 철판, 빈대떡
  scene.add(rect(tvg, x + 6, 160, w - 12, 44, [150, 96, 56]));
  scene.add(rect(tvg, x + 10, 166, w - 20, 34, [176, 118, 72]));
  scene.add(new tvg.Shape().appendRect(x + 8, 152, w - 16, 8, { rx: 2, ry: 2 }).fill(56, 56, 60));
  for (let cx = x + 22; cx < x + w - 14; cx += 22) {
    scene.add(new tvg.Shape().appendCircle(cx, 150, 9, 3.5).fill(214, 160, 70));
    scene.add(new tvg.Shape().appendCircle(cx - 2, 149, 2, 1).fill(110, 150, 70));
  }

  // 김
  const steam = new tvg.Shape();
  for (let sx = x + 26; sx < x + w - 14; sx += 30) {
    steam.moveTo(sx, 140).cubicTo(sx - 5, 132, sx + 5, 126, sx, 116);
  }
  scene.add(steam.stroke({ width: 1.5, color: [255, 255, 255, 140] }));
}

/** 광장시장 먹거리 노점 줄 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();
  stall(tvg, scene, 48, 88, [200, 60, 50], [220, 70, 60]);
  stall(tvg, scene, 136, 88, [40, 110, 170], [60, 130, 190]);
  stall(tvg, scene, 224, 88, [230, 150, 40], [240, 170, 50]);
  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const gwangjang: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
