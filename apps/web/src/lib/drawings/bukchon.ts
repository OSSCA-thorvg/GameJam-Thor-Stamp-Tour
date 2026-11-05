import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';
import { fillCanvasGradient, rect, roof, TILE_DARK, toOrigin, WOOD, type RGB } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 한옥 세 채와 앞 담장. 건물 가운데 축은 x = 180.
const BUILDING_BOX = { left: 22, top: 100, width: 316 };

const PLASTER: RGB = [240, 234, 220];
const STONE: RGB = [150, 146, 138];

/** 하늘, 먼 산, 돌길 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [170, 214, 240], [236, 246, 250]));
  scene.add(
    new tvg.Shape()
      .moveTo(0, 140)
      .cubicTo(80, 96, 140, 110, 200, 124)
      .cubicTo(260, 100, 320, 104, 360, 132)
      .lineTo(360, 240)
      .lineTo(0, 240)
      .close()
      .fill(140, 170, 140),
  );
  scene.add(rect(tvg, 0, 206, CANVAS_W, 34, [196, 190, 178]));
  const joints = new tvg.Shape();
  for (let x = 0; x < CANVAS_W; x += 24) joints.moveTo(x, 206).lineTo(x - 10, 240);
  scene.add(joints.stroke({ width: 0.6, color: [160, 154, 142, 255] }));
  return scene;
}

/** 돌 기단, 흰 회벽과 나무 기둥, 창살 창, 기와지붕을 얹은 한옥 한 채 */
function hanok(tvg: TVG, scene: Scene, x: number, w: number, wallTop: number, baseY: number) {
  scene.add(rect(tvg, x - 2, baseY - 8, w + 4, 8, STONE));
  scene.add(rect(tvg, x, wallTop, w, baseY - 8 - wallTop, PLASTER));

  const posts = [x, x + w / 2 - 2, x + w - 4];
  for (const px of posts) scene.add(rect(tvg, px, wallTop, 4, baseY - 8 - wallTop, WOOD));
  scene.add(rect(tvg, x, wallTop, w, 4, WOOD));

  // 기둥 사이마다 창살 창 하나
  const lattice = new tvg.Shape();
  for (const left of [x + 4, x + w / 2 + 2]) {
    const ww = w / 2 - 14;
    const wx = left + 4;
    const wy = wallTop + 10;
    scene.add(rect(tvg, wx, wy, ww, 18, [250, 244, 226]));
    for (let lx = wx + 4; lx < wx + ww; lx += 4) lattice.moveTo(lx, wy).lineTo(lx, wy + 18);
    for (let ly = wy + 6; ly < wy + 18; ly += 6) lattice.moveTo(wx, ly).lineTo(wx + ww, ly);
  }
  scene.add(lattice.stroke({ width: 0.7, color: [150, 110, 70, 255] }));

  roof(tvg, scene, { left: x - 8, right: x + w + 8, top: wallTop - 24, topInset: w * 0.22, tipY: wallTop - 8, sag: 8 });
  scene.add(new tvg.Shape().appendRect(x + w * 0.22 - 8, wallTop - 28, w * 0.56 + 16, 5, { rx: 2, ry: 2 }).fill(...TILE_DARK));
}

/** 북촌 골목의 한옥 세 채와 기와 얹은 담장, 대문 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();

  hanok(tvg, scene, 32, 84, 140, 186);
  hanok(tvg, scene, 244, 84, 140, 186);
  hanok(tvg, scene, 126, 108, 128, 186);

  // 앞 담장: 돌 하단, 회벽, 기와 갓
  scene.add(rect(tvg, 24, 184, 312, 22, PLASTER));
  scene.add(rect(tvg, 24, 196, 312, 10, STONE));
  scene.add(new tvg.Shape().appendRect(22, 178, 316, 7, { rx: 2, ry: 2 }).fill(60, 64, 72));
  const tiles = new tvg.Shape();
  for (let x = 26; x < 336; x += 6) tiles.moveTo(x, 179).lineTo(x, 184);
  scene.add(tiles.stroke({ width: 0.6, color: [100, 106, 118, 255] }));

  // 가운데 대문
  scene.add(new tvg.Shape().appendRect(160, 170, 40, 8, { rx: 2, ry: 2 }).fill(...TILE_DARK));
  scene.add(rect(tvg, 164, 178, 32, 28, [120, 76, 44]));
  scene.add(new tvg.Shape().moveTo(180, 178).lineTo(180, 206).stroke({ width: 1, color: [80, 50, 30, 255] }));
  scene.add(new tvg.Shape().appendCircle(176, 192, 1.5).appendCircle(184, 192, 1.5).fill(220, 190, 90));

  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const bukchon: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
