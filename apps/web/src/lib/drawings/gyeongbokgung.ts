import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';
import { CANVAS_H, CANVAS_W, type SpotDrawing } from './types';

// 캔버스 좌표로 그린다. 건물 가운데 축은 x = 180, 건물이 차지하는 영역은 아래 BUILDING_BOX.
const BUILDING_BOX = { left: 46, top: 21, width: 268 };

type RGB = readonly [number, number, number];
const DANCHEONG_RED: RGB = [164, 52, 58];
const DANCHEONG_GREEN: RGB = [46, 107, 94];
const WOOD: RGB = [205, 170, 120];
const TILE_DARK: RGB = [35, 38, 45];

function rect(tvg: TVG, x: number, y: number, w: number, h: number, [r, g, b]: RGB) {
  return new tvg.Shape().appendRect(x, y, w, h).fill(r, g, b);
}

function verticalGradient(tvg: TVG, y1: number, y2: number, top: RGB, bottom: RGB) {
  return new tvg.LinearGradient(0, y1, 0, y2).setStops([0, [...top, 255]], [1, [...bottom, 255]]);
}

/** 처마 끝이 위로 들린(앙곡) 팔작지붕. top은 지붕 윗변, tipY는 처마 끝 높이, sag는 처마 가운데 처짐 */
function roof(tvg: TVG, scene: Scene, o: { left: number; right: number; top: number; topInset: number; tipY: number; sag: number }) {
  const { left, right, top, topInset, tipY, sag } = o;
  const span = right - left;
  const bottomY = tipY + sag;

  const body = new tvg.Shape()
    .moveTo(left, tipY)
    .cubicTo(left + span * 0.15, bottomY, right - span * 0.15, bottomY, right, tipY)
    .cubicTo(right - topInset * 0.4, tipY - 3, right - topInset * 0.7, top + 6, right - topInset, top)
    .lineTo(left + topInset, top)
    .cubicTo(left + topInset * 0.7, top + 6, left + topInset * 0.4, tipY - 3, left, tipY)
    .close()
    .fill(verticalGradient(tvg, top, bottomY, [78, 83, 94], [40, 44, 52]));

  // 기와골: 윗변에서 처마 쪽으로 내려오는 세로줄
  const tiles = new tvg.Shape();
  for (let x = left + topInset + 6; x < right - topInset; x += 7) {
    tiles.moveTo(x, top + 2).lineTo(x, bottomY - 4);
  }
  tiles.stroke({ width: 0.6, color: [100, 106, 118, 255] });

  // 처마선과 추녀마루
  const edges = new tvg.Shape()
    .moveTo(left, tipY)
    .cubicTo(left + span * 0.15, bottomY, right - span * 0.15, bottomY, right, tipY)
    .moveTo(left + topInset, top)
    .lineTo(left + 2, tipY - 1)
    .moveTo(right - topInset, top)
    .lineTo(right - 2, tipY - 1)
    .stroke({ width: 2, color: [...TILE_DARK, 255] });

  scene.add(body).add(tiles).add(edges);
}

/** 기둥 줄과 기둥 사이 창호. columns는 기둥 왼쪽 x 목록 */
function bays(tvg: TVG, scene: Scene, columns: number[], y: number, h: number, colW: number) {
  const lattice = new tvg.Shape();
  for (let i = 0; i < columns.length - 1; i++) {
    const x = columns[i]! + colW;
    const w = columns[i + 1]! - x;
    scene.add(
      new tvg.Shape()
        .appendRect(x, y, w, h)
        .fill(...WOOD)
        .stroke({ width: 1.5, color: [...DANCHEONG_GREEN, 255] }),
    );
    for (let lx = x + 4; lx < x + w - 2; lx += 4) lattice.moveTo(lx, y + 2).lineTo(lx, y + h - 2);
    for (let ly = y + 5; ly < y + h - 2; ly += 5) lattice.moveTo(x + 2, ly).lineTo(x + w - 2, ly);
  }
  scene.add(lattice.stroke({ width: 0.5, color: [150, 110, 70, 255] }));
  for (const x of columns) scene.add(rect(tvg, x, y, colW, h, DANCHEONG_RED));
}

/** 창방(청록 띠)과 단청 점무늬 */
function dancheongBand(tvg: TVG, scene: Scene, x: number, y: number, w: number) {
  scene.add(rect(tvg, x - 4, y - 6, w + 8, 6, [64, 130, 110]));
  scene.add(rect(tvg, x, y, w, 7, DANCHEONG_GREEN));
  for (let dx = x + 4; dx < x + w - 3; dx += 9) scene.add(rect(tvg, dx, y + 2, 3, 3, [220, 80, 70]));
}

/** 하늘, 북악산, 마당 */
function drawBackground(tvg: TVG) {
  const scene = new tvg.Scene();
  scene.add(
    new tvg.Shape()
      .appendRect(0, 0, CANVAS_W, CANVAS_H)
      .fill(verticalGradient(tvg, 0, CANVAS_H, [159, 211, 242], [232, 244, 250])),
  );
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

  // 왼쪽 위를 원점으로 옮긴다. 바깥 Scene은 호출 쪽이 translate로 위치를 정한다.
  return new tvg.Scene().add(scene.translate(-BUILDING_BOX.left, -BUILDING_BOX.top));
}

export const gyeongbokgung: SpotDrawing = {
  background: drawBackground,
  building: { top: BUILDING_BOX.top, width: BUILDING_BOX.width, draw: drawBuilding },
};
