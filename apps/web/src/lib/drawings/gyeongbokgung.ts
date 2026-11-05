import type { TVG } from '../thorvg';
import { bays, dancheongBand, fillCanvasGradient, rect, roof, TILE_DARK, toOrigin } from './shapes';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 캔버스 좌표로 그린다. 건물 가운데 축은 x = 180, 건물이 차지하는 영역은 아래 BUILDING_BOX.
const BUILDING_BOX = { left: 46, top: 21, width: 268 };

/** 하늘, 북악산, 마당 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(fillCanvasGradient(tvg, CANVAS_W, CANVAS_H, [159, 211, 242], [232, 244, 250]));
  scene.add(
    new tvg.Shape()
      .moveTo(0, 150)
      .cubicTo(60, 92, 110, 82, 170, 108)
      .cubicTo(220, 70, 290, 80, 360, 128)
      .lineTo(360, 240)
      .lineTo(0, 240)
      .close()
      .fill(118, 158, 120),
  );
  scene.add(rect(tvg, 0, 200, CANVAS_W, 40, [214, 196, 160]));
  return scene;
}

/** 경복궁 근정전을 본뜬 중층 팔작지붕 전각과 월대 */
function drawBuilding(tvg: TVG) {
  const scene = new tvg.Scene();

  // 월대(2단 돌 기단)와 가운데 계단
  scene.add(rect(tvg, 70, 184, 220, 16, [170, 170, 165]));
  scene.add(rect(tvg, 90, 172, 180, 12, [190, 190, 185]));
  const steps = new tvg.Shape().appendRect(165, 172, 30, 28).fill(200, 200, 195);
  for (let sy = 176; sy < 200; sy += 4) steps.moveTo(165, sy).lineTo(195, sy);
  scene.add(steps.stroke({ width: 0.6, color: [150, 150, 145, 255] }));

  // 위층: 몸체를 먼저 그려야 아래층 지붕이 그 밑동을 덮는다.
  bays(tvg, scene, [127, 161, 195, 229], 60, 22, 5);
  dancheongBand(tvg, scene, 122, 53, 116);
  roof(tvg, scene, { left: 96, right: 264, top: 32, topInset: 34, tipY: 52, sag: 14 });

  // 아래층
  bays(tvg, scene, [97, 129, 161, 193, 225, 257], 130, 42, 6);
  dancheongBand(tvg, scene, 94, 122, 172);
  roof(tvg, scene, { left: 46, right: 314, top: 80, topInset: 44, tipY: 98, sag: 16 });

  // 용마루와 양 끝 취두
  scene.add(new tvg.Shape().appendRect(128, 27, 104, 6, { rx: 2, ry: 2 }).fill(...TILE_DARK));
  scene.add(new tvg.Shape().appendRect(122, 21, 10, 12, { rx: 2, ry: 2 }).fill(...TILE_DARK));
  scene.add(new tvg.Shape().appendRect(228, 21, 10, 12, { rx: 2, ry: 2 }).fill(...TILE_DARK));

  return toOrigin(tvg, scene, BUILDING_BOX);
}

export const gyeongbokgung: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
