import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';
import { fillCanvasGradient, rect, toOrigin, verticalGradient, type RGB } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 석조전 정면. 건물 가운데 축은 x = 180.
const BUILDING_BOX = { left: 44, top: 44, width: 272 };

const STONE_LIGHT: RGB = [236, 230, 214];
const STONE_SHADE: RGB = [200, 192, 174];

/** 하늘, 나무 숲, 돌담길 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [150, 200, 236], [228, 240, 248]));
  const trees = new tvg.Shape();
  for (let i = 0; i * 34 - 10 < CANVAS_W + 20; i++) trees.appendCircle(i * 34 - 10, 150 + (i % 2) * 8, 28);
  scene.add(trees.fill(96, 142, 96));
  scene.add(rect(tvg, 0, 170, CANVAS_W, 40, [96, 142, 96]));

  // 돌담: 기와 갓과 돌 쌓기
  scene.add(rect(tvg, 0, 204, CANVAS_W, 36, [176, 168, 152]));
  scene.add(rect(tvg, 0, 200, CANVAS_W, 5, [60, 64, 72]));
  const joints = new tvg.Shape();
  for (let row = 0; row < 3; row++) {
    const y = 205 + row * 12;
    joints.moveTo(0, y).lineTo(CANVAS_W, y);
    for (let x = (row % 2) * 13; x < CANVAS_W; x += 26) joints.moveTo(x, y).lineTo(x, y + 12);
  }
  scene.add(joints.stroke({ width: 0.8, color: [140, 132, 118, 255] }));
  return scene;
}

/** 주두 장식이 있는 기둥 하나 */
function column(tvg: TVG, scene: Scene, x: number, top: number, bottom: number) {
  scene.add(
    new tvg.Shape()
      .appendRect(x, top + 4, 8, bottom - top - 8)
      .fill(new tvg.LinearGradient(x, 0, x + 8, 0).setStops([0, [250, 246, 236, 255]], [1, [196, 188, 170, 255]])),
  );
  scene.add(new tvg.Shape().appendRect(x - 2, top, 12, 4, { rx: 2, ry: 2 }).fill(...STONE_SHADE));
  scene.add(new tvg.Shape().appendCircle(x - 1, top + 3, 2).appendCircle(x + 9, top + 3, 2).fill(...STONE_SHADE));
  scene.add(rect(tvg, x - 2, bottom - 4, 12, 4, STONE_SHADE));
}

/** 덕수궁 석조전을 본뜬 열주와 삼각 박공의 서양식 석조 건물 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();

  // 기단과 가운데 계단
  scene.add(rect(tvg, 44, 180, 272, 20, STONE_SHADE));
  const steps = new tvg.Shape().appendRect(130, 172, 100, 28).fill(...STONE_LIGHT);
  for (let sy = 176; sy < 200; sy += 4) steps.moveTo(130, sy).lineTo(230, sy);
  scene.add(steps.stroke({ width: 0.6, color: [170, 162, 146, 255] }));

  // 좌우 날개: 벽, 창, 처마 띠
  for (const wx of [54, 236]) {
    scene.add(rect(tvg, wx, 100, 70, 80, STONE_LIGHT));
    scene.add(rect(tvg, wx - 2, 94, 74, 6, STONE_SHADE));
    for (const row of [110, 144]) {
      for (const col of [wx + 10, wx + 30, wx + 50]) {
        scene.add(new tvg.Shape().appendRect(col, row, 10, 22, { rx: 4, ry: 4 }).fill(verticalGradient(tvg, row, row + 22, [90, 110, 130], [50, 66, 84])));
      }
    }
  }

  // 가운데 현관: 안쪽 벽, 열주, 엔타블러처, 박공
  scene.add(rect(tvg, 124, 96, 112, 76, [214, 206, 188]));
  scene.add(rect(tvg, 168, 130, 24, 42, [90, 70, 56]));
  for (let x = 128; x <= 224; x += 16) column(tvg, scene, x, 96, 172);
  scene.add(rect(tvg, 118, 86, 124, 10, STONE_LIGHT));
  scene.add(rect(tvg, 118, 92, 124, 2, STONE_SHADE));
  scene.add(
    new tvg.Shape()
      .moveTo(114, 86)
      .lineTo(180, 48)
      .lineTo(246, 86)
      .close()
      .fill(...STONE_LIGHT)
      .stroke({ width: 2, color: [...STONE_SHADE, 255] }),
  );
  scene.add(new tvg.Shape().appendCircle(180, 72, 6).fill(...STONE_SHADE));

  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const deoksugung: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
