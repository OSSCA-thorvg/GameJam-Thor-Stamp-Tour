import type { Scene } from '@thorvg/webcanvas';
import type { TVG } from '../thorvg';

/** 여러 관광지 그림이 함께 쓰는 도형 헬퍼와 색 */

export type RGB = readonly [number, number, number];
export const DANCHEONG_RED: RGB = [164, 52, 58];
export const DANCHEONG_GREEN: RGB = [46, 107, 94];
export const WOOD: RGB = [205, 170, 120];
export const TILE_DARK: RGB = [35, 38, 45];

export function rect(tvg: TVG, x: number, y: number, w: number, h: number, [r, g, b]: RGB) {
  return new tvg.Shape().appendRect(x, y, w, h).fill(r, g, b);
}

export function verticalGradient(tvg: TVG, y1: number, y2: number, top: RGB, bottom: RGB) {
  return new tvg.LinearGradient(0, y1, 0, y2).setStops([0, [...top, 255]], [1, [...bottom, 255]]);
}

/** 캔버스 전체를 세로 그라데이션으로 채운다 */
export function fillCanvasGradient(tvg: TVG, w: number, h: number, top: RGB, bottom: RGB) {
  return new tvg.Shape().appendRect(0, 0, w, h).fill(verticalGradient(tvg, 0, h, top, bottom));
}

/** 처마 끝이 위로 들린(앙곡) 팔작지붕. top은 지붕 윗변, tipY는 처마 끝 높이, sag는 처마 가운데 처짐 */
export function roof(tvg: TVG, scene: Scene, o: { left: number; right: number; top: number; topInset: number; tipY: number; sag: number }) {
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
export function bays(tvg: TVG, scene: Scene, columns: number[], y: number, h: number, colW: number) {
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
export function dancheongBand(tvg: TVG, scene: Scene, x: number, y: number, w: number) {
  scene.add(rect(tvg, x - 4, y - 6, w + 8, 6, [64, 130, 110]));
  scene.add(rect(tvg, x, y, w, 7, DANCHEONG_GREEN));
  for (let dx = x + 4; dx < x + w - 3; dx += 9) scene.add(rect(tvg, dx, y + 2, 3, 3, [220, 80, 70]));
}

/** 캔버스 좌표로 그린 건물을 box 왼쪽 위가 원점이 되도록 옮긴다. 바깥 Scene은 호출 쪽이 translate로 위치를 정한다. */
export function toOrigin(tvg: TVG, scene: Scene, box: { left: number; top: number }) {
  return new tvg.Scene().add(scene.translate(-box.left, -box.top));
}
